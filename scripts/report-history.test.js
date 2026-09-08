import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeReportHistory,
  readReportHistory,
} from "./lib/report-history.mjs";

test("mergeReportHistory replaces only the same month and preserves null gaps", () => {
  const history = {
    schemaVersion: 2,
    snapshots: [
      { period: { month: "2026-09" }, activity: { mergedPrs: null } },
    ],
  };
  const next = mergeReportHistory(history, {
    schemaVersion: 2,
    period: { month: "2026-10" },
    activity: { mergedPrs: 12 },
  });
  assert.deepEqual(
    next.snapshots.map((item) => item.activity.mergedPrs),
    [null, 12],
  );
});

test("mergeReportHistory replaces existing snapshot when period.month matches", () => {
  const history = {
    schemaVersion: 2,
    snapshots: [
      { period: { month: "2026-09" }, activity: { mergedPrs: 5 } },
      { period: { month: "2026-10" }, activity: { mergedPrs: 10 } },
    ],
  };
  const next = mergeReportHistory(history, {
    schemaVersion: 2,
    period: { month: "2026-10" },
    activity: { mergedPrs: 15 },
  });
  assert.equal(next.snapshots.length, 2);
  assert.deepEqual(
    next.snapshots.map((item) => item.activity.mergedPrs),
    [5, 15],
  );
  assert.deepEqual(
    next.snapshots.map((item) => item.period.month),
    ["2026-09", "2026-10"],
  );
});

test("mergeReportHistory sorts snapshots ascending by month", () => {
  const history = {
    schemaVersion: 2,
    snapshots: [
      { period: { month: "2026-11" }, activity: { mergedPrs: 20 } },
      { period: { month: "2026-09" }, activity: { mergedPrs: 5 } },
    ],
  };
  const next = mergeReportHistory(history, {
    schemaVersion: 2,
    period: { month: "2026-10" },
    activity: { mergedPrs: 12 },
  });
  assert.deepEqual(
    next.snapshots.map((item) => item.period.month),
    ["2026-09", "2026-10", "2026-11"],
  );
  assert.deepEqual(
    next.snapshots.map((item) => item.activity.mergedPrs),
    [5, 12, 20],
  );
});

test("mergeReportHistory preserves unavailable payloads and does not mutate input", () => {
  const history = {
    schemaVersion: 2,
    snapshots: [
      {
        period: { month: "2026-09" },
        sources: [
          { id: "countme", status: "unavailable", stateReason: "HTTP 503" },
        ],
        ecosystem: { countme: null },
      },
    ],
  };
  const snapshot = {
    schemaVersion: 2,
    period: { month: "2026-10" },
    sources: [{ id: "countme", status: "available", stateReason: null }],
    ecosystem: { countme: 4200 },
  };

  const next = mergeReportHistory(history, snapshot);

  assert.notEqual(next, history);
  assert.notEqual(next.snapshots, history.snapshots);
  assert.equal(history.snapshots.length, 1);
  assert.equal(next.snapshots.length, 2);
  assert.deepEqual(next.snapshots[0].sources, [
    { id: "countme", status: "unavailable", stateReason: "HTTP 503" },
  ]);
  assert.equal(next.snapshots[0].ecosystem.countme, null);
  assert.equal(next.snapshots[1].ecosystem.countme, 4200);
});

test("mergeReportHistory archives every Reports 2.0 section", () => {
  const snapshot = {
    schemaVersion: 2,
    period: { month: "2026-10" },
    sources: [
      { id: "flathub", status: "unavailable", stateReason: "No source" },
    ],
    activity: { calendar: { currentValue: "12" } },
    delivery: { lanes: [{ id: "bluefin", total: 2 }] },
    participation: { automation: { currentValue: "12" } },
    ecosystem: { flathub: null },
    history: [],
  };

  const next = mergeReportHistory(
    { schemaVersion: 2, snapshots: [] },
    snapshot,
  );

  assert.deepEqual(next.snapshots, [snapshot]);
});

