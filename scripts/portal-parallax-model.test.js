const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    require,
    mod,
    mod.exports,
  );
  return mod.exports;
}

const modelPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "portal",
  "portalModel.ts",
);

test("portal model preserves the website layer contract", () => {
  const {
    PORTAL_BREAKPOINT_PX,
    PORTAL_LAYERS,
    MOBILE_LAYER_SRC,
    TRANSITION_SRC,
  } = loadTsModule(modelPath);

  assert.equal(PORTAL_BREAKPOINT_PX, 956);
  assert.equal(PORTAL_LAYERS.length, 15);
  assert.deepEqual(
    PORTAL_LAYERS.map(({ key, top, rate }) => [key, top, rate]),
    [
      ["sky", 0, 0],
      ["clouds-right", -60, 0],
      ["sun", -90, 0.05],
      ["clouds-left", 0, 0],
      ["mountains", 0, 0],
      ["fog-a", 0, 0],
      ["background-a", 165, 0],
      ["fog-b", 200, 0],
      ["background-b", 175, -0.01],
      ["midground-a", 210, -0.03],
      ["midground-b", 250, -0.05],
      ["midground-c", 300, -0.07],
      ["foreground-a", 320, -0.09],
      ["foreground-b", 340, -0.11],
      ["foreground-c", 360, -0.13],
    ],
  );
  assert.equal(PORTAL_LAYERS[1].drift, "right");
  assert.equal(PORTAL_LAYERS[3].drift, "left");
  assert.equal(
    PORTAL_LAYERS[1].src,
    PORTAL_LAYERS[3].src,
    "byte-identical clouds must share one copied asset",
  );
  assert.equal(MOBILE_LAYER_SRC, "/img/portal/mobile-parallax.webp");
  assert.equal(TRANSITION_SRC, "/img/portal/layer-transition.webp");

  const uniqueSources = new Set(PORTAL_LAYERS.map(({ src }) => src));
  assert.equal(uniqueSources.size, 14);
  for (const src of [...uniqueSources, MOBILE_LAYER_SRC, TRANSITION_SRC]) {
    assert.ok(
      fs.existsSync(path.join(__dirname, "..", "static", src)),
      `missing copied asset ${src}`,
    );
  }
  for (const character of ["bluefin.webp", "karl.webp", "nest.webp"]) {
    assert.ok(
      fs.existsSync(
        path.join(
          __dirname,
          "..",
          "static",
          "img",
          "portal",
          "characters",
          character,
        ),
      ),
      `missing copied character ${character}`,
    );
  }
});

test("portal motion math clamps overlay, preserves rates, and culls", () => {
  const { overlayOpacity, layerTransform, isParallaxVisible } =
    loadTsModule(modelPath);

  assert.equal(overlayOpacity(0, 900), 0);
  assert.equal(overlayOpacity(225, 900), 0);
  assert.equal(overlayOpacity(550, 900), 0.5);
  assert.equal(overlayOpacity(875, 900), 1);
  assert.equal(overlayOpacity(2000, 900), 1);
  assert.equal(layerTransform(100, -0.13), "translate3d(0, -13px, 0)");
  assert.equal(layerTransform(100, 0.05), "translate3d(0, 5px, 0)");
  assert.equal(isParallaxVisible(3000, 3000), true);
  assert.equal(isParallaxVisible(3001, 3000), false);
});

test("hero raptor selector resolves seasonal overrides and random variants", () => {
  const {
    resolveHeroRaptor,
    HERO_RAPTOR_VARIANTS,
    HOLIDAY_RAPTOR_SRC,
    PRIDE_RAPTOR_SRC,
    DEFAULT_HERO_RAPTOR_SRC,
  } = loadTsModule(modelPath);

  assert.equal(
    HOLIDAY_RAPTOR_SRC,
    "/img/portal/characters/header/Holidaysaurus.webp",
  );
  assert.equal(PRIDE_RAPTOR_SRC, "/img/portal/characters/header/pride.webp");
  assert.equal(
    DEFAULT_HERO_RAPTOR_SRC,
    "/img/portal/characters/header/bluefin-small.webp",
  );
  assert.equal(HERO_RAPTOR_VARIANTS.length, 12);
  assert.ok(
    HERO_RAPTOR_VARIANTS.includes(
      "/img/portal/characters/header/bluefin-small.webp",
    ),
  );
  assert.ok(
    !HERO_RAPTOR_VARIANTS.includes(HOLIDAY_RAPTOR_SRC),
    "Holiday raptor is seasonal easter egg, not in default rotation array",
  );
  assert.ok(
    !HERO_RAPTOR_VARIANTS.includes(PRIDE_RAPTOR_SRC),
    "Pride raptor is seasonal easter egg, not in default rotation array",
  );

  // Holiday season: December (month index 11)
  const decDate = new Date(2026, 11, 25);
  assert.equal(resolveHeroRaptor(decDate), HOLIDAY_RAPTOR_SRC);

  // Pride month: June (month index 5)
  const juneDate = new Date(2026, 5, 15);
  assert.equal(resolveHeroRaptor(juneDate), PRIDE_RAPTOR_SRC);

  // Other months: standard rotation using random()
  const sepDate = new Date(2026, 8, 9);
  const firstVariant = resolveHeroRaptor(sepDate, () => 0.0);
  assert.equal(firstVariant, HERO_RAPTOR_VARIANTS[0]);

  const lastVariant = resolveHeroRaptor(sepDate, () => 0.999);
  assert.equal(
    lastVariant,
    HERO_RAPTOR_VARIANTS[HERO_RAPTOR_VARIANTS.length - 1],
  );

  // Verify all files exist on disk
  for (const src of [
    ...HERO_RAPTOR_VARIANTS,
    HOLIDAY_RAPTOR_SRC,
    PRIDE_RAPTOR_SRC,
  ]) {
    assert.ok(
      fs.existsSync(path.join(__dirname, "..", "static", src)),
      `missing hero raptor asset ${src}`,
    );
  }
});
