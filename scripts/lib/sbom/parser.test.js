/**
 * Unit tests for scripts/lib/sbom/parser.js
 *
 * Covers: RPM version comparison, epoch/release stripping,
 * tag filtering, and extractPackageVersions with fixture SBOMs.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

const {
  compareRpmVersions,
  stripEpoch,
  stripRpmRelease,
  extractDateFromTag,
  normaliseLtsTag,
  buildCacheKey,
  findRecentTagsForStream,
  extractPackageVersions,
} = require("./parser.js");

// ---------------------------------------------------------------------------
// compareRpmVersions
// ---------------------------------------------------------------------------

test("compareRpmVersions: equal versions return 0", () => {
  assert.equal(compareRpmVersions("6.18.2-200.fc43", "6.18.2-200.fc43"), 0);
});

test("compareRpmVersions: lower major version is negative", () => {
  assert.ok(compareRpmVersions("5.18.2-200.fc43", "6.18.2-200.fc43") < 0);
});

test("compareRpmVersions: higher patch is positive", () => {
  assert.ok(compareRpmVersions("6.18.13-200.fc43", "6.18.2-200.fc43") > 0);
});

test("compareRpmVersions: numeric segments compared numerically not lexically", () => {
  // "2" < "13" numerically but "2" > "13" lexicographically
  assert.ok(compareRpmVersions("6.18.2", "6.18.13") < 0);
});

test("compareRpmVersions: missing segments treated as 0", () => {
  assert.ok(compareRpmVersions("6.18", "6.18.1") < 0);
});

test("compareRpmVersions: alpha segments compared with localeCompare", () => {
  assert.ok(compareRpmVersions("1.0.alpha", "1.0.beta") < 0);
});

// ---------------------------------------------------------------------------
// stripEpoch
// ---------------------------------------------------------------------------

test("stripEpoch: removes epoch prefix", () => {
  assert.equal(stripEpoch("1:25.3.6-6.fc43"), "25.3.6-6.fc43");
});

test("stripEpoch: no-op when no epoch", () => {
  assert.equal(stripEpoch("25.3.6-6.fc43"), "25.3.6-6.fc43");
});

test("stripEpoch: handles multi-digit epoch", () => {
  assert.equal(stripEpoch("12:1.0.0"), "1.0.0");
});

test("stripEpoch: handles null/undefined", () => {
  assert.equal(stripEpoch(null), null);
  assert.equal(stripEpoch(undefined), undefined);
});

// ---------------------------------------------------------------------------
// stripRpmRelease
// ---------------------------------------------------------------------------

test("stripRpmRelease: strips release suffix", () => {
  assert.equal(stripRpmRelease("49.5-100.el10gnomeqr.el10"), "49.5");
});

test("stripRpmRelease: no-op when no dash", () => {
  assert.equal(stripRpmRelease("49.5"), "49.5");
});

test("stripRpmRelease: handles null/undefined", () => {
  assert.equal(stripRpmRelease(null), null);
  assert.equal(stripRpmRelease(undefined), undefined);
});

test("stripRpmRelease: strips only first dash segment", () => {
  assert.equal(stripRpmRelease("1.2.3-4.fc43.x86_64"), "1.2.3");
});

// ---------------------------------------------------------------------------
// extractDateFromTag
// ---------------------------------------------------------------------------

test("extractDateFromTag: stable tag", () => {
  assert.equal(extractDateFromTag("stable-20260331"), "20260331");
});

test("extractDateFromTag: lts tag with dash", () => {
  assert.equal(extractDateFromTag("lts-20260331"), "20260331");
});

test("extractDateFromTag: lts tag with dot", () => {
  assert.equal(extractDateFromTag("lts.20260331"), "20260331");
});

test("extractDateFromTag: complex prefix", () => {
  assert.equal(extractDateFromTag("lts-hwe-testing-20260331"), "20260331");
});

test("extractDateFromTag: no date returns null", () => {
  assert.equal(extractDateFromTag("latest"), null);
});

test("extractDateFromTag: date in middle returns null", () => {
  assert.equal(extractDateFromTag("20260331-extra"), null);
});

// ---------------------------------------------------------------------------
// normaliseLtsTag
// ---------------------------------------------------------------------------

test("normaliseLtsTag: dot to dash", () => {
  assert.equal(normaliseLtsTag("lts.20260331"), "lts-20260331");
});

test("normaliseLtsTag: lts-hwe dot to dash", () => {
  assert.equal(normaliseLtsTag("lts-hwe.20260501"), "lts-hwe-20260501");
});

test("normaliseLtsTag: latest dot to dash", () => {
  assert.equal(normaliseLtsTag("latest.20260501"), "latest-20260501");
});

test("normaliseLtsTag: already normalised is unchanged", () => {
  assert.equal(normaliseLtsTag("lts-20260331"), "lts-20260331");
});

test("normaliseLtsTag: stable tags pass through unchanged", () => {
  assert.equal(normaliseLtsTag("stable-20260331"), "stable-20260331");
});

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

test("buildCacheKey: constructs prefix-date key", () => {
  assert.equal(buildCacheKey("stable", "20260331"), "stable-20260331");
});

// ---------------------------------------------------------------------------
// findRecentTagsForStream
// ---------------------------------------------------------------------------

test("findRecentTagsForStream: filters and sorts by date descending", () => {
  const tags = [
    "stable-20260601",
    "stable-20260515",
    "stable-20260401",
    "lts-20260601", // different stream, should be excluded
    "stable-20200101", // too old
  ];
  const spec = { streamPrefix: "stable", org: "test", package: "img" };
  const results = findRecentTagsForStream(tags, spec, {
    lookbackDays: 365,
    maxReleases: 3,
  });

  assert.equal(results.length, 3);
  assert.equal(results[0].dateStr, "20260601");
  assert.equal(results[1].dateStr, "20260515");
  assert.equal(results[2].dateStr, "20260401");
  assert.equal(results[0].imageRef, "ghcr.io/test/img:stable-20260601");
});

test("findRecentTagsForStream: deduplicates by cacheKey", () => {
  const tags = ["stable-20260601", "stable-20260601"];
  const spec = { streamPrefix: "stable", org: "test", package: "img" };
  const results = findRecentTagsForStream(tags, spec, {
    lookbackDays: 365,
    maxReleases: 10,
  });

  assert.equal(results.length, 1);
});

test("findRecentTagsForStream: respects maxReleases", () => {
  const tags = [
    "stable-20260601",
    "stable-20260501",
    "stable-20260401",
    "stable-20260301",
  ];
  const spec = { streamPrefix: "stable", org: "test", package: "img" };
  const results = findRecentTagsForStream(tags, spec, {
    lookbackDays: 365,
    maxReleases: 2,
  });

  assert.equal(results.length, 2);
});

test("findRecentTagsForStream: rejects non-canonical tags", () => {
  // lts-hwe-20260601 should NOT match streamPrefix "lts" because
  // normalised form "lts-hwe-20260601" !== "lts-20260601"
  const tags = ["lts-hwe-20260601", "lts-20260601"];
  const spec = { streamPrefix: "lts", org: "test", package: "img" };
  const results = findRecentTagsForStream(tags, spec, {
    lookbackDays: 365,
    maxReleases: 10,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].tag, "lts-20260601");
});

test("findRecentTagsForStream: normalises lts dot tags", () => {
  const tags = ["lts.20260601"];
  const spec = { streamPrefix: "lts", org: "test", package: "img" };
  const results = findRecentTagsForStream(tags, spec, {
    lookbackDays: 365,
    maxReleases: 10,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].tag, "lts-20260601");
});

// ---------------------------------------------------------------------------
// extractPackageVersions — Syft JSON format
// ---------------------------------------------------------------------------

test("extractPackageVersions: extracts key packages from Syft SBOM", () => {
  const fixturePath = path.join(__dirname, "__fixtures__", "syft-sbom.json");
  const fixture = {
    artifacts: [
      { name: "kernel", version: "6.18.2-200.fc43", type: "rpm" },
      { name: "kernel", version: "6.18.13-200.fc43", type: "rpm" },
      { name: "gnome-shell", version: "1:49.5-1.fc43", type: "rpm" },
      { name: "mesa-filesystem", version: "25.1.2-1.fc43", type: "rpm" },
      { name: "podman", version: "5.5.0-1.fc43", type: "rpm" },
      { name: "systemd", version: "257.5-1.fc43", type: "rpm" },
      { name: "bootc", version: "1.2.0-1.fc43", type: "rpm" },
      { name: "pipewire", version: "1.4.1-1.fc43", type: "rpm" },
      { name: "flatpak", version: "1.14.10-1.fc43", type: "rpm" },
      { name: "nvidia-driver", version: "570.100-1.fc43", type: "rpm" },
      { name: "fedora-release-common", version: "43-1.fc43", type: "rpm" },
    ],
  };

  // Write fixture
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));

  try {
    const result = extractPackageVersions(fixturePath);
    assert.notEqual(result, null);
    // Kernel picks the lowest version
    assert.equal(result.kernel, "6.18.2-200.fc43");
    assert.equal(result.gnome, "49.5");
    assert.equal(result.mesa, "25.1.2");
    assert.equal(result.podman, "5.5.0");
    assert.equal(result.systemd, "257.5");
    assert.equal(result.bootc, "1.2.0");
    assert.equal(result.pipewire, "1.4.1");
    assert.equal(result.flatpak, "1.14.10");
    assert.equal(result.nvidia, "570.100");
    assert.equal(result.fedora, "F43");
    // allPackages should have entries
    assert.ok(Object.keys(result.allPackages).length > 0);
    assert.equal(result.allPackages["podman"], "5.5.0");
  } finally {
    fs.rmSync(path.dirname(fixturePath), { recursive: true, force: true });
  }
});

test("extractPackageVersions: returns null for missing path", () => {
  assert.equal(extractPackageVersions(null), null);
  assert.equal(extractPackageVersions(""), null);
});

test("extractPackageVersions: returns null for invalid JSON", () => {
  const fixturePath = path.join(__dirname, "__fixtures__", "bad.json");
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, "not valid json {{{");
  try {
    assert.equal(extractPackageVersions(fixturePath), null);
  } finally {
    fs.rmSync(path.dirname(fixturePath), { recursive: true, force: true });
  }
});

test("extractPackageVersions: returns null for SBOM without artifacts", () => {
  const fixturePath = path.join(__dirname, "__fixtures__", "empty.json");
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify({ version: 1 }));
  try {
    assert.equal(extractPackageVersions(fixturePath), null);
  } finally {
    fs.rmSync(path.dirname(fixturePath), { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// extractPackageVersions — SPDX JSON format
// ---------------------------------------------------------------------------

test("extractPackageVersions: handles SPDX format with pkg:rpm/ PURLs", () => {
  const fixturePath = path.join(__dirname, "__fixtures__", "spdx-sbom.json");
  const fixture = {
    spdxVersion: "SPDX-2.3",
    packages: [
      {
        name: "kernel",
        versionInfo: "6.12.0-224.el10",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceLocator: "pkg:rpm/fedora/kernel@6.12.0-224.el10",
          },
        ],
      },
      {
        name: "podman",
        versionInfo: "5.3.2-1.el10",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceLocator: "pkg:rpm/fedora/podman@5.3.2-1.el10",
          },
        ],
      },
      {
        name: "some-non-rpm",
        versionInfo: "1.0",
        externalRefs: [
          {
            referenceCategory: "OTHER",
            referenceLocator: "cpe:2.3:*:*:*:*:*:*:*:*",
          },
        ],
      },
    ],
  };

  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));

  try {
    const result = extractPackageVersions(fixturePath);
    assert.notEqual(result, null);
    assert.equal(result.kernel, "6.12.0-224.el10");
    assert.equal(result.podman, "5.3.2");
    // non-rpm package should not appear
    assert.equal(result.allPackages["some-non-rpm"], undefined);
  } finally {
    fs.rmSync(path.dirname(fixturePath), { recursive: true, force: true });
  }
});
