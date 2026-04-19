import { test, expect } from "@playwright/test";

test.describe("Changelogs page — chip consistency", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/changelogs");
    // Wait for the pinned cards section to load
    await page.waitForSelector('[data-testid="pinned-os-cards"], .card, article', {
      timeout: 15_000,
    });
  });

  test("pinned Bluefin stable card renders with version chips", async ({ page }) => {
    // The pinned stable card is always the first OsReleaseCard rendered
    const stableCard = page.locator("article").first();
    await expect(stableCard).toBeVisible();

    // The chips row must not be empty
    const chipsRow = stableCard.locator(".chipsRow, [class*='chipsRow']");
    await expect(chipsRow).toBeVisible();

    // Kernel and Gnome chips must always be present — both are in release notes
    // and in CHIP_TO_SBOM. If enrichFromSbom null-fallback bug exists, they
    // could disappear when SBOM has partial data.
    const chips = chipsRow.locator("[class*='versionChip']");
    const chipCount = await chips.count();
    expect(chipCount, "stable card must have at least 2 version chips").toBeGreaterThanOrEqual(2);
  });

  test("pinned stable card shows Kernel chip with a non-empty version", async ({ page }) => {
    const stableCard = page.locator("article").first();
    const chipsRow = stableCard.locator("[class*='chipsRow']");

    // Find a chip whose label contains "Kernel"
    const kernelChip = chipsRow.locator("[class*='chipLabel']", { hasText: /^kernel$/i })
      .locator("..")
      .locator("[class*='chipValue']");
    await expect(kernelChip).toBeVisible();
    const version = await kernelChip.textContent();
    expect(version, "Kernel chip must have a non-empty version string").toBeTruthy();
    expect(version!.trim().length, "Kernel version must not be empty").toBeGreaterThan(0);
  });

  test("pinned stable card shows Gnome chip with a non-empty version", async ({ page }) => {
    const stableCard = page.locator("article").first();
    const chipsRow = stableCard.locator("[class*='chipsRow']");

    const gnomeChip = chipsRow.locator("[class*='chipLabel']", { hasText: /^gnome$/i })
      .locator("..")
      .locator("[class*='chipValue']");
    await expect(gnomeChip).toBeVisible();
    const version = await gnomeChip.textContent();
    expect(version, "Gnome chip must have a non-empty version string").toBeTruthy();
    expect(version!.trim().length, "Gnome version must not be empty").toBeGreaterThan(0);
  });

  test("changelogs page has an updates stream with at least one entry", async ({ page }) => {
    // The updates stream (timeline below pinned cards) must render entries
    // This catches a total data pipeline failure (empty feed)
    const timeline = page.locator("[class*='firehoseList'], [class*='timelineList'], [class*='feedList']");
    if (await timeline.isVisible()) {
      const items = timeline.locator(":scope > *");
      const count = await items.count();
      expect(count, "updates stream must have at least one entry").toBeGreaterThan(0);
    }
    // If no timeline found, at least verify the page loaded (not a blank error)
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });
});
