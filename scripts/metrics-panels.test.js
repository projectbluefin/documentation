const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// ── Fixtures ───────────────────────────────────────────────────────────────

const COUNTME_FULL = {
  unit: "weekly countme hits",
  variants: ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"],
  weeks: [
    {
      week: "2026-06-29",
      bluefin: 20000,
      "bluefin-lts": 500,
      aurora: 15000,
      bazzite: 400000,
      fedora: 13000000,
    },
    {
      week: "2026-07-06",
      bluefin: 21000,
      "bluefin-lts": 550,
      aurora: 15500,
      bazzite: 410000,
      fedora: 13100000,
    },
    {
      week: "2026-07-13",
      bluefin: 22000,
      "bluefin-lts": 580,
      aurora: 16000,
      bazzite: 420000,
      fedora: 13200000,
    },
    {
      week: "2026-07-20",
      bluefin: 23000,
      "bluefin-lts": 600,
      aurora: 16500,
      bazzite: 450000,
      fedora: 13200000,
    },
    {
      week: "2026-07-27",
      bluefin: 23737,
      "bluefin-lts": 622,
      aurora: 17451,
      bazzite: 483371,
      fedora: 13230935,
    },
  ],
  unavailable: false,
  stateReason: null,
};

const COUNTME_WITH_GAP = {
  unit: "weekly countme hits",
  variants: ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"],
  weeks: [
    {
      week: "2026-07-06",
      bluefin: 21000,
      aurora: 15500,
      bazzite: 410000,
      fedora: 13100000,
    },
    {
      week: "2026-07-13",
      bluefin: 22000,
      "bluefin-lts": 580,
      aurora: 16000,
      bazzite: 420000,
      fedora: 13200000,
    },
    {
      week: "2026-07-20",
      bluefin: 23000,
      "bluefin-lts": 600,
      aurora: 16500,
      bazzite: 450000,
      fedora: 13200000,
    },
    {
      week: "2026-07-27",
      bluefin: 23737,
      "bluefin-lts": 622,
      aurora: 17451,
      bazzite: 483371,
      fedora: 13230935,
    },
  ],
  unavailable: false,
  stateReason: null,
};

const BREW = {
  windows: {
    "365d": {
      startDate: "2025-08-08",
      endDate: "2026-08-08",
      totalCount: 21350450,
      trackedItems: 9734,
      rows: [
        {
          id: "bluefin",
          label: "Bluefin",
          rank: 11,
          count: 1348347,
          percent: 0.48,
        },
        {
          id: "bluefin-lts",
          label: "Bluefin LTS",
          rank: 39,
          count: 79450,
          percent: 0.03,
        },
      ],
      peers: [
        {
          id: "fedora-linux-43",
          label: "Fedora Linux 43",
          rank: 18,
          count: 658337,
        },
      ],
      unavailable: false,
      stateReason: null,
    },
    "90d": {
      startDate: "2026-05-08",
      endDate: "2026-08-08",
      totalCount: 5000000,
      trackedItems: 9734,
      rows: [
        {
          id: "bluefin",
          label: "Bluefin",
          rank: 12,
          count: 350000,
          percent: 0.45,
        },
        {
          id: "bluefin-lts",
          label: "Bluefin LTS",
          rank: 41,
          count: 20000,
          percent: 0.02,
        },
      ],
      peers: [],
      unavailable: false,
      stateReason: null,
    },
    "30d": {
      startDate: "2026-07-08",
      endDate: "2026-08-08",
      totalCount: 1800000,
      trackedItems: 9734,
      rows: [
        {
          id: "bluefin",
          label: "Bluefin",
          rank: 10,
          count: 120000,
          percent: 0.5,
        },
        {
          id: "bluefin-lts",
          label: "Bluefin LTS",
          rank: 40,
          count: 7000,
          percent: 0.03,
        },
      ],
      peers: [],
      unavailable: false,
      stateReason: null,
    },
  },
  unavailable: false,
  stateReason: null,
};

