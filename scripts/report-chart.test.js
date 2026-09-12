const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

const REPO = path.join(__dirname, "..");
const CHART = path.join(
  REPO,
  "src",
  "components",
  "reports",
  "ReportChart.tsx",
);
const CLIENT = path.join(
  REPO,
  "src",
  "components",
  "reports",
  "ReportChartClient.tsx",
);
const CSS = path.join(
  REPO,
  "src",
  "components",
  "reports",
  "report-charts.module.css",
);

function cssStub() {
  return {
    __esModule: true,
    default: new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "__esModule" ? true : typeof key === "string" ? key : "",
      },
    ),
  };
}

function loadChart() {
  const source = fs.readFileSync(CHART, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  const browserOnly = ({ fallback }) => fallback ?? null;
  const clientStub = () =>
    React.createElement("div", { "data-testid": "client-chart" });
  const requireShim = (id) => {
    if (id.endsWith(".css")) return cssStub();
    if (id === "@docusaurus/BrowserOnly") {
      return { __esModule: true, default: browserOnly };
    }
    if (id === "./ReportChartClient") {
      return { __esModule: true, default: clientStub };
    }
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(
    requireShim,
    mod,
    mod.exports,
  );
  return mod.exports;
}

function loadClient() {
  const source = fs.readFileSync(CLIENT, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  const requireShim = (id) => (id.endsWith(".css") ? cssStub() : require(id));
  new Function("require", "module", "exports", outputText)(
    requireShim,
    mod,
    mod.exports,
  );
  return mod.exports;
}

/**
 * Load a report component with its CSS module and any stubbed siblings.
 *
 * The shared loader resolves relative and `@site/…` imports as real source.
 * `ReportCountmeTrend` imports the count-source policy from
 * `@site/scripts/lib/countme-sources.mjs`; a test that stubbed it would assert
 * against its own copy of the wording instead of the shipped one.
 */
function loadComponent(tsxPath, stubs = {}) {
  return loadTsxModule(tsxPath, (id) => {
    if (id.endsWith(".css")) return cssStub();
    if (Object.hasOwn(stubs, id)) return stubs[id];
    return undefined;
  });
}

const exported = loadChart();
const ReportChart = exported.default;
const clientExported = loadClient();
const ReportChartClient = clientExported.default;
const { buildReportChartOption, selectEChartsModules } = clientExported;

const COMPONENTS = path.join(REPO, "src", "components", "reports");
const chartStub = {
  __esModule: true,
  default: ({ definition }) =>
    React.createElement(
      "div",
      { "data-report-chart": definition.id },
      definition.title,
    ),
};
const laneStub = {
  __esModule: true,
  default: ({ lanes }) =>
    React.createElement(
      "div",
      { "data-report-lanes": lanes?.length ?? 0 },
      lanes?.map((lane) => lane.label).join(", ") || "lane state",
    ),
};
const laneReasonStub = {
  __esModule: true,
  default: ({ lanes, unavailableReason, stateReason }) =>
    React.createElement(
      "div",
      {
        "data-report-lanes": lanes?.length ?? 0,
        "data-report-lane-reason": unavailableReason ?? stateReason ?? "",
      },
      "lane state",
    ),
};
const leaderboardStub = {
  __esModule: true,
  default: ({ heroes }) =>
    React.createElement(
      "div",
      { "data-report-leaderboard": heroes?.length ?? 0 },
      "leaderboard",
    ),
};
const sparklineStub = {
  __esModule: true,
  default: () => React.createElement("svg", { "data-report-sparkline": true }),
};

function renderComponent(name, props, stubs = {}) {
  const Component = loadComponent(
    path.join(COMPONENTS, `${name}.tsx`),
    stubs,
  ).default;
  return renderToStaticMarkup(React.createElement(Component, props));
}

const fixture = {
  id: "merges",
  kind: "line",
  title: "Merged pull requests",
  currentValue: "12",
  unit: "pull requests",
  sourceLabel: "GitHub",
  sourceUrl: "https://github.com/projectbluefin",
  sourceWindow: "October 2026 UTC",
  labels: ["2026-10-01", "2026-10-02"],
  series: [{ id: "merged", label: "Merged", values: [null, 12] }],
  minimumPoints: 3,
};

const render = (definition) =>
  renderToStaticMarkup(React.createElement(ReportChart, { definition }));

test("the server frame exposes the metric, provenance, table, and accumulation state", () => {
  const markup = render(fixture);

  assert.match(markup, /12/);
  assert.match(markup, /pull requests/);
  assert.match(markup, />GitHub</);
  assert.match(markup, /October 2026 UTC/);
  assert.match(markup, /<details/);
  assert.match(markup, /<table/);
  assert.match(markup, /2026-10-01/);
  assert.match(markup, /no data/);
  assert.match(markup, /2026-10-02/);
  assert.match(markup, /accumulating data/);
  assert.match(markup, /href="https:\/\/github.com\/projectbluefin"/);
});

test("the table preserves a real zero separately from a null gap", () => {
  const markup = render({
    ...fixture,
    minimumPoints: 1,
    labels: ["2026-10-01", "2026-10-02"],
    series: [{ id: "merged", label: "Merged", values: [0, null] }],
  });

  assert.match(markup, /<td>0<\/td>/);
  assert.match(markup, /<td>no data<\/td>/);
  assert.doesNotMatch(markup, /accumulating data/);
});

test("server rendering does not touch browser globals or run the client renderer", () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  Object.defineProperty(global, "window", {
    configurable: true,
    get() {
      throw new Error("window accessed during server render");
    },
  });
  Object.defineProperty(global, "document", {
    configurable: true,
    get() {
      throw new Error("document accessed during server render");
    },
  });

  try {
    const markup = render(fixture);
    assert.doesNotMatch(markup, /data-testid="client-chart"/);
  } finally {
    Object.defineProperty(global, "window", {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(global, "document", {
      configurable: true,
      value: originalDocument,
    });
  }
});

test("the client option disables animation and preserves null gaps and zeroes", () => {
  const option = buildReportChartOption(
    {
      ...fixture,
      minimumPoints: 1,
      labels: ["2026-10-01", "2026-10-02", "2026-10-03"],
      series: [{ id: "merged", label: "Merged", values: [0, null, 12] }],
    },
    {
      accent: "accent",
      border: "border",
      grid: "grid",
      muted: "muted",
      series: ["series-1"],
      text: "text",
    },
  );

  assert.equal(option.animation, false);
  assert.deepEqual(option.series[0].data, [0, null, 12]);
  assert.equal(option.series[0].connectNulls, false);
});

test("the client module registration selects only the kind-specific modules", () => {
  const modules = {
    charts: {
      BarChart: "bar",
      HeatmapChart: "heatmap",
      LineChart: "line",
    },
    components: {
      CalendarComponent: "calendar",
      GridComponent: "grid",
      LegendComponent: "legend",
      TooltipComponent: "tooltip",
      VisualMapComponent: "visual-map",
    },
    renderers: { CanvasRenderer: "canvas" },
  };

  assert.deepEqual(selectEChartsModules("line", modules), [
    "line",
    "grid",
    "legend",
    "tooltip",
    "canvas",
  ]);
  assert.deepEqual(selectEChartsModules("grouped-bar", modules), [
    "bar",
    "grid",
    "legend",
    "tooltip",
    "canvas",
  ]);
  assert.deepEqual(selectEChartsModules("stacked-bar", modules), [
    "bar",
    "grid",
    "legend",
    "tooltip",
    "canvas",
  ]);
  assert.deepEqual(selectEChartsModules("lane-status", modules), [
    "bar",
    "grid",
    "legend",
    "tooltip",
    "canvas",
  ]);
  assert.deepEqual(selectEChartsModules("calendar", modules), [
    "heatmap",
    "calendar",
    "tooltip",
    "visual-map",
    "canvas",
  ]);
});

test("the client renderer does not create an empty image below minimum history", () => {
  const markup = renderToStaticMarkup(
    React.createElement(ReportChartClient, { definition: fixture }),
  );

  assert.equal(markup, "");
});

test("chart styles follow the site theme and reduced-motion preference", () => {
  const source = fs.readFileSync(CSS, "utf8");

  assert.match(source, /var\(--ifm-/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /#[0-9a-f]{6}\b/i);
});

function sectionChart(id, title = id) {
  return {
    id,
    kind: "line",
    title,
    currentValue: "3",
    unit: "items",
    sourceLabel: "Fixture source",
    sourceUrl: "https://example.com/source",
    sourceWindow: "October 2026 UTC",
    labels: ["2026-10-01"],
    series: [{ id: `${id}-series`, label: "Items", values: [3] }],
    minimumPoints: 1,
  };
}

test("ReportActivity renders its three charts and explicit portfolio tiers", () => {
  const markup = renderComponent(
    "ReportActivity",
    {
      snapshot: {
        calendar: sectionChart("calendar", "Daily merges"),
        repositories: sectionChart("repositories", "Repository activity"),
        categories: sectionChart("categories", "Category distribution"),
        stableRepositories: ["projectbluefin/bluefin"],
        experimentalRepositories: ["projectbluefin/utah"],
      },
    },
    { "./ReportChart": chartStub },
  );

  assert.equal((markup.match(/data-report-chart=/g) || []).length, 3);
  assert.match(markup, /Stable portfolio/);
  assert.match(markup, /projectbluefin\/bluefin/);
  assert.match(markup, /Experimental portfolio/);
  assert.match(markup, /projectbluefin\/utah/);
});

test("ReportDelivery renders lane outcomes, trends, releases, and changelogs", () => {
  const markup = renderComponent(
    "ReportDelivery",
    {
      snapshot: {
        lanes: [{ id: "bluefin", label: "Bluefin", pending: 1 }],
        cadence: sectionChart("cadence", "Cadence and duration"),
        releases: sectionChart("releases", "Release events"),
      },
    },
    {
      "./ReportChart": chartStub,
      "./ReportLaneHealth": laneStub,
    },
  );

  assert.match(markup, /data-report-lanes="1"/);
  assert.match(markup, /data-report-chart="cadence"/);
  assert.match(markup, /data-report-chart="releases"/);
  assert.match(markup, /href="\/changelogs"/);
});

test("ReportDelivery forwards its unavailable reason to lane health", () => {
  const markup = renderComponent(
    "ReportDelivery",
    {
      lanes: null,
      unavailableReason: "GitHub API returned HTTP 503",
    },
    {
      "./ReportChart": chartStub,
      "./ReportLaneHealth": laneReasonStub,
    },
  );

  assert.match(
    markup,
    /data-report-lane-reason="GitHub API returned HTTP 503"/,
  );
});

test("ReportParticipation renders automation and the current leaderboard", () => {
  const markup = renderComponent(
    "ReportParticipation",
    {
      snapshot: {
        automation: sectionChart("automation", "Human and automation activity"),
        leaderboard: {
          heroes: [
            {
              rank: 1,
              login: "alice",
              contributions: 3,
            },
          ],
          newLights: [],
        },
      },
    },
    {
      "./ReportChart": chartStub,
      "./ReportLeaderboard": leaderboardStub,
    },
  );

  assert.match(markup, /data-report-chart="automation"/);
  assert.match(markup, /data-report-leaderboard="1"/);
});

test("ReportEcosystem renders Countme, Homebrew, and Flathub trends", () => {
  const markup = renderComponent(
    "ReportEcosystem",
    {
      snapshot: {
        countme: sectionChart("countme", "Countme trend"),
        homebrew: sectionChart("homebrew", "Homebrew trend"),
        flathub: sectionChart("flathub", "Flathub trend"),
      },
    },
    { "./ReportChart": chartStub },
  );

  assert.match(markup, /Countme/);
  assert.match(markup, /Homebrew/);
  assert.match(markup, /Flathub/);
  assert.equal((markup.match(/data-report-chart=/g) || []).length, 3);
});

test("ReportAutomationStats labels both series with one hue and glyphs", () => {
  const markup = renderComponent("ReportAutomationStats", {
    totalPRs: 10,
    botPRs: 4,
    humanPRs: 6,
    automationPercentage: "40.0",
  });

  assert.match(markup, /◆/);
  assert.match(markup, /◇/);
  assert.doesNotMatch(markup, /#28a745/i);
});

test("ReportAutomationStats exposes an unavailable state instead of disappearing", () => {
  const markup = renderComponent("ReportAutomationStats", {
    totalPRs: null,
    botPRs: 0,
    humanPRs: 0,
    automationPercentage: null,
  });

  assert.match(markup, /Automation data unavailable/);
  assert.match(markup, /role="status"/);
});

test("ReportAutomationStats keeps an available zero period at zero width", () => {
  const markup = renderComponent("ReportAutomationStats", {
    totalPRs: 0,
    botPRs: 0,
    humanPRs: 0,
    automationPercentage: "0.0",
  });

  assert.match(markup, /class="botBar" style="width:0%"/);
  assert.match(markup, /class="humanBar" style="width:0%"/);
});

test("ReportCountmeTrend preserves zero and explains unavailable sources", () => {
  const available = renderComponent(
    "ReportCountmeTrend",
    { currentTotal: 0, historyPoints: [0] },
    { "../Sparkline": sparklineStub },
  );
  assert.match(available, />0</);
  assert.doesNotMatch(available, /unavailable/i);

  const unavailable = renderComponent(
    "ReportCountmeTrend",
    {
      currentTotal: null,
      historyPoints: [],
      unavailableReason: "HTTP 503",
    },
    { "../Sparkline": sparklineStub },
  );
  assert.match(unavailable, /Data unavailable/);
  assert.match(unavailable, /HTTP 503/);

  // The monthly report passes no reason: it has no total to pass, because a
  // Project Bluefin count comes from countme.projectbluefin.io and that
  // service publishes no read endpoint yet. The panel supplies that reason
  // itself rather than showing an unexplained blank.
  const noReason = renderComponent(
    "ReportCountmeTrend",
    { currentTotal: null, historyPoints: [], variants: [] },
    { "../Sparkline": sparklineStub },
  );
  assert.match(noReason, /countme\.projectbluefin\.io/);
});

test("ReportLaneHealth exposes pending and unavailable lane states", () => {
  const markup = renderComponent(
    "ReportLaneHealth",
    {
      lanes: [
        {
          id: "bluefin",
          label: "Bluefin",
          repo: "projectbluefin/bluefin",
          total: null,
          passed: null,
          failed: null,
          pending: null,
          successRate: null,
          medianDurationMin: null,
          unavailableReason: "HTTP 503",
        },
        {
          id: "dakota",
          label: "Dakota",
          repo: "projectbluefin/dakota",
          total: 2,
          passed: 1,
          failed: 0,
          pending: 1,
          successRate: 100,
          medianDurationMin: 5,
        },
      ],
    },
    { "../Sparkline": sparklineStub },
  );

  assert.match(markup, /unavailable/i);
  assert.match(markup, /HTTP 503/);
  assert.match(markup, /pending/i);
});

test("ReportDoraCadence exposes unavailable and pending states without hiding zero", () => {
  const unavailable = renderComponent("ReportDoraCadence", {});
  assert.match(unavailable, /Delivery data unavailable/);
  assert.match(unavailable, /role="status"/);

  const measured = renderComponent("ReportDoraCadence", {
    totalReleases: 0,
    pending: true,
  });
  assert.match(measured, />0</);
  assert.match(measured, /pending/i);

  const pendingRuns = renderComponent("ReportDoraCadence", {
    totalReleases: 0,
    pendingRuns: 2,
  });
  assert.match(pendingRuns, /Pending delivery measurements/);
  assert.match(pendingRuns, /2 runs/);
});
