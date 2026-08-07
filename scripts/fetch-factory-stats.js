#!/usr/bin/env node
/**
 * Fetches rolling build-health statistics for the image-publishing lanes of
 * Project Bluefin from the GitHub Actions API and writes
 * static/data/factory-stats.json, consumed by /factory.
 *
 * Per adr/0002-factory-page.md this data is regenerated here rather than
 * consumed from the lab site, so the page does not depend on lab URLs that are
 * being renamed.
 *
 * IN-FLIGHT RUNS ARE NOT FAILURES.
 * The lab site renders a 94%-passing factory as all-red because it treats a run
 * that has not finished as failed (projectbluefin/lab#616). classifyRun below
 * is the guardrail against reproducing that bug:
 *
 *   conclusion === "success"                            -> passed
 *   conclusion in failure|timed_out|startup_failure     -> failed
 *   everything else (status !== "completed", null,
 *   cancelled, skipped, action_required, neutral, ...)  -> running
 *
 * successRate is passed / (passed + failed): in-flight runs are excluded from
 * the denominator, never counted against it.
 *
 * Note for consumers: "running" is the bucket for "no verdict", not strictly
 * "still executing". Cancelled and skipped runs land there too (skipped runs in
 * particular are common — path-filtered no-ops), so `running` is usually larger
 * than the number of jobs actually executing right now. That is deliberate: the
 * alternative is inventing a verdict for a run that never produced one.
 *
 * WORKFLOW FILTER (which runs count as "publishing an image"):
 *   include  - the workflow file basename starts with "build" or "publish"
 *              (build-image-testing.yml, build-regular.yml, build-nvidia.yml,
 *              build.yml, publish.yml, build-aarch64.yml, ...)
 *   exclude  - basenames in EXCLUDED_WORKFLOW_FILES, which match the prefix but
 *              validate rather than publish (publish-smoke.yml)
 *   exclude  - runs triggered by pull_request, pull_request_target or
 *              merge_group, which build but never publish an image
 * The filter is on the workflow *path*, not its display name: display names are
 * renamed freely upstream ("Testing Images" builds from build-image-testing.yml
 * and contains neither "build" nor "publish").
 *
 * Degradation: a missing token or a failed fetch produces an explicit
 * unavailable:true + stateReason payload. This script never throws, never exits
 * non-zero, and never writes a silently empty file, so the build succeeds
 * without a token. No private or internal URLs are emitted; the payload carries
 * counts and timestamps only.
 *
 * Cache TTL: 30 minutes (override with FACTORY_STATS_CACHE_HOURS), bypassed
 * with --force.
 *
 * Usage: node scripts/fetch-factory-stats.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/factory-stats.json");

const GH_API = "https://api.github.com";
const WINDOW_DAYS = 7;
const MAX_PAGES = 10; // 1000 runs per lane is far more than a 7-day window holds

/** Lanes that publish the images the factory page reports on. */
const LANES = [
  {
    id: "bluefin-testing",
    label: "bluefin testing",
    repo: "projectbluefin/bluefin",
  },
  {
    id: "bluefin-lts",
    label: "bluefin lts",
    repo: "projectbluefin/bluefin-lts",
  },
  { id: "dakota", label: "dakota", repo: "projectbluefin/dakota" },
];

const PUBLISH_FILE_PATTERN = /^(build|publish)([-.]|$)/;
const EXCLUDED_WORKFLOW_FILES = new Set([
  "publish-smoke.yml",
  "publish-smoke.yaml",
]);
const NON_PUBLISHING_EVENTS = new Set([
  "pull_request",
  "pull_request_target",
  "merge_group",
]);

const PASSED_CONCLUSIONS = new Set(["success"]);
const FAILED_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure"]);

/**
 * Classify a workflow run as "passed", "failed" or "running".
 * Anything that is not unambiguously finished-and-green or
 * finished-and-broken is "running" — it is never counted as a failure.
 */
