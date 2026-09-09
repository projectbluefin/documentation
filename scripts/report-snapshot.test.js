import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportSnapshot } from "./lib/report-snapshot.mjs";

function snapshotWithSources(sources) {
  return buildReportSnapshot({
    period: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
    sources,
    activity: { dailyMerges: [{ date: "2026-10-01", value: null }] },
    delivery: { lanes: [] },
    participation: { contributors: [] },
    ecosystem: { countme: null },
    history: [],
  });
}

test("a snapshot preserves unavailable sources and null measurements", () => {
  const snapshot = snapshotWithSources([
    { id: "countme", status: "unavailable", stateReason: "HTTP 503" },
  ]);
  assert.equal(snapshot.schemaVersion, 2);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "activity",
    "delivery",
    "ecosystem",
    "history",
    "participation",
    "period",
    "schemaVersion",
    "sources",
  ]);
  assert.equal(snapshot.sources[0].stateReason, "HTTP 503");
  assert.equal(snapshot.activity.dailyMerges[0].value, null);
});

test("available sources always normalize stateReason to null", () => {
  const snapshot = snapshotWithSources([
    { id: "github", status: "available", stateReason: "stale" },
    { id: "countme", status: "available", stateReason: { code: 503 } },
    { id: "homebrew", status: "available", stateReason: undefined },
  ]);

  assert.deepEqual(
    snapshot.sources.map((source) => source.stateReason),
    [null, null, null],
  );
});

test("malformed and unrecognized source states throw", () => {
  for (const source of [
    { id: "missing-status" },
    { id: "pending", status: "pending", stateReason: "still running" },
    { id: "missing-reason", status: "unavailable" },
    { id: "non-string-reason", status: "unavailable", stateReason: 503 },
  ]) {
    assert.throws(() => snapshotWithSources([source]), TypeError);
  }
});
