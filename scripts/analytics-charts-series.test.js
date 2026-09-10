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

test("CountmeAnalyticsCharts renders without crashing", () => {
  const { mod, capturedECharts } = loadComponent(SAMPLE_DATASET);
  const CountmeAnalyticsCharts = mod.default;
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts),
  );
  assert.ok(html.includes("Weekly Active Systems"));
  assert.ok(
    capturedECharts.length >= 2,
    "Expected hero and comparative ECharts",
  );
});

test("hero chart in split mode defines series for Bluefin Flagship, Bluefin LTS, Dakota, and Utah", () => {
  const source = fs.readFileSync(tsxPath, "utf8");
  assert.ok(
    source.includes('name: "Dakota"'),
    "CountmeAnalyticsCharts must include Dakota series",
  );
  assert.ok(
    source.includes('name: "Utah"'),
    "CountmeAnalyticsCharts must include Utah series",
  );
  assert.ok(
    source.includes("data: dakotaSeries"),
    "CountmeAnalyticsCharts must map dakotaSeries to Dakota series in hero split mode",
  );
  assert.ok(
    source.includes("data: utahSeries"),
    "CountmeAnalyticsCharts must map utahSeries to Utah series in hero split mode",
  );
});

test("comparative chart in workstations mode includes Dakota and Utah series", () => {
  const source = fs.readFileSync(tsxPath, "utf8");
  const workstationsBlock = source.match(
    /if\s*\(\s*viewMode\s*===\s*"workstations"\s*\)\s*\{([\s\S]*?)\}\s*else/,
  );
  assert.ok(workstationsBlock, "workstations viewMode branch must exist");
  const blockContent = workstationsBlock[1];

  assert.ok(
    blockContent.includes("Bluefin Flagship"),
    "workstations mode must include Bluefin Flagship",
  );
  assert.ok(
    blockContent.includes("Bluefin LTS"),
    "workstations mode must include Bluefin LTS",
  );
  assert.ok(
    blockContent.includes("Dakota"),
    "workstations mode must include Dakota",
  );
  assert.ok(
    blockContent.includes("Utah"),
    "workstations mode must include Utah",
  );
  assert.ok(
    blockContent.includes("w.dakota"),
    "workstations mode must map w.dakota",
  );
  assert.ok(
    blockContent.includes("w.utah"),
    "workstations mode must map w.utah",
  );
});

test("hero split series reconcile with unified fleet sum", () => {
  const week = SAMPLE_DATASET.weeks[0];
  const expectedTotal =
    week.bluefin + week["bluefin-lts"] + week.dakota + week.utah;

  assert.equal(expectedTotal, 3500 + 120 + 45 + 15);
  assert.equal(expectedTotal, 3680);
});
