import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/** Check whether ffprobe is available (needed for dimension tests). */
let _ffprobeAvailable: boolean | undefined;
function hasFfprobe(): boolean {
  if (_ffprobeAvailable === undefined) {
    try {
      execSync("ffprobe -version", { stdio: "ignore" });
      _ffprobeAvailable = true;
    } catch {
      _ffprobeAvailable = false;
    }
  }
  return _ffprobeAvailable;
}

async function gotoArtwork(page: Page) {
  await page.goto("/artwork");
  // Wait for the React gallery to hydrate and manifest to load
  await expect(page.locator('[class*="thumbCard"]').first()).toBeVisible({
    timeout: 15_000,
  });
}

test("artwork page loads with Bluefin selected by default", async ({
  page,
}) => {
  await page.goto("/artwork");
  await expect(
    page.getByRole("heading", { name: /artwork/i }).first()
  ).toBeVisible();
  const bluefinTab = page
    .getByRole("button", { name: "Bluefin" })
    .filter({ hasText: "Bluefin" })
    .first();
  await expect(bluefinTab).toBeVisible();
});

test("gallery grid renders thumbnail cards", async ({ page }) => {
  await gotoArtwork(page);
  const cards = page.locator('[class*="thumbCard"]');
  await expect(cards.first()).toBeVisible();
  // Bluefin monthly has 12 cards minimum
  const count = await cards.count();
  expect(count).toBeGreaterThan(5);
});

test("thumbnail images load from repo-hosted WebP", async ({ page }) => {
  await gotoArtwork(page);
  const firstImg = page
    .locator('[class*="thumbCard"] img[class*="thumb"]')
    .first();
  await expect(firstImg).toBeVisible();
  const src = await firstImg.getAttribute("src");
  expect(src).toMatch(/\/img\/artwork\/thumbnails\//);
});

test("project switcher changes gallery content", async ({ page }) => {
  await gotoArtwork(page);
  // Switch to Aurora
  await page.getByRole("button", { name: "Aurora" }).click();
  await expect(
    page.locator('[class*="thumbCard"]').first()
  ).toBeVisible({ timeout: 5_000 });
  // Switch to Bazzite
  await page.getByRole("button", { name: "Bazzite" }).click();
  await expect(
    page.locator('[class*="thumbCard"]').first()
  ).toBeVisible({ timeout: 5_000 });
});

test("lightbox opens when clicking a card", async ({ page }) => {
  await gotoArtwork(page);
  const firstLightboxCard = page
    .locator('button[class*="thumbCard"]')
    .first();
  await firstLightboxCard.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3_000 });
});

test("lightbox close button dismisses dialog", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: /close/i }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
});

test("Escape key closes lightbox", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
});

test("lightbox nav buttons navigate between wallpapers", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const nextBtn = page.getByRole("button", { name: "Next" });
  const prevBtn = page.getByRole("button", { name: "Previous" });

  await expect(nextBtn).toBeVisible();
  await expect(prevBtn).toBeVisible();

  // Navigate forward — dialog must stay open
  await nextBtn.click();
  await expect(dialog).toBeVisible();

  // Navigate back — dialog must stay open
  await prevBtn.click();
  await expect(dialog).toBeVisible();
});

test("lightbox download link has a valid href", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const downloadLink = page.getByRole("link", {
    name: /open full resolution/i,
  });
  await expect(downloadLink).toBeVisible();

  const href = await downloadLink.getAttribute("href");
  expect(href).toBeTruthy();
  // Must be an absolute URL or repo-local path — never empty or "#"
  expect(href).not.toBe("#");
  expect(href).not.toBe("");
});

test("lightbox download link opens in new tab", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const downloadLink = page.getByRole("link", {
    name: /open full resolution/i,
  });
  await expect(downloadLink).toHaveAttribute("target", "_blank");
});

