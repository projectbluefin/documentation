const test = require("node:test");
const assert = require("node:assert/strict");

const {
  selectAmd64DigestFromManifest,
  stripEpoch,
  compareRpmVersions,
  findRecentTagsForStream,
  extractBstPackageVersions,
  isSemverLike,
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

const MOCK_STABLE_DAILY_SPEC = {
  id: "bluefin-stable-daily",
  org: "ublue-os",
  package: "bluefin",
  streamPrefix: "stable-daily",
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

test("findRecentTagsForStream: picks stable-daily-YYYYMMDD tags for stable-daily spec", () => {
  const ghcrTags = [
    `stable-daily-${FIXED_RECENT_DATE}`,
    `stable-${FIXED_RECENT_DATE}`,              // different prefix (weekly stable) — must be excluded
    `stable-daily-${FIXED_RECENT_DATE}-hwe`,    // non-canonical suffix — must be excluded
    "latest-20260101",                          // unrelated prefix — must be excluded
  ];
  const result = findRecentTagsForStream(ghcrTags, MOCK_STABLE_DAILY_SPEC);
  assert.equal(result.length, 1, "only the canonical stable-daily-YYYYMMDD tag should be found");
  assert.equal(result[0].tag, `stable-daily-${FIXED_RECENT_DATE}`);
  assert.equal(result[0].cacheKey, `stable-daily-${FIXED_RECENT_DATE}`);
});

test("findRecentTagsForStream: stable spec does not pick stable-daily tags", () => {
  const ghcrTags = [
    `stable-daily-${FIXED_RECENT_DATE}`,
    `stable-${FIXED_RECENT_DATE}`,
  ];
  const result = findRecentTagsForStream(ghcrTags, MOCK_STABLE_SPEC);
  assert.equal(result.length, 1, "stable spec must not pick stable-daily tags");
  assert.equal(result[0].tag, `stable-${FIXED_RECENT_DATE}`);
});

// ---------------------------------------------------------------------------
// BST SPDX extraction (Dakota/BuildStream)
// ---------------------------------------------------------------------------

/**
 * Minimal BST SPDX fixture.
 * Contains:
 *   - gnome-shell  → core/gnome-shell.bst
 *   - linux        → components/linux.bst  (the real kernel)
 *   - linux-headers → bootstrap/linux-headers.bst  (should NOT become kernel)
 *   - mesa         → extensions/mesa/mesa.bst
 *   - linux-raw-sys → Rust crate (no bst-element ref — should be ignored)
 *   - gnome-shell  duplicate with a git SHA version (should be ignored by isSemverLike)
 */
const BST_SPDX_FIXTURE = {
  spdxVersion: "SPDX-2.3",
  packages: [
    {
      name: "gnome-shell",
      versionInfo: "50.0",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "gnome-build-meta.bst:core/gnome-shell.bst",
        },
      ],
    },
    {
      // Duplicate with git SHA — must be ignored (not semver-like)
      name: "gnome-shell",
      versionInfo: "c9372e733d75cff6a940c7a87c3a5f4ef8923df8",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "gnome-build-meta.bst:core/gnome-shell.bst",
        },
      ],
    },
    {
      name: "linux",
      versionInfo: "6.19.11",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "freedesktop-sdk.bst:components/linux.bst",
        },
      ],
    },
    {
      // linux-headers — wrong BST path, must NOT become kernel
      name: "linux",
      versionInfo: "6.19.11",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "freedesktop-sdk.bst:bootstrap/linux-headers.bst",
        },
      ],
    },
    {
      name: "mesa",
      versionInfo: "26.0.5",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "freedesktop-sdk.bst:extensions/mesa/mesa.bst",
        },
      ],
    },
    {
      // Rust crate — no bst-element ref, must be entirely ignored
      name: "linux-raw-sys",
      versionInfo: "0.9.4",
      externalRefs: [
        {
          referenceType: "cpe23Type",
          referenceLocator: "cpe:2.3:a:linux-raw-sys:linux-raw-sys:0.9.4:*",
        },
      ],
    },
    {
      // podman — present so allPackages coverage is confirmed
      name: "podman",
      versionInfo: "5.8.2",
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: "freedesktop-sdk.bst:components/podman.bst",
        },
      ],
    },
  ],
};

test("isSemverLike: accepts semver versions", () => {
  assert.ok(isSemverLike("50.0"));
  assert.ok(isSemverLike("6.19.11"));
  assert.ok(isSemverLike("26.0.5"));
  assert.ok(isSemverLike("1.6.1"));
});

test("isSemverLike: rejects git SHAs and empty strings", () => {
  assert.ok(!isSemverLike("c9372e733d75cff6a940c7a87c3a5f4ef8923df8"));
  assert.ok(!isSemverLike(""));
  assert.ok(!isSemverLike(undefined));
  assert.ok(!isSemverLike(null));
  // 40-char hex string (git SHA without extra chars) — too long
  assert.ok(!isSemverLike("a".repeat(41)));
});

test("extractBstPackageVersions: extracts gnome-shell version", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  assert.equal(result.gnome, "50.0");
});

test("extractBstPackageVersions: extracts kernel from components/linux.bst", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  assert.equal(result.kernel, "6.19.11");
});

test("extractBstPackageVersions: linux-headers.bst does not set kernel", () => {
  // The fixture has two `linux` entries: one is components/linux.bst (correct)
  // and one is bootstrap/linux-headers.bst (wrong). kernel must come from the
  // components/ entry, not the headers entry. If the wrong entry matched, both
  // entries would match and kernel would still be "6.19.11" — but if ONLY the
  // headers entry existed, kernel should be null.
  const headersOnlySpdx = {
    spdxVersion: "SPDX-2.3",
    packages: [
      {
        name: "linux",
        versionInfo: "6.19.11",
        externalRefs: [
          {
            referenceType: "bst-element",
            referenceLocator: "freedesktop-sdk.bst:bootstrap/linux-headers.bst",
          },
        ],
      },
    ],
  };
  const result = extractBstPackageVersions(headersOnlySpdx);
  assert.equal(result.kernel, null, "linux-headers must not be mapped to kernel");
});

test("extractBstPackageVersions: mesa picks extensions/mesa/mesa.bst", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  assert.equal(result.mesa, "26.0.5");
});

test("extractBstPackageVersions: fedora is null (no fedora-release in BST SPDX)", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  assert.equal(result.fedora, null);
});

test("extractBstPackageVersions: Rust crates with no bst-element ref are excluded", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  // linux-raw-sys has only a cpe23Type ref, no bst-element ref — must not appear in allPackages
  assert.ok(!("linux-raw-sys" in result.allPackages));
});

test("extractBstPackageVersions: allPackages includes BST components with semver versions", () => {
  const result = extractBstPackageVersions(BST_SPDX_FIXTURE);
  assert.equal(result.allPackages["gnome-shell"], "50.0");
  assert.equal(result.allPackages["linux"], "6.19.11");
  assert.equal(result.allPackages["mesa"], "26.0.5");
  assert.equal(result.allPackages["podman"], "5.8.2");
});
