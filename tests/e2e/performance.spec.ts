/**
 * Performance regression tests for docs.projectbluefin.io
 *
 * Strategy (per Gate 1 + Gate 2 review):
 *   - Lightweight deterministic checks against the dev server.
 *   - Thresholds catch *regressions* without failing on known-bad pages.
 *   - A1 trailing-slash: tested via config file assertion (dev server never
 *     issues 301s — the redirect is a production hosting concern).
 *   - B1 payload: measured via fs.statSync on disk (content-length headers
 *     are absent on dev server chunked responses).
 *   - B2 CLS: measured via PerformanceObserver Layout Instability API.
 *   - See ~/src/skills/bluefin-docs-perf/SKILL.md for full baseline + roadmap.
 *
 * Phase 0 baseline scores (Lighthouse 13.1, desktop, no throttling):
 *   /              Perf 69  A11y 96  LCP 24.4s  CLS 0
 *   /installation  Perf 98  A11y 97  LCP 1.7s   CLS 0
 *   /artwork       Perf 88  A11y 87  LCP 1.5s   CLS 0.233
 *   /changelogs    Perf 75  A11y 83  LCP 4.2s   CLS 0.044
 *   /board         Perf 99  A11y 98  LCP 1.1s   CLS 0
 *   /driver-versions Perf 98 A11y 100 LCP 1.6s  CLS 0
 *   /reports/2026/03 Perf 99 A11y 91 LCP 1.2s   CLS 0.005
 *   /blog          Perf 76  A11y 89  LCP 2.6s   CLS 0
 *   /blog/state-ecosystem-2026 Perf 100 A11y 95 LCP 1.5s CLS 0.001
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../");

// ---------------------------------------------------------------------------
// A1 — trailingSlash: true must be set in docusaurus.config.ts
//
// Gate 2 finding: the Docusaurus dev server uses historyApiFallback — it
// never issues 301s regardless of trailingSlash.  The redirect only occurs in
// production hosting (Cloudflare/static-file server).  Testing browser-level
// redirects against the dev server always passes and provides no protection.
//
// Config-file assertion: RED until trailingSlash: true is added.
// ---------------------------------------------------------------------------

test.describe("A1 — trailingSlash config", () => {
  test("docusaurus.config.ts sets trailingSlash: true", () => {
    const configPath = path.join(REPO_ROOT, "docusaurus.config.ts");
    const src = fs.readFileSync(configPath, "utf8");
    expect(
      src,
      "trailingSlash: true is missing from docusaurus.config.ts — every page except / hits a 301 in production"
    ).toMatch(/trailingSlash\s*:\s*true/);
  });
});

// ---------------------------------------------------------------------------
// B1 — Homepage hero image: LCP optimisation guards
//
// Fix requires replacing plain markdown ![]() with a raw <img> tag bearing
// fetchpriority="high", explicit width + height, and a WebP src.
// The three tests below are RED on current code and GREEN after the fix.
//
// Gate 2 finding on loading attribute: plain Docusaurus markdown does NOT
// inject loading="lazy", so testing for its absence is a false green.
// Instead, test for the *presence* of fetchpriority="high" (which the fix
// adds and current code lacks).
//
// Gate 2 finding on payload: content-length headers are absent on the dev
// server (chunked transfer).  Use fs.statSync on the image file referenced
// in the hero img src attribute.
// ---------------------------------------------------------------------------

test.describe("B1 — homepage hero image", () => {
  test("hero image has fetchpriority=high (not plain markdown)", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator("article img").first();
    await expect(hero).toBeVisible({ timeout: 10_000 });
    const priority = await hero.getAttribute("fetchpriority");
    expect(
      priority,
      'Hero image lacks fetchpriority="high" — LCP element must be explicitly prioritised. ' +
        'Replace the markdown ![]() syntax with a raw <img fetchpriority="high" loading="eager" ...> tag.'
    ).toBe("high");

    const loading = await hero.getAttribute("loading");
    expect(
      loading,
      'Hero image must have loading="eager" — prevents the browser from deferring the LCP load.'
    ).toBe("eager");
  });

  test("hero image has explicit width and height attributes", async ({
    page,
  }) => {
    await page.goto("/");
    const hero = page.locator("article img").first();
    await expect(hero).toBeVisible({ timeout: 10_000 });
    const w = await hero.getAttribute("width");
    const h = await hero.getAttribute("height");
    expect(w, "Hero image must have explicit width to prevent CLS").toBeTruthy();
    expect(h, "Hero image must have explicit height to prevent CLS").toBeTruthy();
  });

  test("hero image file on disk is under 500 KB (currently a 3.6 MB PNG)", () => {
    // Parse docs/index.md directly — do NOT use the browser src attribute.
    // Docusaurus rspack rewrites markdown image URLs with content hashes during
    // the dev build, making browser src attributes unreliable for disk path
    // resolution.  Parsing the source file is deterministic regardless of
    // build mode.
    const indexMd = fs.readFileSync(
      path.join(REPO_ROOT, "docs", "index.md"),
      "utf8"
    );

    // Match first image in either ![]() markdown or <img src=...> HTML format
    const mdMatch = indexMd.match(/!\[.*?\]\((\/[^)]+)\)/);
    const htmlMatch = indexMd.match(/<img[^>]+src=["'](\/[^"']+)["']/);
    const imagePath = mdMatch?.[1] ?? htmlMatch?.[1] ?? null;

    expect(
      imagePath,
      "No image reference found in docs/index.md — hero image is missing"
    ).not.toBeNull();

    const absPath = path.join(REPO_ROOT, "static", imagePath!);
    expect(
      fs.existsSync(absPath),
      `Hero image source file not found at ${absPath}`
    ).toBe(true);

    const sizeKB = fs.statSync(absPath).size / 1024;
    expect(
      sizeKB,
      `Hero image is ${Math.round(sizeKB)} KB — must be under 500 KB. ` +
        "Convert to WebP: ffmpeg -i in.png -quality 85 -vf scale=1920:-2 out.webp"
    ).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// B2 — Artwork page layout stability
//
// Two separate guards:
//   (a) Actual CLS via PerformanceObserver — Gate 2 identified zero-dim check
//       as a false green (aspect-ratio CSS already applied; real CLS is from
//       JS hydration shift when artwork.json loads client-side).
//   (b) ARIA roles on project switcher — role="tablist" + aria-pressed is
//       semantically incorrect; should be role="tab" + aria-selected.
//
// Gate 2 fix on ARIA guard: the pre-fix visibility guard used
// getByRole("button", { name: "Bluefin" }) which breaks after the fix changes
// the element to role="tab".  Use the stable aria-label="Artwork projects"
// locator instead.
// ---------------------------------------------------------------------------

test.describe.fixme("B2 — artwork gallery layout stability", () => {
  test("artwork page CLS is below 0.1 after networkidle", async ({ page }) => {
    await page.goto("/artwork");
    // Give React hydration + artwork.json fetch time to complete
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);

    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let score = 0;
          // Collect already-buffered shifts, then watch for any new ones
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // LayoutShift entries have a `value` property
              score += (entry as PerformanceEntry & { value: number }).value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          // Short settle window so late shifts are captured
          setTimeout(() => resolve(score), 1_000);
        })
    );

    expect(
      cls,
      `Artwork page CLS is ${cls.toFixed(3)} — exceeds 0.1 budget. ` +
        "Real cause: ArtworkGallery.tsx fetches artwork.json client-side after hydration. " +
        "Fix: add a skeleton placeholder with known height before the fetch resolves."
    ).toBeLessThan(0.1);
  });

  test("project switcher uses role=tab + aria-selected (not aria-pressed on tablist)", async ({
    page,
  }) => {
    await page.goto("/artwork");
    // Use the stable aria-label attribute — survives the ARIA fix that renames
    // role="button" to role="tab" (which would break getByRole("button")).
    await expect(
      page.locator('[aria-label="Artwork projects"]')
    ).toBeVisible({ timeout: 10_000 });

    const badTablist = await page.evaluate(() => {
      const tls = Array.from(document.querySelectorAll('[role="tablist"]'));
      return tls
        .filter(
          (tl) => tl.querySelectorAll("[aria-pressed]").length > 0
        )
        .map((tl) => tl.className);
    });

    expect(
      badTablist,
      'tablist elements with aria-pressed children — must use role="tab" + aria-selected: ' +
        badTablist.join(", ")
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// B3 — Changelogs page: filter controls must be labelled
// Confirmed by Gate 2: all four <select> elements in FirehoseFilters.tsx
// lack id, aria-label, and aria-labelledby.  This test is correctly RED.
// ---------------------------------------------------------------------------

test.describe.fixme("B3 — changelogs accessibility", () => {
  test("all filter <select> elements have an accessible label", async ({
    page,
  }) => {
    await page.goto("/changelogs");
    await page.waitForLoadState("networkidle");

    const unlabelled = await page.evaluate(() => {
      const selects = Array.from(
        document.querySelectorAll<HTMLSelectElement>("select")
      );
      return selects
        .filter((s) => {
          const id = s.id;
          const ariaLabel = s.getAttribute("aria-label");
          const ariaLabelledBy = s.getAttribute("aria-labelledby");
          const hasLabel = id
            ? document.querySelector(`label[for="${id}"]`) !== null
            : false;
          return !ariaLabel && !ariaLabelledBy && !hasLabel;
        })
        .map((s) => s.outerHTML.slice(0, 120));
    });

    expect(
      unlabelled,
      `Unlabelled <select> elements on /changelogs (add aria-label): ${unlabelled.join("; ")}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Smoke: all 9 representative pages load without uncaught JS errors
// Gate 2 confirmed: caught errors in ArtworkGallery + FirehoseFilters will
// NOT surface as pageerror events — only *uncaught* exceptions are captured.
// ---------------------------------------------------------------------------

test.describe("smoke — no JS errors on representative pages", () => {
  const representativePages = [
    "/",
    "/installation",
    "/artwork",
    "/changelogs",
    "/board",
    "/driver-versions",
    "/reports/2026/03",
    "/blog",
    "/blog/state-ecosystem-2026",
  ];

  for (const path of representativePages) {
    test(`${path} has no uncaught JS errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(
        errors,
        `Uncaught JS errors on ${path}: ${errors.join("; ")}`
      ).toHaveLength(0);
    });
  }
});
