#!/usr/bin/env node
/**
 * Fetches DORA-style deployment metrics for Project Bluefin from the GitHub
 * Actions API and writes static/data/dora.json.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * IN-FLIGHT RUNS ARE NOT FAILURES — see fetch-factory-stats.js for the full
 * rationale. `classifyRun` from scripts/lib/gh.js is the single source of
 * truth: a run that has not finished is "running" and is excluded from the
 * failure-rate denominator, never counted against it.
 *
 * WORKFLOW FILTER mirrors fetch-factory-stats.js: the workflow file basename
 * starts with "build" or "publish", excluding publish-smoke.yml and runs
 * triggered by pull_request / pull_request_target / merge_group.
 *
 * Degradation: a missing token or a failed fetch produces an explicit
 * unavailable:true + stateReason payload. This script never throws, never
 * exits non-zero, and never writes a silently empty file.
 *
 * Cache TTL: 30 minutes (override with DORA_CACHE_HOURS), bypassed with
 * --force.
 *
 * Usage: node scripts/fetch-dora.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { ghPaginate, githubToken, classifyRun } from "./lib/gh.js";
import { isPublishRun, runDurationMin } from "./fetch-factory-stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/dora.json");

const WINDOW_DAYS = 365;
const REPOS = [
  "projectbluefin/bluefin",
  "projectbluefin/bluefin-lts",
  "projectbluefin/dakota",
];

/** Extract YYYY-MM from an ISO timestamp. */
export function monthKey(iso) {
  return iso.slice(0, 7);
}

/** Median of a sorted-numeric list; null when empty. */
export function median(values) {
  const nums = (values ?? [])
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  const v = nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
  return Math.round(v);
}

/**
 * Change failure rate: failed / (passed + failed).
 * In-flight runs are excluded from the denominator. Returns null (not 0) when
 * nothing terminal has run.
 */
export function changeFailureRate({ passed, failed }) {
  const completed = passed + failed;
  if (completed === 0) return null;
  return Math.round((failed / completed) * 1000) / 1000;
}

/** Deployments (releases) per week over a window. */
export function deploymentsPerWeek(releaseCount, windowDays) {
  if (!windowDays) return null;
  return Math.round((releaseCount / (windowDays / 7)) * 10) / 10;
}

/**
 * Bucket releases and publish runs by month. Only months with actual data are
 * emitted — a gap is a gap, not a zero row.
 */
export function bucketMonthly({ releases, runs }) {
  const map = new Map();

  for (const rel of releases ?? []) {
    const d = rel.published_at ?? rel.created_at;
    if (!d) continue;
    const key = monthKey(d);
    if (!map.has(key))
      map.set(key, {
        month: key,
        releases: 0,
        publishRuns: 0,
        passed: 0,
        failed: 0,
        running: 0,
        durations: [],
      });
    map.get(key).releases += 1;
  }

  for (const run of runs ?? []) {
    const d = run.run_started_at ?? run.created_at;
    if (!d) continue;
    const key = monthKey(d);
    if (!map.has(key))
      map.set(key, {
        month: key,
        releases: 0,
        publishRuns: 0,
        passed: 0,
        failed: 0,
        running: 0,
        durations: [],
      });
    const bucket = map.get(key);
    bucket.publishRuns += 1;
    const status = classifyRun(run);
    if (status === "passed") bucket.passed += 1;
    else if (status === "failed") bucket.failed += 1;
    else bucket.running += 1;

    const dur = runDurationMin(run);
    if (dur !== null) bucket.durations.push(dur);
  }

  return [...map.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      releases: b.releases,
      publishRuns: b.publishRuns,
      passed: b.passed,
      failed: b.failed,
      running: b.running,
      failureRate: changeFailureRate(b),
      medianDurationMin: median(b.durations),
    }));
}

/** Assemble the full payload written to disk. */
export function buildPayload({ releases, runs, windowDays, generatedAt }) {
  const monthly = bucketMonthly({ releases, runs });
  const totalPassed = monthly.reduce((s, m) => s + m.passed, 0);
  const totalFailed = monthly.reduce((s, m) => s + m.failed, 0);
  const totalRunning = monthly.reduce((s, m) => s + m.running, 0);
  const totalReleases = monthly.reduce((s, m) => s + m.releases, 0);

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    windowDays,
    repos: [...REPOS],
    monthly,
    current: {
      deploymentsPerWeek: deploymentsPerWeek(totalReleases, windowDays),
      changeFailureRate: changeFailureRate({
        passed: totalPassed,
        failed: totalFailed,
        running: totalRunning,
      }),
      medianLeadTimeHours: null,
      leadTimeReason:
        "Commit-to-deploy lead time requires the commit set per release, " +
        "which is far more API calls than a docs build should make. " +
        "Publishing an estimate would be inventing a number.",
    },
    unavailable: false,
    stateReason: null,
  };
}

async function fetchAllReleases(token) {
  const all = [];
  for (const repo of REPOS) {
    const items = await ghPaginate(`/repos/${repo}/releases`, {
      token,
      maxPages: 4,
    });
    all.push(...items);
  }
  return all;
}

async function fetchAllPublishRuns(token, fromISO) {
  const all = [];
  for (const repo of REPOS) {
    const items = await ghPaginate(
      `/repos/${repo}/actions/runs?created=${encodeURIComponent(`>=${fromISO.slice(0, 10)}`)}`,
      { token, maxPages: 6, select: (b) => b.workflow_runs },
    );
    all.push(...items.filter(isPublishRun));
  }
  return all;
}

async function main() {
  const cacheTtlHours = parseFloat(process.env.DORA_CACHE_HOURS ?? "0.5");
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-dora: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  const token = githubToken();
  if (!token) {
    const reason = "No GITHUB_TOKEN or GH_TOKEN environment variable is set";
    console.warn(`fetch-dora: ${reason} — writing unavailable payload`);
    const payload = {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      repos: [...REPOS],
      monthly: [],
      current: {
        deploymentsPerWeek: null,
        changeFailureRate: null,
        medianLeadTimeHours: null,
        leadTimeReason: reason,
      },
      unavailable: true,
      stateReason: reason,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  const to = new Date();
  const from = new Date(to.getTime() - WINDOW_DAYS * 86400000);
  const fromISO = from.toISOString();

  const [releases, runs] = await Promise.all([
    fetchAllReleases(token),
    fetchAllPublishRuns(token, fromISO),
  ]);

  // Filter releases within window
  const fromMs = from.getTime();
  const windowReleases = releases.filter((r) => {
    const d = Date.parse(r.published_at ?? r.created_at ?? "");
    return Number.isFinite(d) && d >= fromMs;
  });

  const payload = buildPayload({
    releases: windowReleases,
    runs,
    windowDays: WINDOW_DAYS,
    generatedAt: to.toISOString(),
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-dora: wrote ${OUT} (${payload.monthly.length} monthly buckets, ` +
      `${JSON.stringify(payload.current)})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-dora: ${err.message}`);
    const reason = `DORA metrics could not be generated: ${err.message}`;
    const payload = {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      repos: [...REPOS],
      monthly: [],
      current: {
        deploymentsPerWeek: null,
        changeFailureRate: null,
        medianLeadTimeHours: null,
        leadTimeReason: reason,
      },
      unavailable: true,
      stateReason: reason,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
