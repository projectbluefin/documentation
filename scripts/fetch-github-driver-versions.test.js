const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  lookupSbomVersionsForTag,
  rowFromSbomRelease,
  buildStreamFromSbom,
  buildNvidiaMapFromSbomStream,
  buildGdxNvidiaByTagFromSbom,
  handleUnavailableCache,
  cacheAgeHours,
  isValidCachedOutput,
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
            packageVersions: {
              kernel: "6.18.12-200",
              mesa: "25.3.6-4",
              gnome: "49.5-1",
            },
          },
          "stable-20260331": {
            tag: "stable-20260331",
            packageVersions: {
              kernel: "6.18.13-200",
              mesa: "25.3.6-6",
              gnome: "49.5-1",
            },
          },
        },
      },
    },
  };

  const stream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream.",
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
    cache,
    {
      "stable-20260331": "595.58.03-1",
      "stable-20260324": "595.45.04-4",
    },
    9999, // Use huge lookback historyDays to prevent age filtering in test
  );

  assert.equal(stream.source, "sbom");
  assert.equal(stream.latest?.tag, "stable-20260331");
  assert.equal(stream.latest?.versions.kernel, "6.18.13-200");
});

test("buildStreamFromSbom builds Utah testing stream", () => {
  const cache = {
    streams: {
      "utah-testing": {
        releases: {
          "testing-20260906": {
            tag: "testing-20260906",
            packageVersions: {
              kernel: "6.18.13-200.fc43",
              mesa: "25.3.6",
              gnome: "50.0",
            },
          },
        },
      },
    },
  };

  const stream = buildStreamFromSbom(
    "utah-testing",
    "Utah",
    "Project Hummingbird-based image from projectbluefin/utah.",
    "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing",
    cache,
    { "testing-20260906": "595.71.05" },
    9999,
  );

  assert.equal(stream.id, "utah-testing");
  assert.equal(stream.name, "Utah");
  assert.equal(
    stream.latest?.releaseUrl,
    "https://github.com/projectbluefin/utah/releases/tag/testing-20260906",
  );
  assert.equal(stream.latest?.versions.kernel, "6.18.13-200.fc43");
  assert.equal(stream.latest?.versions.nvidia, "595.71.05");
});

test("handleUnavailableCache writes an explicit fallback", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "driver-versions-test-"),
  );
  const outputFile = path.join(directory, "driver-versions.json");

  try {
    const output = handleUnavailableCache("SBOM cache unavailable", outputFile);
    assert.equal(output.unavailable, true);
    assert.equal(output.stateReason, "SBOM cache unavailable");
    assert.deepEqual(JSON.parse(fs.readFileSync(outputFile, "utf-8")), output);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
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
  assert.equal(
    map["lts-20260418"],
    undefined,
    "no nvidia entry when packageVersions.nvidia is absent",
  );
});

test("buildNvidiaMapFromSbomStream builds nvidia map from bluefin-nvidia-open-stable", () => {
  const cache = {
    streams: {
      "bluefin-nvidia-open-stable": {
        releases: {
          "stable-20260501": {
            tag: "stable-20260501",
            packageVersions: { kernel: "6.14.4-300", nvidia: "595.71.05" },
          },
          "stable-20260425": {
            tag: "stable-20260425",
            packageVersions: { kernel: "6.14.3-300", nvidia: "570.144.03" },
          },
          "stable-20260418": {
            tag: "stable-20260418",
            packageVersions: { kernel: "6.14.2-300" },
          },
        },
      },
    },
  };

  const map = buildNvidiaMapFromSbomStream(cache, "bluefin-nvidia-open-stable");
  assert.equal(map["stable-20260501"], "595.71.05");
  assert.equal(map["stable-20260425"], "570.144.03");
  assert.equal(
    map["stable-20260418"],
    undefined,
    "no nvidia entry when packageVersions.nvidia is absent",
  );
});

test("cacheAgeHours uses generatedAt instead of the file mtime", () => {
  const generatedAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

  assert.ok(cacheAgeHours({ generatedAt }) >= 9.9);
});

test("isValidCachedOutput rejects a cache missing an SBOM-backed stream", () => {
  const sbomCache = {
    streams: {
      "bluefin-stable": { releases: { "stable-20260906": {} } },
      "bluefin-lts": { releases: { "lts-20260906": {} } },
      "utah-testing": { releases: { "testing-20260906": {} } },
    },
  };
  const cachedOutput = {
    generatedAt: new Date().toISOString(),
    streams: [
      { id: "bluefin-stable", source: "sbom" },
      { id: "bluefin-lts", source: "sbom" },
    ],
  };

  assert.equal(isValidCachedOutput(cachedOutput, sbomCache), false);
});

test("isValidCachedOutput rejects a cache containing a non-SBOM stream", () => {
  const sbomCache = {
    streams: {
      "bluefin-stable": { releases: { "stable-20260906": {} } },
      "bluefin-lts": { releases: { "lts-20260906": {} } },
    },
  };
  const cachedOutput = {
    generatedAt: new Date().toISOString(),
    streams: [
      { id: "bluefin-stable", source: "sbom" },
      { id: "bluefin-lts", source: "github" },
    ],
  };

  assert.equal(isValidCachedOutput(cachedOutput, sbomCache), false);
});

test("buildNvidiaMapFromSbomStream looks up Utah testing NVIDIA versions", () => {
  const cache = {
    streams: {
      "utah-nvidia-testing": {
        releases: {
          "testing-20260906": {
            tag: "testing-20260906",
            packageVersions: { nvidia: "595.71.05" },
          },
        },
      },
    },
  };

  const map = buildNvidiaMapFromSbomStream(cache, "utah-nvidia-testing");

  assert.equal(map["testing-20260906"], "595.71.05");
});
