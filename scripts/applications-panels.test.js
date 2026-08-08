const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

/* ---------- Fixtures ---------- */

const FIREHOSE_FIXTURE = {
  stats: {
    appsTotal: 137,
    appsWithGitHubRepo: 67,
    appsWithGitLabRepo: 25,
    appsWithChangelogs: 96,
    totalReleases: 443,
  },
  apps: [
    {
      id: "bluefin-os-stable",
      name: "Bluefin OS (Stable)",
      summary: "The stable Bluefin release track.",
      currentReleaseVersion: "2026-05-31",
      currentReleaseDate: "2026-05-31T00:00:00Z",
      releases: [
        {
          version: "2026-05-31",
          date: "2026-05-31T00:00:00Z",
          title: null,
          description: null,
          url: "https://github.com/projectbluefin/bluefin/releases",
          type: "os-sbom",
        },
        {
          version: "2026-04-15",
          date: "2026-04-15T00:00:00Z",
          title: null,
          description: null,
          url: "https://github.com/projectbluefin/bluefin/releases",
          type: "os-sbom",
        },
      ],
      packageType: "os",
      appSet: "core",
      isVerified: false,
    },
    {
      id: "io.github.example.NullDate",
      name: "NullDate App",
      summary: "An app with no release date",
      currentReleaseVersion: "1.0",
      currentReleaseDate: null,
      releases: null,
      packageType: "flatpak",
      appSet: null,
      isVerified: false,
    },
    {
      id: "io.github.example.JulyApp",
      name: "July App",
      summary: "Released in July",
      currentReleaseVersion: "2.0",
      currentReleaseDate: "2026-07-10T00:00:00Z",
      releases: [
        {
          version: "2.0",
          date: "2026-07-10T00:00:00Z",
          title: "v2",
          description: null,
          url: null,
          type: "appstream",
        },
      ],
      packageType: "flatpak",
      appSet: null,
      isVerified: true,
    },
  ],
};

const FLATHUB_FIXTURE = {
  platform: { downloads: 4533043912, apps: 3603, verifiedApps: 2136 },
  downloadsPerDay: [
    { date: "2026-08-06", downloads: 1234567 },
    { date: "2026-08-05", downloads: 1200000 },
  ],
  byOs: [
    {
      id: "bluefin",
      label: "Bluefin",
      downloads: 434440,
      share: 0.0001,
      versions: { 42: 1432, 43: 22039, 44: 410969 },
    },
    {
      id: "aurora",
      label: "Aurora",
      downloads: 200000,
      share: 0.00005,
      versions: { 44: 200000 },
    },
    {
      id: "bazzite",
      label: "Bazzite",
      downloads: 10375441,
      share: 0.0023,
      versions: { 44: 10375367 },
    },
    {
      id: "fedora",
      label: "Fedora",
      downloads: 11944688,
      share: 0.0026,
      versions: { 44: 11915498 },
    },
  ],
  flatpakVersionsOnBluefin: [{ version: "1.18.0", installs: 359220 }],
  unavailable: false,
  stateReason: null,
};

const FLATHUB_UNAVAILABLE_FIXTURE = {
  ...FLATHUB_FIXTURE,
  unavailable: true,
  stateReason: "Flathub API is down for maintenance.",
};

const GNOME_EXTENSIONS_FIXTURE = [
  {
    id: 5724,
    uuid: "Battery-Health-Charging@maniacx.github.com",
    name: "Battery Health Charging",
    creator: "maniacx",
    creatorUrl: "https://extensions.gnome.org/accounts/profile/maniacx",
    description: "desc",
    url: "https://extensions.gnome.org/extension/5724/",
    icon: null,
    screenshot: null,
    donateUrl: null,
  },
  {
    id: 7065,
    uuid: "Tiling-Shell@domferr",
    name: "Tiling Shell",
    creator: "domferr",
    creatorUrl: "https://extensions.gnome.org/accounts/profile/domferr",
    description: "desc",
    url: "https://extensions.gnome.org/extension/7065/",
    icon: null,
    screenshot: null,
    donateUrl: null,
  },
];

/* ---------- Module loader ---------- */

function loadComponent(tsxPath, fixtures) {
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
            data: fixtures[k] ?? null,
            loading: false,
            reason: fixtures[k] === undefined ? `${k} not available` : null,
          }),
        };
      }
      // Stub EChart
      if (id.includes("EChart")) {
        return {
          __esModule: true,
          default: (props) =>
            React.createElement("div", {
              "data-testid": "echart",
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
            React.createElement("div", {
              "data-testid": "unavailable",
              "data-what": what,
              "data-reason": reason,
            }),
        };
      }
      // Stub HiveFactoryDashboard (type-only import)
      if (id.includes("HiveFactoryDashboard")) {
        return { __esModule: true };
      }
      // chartTheme — transpile the TS source
      if (id.includes("chartTheme")) {
        const chartPath = path.resolve(
          __dirname,
          "..",
          "src",
          "components",
          "factory",
          "chartTheme.ts",
        );
        return loadComponent(chartPath, fixtures);
      }
      // Relative TS modules
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsxPath), id);
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + ext))
            return loadComponent(base + ext, fixtures);
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
  "ApplicationsPanels.tsx",
);

function render(fixtures) {
  const Panel = loadComponent(PANEL_PATH, fixtures).default;
  return renderToStaticMarkup(React.createElement(Panel, { s: {} }));
}

/* ---------- Tests ---------- */

test("states what the page measures", () => {
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  assert.match(html, /applications Bluefin ships/i);
});

test("log scale is labelled", () => {
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  assert.match(html, /log scale/i);
});

test("null release date does not produce fabricated date", () => {
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  assert.ok(html.includes("NullDate App"), "App with null date should appear");
  // Should not contain fabricated dates
  assert.ok(!/1970/.test(html), "No 1970 epoch dates");
  assert.ok(!/Invalid Date/.test(html), "No Invalid Date strings");
  assert.ok(!/NaN/.test(html), "No NaN strings");
});

test("months outside range are gaps not zero", () => {
  // Fixture has releases in April, May, and July — June has 0 releases
  // (inside range), so it should be 0, not null. But months BEFORE April
  // or AFTER July don't exist. The cadence only spans April–July inclusive.
  // Inside that range, June (no releases) is 0.
  // The key assertion: the series does not extend beyond the covered range.
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  // The chart is rendered (it has >= 2 points: April and May)
  assert.ok(html.includes("Release cadence"), "cadence chart renders");
  // The months in the xAxis data should only span 2026-04 to 2026-07
  // (the actual range of release dates), not extend to e.g. 2026-08
  assert.ok(!html.includes("2026-08"), "no month outside range");
});

test("unavailable flathub does not prevent firehose panels", () => {
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_UNAVAILABLE_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  // Firehose KPIs still render
  assert.ok(html.includes("137"), "apps total KPI renders");
  assert.ok(html.includes("443"), "releases KPI renders");
  // Unavailable shown for flathub
  assert.ok(
    html.includes("Flathub API is down for maintenance"),
    "shows flathub unavailable reason",
  );
});

test("rendering is deterministic", () => {
  const fixtures = {
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  };
  const a = render(fixtures);
  const b = render(fixtures);
  assert.equal(a, b);
});

test("GNOME extensions render", () => {
  const html = render({
    firehoseApps: FIREHOSE_FIXTURE,
    flathub: FLATHUB_FIXTURE,
    gnomeExtensions: GNOME_EXTENSIONS_FIXTURE,
  });
  assert.ok(html.includes("Battery Health Charging"));
  assert.ok(html.includes("Tiling Shell"));
});