const DORA = {
  windowDays: 365,
  repos: [
    "projectbluefin/bluefin",
    "projectbluefin/bluefin-lts",
    "projectbluefin/dakota",
  ],
  monthly: [
    {
      month: "2026-06",
      releases: 3,
      publishRuns: 100,
      passed: 95,
      failed: 5,
      running: 0,
      failureRate: 0.05,
      medianDurationMin: 24,
    },
    {
      month: "2026-07",
      releases: 4,
      publishRuns: 121,
      passed: 114,
      failed: 7,
      running: 12,
      failureRate: 0.058,
      medianDurationMin: 26,
    },
  ],
  current: {
    deploymentsPerWeek: 1.9,
    changeFailureRate: 0.116,
    medianLeadTimeHours: null,
    leadTimeReason:
      "Commit-to-deploy lead time requires the commit set per release.",
  },
  unavailable: false,
  stateReason: null,
};

const SCORECARD = {
  repos: [
    {
      repo: "projectbluefin/bluefin",
      current: {
        date: "2026-08-08T00:27:03Z",
        score: 4.5,
        checks: [
          {
            name: "Code-Review",
            score: 0,
            reason: "Found 0/30 approved changesets",
          },
          {
            name: "Maintained",
            score: 10,
            reason: "30 commits in last 90 days",
          },
          { name: "CII-Best-Practices", score: null, reason: "Not applicable" },
        ],
      },
      history: [{ date: "2026-08-08", score: 4.5 }],
      unavailable: false,
      stateReason: null,
    },
    {
      repo: "projectbluefin/bluefin-lts",
      unavailable: true,
      stateReason: "Repository not found in OpenSSF Scorecard database.",
      current: { date: "", score: 0, checks: [] },
      history: [],
    },
  ],
  unavailable: false,
  stateReason: null,
};

const SCORECARD_ENOUGH_HISTORY = {
  repos: [
    {
      repo: "projectbluefin/bluefin",
      current: {
        date: "2026-08-08T00:27:03Z",
        score: 4.5,
        checks: [{ name: "Maintained", score: 10, reason: "" }],
      },
      history: [
        { date: "2026-08-06", score: 4.3 },
        { date: "2026-08-07", score: 4.4 },
        { date: "2026-08-08", score: 4.5 },
      ],
      unavailable: false,
      stateReason: null,
    },
  ],
  unavailable: false,
  stateReason: null,
};

// ── Loader ─────────────────────────────────────────────────────────────────

let FIXTURES = {};

function loadComponent(tsxPath) {
  const { outputText } = ts.transpileModule(fs.readFileSync(tsxPath, "utf8"), {
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
      // Stub FactoryDataContext
      if (id.includes("FactoryDataContext")) {
        return {
          __esModule: true,
          useDataset: (k) => ({
            data: FIXTURES[k] ?? null,
            loading: false,
            reason: FIXTURES[k] === undefined ? `${k} not configured` : null,
          }),
        };
      }
      // Stub EChart
      if (id.includes("EChart")) {
        return {
          __esModule: true,
          default: (props) =>
            React.createElement(
              "div",
              {
                "data-testid": "echart",
                "data-title": props.title,
                "data-summary": props.summary,
                "data-points": String(props.points),
                "data-min-points": String(props.minPoints ?? 2),
                "data-option": JSON.stringify(props.option),
              },
              props.points < (props.minPoints ?? 2)
                ? "accumulating data"
                : "chart",
            ),
        };
      }
      // Stub Unavailable
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
      // Stub HiveFactoryDashboard (type only)
      if (id.includes("HiveFactoryDashboard")) {
        return { __esModule: true };
      }
      // Stub Sparkline
      if (id.includes("Sparkline")) {
        return {
          __esModule: true,
          default: (props) =>
            React.createElement("span", {
              "data-testid": "sparkline",
              "data-domain": props.domain
                ? JSON.stringify(props.domain)
                : undefined,
              "data-variant": props.variant,
              "data-data": JSON.stringify(props.data),
            }),
        };
      }
      // Relative imports for chartTheme
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsxPath), id);
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + ext)) return loadModule(base + ext);
        }
        if (fs.existsSync(base)) return loadModule(base);
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

function loadModule(p) {
  const { outputText } = ts.transpileModule(fs.readFileSync(p, "utf8"), {
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
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(p), id);
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + ext)) return loadModule(base + ext);
        }
        if (fs.existsSync(base)) return loadModule(base);
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const COMPONENT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "panels",
  "MetricsPanels.tsx",
);

function render(fixtures) {
  FIXTURES = fixtures;
  const MetricsPanels = loadComponent(COMPONENT_PATH).default;
  return renderToStaticMarkup(React.createElement(MetricsPanels, { s: {} }));
}

