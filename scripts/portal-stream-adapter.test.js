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

const adapterPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "portal",
  "portalStreamAdapter.ts",
);

const root = path.join(__dirname, "..");
const imagesData = JSON.parse(
  fs.readFileSync(path.join(root, "static", "data", "images.json"), "utf8"),
);
const driverVersionsData = JSON.parse(
  fs.readFileSync(
    path.join(root, "static", "data", "driver-versions.json"),
    "utf8",
  ),
);

test("stream adapter extracts verified stream versions from documentation build data", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const catalog = adaptStreams(imagesData, driverVersionsData);

  assert.ok(catalog.streams.stable);
  assert.ok(catalog.streams.lts);

  assert.equal(catalog.streams.stable.id, "stable");
  assert.equal(catalog.streams.stable.available, true);
  assert.equal(catalog.streams.stable.recommended, true);
  assert.equal(
    catalog.streams.stable.image,
    "/img/portal/characters/leaping.webp",
  );
  assert.deepEqual(catalog.streams.stable.supportedArch, ["x86"]);
  assert.equal(catalog.streams.stable.versions.gnome, "50.1");
  assert.equal(catalog.streams.stable.versions.kernel, "7.0.8-200.fc44");
  assert.equal(catalog.streams.stable.versions.mesa, "26.0.8");
  assert.equal(catalog.streams.stable.versions.nvidia, "595.71.05");
  assert.equal(catalog.streams.stable.versions.base, "Fedora 44");
  assert.equal(catalog.streams.stable.versions.flatpak, "1.17.7");
  assert.equal(catalog.streams.stable.versions.podman, "5.8.2");

  assert.equal(catalog.streams.lts.id, "lts");
  assert.equal(catalog.streams.lts.available, true);
  assert.equal(catalog.streams.lts.recommended, false);
  assert.equal(
    catalog.streams.lts.image,
    "/img/portal/characters/achillobator.webp",
  );
  assert.deepEqual(catalog.streams.lts.supportedArch, ["x86", "arm"]);
  assert.equal(catalog.streams.lts.versions.gnome, "49.5");
  assert.equal(catalog.streams.lts.versions.kernel, "6.12.0-233.el10");
  assert.equal(catalog.streams.lts.versions.hweKernel, "7.0.8-100.fc43");
  assert.equal(catalog.streams.lts.versions.flatpak, "1.16.0");
  assert.equal(catalog.streams.lts.versions.podman, "5.8.2");
});

test("stream adapter sets available false and shows reason when stream is absent", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const emptyImages = { products: [] };
  const emptyDrivers = { streams: [] };
  const catalog = adaptStreams(emptyImages, emptyDrivers);

  assert.equal(catalog.streams.stable.available, false);
  assert.equal(catalog.streams.stable.unavailableReason, "Will return");
  assert.equal(catalog.streams.lts.available, false);
  assert.equal(catalog.streams.lts.unavailableReason, "Will return");
  assert.equal(catalog.streams.stable.versions, undefined);
  assert.equal(catalog.streams.lts.versions, undefined);
});

test("ecosystem cards link local routes and wolves links absolute url", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const catalog = adaptStreams(imagesData, driverVersionsData);

  assert.equal(catalog.ecosystem.length, 3);
  const [dakota, server, utah] = catalog.ecosystem;

  assert.equal(dakota.title, "Dakota");
  assert.equal(dakota.href, "/dakota");
  assert.equal(dakota.image, "/img/portal/characters/dakota.webp");
  assert.ok(dakota.versionRows.length > 0);

  const dakotaLabels = dakota.versionRows.map((r) => r.label);
  assert.ok(dakotaLabels.includes("Kernel"));
  assert.ok(dakotaLabels.includes("GNOME"));
  assert.ok(dakotaLabels.includes("Mesa"));
  assert.ok(!dakotaLabels.includes("Freedesktop SDK"));
  assert.ok(!dakotaLabels.includes("Homebrew"));

  assert.equal(server.title, "Bluefin Server");
  assert.equal(server.href, "/server");
  assert.equal(server.image, "/img/portal/characters/alamosaurus.webp");
  assert.equal(server.isCenter, true);
  assert.deepEqual(server.versionRows, []);

  assert.equal(utah.title, "Utah");
  assert.equal(utah.href, "/utah");
  assert.equal(utah.image, "/img/portal/characters/utah.webp");
  assert.deepEqual(utah.versionRows, []);

  assert.equal(catalog.wolvesCampaign.title, "Seven Days to the Wolves");
  assert.equal(
    catalog.wolvesCampaign.href,
    "https://projectbluefin.io/wolves/",
  );
  assert.equal(
    catalog.wolvesCampaign.image,
    "/img/portal/wolves/Always%20There.webp",
  );
});

