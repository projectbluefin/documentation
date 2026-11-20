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
  const cssStub = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === "__esModule" ? true : typeof key === "string" ? key : undefined,
    },
  );
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return { __esModule: true, default: cssStub };
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
          default: ({ href, to, children, ...props }) =>
            React.createElement("a", { href: href ?? to, ...props }, children),
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
      if (id.includes("factory/seasonTabs")) {
        const tabsPath = path.join(
          __dirname,
          "..",
          "src",
          "components",
          "factory",
          "seasonTabs.ts",
        );
        const transpiled = ts.transpileModule(
          fs.readFileSync(tabsPath, "utf8"),
          {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.CommonJS,
            },
          },
        );
        const tabsMod = { exports: {} };
        new Function("module", "exports", transpiled.outputText)(
          tabsMod,
          tabsMod.exports,
        );
        return tabsMod.exports;
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

test("the standalone page includes linked newcomer and community operative cards", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: {},
      contributorsByRepo: {},
      hiveContributorTiers: {
        "zulu-player": { tier: "newcomer", tasks: 7 },
        "alpha-player": { tier: "newcomer", tasks: 7 },
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

  assert.match(
    html,
    /New Hive Recruits &amp; Operatives|New Hive Recruits & Operatives/,
  );
  assert.match(html, /zulu-player/);
  assert.doesNotMatch(html, />custom-agent-helper</);
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-common-nmq5\.hive\.hivecommons\.dev\/contribute\/dossier\/zulu-player"/,
  );
  const newcomerCards = html.slice(html.indexOf("New Hive Recruits"));
  assert.ok(
    newcomerCards.indexOf("alpha-player") <
      newcomerCards.indexOf("zulu-player"),
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

test("the standalone page renders the Moments of Triumph leaderboard as a ledger of teamwork", () => {
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
  assert.match(html, /Moments of Triumph/);
  assert.match(html, /ledger of teamwork/i);
  assert.match(html, /href="\/contributing\/"/);
  assert.match(html, /href="\/feeds\/moments-of-triumph\.xml"/);
  assert.match(html, /Subscribe via RSS/);
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
  assert.match(
    html,
    /Season of A Coruña · Week 1/,
    "events must be grouped under horizontal timeline week separators",
  );
  assert.match(
    html,
    /id="community-builders"/,
    "Community Builders section must have an anchor id",
  );
  assert.match(
    html,
    /id="moments-of-triumph"/,
    "Moments of Triumph section must have an anchor id",
  );
  assert.match(
    html,
    /id="factory-community"/,
    "Factory Community section must have an anchor id",
  );
  assert.ok(
    html.indexOf('id="moments-of-triumph"') <
      html.indexOf('id="community-builders"'),
    "the Moments of Triumph stream must lead the /leaderboards page",
  );
});

test("Moments of Triumph keeps season Week 1 events beyond the newest 50", () => {
  const newer = Array.from({ length: 50 }, (_, i) => ({
    id: `task-newer-${i}`,
    login: `newer-${i}`,
    type: "task_landmark",
    value: 10,
    title: "10 tasks shipped",
    detail: "Completed 10 tasks via Hive registry",
    detectedAt: "2026-10-15T12:00:00Z",
    badge: { label: "10 TASKS", color: "var(--fx-cat-2)" },
  }));
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: {},
      contributorsByRepo: {},
      milestones: newer,
      season: {
        version: 51,
        name: "A Coruña",
        start: "2026-09-16T00:00:00.000Z",
        source: "https://release.gnome.org/51/",
        updatedAt: "2026-09-22T00:00:00Z",
        repos: ["common"],
        byLogin: {},
        weekStarts: [],
        weeklyCommits: [],
        totalCommits: 1,
        breadthUnlocks: [
          {
            id: "season-51-seasonfirst-breadth-2",
            login: "seasonfirst",
            type: "project_unlock",
            value: 2,
            repo: "common",
            title: "Reached Contributor Breadth",
            detail:
              "Active across 2 projects in Season of A Coruña (unlocked by common)",
            detectedAt: "2026-09-17T12:00:00Z",
            badge: { label: "CONTRIBUTOR", color: "var(--fx-sev-ok)" },
          },
        ],
      },
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));

  assert.match(
    html,
    /seasonfirst/,
    "the oldest season-week event must not be dropped by a newest-first cap",
  );
  assert.match(html, /Season of A Coruña · Week 1/);
});

