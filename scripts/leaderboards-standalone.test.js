const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const dashboardPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "HiveFactoryDashboard.tsx",
);
const routesPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "routes.ts",
);

function loadDashboard(datasets = {}) {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(dashboardPath, "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    },
  );
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.includes("FactoryDataContext")) {
        return {
          useDataset: (key) => ({
            data: datasets[key] ?? null,
            loading: false,
            reason: null,
          }),
        };
      }
      if (id === "@docusaurus/Link") {
        return {
          __esModule: true,
          default: ({ href, children, ...props }) =>
            React.createElement("a", { href, ...props }, children),
        };
      }
      if (id === "@theme/Heading") {
        return {
          __esModule: true,
          default: ({ as = "h2", children, ...props }) =>
            React.createElement(as, props, children),
        };
      }
      if (id === "@theme/Layout") {
        return { __esModule: true, default: ({ children }) => children };
      }
      if (id.includes("Sparkline") || id.includes("ActivityCalendar")) {
        return { __esModule: true, default: () => React.createElement("svg") };
      }
      if (id.includes("chartTheme")) return { FX_SEVERITY: {} };
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

function loadRoutes() {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(routesPath, "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    },
  );
  const mod = { exports: {} };
  new Function("module", "exports", outputText)(mod, mod.exports);
  return mod.exports;
}

test("Hive-only contributors have a hosted player record link", () => {
  const { ContributorLeaderboard } = loadDashboard();
  assert.equal(
    typeof ContributorLeaderboard,
    "function",
    "the standalone page must expose its contributor panel",
  );

  const html = renderToStaticMarkup(
    React.createElement(ContributorLeaderboard, {
      history: {
        entries: [],
        contributors: { established: 100 },
        contributorsByRepo: { documentation: { established: 100 } },
        contributorStats: {
          established: {
            total: 100,
            lastWeek: 2,
            lastMonth: 5,
            last3Months: 8,
            byRepo: { documentation: 100 },
            weeks: [1, 2],
          },
        },
        contributorWeekStarts: [1_700_000_000, 1_700_604_800],
      },
      registryEntries: [
        {
          github_username: "hive-only",
          avatar_url: "",
          trust_tier: "",
          tasks_completed: 4,
          tasks_failed: 0,
          active: true,
        },
      ],
    }),
  );

  assert.match(html, /hive-only/);
  assert.match(html, /4 Hive tasks/);
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-knuckle-gjvq\.hive\.hivecommons\.dev\/api\/leaderboard\/contributor\/hive-only"/,
  );
});

test("leaderboards stay outside the Factory tab registry", () => {
  const { routeFor } = loadRoutes();

  assert.equal(routeFor("/leaderboards"), undefined);
  assert.ok(
    fs.existsSync(
      path.join(__dirname, "..", "src", "pages", "leaderboards.tsx"),
    ),
    "the standalone Leaderboards page must exist",
  );
});

test("the standalone page includes linked Hive task cards", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: {},
      contributorsByRepo: {},
    },
    registry: {
      leaderboard: [
        {
          github_username: "zulu-player",
          avatar_url: "",
          trust_tier: "",
          tasks_completed: 7,
          tasks_failed: 0,
          active: true,
        },
        {
          github_username: "alpha-player",
          avatar_url: "",
          trust_tier: "",
          tasks_completed: 7,
          tasks_failed: 0,
          active: true,
        },
      ],
    },
  });
  assert.equal(
    LeaderboardsSection.length,
    0,
    "the standalone section must load static datasets from its provider",
  );
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));

  assert.match(html, /Hive Task Leaderboard/);
  assert.match(html, /zulu-player/);
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-knuckle-gjvq\.hive\.hivecommons\.dev\/api\/leaderboard\/contributor\/zulu-player"/,
  );
  const taskCards = html.slice(html.indexOf("Hive Task Leaderboard"));
  assert.ok(
    taskCards.indexOf("alpha-player") < taskCards.indexOf("zulu-player"),
    "equal task counts must use login order rather than registry order",
  );
});

test("missing Hive task data is visible instead of zero", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { player: 1 },
      contributorsByRepo: { documentation: { player: 1 } },
      contributorStats: {
        player: {
          total: 1,
          lastWeek: 1,
          lastMonth: 1,
          last3Months: 1,
          byRepo: { documentation: 1 },
          weeks: [1],
        },
      },
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));

  assert.match(html, /Hive task data unavailable/);
  assert.doesNotMatch(html, /0 Hive tasks/);
});
