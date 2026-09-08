import { test } from "node:test";
import assert from "node:assert/strict";

import { buildActivityMetrics } from "./lib/report-activity-metrics.mjs";

test("buildActivityMetrics retains a zero day and omits missing repository and category values", () => {
  const result = buildActivityMetrics(
    [
      {
        repository: "projectbluefin/bluefin",
        mergedAt: "2026-10-02T12:00:00Z",
        labels: [{ name: "area/dx" }],
      },
      {
        repository: null,
        mergedAt: "not-a-date",
        labels: [{ name: null }],
      },
      {
        repository: "",
        labels: [{}],
      },
    ],
    { start: "2026-10-01", end: "2026-10-03" },
  );

  assert.deepEqual(result.dailyMerges, [
    { date: "2026-10-01", value: 0 },
    { date: "2026-10-02", value: 1 },
    { date: "2026-10-03", value: 0 },
  ]);
  assert.deepEqual(result.repositoryCounts, [
    { name: "projectbluefin/bluefin", value: 1 },
  ]);
  assert.deepEqual(result.categoryCounts, [{ name: "area/dx", value: 1 }]);
});
