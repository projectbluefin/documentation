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

test("leaderboards view foregrounds hosted Hive contribution paths and newcomers", () => {
  const leaderboards = source.slice(
    source.indexOf("export function LeaderboardsSection"),
    source.indexOf("export function CommunitySection"),
  );
  const leaderboard = source.slice(
    source.indexOf("function ContributorLeaderboard"),
  );
  const contributionLinks = source.slice(
    source.indexOf("function ContributionLinks"),
    source.indexOf("function VelocityPanel"),
  );

  assertBefore(
    leaderboards,
    "<ContributionLinks",
    "<HiveTaskLeaderboard",
    "hosted Hive contribution paths must lead the standalone view",
  );
  assertBefore(
    leaderboards,
    "<ContributorLeaderboard",
    "<ContributorWall",
    "the active leaderboard must precede player cards",
  );
  assertBefore(
    leaderboard,
    "New contributors",
    "All Time",
    "new contributors must appear before the all-time leaderboard control",
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
    leaderboard.includes('React.useState<LeaderboardTab>("monthly")'),
    "monthly activity must be the default leaderboard view",
  );
  assert.ok(
    leaderboard.includes("recentActivity: s?.last3Months ?? 0"),
    "newcomers must expose three-month activity",
  );
  assert.ok(
    leaderboard.includes("s?.last3Months === allTimeMap[login]"),
    "newcomers must be compared against canonical all-time contributions",
  );
  assert.ok(
    /const repoMap =\s*\n\s*activeTab === "alltime"/.test(leaderboard),
    "all-time rankings must use the canonical per-repository contribution map",
  );

  for (const route of [
    "/contribute",
    "/contribute/leaderboard",
    "/contribute/operations",
  ]) {
    assert.ok(
      source.includes(`\${HOSTED_INSTANCE_URL}${route}`),
      `missing hosted Hive deep link for ${route}`,
    );
  }
  for (const title of ["Contribute", "Operations", "Leaderboard"]) {
    assert.match(
      contributionLinks,
      new RegExp(
        `<span className=\\{styles\\.contributionLinkTitle\\}>\\s*${title}\\s*<`,
      ),
      `missing ${title} hosted Hive tile`,
    );
  }

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
