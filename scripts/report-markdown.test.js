const test = require("node:test");
const assert = require("node:assert/strict");

const generator = import("./lib/markdown-generator.mjs");
const reportGenerator = import("./generate-report.mjs");

function chart(id, kind = "line") {
  return {
    id,
    kind,
    title: id,
    currentValue: "12",
    unit: "items",
    sourceLabel: "GitHub",
    sourceUrl: "https://github.com/projectbluefin",
    sourceWindow: "October 2026 UTC",
    labels: ["2026-10-01", "2026-10-02"],
    series: [{ id: `${id}-series`, label: id, values: [null, 12] }],
    minimumPoints: 1,
  };
}

const fixtureSnapshot = {
  schemaVersion: 2,
  period: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
  sources: [
    {
      id: "github",
      status: "available",
      stateReason: null,
      url: "https://github.com/projectbluefin",
      window: { start: "2026-10-01", end: "2026-10-31" },
    },
  ],
  activity: {
    calendar: chart("calendar", "calendar"),
    repositories: chart("repositories", "grouped-bar"),
    categories: chart("categories", "grouped-bar"),
    portfolio: {
      stable: ["projectbluefin/bluefin"],
      experimental: ["projectbluefin/utah"],
    },
  },
  delivery: {
    lanes: [],
    cadence: chart("cadence"),
    releases: chart("releases"),
  },
  participation: {
    automation: chart("automation", "stacked-bar"),
    leaderboard: {
      title: "Current contributors",
      subtitle: "Fixture",
      period: "October 2026",
      heroes: [],
      newLights: [],
    },
  },
  ecosystem: {
    countme: chart("countme"),
    homebrew: chart("homebrew"),
    flathub: chart("flathub"),
  },
  history: [],
};

const reportSectionsFixture = `
import {
  ReportActivity,
  ReportDelivery,
  ReportParticipation,
  ReportEcosystem,
} from '@site/src/components/reports';

<ReportActivity snapshot={snapshot.activity} />
<ReportDelivery snapshot={snapshot.delivery} />
<ReportParticipation snapshot={snapshot.participation} />
<ReportEcosystem snapshot={snapshot.ecosystem} />
`;

