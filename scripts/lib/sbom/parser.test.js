/**
 * Unit tests for scripts/lib/sbom/parser.js
 *
 * Covers: compareRpmVersions, stripEpoch, stripRpmRelease,
 * extractDateFromTag, normaliseLtsTag, buildCacheKey,
 * findRecentTagsForStream, extractPackageVersions.
 */

"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  compareRpmVersions,
  stripEpoch,
  stripRpmRelease,
  extractDateFromTag,
  normaliseLtsTag,
  buildCacheKey,
  findRecentTagsForStream,
  extractPackageVersions,
} = require("./parser");

// ---------------------------------------------------------------------------
// compareRpmVersions
// ---------------------------------------------------------------------------

describe("compareRpmVersions", () => {
  it("returns 0 for equal versions", () => {
    assert.equal(compareRpmVersions("1.2.3", "1.2.3"), 0);
  });

  it("compares segments numerically", () => {
    assert.ok(compareRpmVersions("6.18.2-200.fc43", "6.18.13-200.fc43") < 0);
  });

  it("handles shorter version as smaller", () => {
    assert.ok(compareRpmVersions("1.2", "1.2.1") < 0);
  });

  it("handles longer version as larger", () => {
    assert.ok(compareRpmVersions("1.2.1", "1.2") > 0);
  });

  it("handles tilde separator", () => {
    assert.ok(compareRpmVersions("1~rc1", "1~rc2") < 0);
  });

  it("handles pure numeric comparison correctly", () => {
    assert.ok(compareRpmVersions("100", "99") > 0);
  });

  it("falls back to lexicographic for non-numeric segments", () => {
    assert.ok(compareRpmVersions("1.alpha", "1.beta") < 0);
  });
});

// ---------------------------------------------------------------------------
// stripEpoch
// ---------------------------------------------------------------------------

describe("stripEpoch", () => {
  it("removes epoch prefix", () => {
    assert.equal(stripEpoch("1:25.3.6-6.fc43"), "25.3.6-6.fc43");
  });

  it("removes multi-digit epoch", () => {
    assert.equal(stripEpoch("12:1.0"), "1.0");
  });

  it("returns version unchanged when no epoch", () => {
    assert.equal(stripEpoch("25.3.6-6.fc43"), "25.3.6-6.fc43");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(stripEpoch(null), null);
    assert.equal(stripEpoch(undefined), undefined);
  });

  it("handles empty string", () => {
    assert.equal(stripEpoch(""), "");
  });
});

// ---------------------------------------------------------------------------
// stripRpmRelease
// ---------------------------------------------------------------------------

describe("stripRpmRelease", () => {
  it("strips release suffix after dash", () => {
    assert.equal(stripRpmRelease("49.5-100.el10"), "49.5");
  });

  it("returns version unchanged if no dash", () => {
    assert.equal(stripRpmRelease("49.5"), "49.5");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(stripRpmRelease(null), null);
    assert.equal(stripRpmRelease(undefined), undefined);
  });

  it("handles empty string", () => {
    assert.equal(stripRpmRelease(""), "");
  });

  it("strips only at first dash", () => {
    assert.equal(stripRpmRelease("6.12.0-224.el10"), "6.12.0");
  });
});

// ---------------------------------------------------------------------------
// extractDateFromTag
// ---------------------------------------------------------------------------

describe("extractDateFromTag", () => {
  it("extracts date from stable-YYYYMMDD tag", () => {
    assert.equal(extractDateFromTag("stable-20260331"), "20260331");
  });

  it("extracts date from lts-YYYYMMDD tag", () => {
    assert.equal(extractDateFromTag("lts-20260331"), "20260331");
  });

  it("extracts date from dot-separated lts tag", () => {
    assert.equal(extractDateFromTag("lts.20260331"), "20260331");
  });

  it("extracts date from complex prefixed tag", () => {
    assert.equal(extractDateFromTag("lts-hwe-testing-20260331"), "20260331");
  });

  it("returns null for tag without 8-digit date", () => {
    assert.equal(extractDateFromTag("stable-latest"), null);
  });

  it("returns null for tag with no date separator", () => {
    assert.equal(extractDateFromTag("v1.0.0"), null);
  });
});

// ---------------------------------------------------------------------------
// normaliseLtsTag
// ---------------------------------------------------------------------------

describe("normaliseLtsTag", () => {
  it("converts lts.YYYYMMDD to lts-YYYYMMDD", () => {
    assert.equal(normaliseLtsTag("lts.20260331"), "lts-20260331");
  });

  it("converts lts-hwe.YYYYMMDD to lts-hwe-YYYYMMDD", () => {
    assert.equal(normaliseLtsTag("lts-hwe.20260501"), "lts-hwe-20260501");
  });

  it("converts latest.YYYYMMDD to latest-YYYYMMDD", () => {
    assert.equal(normaliseLtsTag("latest.20260501"), "latest-20260501");
  });

  it("does not modify already-normalised tags", () => {
    assert.equal(normaliseLtsTag("lts-20260331"), "lts-20260331");
  });

  it("does not modify stable tags (no dot pattern)", () => {
    assert.equal(normaliseLtsTag("stable-20260331"), "stable-20260331");
  });
});

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------

