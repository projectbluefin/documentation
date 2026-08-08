const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const GHCR_FIXTURE = {
  generatedAt: "2026-08-06T00:00:00Z",
  orgs: ["projectbluefin"],
  packages: [
    {
      name: "brew",
      family: "userspace",
      versionCount: 50,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-08-04T00:00:00Z",
          ageDays: 2,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
    {
      name: "brew-x86_64",
      family: "userspace",
      versionCount: 50,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-07-10T00:00:00Z",
          ageDays: 27,
          state: "stale",
          stateReason: "Expected within 7 days",
        },
      ],
    },
    {
      name: "brew-aarch64",
      family: "userspace",
      versionCount: 50,
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
      name: "toolbox-ubuntu",
      family: "toolbox",
      versionCount: 10,
      streams: [
        {
          tag: "latest",
          publishedAt: "2026-08-03T00:00:00Z",
          ageDays: 3,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
  ],
  familyCounts: { userspace: 3, toolbox: 1 },
  unavailable: false,
  stateReason: null,
};

const FLATHUB_FIXTURE = {
  platform: { downloads: 4533043912, apps: 3603, verifiedApps: 2136 },
  downloadsPerDay: [],
  byOs: [],
  flatpakVersionsOnBluefin: [
    { version: "1.16.2", installs: 5000 },
    { version: "1.14.6", installs: 2000 },
  ],
  unavailable: false,
  stateReason: null,
};

const UNAVAILABLE_FIXTURE = {
  unavailable: true,
  stateReason: "No token in CI",
  packages: [],
  familyCounts: {},
  orgs: [],
  generatedAt: "",
};

function loadComponent(tsxPath, ghcrFixture, flathubFixture) {
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
      if (id.includes("FactoryDataContext")) {
        return {
          __esModule: true,
          useDataset: (key) => {
            if (key === "ghcrPackages")
              return { data: ghcrFixture, loading: false, reason: null };
            if (key === "flathub")
              return { data: flathubFixture, loading: false, reason: null };
            return { data: null, loading: false, reason: "unknown key" };
          },
        };
      }
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
  "UserspacePanels.tsx",
);

function render(ghcr, flathub) {
  const Panel = loadComponent(PANEL_PATH, ghcr, flathub).default;
  return renderToStaticMarkup(React.createElement(Panel, { s: {} }));
}

test("page states what it measures and mentions the lab", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.ok(html.includes("userspace stack"));
  assert.ok(html.includes("lab"));
});

test("awaiting lanes are not rendered as empty cards with dashes", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  // The awaiting userspace image is in the inventory table with the unknown glyph
  assert.ok(html.includes("brew-aarch64"));
  // It gets the unknown glyph ○ and word "Unknown", not stale
  const idx = html.indexOf("brew-aarch64");
  const window = html.slice(idx, idx + 300);
  assert.ok(window.includes("○"));
  assert.ok(window.includes("Unknown"));
});

test("an awaiting lane never renders the word stale", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  // brew-aarch64 is awaiting - find its table cell context
  const idx = html.indexOf("brew-aarch64");
  assert.ok(idx > -1);
  // Extract just this row (up to next </tr>)
  const rowEnd = html.indexOf("</tr>", idx);
  const row = html.slice(idx, rowEnd);
  assert.ok(!row.includes("Alert")); // stale maps to Alert
  assert.ok(!row.includes("■")); // alert glyph
  assert.ok(row.includes("Unknown")); // awaiting maps to unknown
});

test("no IP address appears in the output", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.ok(!/\b\d{1,3}(\.\d{1,3}){3}\b/.test(html));
});

test("unavailable payload renders Unavailable with stateReason", () => {
  const html = render(UNAVAILABLE_FIXTURE, UNAVAILABLE_FIXTURE);
  assert.ok(html.includes("data-unavailable"));
  assert.ok(html.includes("No token in CI"));
});

test("severity carries a glyph", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.ok(/[■▲●○]/.test(html));
});

test("rendering is deterministic", () => {
  const a = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  const b = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.equal(a, b);
});

test("flatpak versions chart is rendered", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.ok(html.includes("Flatpak runtime versions on Bluefin"));
});

test("toolbox section renders toolbox images", () => {
  const html = render(GHCR_FIXTURE, FLATHUB_FIXTURE);
  assert.ok(html.includes("toolbox-ubuntu"));
});
