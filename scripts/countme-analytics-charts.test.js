const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const TSX_PATH = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "analytics",
  "CountmeAnalyticsCharts.tsx",
);

function loadComponent() {
  const source = fs.readFileSync(TSX_PATH, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };

  // Local modules are transpiled and handed the shim again, not node's require:
  // a relative .ts import inside a relative .ts import is still a .ts import,
  // and node cannot resolve it.
  const shim = (from) => (id) => {
    if (id.endsWith(".css")) return {};
    if (id === "react") return React;
    if (id === "@docusaurus/useBaseUrl") {
      return { __esModule: true, default: (p) => p };
    }
    if (id === "@docusaurus/Link") {
      return {
        __esModule: true,
        default: ({ to, children, ...rest }) =>
          React.createElement("a", { href: to, ...rest }, children),
      };
    }
    if (id === "@theme/Heading") {
      return {
        __esModule: true,
        default: ({ as: Tag = "h3", children, ...rest }) =>
          React.createElement(Tag, rest, children),
      };
    }
    if (id.includes("EChart")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("div", {
            "data-testid": "echart",
            "data-title": props.title,
            "data-summary": props.summary,
            "data-points": String(props.points),
            "data-option": JSON.stringify(props.option),
          }),
      };
    }
    if (id.includes("Unavailable")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("div", {
            "data-testid": "unavailable",
            "data-what": props.what,
            "data-reason": props.reason,
          }),
      };
    }
    if (id.includes("Sparkline")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("span", {
            "data-testid": "sparkline",
            "data-data": JSON.stringify(props.data),
            "data-color": props.color,
            "data-show-end": String(props.showEnd),
            "data-empty-label": props.emptyLabel,
            "data-label": props.label,
          }),
      };
    }
    if (id.includes("countme-history.json")) {
      return {
        generatedAt: "2026-08-08T23:59:55.087Z",
        source:
          "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv",
        method: "ublue-countme-v1",
        unit: "estimated weekly active systems",
        variants: ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"],
        weeks: [
          {
            week: "2026-07-20",
            fedora: 1073642,
            bazzite: 88548,
            aurora: 2669,
            bluefin: 4095,
            "bluefin-lts": 100,
          },
          {
            week: "2026-07-27",
            fedora: 1102473,
            bluefin: 3761,
            bazzite: 89550,
            aurora: 2826,
            "bluefin-lts": 159,
          },
        ],
        unavailable: false,
        stateReason: null,
      };
    }
    if (id.startsWith(".")) {
      const base = path.resolve(path.dirname(from), id);
      for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        if (ext && fs.existsSync(base + ext)) {
          const { outputText: innerOutput } = ts.transpileModule(
            fs.readFileSync(base + ext, "utf8"),
            {
              compilerOptions: {
                jsx: ts.JsxEmit.React,
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.CommonJS,
              },
            },
          );
          const innerMod = { exports: {} };
          new Function("require", "module", "exports", innerOutput)(
            shim(base + ext),
            innerMod,
            innerMod.exports,
          );
          return innerMod.exports;
        }
      }
    }
    return require(id);
  };

  new Function("require", "module", "exports", outputText)(
    shim(TSX_PATH),
    mod,
    mod.exports,
  );
  return mod.exports;
}

const mod = loadComponent();
const {
  parseCount,
  sumPresent,
  getFamilyImageMetrics,
  BLUEFIN_FAMILY_IMAGES,
  default: CountmeAnalyticsCharts,
} = mod;