describe("buildCacheKey", () => {
  it("builds stream-prefixed cache key", () => {
    assert.equal(buildCacheKey("stable", "20260331"), "stable-20260331");
  });

  it("handles lts prefix", () => {
    assert.equal(buildCacheKey("lts", "20260501"), "lts-20260501");
  });
});

// ---------------------------------------------------------------------------
// findRecentTagsForStream
// ---------------------------------------------------------------------------

describe("findRecentTagsForStream", () => {
  const spec = {
    streamPrefix: "stable",
    org: "projectbluefin",
    package: "bluefin",
  };

  it("returns empty array for no matching tags", () => {
    const result = findRecentTagsForStream(["lts-20260101"], spec);
    assert.deepEqual(result, []);
  });

  it("filters tags matching stream prefix", () => {
    // Use a date within lookback window (today-ish)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const tags = [`stable-${dateStr}`, `lts-${dateStr}`];
    const result = findRecentTagsForStream(tags, spec, { lookbackDays: 90 });
    assert.equal(result.length, 1);
    assert.equal(result[0].tag, `stable-${dateStr}`);
  });

  it("rejects tags outside lookback window", () => {
    const result = findRecentTagsForStream(
      ["stable-20200101"],
      spec,
      { lookbackDays: 90 },
    );
    assert.deepEqual(result, []);
  });

  it("limits results to maxReleases", () => {
    const now = new Date();
    const tags = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      tags.push(`stable-${d.toISOString().slice(0, 10).replace(/-/g, "")}`);
    }
    const result = findRecentTagsForStream(tags, spec, {
      lookbackDays: 90,
      maxReleases: 5,
    });
    assert.equal(result.length, 5);
  });

  it("sorts results by date descending", () => {
    const now = new Date();
    const tags = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      tags.push(`stable-${d.toISOString().slice(0, 10).replace(/-/g, "")}`);
    }
    // Shuffle input
    tags.reverse();
    const result = findRecentTagsForStream(tags, spec, { lookbackDays: 90 });
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].dateStr >= result[i].dateStr);
    }
  });

  it("deduplicates by cacheKey", () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const tags = [`stable-${dateStr}`, `stable-${dateStr}`];
    const result = findRecentTagsForStream(tags, spec, { lookbackDays: 90 });
    assert.equal(result.length, 1);
  });

  it("normalises lts dot-separated tags", () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const ltsSpec = { ...spec, streamPrefix: "lts" };
    const tags = [`lts.${dateStr}`];
    const result = findRecentTagsForStream(tags, ltsSpec, { lookbackDays: 90 });
    assert.equal(result.length, 1);
    assert.equal(result[0].tag, `lts-${dateStr}`);
  });

  it("rejects non-canonical tags (extra suffixes)", () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const tags = [`stable-${dateStr}-extra`];
    const result = findRecentTagsForStream(tags, spec, { lookbackDays: 90 });
    assert.deepEqual(result, []);
  });

  it("builds correct imageRef", () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const tag = `stable-${dateStr}`;
    const result = findRecentTagsForStream([tag], spec, { lookbackDays: 90 });
    assert.equal(
      result[0].imageRef,
      `ghcr.io/projectbluefin/bluefin:${tag}`,
    );
  });
});

// ---------------------------------------------------------------------------
// extractPackageVersions
// ---------------------------------------------------------------------------