test("Moments of Triumph highlights local contributors in gold with local label", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { localhero: 50 },
      contributorsByRepo: { common: { localhero: 50 } },
      hiveContributorTiers: {
        localhero: {
          tier: "trusted",
          tasks: 20,
          local: 1,
          primaryModel: "local",
        },
      },
      milestones: [
        {
          id: "task-localhero-10-2026-09-20",
          login: "localhero",
          type: "task_landmark",
          value: 10,
          title: "10 tasks shipped",
          detail: "Completed 10 tasks via Hive registry",
          detectedAt: "2026-09-20T12:00:00Z",
          badge: {
            label: "10 TASKS",
            color: "var(--fx-cat-2)",
          },
        },
      ],
      season: {
        version: 51,
        name: "A Coruña",
        start: "2026-09-16T00:00:00.000Z",
        source: "https://release.gnome.org/51/",
        updatedAt: "2026-09-22T00:00:00Z",
        repos: ["common"],
        byLogin: {},
        weekStarts: [],
        weeklyCommits: [],
        totalCommits: 1,
        breadthUnlocks: [],
      },
    },
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Local/, "local contributor must display Local model tag");
  assert.match(
    html,
    /triumphPlatinum/,
    "local contributor card must be distinguished in platinum",
  );
});
test("Moments of Triumph shows accumulating status when ledger has no events yet", () => {
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
  assert.match(html, /Moments of Triumph/);
  assert.match(html, /Milestone ledger accumulating/);
});

test("missing milestone data is visible instead of disappearing", () => {
  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: null,
    registry: {},
  });
  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /Milestone data unavailable/);
  assert.match(html, /href="\/feeds\/moments-of-triumph\.xml"/);
});

test("Moments of Triumph renders an explicit error reason when refresh fails", () => {
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
  assert.match(html, /Moments of Triumph/);
  assert.match(html, /Milestones unavailable: Hive leaderboard HTTP 503/);
});

test("season tab strip orders seasons newest-to-oldest with current season selected by default", () => {
  const season9 = {
    id: "gnome-51",
    seasonNumber: 9,
    version: 51,
    name: "A Coruña",
    title: "Season of A Coruña",
    start: "2026-09-16T00:00:00.000Z",
    end: null,
    isCurrent: true,
    source: "https://release.gnome.org/51/",
    repos: ["common"],
    byLogin: { currentdev: { commits: 12, repos: { common: 12 } } },
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: 12,
    breadthUnlocks: [],
  };
  const season8 = {
    id: "gnome-50",
    seasonNumber: 8,
    version: 50,
    name: "Tokyo",
    title: "Season of Tokyo",
    start: "2026-03-18T00:00:00.000Z",
    end: "2026-09-16T00:00:00.000Z",
    isCurrent: false,
    source: "https://release.gnome.org/50/",
    repos: ["common", "ublue-os/bluefin"],
    byLogin: {
      tokyodev: {
        commits: 20,
        repos: { common: 10, "ublue-os/bluefin": 10 },
      },
    },
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: 20,
    breadthUnlocks: [],
  };
  const season1 = {
    id: "gnome-43",
    seasonNumber: 1,
    version: 43,
    name: "Guadalajara",
    title: "Season of Guadalajara",
    start: "2022-09-21T00:00:00.000Z",
    end: "2023-03-22T00:00:00.000Z",
    isCurrent: false,
    source: "https://release.gnome.org/43/",
    repos: ["ublue-os/bluefin"],
    byLogin: { founder: { commits: 5, repos: { "ublue-os/bluefin": 5 } } },
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: 5,
    breadthUnlocks: [],
  };

  const { LeaderboardsSection, ContributorLeaderboard } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { currentdev: 12, tokyodev: 20, founder: 5 },
      contributorsByRepo: { common: { currentdev: 12 } },
      hiveContributorTiers: { currentdev: { tier: "trusted", tasks: 15 } },
      milestones: [],
      season: season9,
      // Pass intentionally unsorted to verify newest-to-oldest ordering
      seasons: [season1, season9, season8],
    },
    registry: {},
  });

  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  assert.match(html, /role="tablist"/);
  const idx9 = html.indexOf("Season 9 · A Coruña");
  const idx8 = html.indexOf("Season 8 · Tokyo");
  const idx1 = html.indexOf("Season 1 · Guadalajara");
  assert.ok(
    idx9 !== -1 && idx8 !== -1 && idx1 !== -1,
    "all season tabs must render",
  );
  assert.ok(
    idx9 < idx8 && idx8 < idx1,
    "tabs must be ordered newest to oldest",
  );
  assert.match(
    html,
    /id="season-tab-gnome-51"[^>]*aria-selected="true"/,
    "current season tab must be selected by default",
  );
  assert.match(
    html,
    /id="season-tab-gnome-50"[^>]*aria-selected="false"/,
    "prior season tabs must not be selected by default",
  );

  // Selecting a historical season renders its leaderboard under its "Season of …" title
  const historicalHtml = renderToStaticMarkup(
    React.createElement(ContributorLeaderboard, {
      history: {
        entries: [],
        contributors: {},
        contributorsByRepo: {},
        hiveContributorTiers: {},
      },
      selectedSeason: season8,
    }),
  );
  assert.match(historicalHtml, /Season of Tokyo/);
  assert.match(historicalHtml, /tokyodev/);
  assert.match(historicalHtml, /ublue-os\/bluefin/);
});