test("mergeReportHistory rejects incompatible schemas", () => {
  assert.throws(
    () =>
      mergeReportHistory(
        { schemaVersion: 1, snapshots: [] },
        { schemaVersion: 2, period: { month: "2026-10" } },
      ),
    /schemaVersion/,
  );
  assert.throws(
    () =>
      mergeReportHistory(
        { schemaVersion: 2, snapshots: [] },
        { schemaVersion: 3, period: { month: "2026-10" } },
      ),
    /schemaVersion/,
  );
  assert.throws(
    () =>
      mergeReportHistory(
        { schemaVersion: 2, snapshots: [] },
        { period: { month: "2026-10" } },
      ),
    /schemaVersion/,
  );
  assert.throws(
    () =>
      mergeReportHistory(null, {
        schemaVersion: 2,
        period: { month: "2026-10" },
      }),
    /schemaVersion/,
  );
  assert.throws(
    () =>
      mergeReportHistory(
        {
          schemaVersion: 2,
          snapshots: [{ schemaVersion: 1, period: { month: "2026-09" } }],
        },
        { schemaVersion: 2, period: { month: "2026-10" } },
      ),
    /schemaVersion/,
  );
});

test("mergeReportHistory rejects missing or invalid period.month", () => {
  assert.throws(
    () =>
      mergeReportHistory(
        { schemaVersion: 2, snapshots: [] },
        { schemaVersion: 2, period: {} },
      ),
    /period\.month/,
  );
  assert.throws(
    () =>
      mergeReportHistory(
        { schemaVersion: 2, snapshots: [{ period: {} }] },
        { schemaVersion: 2, period: { month: "2026-10" } },
      ),
    /period\.month/,
  );
});

test("tracked report history is version-2 compatible", () => {
  const history = readReportHistory();
  assert.equal(history.schemaVersion, 2);
  assert.ok(Array.isArray(history.snapshots));
  assert.ok(
    history.snapshots.every(
      (snapshot) =>
        snapshot.schemaVersion === 2 &&
        /^\d{4}-\d{2}$/.test(snapshot.period.month),
    ),
  );
});

test("readReportHistory returns valid history when present", () => {
  const seed = { schemaVersion: 2, snapshots: [] };
  const history = {
    schemaVersion: 2,
    snapshots: [{ period: { month: "2026-08" }, activity: { mergedPrs: 8 } }],
  };

  const mockRead = (path) => {
    if (path === "history.json") return JSON.stringify(history);
    if (path === "seed.json") return JSON.stringify(seed);
    throw new Error("ENOENT");
  };

  const result = readReportHistory("seed.json", "history.json", mockRead);
  assert.deepEqual(result, history);
});

test("readReportHistory falls back to seed when history is missing, invalid JSON, or wrong schemaVersion", () => {
  const seed = {
    schemaVersion: 2,
    snapshots: [{ period: { month: "2026-01" }, activity: { mergedPrs: 1 } }],
  };

  const cases = [
    () => {
      throw new Error("ENOENT");
    },
    () => "not valid json {",
    () => JSON.stringify({ schemaVersion: 1, snapshots: [] }),
    () => JSON.stringify({ schemaVersion: 2, snapshots: "not-an-array" }),
    () => JSON.stringify(null),
  ];

  for (const badHistoryRead of cases) {
    const mockRead = (path) => {
      if (path === "history.json") return badHistoryRead();
      if (path === "seed.json") return JSON.stringify(seed);
      throw new Error("unexpected path");
    };

    const result = readReportHistory("seed.json", "history.json", mockRead);
    assert.deepEqual(result, seed);
  }
});

test("readReportHistory falls back to seed when a nested snapshot has incompatible schemaVersion or malformed shape", () => {
  const seed = {
    schemaVersion: 2,
    snapshots: [{ period: { month: "2026-01" }, activity: { mergedPrs: 1 } }],
  };

  const malformedSnapshots = [
    [{ schemaVersion: 1, period: { month: "2026-08" } }],
    [{ schemaVersion: 3, period: { month: "2026-08" } }],
    [{ period: {} }],
    [{ period: { month: "" } }],
    [{ period: { month: 123 } }],
    [null],
    ["not-an-object"],
  ];

  for (const snapshots of malformedSnapshots) {
    const mockRead = (path) => {
      if (path === "history.json") {
        return JSON.stringify({ schemaVersion: 2, snapshots });
      }
      if (path === "seed.json") return JSON.stringify(seed);
      throw new Error("unexpected path: " + path);
    };

    const result = readReportHistory("seed.json", "history.json", mockRead);
    assert.deepEqual(result, seed);
  }
});

test("readReportHistory reads seed directly when historyPath is not provided", () => {
  const seed = { schemaVersion: 2, snapshots: [] };
  const mockRead = (path) => {
    if (path === "seed.json") return JSON.stringify(seed);
    throw new Error("unexpected path: " + path);
  };

  const result = readReportHistory("seed.json", undefined, mockRead);
  assert.deepEqual(result, seed);
});
