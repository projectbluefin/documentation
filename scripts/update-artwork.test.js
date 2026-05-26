const test = require("node:test");
const assert = require("node:assert/strict");

test("findBluefinExtraDirectoryCandidates skips known dirs and prefers JXL sources", async () => {
  const { findBluefinExtraDirectoryCandidates } = await import("./lib/update-artwork-detection.mjs");

  const tree = [
    { type: "blob", path: "wallpapers/bluefin/png/01-bluefin-day.png" },
    { type: "blob", path: "wallpapers/framework/wallpaper.svg" },
    { type: "blob", path: "wallpapers/custom/custom.png" },
    { type: "blob", path: "wallpapers/custom/custom.jxl" },
  ];

  assert.deepEqual(findBluefinExtraDirectoryCandidates(tree, new Set(["framework"])), [
    {
      id: "custom",
      outputName: "bluefin-custom",
      srcPath: "wallpapers/custom/custom.jxl",
      ext: ".jxl",
    },
  ]);
});

test("findBluefinExtraJxlCandidates ignores monthly Bluefin JXL files and existing ids", async () => {
  const { findBluefinExtraJxlCandidates } = await import("./lib/update-artwork-detection.mjs");

  const tree = [
    { type: "blob", path: "wallpapers/bluefin/images/01-bluefin-day.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/02-bluefin-night.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/sunset.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/already-there.jxl" },
  ];

  assert.deepEqual(findBluefinExtraJxlCandidates(tree, new Set(["already-there"])), [
    {
      id: "sunset",
      jxlPath: "wallpapers/bluefin/images/sunset.jxl",
      outputName: "bluefin-sunset",
    },
  ]);
});

test("findBazziteCandidates normalizes ids, prefers PNG, and skips known source files", async () => {
  const { findBazziteCandidates } = await import("./lib/update-artwork-detection.mjs");

  const tree = [
    { type: "blob", path: "wallpapers/bazzite/images/Bazzite_Giants.jpg" },
    { type: "blob", path: "wallpapers/bazzite/images/Space Theme.png" },
    { type: "blob", path: "wallpapers/bazzite/images/Space Theme.jxl" },
  ];

  assert.deepEqual(
    findBazziteCandidates(tree, new Set(), new Set(["bazzite_giants.jpg"])),
    [
      {
        id: "bazzite-space-theme",
        base: "Space Theme",
        outputName: "bazzite-space-theme",
        primaryExt: "png",
        primaryPath: "wallpapers/bazzite/images/Space Theme.png",
        jxlPath: "wallpapers/bazzite/images/Space Theme.jxl",
      },
    ],
  );
});