test("stream adapter handles null or undefined inputs safely with explicit unavailable state", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const catalog = adaptStreams(null, undefined);

  assert.equal(catalog.streams.stable.available, false);
  assert.equal(catalog.streams.stable.unavailableReason, "Will return");
  assert.equal(catalog.streams.stable.versions, undefined);
  assert.equal(catalog.streams.lts.available, false);
  assert.equal(catalog.streams.lts.unavailableReason, "Will return");
  assert.equal(catalog.streams.lts.versions, undefined);
  assert.deepEqual(catalog.ecosystem[0].versionRows, []);
});

test("stream adapter determines availability independently and omits missing fields", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const partialImages = {
    products: [
      {
        id: "projectbluefin-bluefin",
        streams: [
          {
            tag: "stable",
            versions: {
              gnome: "50.1",
              kernel: "7.0.8-200.fc44",
              nvidia: null,
              fedora: "F44",
              mesa: null,
            },
          },
        ],
      },
    ],
  };
  const emptyDrivers = { streams: [] };
  const catalog = adaptStreams(partialImages, emptyDrivers);

  assert.equal(catalog.streams.stable.available, true);
  assert.equal(catalog.streams.stable.unavailableReason, undefined);
  assert.equal(catalog.streams.stable.versions.gnome, "50.1");
  assert.equal(catalog.streams.stable.versions.kernel, "7.0.8-200.fc44");
  assert.equal(catalog.streams.stable.versions.base, "Fedora 44");
  assert.equal("nvidia" in catalog.streams.stable.versions, false);
  assert.equal("mesa" in catalog.streams.stable.versions, false);
  assert.equal("hweKernel" in catalog.streams.stable.versions, false);
  assert.equal("flatpak" in catalog.streams.stable.versions, false);
  assert.equal("podman" in catalog.streams.stable.versions, false);

  assert.equal(catalog.streams.lts.available, false);
  assert.equal(catalog.streams.lts.unavailableReason, "Will return");
  assert.equal(catalog.streams.lts.versions, undefined);
});

