const test = require("node:test");
const assert = require("node:assert/strict");

const {
  selectAmd64DigestFromManifest,
  stripEpoch,
  compareRpmVersions,
  findRecentTagsForStream,
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

const MOCK_STABLE_SPEC = {
  id: "bluefin-stable",
  org: "ublue-os",
  package: "bluefin",
  streamPrefix: "stable",
  keyless: true,
};

// Fixed reference date used across all time-sensitive tests to avoid flakiness.
// Must stay within LOOKBACK_DAYS (90 days) of any future test run — update when stale.
const FIXED_RECENT_DATE = "20260412";

test("findRecentTagsForStream: picks stable-YYYYMMDD tags from GHCR list", () => {
  const ghcrTags = [
    `stable-${FIXED_RECENT_DATE}`,
    "latest-20260101",                        // different stream prefix — must be excluded
    `stable-${FIXED_RECENT_DATE}-hwe`,        // non-canonical suffix — must be excluded
    "v1.0.0",                                 // no date — must be excluded
  ];
  const result = findRecentTagsForStream(ghcrTags, MOCK_STABLE_SPEC);
  assert.equal(result.length, 1, "only the canonical stable-YYYYMMDD tag should be found");
  assert.equal(result[0].tag, `stable-${FIXED_RECENT_DATE}`);
  assert.equal(result[0].cacheKey, `stable-${FIXED_RECENT_DATE}`);
});

test("findRecentTagsForStream: excludes tags older than LOOKBACK_DAYS", () => {
  const oldDate = "20200101"; // way in the past
  const ghcrTags = [`stable-${oldDate}`];
  const result = findRecentTagsForStream(ghcrTags, MOCK_STABLE_SPEC);
  assert.equal(result.length, 0, "old tags must be excluded");
});

test("findRecentTagsForStream: deduplicates same date", () => {
  const ghcrTags = [`stable-${FIXED_RECENT_DATE}`, `stable-${FIXED_RECENT_DATE}`]; // duplicate
  const result = findRecentTagsForStream(ghcrTags, MOCK_STABLE_SPEC);
  assert.equal(result.length, 1, "duplicates must be removed");
});
