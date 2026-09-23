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

test("contributor rows link to their hosted dossiers", () => {
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
  for (const login of ["established", "hive-only"]) {
    assert.match(
      html,
      new RegExp(
        `href="https://hosted-projectbluefin-common-nmq5\\.hive\\.hivecommons\\.dev/contribute/dossier/${login}"`,
      ),
    );
  }
});

test("current GNOME season ranks exact season commits while retaining all-time access", () => {
  const { ContributorLeaderboard } = loadDashboard();
  const html = renderToStaticMarkup(
    React.createElement(ContributorLeaderboard, {
      history: {
        entries: [],
        contributors: { veteran: 100, newcomer: 3 },
        contributorsByRepo: { common: { veteran: 100, newcomer: 3 } },
        contributorStats: {},
        season: {
          version: 51,
          name: "A Coruña",
          start: "2026-09-16T00:00:00.000Z",
          source: "https://release.gnome.org/51/",
          updatedAt: "2026-09-22T00:00:00Z",
          repos: ["common"],
          byLogin: {
            newcomer: { commits: 3, repos: { common: 3 } },
            veteran: { commits: 1, repos: { common: 1 } },
          },
          weekStarts: [1789257600, 1789862400],
          weeklyCommits: [1, 3],
          totalCommits: 4,
        },
      },
    }),
  );
  assert.match(html, /Season of A Coruña/);
  assert.match(html, /GNOME 51/);
  assert.match(html, /1 tracked repo/);
  assert.match(html, /All Time/);
  assert.ok(
    html.indexOf("<figure") < html.indexOf("dossier/newcomer"),
    "season chart precedes standings",
  );
  assert.ok(html.indexOf("dossier/newcomer") < html.indexOf("dossier/veteran"));
  assert.match(html.replace(/<[^>]*>/g, " "), /4\s+season commits/);
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
        {
          github_username: "custom-agent-helper",
          avatar_url: "",
          trust_tier: "agent",
          tasks_completed: 99,
          tasks_failed: 0,
          active: false,
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

test("first-commit cards use complete stats; incomplete stats show an explicit reason", () => {
  const { ContributorLeaderboard } = loadDashboard();
  const history = {
    entries: [],
    contributors: { veteran: 50 },
    contributorsByRepo: { common: { veteran: 50, newcomer: 4 } },
    contributorStats: {
      veteran: {
        total: 50,
        lastWeek: 2,
        lastMonth: 10,
        last3Months: 20,
        byRepo: { common: 50 },
        weeks: [2],
      },
      newcomer: {
        total: 4,
        lastWeek: 2,
        lastMonth: 4,
        last3Months: 4,
        byRepo: { common: 4 },
        weeks: [2],
      },
    },
    contributorWeekStarts: [1_700_000_000],
    lastWeeklyStatsFetch: "2026-09-20T00:00:00.000Z",
  };
  const render = (data) =>
    renderToStaticMarkup(
      React.createElement(ContributorLeaderboard, {
        history: data,
        registryEntries: [],
      }),
    );
  const complete = render(history);
  assert.match(complete, /New to tracked repos · last 13 weeks/);
  assert.match(complete, /4 commits · 1 project/);
  assert.doesNotMatch(
    complete,
    />veteran<\/span><span class="[^"]*">20 commits/,
  );

  const partial = {
    ...history,
    weeklyStatsError: "GitHub weekly stats refresh failed (rate limit)",
  };
  const corroborated = render({
    ...partial,
    contributors: { veteran: 50, newcomer: 4 },
  });
  assert.match(corroborated, /New to tracked repos · last 13 weeks/);
  assert.match(corroborated, /4 commits · 1 project/);
  const uncorroborated = render(partial);
  assert.doesNotMatch(uncorroborated, /New to tracked repos · last 13 weeks/);
  assert.match(uncorroborated, /GitHub weekly stats refresh failed/);
});

test("all-agent task registry displays visible notice instead of disappearing", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: { entries: [], contributors: {}, contributorsByRepo: {} },
    registry: {
      leaderboard: [
        {
          github_username: "bot-agent",
          avatar_url: "",
          trust_tier: "agent",
          tasks_completed: 10,
          tasks_failed: 0,
          active: false,
        },
      ],
    },
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Hive Task Leaderboard/);
  assert.match(html, /No human task completions recorded in the registry yet/);
  assert.match(html, /1 autonomous agent worker entries hidden/);
});

test("the standalone page renders the Recent Milestones leaderboard as a ledger of teamwork", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { champion: 100 },
      contributorsByRepo: { common: { champion: 100 } },
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
