const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const staticDir = path.join(repoRoot, "static");

test("bluefin documentation wordmark assets exist and meet SVG requirements", () => {
  const assets = [
    "static/img/bluefin-documentation-wordmark.svg",
    "static/img/bluefin-documentation-wordmark-dark.svg",
    "static/img/bluefin-documentation-wordmark-light.svg",
  ];

  for (const relPath of assets) {
    const fullPath = path.join(repoRoot, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const content = fs.readFileSync(fullPath, "utf8");
    assert.ok(content.length > 50, `${relPath} must not be empty`);
    assert.ok(
      content.includes('viewBox="0 0 374 43.183"'),
      `${relPath} must have correct viewBox 0 0 374 43.183`,
    );
    assert.ok(
      !content.match(/<rect\s+width="374"/),
      `${relPath} must not contain opaque background rect`,
    );
    assert.ok(
      content.includes("#4285f4"),
      `${relPath} must include brand accent color #4285f4`,
    );
  }
});

test("social cards generator script and template exist", () => {
  const scriptPath = path.join(repoRoot, "scripts/generate-social-cards.js");
  const templatePath = path.join(
    repoRoot,
    "scripts/social-cards/template.html",
  );

  assert.ok(fs.existsSync(scriptPath), "generate-social-cards.js must exist");
  assert.ok(
    fs.existsSync(templatePath),
    "social-cards/template.html must exist",
  );

  const templateContent = fs.readFileSync(templatePath, "utf8");
  assert.ok(
    templateContent.includes('class="background"'),
    "template must have background element",
  );
  assert.ok(
    templateContent.includes('class="wordmark-wrap"'),
    "template must have wordmark-wrap element",
  );
});

test("wallpaper pool contains 24 monthly pairs and 12 extra wolves illustrations with no Aurora or Xe assets", async () => {
  const {
    BLUEFIN_MONTHLY_WALLPAPERS,
    BLUEFIN_EXTRA_WALLPAPERS,
    getAllowedWallpapers,
    selectMonthlyWallpaper,
  } = await import("./generate-social-cards.js");

  assert.equal(
    BLUEFIN_MONTHLY_WALLPAPERS.length,
    24,
    "must contain exactly 24 monthly wallpapers",
  );
  assert.equal(
    BLUEFIN_EXTRA_WALLPAPERS.length,
    12,
    "must contain exactly 12 extra wallpapers",
  );

  const pool = getAllowedWallpapers();
  assert.equal(pool.length, 36, "pool must contain exactly 36 wallpapers");

  for (const item of pool) {
    assert.ok(
      !/aurora|xe_/i.test(item.file),
      `wallpaper ${item.file} must not contain aurora or xe`,
    );
    const filePath = path.join(staticDir, "img/wallpapers", item.file);
    assert.ok(
      fs.existsSync(filePath),
      `file ${item.file} must exist in static/img/wallpapers/`,
    );
  }

  // Monthly selection defaults to Night matching the specification
  const septDate = new Date(Date.UTC(2026, 8, 15, 12, 0, 0)); // September
  const selected = selectMonthlyWallpaper(pool, septDate, "Night");
  assert.equal(
    selected.file,
    "bluefin-09-night.webp",
    "September docs preview must use bluefin-09-night.webp",
  );
});

test("pre-rendered social preview cards exist in static/cards/", () => {
  const cardsDir = path.join(staticDir, "cards");
  assert.ok(fs.existsSync(cardsDir), "static/cards/ must exist");
  const files = fs.readdirSync(cardsDir).filter((f) => f.endsWith(".webp"));
  assert.equal(
    files.length,
    36,
    "must have all 36 pre-rendered cards in static/cards/",
  );
  assert.ok(
    fs.existsSync(path.join(cardsDir, "bluefin-09-night.webp")),
    "must include bluefin-09-night.webp",
  );
});
