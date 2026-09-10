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
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
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
        const base = path.resolve(path.dirname(TSX_PATH), id);
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + ext)) {
            const innerSource = fs.readFileSync(base + ext, "utf8");
            const { outputText: innerOutput } = ts.transpileModule(
              innerSource,
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
              require,
              innerMod,
              innerMod.exports,
            );
            return innerMod.exports;
          }
        }
      }
      return require(id);
    },
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

  // Find echart with title "Bluefin Systems"
  const heroChartMatch = html.match(
    /data-title="Bluefin Systems"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(heroChartMatch, "hero echart must be present");

  const option = JSON.parse(heroChartMatch[1].replace(/&quot;/g, '"'));
  const totalSeriesData = option.series[0].data;

  assert.deepEqual(
    totalSeriesData,
    [100, null, 0],
    "unified fleet series must preserve null gap for missing week and 0 for zero week",
  );
});
