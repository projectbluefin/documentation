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
      if (id.includes("factory/EChart")) {
        return {
          __esModule: true,
          default: ({ summary }) =>
            React.createElement("figure", null, summary),
        };
      }
      if (id.includes("chartTheme"))
        return {
          FX_SEVERITY: {},
          gapSafe: (data) =>
            data.map((value) => (Number.isNaN(value) ? null : (value ?? null))),
        };
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

test("contributor rows link to their hosted dossiers and display Hive tasks", () => {
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
        hiveContributorTiers: {
          established: { tier: "contributor", tasks: 25 },
          "hive-only": { tier: "trusted", tasks: 4 },
        },
      },
    }),
  );

  assert.match(html, /hive-only/);
  assert.match(html, /established/);
  assert.match(html, /25/);
  assert.match(html, /4/);
  for (const login of ["established", "hive-only"]) {
    assert.match(
      html,
      new RegExp(
        `href="https://hosted-projectbluefin-common-nmq5\\.hive\\.hivecommons\\.dev/contribute/dossier/${login}"`,
      ),
    );
  }
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
      hiveContributorTiers: {
        "zulu-player": { tier: "contributor", tasks: 7 },
        "alpha-player": { tier: "contributor", tasks: 7 },
        "custom-agent-helper": { tier: "agent", tasks: 99 },
      },
    },
    registry: {},
  });
  assert.equal(
    LeaderboardsSection.length,
    0,
    "the standalone section must load static datasets from its provider",
  );
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));

  assert.match(html, /Hive Task Leaderboard/);
  assert.match(html, /zulu-player/);
  assert.doesNotMatch(html, />custom-agent-helper</);
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-common-nmq5\.hive\.hivecommons\.dev\/contribute\/dossier\/zulu-player"/,
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
      hiveContributorTiers: {},
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));

  assert.match(html, /Hive task data unavailable/);
  assert.doesNotMatch(html, /0 Hive tasks/);
});

test("the standalone page renders the Recent Milestones leaderboard as a ledger of teamwork", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { champion: 100 },
      contributorsByRepo: { common: { champion: 100 } },
      hiveContributorTiers: {
        champion: { tier: "trusted", tasks: 25 },
      },
      milestones: [
        {
          id: "tier-champion-trusted-2026-09-23",
          login: "champion",
          type: "tier_up",
          title: "Reached Trusted Tier",
          detail: "Maintainer-verified contributor in Hive",
          detectedAt: "2026-09-23T12:00:00Z",
          badge: {
            label: "TRUSTED",
            color: "var(--fx-sev-watch)",
          },
        },
      ],
      season: {
        version: 51,
        name: "A Coruña",
        start: "2026-09-16T00:00:00.000Z",
        source: "https://release.gnome.org/51/",
        updatedAt: "2026-09-22T00:00:00Z",
        repos: ["common", "dakota", "bluefin"],
        byLogin: {},
        weekStarts: [],
        weeklyCommits: [],
        totalCommits: 5,
        breadthUnlocks: [
          {
            id: "season-51-champion-breadth-3",
            login: "champion",
            type: "project_unlock",
            value: 3,
            repo: "bluefin",
            title: "Reached Builder Tier",
            detail:
              "Active across 3 projects in Season of A Coruña (unlocked by bluefin)",
            detectedAt: "2026-09-22T08:00:00Z",
            badge: {
              label: "BUILDER",
              color: "var(--fx-cat-2)",
            },
          },
        ],
      },
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Recent Milestones/);
  assert.match(html, /Ledger of teamwork/);
  assert.match(html, /Reached Trusted Tier/);
  assert.match(html, /Reached Builder Tier/);
  assert.match(html, /champion/);
  assert.ok(
    html.indexOf("Reached Trusted Tier") < html.indexOf("Reached Builder Tier"),
    "newer tier-up event (09-23) must render before older season breadth event (09-22)",
  );
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-common-nmq5\.hive\.hivecommons\.dev\/contribute\/dossier\/champion"/,
  );
});

test("Recent Milestones shows accumulating status when ledger has no events yet", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: {},
      contributorsByRepo: {},
      milestones: [],
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Recent Milestones/);
  assert.match(html, /Milestone ledger accumulating/);
});

test("missing milestone data is visible instead of disappearing", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: null,
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Milestone data unavailable/);
});

test("Recent Milestones renders an explicit error reason when refresh fails", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: {},
      contributorsByRepo: {},
      milestones: [],
      milestonesError: "Hive leaderboard HTTP 503",
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Recent Milestones/);
  assert.match(html, /Milestones unavailable: Hive leaderboard HTTP 503/);
});