const REGISTRY_FIXTURE = {
  generatedAt: "2026-09-10T04:08:30.490Z",
  source: "public-registry",
  packages: [
    {
      name: "bluefin",
      family: "os",
      streams: [
        {
          tag: "testing",
          publishedAt: "2026-09-08T18:31:26Z",
          ageDays: 1,
          state: "fresh",
          stateReason: null,
        },
        {
          tag: "stable",
          publishedAt: "2026-09-08T18:31:26Z",
          ageDays: 1,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
    {
      name: "bluefin-lts-hwe",
      family: "os",
      streams: [
        {
          tag: "testing",
          publishedAt: "2026-06-30T01:09:51Z",
          ageDays: 72,
          state: "stale",
          stateReason: "testing lanes are expected to publish within 7 days",
        },
      ],
    },
  ],
  unavailable: false,
  stateReason: null,
};

test("parseCount distinguishes 0 from null/undefined", () => {
  assert.equal(parseCount(0), 0);
  assert.equal(parseCount("0"), 0);
  assert.equal(parseCount(15), 15);
  assert.equal(parseCount("15"), 15);

  assert.equal(parseCount(null), null);
  assert.equal(parseCount(undefined), null);
  assert.equal(parseCount(""), null);
  assert.equal(parseCount(NaN), null);
});

test("sumPresent retains numeric 0 and preserves all-missing as null", () => {
  // All zeros: sum is 0, not null and not discarded
  assert.equal(sumPresent([0, 0, 0, 0]), 0);

  // Mixed zeros and missing: sum is 0
  assert.equal(sumPresent([0, null, undefined]), 0);

  // Values with missing: sums present numbers
  assert.equal(sumPresent([15, null, 0]), 15);
  assert.equal(sumPresent([3761, 159, null, null]), 3920);

  // All missing: returns null, representing a gap instead of coercing to 0
  assert.equal(sumPresent([null, undefined]), null);
  assert.equal(sumPresent([]), null);
});

test("issue #1086: weekly Dakota values [15, 0] yield isTracked: true and history: [15, 0]", () => {
  const dakotaSpec = BLUEFIN_FAMILY_IMAGES.find((img) => img.id === "dakota");
  assert.ok(dakotaSpec, "dakota spec must exist");

  const weeks = [
    { week: "2026-07-20", dakota: 15 },
    { week: "2026-07-27", dakota: 0 },
  ];
  const latestWeek = weeks[1];

  const metrics = getFamilyImageMetrics(dakotaSpec, weeks, latestWeek);
  assert.equal(metrics.count, 0, "latest count for dakota must be numeric 0");
  assert.equal(
    metrics.isTracked,
    true,
    "dakota must be tracked when latest count is 0",
  );
  assert.deepEqual(
    metrics.history,
    [15, 0],
    "history must retain [15, 0] rather than being cleared to []",
  );
});

test("missing values are preserved as gaps (null) in history series, not coerced to 0", () => {
  const dakotaSpec = BLUEFIN_FAMILY_IMAGES.find((img) => img.id === "dakota");
  const weeks = [
    { week: "2026-07-13", dakota: 15 },
    { week: "2026-07-20" }, // missing week
    { week: "2026-07-27", dakota: 0 },
  ];
  const latestWeek = weeks[2];

  const metrics = getFamilyImageMetrics(dakotaSpec, weeks, latestWeek);
  assert.equal(metrics.count, 0);
  assert.equal(metrics.isTracked, true);
  assert.deepEqual(
    metrics.history,
    [15, null, 0],
    "missing week must be null gap, not coerced to 0",
  );
});

test("untracked image with no data yields isTracked: false, count: null, and history: []", () => {
  const utahSpec = BLUEFIN_FAMILY_IMAGES.find((img) => img.id === "utah");
  const weeks = [{ week: "2026-07-20" }, { week: "2026-07-27" }];
  const latestWeek = weeks[1];

  const metrics = getFamilyImageMetrics(utahSpec, weeks, latestWeek);
  assert.equal(metrics.count, null);
  assert.equal(metrics.isTracked, false);
  assert.deepEqual(metrics.history, []);
});

test("rendering Dakota with [15, 0] renders '0' count and sparkline with [15, 0]", () => {
  const dataset = {
    generatedAt: "2026-07-27T00:00:00Z",
    source: "test",
    method: "ublue-countme-v1",
    unit: "estimated weekly active systems",
    variants: ["bluefin", "bluefin-lts", "dakota"],
    weeks: [
      { week: "2026-07-20", bluefin: 3000, "bluefin-lts": 100, dakota: 15 },
      { week: "2026-07-27", bluefin: 3100, "bluefin-lts": 110, dakota: 0 },
    ],
    unavailable: false,
    stateReason: null,
  };

  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, { dataset }),
  );

  // Dakota should show "0" as count value
  assert.ok(
    html.includes(">0</span>"),
    "rendered markup must include numeric count 0",
  );

  // Sparkline data for Dakota should contain [15, 0]
  assert.ok(
    html.includes('data-data="[15,0]"'),
    "sparkline must render with data [15, 0]",
  );

  // Dakota should have 12-week trend label, not countme status
  assert.ok(
    html.includes("12-week adoption trend: currently 0"),
    "sparkline label should state current value 0",
  );
});

test("unified fleet EChart preserves missing weeks as gaps and 0 as 0", () => {
  const dataset = {
    generatedAt: "2026-07-27T00:00:00Z",
    source: "test",
    method: "ublue-countme-v1",
    unit: "estimated weekly active systems",
    variants: ["bluefin", "bluefin-lts", "dakota", "utah"],
    weeks: [
      { week: "2026-07-13", bluefin: 100 },
      { week: "2026-07-20" }, // all fleet variants missing -> null gap
      { week: "2026-07-27", bluefin: 0, "bluefin-lts": 0, dakota: 0, utah: 0 }, // fleet total = 0
    ],
    unavailable: false,
    stateReason: null,
  };

  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, { dataset }),
  );

  const heroChartMatch = html.match(
    /data-title="Project Bluefin fleet"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(heroChartMatch, "hero echart must be present");

  const option = JSON.parse(heroChartMatch[1].replace(/&quot;/g, '"'));
  const fleet = option.series.find((s) => s.name === "Weekly active systems");
  assert.ok(fleet, "fleet series must be present");

  assert.deepEqual(
    fleet.data,
    [100, null, 0],
    "unified fleet series must preserve null gap for missing week and 0 for zero week",
  );
});

