import test from "node:test";
import assert from "node:assert/strict";

import {
  parseCount,
  pickBluefinRows,
  pickPeerRows,
  buildWindow,
  buildPayload,
} from "./fetch-brew-analytics.js";

// ── parseCount ───────────────────────────────────────────────────────────

test("parseCount strips thousands separators", () => {
  assert.equal(parseCount("1,348,288"), 1348288);
  assert.equal(parseCount("0.48"), 0.48);
  assert.equal(parseCount("100"), 100);
});

test("parseCount returns null for missing or unparseable", () => {
  assert.equal(parseCount(undefined), null);
  assert.equal(parseCount(null), null);
  assert.equal(parseCount("not-a-number"), null);
});

// ── pickBluefinRows ──────────────────────────────────────────────────────

test("pickBluefinRows finds both Bluefin lanes and keeps rank", () => {
  const items = [
    { number: 11, os_version: "Bluefin", count: "1,348,288", percent: "0.48" },
    { number: 39, os_version: "Bluefin LTS", count: "79,446", percent: "0.03" },
    {
      number: 1,
      os_version: "macOS Tahoe (26)",
      count: "9,576,217",
      percent: "3.40",
    },
  ];
  const rows = pickBluefinRows(items);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "bluefin");
  assert.equal(rows[0].rank, 11);
  assert.equal(rows[0].count, 1348288);
  assert.equal(rows[1].id, "bluefin-lts");
  assert.equal(rows[1].rank, 39);
});

test("pickBluefinRows does NOT match a lookalike", () => {
  const items = [
    { number: 99, os_version: "Blueflower", count: "100", percent: "0.01" },
  ];
  assert.equal(pickBluefinRows(items).length, 0);
});

// ── pickPeerRows ─────────────────────────────────────────────────────────

test("pickPeerRows excludes Bluefin lanes and includes Fedora", () => {
  const items = [
    { number: 11, os_version: "Bluefin", count: "1,348,288", percent: "0.48" },
    {
      number: 18,
      os_version: "Fedora Linux 43",
      count: "658,337",
      percent: "0.23",
    },
    {
      number: 5,
      os_version: "Ubuntu 24.04 LTS",
      count: "2,990,280",
      percent: "1.06",
    },
    {
      number: 1,
      os_version: "macOS Tahoe (26)",
      count: "9,576,217",
      percent: "3.40",
    },
  ];
  const peers = pickPeerRows(items);
  assert.equal(
    peers.some((p) => p.id === "bluefin"),
    false,
  );
  assert.equal(
    peers.some((p) => p.label === "Fedora Linux 43"),
    true,
  );
  assert.equal(
    peers.some((p) => p.label === "Ubuntu 24.04 LTS"),
    true,
  );
  assert.equal(
    peers.some((p) => p.label.startsWith("macOS")),
    true,
  );
});

// ── buildWindow ──────────────────────────────────────────────────────────

test("buildWindow with empty items reports zero rows honestly", () => {
  const data = {
    start_date: "2025-08-08",
    end_date: "2026-08-08",
    total_count: 21350450,
    total_items: 9734,
    items: [],
  };
  const w = buildWindow(data);
  assert.equal(w.rows.length, 0);
  assert.equal(w.totalCount, 21350450);
  assert.equal(w.unavailable, false);
});

// ── buildPayload ─────────────────────────────────────────────────────────

test("buildPayload sets unavailable only when all windows fail", () => {
  const windows = {
    "30d": { unavailable: true, stateReason: "HTTP 500" },
    "90d": { unavailable: false, stateReason: null },
    "365d": { unavailable: true, stateReason: "HTTP 500" },
  };
  const payload = buildPayload(windows, {
    generatedAt: "2026-08-07T20:00:00Z",
  });
  assert.equal(payload.unavailable, false);

  const allBad = {
    "30d": { unavailable: true },
    "90d": { unavailable: true },
    "365d": { unavailable: true },
  };
  const bad = buildPayload(allBad, { generatedAt: "2026-08-07T20:00:00Z" });
  assert.equal(bad.unavailable, true);
});
