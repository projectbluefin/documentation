"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { readSbomCache, lookupVersionsForStream, lookupVersionsForRelease } = require("./sbom-versions.js");

// ---------------------------------------------------------------------------
// readSbomCache
// ---------------------------------------------------------------------------

describe("readSbomCache", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sbom-versions-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null for non-existent file", () => {
    const result = readSbomCache(path.join(tmpDir, "does-not-exist.json"));
    assert.strictEqual(result, null);
  });

  it("parses valid JSON file", () => {
    const data = { streams: { stable: { releases: {} } } };
    const filePath = path.join(tmpDir, "cache.json");
    fs.writeFileSync(filePath, JSON.stringify(data));
    const result = readSbomCache(filePath);
    assert.deepStrictEqual(result, data);
  });

  it("returns null for invalid JSON content", () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "not valid json {{{{");
    const result = readSbomCache(filePath);
    assert.strictEqual(result, null);
  });

  it("returns null for empty file", () => {
    const filePath = path.join(tmpDir, "empty.json");
    fs.writeFileSync(filePath, "");
    const result = readSbomCache(filePath);
    assert.strictEqual(result, null);
  });

  it("handles complex nested JSON", () => {
    const data = {
      streams: {
        stable: {
          releases: {
            "stable-20260331": {
              packageVersions: { kernel: "6.12.5", gnome: "47.3" },
            },
          },
        },
      },
    };
    const filePath = path.join(tmpDir, "complex.json");
    fs.writeFileSync(filePath, JSON.stringify(data));
    const result = readSbomCache(filePath);
    assert.deepStrictEqual(result, data);
  });
});

// ---------------------------------------------------------------------------
// lookupVersionsForStream
// ---------------------------------------------------------------------------

describe("lookupVersionsForStream", () => {
  it("returns null for null cache", () => {
    assert.strictEqual(lookupVersionsForStream(null, "stable"), null);
  });

  it("returns null for undefined cache", () => {
    assert.strictEqual(lookupVersionsForStream(undefined, "stable"), null);
  });

  it("returns null for missing stream", () => {
    const cache = { streams: { lts: { releases: {} } } };
    assert.strictEqual(lookupVersionsForStream(cache, "stable"), null);
  });

  it("returns null for stream with no releases", () => {
    const cache = { streams: { stable: {} } };
    assert.strictEqual(lookupVersionsForStream(cache, "stable"), null);
  });

  it("returns null when releases have no packageVersions", () => {
    const cache = {
      streams: {
        stable: {
          releases: {
            "stable-20260301": { someOtherField: true },
            "stable-20260201": { someOtherField: true },
          },
        },
      },
    };
    assert.strictEqual(lookupVersionsForStream(cache, "stable"), null);
  });

  it("returns packageVersions from the most recent release (sorted desc)", () => {
    const oldVersions = { kernel: "6.11.0", gnome: "46.0" };
    const newVersions = { kernel: "6.12.5", gnome: "47.3" };
    const cache = {
      streams: {
        stable: {
          releases: {
            "stable-20260201": { packageVersions: oldVersions },
            "stable-20260331": { packageVersions: newVersions },
            "stable-20260101": { packageVersions: { kernel: "6.10.0" } },
          },
        },
      },
    };
    const result = lookupVersionsForStream(cache, "stable");
    assert.deepStrictEqual(result, newVersions);
  });

  it("skips entries without packageVersions and returns next valid one", () => {
    const versions = { kernel: "6.12.5" };
    const cache = {
      streams: {
        stable: {
          releases: {
            "stable-20260331": { noVersions: true },
            "stable-20260301": { packageVersions: versions },
          },
        },
      },
    };
    const result = lookupVersionsForStream(cache, "stable");
    assert.deepStrictEqual(result, versions);
  });

  it("works with lts stream", () => {
    const versions = { kernel: "6.6.70" };
    const cache = {
      streams: {
        lts: {
          releases: {
            "lts-20260331": { packageVersions: versions },
          },
        },
      },
    };
    assert.deepStrictEqual(lookupVersionsForStream(cache, "lts"), versions);
  });
});

// ---------------------------------------------------------------------------
// lookupVersionsForRelease
// ---------------------------------------------------------------------------

describe("lookupVersionsForRelease", () => {
  const cache = {
    streams: {
      stable: {
        releases: {
          "stable-20260331": { packageVersions: { kernel: "6.12.5", gnome: "47.3" } },
          "stable-20260201": { packageVersions: { kernel: "6.11.0" } },
        },
      },
    },
  };

  it("returns packageVersions for a specific release", () => {
    const result = lookupVersionsForRelease(cache, "stable", "stable-20260331");
    assert.deepStrictEqual(result, { kernel: "6.12.5", gnome: "47.3" });
  });

  it("returns different release data for different keys", () => {
    const result = lookupVersionsForRelease(cache, "stable", "stable-20260201");
    assert.deepStrictEqual(result, { kernel: "6.11.0" });
  });

  it("returns null for non-existent release key", () => {
    const result = lookupVersionsForRelease(cache, "stable", "stable-20250101");
    assert.strictEqual(result, null);
  });

  it("returns null for non-existent stream", () => {
    const result = lookupVersionsForRelease(cache, "beta", "beta-20260331");
    assert.strictEqual(result, null);
  });

  it("returns null for null cache", () => {
    assert.strictEqual(lookupVersionsForRelease(null, "stable", "stable-20260331"), null);
  });

  it("returns null for undefined cache", () => {
    assert.strictEqual(lookupVersionsForRelease(undefined, "stable", "stable-20260331"), null);
  });

  it("returns null when release entry has no packageVersions", () => {
    const cacheNoVer = {
      streams: {
        stable: {
          releases: {
            "stable-20260331": { otherData: true },
          },
        },
      },
    };
    assert.strictEqual(lookupVersionsForRelease(cacheNoVer, "stable", "stable-20260331"), null);
  });
});