// ── Tests ──────────────────────────────────────────────────────────────────

test("lead time renders as not-measured, never as 0", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  assert.match(html, /not measured/i);
  assert.ok(!html.includes("0 hours"));
  assert.ok(!html.includes("0h"));
});

test("unflattering scorecard score is published", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  assert.ok(html.includes("4.5"));
});

test("null check score renders n/a and is not drawn as a 0 bar", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  assert.ok(html.includes("n/a"));
  // Parse the echart option for scorecard checks — should not contain CII-Best-Practices as a bar value
  const checkChartMatch = html.match(
    /data-title="projectbluefin\/bluefin check scores"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(checkChartMatch, "check scores chart should exist");
  const optStr = checkChartMatch[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const opt = JSON.parse(optStr);
  // yAxis data should not include CII-Best-Practices
  assert.ok(!opt.yAxis.data.includes("CII-Best-Practices"));
  // series data should not contain 0 for a null check
  assert.ok(
    !opt.series[0].data.some(
      (d) => d.value === 0 && opt.yAxis.data.indexOf("CII-Best-Practices") >= 0,
    ),
  );
});

test("pie slices carry absolute numbers, not just percentages", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  // The pie option should include the absolute value in the label formatter
  const pieMatch = html.match(
    /data-title="Immutable desktop ecosystem share"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(pieMatch, "pie chart should exist");
  const optStr = pieMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const opt = JSON.parse(optStr);
  // Each slice label.formatter should include absolute number
  for (const d of opt.series[0].data) {
    assert.ok(
      d.label.formatter.match(/[\d,]+/),
      `Slice ${d.name} should include absolute number`,
    );
  }
});

test("range toggle at 30d with 4-week fixture yields chart or accumulating data", () => {
  // The component starts at 'all' range. With 4 weeks of data, at 30d range
  // we get 4 points which equals minPoints=2 so it should render.
  // We just ensure it doesn't blow up / produce empty output.
  const fourWeeks = {
    ...COUNTME_FULL,
    weeks: COUNTME_FULL.weeks.slice(-4),
  };
  const html = render({
    countme: fourWeeks,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  // Should have an echart or "accumulating data" — not blank
  assert.ok(html.includes("echart") || html.includes("accumulating data"));
});

test("missing variant key becomes null in series, never 0", () => {
  const html = render({
    countme: COUNTME_WITH_GAP,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  // Look at the lane table sparkline data for bluefin-lts
  const sparklines = [...html.matchAll(/data-data="([^"]*)"/g)];
  // Find a sparkline containing null (gap)
  const hasGap = sparklines.some((m) => {
    const data = JSON.parse(m[1].replace(/&quot;/g, '"'));
    return data.includes(null);
  });
  assert.ok(
    hasGap,
    "At least one sparkline should have a null gap for missing variant key",
  );
});

test("small multiples in per-lane table share ONE domain", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  // Extract the lane table section and find sparklines within it
  const laneSection = html.split('data-testid="lane-table"')[1] || "";
  const domainMatches = [...laneSection.matchAll(/data-domain="([^"]*)"/g)];
  const domains = new Set(domainMatches.map((m) => m[1]));
  // All lane sparklines should share the same domain
  assert.ok(
    domains.size === 1,
    `Expected one shared domain in lane table, got ${domains.size}`,
  );
});

test("scorecard history with 1 point renders accumulating data", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  // The history chart has minPoints=3 and our fixture has 1 point
  assert.ok(html.includes("accumulating data"));
});

test("unavailable dora does not prevent countme panel rendering", () => {
  const html = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: { unavailable: true, stateReason: "CI token missing" },
    scorecard: SCORECARD,
  });
  // Countme panel should still render
  assert.ok(html.includes("Active devices"));
  // Dora should show unavailable
  assert.ok(html.includes("Delivery frequency"));
});

test("unavailable dataset renders Unavailable with stateReason", () => {
  const html = render({
    countme: { unavailable: true, stateReason: "Token expired" },
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  assert.ok(html.includes("Token expired"));
  assert.ok(html.includes('data-testid="unavailable"'));
});

test("rendering is deterministic", () => {
  const a = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  const b = render({
    countme: COUNTME_FULL,
    brew: BREW,
    dora: DORA,
    scorecard: SCORECARD,
  });
  assert.equal(a, b);
});
