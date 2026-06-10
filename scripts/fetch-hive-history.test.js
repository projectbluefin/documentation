const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  extractRenderData,
  extractMetrics,
  safeNum,
  loadHistory,
  MAX_ENTRIES,
} = require("./fetch-hive-history.js");

// ─── safeNum ────────────────────────────────────────────────────────────────

test("safeNum returns finite numbers unchanged", () => {
  assert.equal(safeNum(42), 42);
  assert.equal(safeNum(0), 0);
  assert.equal(safeNum(-1), -1);
  assert.equal(safeNum(3.14), 3.14);
});

test("safeNum returns undefined for non-finite or non-number values", () => {
  assert.equal(safeNum(NaN), undefined);
  assert.equal(safeNum(Infinity), undefined);
  assert.equal(safeNum(-Infinity), undefined);
  assert.equal(safeNum("42"), undefined);
  assert.equal(safeNum(null), undefined);
  assert.equal(safeNum(undefined), undefined);
  assert.equal(safeNum({}), undefined);
});

// ─── extractRenderData ──────────────────────────────────────────────────────

test("extractRenderData parses a simple render() call", () => {
  const html = `<script>render({"acmmLevel":3,"agents":[]})</script>`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { acmmLevel: 3, agents: [] });
});

test("extractRenderData handles nested braces in values", () => {
  const html = `render({"governor":{"budget":{"total":100},"mode":"auto"}})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, {
    governor: { budget: { total: 100 }, mode: "auto" },
  });
});

test("extractRenderData handles strings with braces inside", () => {
  const html = `render({"msg":"hello {world}"})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { msg: "hello {world}" });
});

test("extractRenderData handles escaped quotes in strings", () => {
  const html = `render({"msg":"say \\"hi\\""})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { msg: 'say "hi"' });
});

test("extractRenderData returns null for empty HTML", () => {
  assert.equal(extractRenderData(""), null);
});

test("extractRenderData returns null when no render() call exists", () => {
  assert.equal(extractRenderData("<html><body>hello</body></html>"), null);
});

test("extractRenderData returns null for malformed JSON inside render()", () => {
  const html = `render({not valid json})`;
  assert.equal(extractRenderData(html), null);
});

test("extractRenderData skips function definitions and finds data call", () => {
  // A function definition like `function render(options) { ... }` should be skipped
  const html = `function render(options) { return options; } render({"key":"value"})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { key: "value" });
});

test("extractRenderData handles single-quoted strings", () => {
  // The parser treats single quotes as string delimiters
  const html = `render({"key":"val'ue"})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { key: "val'ue" });
});

// ─── extractMetrics ─────────────────────────────────────────────────────────

test("extractMetrics returns null for null/undefined input", () => {
  assert.equal(extractMetrics(null), null);
  assert.equal(extractMetrics(undefined), null);
});

test("extractMetrics extracts full payload correctly", () => {
  const data = {
    acmmLevel: 3,
    governor: {
      mode: "auto",
      budget: { totalTokens: 1000000, used: 250000 },
      budgetPct: 25,
      queue: 5,
    },
    agents: [{ name: "a", paused: false }, { name: "b", paused: true }],
    mergeActivity: { today: 3, week: 15 },
    advisoryItems: [1, 2, 3],
  };
  const m = extractMetrics(data);
  assert.equal(m.acmmLevel, 3);
  assert.equal(m.govMode, "auto");
  assert.equal(m.budgetPct, 25);
  assert.equal(m.budgetTotal, 1000000);
  assert.equal(m.budgetUsed, 250000);
  assert.equal(m.queue, 5);
  assert.equal(m.agents, 2);
  assert.equal(m.runningAgents, 1);
  assert.equal(m.advisories, 3);
  assert.equal(m.mergedToday, 3);
  assert.equal(m.mergedWeek, 15);
});

test("extractMetrics handles missing governor gracefully", () => {
  const data = { acmmLevel: 1, agents: [] };
  const m = extractMetrics(data);
  assert.equal(m.acmmLevel, 1);
  assert.equal(m.govMode, undefined);
  assert.equal(m.agents, 0);
  assert.equal(m.runningAgents, 0);
});

test("extractMetrics uses fallback budgetPct from top-level data", () => {
  const data = {
    acmmLevel: 2,
    budgetPct: 50,
    tokenBudget: { total: 500, used: 100 },
    agents: [],
  };
  const m = extractMetrics(data);
  assert.equal(m.budgetPct, 50);
  assert.equal(m.budgetTotal, 500);
  assert.equal(m.budgetUsed, 100);
});

test("extractMetrics extracts medianMergeMins from issueToMerge", () => {
  const data = {
    acmmLevel: 3,
    agents: [],
    issueToMerge: { median_minutes: 42 },
  };
  const m = extractMetrics(data);
  assert.equal(m.medianMergeMins, 42);
});

test("extractMetrics falls back to avg_minutes when median_minutes missing", () => {
  const data = {
    acmmLevel: 3,
    agents: [],
    issueToMerge: { avg_minutes: 60 },
  };
  const m = extractMetrics(data);
  assert.equal(m.medianMergeMins, 60);
});

// ─── loadHistory ────────────────────────────────────────────────────────────

test("loadHistory returns object with entries array", () => {
  // loadHistory reads from a hardcoded path. When the file exists it loads it;
  // when missing or corrupt it returns a fresh structure. Either way, entries
  // must be an array and contributors must be an object.
  const history = loadHistory();
  assert.ok(Array.isArray(history.entries));
  assert.ok(
    typeof history.contributors === "object" && history.contributors !== null,
  );
});

// ─── MAX_ENTRIES constant ───────────────────────────────────────────────────

test("MAX_ENTRIES is 168 (14 days × 12 per day)", () => {
  assert.equal(MAX_ENTRIES, 168);
});
