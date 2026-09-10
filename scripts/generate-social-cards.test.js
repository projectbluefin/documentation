const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("BLUEFIN_MONTHLY_NIGHT_WALLPAPERS contains all 12 calendar months with night wallpapers", async () => {
  const { BLUEFIN_MONTHLY_NIGHT_WALLPAPERS } =
    await import("./generate-social-cards.mjs");
  assert.equal(BLUEFIN_MONTHLY_NIGHT_WALLPAPERS.length, 12);
  for (let m = 1; m <= 12; m++) {
    const pad = String(m).padStart(2, "0");
    const item = BLUEFIN_MONTHLY_NIGHT_WALLPAPERS.find(
      (w) => w.monthIndex === m,
    );
    assert.ok(item, `Month ${m} must exist in pool`);
    assert.equal(item.file, `bluefin-${pad}-night.webp`);
    assert.equal(item.time, "Night");
  }
});

test("selectMonthlyWallpaper selects the correct night wallpaper for given month", async () => {
  const { selectMonthlyWallpaper } =
    await import("./generate-social-cards.mjs");
  const janDate = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  const septDate = new Date(Date.UTC(2026, 8, 10, 2, 0, 0));
  const decDate = new Date(Date.UTC(2026, 11, 25, 18, 0, 0));

  assert.equal(
    selectMonthlyWallpaper(undefined, janDate).file,
    "bluefin-01-night.webp",
  );
  assert.equal(
    selectMonthlyWallpaper(undefined, septDate).file,
    "bluefin-09-night.webp",
  );
  assert.equal(
    selectMonthlyWallpaper(undefined, decDate).file,
    "bluefin-12-night.webp",
  );
});

test("buildUnifiedLockupSvg creates a unified lockup with feDropShadow filter and Documentation paths", async () => {
  const { buildUnifiedLockupSvg } = await import("./generate-social-cards.mjs");
  const fontBold = fs.readFileSync(
    path.join(
      __dirname,
      "../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
    ),
  );
  const sampleWordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="105.658" height="43.183"><path d="M0 0h10v10H0z"/></svg>`;
  const lockup = await buildUnifiedLockupSvg(sampleWordmarkSvg, fontBold);

  assert.ok(lockup.svg.includes("feDropShadow"));
  assert.ok(lockup.svg.includes('filter="url(#brand-shadow)"'));
  assert.ok(lockup.svg.includes('d="M0 0h10v10H0z"'));
  assert.ok(lockup.width > 0);
  assert.equal(lockup.height, 155);
});
