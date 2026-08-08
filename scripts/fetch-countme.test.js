import test from "node:test";
import assert from "node:assert/strict";

import {
  parseCsvLine,
  normalizeVariant,
  aggregateWeeks,
  mergeHistory,
  tailRange,
  buildPayload,
} from "./fetch-countme.js";

// ── parseCsvLine ─────────────────────────────────────────────────────────

test("parseCsvLine maps the documented header order", () => {
  const line =
    "2026-07-27,2026-08-03,42,Bluefin,42,Workstation,x86_64,1,updates,x86_64";
  const parsed = parseCsvLine(line);
  assert.equal(parsed.week_start, "2026-07-27");
  assert.equal(parsed.hits, 42);
  assert.equal(parsed.os_name, "Bluefin");
});

// ── normalizeVariant ─────────────────────────────────────────────────────

test("normalizeVariant folds known OS names", () => {
  assert.equal(normalizeVariant("Bluefin"), "bluefin");
  assert.equal(normalizeVariant("Bluefin LTS"), "bluefin-lts");
  assert.equal(normalizeVariant("Achillobator"), "bluefin-lts");
  assert.equal(normalizeVariant("Aurora"), "aurora");
  assert.equal(normalizeVariant("Bazzite"), "bazzite");
  assert.equal(normalizeVariant("Fedora Linux"), "fedora");
});

test("normalizeVariant folds downstream spins", () => {
  assert.equal(normalizeVariant("bluefin-dx-t1"), "bluefin");
  assert.equal(normalizeVariant("AuroraWorkstation"), "aurora");
});

test("normalizeVariant returns null for unrecognised names", () => {
  assert.equal(normalizeVariant("Rocky Linux"), null);
  assert.equal(normalizeVariant(""), null);
  assert.equal(normalizeVariant(null), null);
});

test("normalizeVariant returns bluefin-lts for Bluefin LTS, not bluefin", () => {
  // Branch order: LTS must be checked before generic bluefin
  assert.equal(normalizeVariant("Bluefin LTS"), "bluefin-lts");
  assert.notEqual(normalizeVariant("Bluefin LTS"), "bluefin");
});

// ── aggregateWeeks ───────────────────────────────────────────────────────

test("aggregateWeeks sums every arch and version into one weekly number and drops unrecognised OSes", () => {
  const rows = [
    { week_start: "2026-07-27", hits: 10, os_name: "Bluefin" },
    { week_start: "2026-07-27", hits: 20, os_name: "Bluefin" },
    { week_start: "2026-07-27", hits: 5, os_name: "Aurora" },
    { week_start: "2026-07-27", hits: 99, os_name: "Rocky Linux" },
  ];
  const weeks = aggregateWeeks(rows);
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].bluefin, 30);
  assert.equal(weeks[0].aurora, 5);
  assert.equal(weeks[0]["rocky linux"], undefined);
});

test("aggregateWeeks dropFirst drops partial leading week", () => {
  const rows = [
    { week_start: "2026-07-20", hits: 10, os_name: "Bluefin" },
    { week_start: "2026-07-27", hits: 20, os_name: "Bluefin" },
  ];
  const withDrop = aggregateWeeks(rows, { dropFirst: true });
  assert.equal(withDrop.length, 1);
  assert.equal(withDrop[0].week, "2026-07-27");

  const withoutDrop = aggregateWeeks(rows, { dropFirst: false });
  assert.equal(withoutDrop.length, 2);
});

// ── mergeHistory ─────────────────────────────────────────────────────────

test("mergeHistory keeps existing weeks, replaces overlaps, sorts ascending, never duplicates", () => {
  const prior = [
    { week: "2026-07-13", bluefin: 100 },
    { week: "2026-07-20", bluefin: 200 },
  ];
  const fresh = [
    { week: "2026-07-20", bluefin: 250 },
    { week: "2026-07-27", bluefin: 300 },
  ];
  const merged = mergeHistory(prior, fresh);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].week, "2026-07-13");
  assert.equal(merged[1].week, "2026-07-20");
  assert.equal(merged[1].bluefin, 250); // fresh wins
  assert.equal(merged[2].week, "2026-07-27");
});

// ── tailRange ────────────────────────────────────────────────────────────

test("tailRange computes correct byte ranges", () => {
  assert.deepEqual(tailRange(1000, 250), { start: 750, end: 999 });
  assert.deepEqual(tailRange(100, 250), { start: 0, end: 99 });
});

// ── buildPayload ─────────────────────────────────────────────────────────

test("buildPayload produces the documented shape", () => {
  const weeks = [{ week: "2026-07-27", bluefin: 42 }];
  const payload = buildPayload(weeks, {
    generatedAt: "2026-08-07T20:00:00Z",
  });
  assert.deepEqual(Object.keys(payload), [
    "generatedAt",
    "source",
    "unit",
    "variants",
    "weeks",
    "unavailable",
    "stateReason",
  ]);
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.weeks.length, 1);
});
