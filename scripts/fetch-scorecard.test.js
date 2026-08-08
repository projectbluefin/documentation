import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeChecks,
  appendHistory,
  buildRepo,
  buildPayload,
} from "./fetch-scorecard.js";

test("normalizeChecks keeps score and reason", () => {
  const checks = normalizeChecks([
    { name: "Code-Review", score: 0, reason: "no reviews", details: "..." },
    {
      name: "Maintained",
      score: 10,
      reason: "active",
      documentation: { url: "..." },
    },
  ]);
  assert.equal(checks.length, 2);
  assert.equal(checks[0].name, "Code-Review");
  assert.equal(checks[0].score, 0);
  assert.equal(checks[0].reason, "no reviews");
  assert.equal(checks[0].details, undefined);
  assert.equal(checks[1].score, 10);
});

test("normalizeChecks maps -1 to null, not 0", () => {
  const checks = normalizeChecks([
    { name: "Packaging", score: -1, reason: "not applicable" },
  ]);
  assert.equal(checks[0].score, null);
});

test("appendHistory adds a new day", () => {
  const prior = [{ date: "2026-08-01", score: 4.0 }];
  const result = appendHistory(prior, { date: "2026-08-02", score: 4.5 });
  assert.equal(result.length, 2);
  assert.equal(result[1].date, "2026-08-02");
});

test("appendHistory replaces a same-day entry", () => {
  const prior = [
    { date: "2026-08-01", score: 4.0 },
    { date: "2026-08-02", score: 4.5 },
  ];
  const result = appendHistory(prior, { date: "2026-08-02", score: 5.0 });
  assert.equal(result.length, 2);
  assert.equal(result[1].score, 5.0);
});

test("appendHistory caps at 365 entries", () => {
  const prior = Array.from({ length: 400 }, (_, i) => ({
    date: `2025-${String(Math.floor(i / 28) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
    score: 4.0,
  }));
  const result = appendHistory(prior, { date: "2026-12-31", score: 5.0 });
  assert.equal(result.length, 365);
  assert.equal(result[result.length - 1].date, "2026-12-31");
});

test("buildRepo assembles the repo shape with history", () => {
  const apiData = {
    date: "2026-08-08",
    score: 4.5,
    checks: [{ name: "Code-Review", score: 0, reason: "none" }],
  };
  const repo = buildRepo("projectbluefin/bluefin", apiData, null);
  assert.equal(repo.repo, "projectbluefin/bluefin");
  assert.equal(repo.current.score, 4.5);
  assert.equal(repo.current.checks.length, 1);
  assert.equal(repo.history.length, 1);
  assert.equal(repo.unavailable, false);
});

test("buildPayload sets unavailable only when all repos fail", () => {
  const repos = [
    { repo: "a", unavailable: true, stateReason: "down", history: [] },
    { repo: "b", unavailable: true, stateReason: "down", history: [] },
  ];
  const payload = buildPayload(repos, { generatedAt: "2026-08-08T00:00:00Z" });
  assert.equal(payload.unavailable, true);

  repos[1].unavailable = false;
  const payload2 = buildPayload(repos, { generatedAt: "2026-08-08T00:00:00Z" });
  assert.equal(payload2.unavailable, false);
});
