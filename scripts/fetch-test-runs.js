#!/usr/bin/env node
/**
 * Fetches test-workflow run data for Project Bluefin and writes
 * static/data/test-runs.json.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * IN-FLIGHT RUNS ARE NOT FAILURES — see fetch-factory-stats.js for the full
 * rationale. `classifyRun` from scripts/lib/gh.js is the single source of
 * truth.
 *
 * Degradation: a missing token or a failed fetch produces an explicit
 * unavailable:true + stateReason payload. This script never throws, never
 * exits non-zero, and never writes a silently empty file.
 *
 * Cache TTL: 30 minutes (override with TEST_RUNS_CACHE_HOURS), bypassed with
 * --force.
 *
 * Usage: node scripts/fetch-test-runs.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  ghPaginate,
  ghFetch,
  githubToken,
  classifyRun,
  ageDays,
} from "./lib/gh.js";
import { runDurationMin } from "./fetch-factory-stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/test-runs.json");

const WINDOW_DAYS = 30;
const REPOS = [
  "projectbluefin/bluefin",
  "projectbluefin/bluefin-lts",
  "projectbluefin/dakota",
  "projectbluefin/testsuite",
];

const TEST_PATTERNS = [/test/, /e2e/, /pytest/, /validat/, /iso-validation/];
const BUILD_PUBLISH_PREFIX = /^(build|publish)/;

/**
 * True when a workflow file is a test workflow.
 * Matches basenames containing test, e2e, pytest, validate, or iso-validation.
 * Returns false for basenames starting with "build" or "publish" (e.g.
 * build-image-testing.yml builds an image, it does not test one).
 */
export function isTestWorkflow(path) {
  if (!path) return false;
  const basename = String(path).split("/").pop() ?? "";
  if (!basename) return false;
  if (BUILD_PUBLISH_PREFIX.test(basename)) return false;
  return TEST_PATTERNS.some((p) => p.test(basename));
}

/**
 * Count pass↔fail transitions over terminal runs only.
 * In-flight runs between terminal runs are ignored.
 */
export function countFlips(runs) {
  const terminal = (runs ?? []).filter((r) => r.status !== "running");
  let flips = 0;
  for (let i = 1; i < terminal.length; i++) {
    if (terminal[i].status !== terminal[i - 1].status) flips += 1;
  }
  return flips;
}

/**
 * Count consecutive failures back from the newest terminal run.
 * A trailing in-flight run does not reset the streak.
 */
export function consecutiveFailures(runs) {
  const terminal = (runs ?? []).filter((r) => r.status !== "running");
  let count = 0;
  for (let i = terminal.length - 1; i >= 0; i--) {
    if (terminal[i].status === "failed") count += 1;
    else break;
  }
  return count;
}

/** Summarize a suite's runs into passRate, flips, consecutiveFailures, lastTerminalAt. */
export function summarizeSuite(runs) {
  const list = runs ?? [];
  const terminal = list.filter((r) => r.status !== "running");
  const passed = terminal.filter((r) => r.status === "passed").length;
  const failed = terminal.filter((r) => r.status === "failed").length;
  const completed = passed + failed;

  const lastTerminal =
    terminal.length > 0 ? terminal[terminal.length - 1] : null;
  const lastTerminalAt = lastTerminal ? (lastTerminal.isoTime ?? null) : null;

  return {
    passRate:
      completed === 0 ? null : Math.round((passed / completed) * 100) / 100,
    flips: countFlips(list),
    consecutiveFailures: consecutiveFailures(list),
    lastTerminalAt,
  };
}

/**
 * Triage rank: higher = more urgent.
 * A current failure streak dominates, then staleness (days since
 * lastTerminalAt), then flip count.
 */
export function triageRank(suite) {
  const cf = suite.consecutiveFailures ?? 0;
  const staleness = suite.lastTerminalAt
    ? (ageDays(suite.lastTerminalAt) ?? 0)
    : 999;
  const flips = suite.flips ?? 0;
  return cf * 10000 + staleness * 100 + flips;
}

