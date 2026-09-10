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
  buildLtsNvidiaByTagFromSbom,
  resolveCompanionNvidia,
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
  assert.equal(
    row.releaseUrl,
    "https://github.com/projectbluefin/bluefin/releases/tag/stable-20260331",
  );
});

test("rowFromSbomRelease translates LTS lts-YYYYMMDD cache key to upstream stable-YYYYMMDD releaseUrl", () => {
  const row = rowFromSbomRelease(
    "bluefin-lts",
    "lts-20260602",
    {
      tag: "lts-20260602",
      packageVersions: {
        kernel: "6.12.0-233.el10",
      },
    },
    "595.71.05",
  );

  assert.equal(row.tag, "lts-20260602");
  assert.equal(row.title, "lts-20260602");
  assert.equal(
    row.releaseUrl,
    "https://github.com/projectbluefin/bluefin-lts/releases/tag/stable-20260602",
  );
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

test("buildLtsNvidiaByTagFromSbom falls back to legacy LTS packageVersions", () => {
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

  const map = buildLtsNvidiaByTagFromSbom(cache);
  assert.equal(map["lts-20260502"], "595.71.05");
  assert.equal(map["lts-20260425"], "570.144.03");
  assert.equal(
    map["lts-20260418"],
    undefined,
    "no nvidia entry when packageVersions.nvidia is absent",
  );
});

test("buildLtsNvidiaByTagFromSbom prefers the dedicated LTS NVIDIA stream", () => {
  const cache = {
    streams: {
      "bluefin-lts-nvidia": {
        releases: {
          "lts-20260502": {
            tag: "lts-20260502",
            packageVersions: { nvidia: "595.71.05" },
          },
        },
      },
      "bluefin-gdx-lts": {
        releases: {
          "lts-20260502": {
            tag: "lts-20260502",
            packageVersions: { nvidia: "570.144.03" },
          },
        },
      },
    },
  };

  const map = buildLtsNvidiaByTagFromSbom(cache);

  assert.equal(map["lts-20260502"], "595.71.05");
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

test("buildStreamFromSbom filters out release entries where all versions are null", () => {
  const cache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260606": {
            tag: "stable-20260606",
            packageVersions: null,
          },
          "stable-20260605": {
            tag: "stable-20260605",
            packageVersions: {
              kernel: null,
              mesa: null,
              gnome: null,
              nvidia: null,
            },
          },
          "stable-20260531": {
            tag: "stable-20260531",
            packageVersions: {
              kernel: "7.0.8-200.fc44",
              mesa: "26.0.8",
              gnome: "50.1",
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
    {},
    9999,
  );

  assert.equal(stream.rowCount, 1);
  assert.equal(stream.latest?.tag, "stable-20260531");
  assert.equal(stream.latest?.versions.kernel, "7.0.8-200.fc44");
  assert.equal(stream.history.length, 1);
});

test("resolveCompanionNvidia matches exact tag, date, or closest prior companion date", () => {
  const nvidiaByTag = {
    "stable-20260501": "595.71.05",
    "stable-20260420": "595.60.01",
    "stable-20260410": "595.50.00",
  };

  // 1. Exact tag match
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "stable-20260501" },
      "stable-20260501",
    ),
    "595.71.05",
  );

  // 2. Exact date match with different stream prefix
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "lts-20260501" },
      "lts-20260501",
    ),
    "595.71.05",
  );

  // 3. Fallback to closest prior companion date (release is 2026-05-31, newest companion is 2026-05-01)
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "stable-20260531" },
      "stable-20260531",
    ),
    "595.71.05",
  );

  // 4. Release between two companion dates (2026-04-25 -> gets 2026-04-20)
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "stable-20260425" },
      "stable-20260425",
    ),
    "595.60.01",
  );
});