test("unavailable season data degrades gracefully with an explicit reason", () => {
  const unavailableSeason = {
    id: "gnome-49",
    seasonNumber: 7,
    version: 49,
    name: "Brescia",
    title: "Season of Brescia",
    start: "2025-09-17T00:00:00.000Z",
    end: "2026-03-18T00:00:00.000Z",
    isCurrent: false,
    unavailable: true,
    stateReason: "Upstream sources unavailable: ublue-os/bluefin (HTTP 503)",
    source: "https://release.gnome.org/49/",
    repos: [],
    byLogin: {},
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: null,
    breadthUnlocks: [],
  };
  const { ContributorLeaderboard, RecentMilestonesLeaderboard } =
    loadDashboard();

  const lbHtml = renderToStaticMarkup(
    React.createElement(ContributorLeaderboard, {
      history: {
        entries: [],
        contributors: {},
        contributorsByRepo: {},
        hiveContributorTiers: {},
      },
      selectedSeason: unavailableSeason,
    }),
  );
  assert.match(lbHtml, /Season of Brescia/);
  assert.match(lbHtml, /Season leaderboard data unavailable/);
  assert.match(lbHtml, /HTTP 503/);

  const msHtml = renderToStaticMarkup(
    React.createElement(RecentMilestonesLeaderboard, {
      milestones: [],
      breadthUnlocks: [],
      season: unavailableSeason,
    }),
  );
  assert.match(msHtml, /Season data unavailable/);
  assert.match(msHtml, /HTTP 503/);
});

test("a stale isCurrent flag in cached seasons never produces two Current tabs after a GNOME rollover", () => {
  const stalePrevious = {
    id: "gnome-51",
    seasonNumber: 9,
    version: 51,
    name: "A Coruña",
    title: "Season of A Coruña",
    start: "2026-09-16T00:00:00.000Z",
    end: null,
    isCurrent: true, // stale flag from before GNOME 52 landed
    source: "https://release.gnome.org/51/",
    repos: ["common"],
    byLogin: { dev: { commits: 5, repos: { common: 5 } } },
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: 5,
    breadthUnlocks: [],
  };
  const freshCurrent = {
    id: "gnome-52",
    version: 52,
    name: "Example",
    start: "2027-03-17T00:00:00.000Z",
    source: "https://release.gnome.org/52/",
    repos: ["common"],
    byLogin: {},
    weekStarts: [],
    weeklyCommits: [],
    totalCommits: 0,
    breadthUnlocks: [],
  };

  const { LeaderboardsSection } = loadDashboard({
    hiveHistory: {
      entries: [],
      contributors: { dev: 5 },
      contributorsByRepo: { common: { dev: 5 } },
      hiveContributorTiers: { dev: { tier: "trusted", tasks: 5 } },
      milestones: [],
      season: freshCurrent,
      seasons: [stalePrevious],
    },
    registry: {},
  });

  const html = renderToStaticMarkup(React.createElement(LeaderboardsSection));
  const currentBadges = html.match(/seasonCurrentBadge/g) || [];
  assert.equal(
    currentBadges.length,
    1,
    "only the authoritative history.season tab may carry the Current badge",
  );
  assert.match(
    html,
    /id="season-tab-gnome-52"[^>]*aria-selected="true"/,
    "new GNOME 52 season must be selected by default",
  );
  assert.match(
    html,
    /id="season-tab-gnome-51"[^>]*aria-selected="false"/,
    "stale GNOME 51 season must not be selected",
  );
});
