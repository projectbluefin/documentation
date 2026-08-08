import test from "node:test";
import assert from "node:assert/strict";

import {
  monthKey,
  bucketMonthly,
  deploymentsPerWeek,
  changeFailureRate,
  median,
  buildPayload,
} from "./fetch-dora.js";

test("monthKey extracts YYYY-MM from ISO timestamp", () => {
  assert.equal(monthKey("2026-07-20T15:47:00Z"), "2026-07");
  assert.equal(monthKey("2025-01-01T00:00:00Z"), "2025-01");
});

test("changeFailureRate excludes in-flight from denominator", () => {
  // 1 passed, 1 failed, 98 running → 0.5 (only terminal runs count)
  assert.equal(changeFailureRate({ passed: 1, failed: 1, running: 98 }), 0.5);
});

test("changeFailureRate is null not 0 when nothing terminal ran", () => {
  assert.equal(changeFailureRate({ passed: 0, failed: 0, running: 5 }), null);
  assert.equal(changeFailureRate({ passed: 0, failed: 0, running: 0 }), null);
});

test("deploymentsPerWeek computes releases per week", () => {
  assert.equal(deploymentsPerWeek(52, 364), 1);
  assert.equal(deploymentsPerWeek(0, 365), 0);
});

test("median of even-length array averages the two middle values", () => {
  assert.equal(median([10, 20, 30, 40]), 25);
  assert.equal(median([5, 15]), 10);
});

test("median of empty array is null", () => {
  assert.equal(median([]), null);
});

test("bucketMonthly counts releases and run outcomes in the same bucket", () => {
  const releases = [
    { published_at: "2026-07-15T10:00:00Z" },
    { published_at: "2026-07-20T10:00:00Z" },
  ];
  const runs = [
    {
      run_started_at: "2026-07-15T10:00:00Z",
      updated_at: "2026-07-15T10:26:00Z",
      status: "completed",
      conclusion: "success",
      path: ".github/workflows/build.yml",
      event: "push",
    },
    {
      run_started_at: "2026-07-20T10:00:00Z",
      updated_at: "2026-07-20T10:14:00Z",
      status: "completed",
      conclusion: "failure",
      path: ".github/workflows/build.yml",
      event: "push",
    },
  ];
  const monthly = bucketMonthly({ releases, runs });
  assert.equal(monthly.length, 1);
  assert.equal(monthly[0].month, "2026-07");
  assert.equal(monthly[0].releases, 2);
  assert.equal(monthly[0].publishRuns, 2);
  assert.equal(monthly[0].passed, 1);
  assert.equal(monthly[0].failed, 1);
  assert.equal(monthly[0].failureRate, 0.5);
});

test("bucketMonthly returns empty array when no data (gap, not zero row)", () => {
  assert.deepEqual(bucketMonthly({ releases: [], runs: [] }), []);
});

test("bucketMonthly excludes in-flight runs from failure rate", () => {
  const runs = [
    {
      run_started_at: "2026-07-15T10:00:00Z",
      updated_at: "2026-07-15T10:26:00Z",
      status: "completed",
      conclusion: "success",
      path: ".github/workflows/build.yml",
      event: "push",
    },
    {
      run_started_at: "2026-07-15T12:00:00Z",
      status: "in_progress",
      conclusion: null,
      path: ".github/workflows/build.yml",
      event: "push",
    },
  ];
  const monthly = bucketMonthly({ releases: [], runs });
  assert.equal(monthly[0].running, 1);
  // 1 passed, 0 failed → failureRate 0, not affected by running
  assert.equal(monthly[0].failureRate, 0);
});

test("buildPayload assembles the full contract shape", () => {
  const payload = buildPayload({
    releases: [{ published_at: "2026-07-15T10:00:00Z" }],
    runs: [],
    windowDays: 365,
    generatedAt: "2026-08-07T00:00:00Z",
  });
  assert.equal(payload.generatedAt, "2026-08-07T00:00:00Z");
  assert.equal(payload.windowDays, 365);
  assert.deepEqual(payload.repos, [
    "projectbluefin/bluefin",
    "projectbluefin/bluefin-lts",
    "projectbluefin/dakota",
  ]);
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.current.medianLeadTimeHours, null);
  assert.ok(payload.current.leadTimeReason.length > 0);
});
