const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSlimFrontendStreams } = require("./slim.js");

test("buildSlimFrontendStreams removes allPackages from releases", () => {
  const streams = {
    stable: {
      releases: {
        "40-20240101": {
          tag: "40-20240101",
          packageVersions: {
            kernel: "6.8.1",
            gnome: "46.0",
            mesa: "24.0.3",
            allPackages: [
              { name: "pkg1", version: "1.0" },
              { name: "pkg2", version: "2.0" },
            ],
          },
        },
      },
    },
  };

  const result = buildSlimFrontendStreams(streams);

  assert.equal(result.stable.releases["40-20240101"].packageVersions.kernel, "6.8.1");
  assert.equal(result.stable.releases["40-20240101"].packageVersions.gnome, "46.0");
  assert.equal(result.stable.releases["40-20240101"].packageVersions.mesa, "24.0.3");
  assert.equal(result.stable.releases["40-20240101"].packageVersions.allPackages, undefined);
});

test("buildSlimFrontendStreams handles multiple streams", () => {
  const streams = {
    stable: {
      releases: {
        r1: { packageVersions: { kernel: "6.8", allPackages: ["a"] } },
      },
    },
    latest: {
      releases: {
        r2: { packageVersions: { kernel: "6.9", allPackages: ["b", "c"] } },
      },
    },
  };

  const result = buildSlimFrontendStreams(streams);

  assert.equal(Object.keys(result).length, 2);
  assert.equal(result.stable.releases.r1.packageVersions.allPackages, undefined);
  assert.equal(result.latest.releases.r2.packageVersions.allPackages, undefined);
  assert.equal(result.stable.releases.r1.packageVersions.kernel, "6.8");
  assert.equal(result.latest.releases.r2.packageVersions.kernel, "6.9");
});

test("buildSlimFrontendStreams preserves non-packageVersions fields", () => {
  const streams = {
    stable: {
      metadata: { name: "Bluefin Stable" },
      releases: {
        r1: {
          tag: "40-20240101",
          date: "2024-01-01",
          packageVersions: { kernel: "6.8", allPackages: [] },
        },
      },
    },
  };

  const result = buildSlimFrontendStreams(streams);

  assert.equal(result.stable.metadata.name, "Bluefin Stable");
  assert.equal(result.stable.releases.r1.tag, "40-20240101");
  assert.equal(result.stable.releases.r1.date, "2024-01-01");
});

test("buildSlimFrontendStreams handles empty releases", () => {
  const streams = { stable: { releases: {} } };
  const result = buildSlimFrontendStreams(streams);
  assert.deepEqual(result.stable.releases, {});
});

test("buildSlimFrontendStreams handles missing releases key", () => {
  const streams = { stable: { metadata: { name: "test" } } };
  const result = buildSlimFrontendStreams(streams);
  assert.deepEqual(result.stable.releases, {});
});

test("buildSlimFrontendStreams handles missing packageVersions", () => {
  const streams = {
    stable: {
      releases: {
        r1: { tag: "40-20240101" },
      },
    },
  };

  const result = buildSlimFrontendStreams(streams);
  assert.deepEqual(result.stable.releases.r1.packageVersions, {});
  assert.equal(result.stable.releases.r1.tag, "40-20240101");
});

test("buildSlimFrontendStreams returns empty object for empty input", () => {
  const result = buildSlimFrontendStreams({});
  assert.deepEqual(result, {});
});

test("buildSlimFrontendStreams does not mutate original", () => {
  const streams = {
    stable: {
      releases: {
        r1: { packageVersions: { kernel: "6.8", allPackages: ["a", "b"] } },
      },
    },
  };

  buildSlimFrontendStreams(streams);

  // Original should be untouched
  assert.deepEqual(streams.stable.releases.r1.packageVersions.allPackages, ["a", "b"]);
});
