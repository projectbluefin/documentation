const test = require("node:test");
const assert = require("node:assert/strict");

const { extractRenderData, extractMetrics, safeNum } = require("./fetch-hive-history.js");

// ── safeNum ──────────────────────────────────────────────────────────────────

test("safeNum returns number for finite values", () => {
  assert.equal(safeNum(42), 42);
  assert.equal(safeNum(0), 0);
  assert.equal(safeNum(-3.14), -3.14);
});

test("safeNum returns undefined for non-finite or non-number", () => {
  assert.equal(safeNum(Infinity), undefined);
  assert.equal(safeNum(-Infinity), undefined);
  assert.equal(safeNum(NaN), undefined);
  assert.equal(safeNum("42"), undefined);
  assert.equal(safeNum(null), undefined);
  assert.equal(safeNum(undefined), undefined);
});

// ── extractRenderData ────────────────────────────────────────────────────────

test("extractRenderData extracts JSON from render() call", () => {
  const html = `<script>function render(el){} render({"acmmLevel":3,"governor":{"mode":"busy"}})</script>`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { acmmLevel: 3, governor: { mode: "busy" } });
});

test("extractRenderData skips function definition and finds data call", () => {
  const html = `function render(element) { element.innerHTML = "hi"; }
    render({"acmmLevel":5})`;
  const result = extractRenderData(html);
  assert.deepEqual(result, { acmmLevel: 5 });
});

test("extractRenderData returns null for missing render call", () => {
  assert.equal(extractRenderData("<html><body>no data</body></html>"), null);
});

test("extractRenderData returns null for malformed JSON", () => {
  const html = `render({not valid json at all})`;
  assert.equal(extractRenderData(html), null);
});

test("extractRenderData handles nested objects", () => {
  const data = {
    acmmLevel: 4,
    governor: { mode: "surge", budget: { totalTokens: 1000, used: 500 } },
    agents: [{ name: "quality", paused: false }],
  };
  const html = `render(${JSON.stringify(data)})`;
  assert.deepEqual(extractRenderData(html), data);
});

test("extractRenderData handles strings with braces and quotes", () => {
  const data = { message: "hello {world}", name: "it's a \"test\"" };
  const html = `render(${JSON.stringify(data)})`;
  const result = extractRenderData(html);
  assert.equal(result.message, "hello {world}");
});

// ── extractMetrics ───────────────────────────────────────────────────────────

test("extractMetrics returns null for null/undefined input", () => {
  assert.equal(extractMetrics(null), null);
  assert.equal(extractMetrics(undefined), null);
});

test("extractMetrics extracts all fields from full snapshot", () => {
  const data = {
    acmmLevel: 3,
    governor: {
      mode: "busy",
      budgetPct: 45,
      queue: 12,
      budget: { totalTokens: 10000, used: 4500 },
    },
    agents: [
      { name: "quality", paused: false },
      { name: "scanner", paused: true },
      { name: "docs", paused: false },
    ],
    mergeActivity: { today: 5, week: 22 },
    advisoryItems: [{ id: 1 }, { id: 2 }],
    issueToMerge: { median_minutes: 801 },
  };

  const metrics = extractMetrics(data);
  assert.equal(metrics.acmmLevel, 3);
  assert.equal(metrics.govMode, "busy");
  assert.equal(metrics.budgetPct, 45);
  assert.equal(metrics.budgetTotal, 10000);
  assert.equal(metrics.budgetUsed, 4500);
  assert.equal(metrics.queue, 12);
  assert.equal(metrics.agents, 3);
  assert.equal(metrics.runningAgents, 2);
  assert.equal(metrics.advisories, 2);
  assert.equal(metrics.mergedToday, 5);
  assert.equal(metrics.mergedWeek, 22);
  assert.equal(metrics.medianMergeMins, 801);
});

test("extractMetrics handles minimal/empty data gracefully", () => {
  const metrics = extractMetrics({});
  assert.equal(metrics.acmmLevel, undefined);
  assert.equal(metrics.govMode, undefined);
  assert.equal(metrics.agents, 0);
  assert.equal(metrics.runningAgents, 0);
  assert.equal(metrics.advisories, 0);
});

test("extractMetrics uses fallback budgetPct from root", () => {
  const data = { budgetPct: 77 };
  const metrics = extractMetrics(data);
  assert.equal(metrics.budgetPct, 77);
});

test("extractMetrics uses fallback tokenBudget from root", () => {
  const data = { tokenBudget: { totalTokens: 5000, used: 2000 } };
  const metrics = extractMetrics(data);
  assert.equal(metrics.budgetTotal, 5000);
  assert.equal(metrics.budgetUsed, 2000);
});

test("extractMetrics prefers governor.queue over governor.issues", () => {
  const data = { governor: { queue: 10, issues: 20 } };
  assert.equal(extractMetrics(data).queue, 10);
});

test("extractMetrics falls back to governor.issues when queue missing", () => {
  const data = { governor: { issues: 15 } };
  assert.equal(extractMetrics(data).queue, 15);
});

test("extractMetrics uses avg_minutes as fallback for median", () => {
  const data = { issueToMerge: { avg_minutes: 120 } };
  assert.equal(extractMetrics(data).medianMergeMins, 120);
});
