import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const GNOME_EXTENSIONS_JSON = path.join(
  __dirname,
  "../../static/data/gnome-extensions.json"
);

const EXPECTED_EXTENSION_COUNT = 9;

test.describe("Tips page — GNOME extensions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tips");
    // Wait for client-side hydration: extension titles must replace "Loading..."
    await page.waitForSelector('[class*="titleLink"]', { timeout: 15_000 });
  });

  test("page renders Tips and Tricks heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /tips and tricks/i }).first()
    ).toBeVisible();
  });

  test("renders 9 extension cards", async ({ page }) => {
    const cards = page.locator('[class*="extensionBox"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count, "must render exactly 9 extension cards").toBe(
      EXPECTED_EXTENSION_COUNT
    );
  });

  test("no extension card is stuck on Loading...", async ({ page }) => {
    const cards = page.locator('[class*="extensionBox"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      expect(
        text?.trim(),
        `Extension card ${i} is stuck on "Loading..."`
      ).not.toBe("Loading...");
    }
  });

  test("no extension card shows data unavailable error", async ({ page }) => {
    const cards = page.locator('[class*="extensionBox"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      expect(
        text,
        `Extension card ${i} shows data unavailable error`
      ).not.toContain("Extension data unavailable");
    }
  });

  test("all extension title links point to extensions.gnome.org", async ({
    page,
  }) => {
    const titleLinks = page.locator('[class*="titleLink"]');
    const count = await titleLinks.count();
    expect(count, "must find 9 title links").toBe(EXPECTED_EXTENSION_COUNT);
    for (let i = 0; i < count; i++) {
      const href = await titleLinks.nth(i).getAttribute("href");
      expect(href, `Extension ${i} title link has no href`).toBeTruthy();
      expect(
        href,
        `Extension ${i} title link doesn't point to extensions.gnome.org`
      ).toContain("extensions.gnome.org");
    }
  });

  test("known extensions appear by name", async ({ page }) => {
    await expect(
      page.locator('[class*="titleLink"]', {
        hasText: /battery health charging/i,
      })
    ).toBeVisible();
    await expect(
      page.locator('[class*="titleLink"]', { hasText: /just perfection/i })
    ).toBeVisible();
    await expect(
      page.locator('[class*="titleLink"]', { hasText: /tiling shell/i })
    ).toBeVisible();
  });

  test("extension screenshots load without broken images", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const broken = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('[class*="extensionBox"] img')
      );
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.getAttribute("src") ?? "unknown");
    });
    expect(
      broken,
      `Broken extension images: ${broken.join(", ")}`
    ).toHaveLength(0);
  });

  test("extension author attribution is shown", async ({ page }) => {
    // Each loaded card must show an author (text starts with "by ")
    const authors = page.locator('[class*="extensionAuthor"]');
    const count = await authors.count();
    expect(count, "must have author rows").toBe(EXPECTED_EXTENSION_COUNT);
    for (let i = 0; i < count; i++) {
      const text = await authors.nth(i).textContent();
      expect(text?.trim().startsWith("by"), `Card ${i} author missing`).toBe(
        true
      );
    }
  });
});

// ─── Static data validation (no browser needed) ───────────────────────────────

test.describe("Tips page — gnome-extensions.json data integrity", () => {
  test("gnome-extensions.json exists and is committed", () => {
    expect(
      fs.existsSync(GNOME_EXTENSIONS_JSON),
      `gnome-extensions.json missing at ${GNOME_EXTENSIONS_JSON} — run: npm run fetch-gnome-extensions`
    ).toBe(true);
  });

  test("gnome-extensions.json has exactly 9 entries", () => {
    const raw = fs.readFileSync(GNOME_EXTENSIONS_JSON, "utf8");
    const data = JSON.parse(raw) as unknown[];
    expect(
      data.length,
      "gnome-extensions.json must have 9 entries matching tips.mdx"
    ).toBe(EXPECTED_EXTENSION_COUNT);
  });

  test("all entries have required fields with correct types", () => {
    const data = JSON.parse(
      fs.readFileSync(GNOME_EXTENSIONS_JSON, "utf8")
    ) as Record<string, unknown>[];

    const EXPECTED_IDS = [5724, 6670, 6325, 8834, 3843, 2236, 5964, 6000, 7065];
    const foundIds = data.map((e) => e["id"] as number);
    expect(foundIds.sort((a, b) => a - b)).toEqual(
      EXPECTED_IDS.sort((a, b) => a - b)
    );

    for (const ext of data) {
      expect(
        typeof ext["id"],
        `Entry id must be a number`
      ).toBe("number");
      expect(
        typeof ext["name"],
        `Entry ${ext["id"]} name must be a string`
      ).toBe("string");
      expect(
        typeof ext["description"],
        `Entry ${ext["id"]} description must be a string`
      ).toBe("string");
      expect(
        typeof ext["url"],
        `Entry ${ext["id"]} url must be a string`
      ).toBe("string");
      expect(
        (ext["url"] as string).startsWith("https://extensions.gnome.org"),
        `Entry ${ext["id"]} url must point to extensions.gnome.org`
      ).toBe(true);
    }
  });

  test("screenshot paths reference files that exist on disk", () => {
    const data = JSON.parse(
      fs.readFileSync(GNOME_EXTENSIONS_JSON, "utf8")
    ) as Record<string, unknown>[];

    const repoRoot = path.join(__dirname, "../../");
    const missing: string[] = [];
    for (const ext of data) {
      const screenshot = ext["screenshot"] as string | null;
      if (screenshot) {
        const diskPath = path.join(repoRoot, "static", screenshot);
        if (!fs.existsSync(diskPath)) {
          missing.push(
            `Extension ${ext["id"]} screenshot not on disk: ${diskPath}`
          );
        }
      }
    }
    expect(
      missing,
      `Missing screenshot files: ${missing.join("; ")}`
    ).toHaveLength(0);
  });
});
