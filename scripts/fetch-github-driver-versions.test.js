const test = require("node:test");
const assert = require("node:assert/strict");

const {
  lookupSbomVersionsForTag,
  rowFromSbomRelease,
  buildStreamFromSbom,
  buildGdxNvidiaByTagFromSbom,
} = require("./fetch-github-driver-versions.js");

test("lookupSbomVersionsForTag returns packageVersions by stream and key", () => {
  const cache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260331": {
            packageVersions: { kernel: "6.18.13-200", mesa: "25.3.6-6" },
          },
        },
      },
    },
  };

  const result = lookupSbomVersionsForTag(
    cache,
    "bluefin-stable",
    "stable-20260331",
  );
  assert.deepEqual(result, { kernel: "6.18.13-200", mesa: "25.3.6-6" });
});

test("rowFromSbomRelease builds kernel/mesa/gnome from SBOM only", () => {
  const row = rowFromSbomRelease(
    "bluefin-stable",
    "stable-20260331",
    {
      tag: "stable-20260331",
      packageVersions: {
        kernel: "6.18.13-200",
        mesa: "25.3.6-6",
        gnome: "49.5-1",
      },
    },
    "595.58.03-1",
  );

  assert.equal(row.versions.kernel, "6.18.13-200");
  assert.equal(row.versions.mesa, "25.3.6-6");
  assert.equal(row.versions.gnome, "49.5-1");
  assert.equal(row.versions.nvidia, "595.58.03-1");
});

test("buildStreamFromSbom sorts newest-first and marks source sbom", () => {
  const cache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260324": {
            tag: "stable-20260324",
            packageVersions: { kernel: "6.18.12-200", mesa: "25.3.6-4", gnome: "49.5-1" },
          },
          "stable-20260331": {
            tag: "stable-20260331",
            packageVersions: { kernel: "6.18.13-200", mesa: "25.3.6-6", gnome: "49.5-1" },
          },
        },
      },
    },
  };

  const stream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream.",
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
    cache,
    {
      "stable-20260331": "595.58.03-1",
      "stable-20260324": "595.45.04-4",
    },
  );

  assert.equal(stream.source, "sbom");
  assert.equal(stream.latest?.tag, "stable-20260331");
  assert.equal(stream.latest?.versions.kernel, "6.18.13-200");
});

test("buildGdxNvidiaByTagFromSbom builds nvidia map from GDX packageVersions", () => {
  const cache = {
    streams: {
      "bluefin-gdx-lts": {
        releases: {
          "lts-20260502": {
            tag: "lts-20260502",
            packageVersions: { kernel: "6.12.25-204", nvidia: "595.71.05" },
          },
          "lts-20260425": {
            tag: "lts-20260425",
            packageVersions: { kernel: "6.12.24-204", nvidia: "570.144.03" },
          },
          "lts-20260418": {
            tag: "lts-20260418",
            packageVersions: { kernel: "6.12.23-204" },
          },
        },
      },
    },
  };

  const map = buildGdxNvidiaByTagFromSbom(cache);
  assert.equal(map["lts-20260502"], "595.71.05");
  assert.equal(map["lts-20260425"], "570.144.03");
  assert.equal(map["lts-20260418"], undefined, "no nvidia entry when packageVersions.nvidia is absent");
});
