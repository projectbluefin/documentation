import test from "node:test";
import assert from "node:assert/strict";

import { buildQueries, buildOutput, mapItem } from "./fetch-hive-live-data.js";

test("buildQueries produces correct queries including mergedThisWeek from merged PRs", () => {
  const org = "projectbluefin";
  const weekAgo = "2026-09-03";
  const monthAgo = "2026-08-11";
  const queries = buildQueries(org, weekAgo, monthAgo);

  assert.equal(
    queries.mergedThisWeek,
    "org:projectbluefin type:pr is:merged merged:>2026-09-03",
  );
  assert.equal(
    queries.closedIssues,
    "org:projectbluefin type:issue closed:>2026-09-03",
  );
  assert.equal(
    queries.openedIssues,
    "org:projectbluefin type:issue created:>2026-09-03",
  );
  assert.equal(
    queries.agentMerged,
    "org:projectbluefin type:pr is:merged author:kubestellar-hive[bot] merged:>2026-09-03",
  );

  // Guard against regression: mergedThisWeek must query PRs, not issues
  assert.ok(queries.mergedThisWeek.includes("type:pr"));
  assert.ok(queries.mergedThisWeek.includes("is:merged"));
  assert.ok(!queries.mergedThisWeek.includes("type:issue"));
});

test("buildOutput populates orgStats.mergedThisWeek from merged PR data, not closed issues", () => {
  // Reproduce issue #1088 scenario:
  // 113 closed issues vs 313 merged PRs
  const output = buildOutput({
    mergedData: { items: [] },
    discussData: { items: [] },
    hivePRData: { items: [], total_count: 5 },
    copilotPRData: { items: [], total_count: 2 },
    openedData: { total_count: 150 },
    closedData: { total_count: 113 },
    testData: { total_count: 42 },
    promosData: { total_count: 7 },
    agentMergedData: { total_count: 12 },
    orgData: { public_repos: 50 },
    openIssuesData: { total_count: 200 },
    openPRsData: { total_count: 80 },
    agentReadyData: { total_count: 15 },
    mergedThisWeekData: { total_count: 313 },
  });

  // mergedThisWeek must reflect merged PRs (313), not closed issues (113)
  assert.equal(output.orgStats.mergedThisWeek, 313);

  // Velocity closed reflects closed issues (113)
  assert.equal(output.velocity.closed, 113);
  assert.equal(output.velocity.opened, 150);

  // Other org stats
  assert.equal(output.orgStats.totalRepos, 50);
  assert.equal(output.orgStats.openIssues, 200);
  assert.equal(output.orgStats.openPRs, 80);
  assert.equal(output.orgStats.agentReadyIssues, 15);
  assert.equal(output.orgStats.agentOpenPRs, 5);
  assert.equal(output.orgStats.sourceAgentOpen, 2);

  // Counts
  assert.equal(output.testBuilds, 42);
  assert.equal(output.tapPromotions, 7);
  assert.equal(output.agentMergedCount, 12);
});

test("buildOutput defaults missing data safely", () => {
  const output = buildOutput({});

  assert.equal(output.orgStats.mergedThisWeek, 0);
  assert.equal(output.velocity.closed, 0);
  assert.equal(output.velocity.opened, 0);
  assert.equal(output.orgStats.totalRepos, 0);
  assert.equal(output.orgStats.openIssues, 0);
  assert.equal(output.orgStats.openPRs, 0);
  assert.deepEqual(output.mergedPRs, []);
  assert.deepEqual(output.discussions, []);
  assert.deepEqual(output.hivePRs, []);
  assert.deepEqual(output.copilotPRs, []);
});

test("mapItem transforms GitHub issue/PR objects cleanly", () => {
  const item = {
    number: 1088,
    title: "fix(factory): calculate merged-this-week from merged pull requests",
    html_url: "https://github.com/projectbluefin/documentation/pull/1088",
    repository_url: "https://api.github.com/repos/projectbluefin/documentation",
    updated_at: "2026-09-10T12:00:00Z",
    created_at: "2026-09-10T11:00:00Z",
    labels: [{ name: "bug", color: "d73a4a" }],
    comments: 3,
    user: { login: "testuser", avatar_url: "https://example.com/avatar.png" },
    draft: false,
    pull_request: { merged_at: "2026-09-10T12:15:00Z" },
  };

  const mapped = mapItem(item);
  assert.equal(mapped.number, 1088);
  assert.equal(
    mapped.title,
    "fix(factory): calculate merged-this-week from merged pull requests",
  );
  assert.equal(mapped.user?.login, "testuser");
  assert.equal(mapped.draft, false);
  assert.equal(mapped.pull_request?.merged_at, "2026-09-10T12:15:00Z");
  assert.deepEqual(mapped.labels, [{ name: "bug", color: "d73a4a" }]);
});