test("the report MDX embeds one immutable version-two snapshot", async () => {
  const { generateReportMarkdown } = await generator;
  const markdown = generateReportMarkdown({
    snapshot: fixtureSnapshot,
    plannedItems: [],
    opportunisticItems: [],
    contributors: ["alice"],
    newContributors: [],
  });

  assert.match(markdown, /tags: \[monthly-report/);
  assert.match(markdown, /export const snapshot = \{/);
  assert.match(markdown, /schemaVersion/);
  assert.match(markdown, /ReportDelivery/);
  assert.match(markdown, /\/changelogs/);
  assert.doesNotMatch(markdown, /fetch\(/);
  assert.match(
    markdown,
    /import \{[\s\S]*ReportHeroKPIs[\s\S]*\} from '@site\/src\/components\/reports';/,
  );
  assert.match(markdown, /<ReportHeroKPIs[\s\S]*kpis=\{/);
});

test("the Reports 2.0 markdown fixture keeps section imports and tags", () => {
  assert.match(
    reportSectionsFixture,
    /import \{[\s\S]*ReportActivity[\s\S]*ReportDelivery[\s\S]*ReportParticipation[\s\S]*ReportEcosystem[\s\S]*\} from '@site\/src\/components\/reports';/,
  );
  for (const section of [
    "ReportActivity",
    "ReportDelivery",
    "ReportParticipation",
    "ReportEcosystem",
  ]) {
    assert.match(
      reportSectionsFixture,
      new RegExp(`<${section} snapshot=\\{snapshot\\.[a-z]+\\} \\/>`),
    );
  }
});

test("the production chart-tag serializer retains provenance and table data", async () => {
  const { generateReportChartTag } = await generator;
  const markdown = generateReportChartTag(fixtureSnapshot.activity.calendar);

  assert.match(markdown, /<ReportChart/);
  assert.match(markdown, /sourceWindow/);
  assert.match(markdown, /October 2026 UTC/);
  assert.match(markdown, /2026-10-01/);
  assert.match(markdown, /"values":\[null,12\]/);
});

test("the report generator assembles source states into a version-two snapshot", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00Z"),
    endDate: new Date("2026-10-31T23:59:59Z"),
    plannedPRs: [
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [{ name: "area/dx" }],
      },
    ],
    opportunisticPRs: [],
    plannedPartial: false,
    plannedError: null,
    opportunisticPartial: false,
    truncationWarnings: { planned: [], opportunistic: [] },
    factoryStats: {
      lanes: [{ id: "bluefin", label: "Bluefin", total: 1 }],
      totals: { totalRuns: 1, passed: 1, failed: 0 },
    },
    factoryError: null,
    releaseResult: {
      events: [
        {
          publishedAt: "2026-10-03T12:00:00Z",
          url: "https://github.com/projectbluefin/bluefin/releases/1",
        },
      ],
      sources: [
        {
          id: "github-releases",
          status: "available",
          stateReason: null,
          url: "https://api.github.com/repos/projectbluefin/bluefin/releases",
          window: { start: "2026-10-01", end: "2026-10-31" },
        },
      ],
    },
    releaseError: null,
    countmeStats: {
      currentTotal: 12,
      historyPoints: [10, 12],
      sourceDate: "2026-10-26",
    },
    countmeError: null,
    tapAdditions: { production: [], experimental: [] },
    tapError: null,
    botActivity: [],
    leaderboard: { heroes: [], newLights: [] },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.equal(snapshot.schemaVersion, 2);
  assert.equal(snapshot.activity.calendar.currentValue, "1");
  assert.equal(snapshot.delivery.releases.currentValue, "1");
  assert.equal(snapshot.ecosystem.countme.currentValue, "12");
  assert.ok(snapshot.sources.some((source) => source.id === "flathub"));
});

test("report periods use UTC calendar dates regardless of local timezone", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const previousTimezone = process.env.TZ;
  process.env.TZ = "Pacific/Kiritimati";

  try {
    const snapshot = buildReportSnapshotPayload({
      startDate: new Date("2026-10-01T00:00:00.000Z"),
      endDate: new Date("2026-10-31T23:59:59.999Z"),
      history: { schemaVersion: 2, snapshots: [] },
    });

    assert.deepEqual(snapshot.period, {
      month: "2026-10",
      start: "2026-10-01",
      end: "2026-10-31",
    });
    assert.equal(snapshot.sources[0].window.end, "2026-10-31");
  } finally {
    if (previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimezone;
    }
  }
});

test("unavailable activity does not serialize measured zeros", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-03T23:59:59.999Z"),
    plannedPRs: [
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [],
      },
    ],
    plannedPartial: true,
    plannedError: "GitHub activity request failed",
    truncationWarnings: { planned: [], opportunistic: [] },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.equal(
    snapshot.sources.find((source) => source.id === "github-activity").status,
    "unavailable",
  );
  assert.equal(snapshot.activity.calendar, null);
  assert.equal(snapshot.activity.repositories, null);
  assert.equal(snapshot.activity.categories, null);
  assert.match(snapshot.activity.unavailableReason, /request failed/);
});

test("participation totals separate human and bot pull requests", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T23:59:59.999Z"),
    plannedPRs: [
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [],
      },
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-03T12:00:00Z",
        labels: [],
      },
    ],
    botActivity: [{ repo: "projectbluefin/common", bot: "renovate", count: 1 }],
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.deepEqual(
    snapshot.participation.automation.series.map((series) => ({
      id: series.id,
      values: series.values,
    })),
    [
      { id: "human", values: [1] },
      { id: "automation", values: [1] },
    ],
  );
  assert.equal(snapshot.participation.automation.currentValue, "2");
});

test("partial GitHub activity makes participation unavailable", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T23:59:59.999Z"),
    plannedPRs: [
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [],
      },
    ],
    plannedPartial: true,
    plannedError: "GitHub activity request failed",
    botActivity: [{ repo: "projectbluefin/common", bot: "renovate", count: 1 }],
    leaderboard: { heroes: [], newLights: [] },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.equal(snapshot.participation.automation, null);
  assert.equal(snapshot.participation.leaderboard, null);
  assert.match(snapshot.participation.unavailableReason, /request failed/);
});

