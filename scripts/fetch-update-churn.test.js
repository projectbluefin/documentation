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
  selectWindowCandidates,
  discoverSeriesTags,
  fetchGhcrTagCreatedAt,
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

test("compareTagsByDate: orders by date, then build time, then tag text", () => {
  const tags = [
    "testing-20260929-815ea44",
    "testing-20260927-f5f4053",
    "testing-20260929-362ea44",
    "testing-20260926-be64d10",
  ];
  // No timestamps available: the last resort is tag text, so the order is
  // stable across runs even though it is an approximation.
  assert.deepEqual([...tags].sort(compareTagsByDate), [
    "testing-20260926-be64d10",
    "testing-20260927-f5f4053",
    "testing-20260929-362ea44",
    "testing-20260929-815ea44",
  ]);

  // With build times, the same-day pair orders by *when it was built*, not by
  // how its short sha happens to sort. 362ea44 is the newer build even though
  // "3" < "8" — and diffReleaseLayers is directional, so this is the order
  // that decides which numbers the chart reports.
  const createdAt = {
    "testing-20260929-362ea44": "2026-09-29T18:04:11Z",
    "testing-20260929-815ea44": "2026-09-29T09:41:52Z",
  };
  assert.deepEqual(
    [...tags].sort((a, b) => compareTagsByDate(a, b, createdAt)),
    [
      "testing-20260926-be64d10",
      "testing-20260927-f5f4053",
      "testing-20260929-815ea44",
      "testing-20260929-362ea44",
    ],
  );

  // A tie on both date and build time falls back to text rather than
  // depending on the input order.
  assert.equal(
    compareTagsByDate("testing-a", "testing-b", {
      "testing-a": "2026-09-29T00:00:00Z",
      "testing-b": "2026-09-29T00:00:00Z",
    }) < 0,
    true,
  );
});