test("author credit link for Jacob Schnurr points to Etsy shop", async ({
  page,
}) => {
  await gotoArtwork(page);
  // Open first Bluefin monthly card (all credited to Jacob Schnurr)
  await page.locator('button[class*="thumbCard"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const creditLink = page
    .getByRole("dialog")
    .getByRole("link", { name: /jacob schnurr/i });
  await expect(creditLink).toBeVisible();
  const href = await creditLink.getAttribute("href");
  expect(href).toContain("etsy.com");
});

test("day/night toggle changes lightbox image URL", async ({ page }) => {
  await gotoArtwork(page);
  await page.locator('button[class*="thumbCard"]').first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const img = dialog.locator("img");
  const dayHref = await img.getAttribute("src");

  const nightBtn = dialog.getByRole("button", { name: "Night" });
  await expect(nightBtn).toBeVisible();
  await nightBtn.click();

  const nightHref = await img.getAttribute("src");
  // Day and night images should differ
  expect(nightHref).not.toBe(dayHref);
});

test("brew install commands appear under each collection", async ({ page }) => {
  await page.goto("/artwork");

  // Bluefin monthly should show the bluefin-wallpapers cask
  await expect(
    page.locator("code", { hasText: "brew install --cask ublue-os/tap/bluefin-wallpapers" }).first()
  ).toBeVisible();

  // Bluefin extra section should show the bluefin-wallpapers-extra cask
  await expect(
    page.locator("code", { hasText: "brew install --cask ublue-os/tap/bluefin-wallpapers-extra" })
  ).toBeVisible();

  // Switch to Aurora and check aurora cask
  await page.getByRole("button", { name: "Aurora" }).click();
  await expect(
    page.locator("code", { hasText: "brew install --cask ublue-os/tap/aurora-wallpapers" })
  ).toBeVisible();

  // Switch to Bazzite and check bazzite cask
  await page.getByRole("button", { name: "Bazzite" }).click();
  await expect(
    page.locator("code", { hasText: "brew install --cask ublue-os/tap/bazzite-wallpapers" })
  ).toBeVisible();
});

// ─── NEW TESTS ───────────────────────────────────────────────────────────────

const THUMB_DIR = path.join(__dirname, "../../static/img/artwork/thumbnails");
const FULLRES_DIR = path.join(__dirname, "../../static/img/artwork/fullres");
const ARTWORK_JSON = path.join(__dirname, "../../static/data/artwork.json");
// page.request.get() uses the baseURL from playwright.config.ts automatically
// when given relative paths — no hardcoded BASE_URL needed.

/** Run ffprobe to get pixel dimensions of a local image file. */
function getImageDimensions(filepath: string): { width: number; height: number } {
  const out = execSync(
    `ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filepath}"`
  )
    .toString()
    .trim();
  const [w, h] = out.split("x").map(Number);
  return { width: w, height: h };
}

/**
 * Evaluate every <img> that has an artwork src in the live DOM and return
 * any whose browser load state is incomplete (broken image / 404).
 */
async function collectBrokenImages(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const imgs = Array.from(
      document.querySelectorAll<HTMLImageElement>('img[src*="/img/artwork/"]')
    );
    return imgs
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src);
  });
}

// ── Group 1: Thumbnail file-size performance ─────────────────────────────────

/** Intentionally ultrawide thumbnails — exempt from 16:9 dimension check. */
const ULTRAWIDE_THUMBS = new Set(["bluefin-chicken.webp", "bluefin-huntress.webp"]);

test.describe("thumbnail performance", () => {
  test("all thumbnails are under 50 KB on disk", () => {
    const files = fs.readdirSync(THUMB_DIR).filter((f) => f.endsWith(".webp"));
    expect(files.length, "thumbnails directory must not be empty").toBeGreaterThan(0);

    const oversized: string[] = [];
    for (const file of files) {
      const bytes = fs.statSync(path.join(THUMB_DIR, file)).size;
      if (bytes > 50 * 1024) {
        oversized.push(`${file}: ${Math.round(bytes / 1024)} KB`);
      }
    }
    expect(
      oversized,
      `Oversized thumbnails found (limit 50 KB): ${oversized.join(", ")}`
    ).toHaveLength(0);
  });

  test("all fullres WebPs are under 400 KB on disk", () => {
    const files = fs.readdirSync(FULLRES_DIR).filter((f) => f.endsWith(".webp"));
    expect(files.length, "fullres directory must not be empty").toBeGreaterThan(0);

    const oversized: string[] = [];
    for (const file of files) {
      const bytes = fs.statSync(path.join(FULLRES_DIR, file)).size;
      if (bytes > 400 * 1024) {
        oversized.push(`${file}: ${Math.round(bytes / 1024)} KB`);
      }
    }
    expect(
      oversized,
      `Oversized fullres files found (limit 400 KB): ${oversized.join(", ")}`
    ).toHaveLength(0);
  });
});

