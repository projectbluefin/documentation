const test = require("node:test");
const assert = require("node:assert/strict");

const generator = import("./lib/markdown-generator.mjs");

const fixtureSnapshot = {
  schemaVersion: 2,
  period: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
  activity: {
    charts: [
      {
        id: "merges",
        kind: "line",
        title: "Merged pull requests",
        currentValue: "12",
        unit: "pull requests",
        sourceLabel: "GitHub",
        sourceUrl: "https://github.com/projectbluefin",
        sourceWindow: "October 2026 UTC",
        labels: ["2026-10-01", "2026-10-02"],
        series: [{ id: "merged", label: "Merged", values: [null, 12] }],
        minimumPoints: 3,
      },
    ],
  },
};

test("the report generator keeps its section import and tag contract", async () => {
  const { generateReportMarkdown } = await generator;
  const markdown = generateReportMarkdown(
    [],
    [],
    ["alice"],
    [],
    [],
    new Date("2026-10-01T00:00:00Z"),
    new Date("2026-10-31T23:59:59Z"),
  );

  assert.match(markdown, /tags: \[monthly-report/);
  assert.match(
    markdown,
    /import \{[\s\S]*ReportHeroKPIs[\s\S]*\} from '@site\/src\/components\/reports';/,
  );
  assert.match(markdown, /<ReportHeroKPIs[\s\S]*kpis=\{/);
});

test("the production chart-tag serializer retains provenance and table data", async () => {
  const { generateReportChartTag } = await generator;
  const markdown = generateReportChartTag(fixtureSnapshot.activity.charts[0]);

  assert.match(markdown, /<ReportChart/);
  assert.match(markdown, /sourceWindow/);
  assert.match(markdown, /October 2026 UTC/);
  assert.match(markdown, /2026-10-01/);
  assert.match(markdown, /"values":\[null,12\]/);
});
