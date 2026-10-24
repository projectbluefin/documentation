const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isBot,
  calculateContributorCohorts,
  aggregateMonthlyStreams,
  mergeMonthData,
  getRefetchMonths,
  loadKnownContributors,
  loadReportHistoryBaseline,
} = require("./fetch-contributor-metrics.js");

test("isBot identifies standard bots and kubestellar-hive variations", () => {
  const bots = [
    "dependabot[bot]",
    "dependabot",
    "renovate[bot]",
    "renovate",
    "github-actions[bot]",
    "copilot-swe-agent",
    "kubestellar-hive",
    "kubestellar-hive[bot]",
    "hivecommons-hive",
    "hivecommons-hive[bot]",
    "hivecommons-agent",
    "kubestellar-syncer",
    "mergeraptor",
    "mergeraptor[bot]",
  ];

  for (const b of bots) {
    assert.equal(isBot(b), true, `Expected ${b} to be identified as bot`);
  }

  const humans = [
    "castrojo",
    "hanthor",
    "mendezr",
    "sramkrishna",
    "Danathar",
    "robotnik",
  ];

  for (const h of humans) {
    assert.equal(isBot(h), false, `Expected ${h} to be recognized as human`);
  }
});

test("calculateContributorCohorts splits new vs returning contributors using knownSet", () => {
  const known = new Set(["castrojo", "hanthor"]);
  const actives = ["castrojo", "mendezr", "sramkrishna", "kubestellar-hive"];

  const cohorts = calculateContributorCohorts(actives, known);

  assert.equal(cohorts.returning, 1);
  assert.deepEqual(cohorts.returningLogins, ["castrojo"]);
  assert.equal(cohorts.new, 2);
  assert.deepEqual(cohorts.newLogins.sort(), ["mendezr", "sramkrishna"].sort());
});

test("aggregateMonthlyStreams separates human and automation PRs", () => {
  const items = [
    { author: "castrojo" },
    { author: "mendezr" },
    { author: "dependabot[bot]" },
    { author: "kubestellar-hive" },
    { author: "renovate[bot]" },
  ];

  const result = aggregateMonthlyStreams(items);
  assert.equal(result.humanPrs, 2);
  assert.equal(result.automationPrs, 3);
  assert.equal(result.totalPrs, 5);
  assert.deepEqual(result.humanContributors, ["castrojo", "mendezr"]);
});

test("aggregateMonthlyStreams guards against truncation by returning null", () => {
  const items = [{ author: "castrojo" }];
  const truncatedResult = aggregateMonthlyStreams(items, { truncated: true });

  assert.equal(truncatedResult.humanPrs, null);
  assert.equal(truncatedResult.automationPrs, null);
  assert.equal(truncatedResult.totalPrs, null);
});

test("mergeMonthData preserves existing frozen months and updates in-flight months", () => {
  const existingMonths = [
    {
      month: "2026-07",
      status: "frozen",
      activeContributors: 11,
      streams: { humanPrs: 126, automationPrs: 427 },
    },
    {
      month: "2026-09",
      status: "unmeasured",
      activeContributors: null,
      streams: { humanPrs: null, automationPrs: null },
    },
    {
      month: "2026-10",
      status: "in_flight",
      activeContributors: 5,
      streams: { humanPrs: 10, automationPrs: 15 },
    },
  ];

  // Attempting to overwrite a frozen month without force flag does not mutate it
  const attemptFrozenUpdate = {
    month: "2026-07",
    activeContributors: 999,
  };
  const afterFrozen = mergeMonthData(existingMonths, attemptFrozenUpdate);
  const jul = afterFrozen.find((m) => m.month === "2026-07");
  assert.equal(jul.activeContributors, 11);

  // Updating in_flight month updates its values
  const updateInFlight = {
    month: "2026-10",
    status: "in_flight",
    activeContributors: 8,
    streams: { humanPrs: 20, automationPrs: 25 },
  };
  const afterInFlight = mergeMonthData(afterFrozen, updateInFlight);
  const oct = afterInFlight.find((m) => m.month === "2026-10");
  assert.equal(oct.activeContributors, 8);
  assert.equal(oct.streams.humanPrs, 20);

  // Unmeasured gap month is preserved with null values
  const sep = afterInFlight.find((m) => m.month === "2026-09");
  assert.equal(sep.activeContributors, null);
  assert.equal(sep.streams.humanPrs, null);
});

test("getRefetchMonths produces the current and preceding calendar month", () => {
  const refDate = new Date("2026-10-24T12:00:00Z");
  const [prev, curr] = getRefetchMonths(refDate);

  assert.equal(curr, "2026-10");
  assert.equal(prev, "2026-09");
});

test("loadReportHistoryBaseline extracts 2026-07 and 2026-08 correctly", () => {
  const baseline = loadReportHistoryBaseline();
  assert.ok(baseline.has("2026-07"));
  assert.ok(baseline.has("2026-08"));

  const jul = baseline.get("2026-07");
  assert.equal(jul.streams.humanPrs, 126);
  assert.equal(jul.streams.automationPrs, 427);

  const aug = baseline.get("2026-08");
  assert.equal(aug.streams.humanPrs, 258);
  assert.equal(aug.streams.automationPrs, 283);
});

test("loadKnownContributors operates in read-only mode and falls back cleanly", () => {
  const known = loadKnownContributors();
  assert.ok(known instanceof Set);
  assert.ok(known.size > 0);
  assert.ok(known.has("castrojo"));
});
test("aggregateMonthlyStreams marks counts as null when truncated option is true", () => {
  const items = [{ author: "alice" }, { author: "bob" }];
  const res = aggregateMonthlyStreams(items, { truncated: true });
  assert.equal(res.humanPrs, null);
  assert.equal(res.automationPrs, null);
  assert.equal(res.totalPrs, null);
  assert.deepEqual(res.humanContributors, []);
});
