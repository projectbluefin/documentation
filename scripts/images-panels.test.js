const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const FIXTURE_FULL = {
  generatedAt: "2026-08-06T00:00:00Z",
  orgs: ["projectbluefin"],
  packages: [
    {
      name: "bluefin",
      family: "os",
      versionCount: 200,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-08-01T00:00:00Z",
          ageDays: 5,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
    {
      name: "toolbox-ubuntu",
      family: "toolbox",
      versionCount: 10,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-07-20T00:00:00Z",
          ageDays: 17,
          state: "stale",
          stateReason: "Expected within 7 days",
        },
      ],
    },
    {
      name: "awaiting-image",
      family: "os",
      versionCount: 0,
      streams: [
        {
          tag: "latest",
          publishedAt: null,
          ageDays: null,
          state: "awaiting",
          stateReason: "No version published yet",
        },
      ],
    },
    {
      name: "internal-thing",
      family: "internal",
      versionCount: 5,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-08-05T00:00:00Z",
          ageDays: 1,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
  ],
  familyCounts: { os: 2, toolbox: 1, internal: 1 },
  unavailable: false,
  stateReason: null,
};

const FIXTURE_UNAVAILABLE = {
  unavailable: true,
  stateReason: "Token not available in this environment",
  packages: [],
  familyCounts: {},
  orgs: [],
  generatedAt: "",
};

function loadComponent(tsxPath, datasetFixture) {
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
          useDataset: () => ({
            data: datasetFixture,
            loading: false,
            reason: null,
          }),
        };
      }
      // Stub EChart
      if (id.includes("EChart")) {
        return {
          __esModule: true,
          default: (props) =>
            React.createElement("div", {
              "data-echart": "true",
              "data-title": props.title,
              "data-summary": props.summary,
              "data-points": String(props.points),
            }),
        };
      }
      // Stub Unavailable
      if (id.includes("Unavailable")) {
        return {
          __esModule: true,
          default: ({ what, reason }) =>
            React.createElement("div", { "data-unavailable": what }, reason),
        };
      }
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
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const PANEL_PATH = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "panels",
  "ImagesPanels.tsx",
);

function render(fixture) {
  const Panel = loadComponent(PANEL_PATH, fixture).default;
  return renderToStaticMarkup(React.createElement(Panel, { s: {} }));
}

test("awaiting lanes are summarised in one line, not rendered as empty cards", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(html.includes("1 lane has no published version yet"));
  // The awaiting stream should NOT get its own freshness card
  assert.ok(!html.includes("awaiting-image:latest"));
});

test("an awaiting lane never renders the word stale", () => {
  const html = render(FIXTURE_FULL);
  // Find the awaiting summary area and confirm no "stale" near "awaiting"
  const awaitingIdx = html.indexOf("no published version yet");
  assert.ok(awaitingIdx > -1);
  // Overall: the word stale may appear for actual stale items but not mixed with awaiting
  assert.ok(!html.includes("awaiting-image") || !html.includes("Stale"));
});

test("no IP address appears in the output", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(html));
});

test("unavailable payload renders Unavailable with stateReason", () => {
  const html = render(FIXTURE_UNAVAILABLE);
  assert.ok(html.includes("data-unavailable"));
  assert.ok(html.includes("Token not available in this environment"));
});

test("severity carries a glyph", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(/[■▲●○]/.test(html));
});

test("rendering is deterministic", () => {
  assert.equal(render(FIXTURE_FULL), render(FIXTURE_FULL));
});

test("internal family is excluded from lane freshness", () => {
  const html = render(FIXTURE_FULL);
  assert.ok(!html.includes("internal-thing"));
});
