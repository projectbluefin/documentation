const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

function emptyManifest() {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    projects: {
      bluefin: {
        collections: [
          { id: "bluefin-monthly", wallpapers: [] },
          { id: "bluefin-wallpapers-extra", wallpapers: [] },
        ],
      },
      aurora: { collections: [{ id: "aurora-wallpapers", wallpapers: [] }] },
      bazzite: { collections: [{ id: "bazzite-wallpapers", wallpapers: [] }] },
    },
  };
}

test("findBluefinExtraDirectoryCandidates skips known dirs and prefers JXL sources", async () => {
  const { findBluefinExtraDirectoryCandidates } =
    await import("./lib/update-artwork-detection.mjs");

  const tree = [
    { type: "blob", path: "wallpapers/bluefin/png/01-bluefin-day.png" },
    { type: "blob", path: "wallpapers/framework/wallpaper.svg" },
    { type: "blob", path: "wallpapers/custom/custom.png" },
    { type: "blob", path: "wallpapers/custom/custom.jxl" },
  ];

  assert.deepEqual(
    findBluefinExtraDirectoryCandidates(tree, new Set(["framework"])),
    [
      {
        id: "custom",
        outputName: "bluefin-custom",
        srcPath: "wallpapers/custom/custom.jxl",
        ext: ".jxl",
      },
    ],
  );
});

test("findBluefinExtraJxlCandidates ignores monthly Bluefin JXL files and existing ids", async () => {
  const { findBluefinExtraJxlCandidates } =
    await import("./lib/update-artwork-detection.mjs");

  const tree = [
    { type: "blob", path: "wallpapers/bluefin/images/01-bluefin-day.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/02-bluefin-night.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/sunset.jxl" },
    { type: "blob", path: "wallpapers/bluefin/images/already-there.jxl" },
  ];

  assert.deepEqual(
    findBluefinExtraJxlCandidates(tree, new Set(["already-there"])),
    [
      {
        id: "sunset",
        jxlPath: "wallpapers/bluefin/images/sunset.jxl",
        outputName: "bluefin-sunset",
      },
    ],
  );
});

test("findBazziteCandidates normalizes ids, prefers PNG, and skips known source files", async () => {
  const { findBazziteCandidates } =
    await import("./lib/update-artwork-detection.mjs");

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

test("importing the driver does not execute main", async () => {
  const driver = await import("./update-artwork.mjs");
  assert.equal(typeof driver.main, "function");
});

test("fetchRepoTree uses the injected fetch and rejects truncated trees", async () => {
  const { fetchRepoTree } = await import("./update-artwork.mjs");
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ truncated: true, tree: [] }) };
  };

  await assert.rejects(fetchRepoTree({ fetchImpl }), /response was truncated/);
  assert.match(urls[0], /\/git\/trees\/main\?recursive=1$/);
});

test("manifest helpers round-trip through an injected path", async (t) => {
  const { readManifest, writeManifest } = await import("./update-artwork.mjs");
  const directory = mkdtempSync(join(tmpdir(), "update-artwork-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "artwork.json");
  const manifest = emptyManifest();

  writeManifest(manifest, path);

  assert.deepEqual(readManifest(path), manifest);
  assert.equal(readFileSync(path, "utf8").endsWith("\n"), true);
});

test("convertToWebP exposes image commands through an injected runner", async (t) => {
  const { convertToWebP } = await import("./update-artwork.mjs");
  const directory = mkdtempSync(join(tmpdir(), "update-artwork-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const commands = [];

  const result = convertToWebP("/tmp/source.jxl", "sample", ".jxl", {
    run: (command) => commands.push(command),
    thumbnailsDir: join(directory, "thumbnails"),
    fullresDir: join(directory, "fullres"),
  });

  assert.equal(commands.length, 3);
  assert.match(commands[0], /^djxl /);
  assert.match(commands[1], /scale=480:-1/);
  assert.match(commands[2], /min\(1920,iw\)/);
  assert.equal(
    result.thumbnailPath,
    join(directory, "thumbnails", "sample.webp"),
  );
  assert.equal(result.fullresPath, join(directory, "fullres", "sample.webp"));
});

test("sync routines plan each collection without network or conversion", async () => {
  const { syncAurora, syncBazzite, syncBluefinExtras, syncBluefinMonthly } =
    await import("./update-artwork.mjs");
  const manifest = emptyManifest();
  const tree = [
    { type: "blob", path: "wallpapers/bluefin/png/02-bluefin-day.png" },
    { type: "blob", path: "wallpapers/bluefin/png/02-bluefin-night.png" },
    { type: "blob", path: "wallpapers/custom/custom.png" },
    {
      type: "blob",
      path: "wallpapers/aurora/aurora-wallpaper-10/contents/images/3840x2160.jxl",
    },
    { type: "blob", path: "wallpapers/bazzite/images/Space_Theme.png" },
  ];
  const changes = [];
  const options = { dryRun: true };

  assert.equal(await syncBluefinMonthly(manifest, tree, changes, options), 1);
  assert.equal(await syncBluefinExtras(manifest, tree, changes, options), 1);
  assert.equal(await syncAurora(manifest, tree, changes, options), 1);
  assert.equal(await syncBazzite(manifest, tree, changes, options), 1);
  assert.equal(changes.length, 4);
  assert.equal(
    manifest.projects.bluefin.collections[0].wallpapers[0].id,
    "bluefin-02",
  );
  assert.equal(
    manifest.projects.aurora.collections[0].wallpapers[0].jxlUrl.endsWith(
      "/3840x2160.jxl",
    ),
    true,
  );
  assert.equal(
    manifest.projects.bazzite.collections[0].wallpapers[0].id,
    "bazzite-space-theme",
  );
});

test("main fails preflight through the injected runner", async () => {
  const { main } = await import("./update-artwork.mjs");
  let fetched = false;

  await assert.rejects(
    main({
      run: () => {
        throw new Error("missing");
      },
      fetchRepoTreeImpl: async () => {
        fetched = true;
        return [];
      },
    }),
    /Required tool 'djxl' not found/,
  );
  assert.equal(fetched, false);
});

test("main leaves files untouched when there are no changes", async () => {
  const { main } = await import("./update-artwork.mjs");
  let writes = 0;

  await main({
    dryRun: true,
    fetchRepoTreeImpl: async () => [],
    readManifestImpl: emptyManifest,
    writeManifestImpl: () => writes++,
    writeChangesImpl: () => writes++,
  });

  assert.equal(writes, 0);
});