const PROMOTED = [
  "bluefin",
  "bluefin-nvidia",
  "bluefin-lts",
  "bluefin-lts-nvidia",
  "dakota",
  "dakota-nvidia",
  "dakota-gaming",
  "dakota-nvidia-gaming",
];

test("the matrix rows are the images the release workflows promote", () => {
  const { matrixRows, BLUEFIN_FAMILY_IMAGES: families } = mod;
  const images = matrixRows().map((r) => r.image);

  // Each repo's execute-release.yml promotion matrix, verbatim. The -hwe images
  // are still in the registry but in nobody's matrix, so they are named on the
  // family card as retired rather than charted as permanently stale lanes.
  assert.deepEqual(images, PROMOTED);

  const lts = families.find((f) => f.id === "bluefin-lts");
  assert.deepEqual(lts.retired, ["bluefin-lts-hwe", "bluefin-lts-hwe-nvidia"]);
  for (const name of lts.retired) assert.ok(!images.includes(name));

  // Bluefin Server delivers a DDI, not a container tag, so it has no lane here
  // even though it is a counted family.
  assert.ok(families.some((f) => f.id === "server"));
  assert.ok(!images.includes("server"));
});

test("the promotion axis is testing then stable, and nothing else", () => {
  // :lts, :gts and :latest linger on some images from retired schemes. A column
  // that is a dash down most of the grid is not a measurement.
  assert.deepEqual(mod.STREAM_COLUMNS, ["testing", "stable"]);
});

test("an image the registry does not carry stays in the grid as a gap", () => {
  const { matrixRows, buildStreamMatrix, STREAM_COLUMNS } = mod;
  const rows = matrixRows();
  const cells = buildStreamMatrix(rows, []);

  assert.equal(cells.length, rows.length * STREAM_COLUMNS.length);
  for (const cell of cells) {
    assert.equal(cell.level, "unknown");
    assert.equal(cell.ageDays, null, "an absent stream is a gap, never 0");
  }
});

