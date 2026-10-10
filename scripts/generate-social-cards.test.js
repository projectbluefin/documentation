const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const redSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><rect width="24" height="12" fill="red"/></svg>';

test("monthly selection follows UTC including November and year rollover", async () => {
  const { selectMonthlyWallpaper } =
    await import("./generate-social-cards.mjs");
  for (let month = 1; month <= 12; month++) {
    const pad = String(month).padStart(2, "0");
    const selected = selectMonthlyWallpaper(
      undefined,
      new Date(`2026-${pad}-15T12:00:00Z`),
    );
    assert.equal(
      selected.file,
      `wallpapers/${pad}-bluefin/${pad}-bluefin-night.${month === 11 ? "svg" : "jxl"}`,
    );
  }
  assert.equal(
    selectMonthlyWallpaper(undefined, new Date("2026-10-31T23:30:00-01:00"))
      .monthIndex,
    11,
  );
  assert.equal(
    selectMonthlyWallpaper(undefined, new Date("2027-01-01T00:00:00Z"))
      .monthIndex,
    1,
  );
});

test("SVG is rasterized and a PNG payload is accepted even under an old extension", async () => {
  const { wallpaperToPngBuffer } = await import("./generate-social-cards.mjs");
  const png = wallpaperToPngBuffer(Buffer.from(redSvg), "11-bluefin-night.svg");
  assert.equal(png.readUInt32BE(16), 2400);
  assert.equal(png.readUInt32BE(20), 1200);
  assert.deepEqual(wallpaperToPngBuffer(png, "11-bluefin-night.jxl"), png);
  assert.throws(
    () => wallpaperToPngBuffer(Buffer.from("broken"), "wallpaper.png"),
    /Unsupported wallpaper format/,
  );
});

test("fetch failures preserve the last card rather than publishing stale success", async () => {
  const { fetchWallpaper, generateSocialCard } =
    await import("./generate-social-cards.mjs");
  const wallpaper = { file: "wallpapers/11-bluefin/11-bluefin-night.svg" };
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bluefin-social-test-"),
  );
  const png = path.join(directory, "meta.png");
  const webp = path.join(directory, "meta.webp");
  fs.writeFileSync(png, "previous PNG");
  fs.writeFileSync(webp, "previous WebP");
  try {
    await assert.rejects(
      generateSocialCard({
        wallpaper,
        outputPathPng: png,
        outputPathWebp: webp,
        loadWallpaper: (w) =>
          fetchWallpaper(
            w,
            async () => new Response("missing", { status: 404 }),
          ),
      }),
      /HTTP 404/,
    );
    assert.equal(fs.readFileSync(png, "utf8"), "previous PNG");
    assert.equal(fs.readFileSync(webp, "utf8"), "previous WebP");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("fresh wallpaper content changes the rendered social card", async () => {
  const { fetchWallpaper, generateSocialCard } =
    await import("./generate-social-cards.mjs");
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bluefin-social-test-"),
  );
  const output = path.join(directory, "meta.png");
  try {
    const render = (svg) =>
      generateSocialCard({
        wallpaper: { file: "wallpapers/11-bluefin/11-bluefin-night.svg" },
        outputPathPng: output,
        outputPathWebp: null,
        loadWallpaper: (w) => fetchWallpaper(w, async () => new Response(svg)),
      });
    await render(redSvg);
    const red = fs.readFileSync(output);
    await render(redSvg.replace('fill="red"', 'fill="blue"'));
    const blue = fs.readFileSync(output);
    assert.notDeepEqual(red, blue);
    assert.equal(blue.readUInt32BE(16), 2400);
    assert.equal(blue.readUInt32BE(20), 1260);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("missing WebP encoder fails strict generation without corrupting the prior WebP", async () => {
  const { generateSocialCard, wallpaperToPngBuffer, MISSING_ENCODER_MESSAGE } =
    await import("./generate-social-cards.mjs");
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "bluefin-social-test-"),
  );
  const png = path.join(directory, "meta.png");
  const webp = path.join(directory, "meta.webp");
  fs.writeFileSync(webp, "previous WebP");
  const options = {
    wallpaper: { file: "november.png" },
    outputPathPng: png,
    outputPathWebp: webp,
    loadWallpaper: async () =>
      wallpaperToPngBuffer(Buffer.from(redSvg), "november.svg"),
    encodeWebp: () => null,
  };
  try {
    await assert.rejects(
      generateSocialCard({ ...options, strict: true }),
      (error) => error.message === MISSING_ENCODER_MESSAGE,
    );
    assert.equal(fs.readFileSync(webp, "utf8"), "previous WebP");
    const result = await generateSocialCard(options);
    assert.equal(result.webp, null);
    assert.equal(fs.readFileSync(png).readUInt32BE(16), 2400);
    assert.equal(fs.readFileSync(webp, "utf8"), "previous WebP");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
