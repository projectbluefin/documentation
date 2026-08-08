#!/usr/bin/env node
/**
 * Fetches OpenSSF Scorecard results for tracked Project Bluefin repos and
 * writes static/data/scorecard-history.json — a tracked seed that accumulates
 * history, because the Scorecard API has no history endpoint.
 *
 * Degradation: a 404 for one repo records that repo as unavailable without
 * failing the others. Only when every repo fails is the top-level unavailable
 * flag set. This script never throws, never exits non-zero, and never writes a
 * silently empty file.
 *
 * The existing seed file is always read first so an error never destroys
 * accumulated history.
 *
 * Cache TTL: 24 hours (override with SCORECARD_CACHE_HOURS), bypassed with
 * --force.
 *
 * Usage: node scripts/fetch-scorecard.js [--force]
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { seedIsFresh, seedAgeMs } from "./lib/seed-cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/scorecard-history.json");

const API_BASE = "https://api.securityscorecards.dev/projects/github.com";

const REPOS = [
  "projectbluefin/bluefin",
  "projectbluefin/bluefin-lts",
  "projectbluefin/dakota",
];

const HISTORY_CAP = 365;

/**
 * Keep only {name, score, reason} from each check.
 * A check score of -1 means "not applicable" — map it to null so rendering
 * never publishes a false failure as 0.
 */
export function normalizeChecks(checks) {
  return (checks ?? []).map((c) => ({
    name: c.name,
    score: c.score === -1 ? null : c.score,
    reason: c.reason ?? null,
  }));
}

/**
 * Append a {date, score} entry to a history series.
 * Replaces a same-date entry rather than duplicating; caps at HISTORY_CAP
 * entries, dropping the oldest.
 */
export function appendHistory(prior, entry) {
  const list = [...(prior ?? [])];
  const idx = list.findIndex((h) => h.date === entry.date);
  if (idx !== -1) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  list.sort((a, b) => a.date.localeCompare(b.date));
  if (list.length > HISTORY_CAP) {
    return list.slice(list.length - HISTORY_CAP);
  }
  return list;
}

/** Build one repo entry from an API response + prior seed data. */
export function buildRepo(repo, apiData, priorRepo) {
  const priorHistory = priorRepo?.history ?? [];
  const date = apiData.date ?? new Date().toISOString().slice(0, 10);
  const score = apiData.score ?? null;
  const checks = normalizeChecks(apiData.checks);
  const historyEntry = { date, score };

  return {
    repo,
    current: { date, score, checks },
    history: appendHistory(priorHistory, historyEntry),
    unavailable: false,
    stateReason: null,
  };
}

function unavailableRepo(repo, reason, priorRepo) {
  return {
    repo,
    current: null,
    history: priorRepo?.history ?? [],
    unavailable: true,
    stateReason: reason,
  };
}

/** Assemble the full payload written to disk. */
export function buildPayload(repos, { generatedAt } = {}) {
  const allUnavailable = repos.length > 0 && repos.every((r) => r.unavailable);
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    source: `${API_BASE}/{repo}`,
    repos,
    unavailable: allUnavailable,
    stateReason: allUnavailable
      ? (repos[0]?.stateReason ?? "All repos unavailable")
      : null,
  };
}

function readSeed() {
  try {
    if (existsSync(OUT)) {
      return JSON.parse(readFileSync(OUT, "utf-8"));
    }
  } catch {
    // Corrupted seed — start fresh but don't fail.
  }
  return null;
}

async function main() {
  const cacheTtlHours = parseFloat(process.env.SCORECARD_CACHE_HOURS ?? "24");
  const force = process.argv.includes("--force");

  // Freshness comes from the payload's own generatedAt, not file mtime: this
  // seed is tracked, and git checkout stamps every tracked file with the
  // current time, so mtime would report "1m old" on every CI run and the seed
  // would never refresh. See scripts/lib/seed-cache.js.
  if (!force && seedIsFresh(OUT, cacheTtlHours)) {
    const age = seedAgeMs(OUT);
    console.log(
      `fetch-scorecard: seed generated ${Math.round((age ?? 0) / 60000)}m ago, skipping`,
    );
    return;
  }

  const seed = readSeed();
  const priorRepos = new Map((seed?.repos ?? []).map((r) => [r.repo, r]));

  const repos = await Promise.all(
    REPOS.map(async (repo) => {
      try {
        const url = `${API_BASE}/${repo}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(20000),
          headers: { "User-Agent": "bluefin-docs/fetch-scorecard" },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${repo}`);
        }
        const data = await res.json();
        return buildRepo(repo, data, priorRepos.get(repo));
      } catch (err) {
        console.warn(`fetch-scorecard: ${repo} unavailable — ${err.message}`);
        return unavailableRepo(repo, err.message, priorRepos.get(repo));
      }
    }),
  );

  const payload = buildPayload(repos);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

  for (const r of repos) {
    if (!r.unavailable) {
      console.log(
        `fetch-scorecard: ${r.repo} score=${r.current.score} checks=${r.current.checks.length} history=${r.history.length}`,
      );
    }
  }
  console.log(`fetch-scorecard: wrote ${OUT}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-scorecard: ${err.message}`);
    // Read the seed so we never destroy accumulated history.
    const seed = readSeed();
    const priorRepos = (seed?.repos ?? []).map((r) =>
      unavailableRepo(r.repo, err.message, r),
    );
    const fallback =
      priorRepos.length > 0
        ? priorRepos
        : REPOS.map((repo) => unavailableRepo(repo, err.message, null));
    const payload = buildPayload(fallback);
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