test("compareTagsByDate: an undated floating tag sorts last, not first", () => {
  // `stable` is Bluefin's floating tag: it names whatever the newest manifest
  // is, so it is the end of the series. Sorting it first would make it the
  // baseline and turn the first delta into a backwards diff.
  const tags = [
    "stable",
    "stable-daily-20260604",
    "stable-daily-20260530",
    "stable-daily-20260531",
  ];
  assert.deepEqual([...tags].sort(compareTagsByDate), [
    "stable-daily-20260530",
    "stable-daily-20260531",
    "stable-daily-20260604",
    "stable",
  ]);

  // Two undated tags still order deterministically by text.
  assert.equal(compareTagsByDate("stable", "testing") < 0, true);
  assert.equal(compareTagsByDate("stable", "stable"), 0);
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

test("selectDatedTags: a floating tag never joins a dated series", () => {
  // The regression: the SBOM cache contributes the floating `testing` tag, and
  // it names the same manifest as the newest dated tag. Letting it in appended
  // a duplicate release dated *today* by extractDateFromTag — 0 MB churn, or a
  // backwards delta depending on where it landed.
  const pattern = /^testing-\d{8}-[0-9a-f]{7,40}$/;
  const selected = selectDatedTags(
    [
      "testing",
      "testing-20260928-ce09ef7",
      "testing-20260929-362ea44",
      "latest",
    ],
    { pattern, limit: 14 },
  );
  assert.deepEqual(selected, [
    "testing-20260928-ce09ef7",
    "testing-20260929-362ea44",
  ]);
});

test("selectDatedTags: limit applies to the merged list, seeds included", () => {
  // Seeds are a fallback for a failed listing, not a way to exceed the limit:
  // a seed older than the discovered window must not push the chart past it.
  const pattern = /^testing-\d{8}-[0-9a-f]{7,40}$/;
  const seeds = ["testing-20260926-34c0f13", "testing-20260926-be64d10"];
  const merged = [
    ...new Set([
      ...seeds,
      ...selectDatedTags(
        [
          "testing-20260927-08286da",
          "testing-20260928-ce09ef7",
          "testing-20260929-362ea44",
        ],
        { pattern, limit: 2 },
      ),
    ]),
  ]
    .sort(compareTagsByDate)
    .slice(-2);
  assert.deepEqual(merged, [
    "testing-20260928-ce09ef7",
    "testing-20260929-362ea44",
  ]);
});

test("fetchGhcrTagCreatedAt: warns and returns {} on the no-token path (#1434)", async () => {
  const savedToken = process.env.GITHUB_TOKEN;
  const savedGh = process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  try {
    let warned = false;
    const origWarn = console.warn;
    console.warn = () => {
      warned = true;
    };
    try {
      const result = await fetchGhcrTagCreatedAt("ublue-os", "bluefin");
      assert.deepEqual(result, {});
      assert.equal(warned, true, "expected a warning on the no-token path");
    } finally {
      console.warn = origWarn;
    }
  } finally {
    if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = savedToken;
    if (savedGh === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = savedGh;
  }
});

/**
 * Helper: install a stub `fetch` that pages through `pages`, an array of
 * { body, link? } entries. Each entry's `body` is returned verbatim and a
 * `link` header pointing at a synthetic URL is emitted when present.
 */
function stubFetchPages(pages) {
  const calls = [];
  const origFetch = global.fetch;
  global.fetch = async (url, _init) => {
    calls.push(String(url));
    const pageIndex = calls.length - 1;
    const page = pages[pageIndex] || pages[pages.length - 1];
    const headers = new Map();
    if (page.link) headers.set("link", page.link);
    return {
      ok: true,
      status: 200,
      url: String(url),
      headers: {
        get: (name) => headers.get(String(name).toLowerCase()) || null,
      },
      json: async () => page.body,
    };
  };
  return {
    calls,
    restore: () => {
      global.fetch = origFetch;
    },
  };
}

function withToken(fn) {
  const savedToken = process.env.GITHUB_TOKEN;
  const savedGh = process.env.GH_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  delete process.env.GH_TOKEN;
  return (async () => {
    try {
      await fn();
    } finally {
      if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = savedToken;
      if (savedGh === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = savedGh;
    }
  })();
}

test("fetchGhcrTagCreatedAt: paginates until every requested tag is covered (#1498)", async () => {
  await withToken(async () => {
    // 200 versions on page 1, none of which carry the older same-day tags the
    // caller sorted on. Page 2 surfaces them, and the function must keep
    // going to cover them rather than fall back to tag text.
    const older = [
      {
        created_at: "2026-10-04T05:12:33Z",
        metadata: { container: { tags: ["testing-20261004-ce484fa"] } },
      },
      {
        created_at: "2026-10-04T07:48:01Z",
        metadata: { container: { tags: ["testing-20261004-dce3a57"] } },
      },
      {
        created_at: "2026-10-04T15:23:59Z",
        metadata: { container: { tags: ["testing-20261004-eb9ddac"] } },
      },
    ];
    const recent = Array.from({ length: 100 }, (_, i) => ({
      created_at: `2026-10-05T${String(i % 24).padStart(2, "0")}:00:00Z`,
      metadata: { container: { tags: [`unrelated-${i}`] } },
    }));
    const stub = stubFetchPages([
      { body: recent, link: '<https://api.github.com/next>; rel="next"' },
      { body: older },
    ]);
    try {
      const result = await fetchGhcrTagCreatedAt("projectbluefin", "utah", 2, [
        "testing-20261004-ce484fa",
        "testing-20261004-dce3a57",
        "testing-20261004-eb9ddac",
      ]);
      assert.equal(result["testing-20261004-ce484fa"], "2026-10-04T05:12:33Z");
      assert.equal(result["testing-20261004-dce3a57"], "2026-10-04T07:48:01Z");
      assert.equal(result["testing-20261004-eb9ddac"], "2026-10-04T15:23:59Z");
      // Without the fix, page 1 is the only call and the older same-day
      // tags fall through to alphabetical ordering.
      assert.equal(stub.calls.length >= 2, true, "expected pagination");
    } finally {
      stub.restore();
    }
  });
});

test("fetchGhcrTagCreatedAt: stops paging once every requested tag is covered (#1498)", async () => {
  await withToken(async () => {
    // All requested tags are on page 1; the function must short-circuit and
    // not waste API budget on page 2.
    const page1 = [
      {
        created_at: "2026-10-04T05:12:33Z",
        metadata: { container: { tags: ["testing-20261004-ce484fa"] } },
      },
      {
        created_at: "2026-10-04T15:23:59Z",
        metadata: { container: { tags: ["testing-20261004-eb9ddac"] } },
      },
    ];
    const stub = stubFetchPages([{ body: page1, link: '<next>; rel="next"' }]);
    try {
      const result = await fetchGhcrTagCreatedAt("projectbluefin", "utah", 2, [
        "testing-20261004-ce484fa",
        "testing-20261004-eb9ddac",
      ]);
      assert.equal(result["testing-20261004-ce484fa"], "2026-10-04T05:12:33Z");
      assert.equal(result["testing-20261004-eb9ddac"], "2026-10-04T15:23:59Z");
      assert.equal(stub.calls.length, 1, "expected early termination");
    } finally {
      stub.restore();
    }
  });
});

test("fetchGhcrTagCreatedAt: warns on partial coverage when the cap is hit (#1498)", async () => {
  await withToken(async () => {
    // maxPages is 1, but requiredTags raises the ceiling to
    // GHCR_TAG_CREATED_AT_MAX_PAGES; the stub sends no `next` link, so paging
    // ends after one page with the requested tag still uncovered and the
    // function must warn and degrade gracefully. The
    // function still returns whatever `created_at` it collected; the warning
    // is the contract surface that tells the caller `compareTagsByDate` will
    // fall back to tag text for the missing tags.
    const page = Array.from({ length: 100 }, (_, i) => ({
      created_at: "2026-10-05T00:00:00Z",
      metadata: { container: { tags: [`unrelated-${i}`] } },
    }));
    const stub = stubFetchPages([{ body: page }]);
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => {
      warnings.push(String(msg));
    };
    try {
      const result = await fetchGhcrTagCreatedAt("projectbluefin", "utah", 1, [
        "testing-20261004-missing",
      ]);
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          result,
          "testing-20261004-missing",
        ),
        false,
        "requested tag must remain unresolved at the page ceiling",
      );
      assert.equal(
        warnings.some((w) => w.includes("testing-20261004-missing")),
        true,
        "expected a warning naming the uncovered requested tag",
      );
    } finally {
      console.warn = origWarn;
      stub.restore();
    }
  });
});

test("compareTagsByDate: same-day tags order by build time even when only some have it (#1498)", () => {
  // The fix in fetchGhcrTagCreatedAt guarantees every requested tag carries a
  // `created_at`, but the contract compareTagsByDate enforces is unchanged:
  // same-day ties break on the registry timestamp and fall back to tag text
  // only when at least one timestamp is missing. This guards the text-fallback
  // branch from disappearing.
  const createdAt = {
    "testing-20261004-eb9ddac": "2026-10-04T15:23:59Z",
    // ce484fa and dce3a57 are unrecorded: text ordering still applies.
  };
  assert.deepEqual(
    [
      "testing-20261004-ce484fa",
      "testing-20261004-dce3a57",
      "testing-20261004-eb9ddac",
    ].sort((a, b) => compareTagsByDate(a, b, createdAt)),
    [
      "testing-20261004-ce484fa",
      "testing-20261004-dce3a57",
      "testing-20261004-eb9ddac",
    ],
  );
});

test("selectWindowCandidates: takes newest whole date groups until the window is filled (#1498)", () => {
  const matches = [
    "testing-20261001-aaaaaaa",
    "testing-20261002-bbbbbbb",
    "testing-20261003-ccccccc",
    "testing-20261003-ddddddd",
    "testing-20261004-eeeeeee",
    "testing-20261004-fffffff",
    "testing-20261004-eeeeeee",
  ];
  // limit 3: 20261004 contributes 2, 20261003 must be taken whole (2 more),
  // so the same-day pair at the window edge is ordered by build time.
  assert.deepEqual(selectWindowCandidates(matches, 3).sort(), [
    "testing-20261003-ccccccc",
    "testing-20261003-ddddddd",
    "testing-20261004-eeeeeee",
    "testing-20261004-fffffff",
  ]);
  assert.deepEqual(selectWindowCandidates(matches, 0), []);
  assert.deepEqual(selectWindowCandidates(null, 3), []);
});

test("discoverSeriesTags: requests build times only for the charted window (#1498)", async () => {
  const savedToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
  const dated = Array.from(
    { length: 40 },
    (_, i) =>
      `testing-202609${String((i % 28) + 1).padStart(2, "0")}-${String(i).padStart(7, "0")}`,
  );
  // Newest date (20260928) has a same-day pair; build time reverses text order.
  const versions = [
    {
      created_at: "2026-09-28T20:00:00Z",
      metadata: { container: { tags: ["testing-20260928-0000027"] } },
    },
    {
      created_at: "2026-09-28T10:00:00Z",
      metadata: { container: { tags: ["testing-20260928-1111111"] } },
    },
    ...dated
      .filter((t) => t.startsWith("testing-2026092"))
      .map((t) => ({
        created_at: "2026-09-27T00:00:00Z",
        metadata: { container: { tags: [t] } },
      })),
  ];
  const calls = [];
  const warnings = [];
  const origFetch = global.fetch;
  const origWarn = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  global.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    let body;
    let link = null;
    if (u.startsWith("https://ghcr.io/token")) body = { token: "t" };
    else if (u.includes("/tags/list"))
      body = { tags: [...dated, "testing-20260928-1111111", "stable"] };
    else {
      body = versions;
      link = '<https://api.github.com/next-page>; rel="next"';
    }
    return {
      ok: true,
      status: 200,
      url: u,
      headers: {
        get: (n) => (String(n).toLowerCase() === "link" ? link : null),
      },
      json: async () => body,
    };
  };
  try {
    const result = await discoverSeriesTags("projectbluefin/utah", {
      pattern: /^testing-\d{8}-[0-9a-f]{7,40}$/,
      limit: 5,
    });
    assert.equal(result.listed, true);
    assert.equal(result.tags.length, 5);
    assert.deepEqual(result.tags.slice(-2), [
      "testing-20260928-1111111",
      "testing-20260928-0000027",
    ]);
    const apiCalls = calls.filter((u) =>
      u.startsWith("https://api.github.com"),
    );
    assert.equal(
      apiCalls.length,
      1,
      "window covered on page 1; no further paging",
    );
    assert.equal(
      warnings.some((w) => w.includes("build timestamps incomplete")),
      false,
      "tags outside the window must not trigger the coverage warning",
    );
  } finally {
    global.fetch = origFetch;
    console.warn = origWarn;
    if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = savedToken;
  }
});