test("a retired tag on an image is not mistaken for a promotion lane", () => {
  const { matrixRows, buildStreamMatrix } = mod;
  const cells = buildStreamMatrix(matrixRows(), [
    {
      name: "bluefin",
      family: "os",
      streams: [
        { tag: "lts", ageDays: 99, state: "stale", publishedAt: null },
        { tag: "testing", ageDays: 1, state: "fresh", publishedAt: null },
      ],
    },
  ]);

  assert.ok(
    !cells.some((c) => c.stream === "lts"),
    ":lts is not a column, so a stale :lts tag cannot colour the grid",
  );
  const testing = cells.find(
    (c) => c.image === "bluefin" && c.stream === "testing",
  );
  assert.equal(testing.ageDays, 1);
  assert.equal(testing.level, "ok");
});

test("freshness splits stale by drift and treats a missing tag as unknown", () => {
  const { freshnessLevel } = mod;
  assert.equal(freshnessLevel(undefined), "unknown");
  assert.equal(freshnessLevel({ tag: "stable", ageDays: null }), "unknown");
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 0, state: "fresh" }),
    "ok",
  );
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 12, state: "stale" }),
    "watch",
  );
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 72, state: "stale" }),
    "alert",
  );
});

test("the rolling band stays empty until its window is full", () => {
  const { rollingPercentile } = mod;
  const median = rollingPercentile([1, 2, 3, 4, 5, 6], 5, 0.5);

  assert.deepEqual(
    median.slice(0, 4),
    [null, null, null, null],
    "a four-point window must not be extrapolated into a band",
  );
  assert.equal(median[4], 3);
  assert.equal(median[5], 4);
});

test("a gap withholds the band instead of being read as zero", () => {
  const { rollingPercentile } = mod;
  const median = rollingPercentile([10, null, 10, 10, 10, 10, 10], 5, 0.5);

  assert.equal(
    median[5],
    null,
    "a window holding four measurements and one gap is not a full window",
  );
  assert.equal(
    median[6],
    10,
    "the band resumes once five real measurements are in the window, undragged by the gap",
  );
});

const MATRIX_DATASET = {
  generatedAt: "2026-09-10T00:00:00Z",
  source: "test",
  method: "ublue-countme-v1",
  unit: "estimated weekly active systems",
  variants: ["bluefin", "bluefin-lts"],
  weeks: [
    { week: "2026-09-01", bluefin: 3000, "bluefin-lts": 100 },
    { week: "2026-09-08", bluefin: 3100, "bluefin-lts": 110 },
  ],
  unavailable: false,
  stateReason: null,
};

test("the matrix plots every catalogued image against every stream", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      dataset: MATRIX_DATASET,
      registry: REGISTRY_FIXTURE,
    }),
  );

  const chart = html.match(
    /data-title="Image stream freshness"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(chart, "matrix echart must be present");

  const option = JSON.parse(chart[1].replace(/&quot;/g, '"'));
  assert.deepEqual(option.yAxis.data, PROMOTED);
  assert.deepEqual(option.xAxis.data, [":testing", ":stable"]);
  assert.equal(option.series[0].data.length, PROMOTED.length * 2);

  // Every cell carries its own number, never a bare colour swatch.
  const published = option.series[0].data.filter((c) => c.text !== "—");
  assert.deepEqual(published.map((c) => c.text).sort(), ["● 1d", "● 1d"]);
});

test("the matrix says why it is empty rather than rendering nothing", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      dataset: MATRIX_DATASET,
      registry: { packages: [], unavailable: true, stateReason: "no token" },
    }),
  );

  assert.match(html, /data-what="Image stream matrix"/);
  assert.match(html, /data-reason="no token"/);
});