test("delivery cadence charts a date-based trend for each lane", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-03T23:59:59.999Z"),
    factoryStats: {
      lanes: [
        {
          id: "bluefin-testing",
          label: "Bluefin Testing",
          repo: "projectbluefin/bluefin",
          total: 2,
          unavailableReason: null,
          trend: {
            labels: ["2026-10-01", "2026-10-02", "2026-10-03"],
            values: [1, 0, 1],
          },
        },
        {
          id: "dakota",
          label: "Dakota",
          repo: "projectbluefin/dakota",
          total: 1,
          unavailableReason: null,
          trend: {
            labels: ["2026-10-01", "2026-10-02", "2026-10-03"],
            values: [0, 1, 0],
          },
        },
      ],
    },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.deepEqual(snapshot.delivery.cadence.labels, [
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
  ]);
  assert.deepEqual(
    snapshot.delivery.cadence.series.map((series) => ({
      id: series.id,
      values: series.values,
    })),
    [
      { id: "bluefin-testing", values: [1, 0, 1] },
      { id: "dakota", values: [0, 1, 0] },
    ],
  );
});

test("snapshot activity ignores external ublue repositories", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T23:59:59.999Z"),
    plannedPRs: [
      {
        repository: "projectbluefin/common",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [],
      },
    ],
    opportunisticPRs: [
      {
        repository: "ublue-os/artwork",
        mergedAt: "2026-10-03T12:00:00Z",
        labels: [],
      },
    ],
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.deepEqual(snapshot.activity.repositories.labels, [
    "projectbluefin/common",
  ]);
  assert.equal(snapshot.participation.automation.currentValue, "1");
});

test("snapshot embeds the Flathub calendar-month trend", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-03T23:59:59.999Z"),
    flathubStats: {
      unavailable: false,
      downloadsPerDay: [
        { date: "2026-10-01", downloads: 100 },
        { date: "2026-10-02", downloads: 200 },
        { date: "2026-10-03", downloads: 300 },
      ],
    },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.equal(snapshot.ecosystem.flathub.currentValue, "600");
  assert.equal(
    snapshot.sources.find((source) => source.id === "flathub").status,
    "available",
  );
});

test("snapshot marks an incomplete Countme total unavailable", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-03T23:59:59.999Z"),
    countmeStats: {
      currentTotal: null,
      previousTotal: 12,
      historyPoints: [12, null],
      sourceDate: "2026-10-03",
    },
    history: { schemaVersion: 2, snapshots: [] },
  });

  assert.equal(snapshot.ecosystem.countme, null);
  assert.equal(
    snapshot.sources.find((source) => source.id === "countme").status,
    "unavailable",
  );
  assert.doesNotMatch(
    JSON.stringify(snapshot.ecosystem),
    /currentValue":"null"/,
  );
});

test("release provenance keeps aggregate and repository-specific sources", async () => {
  const { buildReportSnapshotPayload } = await reportGenerator;
  const period = { start: "2026-10-01", end: "2026-10-31" };
  const aggregateSource = {
    id: "github-releases",
    status: "unavailable",
    stateReason: "projectbluefin/dakota: HTTP 503",
    url: "https://api.github.com/repos",
    window: period,
  };
  const repositorySources = [
    {
      id: "github-releases",
      repository: "projectbluefin/bluefin",
      status: "available",
      stateReason: null,
      url: "https://api.github.com/repos/projectbluefin/bluefin/releases",
      window: period,
    },
    {
      id: "github-releases",
      repository: "projectbluefin/dakota",
      status: "unavailable",
      stateReason: "HTTP 503",
      url: "https://api.github.com/repos/projectbluefin/dakota/releases",
      window: period,
    },
  ];

  const snapshot = buildReportSnapshotPayload({
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T23:59:59.999Z"),
    releaseResult: {
      events: [],
      source: aggregateSource,
      sources: repositorySources,
    },
    history: { schemaVersion: 2, snapshots: [] },
  });

  const releaseSources = snapshot.sources.filter(
    (source) => source.id === "github-releases",
  );
  assert.deepEqual(releaseSources, [aggregateSource, ...repositorySources]);
});
