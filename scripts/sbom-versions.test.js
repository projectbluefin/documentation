const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  readSbomCache,
  lookupVersionsForStream,
  lookupVersionsForRelease,
} = require("./lib/sbom-versions.js");

const writeCache = (contents) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sbom-versions-"));
  const file = path.join(dir, "sbom-cache.json");
  fs.writeFileSync(file, contents);
  return file;
};

const CACHE = {
  streams: {
    stable: {
      releases: {
        "stable-20260401": { packageVersions: { kernel: "6.17.4" } },
        "stable-20260331": { packageVersions: { kernel: "6.17.3" } },
        "stable-20260215": { packageVersions: { kernel: "6.16.9" } },
      },
    },
    lts: {
      releases: {
        "lts-20260331": { packageVersions: { kernel: "6.12.20" } },
      },
    },
    empty: { releases: {} },
    noReleases: {},
  },
};

test("readSbomCache parses a cache file from disk", () => {
  const file = writeCache(JSON.stringify(CACHE));
  assert.deepEqual(readSbomCache(file), CACHE);
});

test("readSbomCache returns null for a missing file", () => {
  assert.equal(readSbomCache("/nonexistent/sbom-cache.json"), null);
});

test("readSbomCache returns null instead of throwing on malformed JSON", () => {
  // The Images page renders "unavailable" from a null; a throw would fail the
  // whole build over one corrupt cache.
  assert.equal(readSbomCache(writeCache("{ truncated")), null);
});

test("readSbomCache returns null for an empty file", () => {
  assert.equal(readSbomCache(writeCache("")), null);
});

test("lookupVersionsForStream returns the newest release regardless of key order", () => {
  // Keys are sorted descending, so insertion order must not decide the winner.
  assert.deepEqual(lookupVersionsForStream(CACHE, "stable"), {
    kernel: "6.17.4",
  });
});

test("lookupVersionsForStream skips newer releases that carry no packageVersions", () => {
  const cache = {
    streams: {
      stable: {
        releases: {
          "stable-20260401": {},
          "stable-20260331": { packageVersions: { kernel: "6.17.3" } },
        },
      },
    },
  };
  assert.deepEqual(lookupVersionsForStream(cache, "stable"), {
    kernel: "6.17.3",
  });
});

test("lookupVersionsForStream returns null for an unknown stream", () => {
  assert.equal(lookupVersionsForStream(CACHE, "dakota"), null);
});

test("lookupVersionsForStream returns null for a stream with no releases key", () => {
  assert.equal(lookupVersionsForStream(CACHE, "noReleases"), null);
});

test("lookupVersionsForStream returns null when every release lacks versions", () => {
  assert.equal(lookupVersionsForStream(CACHE, "empty"), null);
  assert.equal(
    lookupVersionsForStream(
      { streams: { s: { releases: { "s-20260101": {} } } } },
      "s",
    ),
    null,
  );
});

test("lookupVersionsForStream tolerates a null or shapeless cache", () => {
  assert.equal(lookupVersionsForStream(null, "stable"), null);
  assert.equal(lookupVersionsForStream(undefined, "stable"), null);
  assert.equal(lookupVersionsForStream({}, "stable"), null);
});

test("lookupVersionsForRelease returns the versions for the exact cache key", () => {
  assert.deepEqual(lookupVersionsForRelease(CACHE, "stable", "stable-20260215"), {
    kernel: "6.16.9",
  });
  assert.deepEqual(lookupVersionsForRelease(CACHE, "lts", "lts-20260331"), {
    kernel: "6.12.20",
  });
});

test("lookupVersionsForRelease does not fall back to another release", () => {
  // The Driver Versions page shows per-release history; a silent fallback
  // would attribute one release's packages to another.
  assert.equal(
    lookupVersionsForRelease(CACHE, "stable", "stable-19990101"),
    null,
  );
});

test("lookupVersionsForRelease does not cross stream boundaries", () => {
  assert.equal(lookupVersionsForRelease(CACHE, "lts", "stable-20260331"), null);
});

test("lookupVersionsForRelease returns null for an unknown stream or empty cache", () => {
  assert.equal(lookupVersionsForRelease(CACHE, "dakota", "dakota-20260331"), null);
  assert.equal(lookupVersionsForRelease(null, "stable", "stable-20260331"), null);
  assert.equal(lookupVersionsForRelease({}, "stable", "stable-20260331"), null);
});

test("a cache read from disk feeds both lookups", () => {
  const cache = readSbomCache(writeCache(JSON.stringify(CACHE)));
  assert.deepEqual(lookupVersionsForStream(cache, "lts"), {
    kernel: "6.12.20",
  });
  assert.deepEqual(lookupVersionsForRelease(cache, "lts", "lts-20260331"), {
    kernel: "6.12.20",
  });
});
