const test = require("node:test");
const assert = require("node:assert/strict");

const {
  accumulateRepoStats,
  computeStatsWindows,
  createStatsAccumulator,
  extractMetrics,
  finalizeContributorStats,
  MAX_WEEKS,
  registryHeaders,
  trackedProjectRepos,
} = require("./fetch-hive-history.js");

const WEEK = 7 * 86400;
// Fixed "now" so the window maths is deterministic: a Sunday 00:00 UTC.
const NOW_MS = Date.UTC(2026, 0, 4); // 2026-01-04
const NOW_SEC = Math.floor(NOW_MS / 1000);

/** Build a weeks[] array ending at the current week, oldest-first. */
function weeksEndingNow(commits) {
  const start = NOW_SEC - (commits.length - 1) * WEEK;
  return commits.map((c, i) => ({ w: start + i * WEEK, c, a: c * 10, d: c }));
}

function entry(login, weeks) {
  return {
    author: { login },
    total: weeks.reduce((s, w) => s + w.c, 0),
    weeks,
  };
}

test("weekly buckets are summed across repos by matching timestamp", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  accumulateRepoStats(
    acc,
    "bluefin",
    [entry("castrojo", weeksEndingNow([1, 2, 3]))],
    windows,
  );
  accumulateRepoStats(
    acc,
    "common",
    [entry("castrojo", weeksEndingNow([10, 0, 5]))],
    windows,
  );

  const { stats, weekStarts } = finalizeContributorStats(acc);

  assert.equal(weekStarts.length, 3);
  assert.deepEqual(stats.castrojo.weeks, [11, 2, 8]);
  assert.equal(stats.castrojo.weeks.length, weekStarts.length);
  assert.equal(stats.castrojo.total, 6 + 15);
  assert.deepEqual(stats.castrojo.byRepo, { bluefin: 6, common: 15 });
});

test("week starts are oldest-first and align index-for-index with weeks[]", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  const weeks = weeksEndingNow([4, 0, 9]);
  accumulateRepoStats(acc, "bluefin", [entry("tulip", weeks)], windows);

  const { stats, weekStarts } = finalizeContributorStats(acc);

  assert.deepEqual(
    weekStarts,
    weeks.map((w) => w.w),
  );
  assert.ok(weekStarts[0] < weekStarts[weekStarts.length - 1]);
  weekStarts.forEach((ts, i) => {
    const bucket = weeks.find((w) => w.w === ts);
    assert.equal(stats.tulip.weeks[i], bucket.c);
  });
});

test("a contributor present in only one repo still gets a full aligned series", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  accumulateRepoStats(
    acc,
    "bluefin",
    [entry("castrojo", weeksEndingNow([1, 1, 1]))],
    windows,
  );
  // Different repo, different contributor, wider week grid.
  accumulateRepoStats(
    acc,
    "dakota",
    [entry("solo", weeksEndingNow([0, 0, 2, 3]))],
    windows,
  );

  const { stats, weekStarts } = finalizeContributorStats(acc);

  assert.equal(weekStarts.length, 4);
  // castrojo has no data for the oldest week — zero-padded, not shifted.
  assert.deepEqual(stats.castrojo.weeks, [0, 1, 1, 1]);
  assert.deepEqual(stats.solo.weeks, [0, 0, 2, 3]);
});

test("missing, empty or malformed weeks[] degrades to an empty array", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  accumulateRepoStats(
    acc,
    "bluefin",
    [
      { author: { login: "noweeks" }, total: 5 },
      { author: { login: "emptyweeks" }, total: 5, weeks: [] },
      { author: { login: "junkweeks" }, total: 5, weeks: [{}, { w: null }] },
      { author: null, total: 5, weeks: weeksEndingNow([1]) },
      entry("real", weeksEndingNow([1, 2])),
    ],
    windows,
  );

  const { stats } = finalizeContributorStats(acc);

  assert.deepEqual(stats.noweeks.weeks, []);
  assert.deepEqual(stats.emptyweeks.weeks, []);
  assert.deepEqual(stats.junkweeks.weeks, []);
  assert.equal(stats.noweeks.lastWeek, 0);
  assert.deepEqual(stats.real.weeks, [1, 2]);
});

test("non-array repo payloads are ignored instead of throwing", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  for (const payload of [null, undefined, {}, "202", { message: "nope" }]) {
    assert.doesNotThrow(() =>
      accumulateRepoStats(acc, "bluefin", payload, windows),
    );
  }
  const { stats, weekStarts } = finalizeContributorStats(acc);
  assert.deepEqual(stats, {});
  assert.deepEqual(weekStarts, []);
});

test("bots and zero-total entries are excluded", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  accumulateRepoStats(
    acc,
    "bluefin",
    [
      entry("renovate[bot]", weeksEndingNow([9])),
      entry("mergeraptor", weeksEndingNow([9])),
      { author: { login: "silent" }, total: 0, weeks: weeksEndingNow([0]) },
      entry("human", weeksEndingNow([9])),
    ],
    windows,
  );

  const { stats } = finalizeContributorStats(acc);
  assert.deepEqual(Object.keys(stats), ["human"]);
});

