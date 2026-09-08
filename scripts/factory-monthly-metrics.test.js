import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getReportSlug,
  generateReportMarkdown,
} from "./lib/markdown-generator.mjs";
import {
  extractCountmeMetrics,
  extractLeaderboardHeroes,
  FACTORY_LANES,
  fetchFactoryMonthlyStats,
  extractCountmeMetricsFromPayload,
} from "./lib/factory-monthly-metrics.mjs";
import { REPORT_PORTFOLIO } from "./lib/report-portfolio.mjs";

function apiRun(overrides = {}) {
  return {
    path: ".github/workflows/build-image-testing.yml",
    event: "push",
    status: "completed",
    conclusion: "success",
    run_started_at: "2026-10-10T10:00:00Z",
    created_at: "2026-10-10T10:00:00Z",
    updated_at: "2026-10-10T10:10:00Z",
    ...overrides,
  };
}

test("getReportSlug generates dinosaur slug correctly", () => {
  const augDate = new Date("2026-08-01T00:00:00Z");
  const slug = getReportSlug(augDate);
  assert.equal(slug, "archaeopteryx-august-2026");

  const janDate = new Date("2026-01-01T00:00:00Z");
  assert.equal(getReportSlug(janDate), "jurassic-january-2026");
});

test("extractLeaderboardHeroes ranks contributors and assigns badges", () => {
  const items = [
    {
      type: "PullRequest",
      repository: "projectbluefin/common",
      author: "castrojo",
    },
    {
      type: "PullRequest",
      repository: "projectbluefin/bluefin",
      author: "castrojo",
    },
    {
      type: "PullRequest",
      repository: "projectbluefin/dakota",
      author: "hanthor",
    },
  ];
  const newContributors = ["hanthor"];

  const { heroes, newLights } = extractLeaderboardHeroes(
    items,
    newContributors,
  );
  assert.equal(heroes.length, 2);
  assert.equal(heroes[0].login, "castrojo");
  assert.equal(heroes[0].rank, 1);
  assert.equal(heroes[0].contributions, 2);
  assert.equal(heroes[0].projects, 2);
  assert.equal(heroes[0].badge?.label, "Top Hero");

  assert.equal(heroes[1].login, "hanthor");
  assert.equal(heroes[1].rank, 2);
  assert.equal(heroes[1].contributions, 1);
  assert.equal(heroes[1].isNew, true);
  assert.equal(heroes[1].badge?.label, "New Light");

  assert.equal(newLights.length, 1);
  assert.equal(newLights[0].login, "hanthor");
});

test("generateReportMarkdown includes ReportHeroKPIs, ReportLeaderboard, and frontmatter", () => {
  const startDate = new Date("2026-08-01T00:00:00Z");
  const endDate = new Date("2026-08-31T23:59:59Z");

  const plannedItems = [
    {
      type: "PullRequest",
      number: 1,
      title: "Planned item",
      url: "https://github.com/projectbluefin/common/pull/1",
      repository: "projectbluefin/common",
      labels: [{ name: "area/gnome" }],
      author: "castrojo",
    },
  ];

  const opportunisticItems = [
    {
      type: "PullRequest",
      number: 2,
      title: "Opportunistic item",
      url: "https://github.com/projectbluefin/bluefin/pull/2",
      repository: "projectbluefin/bluefin",
      labels: [{ name: "area/dx" }],
      author: "hanthor",
    },
  ];

  const contributors = ["castrojo", "hanthor"];
  const newContributors = ["hanthor"];
  const botActivity = [
    {
      repo: "projectbluefin/bluefin",
      bot: "mergeraptor",
      count: 5,
      items: [],
    },
  ];

  const factoryStats = {
    lanes: [
      {
        id: "bluefin-testing",
        label: "Bluefin Testing",
        repo: "projectbluefin/bluefin",
        total: 10,
        passed: 9,
        failed: 1,
        successRate: 90,
        medianDurationMin: 45,
        sparklineData: [5, 4],
      },
    ],
    totals: {
      totalRuns: 10,
      passed: 9,
      failed: 1,
      successRate: 90,
    },
  };

  const countmeStats = {
    currentTotal: 3228,
    previousTotal: 3100,
    historyPoints: [3100, 3150, 3228],
    variants: [{ name: "Bluefin", count: 3165 }],
    sourceDate: "2026-08-08",
  };

  const md = generateReportMarkdown(
    plannedItems,
    opportunisticItems,
    contributors,
    newContributors,
    botActivity,
    startDate,
    endDate,
    null,
    { production: [], experimental: [] },
    factoryStats,
    countmeStats,
  );

  assert.match(md, /slug: archaeopteryx-august-2026/);
  assert.match(md, /authors: \[bluefin\]/);
  assert.match(md, /<ReportHeroKPIs/);
  assert.match(md, /<ReportLeaderboard/);
  assert.match(md, /<ReportLaneHealth/);
  assert.match(md, /<ReportCountmeTrend/);
  assert.match(md, /<ReportAutomationStats/);
});

