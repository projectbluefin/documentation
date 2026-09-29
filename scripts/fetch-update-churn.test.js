const test = require("node:test");
const assert = require("node:assert/strict");

const {
  analyzeManifestLayers,
  diffReleaseLayers,
  calculateReleaseChurn,
  extractDateFromTag,
  datedTagKey,
  compareTagsByDate,
  selectDatedTags,
} = require("./fetch-update-churn.js");

test("analyzeManifestLayers: handles empty or invalid layers safely", () => {
  const result = analyzeManifestLayers(null);
  assert.equal(result.totalBytes, 0);
  assert.equal(result.totalLayers, 0);
  assert.equal(result.zstdLayers, 0);
  assert.equal(result.gzipLayers, 0);
  assert.equal(result.compressionFormat, "uncompressed");
});

test("analyzeManifestLayers: correctly identifies zstd-chunked layers via mediaType and annotations", () => {
  const layers = [
    {
      digest: "sha256:aaa",
      size: 1000,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
    {
      digest: "sha256:bbb",
      size: 2000,
      mediaType: "application/vnd.oci.image.layer.v1.tar",
      annotations: {
        "io.github.containers.zstd-chunked.manifest-checksum": "sha256:xxx",
      },
    },
    {
      digest: "sha256:ccc",
      size: 500,
      mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
    },
  ];

  const result = analyzeManifestLayers(layers);
  assert.equal(result.totalBytes, 3500);
  assert.equal(result.totalLayers, 3);
  assert.equal(result.zstdLayers, 2);
  assert.equal(result.zstdBytes, 3000);
  assert.equal(result.gzipLayers, 1);
  assert.equal(result.gzipBytes, 500);
  assert.equal(result.compressionFormat, "mixed");
});

test("analyzeManifestLayers: detects pure zstd-chunked format", () => {
  const layers = [
    {
      digest: "sha256:aaa",
      size: 1000,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
    {
      digest: "sha256:bbb",
      size: 2000,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
  ];

  const result = analyzeManifestLayers(layers);
  assert.equal(result.compressionFormat, "zstd-chunked");
  assert.equal(result.zstdLayers, 2);
});

test("diffReleaseLayers: first release is marked as baseline with 0 reuse", () => {
  const currLayers = [
    {
      digest: "sha256:1",
      size: 1048576,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
    {
      digest: "sha256:2",
      size: 2097152,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
  ];

  const diff = diffReleaseLayers(null, currLayers);
  assert.equal(diff.isBaseline, true);
  assert.equal(diff.sharedLayers, 0);
  assert.equal(diff.sharedBytes, 0);
  assert.equal(diff.sharedMB, 0);
  assert.equal(diff.newLayers, 2);
  assert.equal(diff.downloadChurnBytes, 3145728);
  assert.equal(diff.downloadChurnMB, 3.0);
  assert.equal(diff.totalMB, 3.0);
  assert.equal(diff.reuseEfficiencyPct, 0);
});

test("diffReleaseLayers: identical releases achieve 100% reuse and 0 download churn", () => {
  const layers = [
    {
      digest: "sha256:1",
      size: 1048576,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
    {
      digest: "sha256:2",
      size: 2097152,
      mediaType: "application/vnd.oci.image.layer.v1.tar+zstd",
    },
  ];

  const diff = diffReleaseLayers(layers, layers);
  assert.equal(diff.isBaseline, false);
  assert.equal(diff.sharedLayers, 2);
  assert.equal(diff.newLayers, 0);
  assert.equal(diff.sharedBytes, 3145728);
  assert.equal(diff.downloadChurnBytes, 0);
  assert.equal(diff.downloadChurnMB, 0);
  assert.equal(diff.reuseEfficiencyPct, 100);
});

test("diffReleaseLayers: partial overlap correctly partitions shared vs churn bytes", () => {
  const prevLayers = [
    { digest: "sha256:base", size: 5242880 }, // 5 MB base layer
    { digest: "sha256:app-v1", size: 1048576 }, // 1 MB app layer
  ];
  const currLayers = [
    { digest: "sha256:base", size: 5242880 }, // 5 MB reused
    { digest: "sha256:app-v2", size: 2097152 }, // 2 MB new
  ];

  const diff = diffReleaseLayers(prevLayers, currLayers);
  assert.equal(diff.isBaseline, false);
  assert.equal(diff.sharedLayers, 1);
  assert.equal(diff.newLayers, 1);
  assert.equal(diff.totalLayers, 2);
  assert.equal(diff.sharedBytes, 5242880);
  assert.equal(diff.sharedMB, 5.0);
  assert.equal(diff.downloadChurnBytes, 2097152);
  assert.equal(diff.downloadChurnMB, 2.0);
  assert.equal(diff.totalMB, 7.0);
  // 5 / 7 = 71.4%
  assert.equal(diff.reuseEfficiencyPct, 71.4);
});

test("diffReleaseLayers: disjoint layers result in 0% reuse and full download churn", () => {
  const prevLayers = [{ digest: "sha256:old", size: 1048576 }];
  const currLayers = [{ digest: "sha256:new", size: 2097152 }];

  const diff = diffReleaseLayers(prevLayers, currLayers);
  assert.equal(diff.reuseEfficiencyPct, 0);
  assert.equal(diff.sharedMB, 0);
  assert.equal(diff.downloadChurnMB, 2.0);
});

test("calculateReleaseChurn: processes ordered releases and computes sequential diffs", () => {
  const releases = [
    {
      tag: "v1.20260501",
      layers: [
        { digest: "sha256:l1", size: 1048576 },
        { digest: "sha256:l2", size: 1048576 },
      ],
    },
    {
      tag: "v2.20260502",
      layers: [
        { digest: "sha256:l1", size: 1048576 },
        { digest: "sha256:l3", size: 1048576 },
      ],
    },
  ];

  const churn = calculateReleaseChurn(releases);
  assert.equal(churn.length, 2);
  assert.equal(churn[0].isBaseline, true);
  assert.equal(churn[0].previousTag, null);
  assert.equal(churn[0].downloadChurnMB, 2.0);
  assert.equal(churn[0].reuseEfficiencyPct, 0);

  assert.equal(churn[1].isBaseline, false);
  assert.equal(churn[1].previousTag, "v1.20260501");
  assert.equal(churn[1].sharedMB, 1.0);
  assert.equal(churn[1].downloadChurnMB, 1.0);
  assert.equal(churn[1].reuseEfficiencyPct, 50.0);
});

test("extractDateFromTag: parses YYYYMMDD date strings accurately", () => {
  assert.equal(extractDateFromTag("stable-daily-20260606"), "2026-06-06");
  assert.equal(extractDateFromTag("latest.20260114"), "2026-01-14");
  assert.equal(extractDateFromTag("stable-20260531"), "2026-05-31");
});

test("datedTagKey: returns the YYYYMMDD stamp a tag carries", () => {
  assert.equal(datedTagKey("testing-20260927-08286da"), "20260927");
  assert.equal(datedTagKey("stable-daily-20260606"), "20260606");
  assert.equal(datedTagKey("testing"), "");
  assert.equal(datedTagKey(undefined), "");
});

test("compareTagsByDate: orders oldest-first and breaks same-day ties by tag", () => {
  const sorted = [
    "testing-20260929-815ea44",
    "testing-20260927-f5f4053",
    "testing-20260929-362ea44",
    "testing-20260926-be64d10",
  ].sort(compareTagsByDate);
  assert.deepEqual(sorted, [
    "testing-20260926-be64d10",
    "testing-20260927-f5f4053",
    "testing-20260929-362ea44",
    "testing-20260929-815ea44",
  ]);
});

test("selectDatedTags: keeps only matching dated tags, oldest-first, trimmed to limit", () => {
  const tags = [
    "testing",
    "sha256-abc123.sig",
    "7d4cd58a9d366c1a5510b4632c7510a42665603",
    "testing-20260927-08286da",
    "testing-20260926-be64d10",
    "testing-20260929-815ea44",
    "testing-20260928-ce09ef7",
  ];
  const selected = selectDatedTags(tags, {
    pattern: /^testing-\d{8}-[0-9a-f]{7,40}$/,
    limit: 3,
  });
  assert.deepEqual(selected, [
    "testing-20260927-08286da",
    "testing-20260928-ce09ef7",
    "testing-20260929-815ea44",
  ]);
});

test("selectDatedTags: dedupes, tolerates a short history, and rejects a bad spec", () => {
  const pattern = /^testing-\d{8}-[0-9a-f]{7,40}$/;
  const single = selectDatedTags(
    ["testing-20260927-08286da", "testing-20260927-08286da"],
    {
      pattern,
      limit: 14,
    },
  );
  assert.deepEqual(single, ["testing-20260927-08286da"]);

  assert.deepEqual(
    selectDatedTags(["testing", "stable"], { pattern, limit: 14 }),
    [],
  );

  // A missing pattern or a non-positive limit yields no series rather than the
  // whole tag list.
  assert.deepEqual(selectDatedTags(["testing-20260927-08286da"], {}), []);
  assert.deepEqual(
    selectDatedTags(["testing-20260927-08286da"], { pattern, limit: 0 }),
    [],
  );
  assert.deepEqual(selectDatedTags(null, { pattern, limit: 14 }), []);
});

test("selectDatedTags: a dated series produces a delta, not a lone baseline", () => {
  // The regression this guards: one tag in the series means every chart on
  // /analytics has a baseline and nothing to diff against.
  const series = selectDatedTags(
    [
      "testing-20260927-08286da",
      "testing-20260928-ce09ef7",
      "testing-20260929-815ea44",
    ],
    { pattern: /^testing-\d{8}-[0-9a-f]{7,40}$/, limit: 14 },
  );
  const churn = calculateReleaseChurn(
    series.map((tag, i) => ({
      tag,
      layers: [
        { digest: "sha256:shared", size: 10 * 1024 * 1024 },
        { digest: `sha256:new-${i}`, size: 5 * 1024 * 1024 },
      ],
    })),
  );
  assert.equal(churn.length, 3);
  assert.equal(churn.filter((c) => c.isBaseline).length, 1);
  const delta = churn[churn.length - 1];
  assert.equal(delta.isBaseline, false);
  assert.equal(delta.previousTag, "testing-20260928-ce09ef7");
  assert.equal(delta.date, "2026-09-29");
  assert.equal(delta.downloadChurnMB, 5.0);
  assert.equal(delta.reuseEfficiencyPct, 66.7);
});
