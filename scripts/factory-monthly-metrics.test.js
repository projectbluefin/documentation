import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getReportSlug,
  generateReportMarkdown,
} from "./lib/markdown-generator.mjs";
import {
  extractCountmeMetrics,
  extractLeaderboardHeroes,
} from "./lib/factory-monthly-metrics.mjs";

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