test("stream adapter selects intended stream by tag/id regardless of stream array ordering", () => {
  const { adaptStreams } = loadTsModule(adapterPath);
  const reorderedImages = {
    products: [
      {
        id: "projectbluefin-bluefin",
        streams: [
          {
            tag: "testing",
            label: "TESTING",
            versions: {
              gnome: "999.0",
              kernel: "999.0.0-testing",
              flatpak: "999.0",
              podman: "999.0",
            },
          },
          {
            tag: "stable",
            label: "STABLE",
            versions: {
              gnome: "50.1",
              kernel: "7.0.8-200.fc44",
              nvidia: "595.71.05",
              fedora: "F44",
              flatpak: "1.17.7",
              mesa: "26.0.8",
              podman: "5.8.2",
            },
          },
        ],
      },
      {
        id: "projectbluefin-bluefin-lts",
        streams: [
          {
            tag: "testing",
            label: "TESTING",
            versions: {
              gnome: "888.0",
              kernel: "888.0.0-testing",
              flatpak: "888.0",
              podman: "888.0",
            },
          },
          {
            tag: "stable",
            label: "STABLE",
            versions: {
              gnome: "49.5",
              kernel: "6.12.0-233.el10",
              flatpak: "1.16.0",
              mesa: "25.2.7",
              podman: "5.8.2",
            },
          },
        ],
      },
      {
        id: "projectbluefin-dakota",
        streams: [
          {
            tag: "testing",
            label: "TESTING",
            versions: {
              kernel: "999.0.0-dakota-testing",
              mesa: "999.0",
            },
          },
          {
            tag: "stable",
            label: "STABLE",
            versions: {
              kernel: "7.0.7",
              gnome: "50.2",
              mesa: "26.0.6",
              nvidia: "595.71.05",
            },
          },
        ],
      },
    ],
  };

  const catalog = adaptStreams(reorderedImages, { streams: [] });

  assert.equal(catalog.streams.stable.versions.gnome, "50.1");
  assert.equal(catalog.streams.stable.versions.kernel, "7.0.8-200.fc44");
  assert.equal(catalog.streams.stable.versions.flatpak, "1.17.7");
  assert.equal(catalog.streams.stable.versions.podman, "5.8.2");

  assert.equal(catalog.streams.lts.versions.gnome, "49.5");
  assert.equal(catalog.streams.lts.versions.kernel, "6.12.0-233.el10");
  assert.equal(catalog.streams.lts.versions.flatpak, "1.16.0");
  assert.equal(catalog.streams.lts.versions.podman, "5.8.2");

  const dakotaRows = catalog.ecosystem[0].versionRows;
  const kernelRow = dakotaRows.find((r) => r.label === "Kernel");
  assert.equal(kernelRow?.value, "7.0.7");
});

test("findImageStream requires exact canonical tag without label or first-stream fallback", () => {
  const { findImageStream } = loadTsModule(adapterPath);

  // Absence: only label matching, tag missing
  const onlyLabel = {
    streams: [{ label: "stable", versions: { gnome: "50.0" } }],
  };
  assert.equal(
    findImageStream(onlyLabel, "stable"),
    undefined,
    "matching label without canonical tag must return undefined",
  );

  // Absence: different tag, no fallback to first stream
  const onlyTesting = {
    streams: [{ tag: "testing", versions: { gnome: "999.0" } }],
  };
  assert.equal(
    findImageStream(onlyTesting, "stable"),
    undefined,
    "missing canonical tag must not fall back to first stream",
  );

  // Out-of-order: exact canonical tag selected even if later in array
  const outOfOrder = {
    streams: [
      { tag: "beta", versions: { gnome: "51.0" } },
      { tag: "stable", versions: { gnome: "50.1" } },
      { tag: "alpha", versions: { gnome: "52.0" } },
    ],
  };
  const matched = findImageStream(outOfOrder, "stable");
  assert.ok(matched);
  assert.equal(matched.tag, "stable");
  assert.equal(matched.versions?.gnome, "50.1");
});

test("missing canonical stable tag makes stream unavailable even if driver versions exist", () => {
  const { adaptStreams } = loadTsModule(adapterPath);

  // Product has only 'testing' stream; driver stream has 'bluefin-stable' versions
  const missingStableImages = {
    products: [
      {
        id: "projectbluefin-bluefin",
        streams: [
          {
            tag: "testing",
            label: "Stable", // label deceptively says Stable, but tag is testing
            versions: { gnome: "999.0", kernel: "999.0" },
          },
        ],
      },
    ],
  };
  const driverData = {
    streams: [
      {
        id: "bluefin-stable",
        latest: { versions: { kernel: "7.0.8", gnome: "50.1" } },
      },
    ],
  };

  const catalog = adaptStreams(missingStableImages, driverData);

  assert.equal(
    catalog.streams.stable.available,
    false,
    "missing exact canonical stable tag must make stream unavailable",
  );
  assert.equal(catalog.streams.stable.unavailableReason, "Will return");
  assert.equal(catalog.streams.stable.versions, undefined);
});