test("lastWeek/lastMonth/last3Months windows are unchanged by the refactor", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  // 20 weeks, one commit each, ending at the current week.
  const weeks = weeksEndingNow(new Array(20).fill(1));
  accumulateRepoStats(acc, "bluefin", [entry("castrojo", weeks)], windows);

  // Reference implementation: the original inline summation.
  const nowSec = Math.floor(NOW_MS / 1000);
  const expected = { lastWeek: 0, lastMonth: 0, last3Months: 0 };
  for (const w of weeks) {
    if (w.c === 0) continue;
    if (w.w >= nowSec - 7 * 86400) expected.lastWeek += w.c;
    if (w.w >= nowSec - 28 * 86400) expected.lastMonth += w.c;
    if (w.w >= nowSec - 91 * 86400) expected.last3Months += w.c;
  }

  const { stats } = finalizeContributorStats(acc);
  assert.equal(stats.castrojo.lastWeek, expected.lastWeek);
  assert.equal(stats.castrojo.lastMonth, expected.lastMonth);
  assert.equal(stats.castrojo.last3Months, expected.last3Months);
  assert.equal(stats.castrojo.total, 20);
});

test("series and grid are capped at 52 weeks, keeping the most recent", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  const commits = Array.from({ length: 60 }, (_, i) => i + 1);
  accumulateRepoStats(
    acc,
    "bluefin",
    [entry("castrojo", weeksEndingNow(commits))],
    windows,
  );

  const { stats, weekStarts } = finalizeContributorStats(acc);

  assert.equal(weekStarts.length, MAX_WEEKS);
  assert.equal(stats.castrojo.weeks.length, MAX_WEEKS);
  assert.deepEqual(stats.castrojo.weeks, commits.slice(-MAX_WEEKS));
});

test("only the top N contributors by windowed commits keep a weekly series", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  const payload = Array.from({ length: 5 }, (_, i) =>
    entry(`user${i}`, weeksEndingNow([i + 1, i + 1])),
  );
  accumulateRepoStats(acc, "bluefin", payload, windows);

  const { stats } = finalizeContributorStats(acc, { maxSeries: 2 });

  // user4 and user3 have the highest totals.
  assert.deepEqual(stats.user4.weeks, [5, 5]);
  assert.deepEqual(stats.user3.weeks, [4, 4]);
  assert.deepEqual(stats.user2.weeks, []);
  assert.deepEqual(stats.user0.weeks, []);
  // Aggregates survive the cap.
  assert.equal(stats.user0.total, 2);
});

test("every contributor always has a weeks array", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  accumulateRepoStats(
    acc,
    "bluefin",
    [entry("a", weeksEndingNow([1])), { author: { login: "b" }, total: 3 }],
    windows,
  );

  const { stats } = finalizeContributorStats(acc);
  for (const s of Object.values(stats)) {
    assert.ok(Array.isArray(s.weeks));
  }
});

test("the cap prefers recent activity over all-time totals", () => {
  const windows = computeStatsWindows(NOW_MS);
  const acc = createStatsAccumulator();
  // A 60-week grid: only the newest 52 weeks survive.
  const veteranWeeks = weeksEndingNow(
    new Array(60).fill(0).map((_, i) => (i < 8 ? 100 : 0)),
  );
  accumulateRepoStats(
    acc,
    "bluefin",
    [
      { author: { login: "veteran" }, total: 800, weeks: veteranWeeks },
      entry("newcomer", weeksEndingNow([1, 1])),
    ],
    windows,
  );

  const { stats } = finalizeContributorStats(acc, { maxSeries: 1 });

  assert.equal(stats.veteran.total, 800);
  // veteran's commits all predate the 52-week grid, so it has nothing to plot.
  assert.deepEqual(stats.veteran.weeks, []);
  assert.equal(stats.newcomer.weeks.length, MAX_WEEKS);
  assert.equal(
    stats.newcomer.weeks.reduce((s, n) => s + n, 0),
    2,
  );
});

test("computeStatsWindows returns ordered unix-second cut-offs", () => {
  const { weekAgo, monthAgo, threeMonthsAgo } = computeStatsWindows(NOW_MS);
  assert.equal(weekAgo, NOW_SEC - 7 * 86400);
  assert.equal(monthAgo, NOW_SEC - 28 * 86400);
  assert.equal(threeMonthsAgo, NOW_SEC - 91 * 86400);
  assert.ok(threeMonthsAgo < monthAgo && monthAgo < weekAgo);
});

test("tracked Project Bluefin repositories come from the Hive registry", () => {
  assert.deepEqual(
    trackedProjectRepos({
      hives: [
        { org: "other", repos: ["ignored"] },
        {
          org: "projectbluefin",
          repos: ["common", "server", "fsdk-containers"],
        },
      ],
    }),
    ["common", "server", "fsdk-containers"],
  );
});

