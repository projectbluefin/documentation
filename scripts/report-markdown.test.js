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