test("extractCountmeMetrics returns null or data without throwing", () => {
  const startDate = new Date("2026-08-01T00:00:00Z");
  const endDate = new Date("2026-08-31T23:59:59Z");
  const metrics = extractCountmeMetrics(startDate, endDate);
  if (metrics !== null) {
    assert.ok(typeof metrics.currentTotal === "number");
    assert.ok(Array.isArray(metrics.historyPoints));
  }
});

test("extractCountmeMetricsFromPayload preserves Countme gaps as null", () => {
  const metrics = extractCountmeMetricsFromPayload(
    {
      unavailable: false,
      weeks: [
        { week: "2026-10-05", bluefin: 10, "bluefin-lts": 5 },
        { week: "2026-10-12", bluefin: null, "bluefin-lts": 6 },
        { week: "2026-10-19", bluefin: 12, "bluefin-lts": 7 },
      ],
    },
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-31T23:59:59Z"),
  );

  assert.equal(metrics.currentTotal, 19);
  assert.equal(metrics.previousTotal, 15);
  assert.deepEqual(metrics.historyPoints, [15, null, 19]);
  assert.deepEqual(
    metrics.variants.map((variant) => variant.count),
    [12, 7, null],
  );
});

test("extractCountmeMetricsFromPayload returns null for an unavailable payload", () => {
  assert.equal(
    extractCountmeMetricsFromPayload(
      {
        unavailable: true,
        stateReason: "Countme request failed",
        weeks: [{ week: "2026-10-05", bluefin: 10, "bluefin-lts": 5 }],
      },
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-31T23:59:59Z"),
    ),
    null,
  );
});

test("FACTORY_LANES contains only portfolio entries configured for lanes", () => {
  assert.deepEqual(
    FACTORY_LANES.map((lane) => lane.repo),
    REPORT_PORTFOLIO.filter((entry) => entry.signals.includes("lanes")).map(
      (entry) => entry.repository,
    ),
  );
});

test("a failed configured lane remains visible with null measurements", async () => {
  const failedRepository = FACTORY_LANES[1].repo;
  const result = await fetchFactoryMonthlyStats(
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-31T23:59:59Z"),
    async (url) => {
      if (url.includes(failedRepository)) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        async json() {
          return { workflow_runs: [] };
        },
      };
    },
  );

  assert.deepEqual(
    result.lanes.map((lane) => lane.repo),
    FACTORY_LANES.map((lane) => lane.repo),
  );
  const failedLane = result.lanes.find(
    (lane) => lane.repo === failedRepository,
  );
  assert.equal(failedLane.total, null);
  assert.equal(failedLane.passed, null);
  assert.equal(failedLane.failed, null);
  assert.equal(failedLane.pending, null);
  assert.equal(failedLane.successRate, null);
  assert.equal(failedLane.medianDurationMin, null);
  assert.match(failedLane.unavailableReason, /503/);
});

test("in-flight publishing runs are pending and never failed", async () => {
  const runs = [
    apiRun(),
    apiRun({
      conclusion: "failure",
      updated_at: "2026-10-10T10:20:00Z",
    }),
    apiRun({
      status: "in_progress",
      conclusion: null,
      updated_at: undefined,
    }),
  ];
  const result = await fetchFactoryMonthlyStats(
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-31T23:59:59Z"),
    async () => ({
      ok: true,
      async json() {
        return { workflow_runs: runs };
      },
    }),
  );

  const lane = result.lanes[0];
  assert.equal(lane.total, 3);
  assert.equal(lane.passed, 1);
  assert.equal(lane.failed, 1);
  assert.equal(lane.pending, 1);
  assert.equal(lane.successRate, 50);
  assert.equal(lane.medianDurationMin, 15);
});

test("publishing lanes expose a date-based delivery trend", async () => {
  const result = await fetchFactoryMonthlyStats(
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-03T23:59:59Z"),
    async () => ({
      ok: true,
      async json() {
        return {
          workflow_runs: [
            apiRun({ run_started_at: "2026-10-01T10:00:00Z" }),
            apiRun({ run_started_at: "2026-10-03T10:00:00Z" }),
          ],
        };
      },
    }),
  );

  assert.deepEqual(result.lanes[0].trend, {
    labels: ["2026-10-01", "2026-10-02", "2026-10-03"],
    values: [1, 0, 1],
  });
});
