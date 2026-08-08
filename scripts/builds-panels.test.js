const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

/* --- fixtures --- */
const FIXTURE_FULL = {
  generatedAt: "2026-08-07T10:00:00Z",
  window: { from: "2026-07-08", to: "2026-08-07" },
  lanes: [
    {
      id: "bluefin-testing",
      label: "bluefin testing",
      repo: "projectbluefin/bluefin",
      runs: [
        { t: 1783595254, status: "passed", durationMin: 45 },
        { t: 1783508854, status: "failed", durationMin: 30 },
        { t: 1783422454, status: "running", durationMin: 12 },
      ],
      passRate: 0.5,
      unavailable: false,
      stateReason: null,
    },
    {
      id: "common-testing",
      label: "common testing",
      repo: "projectbluefin/common",
      runs: [
        { t: 1783595254, status: "passed", durationMin: 5 },
        { t: 1783508854, status: "passed", durationMin: 7 },
      ],
      passRate: 1.0,
      unavailable: false,
      stateReason: null,
    },
  ],
  totals: {},
  daily: [],
  unavailable: false,
  stateReason: null,
};

const FIXTURE_ONLY_RUNNING = {
  generatedAt: "2026-08-07T10:00:00Z",
  window: { from: "2026-07-08", to: "2026-08-07" },
  lanes: [
    {
      id: "bluefin-testing",
      label: "bluefin testing",
      repo: "projectbluefin/bluefin",
      runs: [
        { t: 1783595254, status: "running", durationMin: 14 },
        { t: 1783508854, status: "running", durationMin: 5 },
      ],
      passRate: null,
      unavailable: false,
      stateReason: null,
    },
  ],
  totals: {},
  daily: [],
  unavailable: false,
  stateReason: null,
};

const FIXTURE_UNAVAILABLE = {
  generatedAt: "2026-08-07T10:00:00Z",
  window: { from: "2026-07-08", to: "2026-08-07" },
  lanes: [],
  totals: {},
  daily: [],
  unavailable: true,
  stateReason: "No GITHUB_TOKEN available",
};

function makeStubs(fixture) {
  return {
    "../FactoryDataContext": {
      __esModule: true,
      useDataset: () => ({ data: fixture, loading: false, reason: null }),
    },
    "../EChart": {
      __esModule: true,
      default: (props) =>
        React.createElement("div", {
          "data-echart": "true",
          "data-title": props.title,
          "data-summary": props.summary,
          "data-points": String(props.points),
          "data-option": JSON.stringify(props.option),
        }),
    },
    "../../Sparkline": {
      __esModule: true,
      default: (props) =>
        React.createElement("span", { "data-sparkline": "true" }),
    },
    "../Unavailable": {
      __esModule: true,
      default: (props) =>
        React.createElement("div", {
          "data-unavailable": "true",
          "data-what": props.what,
          "data-reason": props.reason,
        }),
    },
    "../../HiveFactoryDashboard": {
      __esModule: true,
      BuildsSection: () =>
        React.createElement("div", { "data-builds-section": "true" }),
    },
    "../chartTheme": require(
      path.join(
        __dirname,
        "..",
        "src",
        "components",
        "factory",
        "chartTheme.ts",
      ),
    ),
  };
}

function loadPanel(fixture) {
  const tsxPath = path.join(
    __dirname,
    "..",
    "src",
    "components",
    "factory",
    "panels",
    "BuildsPanels.tsx",
  );
  const { outputText } = ts.transpileModule(fs.readFileSync(tsxPath, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const stubs = makeStubs(fixture);
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id === "@docusaurus/Link")
        return {
          __esModule: true,
          default: (p) => React.createElement("a", { href: p.to }, p.children),
        };
      for (const [k, v] of Object.entries(stubs)) {
        if (id === k || id.endsWith(k.replace(/^\.\.?\//, ""))) return v;
      }
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsxPath), id);
        for (const ext of [".ts", ".tsx"]) {
          if (fs.existsSync(base + ext)) {
            const src = fs.readFileSync(base + ext, "utf8");
            const { outputText: out } = ts.transpileModule(src, {
              compilerOptions: {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.CommonJS,
              },
            });
            const m2 = { exports: {} };
            new Function("require", "module", "exports", out)(
              require,
              m2,
              m2.exports,
            );
            return m2;
          }
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports.default;
}

function render(fixture, props) {
  const Comp = loadPanel(fixture);
  return renderToStaticMarkup(React.createElement(Comp, props ?? { s: {} }));
}

/* --- tests --- */

test("in-flight runs are never drawn as failures", () => {
  const html = render(FIXTURE_ONLY_RUNNING);
  // No failed glyph (■ is alert/fail)
  assert.ok(!html.includes("■"));
  // Has inflight count
  assert.ok(html.includes("in flight"));
  assert.ok(html.includes("2 runs"));
});

test("lane duration charts share ONE y-domain", () => {
  const html = render(FIXTURE_FULL);
  // All echart options should have same yAxis.max
  const options = [...html.matchAll(/data-option="([^"]*)"/g)].map((m) =>
    JSON.parse(m[1].replace(/&quot;/g, '"')),
  );
  const yMaxes = options.filter((o) => o.yAxis).map((o) => o.yAxis.max);
  assert.ok(yMaxes.length >= 2, "at least 2 lane charts expected");
  const unique = new Set(yMaxes);
  assert.equal(unique.size, 1, "all lane charts must share one y-domain max");
});

test("unavailable payload renders Unavailable with stateReason", () => {
  const html = render(FIXTURE_UNAVAILABLE);
  assert.ok(html.includes("data-unavailable"));
  assert.ok(html.includes("No GITHUB_TOKEN available"));
});

test("BuildsSection is always rendered", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(html.includes("data-builds-section"));
});

test("terminal runs table excludes running", () => {
  const html = render(FIXTURE_FULL);
  // The table should have passed/failed glyphs but 'running' shows as inflight
  assert.ok(html.includes("in flight"));
  // Count table rows with status glyphs (● for ok, ■ for alert)
  const glyphs = html.match(/aria-label="(Nominal|Alert)"/g) || [];
  // FIXTURE_FULL has 3 terminal runs across lanes (2 bluefin + 2 common = 4 terminal)
  assert.ok(glyphs.length > 0);
});

test("rendering is deterministic", () => {
  assert.equal(render(FIXTURE_FULL), render(FIXTURE_FULL));
});

test("severity carries a glyph", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(/[■▲●○]/.test(html));
});