// ── Group 2: Aspect-ratio integrity ─────────────────────────────────────────

test.describe("aspect ratio integrity", () => {
  test("standard thumbnails have 16:9 pixel dimensions on disk", () => {
    test.skip(!hasFfprobe(), "ffprobe not installed — skipping dimension check");
    const files = fs
      .readdirSync(THUMB_DIR)
      .filter((f) => f.endsWith(".webp") && !ULTRAWIDE_THUMBS.has(f));

    expect(files.length, "must find standard thumbnails to check").toBeGreaterThan(0);

    const badRatio: string[] = [];
    for (const file of files) {
      const { width, height } = getImageDimensions(path.join(THUMB_DIR, file));
      const ratio = width / height;
      const expected = 16 / 9; // ≈ 1.777
      if (Math.abs(ratio - expected) > 0.05) {
        badRatio.push(
          `${file}: ${width}×${height} (ratio ${ratio.toFixed(3)}, expected ~${expected.toFixed(3)})`
        );
      }
    }
    expect(
      badRatio,
      `Standard thumbnails with wrong 16:9 ratio: ${badRatio.join("; ")}`
    ).toHaveLength(0);
  });

  test("ultrawide thumbnails have ~21:9 pixel dimensions on disk", () => {
    test.skip(!hasFfprobe(), "ffprobe not installed — skipping dimension check");
    // 480×202 → ratio ≈ 2.376
    const expectedRatio = 480 / 202;

    const badRatio: string[] = [];
    for (const file of ULTRAWIDE_THUMBS) {
      const filepath = path.join(THUMB_DIR, file);
      expect(
        fs.existsSync(filepath),
        `Ultrawide thumbnail missing from disk: ${file}`
      ).toBe(true);

      const { width, height } = getImageDimensions(filepath);
      const ratio = width / height;
      if (Math.abs(ratio - expectedRatio) > 0.05) {
        badRatio.push(
          `${file}: ${width}×${height} (ratio ${ratio.toFixed(3)}, expected ~${expectedRatio.toFixed(3)})`
        );
      }
    }
    expect(
      badRatio,
      `Ultrawide thumbnails with wrong ~21:9 ratio: ${badRatio.join("; ")}`
    ).toHaveLength(0);
  });

  test("CSS enforces 16:9 rendered ratio for all visible thumbnail images", async ({
    page,
  }) => {
    await gotoArtwork(page);
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>('img[class*="thumb"]')
      );
      const problems: string[] = [];
      for (const img of imgs) {
        const w = img.offsetWidth;
        const h = img.offsetHeight;
        if (w === 0 || h === 0) {
          problems.push(
            `${img.getAttribute("src")}: zero layout dimensions (${w}×${h})`
          );
          continue;
        }
        const ratio = w / h;
        const expected = 16 / 9; // ≈ 1.777
        // ±10% tolerance to absorb sub-pixel rounding on fractional heights
        if (Math.abs(ratio - expected) / expected > 0.1) {
          problems.push(
            `${img.getAttribute("src")}: rendered ${w}×${h} (ratio ${ratio.toFixed(3)}, expected ~${expected.toFixed(3)})`
          );
        }
      }
      return problems;
    });

    expect(
      violations,
      `Thumbnails with incorrect rendered 16:9 aspect ratio: ${violations.join("; ")}`
    ).toHaveLength(0);
  });
});

// ── Group 3: HTTP response validation ────────────────────────────────────────

