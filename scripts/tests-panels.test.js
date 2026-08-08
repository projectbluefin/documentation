const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

/* --- stubs --- */
const FIXTURE_FULL = {
  generatedAt: "2026-08-07T10:00:00Z",
  windowDays: 30,
  suites: [
    {
      id: "bluefin/run-testsuite",
      repo: "projectbluefin/bluefin",
      workflow: "run-testsuite.yml",
      label: "bluefin · testsuite",
      runs: [
        {
          t: 1783595254,
          status: "failed",
          durationMin: 73,
          url: "https://example.com/1",
        },
        {
          t: 1783508854,
          status: "passed",
          durationMin: 60,
          url: "https://example.com/2",
        },
      ],
      passRate: 0.5,
      flips: 2,
      consecutiveFailures: 1,
      lastTerminalAt: "2026-08-07T10:00:00Z",
      triageRank: 3,
      unavailable: false,
      stateReason: null,
    },
    {
      id: "bluefin/second",
      repo: "projectbluefin/common",
      workflow: "test.yml",
      label: "common · test",
      runs: [
        {
          t: 1783595254,
          status: "passed",
          durationMin: 10,
          url: "https://example.com/3",
        },
      ],
      passRate: 1.0,
      flips: 0,
      consecutiveFailures: 0,
      lastTerminalAt: "2026-08-07T10:00:00Z",
      triageRank: 0,
      unavailable: false,
      stateReason: null,
    },
  ],
  unavailable: false,
  stateReason: null,
};

const FIXTURE_ONLY_RUNNING = {
  generatedAt: "2026-08-07T10:00:00Z",
  windowDays: 30,
  suites: [
    {
      id: "bluefin/run-testsuite",
      repo: "projectbluefin/bluefin",
      workflow: "run-testsuite.yml",
      label: "bluefin · testsuite",
      runs: [
        {
          t: 1783595254,
          status: "running",
          durationMin: 14,
          url: "https://example.com/1",
        },
        {
          t: 1783508854,
          status: "running",
          durationMin: 5,
          url: "https://example.com/2",
        },
      ],
      passRate: null,
      flips: 0,
      consecutiveFailures: 0,
      lastTerminalAt: null,
      triageRank: 0,
      unavailable: false,
      stateReason: null,
    },
  ],
  unavailable: false,
  stateReason: null,
};

const FIXTURE_UNAVAILABLE = {
  generatedAt: "2026-08-07T10:00:00Z",
  windowDays: 30,
  suites: [],
  unavailable: true,
  stateReason: "No GITHUB_TOKEN available",
};

const FIXTURE_EMPTY_TRIAGE = {
  generatedAt: "2026-08-07T10:00:00Z",
  windowDays: 30,
  suites: [
    {
      id: "bluefin/run-testsuite",
      repo: "projectbluefin/bluefin",
      workflow: "run-testsuite.yml",
      label: "bluefin · testsuite",
      runs: [
        {
          t: 1783595254,
          status: "passed",
          durationMin: 10,
          url: "https://example.com/1",
        },
      ],
      passRate: 1.0,
      flips: 0,
      consecutiveFailures: 0,
      lastTerminalAt: "2026-08-07T10:00:00Z",
      triageRank: 0,
      unavailable: false,
      stateReason: null,
    },
  ],
  unavailable: false,
  stateReason: null,
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
        React.createElement("span", {
          "data-sparkline": "true",
          "data-variant": props.variant,
          "data-domain": JSON.stringify(props.domain),
          "data-label": props.label,
          "data-empty-label": props.emptyLabel,
        }),
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
      BuildsSection: () => React.createElement("div"),
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
    "TestsPanels.tsx",
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
      // chartTheme relative resolve
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
  // The run history table should have no rows (only terminal runs shown)
  // and no aria-label="Alert" status cells
  assert.ok(!html.includes('aria-label="Alert"'));
  // Has inflight count
  assert.ok(html.includes("in flight"));
  assert.ok(html.includes("2 run"));
});

test("passRate: null renders as no terminal runs, NOT 0%", () => {
  const html = render(FIXTURE_ONLY_RUNNING);
  assert.ok(html.includes("no terminal runs"));
  // Must not show "0.0%" as a pass rate value
  assert.ok(!html.includes("0.0%"));
});

test("heatmap distinguishes no-data from failing", () => {
  const html = render(FIXTURE_FULL);
  // Find the heatmap echart
  const match = html.match(
    /data-title="Suite health heatmap"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(match, "heatmap chart must exist");
  const option = JSON.parse(match[1].replace(/&quot;/g, '"'));
  // -1 values exist (no-data) and are handled by outOfRange
  const hasNoData = option.series[0].data.some((d) => d[2] === -1);
  assert.ok(hasNoData, "no-data cells must use -1 sentinel");
  assert.ok(
    option.visualMap.outOfRange,
    "outOfRange must be set for no-data cells",
  );
});

test("sparklines share ONE domain", () => {
  const html = render(FIXTURE_FULL);
  const domains = [...html.matchAll(/data-domain="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(domains.length >= 2, "at least 2 sparklines expected");
  const unique = new Set(domains);
  assert.equal(unique.size, 1, "all sparklines must share one domain");
});

test("empty triage list says nothing needs triage", () => {
  const html = render(FIXTURE_EMPTY_TRIAGE);
  assert.ok(html.includes("Nothing needs triage"));
});

test("severity carries a glyph", () => {
  const html = render(FIXTURE_FULL);
  // Triage items should have glyphs
  assert.ok(/[■▲●○]/.test(html));
});

test("unavailable payload renders Unavailable with stateReason", () => {
  const html = render(FIXTURE_UNAVAILABLE);
  assert.ok(html.includes("data-unavailable"));
  assert.ok(html.includes("No GITHUB_TOKEN available"));
});

test("rendering is deterministic", () => {
  assert.equal(render(FIXTURE_FULL), render(FIXTURE_FULL));
});
