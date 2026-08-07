import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregateTotals,
  average,
  bucketDaily,
  buildLane,
  buildPayload,
  classifyRun,
  isPublishRun,
  median,
  normalizeRun,
  runDurationMin,
  successRate,
  summarize,
  unavailableLane,
} from "./fetch-factory-stats.js";

const LANE = {
  id: "bluefin-testing",
  label: "bluefin testing",
  repo: "projectbluefin/bluefin",
};

function apiRun(overrides = {}) {
  return {
    name: "Testing Images",
    path: ".github/workflows/build-image-testing.yml",
    event: "push",
    status: "completed",
    conclusion: "success",
    run_started_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:26:00Z",
    created_at: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

test("classifyRun maps successful runs to passed", () => {
  assert.equal(classifyRun(apiRun()), "passed");
});

test("classifyRun maps hard failures to failed", () => {
  for (const conclusion of ["failure", "timed_out", "startup_failure"]) {
    assert.equal(classifyRun(apiRun({ conclusion })), "failed");
  }
});

// Regression test for the lab bug this pipeline exists to avoid:
// projectbluefin/lab#616 renders in-flight runs as failures, so a healthy
// factory shows up all-red.
test("classifyRun never reports an in-flight run as failed", () => {
  const inFlight = apiRun({ status: "in_progress", conclusion: null });
  assert.equal(classifyRun(inFlight), "running");
  assert.notEqual(classifyRun(inFlight), "failed");

  for (const status of ["queued", "waiting", "requested", "pending"]) {
    assert.equal(classifyRun(apiRun({ status, conclusion: null })), "running");
  }
});

test("classifyRun treats non-verdict conclusions as running, not failed", () => {
  for (const conclusion of [
    null,
    "cancelled",
    "skipped",
    "action_required",
    "neutral",
    "stale",
  ]) {
    assert.equal(classifyRun(apiRun({ conclusion })), "running");
  }
});

test("successRate excludes in-flight runs from the denominator", () => {
  const runs = [
    normalizeRun(apiRun()),
    normalizeRun(apiRun()),
    normalizeRun(apiRun()),
    normalizeRun(apiRun({ conclusion: "failure" })),
    normalizeRun(apiRun({ status: "in_progress", conclusion: null })),
    normalizeRun(apiRun({ status: "queued", conclusion: null })),
  ];
  const stats = summarize(runs);

  assert.equal(stats.total, 6);
  assert.equal(stats.passed, 3);
  assert.equal(stats.failed, 1);
  assert.equal(stats.running, 2);
  // 3 / (3 + 1) — the two in-flight runs are not in the denominator.
  assert.equal(stats.successRate, 75);
});

test("successRate is null when nothing has completed", () => {
  assert.equal(successRate(0, 0), null);
  assert.equal(successRate(74, 5), 94);
});

test("isPublishRun keeps image-publishing workflows and drops the rest", () => {
  const publishing = [
    ".github/workflows/build-image-testing.yml",
    ".github/workflows/build-regular.yml",
    ".github/workflows/build-nvidia-aarch64.yml",
    ".github/workflows/build.yml",
    ".github/workflows/publish.yml",
  ];
  for (const path of publishing) {
    assert.equal(isPublishRun(apiRun({ path })), true, path);
  }

  const notPublishing = [
    ".github/workflows/pr-validation.yml",
    ".github/workflows/vulnerability-scan.yml",
    ".github/workflows/run-testsuite.yml",
    ".github/workflows/boot-test-aarch64.yml",
    ".github/workflows/publish-smoke.yml",
    ".github/workflows/rebuild-docs.yml",
  ];
  for (const path of notPublishing) {
    assert.equal(isPublishRun(apiRun({ path })), false, path);
  }
});

test("isPublishRun drops builds that never publish an image", () => {
  for (const event of ["pull_request", "pull_request_target", "merge_group"]) {
    assert.equal(isPublishRun(apiRun({ event })), false, event);
  }
  for (const event of ["push", "schedule", "workflow_dispatch"]) {
    assert.equal(isPublishRun(apiRun({ event })), true, event);
  }
});

test("runDurationMin measures completed runs and skips in-flight ones", () => {
  assert.equal(runDurationMin(apiRun()), 26);
  assert.equal(
    runDurationMin(apiRun({ status: "in_progress", conclusion: null })),
    null,
  );
  assert.equal(runDurationMin(apiRun({ updated_at: "not-a-date" })), null);
});

test("normalizeRun emits the compact run shape", () => {
  assert.deepEqual(normalizeRun(apiRun()), {
    t: Math.floor(Date.parse("2026-08-01T10:00:00Z") / 1000),
    status: "passed",
    durationMin: 26,
  });
});

test("median and average handle odd, even and empty inputs", () => {
  assert.equal(median([26]), 26);
  assert.equal(median([10, 30, 20]), 20);
  assert.equal(median([10, 20, 30, 44]), 25);
  assert.equal(median([]), null);
  assert.equal(average([10, 20, 31]), 20);
  assert.equal(average([]), null);
});

test("median and average ignore in-flight runs with no duration", () => {
  const runs = [
    normalizeRun(apiRun({ updated_at: "2026-08-01T10:10:00Z" })),
    normalizeRun(apiRun({ updated_at: "2026-08-01T10:30:00Z" })),
    normalizeRun(apiRun({ status: "in_progress", conclusion: null })),
  ];
  const stats = summarize(runs);
  assert.equal(stats.medianDurationMin, 20);
  assert.equal(stats.averageDurationMin, 20);
});

test("buildLane filters, sorts and aggregates raw API runs", () => {
  const lane = buildLane(LANE, [
    apiRun({
      run_started_at: "2026-08-03T10:00:00Z",
      updated_at: "2026-08-03T10:26:00Z",
    }),
    apiRun({
      run_started_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:20:00Z",
    }),
    apiRun({
      conclusion: "failure",
      run_started_at: "2026-08-02T10:00:00Z",
      updated_at: "2026-08-02T10:14:00Z",
    }),
    apiRun({
      status: "in_progress",
      conclusion: null,
      run_started_at: "2026-08-04T10:00:00Z",
    }),
    apiRun({
      path: ".github/workflows/vulnerability-scan.yml",
      conclusion: "failure",
    }),
    apiRun({ event: "pull_request", conclusion: "failure" }),
  ]);

  assert.equal(lane.id, "bluefin-testing");
  assert.equal(lane.label, "bluefin testing");
  assert.equal(lane.repo, "projectbluefin/bluefin");
  assert.equal(lane.total, 4);
  assert.equal(lane.passed, 2);
  assert.equal(lane.failed, 1);
  assert.equal(lane.running, 1);
  assert.equal(lane.successRate, 67);
  assert.equal(lane.medianDurationMin, 20);
  assert.equal(lane.unavailable, false);
  assert.equal(lane.stateReason, null);
  assert.deepEqual(
    lane.runs.map((r) => r.t),
    [...lane.runs.map((r) => r.t)].sort((a, b) => a - b),
  );
  assert.deepEqual(Object.keys(lane), [
    "id",
    "label",
    "repo",
    "runs",
    "total",
    "passed",
    "failed",
    "running",
    "successRate",
    "medianDurationMin",
    "unavailable",
    "stateReason",
  ]);
});

test("unavailableLane states the reason instead of reporting zero health", () => {
  const lane = unavailableLane(
    LANE,
    "HTTP 403 for projectbluefin/bluefin actions/runs",
  );
  assert.equal(lane.unavailable, true);
  assert.match(lane.stateReason, /403/);
  assert.deepEqual(lane.runs, []);
  assert.equal(lane.successRate, null);
});

test("aggregateTotals skips unavailable lanes", () => {
  const good = buildLane(LANE, [apiRun(), apiRun({ conclusion: "failure" })]);
  const bad = unavailableLane(
    { id: "dakota", label: "dakota", repo: "projectbluefin/dakota" },
    "offline",
  );
  const totals = aggregateTotals([good, bad]);
  assert.equal(totals.total, 2);
  assert.equal(totals.passed, 1);
  assert.equal(totals.failed, 1);
  assert.equal(totals.successRate, 50);
  assert.equal(totals.averageDurationMin, 26);
});

test("bucketDaily fills every day in the window and ignores in-flight runs", () => {
  const lane = buildLane(LANE, [
    apiRun({
      run_started_at: "2026-08-01T10:00:00Z",
      updated_at: "2026-08-01T10:26:00Z",
    }),
    apiRun({
      run_started_at: "2026-08-01T18:00:00Z",
      updated_at: "2026-08-01T18:26:00Z",
    }),
    apiRun({
      conclusion: "failure",
      run_started_at: "2026-08-03T10:00:00Z",
      updated_at: "2026-08-03T10:14:00Z",
    }),
    apiRun({
      status: "in_progress",
      conclusion: null,
      run_started_at: "2026-08-03T12:00:00Z",
    }),
  ]);

  const daily = bucketDaily(
    [lane],
    "2026-08-01T00:00:00.000Z",
    "2026-08-04T00:00:00.000Z",
  );
  assert.deepEqual(daily, [
    { date: "2026-08-01", passed: 2, failed: 0 },
    { date: "2026-08-02", passed: 0, failed: 0 },
    { date: "2026-08-03", passed: 0, failed: 1 },
    { date: "2026-08-04", passed: 0, failed: 0 },
  ]);
});

test("buildPayload matches the published contract", () => {
  const lane = buildLane(LANE, [apiRun(), apiRun({ conclusion: "failure" })]);
  const payload = buildPayload([lane], {
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-08T00:00:00.000Z",
    generatedAt: "2026-08-08T00:00:00.000Z",
  });

  assert.deepEqual(Object.keys(payload), [
    "generatedAt",
    "window",
    "lanes",
    "totals",
    "daily",
    "unavailable",
    "stateReason",
  ]);
  assert.deepEqual(payload.window, {
    days: 7,
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-08T00:00:00.000Z",
  });
  assert.deepEqual(Object.keys(payload.totals), [
    "total",
    "passed",
    "failed",
    "running",
    "successRate",
    "medianDurationMin",
    "averageDurationMin",
  ]);
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.daily.length, 8);
});

test("buildPayload reports an explicit unavailable state when every lane fails", () => {
  const lanes = [
    unavailableLane(LANE, "HTTP 500"),
    unavailableLane(
      { id: "dakota", label: "dakota", repo: "projectbluefin/dakota" },
      "HTTP 500",
    ),
  ];
  const payload = buildPayload(lanes, {
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-08-08T00:00:00.000Z",
    generatedAt: "2026-08-08T00:00:00.000Z",
  });

  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "HTTP 500");
  assert.equal(payload.totals.total, 0);
  assert.equal(payload.totals.successRate, null);
});