test("resolveCompanionNvidia falls back to latest companion release within reasonable proximity", () => {
  const nvidiaByTag = {
    "stable-20260505": "595.71.05",
  };

  // Release on 2026-05-01, companion built 4 days later on 2026-05-05 (within 30 days)
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "stable-20260501" },
      "stable-20260501",
    ),
    "595.71.05",
  );

  // Release on 2026-01-01, companion built 124 days later (beyond 30 days)
  assert.equal(
    resolveCompanionNvidia(
      nvidiaByTag,
      { tag: "stable-20260101" },
      "stable-20260101",
    ),
    null,
  );
});

test("buildLtsNvidiaByTagFromSbom falls back to bluefin-nvidia-open-stable when LTS streams have no entries", () => {
  const cache = {
    streams: {
      "bluefin-lts-nvidia": { releases: {} },
      "bluefin-gdx-lts": {
        releases: {
          "lts-20260606": {
            tag: "lts-20260606",
            packageVersions: null,
          },
        },
      },
      "bluefin-nvidia-open-stable": {
        releases: {
          "stable-20260501": {
            tag: "stable-20260501",
            packageVersions: { nvidia: "595.71.05" },
          },
        },
      },
    },
  };

  const map = buildLtsNvidiaByTagFromSbom(cache);
  assert.equal(map["stable-20260501"], "595.71.05");
});

test("buildStreamFromSbom retains at least 5 newest valid rows when withinCutoff.length < 5", () => {
  const releases = {};
  for (let i = 1; i <= 8; i++) {
    const month = String(i).padStart(2, "0");
    const key = `stable-2025${month}15`;
    releases[key] = {
      tag: key,
      packageVersions: { kernel: `6.18.${i}-200` },
    };
  }
  const cache = {
    streams: {
      "bluefin-stable": { releases },
    },
  };

  // With a small historyDays (e.g. 1 day), withinCutoff has 0 rows (< 5).
  // It must retain at least the 5 newest valid rows.
  const stream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream.",
    "command",
    cache,
    {},
    1,
  );

  assert.equal(stream.rowCount, 5);
  assert.equal(stream.history.length, 5);
  assert.equal(stream.latest?.tag, "stable-20250815");
  assert.equal(stream.history[4]?.tag, "stable-20250415");
});

test("buildStreamFromSbom retains all rows within cutoff when withinCutoff.length >= 5", () => {
  const releases = {};
  for (let i = 1; i <= 7; i++) {
    const month = String(i).padStart(2, "0");
    const key = `stable-2026${month}15`;
    releases[key] = {
      tag: key,
      packageVersions: { kernel: `6.18.${i}-200` },
    };
  }
  const cache = {
    streams: {
      "bluefin-stable": { releases },
    },
  };

  const stream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream.",
    "command",
    cache,
    {},
    9999, // All 7 releases are within cutoff
  );

  assert.equal(stream.rowCount, 7);
  assert.equal(stream.history.length, 7);
  assert.equal(stream.latest?.tag, "stable-20260715");
});

test("buildStreamFromSbom handles utah-testing with 0 releases gracefully", () => {
  const cache = {
    streams: {
      "utah-testing": {
        releases: {},
      },
    },
  };

  const stream = buildStreamFromSbom(
    "utah-testing",
    "Utah",
    "Project Hummingbird-based image from projectbluefin/utah.",
    "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing",
    cache,
    {},
  );

  assert.equal(stream.id, "utah-testing");
  assert.equal(stream.rowCount, 0);
  assert.equal(stream.latest, null);
  assert.deepEqual(stream.history, []);
});

test("buildStreamFromSbom handles utah-testing where all releases have null versions", () => {
  const cache = {
    streams: {
      "utah-testing": {
        releases: {
          "testing-20260906": {
            tag: "testing-20260906",
            packageVersions: null,
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
    {},
  );

  assert.equal(stream.id, "utah-testing");
  assert.equal(stream.rowCount, 0);
  assert.equal(stream.latest, null);
  assert.deepEqual(stream.history, []);
});