describe("extractPackageVersions", () => {
  const fixtureDir = path.join(__dirname, "__fixtures__");

  // Create fixtures on demand for tests
  function writeSyftFixture(filename, content) {
    if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
    const filepath = path.join(fixtureDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(content));
    return filepath;
  }

  it("returns null for null path", () => {
    assert.equal(extractPackageVersions(null), null);
  });

  it("returns null for non-existent file", () => {
    assert.equal(extractPackageVersions("/nonexistent/sbom.json"), null);
  });

  it("returns null for invalid JSON", () => {
    const filepath = writeSyftFixture("invalid.json", "not json");
    // overwrite with raw text
    fs.writeFileSync(filepath, "this is not json");
    assert.equal(extractPackageVersions(filepath), null);
  });

  it("returns null when no artifacts array in Syft format", () => {
    const filepath = writeSyftFixture("no-artifacts.json", { something: [] });
    assert.equal(extractPackageVersions(filepath), null);
  });

  it("extracts kernel, gnome, mesa from Syft SBOM", () => {
    const sbom = {
      artifacts: [
        { name: "kernel", version: "6.18.2-200.fc43", type: "rpm" },
        { name: "gnome-shell", version: "1:49.5-100.fc43", type: "rpm" },
        { name: "mesa-filesystem", version: "25.1.0-1.fc43", type: "rpm" },
        { name: "podman", version: "5.5.0-1.fc43", type: "rpm" },
        { name: "systemd", version: "257.1-3.fc43", type: "rpm" },
        { name: "bootc", version: "1.2.0-1.fc43", type: "rpm" },
        { name: "fedora-release-common", version: "43-1", type: "rpm" },
        { name: "pipewire", version: "1.2.3-1.fc43", type: "rpm" },
        { name: "flatpak", version: "1.15.0-1.fc43", type: "rpm" },
        { name: "nvidia-driver", version: "570.86.16-1.fc43", type: "rpm" },
      ],
    };
    const filepath = writeSyftFixture("syft-full.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.kernel, "6.18.2-200.fc43");
    assert.equal(result.gnome, "49.5");
    assert.equal(result.mesa, "25.1.0");
    assert.equal(result.podman, "5.5.0");
    assert.equal(result.systemd, "257.1");
    assert.equal(result.bootc, "1.2.0");
    assert.equal(result.fedora, "F43");
    assert.equal(result.pipewire, "1.2.3");
    assert.equal(result.flatpak, "1.15.0");
    assert.equal(result.nvidia, "570.86.16");
  });

  it("picks lowest kernel version when multiple kernels present", () => {
    const sbom = {
      artifacts: [
        { name: "kernel", version: "6.18.13-200.fc43", type: "rpm" },
        { name: "kernel", version: "6.18.2-200.fc43", type: "rpm" },
      ],
    };
    const filepath = writeSyftFixture("multi-kernel.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.kernel, "6.18.2-200.fc43");
  });

  it("collects allPackages map for all RPMs", () => {
    const sbom = {
      artifacts: [
        { name: "bash", version: "5.2.26-1.fc43", type: "rpm" },
        { name: "curl", version: "1:8.7.1-1.fc43", type: "rpm" },
        { name: "kernel", version: "6.18.2-200.fc43", type: "rpm" },
      ],
    };
    const filepath = writeSyftFixture("all-packages.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.allPackages["bash"], "5.2.26");
    assert.equal(result.allPackages["curl"], "8.7.1");
    assert.equal(result.allPackages["kernel"], "6.18.2-200.fc43");
  });

  it("skips non-rpm artifacts", () => {
    const sbom = {
      artifacts: [
        { name: "kernel", version: "6.18.2-200.fc43", type: "rpm" },
        { name: "some-go-lib", version: "1.0.0", type: "go-module" },
      ],
    };
    const filepath = writeSyftFixture("mixed-types.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.allPackages["some-go-lib"], undefined);
  });

  it("handles SPDX format with pkg:rpm/ PURLs", () => {
    const sbom = {
      spdxVersion: "SPDX-2.3",
      packages: [
        {
          name: "kernel",
          versionInfo: "6.18.2-200.fc43",
          externalRefs: [
            {
              referenceCategory: "PACKAGE-MANAGER",
              referenceLocator: "pkg:rpm/fedora/kernel@6.18.2-200.fc43",
            },
          ],
        },
        {
          name: "gnome-shell",
          versionInfo: "49.5-100.fc43",
          externalRefs: [
            {
              referenceCategory: "PACKAGE-MANAGER",
              referenceLocator: "pkg:rpm/fedora/gnome-shell@49.5",
            },
          ],
        },
      ],
    };
    const filepath = writeSyftFixture("spdx-rpm.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.kernel, "6.18.2-200.fc43");
    assert.equal(result.gnome, "49.5");
  });

  it("handles BST SPDX format with bst-element refs", () => {
    const sbom = {
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
          name: "mesa",
          versionInfo: "25.0.5",
          externalRefs: [
            {
              referenceType: "bst-element",
              referenceLocator: "freedesktop-sdk.bst:extensions/mesa/mesa.bst",
            },
          ],
        },
      ],
    };
    const filepath = writeSyftFixture("bst-spdx.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.gnome, "50.0");
    assert.equal(result.kernel, "6.19.11");
    assert.equal(result.mesa, "25.0.5");
    assert.equal(result.fedora, null); // BST has no Fedora
  });

  it("handles empty artifacts array", () => {
    const sbom = { artifacts: [] };
    const filepath = writeSyftFixture("empty-artifacts.json", sbom);
    const result = extractPackageVersions(filepath);

    assert.notEqual(result, null);
    assert.equal(result.kernel, null);
    assert.deepEqual(result.allPackages, {});
  });
});
