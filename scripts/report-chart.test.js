const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");

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

const exported = loadChart();
const ReportChart = exported.default;
const clientExported = loadClient();
const ReportChartClient = clientExported.default;
const { buildReportChartOption, selectEChartsModules } = clientExported;

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
