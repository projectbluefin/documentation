import { test, expect } from "@playwright/test";

test.describe("FeedItems component — changelogs page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/changelogs/");
    // Wait for the page to fully render content
    await page.waitForSelector("article, .card, [class*='card']", {
      timeout: 15_000,
    });
  });

  test("page loads without errors", async ({ page }) => {
    // Verify we're on the changelogs page with a meaningful heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/changelog/i);
  });

  test("feed items render at least one card or article", async ({ page }) => {
    // At least one card/article element should be visible in the feed
    const cards = page.locator("article, .card, [class*='card']");
    const count = await cards.count();
    expect(count, "at least one feed item card should render").toBeGreaterThan(0);

    // First card should be visible
    await expect(cards.first()).toBeVisible();
  });

  test("filter controls are present", async ({ page }) => {
    // The page should have filter select elements for Package Type and Updated
    const packageTypeFilter = page.locator("select[aria-label='Package Type']");
    await expect(packageTypeFilter).toBeVisible();

    const updatedFilter = page.locator("select[aria-label='Updated within']");
    await expect(updatedFilter).toBeVisible();
  });

  test("clicking a filter does not crash the page", async ({ page }) => {
    // Interact with the "Updated within" filter — change its value
    const updatedFilter = page.locator("select[aria-label='Updated within']");
    await expect(updatedFilter).toBeVisible();

    // Select a different option (e.g., the second option)
    const options = updatedFilter.locator("option");
    const optionCount = await options.count();
    expect(optionCount, "filter should have options").toBeGreaterThan(1);

    // Pick the second option value
    const secondValue = await options.nth(1).getAttribute("value");
    await updatedFilter.selectOption(secondValue!);

    // Page should still have content — not crashed or blank
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Cards may be filtered, but page structure remains intact
    const container = page.locator(".container");
    await expect(container).toBeVisible();
  });
});
