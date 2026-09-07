import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportSnapshot } from "./lib/report-snapshot.mjs";

test("a snapshot preserves unavailable sources and null measurements", () => {
  const snapshot = buildReportSnapshot({
    period: { month: "2026-10", start: "2026-10-01", end: "2026-10-31" },
    sources: [
      { id: "countme", status: "unavailable", stateReason: "HTTP 503" },
    ],
    activity: { dailyMerges: [{ date: "2026-10-01", value: null }] },
    delivery: {},
    participation: {},
    ecosystem: {},
    history: [],
  });
  assert.equal(snapshot.sources[0].stateReason, "HTTP 503");
  assert.equal(snapshot.activity.dailyMerges[0].value, null);
});
