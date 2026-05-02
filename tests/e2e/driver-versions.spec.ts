import { test, expect } from "@playwright/test";

test.describe("Driver versions page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/driver-versions/");
    await page.waitForSelector("h2, [class*='streamSection']", {
      timeout: 15_000,
    });
  });

  test("LTS and GDX section heading is present", async ({ page }) => {
    const heading = page.locator("h2", { hasText: /LTS and GDX/i });
    await expect(heading).toBeVisible();
  });

  test("LTS stream shows HWE Kernel card with a non-empty version", async ({
    page,
  }) => {
    // HWE Kernel label only renders when hweKernel !== null
    const hweLabel = page.locator("[class*='majorVersionLabel']", {
      hasText: /HWE Kernel/i,
    });
    await expect(
      hweLabel.first(),
      "HWE Kernel card must be visible — hweKernel was null before the fix",
    ).toBeVisible();

    // The sibling value element must contain a non-empty version string
    const hweValue = hweLabel.first().locator("..").locator("[class*='versionValue'], [class*='VersionValue']");
    const version = await hweValue.textContent();
    expect(version?.trim().length, "HWE Kernel version must not be empty").toBeGreaterThan(0);
  });

  test("LTS stream shows stock Kernel card", async ({ page }) => {
    const kernelLabel = page.locator("[class*='majorVersionLabel']", {
      hasText: /^Kernel$/i,
    });
    await expect(kernelLabel.first()).toBeVisible();
  });
});

test.describe("Images page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/images/");
    // ImagesCatalog fetches /data/images.json dynamically
    await page.waitForSelector("[class*='imagesPage'], [class*='productCard'], h1", {
      timeout: 15_000,
    });
  });

  test("images page loads without error boundary", async ({ page }) => {
    // If React throws, Docusaurus renders an error boundary with 'Error:' text
    const body = await page.locator("body").textContent();
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/Something went wrong/);
  });

  test("images page renders at least one product card", async ({ page }) => {
    // ImagesCatalog renders products as <article class="*card*">
    await page.waitForFunction(
      () => document.querySelectorAll("article[class*='card']").length > 0,
      { timeout: 15_000 },
    );
    const cards = page.locator("article[class*='card']");
    const count = await cards.count();
    expect(count, "images page must show at least one product card").toBeGreaterThan(0);
  });

  test("images page shows Bluefin product", async ({ page }) => {
    await page.waitForFunction(
      () => document.querySelectorAll("article[class*='card']").length > 0,
      { timeout: 15_000 },
    );
    const bluefinCard = page.locator("article[class*='card']", {
      hasText: /bluefin/i,
    });
    await expect(bluefinCard.first()).toBeVisible();
  });
});
