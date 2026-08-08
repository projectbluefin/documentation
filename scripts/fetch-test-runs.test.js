import test from "node:test";
import assert from "node:assert/strict";

import {
  isTestWorkflow,
  summarizeSuite,
  countFlips,
  consecutiveFailures,
  triageRank,
  buildPayload,
} from "./fetch-test-runs.js";

test("isTestWorkflow matches test workflow basenames", () => {
  const matches = [
    ".github/workflows/run-testsuite.yml",
    ".github/workflows/pytest.yml",
    ".github/workflows/e2e.yml",
    ".github/workflows/post-testing-e2e.yml",
    ".github/workflows/pr-validation.yml",
    ".github/workflows/validate.yml",
    ".github/workflows/unit-tests.yml",
    ".github/workflows/iso-validation.yml",
    ".github/workflows/pr-e2e.yml",
    ".github/workflows/pr-testsuite.yml",
    ".github/workflows/migration-test.yml",
    ".github/workflows/e2e-dispatch.yml",
    ".github/workflows/boot-test-aarch64.yml",
  ];
  for (const p of matches) {
    assert.equal(isTestWorkflow(p), true, `should match: ${p}`);
  }
});

test("isTestWorkflow rejects build-image-testing.yml", () => {
  assert.equal(
    isTestWorkflow(".github/workflows/build-image-testing.yml"),
    false,
    "build-image-testing.yml builds an image, it does not test one",
  );
});

test("isTestWorkflow rejects non-test workflows", () => {
  const rejects = [
    ".github/workflows/build.yml",
    ".github/workflows/publish.yml",
    ".github/workflows/publish-smoke.yml",
    ".github/workflows/rebuild-docs.yml",
  ];
  for (const p of rejects) {
    assert.equal(isTestWorkflow(p), false, `should reject: ${p}`);
  }
});

function run(status, isoTime) {
  return { status, isoTime, t: Date.parse(isoTime) / 1000 };
}

test("passRate excludes in-flight from denominator", () => {
  const runs = [
    run("passed", "2026-08-01T10:00:00Z"),
    run("failed", "2026-08-02T10:00:00Z"),
    run("running", "2026-08-03T10:00:00Z"),
    run("running", "2026-08-04T10:00:00Z"),
  ];
  const s = summarizeSuite(runs);
  assert.equal(s.passRate, 0.5);
});

test("passRate is null not 0 when nothing terminal ran", () => {
  const runs = [
    run("running", "2026-08-01T10:00:00Z"),
    run("running", "2026-08-02T10:00:00Z"),
  ];
  assert.equal(summarizeSuite(runs).passRate, null);
  assert.equal(summarizeSuite([]).passRate, null);
});

test("countFlips counts pass↔fail transitions, ignoring in-flight", () => {
  const runs = [
    run("passed", "2026-08-01T10:00:00Z"),
    run("running", "2026-08-01T12:00:00Z"),
    run("failed", "2026-08-02T10:00:00Z"),
    run("passed", "2026-08-03T10:00:00Z"),
  ];
  // passed→failed→passed = 2 flips (running ignored)
  assert.equal(countFlips(runs), 2);
});

test("consecutiveFailures counts back from newest terminal run", () => {
  const runs = [
    run("passed", "2026-08-01T10:00:00Z"),
    run("failed", "2026-08-02T10:00:00Z"),
    run("failed", "2026-08-03T10:00:00Z"),
  ];
  assert.equal(consecutiveFailures(runs), 2);
});

test("consecutiveFailures is not reset by a trailing in-flight run", () => {
  const runs = [
    run("passed", "2026-08-01T10:00:00Z"),
    run("failed", "2026-08-02T10:00:00Z"),
    run("failed", "2026-08-03T10:00:00Z"),
    run("running", "2026-08-04T10:00:00Z"),
  ];
  assert.equal(consecutiveFailures(runs), 2);
});

test("triageRank puts a failing suite above a merely stale one", () => {
  const failing = {
    consecutiveFailures: 2,
    lastTerminalAt: new Date().toISOString(),
    flips: 1,
  };
  const stale = {
    consecutiveFailures: 0,
    lastTerminalAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    flips: 5,
  };
  assert.ok(triageRank(failing) > triageRank(stale));
});

test("a suite with no runs is reported, not omitted", () => {
  const s = summarizeSuite([]);
  assert.equal(s.passRate, null);
  assert.equal(s.lastTerminalAt, null);
  assert.equal(s.consecutiveFailures, 0);
  assert.equal(s.flips, 0);
});

test("buildPayload sorts suites by triageRank descending", () => {
  const suites = [
    { id: "a", triageRank: 10, unavailable: false },
    { id: "b", triageRank: 100, unavailable: false },
    { id: "c", triageRank: 50, unavailable: false },
  ];
  const payload = buildPayload({
    suites,
    generatedAt: "2026-08-07T00:00:00Z",
  });
  assert.deepEqual(
    payload.suites.map((s) => s.id),
    ["b", "c", "a"],
  );
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
});