/** Assemble the full payload written to disk. */
export function buildPayload({ suites, generatedAt }) {
  const allUnavailable =
    suites.length > 0 && suites.every((s) => s.unavailable);
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    suites: suites.sort((a, b) => (b.triageRank ?? 0) - (a.triageRank ?? 0)),
    unavailable: allUnavailable,
    stateReason: allUnavailable
      ? (suites[0]?.stateReason ?? "No test data available")
      : null,
  };
}

async function fetchSuites(token) {
  const suites = [];
  const from = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const fromISO = from.toISOString();

  for (const repo of REPOS) {
    let workflows;
    try {
      const data = await ghFetch(`/repos/${repo}/actions/workflows`, { token });
      workflows = data.workflows ?? [];
    } catch (err) {
      console.warn(
        `fetch-test-runs: ${repo} workflows unavailable — ${err.message}`,
      );
      continue;
    }

    const testWorkflows = workflows.filter((w) => isTestWorkflow(w.path));

    for (const wf of testWorkflows) {
      const basename = String(wf.path).split("/").pop();
      const shortRepo = repo.split("/").pop();
      const id = `${shortRepo}/${basename}`;
      const label = `${shortRepo} · ${basename.replace(/\.ya?ml$/, "")}`;

      let rawRuns = [];
      try {
        rawRuns = await ghPaginate(
          `/repos/${repo}/actions/workflows/${wf.id}/runs?created=${encodeURIComponent(`>=${fromISO.slice(0, 10)}`)}`,
          { token, maxPages: 3, select: (b) => b.workflow_runs },
        );
      } catch (err) {
        console.warn(
          `fetch-test-runs: ${id} runs unavailable — ${err.message}`,
        );
      }

      const runs = rawRuns
        .map((r) => {
          const startedAt = Date.parse(r.run_started_at ?? r.created_at ?? "");
          return {
            t: Number.isFinite(startedAt) ? Math.floor(startedAt / 1000) : null,
            status: classifyRun(r),
            durationMin: runDurationMin(r),
            url: r.html_url ?? null,
            isoTime: r.run_started_at ?? r.created_at ?? null,
          };
        })
        .filter((r) => r.t !== null)
        .sort((a, b) => a.t - b.t);

      const summary = summarizeSuite(runs);

      // Strip isoTime from final run output (internal only)
      const cleanRuns = runs.map(({ isoTime, ...rest }) => rest);

      suites.push({
        id,
        repo,
        workflow: basename,
        label,
        runs: cleanRuns,
        passRate: summary.passRate,
        flips: summary.flips,
        consecutiveFailures: summary.consecutiveFailures,
        lastTerminalAt: summary.lastTerminalAt,
        triageRank: triageRank(summary),
        unavailable: false,
        stateReason: null,
      });
    }
  }

  return suites;
}

async function main() {
  const cacheTtlHours = parseFloat(process.env.TEST_RUNS_CACHE_HOURS ?? "0.5");
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-test-runs: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  const token = githubToken();
  if (!token) {
    const reason = "No GITHUB_TOKEN or GH_TOKEN environment variable is set";
    console.warn(`fetch-test-runs: ${reason} — writing unavailable payload`);
    const payload = {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      suites: [],
      unavailable: true,
      stateReason: reason,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  const suites = await fetchSuites(token);
  const payload = buildPayload({
    suites,
    generatedAt: new Date().toISOString(),
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-test-runs: wrote ${OUT} (${payload.suites.length} suites)`,
  );
  for (const s of payload.suites) {
    console.log(
      `  ${s.id}: ${s.runs.length} runs, passRate=${s.passRate}, flips=${s.flips}, cf=${s.consecutiveFailures}`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-test-runs: ${err.message}`);
    const reason = `Test run data could not be generated: ${err.message}`;
    const payload = {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      suites: [],
      unavailable: true,
      stateReason: reason,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
