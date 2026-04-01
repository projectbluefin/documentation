const test = require("node:test");
const assert = require("node:assert/strict");

const {
  selectAmd64DigestFromManifest,
  stripEpoch,
  compareRpmVersions,
} = require("./fetch-github-sbom.js");

test("selectAmd64DigestFromManifest picks linux/amd64 from multi-arch index", () => {
  const manifest = {
    manifests: [
      {
        digest: "sha256:arm64",
        platform: { os: "linux", architecture: "arm64" },
      },
      {
        digest: "sha256:amd64",
        platform: { os: "linux", architecture: "amd64" },
      },
    ],
  };

  assert.equal(
    selectAmd64DigestFromManifest(manifest, "sha256:index"),
    "sha256:amd64",
  );
});

test("selectAmd64DigestFromManifest uses content digest for single-arch manifest", () => {
  const singleArchManifest = {
    schemaVersion: 2,
    config: { digest: "sha256:wrong-config-digest" },
  };

  assert.equal(
    selectAmd64DigestFromManifest(singleArchManifest, "sha256:manifest-digest"),
    "sha256:manifest-digest",
  );
});

test("stripEpoch removes rpm epoch prefix", () => {
  assert.equal(stripEpoch("1:25.3.6-6.fc43"), "25.3.6-6.fc43");
  assert.equal(stripEpoch("25.3.6-6.fc43"), "25.3.6-6.fc43");
});

test("compareRpmVersions compares numeric segments correctly", () => {
  assert.ok(compareRpmVersions("6.18.2-200", "6.18.13-200") < 0);
  assert.ok(compareRpmVersions("6.18.13-200", "6.18.2-200") > 0);
  assert.equal(compareRpmVersions("6.18.13-200", "6.18.13-200"), 0);
});
