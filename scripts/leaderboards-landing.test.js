const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "components", "HiveFactoryDashboard.tsx"),
  "utf8",
);
const config = fs.readFileSync(
  path.join(__dirname, "..", "docusaurus.config.ts"),
  "utf8",
);
const historyFetcher = fs.readFileSync(
  path.join(__dirname, "..", "scripts", "fetch-hive-history.js"),
  "utf8",
);

function assertBefore(haystack, before, after, message) {
  const beforeIndex = haystack.indexOf(before);
  const afterIndex = haystack.indexOf(after);
  assert.notEqual(beforeIndex, -1, `missing ${before}`);
  assert.notEqual(afterIndex, -1, `missing ${after}`);
  assert.ok(beforeIndex < afterIndex, message);
}

test("leaderboards place standings before the contributor wall", () => {
  const leaderboards = source.slice(
    source.indexOf("export function LeaderboardsSection"),
    source.indexOf("export function CommunitySection"),
  );
  const leaderboard = source.slice(
    source.indexOf("function ContributorLeaderboard"),
  );
  assertBefore(
    leaderboards,
    "<ContributorLeaderboard",
    "<ContributorWall",
    "the active leaderboard must precede player cards",
  );
  assertBefore(
    leaderboard,
    "const newcomers = rows",
    "const ranked",
    "newcomers must be selected before the active leaderboard is filtered",
  );
  assert.ok(
    leaderboard.includes("recentActivity"),
    "newcomers must show their three-month activity",
  );
  assert.ok(
    leaderboard.includes("const activityLabel"),
    "the activity column must match the selected leaderboard window",
  );
  assert.ok(
    leaderboard.includes("ranked.forEach"),
    "ranks must be assigned after the active leaderboard is sorted",
  );
  assert.ok(
    leaderboard.includes('React.useState<LeaderboardTab>("season")'),
    "current GNOME season must be the default leaderboard view",
  );
  assert.ok(
    leaderboard.includes("recentActivity: s?.last3Months ?? 0"),
    "newcomers must expose three-month activity",
  );
  assert.ok(
    leaderboard.includes("s.total === s.last3Months") ||
      leaderboard.includes("s?.total === s?.last3Months"),
    "newcomers must be compared against canonical activity windows",
  );
  assert.ok(
    /activeTab === "season"[\s\S]*?activeTab === "alltime"[\s\S]*?allTimeRepoMap/.test(
      leaderboard,
    ),
    "seasonal and all-time rankings must keep distinct per-repository scopes",
  );

  const hostedHive =
    "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev";
  assert.ok(
    source.includes(hostedHive),
    "dashboard must use the TLS-valid host",
  );
  assert.ok(config.includes(hostedHive), "navbar must use the TLS-valid host");
  assert.ok(
    historyFetcher.includes(hostedHive),
    "history fetches must use the TLS-valid host",
  );
  assert.match(
    config,
    /to: "\/leaderboards",\s+label: "Leaderboards"/,
    "navbar must expose the Leaderboards landing page",
  );
});