test.describe("image HTTP responses", () => {
  test("all repo-hosted thumbnail URLs return HTTP 200", async ({ page }) => {
    // Union of manifest-declared URLs and filesystem files (catches orphans too)
    const thumbUrls = new Set<string>();

    const manifest = JSON.parse(fs.readFileSync(ARTWORK_JSON, "utf8"));
    for (const proj of Object.values(manifest.projects) as any[]) {
      for (const col of proj.collections) {
        for (const w of col.wallpapers) {
          if (
            typeof w.previewUrl === "string" &&
            w.previewUrl.startsWith("/img/artwork/thumbnails/")
          ) {
            thumbUrls.add(w.previewUrl);
          }
        }
      }
    }

    for (const f of fs.readdirSync(THUMB_DIR)) {
      if (f.endsWith(".webp")) {
        thumbUrls.add(`/img/artwork/thumbnails/${f}`);
      }
    }

    expect(thumbUrls.size, "must find thumbnail URLs to probe").toBeGreaterThan(0);

    await page.goto("/artwork");
    const failed: string[] = [];
    for (const url of thumbUrls) {
      const res = await page.request.get(url);
      if (res.status() !== 200) {
        failed.push(`${url}: HTTP ${res.status()}`);
      }
    }
    expect(
      failed,
      `Thumbnail URLs that did not return HTTP 200: ${failed.join(", ")}`
    ).toHaveLength(0);
  });

  test("all repo-hosted fullres URLs return HTTP 200", async ({ page }) => {
    const fullresUrls = new Set<string>();

    const manifest = JSON.parse(fs.readFileSync(ARTWORK_JSON, "utf8"));
    for (const proj of Object.values(manifest.projects) as any[]) {
      for (const col of proj.collections) {
        for (const w of col.wallpapers) {
          for (const key of ["dayUrl", "nightUrl"] as const) {
            const url: string | undefined = w[key];
            if (
              typeof url === "string" &&
              url.startsWith("/img/artwork/fullres/")
            ) {
              fullresUrls.add(url);
            }
          }
        }
      }
    }

    for (const f of fs.readdirSync(FULLRES_DIR)) {
      if (f.endsWith(".webp")) {
        fullresUrls.add(`/img/artwork/fullres/${f}`);
      }
    }

    expect(fullresUrls.size, "must find fullres URLs to probe").toBeGreaterThan(0);

    await page.goto("/artwork");
    const failed: string[] = [];
    for (const url of fullresUrls) {
      const res = await page.request.get(url);
      if (res.status() !== 200) {
        failed.push(`${url}: HTTP ${res.status()}`);
      }
    }
    expect(
      failed,
      `Fullres URLs that did not return HTTP 200: ${failed.join(", ")}`
    ).toHaveLength(0);
  });
});

// ── Group 4: Browser rendering — no broken images ────────────────────────────

test.describe("browser image rendering", () => {
  test("no broken thumbnail images on the Bluefin gallery", async ({ page }) => {
    test.fixme(true, "Pre-existing: 5 bluefin-xe thumbnails missing from repo (issue #88)");
    await gotoArtwork(page);
    await page.waitForLoadState("networkidle");

    const broken = await collectBrokenImages(page);
    expect(
      broken,
      `Broken images on Bluefin gallery: ${broken.join(", ")}`
    ).toHaveLength(0);
  });

  test("no broken thumbnail images on the Aurora gallery", async ({ page }) => {
    await gotoArtwork(page);
    await page.getByRole("button", { name: "Aurora" }).click();
    await expect(
      page.locator('[class*="thumbCard"]').first()
    ).toBeVisible({ timeout: 5_000 });
    await page.waitForLoadState("networkidle");

    const broken = await collectBrokenImages(page);
    expect(
      broken,
      `Broken images on Aurora gallery: ${broken.join(", ")}`
    ).toHaveLength(0);
  });

  test("no broken thumbnail images on the Bazzite gallery", async ({ page }) => {
    await gotoArtwork(page);
    await page.getByRole("button", { name: "Bazzite" }).click();
    await expect(
      page.locator('[class*="thumbCard"]').first()
    ).toBeVisible({ timeout: 5_000 });
    await page.waitForLoadState("networkidle");

    const broken = await collectBrokenImages(page);
    expect(
      broken,
      `Broken images on Bazzite gallery: ${broken.join(", ")}`
    ).toHaveLength(0);
  });

  test("all thumbnail images decode at their expected 480px natural width", async ({
    page,
  }) => {
    await gotoArtwork(page);
    await page.waitForLoadState("networkidle");

    const badWidths = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          'img[src*="/img/artwork/thumbnails/"][class*="thumb"]'
        )
      );
      // naturalWidth is 0 for broken images; non-zero means the browser decoded it
      return imgs
        .filter((img) => img.complete && img.naturalWidth !== 480)
        .map(
          (img) =>
            `${img.getAttribute("src")}: naturalWidth=${img.naturalWidth}`
        );
    });

    expect(
      badWidths,
      `Thumbnails with unexpected natural width (all should be 480 px): ${badWidths.join(", ")}`
    ).toHaveLength(0);
  });
});
