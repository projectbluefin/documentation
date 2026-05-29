import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const GNOME_EXTENSIONS_JSON = path.join(
  __dirname,
  "../../static/data/gnome-extensions.json"
);

const EXPECTED_EXTENSION_COUNT = 9;

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
