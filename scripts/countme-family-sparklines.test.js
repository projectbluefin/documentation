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
        default: (props) =>
          React.createElement("div", { "data-echart": props.title }),
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
    if (id.endsWith("ghcr-packages.json")) {
      return {
        packages: [
          {
            name: "bluefin",
            family: "os",
            streams: [
              {
                tag: "stable",
                publishedAt: "2026-09-08T18:31:26Z",
                ageDays: 1,
                state: "fresh",
                stateReason: null,
              },
            ],
          },
        ],
        unavailable: false,
        stateReason: null,
      };
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

test("BLUEFIN_FAMILY_IMAGES covers every family common ships into", () => {
  const { BLUEFIN_FAMILY_IMAGES } = loadComponent();
  assert.ok(
    Array.isArray(BLUEFIN_FAMILY_IMAGES),
    "BLUEFIN_FAMILY_IMAGES must be an array",
  );
  const ids = BLUEFIN_FAMILY_IMAGES.map((img) => img.id);
  assert.deepEqual(ids, ["bluefin", "bluefin-lts", "dakota", "utah", "server"]);
});

test("family sparkline domain excludes external Aurora", () => {
  const fixture = {
    unavailable: false,
    weeks: [
      {
        week: "2026-08-01",
        bluefin: 3000,
        "bluefin-lts": 150,
        aurora: 99999, // External peer with high count
        dakota: 0,
        utah: 0,
      },
    ],
  };

  const { default: CountmeAnalyticsCharts } = loadComponent(fixture);
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts),
  );

  const sparklineDomains = [...html.matchAll(/data-domain="([^"]*)"/g)].map(
    (m) => JSON.parse(m[1]),
  );
  assert.ok(
    sparklineDomains.length >= 5,
    "Expected a sparkline for every family",
  );

  // Every sparkline domain max must reflect Bluefin (3000), not Aurora (99999)
  for (const domain of sparklineDomains) {
    assert.equal(
      domain[1],
      3000,
      `Expected domain max to be 3000, got ${domain[1]}`,
    );
  }
});

test("family sparkline domain includes next-gen variants Dakota and Utah", () => {
  const fixture = {
    unavailable: false,
    weeks: [
      {
        week: "2026-08-01",
        bluefin: 2000,
        "bluefin-lts": 200,
        aurora: 500,
        dakota: 5000, // Highest family count
        utah: 5, // Lowest family count
      },
    ],
  };

  const { default: CountmeAnalyticsCharts } = loadComponent(fixture);
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts),
  );

  const sparklineDomains = [...html.matchAll(/data-domain="([^"]*)"/g)].map(
    (m) => JSON.parse(m[1]),
  );
  assert.ok(sparklineDomains.length >= 5);

  // Anchored at 0 so a small family reads as small; max captures Dakota (5000).
  for (const domain of sparklineDomains) {
    assert.equal(domain[0], 0, `Expected domain min to be 0, got ${domain[0]}`);
    assert.equal(
      domain[1],
      5000,
      `Expected domain max to be 5000, got ${domain[1]}`,
    );
  }
});

test("all rendered family cards share the same sparkline domain", () => {
  const { default: CountmeAnalyticsCharts } = loadComponent();
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts),
  );

  const rawDomains = [...html.matchAll(/data-domain="([^"]*)"/g)].map(
    (m) => m[1],
  );
  assert.equal(rawDomains.length, 5, "Expected 5 family card sparklines");
  const uniqueDomains = new Set(rawDomains);
  assert.equal(
    uniqueDomains.size,
    1,
    "All family sparklines must share the same domain",
  );
});
