import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildFlathubReportMetrics,
  readFlathubStats,
} from "./lib/report-ecosystem-metrics.mjs";

const PERIOD = { start: "2026-10-01", end: "2026-10-03" };

test("buildFlathubReportMetrics creates a calendar-month download trend", () => {
  const result = buildFlathubReportMetrics(
    {
      unavailable: false,
      downloadsPerDay: [
        { date: "2026-10-01", downloads: 100 },
        { date: "2026-10-02", downloads: 200 },
        { date: "2026-10-03", downloads: 300 },
        { date: "2026-09-30", downloads: 999 },
      ],
    },
    PERIOD,
  );

  assert.equal(result.reason, null);
  assert.deepEqual(result.chart.labels, [
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
  ]);
  assert.deepEqual(result.chart.series[0].values, [100, 200, 300]);
  assert.equal(result.chart.currentValue, "600");
  assert.equal(result.chart.unit, "calendar-month downloads");
});

test("buildFlathubReportMetrics keeps unavailable source state visible", () => {
  const result = buildFlathubReportMetrics(
    {
      unavailable: true,
      stateReason: "Flathub request failed",
      downloadsPerDay: [],
    },
    PERIOD,
  );

  assert.equal(result.chart, null);
  assert.equal(result.reason, "Flathub request failed");
});

test("buildFlathubReportMetrics marks missing days unavailable", () => {
  const result = buildFlathubReportMetrics(
    {
      unavailable: false,
      downloadsPerDay: [
        { date: "2026-10-01", downloads: 100 },
        { date: "2026-10-03", downloads: 300 },
      ],
    },
    PERIOD,
  );

  assert.equal(result.chart, null);
  assert.match(result.reason, /incomplete/);
});

test("readFlathubStats does not expose local file paths in a source reason", () => {
  const result = readFlathubStats("flathub.json", () => {
    throw new Error(
      "ENOENT: /home/runner/work/documentation/static/data/flathub.json",
    );
  });

  assert.equal(result.unavailable, true);
  assert.doesNotMatch(result.stateReason, /home\/runner|static\/data/);
});
