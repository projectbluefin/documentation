const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const tsxPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "analytics",
  "CountmeAnalyticsCharts.tsx",
);
const chartThemePath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "chartTheme.ts",
);

function loadComponent(datasetFixture) {
  const source = fs.readFileSync(tsxPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });

  const chartTheme = require(chartThemePath);
  const mod = { exports: {} };

  const capturedECharts = [];

  const requireShim = (id) => {
    if (id.endsWith(".css")) return {};
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
    if (id.endsWith("EChart")) {
      return {
        __esModule: true,
        default: (props) => {
          capturedECharts.push(props);
          return React.createElement("div", {
            "data-echart": props.title,
            "data-option": JSON.stringify(props.option),
          });
        },
      };
    }
    if (id.endsWith("Unavailable")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("div", {
            "data-unavailable": "true",
            "data-reason": props.reason,
          }),
      };
    }
    if (id.endsWith("Sparkline")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("span", {
            "data-sparkline": "true",
            "data-domain": JSON.stringify(props.domain),
            "data-label": props.label,
          }),
      };
    }
    if (id.endsWith("chartTheme")) return chartTheme;
    if (id === "@site/static/data/countme-history.json") {
      return (
        datasetFixture ||
        require(
          path.join(__dirname, "..", "static", "data", "countme-history.json"),
        )
      );
    }
    return require(id);
  };

  new Function("require", "module", "exports", outputText)(
    requireShim,
    mod,
    mod.exports,
  );
  return { mod: mod.exports, capturedECharts };
}

const SAMPLE_DATASET = {
  generatedAt: "2026-08-01T00:00:00Z",
  source: "test",
  method: "ublue-countme-v1",
  unit: "estimated weekly active systems",
  variants: [
    "bluefin",
    "bluefin-lts",
    "dakota",
    "utah",
    "aurora",
    "bazzite",
    "fedora",
  ],
  weeks: [
    {
      week: "2026-07-20",
      bluefin: 3500,
      "bluefin-lts": 120,
      dakota: 45,
      utah: 15,
      aurora: 2500,
      bazzite: 80000,
      fedora: 1000000,
    },
    {
      week: "2026-07-27",
      bluefin: 3600,
      "bluefin-lts": 130,
      dakota: 50,
      utah: 20,
      aurora: 2600,
      bazzite: 82000,
      fedora: 1050000,
    },
  ],
  unavailable: false,
  stateReason: null,
};

function renderSample() {
  const { mod, capturedECharts } = loadComponent(SAMPLE_DATASET);
  const html = renderToStaticMarkup(React.createElement(mod.default));
  return { html, capturedECharts, mod };
}

test("CountmeAnalyticsCharts renders every panel without crashing", () => {
  const { html, capturedECharts } = renderSample();

  assert.ok(html.includes("Weekly Active Systems"));
  assert.deepEqual(capturedECharts.map((p) => p.title).sort(), [
    "Adoption by image family",
    "Cloud-native desktop ecosystem",
    "Project Bluefin fleet",
  ]);

  // The registry snapshot is fetched after hydration, so the static render says
  // the matrix is pending rather than dropping the panel.
  assert.match(html, /data-unavailable="true"/);
  assert.match(html, /Reading the registry snapshot/);
});

test("each image family gets its own ridgeline lane", () => {
  const { capturedECharts, mod } = renderSample();
  const ridgeline = capturedECharts.find(
    (p) => p.title === "Adoption by image family",
  ).option;

  assert.deepEqual(
    ridgeline.series.map((s) => s.name),
    mod.BLUEFIN_FAMILY_IMAGES.map((f) => f.name),
  );
  // Each lane owns a grid, so one lane's shape cannot be read off another's.
  assert.deepEqual(
    ridgeline.series.map((s) => [s.xAxisIndex, s.yAxisIndex]),
    ridgeline.series.map((_, i) => [i, i]),
  );
});

test("ridgeline lanes share one domain rather than autoscaling", () => {
  const { capturedECharts } = renderSample();
  const ridgeline = capturedECharts.find(
    (p) => p.title === "Adoption by image family",
  ).option;

  const maxima = new Set(ridgeline.yAxis.map((a) => a.max));
  assert.equal(
    maxima.size,
    1,
    "per-lane autoscaling makes every lane identical",
  );
  // The largest family in the fixture, so Utah's 20 reads as the sliver it is.
  assert.deepEqual([...maxima], [3600]);
  for (const axis of ridgeline.yAxis) assert.equal(axis.min, 0);
});

test("a family with no telemetry keeps its lane and states why", () => {
  const { mod, capturedECharts } = loadComponent({
    unavailable: false,
    weeks: [{ week: "2026-08-01", bluefin: 3000 }],
  });
  renderToStaticMarkup(React.createElement(mod.default));

  const ridgeline = capturedECharts.find(
    (p) => p.title === "Adoption by image family",
  ).option;

  assert.equal(ridgeline.series.length, mod.BLUEFIN_FAMILY_IMAGES.length);
  const dakota = ridgeline.title.find(
    (t) => t.text === "Project Bluefin Dakota",
  );
  assert.match(dakota.subtext, /^no telemetry —/);
  // The reporting lane still prints its current value as a number.
  const bluefin = ridgeline.title.find((t) => t.text === "Bluefin");
  assert.equal(bluefin.subtext, "3,000 systems");
});