export function classifyRun(run) {
  if (!run || run.status !== "completed") return "running";
  if (PASSED_CONCLUSIONS.has(run.conclusion)) return "passed";
  if (FAILED_CONCLUSIONS.has(run.conclusion)) return "failed";
  return "running";
}

/** True when a run belongs to a workflow that publishes an image. */
export function isPublishRun(run) {
  if (!run) return false;
  if (NON_PUBLISHING_EVENTS.has(run.event)) return false;
  const file =
    String(run.path ?? "")
      .split("/")
      .pop() ?? "";
  if (!file || EXCLUDED_WORKFLOW_FILES.has(file)) return false;
  return PUBLISH_FILE_PATTERN.test(file);
}

/** Wall-clock minutes a run took, or null while it is still in flight. */
export function runDurationMin(run) {
  if (!run || run.status !== "completed") return null;
  const start = Date.parse(run.run_started_at ?? run.created_at ?? "");
  const end = Date.parse(run.updated_at ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null;
  return Math.round((end - start) / 60000);
}

/** Reduce a raw API run to the compact shape the page renders. */
export function normalizeRun(run) {
  const startedAt = Date.parse(run.run_started_at ?? run.created_at ?? "");
  return {
    t: Number.isFinite(startedAt) ? Math.floor(startedAt / 1000) : null,
    status: classifyRun(run),
    durationMin: runDurationMin(run),
  };
}

/** Median of a list of numbers, rounded; null when the list is empty. */
export function median(values) {
  const nums = (values ?? [])
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const value =
    nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
  return Math.round(value);
}

/** Mean of a list of numbers, rounded; null when the list is empty. */
export function average(values) {
  const nums = (values ?? []).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

/**
 * Success rate as a whole percentage over *completed* runs only.
 * Returns null when nothing has finished, so "no data yet" is distinguishable
 * from "nothing passed".
 */
export function successRate(passed, failed) {
  const completed = passed + failed;
  if (completed === 0) return null;
  return Math.round((passed / completed) * 100);
}

/** Aggregate normalized runs into the counters a lane or the totals expose. */
export function summarize(runs) {
  const list = runs ?? [];
  const passed = list.filter((r) => r.status === "passed").length;
  const failed = list.filter((r) => r.status === "failed").length;
  const running = list.filter((r) => r.status === "running").length;
  const durations = list
    .filter((r) => r.status !== "running")
    .map((r) => r.durationMin)
    .filter((d) => Number.isFinite(d));
  return {
    total: list.length,
    passed,
    failed,
    running,
    successRate: successRate(passed, failed),
    medianDurationMin: median(durations),
    averageDurationMin: average(durations),
  };
}

/** Build one lane entry from the raw runs the API returned for its repo. */
export function buildLane(lane, runs) {
  const normalized = (runs ?? [])
    .filter(isPublishRun)
    .map(normalizeRun)
    .filter((r) => r.t !== null)
    .sort((a, b) => a.t - b.t);
  const stats = summarize(normalized);
  return {
    id: lane.id,
    label: lane.label,
    repo: lane.repo,
    runs: normalized,
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    running: stats.running,
    successRate: stats.successRate,
    medianDurationMin: stats.medianDurationMin,
    unavailable: false,
    stateReason: null,
  };
}

/** A lane whose data could not be fetched — visible, not silently empty. */
export function unavailableLane(lane, reason) {
  return {
    id: lane.id,
    label: lane.label,
    repo: lane.repo,
    runs: [],
    total: 0,
    passed: 0,
    failed: 0,
    running: 0,
    successRate: null,
    medianDurationMin: null,
    unavailable: true,
    stateReason: reason,
  };
}

/** Roll every available lane up into the site-wide counters. */
export function aggregateTotals(lanes) {
  const runs = (lanes ?? [])
    .filter((l) => !l.unavailable)
    .flatMap((l) => l.runs ?? []);
  return summarize(runs);
}

/**
 * Bucket completed runs by UTC day across the window. Every day in the window
 * is present, including days with no runs, so a chart has no holes.
 * In-flight runs are not bucketed: they are neither a pass nor a fail yet.
 */
export function bucketDaily(lanes, from, to) {
  const buckets = new Map();
  const start = new Date(
    `${new Date(from).toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    buckets.set(d.toISOString().slice(0, 10), {
      date: d.toISOString().slice(0, 10),
      passed: 0,
      failed: 0,
    });
  }
  for (const lane of lanes ?? []) {
    if (lane.unavailable) continue;
    for (const run of lane.runs ?? []) {
      if (run.status === "running" || run.t === null) continue;
      const date = new Date(run.t * 1000).toISOString().slice(0, 10);
      const bucket = buckets.get(date);
      if (!bucket) continue;
      if (run.status === "passed") bucket.passed += 1;
      else if (run.status === "failed") bucket.failed += 1;
    }
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Assemble the full payload written to disk. */
export function buildPayload(lanes, { from, to, generatedAt }) {
  const allUnavailable = lanes.length > 0 && lanes.every((l) => l.unavailable);
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    window: { days: WINDOW_DAYS, from, to },
    lanes,
    totals: aggregateTotals(lanes),
    daily: bucketDaily(lanes, from, to),
    unavailable: allUnavailable,
    stateReason: allUnavailable
      ? (lanes[0]?.stateReason ?? "No lane data available")
      : null,
  };
}

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const headers = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "bluefin-docs/fetch-factory-stats",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchLaneRuns(repo, fromISO) {
  const runs = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `${GH_API}/repos/${repo}/actions/runs` +
      `?per_page=100&page=${page}&created=${encodeURIComponent(`>=${fromISO.slice(0, 10)}`)}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${repo} actions/runs`);
    const data = await res.json();
    const batch = data.workflow_runs ?? [];
    runs.push(...batch);
    if (batch.length < 100) break;
  }
  const fromMs = Date.parse(fromISO);
  return runs.filter(
    (r) => Date.parse(r.run_started_at ?? r.created_at ?? "") >= fromMs,
  );
}

async function main() {
  const cacheTtlHours = parseFloat(
    process.env.FACTORY_STATS_CACHE_HOURS ?? "0.5",
  );
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-factory-stats: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  if (!TOKEN) {
    console.warn(
      "fetch-factory-stats: no GITHUB_TOKEN/GH_TOKEN — API calls will be rate-limited",
    );
  }

  const to = new Date();
  const from = new Date(to.getTime() - WINDOW_DAYS * 86400000);
  const fromISO = from.toISOString();

  const lanes = await Promise.all(
    LANES.map(async (lane) => {
      try {
        const runs = await fetchLaneRuns(lane.repo, fromISO);
        return buildLane(lane, runs);
      } catch (err) {
        console.warn(
          `fetch-factory-stats: ${lane.repo} unavailable — ${err.message}`,
        );
        return unavailableLane(
          lane,
          `GitHub Actions data unavailable for ${lane.repo}: ${err.message}`,
        );
      }
    }),
  );

  const payload = buildPayload(lanes, {
    from: fromISO,
    to: to.toISOString(),
    generatedAt: to.toISOString(),
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-factory-stats: wrote ${OUT} (${payload.totals.total} runs, ` +
      `${payload.totals.passed} passed, ${payload.totals.failed} failed, ` +
      `${payload.totals.running} in flight, ${payload.totals.successRate ?? "n/a"}% success)`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    // Never fail the build: write an explicit unavailable payload instead.
    console.error(`fetch-factory-stats: ${err.message}`);
    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_DAYS * 86400000);
    const reason = `Factory statistics could not be generated: ${err.message}`;
    const payload = buildPayload(
      LANES.map((lane) => unavailableLane(lane, reason)),
      {
        from: from.toISOString(),
        to: to.toISOString(),
        generatedAt: to.toISOString(),
      },
    );
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
