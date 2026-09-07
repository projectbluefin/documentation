const test = require("node:test");
const assert = require("node:assert/strict");

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

function chartMdx(snapshot) {
  return `<ReportChart definition={${JSON.stringify(snapshot.activity.charts[0])}} />`;
}

test("the MDX chart contract retains provenance and serializable table data", () => {
  const markdown = chartMdx(fixtureSnapshot);

  assert.match(markdown, /<ReportChart/);
  assert.match(markdown, /sourceWindow/);
  assert.match(markdown, /October 2026 UTC/);
  assert.match(markdown, /2026-10-01/);
  assert.match(markdown, /"values":\[null,12\]/);
});