test("Hive registry requests never include GitHub authorization", () => {
  assert.deepEqual(registryHeaders(), {
    "User-Agent": "bluefin-hive-history/1.0",
  });
});

// extractMetrics is the sole reader of the live hive payload. Every field it
// emits is a history data point, and a wrong-but-plausible value here is not a
// crash — it is a wrong chart. These tests pin the fallbacks and the coercion.

test("extractMetrics returns null for a missing payload", () => {
  assert.equal(extractMetrics(null), null);
  assert.equal(extractMetrics(undefined), null);
});

test("extractMetrics reads a fully populated payload", () => {
  const metrics = extractMetrics({
    acmmLevel: 3,
    governor: {
      mode: "conservative",
      budgetPct: 42,
      queue: 7,
      budget: { totalTokens: 1000, used: 420 },
    },
    agents: [{ paused: false }, { paused: true }, {}],
    advisoryItems: [{}, {}],
    mergeActivity: { today: 4, week: 19 },
    issueToMerge: { median_minutes: 88, avg_minutes: 120 },
  });

  assert.deepEqual(metrics, {
    acmmLevel: 3,
    govMode: "conservative",
    budgetPct: 42,
    budgetTotal: 1000,
    budgetUsed: 420,
    queue: 7,
    agents: 3,
    // An agent with no `paused` key counts as running, not as unknown.
    runningAgents: 2,
    advisories: 2,
    mergedToday: 4,
    mergedWeek: 19,
    // median wins over avg when both are present.
    medianMergeMins: 88,
  });
});

test("extractMetrics yields undefined fields, never zeros, for an empty payload", () => {
  const metrics = extractMetrics({});

  // Counts are real lengths of absent collections, so 0 is correct for them.
  assert.equal(metrics.agents, 0);
  assert.equal(metrics.runningAgents, 0);
  assert.equal(metrics.advisories, 0);

  // Everything else must stay undefined so the chart plots a gap rather than
  // a fabricated zero reading.
  for (const key of [
    "acmmLevel",
    "govMode",
    "budgetPct",
    "budgetTotal",
    "budgetUsed",
    "queue",
    "mergedToday",
    "mergedWeek",
    "medianMergeMins",
  ]) {
    assert.equal(metrics[key], undefined, `${key} should be undefined`);
  }
});

test("extractMetrics falls back to the legacy top-level tokenBudget", () => {
  const metrics = extractMetrics({
    tokenBudget: { total: 900, used: 300 },
    budgetPct: 33,
  });

  // governor.budget is absent, so the older tokenBudget shape supplies these,
  // and `total` is accepted where `totalTokens` is missing.
  assert.equal(metrics.budgetTotal, 900);
  assert.equal(metrics.budgetUsed, 300);
  assert.equal(metrics.budgetPct, 33);
});

test("extractMetrics prefers governor.budgetPct over the top-level one", () => {
  const metrics = extractMetrics({
    governor: { budgetPct: 10 },
    budgetPct: 99,
  });
  assert.equal(metrics.budgetPct, 10);
});

test("extractMetrics treats governor.issues as the queue when queue is absent", () => {
  assert.equal(extractMetrics({ governor: { issues: 12 } }).queue, 12);
  // An explicit queue wins over issues.
  assert.equal(extractMetrics({ governor: { queue: 3, issues: 12 } }).queue, 3);
});

test("extractMetrics falls back to avg_minutes when there is no median", () => {
  assert.equal(
    extractMetrics({ issueToMerge: { avg_minutes: 150 } }).medianMergeMins,
    150,
  );
});

test("extractMetrics rejects non-finite and non-numeric readings", () => {
  const metrics = extractMetrics({
    acmmLevel: Infinity,
    governor: {
      mode: 7,
      budgetPct: NaN,
      queue: "12",
      budget: { totalTokens: -Infinity, used: null },
    },
    mergeActivity: { today: "4", week: undefined },
  });

  // A numeric string is not a number: coercing "12" would let a string leak
  // into a chart series that is summed elsewhere.
  assert.equal(metrics.queue, undefined);
  assert.equal(metrics.mergedToday, undefined);
  assert.equal(metrics.acmmLevel, undefined);
  assert.equal(metrics.budgetPct, undefined);
  assert.equal(metrics.budgetTotal, undefined);
  assert.equal(metrics.budgetUsed, undefined);
  assert.equal(metrics.mergedWeek, undefined);
  // mode must be a string or nothing.
  assert.equal(metrics.govMode, undefined);
});

test("extractMetrics survives wrong-typed containers without throwing", () => {
  const metrics = extractMetrics({
    governor: "down",
    agents: "many",
    advisoryItems: null,
    mergeActivity: 42,
    issueToMerge: "unknown",
  });

  assert.equal(metrics.agents, 0);
  assert.equal(metrics.runningAgents, 0);
  assert.equal(metrics.advisories, 0);
  assert.equal(metrics.queue, undefined);
  assert.equal(metrics.mergedToday, undefined);
  assert.equal(metrics.medianMergeMins, undefined);
});
