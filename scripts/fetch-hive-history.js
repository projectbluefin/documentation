#!/usr/bin/env node
/**
 * fetch-hive-history.js
 *
 * Runs every 2 hours via update-hive-cache.yml.
 * Appends a snapshot of key Hive metrics to static/data/hive-history.json.
 * Refreshes all-time contributor counts once per day (contributors endpoint).
 * Refreshes weekly contributor stats once per day (stats/contributors endpoint).
 *
 * History file format:
 * {
 *   "entries": [ { t, acmmLevel, govMode, budgetPct, queue, agents, advisories,
 *                  mergedToday, mergedWeek, runningAgents } ... ],
 *
 *   // All-time totals from /contributors endpoint
 *   "contributors": { "login": totalCommits, ... },
 *   "contributorsByRepo": { "repo": { "login": commits } },
 *   "lastContributorFetch": "ISO timestamp",
 *
 *   // Weekly breakdown from /stats/contributors endpoint
 *   // Enables monthly/weekly leaderboard windows
 *   "contributorStats": {
 *     "login": {
 *       "total": 5680,
 *       "lastWeek": 12,        // commits in last 7 days
 *       "lastMonth": 45,       // commits in last 28 days (4 weeks)
 *       "last3Months": 150,    // commits in last 91 days (13 weeks)
 *       "byRepo": { "repo": commits },
 *       "weeks": [0, 3, 7, ...] // commits per week, oldest-first, summed across
 *                               // every tracked repo. Aligned index-for-index
 *                               // with the top-level contributorWeekStarts
 *                               // grid (at most 52 entries, one per week).
 *                               // Empty array when the contributor has no
 *                               // commits in the window or no series was kept.
 *     }
 *   },
 *
 *   // Shared week grid for contributorStats[*].weeks — unix seconds of each
 *   // week start, oldest-first, at most 52 entries. Index i of any weeks[]
 *   // array refers to contributorWeekStarts[i].
 *   "contributorWeekStarts": [1735689600, ...],
 *
 *   "lastWeeklyStatsFetch": "ISO timestamp"
 * }
 */

const fs = require("fs");
const path = require("path");

// Snapshot data comes from the hosted Knuckle /api/status endpoint.
// The old raw.githubusercontent.com HTML snapshot (bluefin/index.html) is no longer published.
// HIVE_API_TOKEN: optional Bearer token for CI — if unset, snapshot fetch is skipped gracefully.
const HOSTED_INSTANCE_URL =
  "https://hosted-projectbluefin-knuckle-gjvq.hive.kubestellar.io";
const SNAPSHOT_API_URL = `${HOSTED_INSTANCE_URL}/api/status`;
const HIVE_API_TOKEN = process.env.HIVE_API_TOKEN || "";

const OUTPUT_FILE = path.join(__dirname, "../static/data/hive-history.json");

// 14 days at one entry per 2h = 168 entries
const MAX_ENTRIES = 168;

// Refresh all-time contributor counts once per day
const CONTRIBUTOR_TTL_MS = 24 * 60 * 60 * 1000;

// Refresh weekly stats once per day (stats/contributors is expensive: 1 req/repo)
const WEEKLY_STATS_TTL_MS = 24 * 60 * 60 * 1000;

// GitHub's stats/contributors endpoint returns 52 weekly buckets per contributor.
const MAX_WEEKS = 52;

// hive-history.json is a tracked CI seed, so the weekly series is capped:
// only the top N contributors by commits inside the 52-week window keep a
// `weeks` array. Everyone else gets an empty array. 100 comfortably covers any
// leaderboard view (only ~33 contributors are active in a given year).
const MAX_WEEKLY_SERIES = 100;

// All active factory repos
const FACTORY_REPOS = [
  "bluefin",
  "common",
  "documentation",
  "actions",
  "bluefin-lts",
  "dakota",
  "bonedigger",
  "bootc-installer",
  "knuckle",
  "testsuite",
  "website",
  "brew",
  "iso",
  "wolfictl",
  "fisherman",
];

// GitHub bot accounts to exclude from human contributor lists
// Any login ending in [bot] is also excluded
const BOT_LOGINS = new Set([
  "mergeraptor",
  "renovate-bot",
  "github-actions",
  "semantic-release-bot",
  "Copilot",
  "copilot",
]);

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const GH_API = "https://api.github.com";

function ghHeaders() {
  const h = { "User-Agent": "bluefin-hive-history/1.0" };
  if (GH_TOKEN) h["Authorization"] = `Bearer ${GH_TOKEN}`;
  return h;
}

function safeNum(v) {
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

function extractMetrics(data) {
  if (!data) return null;
  const gov = (typeof data.governor === "object" && data.governor) || {};
  const govBudget =
    (typeof gov.budget === "object" && gov.budget) ||
    (typeof data.tokenBudget === "object" && data.tokenBudget) ||
    {};
  const agents = Array.isArray(data.agents) ? data.agents : [];
  const mergeActivity =
    (typeof data.mergeActivity === "object" && data.mergeActivity) || {};
  const advisoryItems = Array.isArray(data.advisoryItems)
    ? data.advisoryItems
    : [];

  return {
    acmmLevel: safeNum(data.acmmLevel),
    govMode: typeof gov.mode === "string" ? gov.mode : undefined,
    budgetPct: safeNum(gov.budgetPct) ?? safeNum(data.budgetPct),
    budgetTotal: safeNum(govBudget.totalTokens) ?? safeNum(govBudget.total),
    budgetUsed: safeNum(govBudget.used),
    queue: safeNum(gov.queue) ?? safeNum(gov.issues),
    agents: agents.length,
    runningAgents: agents.filter((a) => !a.paused).length,
    advisories: advisoryItems.length,
    mergedToday: safeNum(mergeActivity.today),
    mergedWeek: safeNum(mergeActivity.week),
    medianMergeMins: safeNum(
      typeof data.issueToMerge === "object" && data.issueToMerge
        ? (data.issueToMerge.median_minutes ?? data.issueToMerge.avg_minutes)
        : undefined,
    ),
  };
}

/**
 * Fetch /repos/projectbluefin/{repo}/contributors for each factory repo,
 * handle pagination, aggregate into { login: totalCommits }.
 * Skips 404s and 403s gracefully.
 */
async function fetchContributors() {
  const totals = {};
  const byRepo = {};

  await Promise.allSettled(
    FACTORY_REPOS.map(async (repo) => {
      const repoMap = {};
      let url = `${GH_API}/repos/projectbluefin/${repo}/contributors?per_page=100&anon=false`;
      let pages = 0;
      while (url && pages < 10) {
        pages++;
        let res;
        try {
          res = await fetch(url, { headers: ghHeaders() });
        } catch {
          break;
        }
        if (res.status === 404 || res.status === 403 || res.status === 204)
          break;
        if (!res.ok) break;
        let contributors;
        try {
          contributors = await res.json();
        } catch {
          break;
        }
        if (!Array.isArray(contributors)) break;
        for (const c of contributors) {
          if (!c.login) continue;
          // Skip any bot account (suffix [bot] or known bot logins)
          if (c.login.endsWith("[bot]") || BOT_LOGINS.has(c.login)) continue;
          const count = c.contributions || 0;
          repoMap[c.login] = (repoMap[c.login] || 0) + count;
          totals[c.login] = (totals[c.login] || 0) + count;
        }
        // follow pagination
        const link = res.headers.get("Link") || "";
        const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/);
        url = nextMatch ? nextMatch[1] : null;
      }
      if (Object.keys(repoMap).length > 0) {
        byRepo[repo] = repoMap;
      }
    }),
  );

  return { totals, byRepo };
}

/**
 * Time-window cut-offs (unix seconds) used to bucket weekly commit counts.
 */
function computeStatsWindows(nowMs = Date.now()) {
  const nowSec = Math.floor(nowMs / 1000);
  return {
    weekAgo: nowSec - 7 * 86400,
    monthAgo: nowSec - 28 * 86400, // 4 weeks
    threeMonthsAgo: nowSec - 91 * 86400, // 13 weeks
  };
}

/**
 * Mutable accumulator shared by every repo response.
 *
 *   stats      — per-login aggregates written straight to contributorStats
 *   weeks      — per-login { [weekStartSeconds]: commits }, summed across repos
 *   weekStarts — every week-start timestamp seen, forming the shared x-axis grid
 */
function createStatsAccumulator() {
  return { stats: {}, weeks: {}, weekStarts: {} };
}

/**
 * Fold one repo's /stats/contributors response into the accumulator.
 * Pure apart from mutating `acc`; safe to call in any order.
 */
function accumulateRepoStats(acc, repo, data, windows) {
  if (!Array.isArray(data)) return acc;
  const { weekAgo, monthAgo, threeMonthsAgo } = windows;

  for (const entry of data) {
    const login = entry?.author?.login;
    if (!login) continue;
    if (login.endsWith("[bot]") || BOT_LOGINS.has(login)) continue;
    const total = typeof entry.total === "number" ? entry.total : 0;
    if (total === 0) continue;

    // Sum weekly commit counts for each time window
    let lastWeek = 0;
    let lastMonth = 0;
    let last3Months = 0;
    if (Array.isArray(entry.weeks)) {
      for (const w of entry.weeks) {
        const wt = typeof w?.w === "number" ? w.w : 0;
        const wc = typeof w?.c === "number" ? w.c : 0;
        if (wt > 0) acc.weekStarts[wt] = true;
        if (wc === 0) continue;
        if (wt >= weekAgo) lastWeek += wc;
        if (wt >= monthAgo) lastMonth += wc;
        if (wt >= threeMonthsAgo) last3Months += wc;
        if (wt > 0) {
          if (!acc.weeks[login]) acc.weeks[login] = {};
          acc.weeks[login][wt] = (acc.weeks[login][wt] || 0) + wc;
        }
      }
    }

    if (!acc.stats[login]) {
      acc.stats[login] = {
        total: 0,
        lastWeek: 0,
        lastMonth: 0,
        last3Months: 0,
        byRepo: {},
      };
    }
    acc.stats[login].total += total;
    acc.stats[login].lastWeek += lastWeek;
    acc.stats[login].lastMonth += lastMonth;
    acc.stats[login].last3Months += last3Months;
    acc.stats[login].byRepo[repo] =
      (acc.stats[login].byRepo[repo] || 0) + total;
  }

  return acc;
}

/**
 * Attach the weekly commit series to each contributor.
 *
 * Every series is aligned to one shared grid (`weekStarts`, oldest-first, at most
 * MAX_WEEKS entries) so index i means the same week in every row. Contributors
 * with no commits in the window — or outside the top `maxSeries` most active in
 * that window — get an empty array, which keeps the tracked seed file small.
 */
function finalizeContributorStats(
  acc,
  { maxWeeks = MAX_WEEKS, maxSeries = MAX_WEEKLY_SERIES } = {},
) {
  const stats = acc.stats;
  const weekStarts = Object.keys(acc.weekStarts)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
    .slice(-maxWeeks);

  const series = {};
  for (const login of Object.keys(stats)) {
    const buckets = acc.weeks[login];
    const row = buckets ? weekStarts.map((ts) => buckets[ts] || 0) : [];
    series[login] = row.some((n) => n > 0) ? row : [];
  }

  // Rank by commits inside the window so the most recently active contributors
  // keep their sparkline when the cap bites, not just the all-time veterans.
  const ranked = Object.keys(series)
    .filter((login) => series[login].length > 0)
    .sort((a, b) => {
      const sum = (l) => series[l].reduce((s, n) => s + n, 0);
      return (
        sum(b) - sum(a) ||
        (stats[b].total || 0) - (stats[a].total || 0) ||
        a.localeCompare(b)
      );
    });
  const withSeries = new Set(ranked.slice(0, maxSeries));

  for (const login of Object.keys(stats)) {
    stats[login].weeks = withSeries.has(login) ? series[login] : [];
  }

  return { stats, weekStarts };
}

/**
 * Fetch weekly contributor stats via /repos/{owner}/{repo}/stats/contributors.
 * Returns lastWeek / lastMonth / last3Months windows per contributor plus the
 * raw weekly commit series (see finalizeContributorStats).
 *
 * The endpoint may return 202 while GitHub computes stats. We retry up to 3 times
 * with a 2-second back-off per repo.
 *
 * Returns: { stats: { [login]: { total, lastWeek, lastMonth, last3Months, byRepo, weeks } },
 *            weekStarts: number[] }
 */
async function fetchContributorWeeklyStats() {
  const windows = computeStatsWindows();
  const acc = createStatsAccumulator();

  await Promise.allSettled(
    FACTORY_REPOS.map(async (repo) => {
      const url = `${GH_API}/repos/projectbluefin/${repo}/stats/contributors`;
      let attempts = 0;
      let data = null;
      while (attempts < 4) {
        attempts++;
        let res;
        try {
          res = await fetch(url, { headers: ghHeaders() });
        } catch {
          break;
        }
        if (res.status === 404 || res.status === 403 || res.status === 204)
          break;
        if (res.status === 202) {
          // GitHub is computing stats — wait and retry
          await new Promise((r) => setTimeout(r, 2000 * attempts));
          continue;
        }
        if (!res.ok) break;
        try {
          data = await res.json();
        } catch {
          break;
        }
        break;
      }
      accumulateRepoStats(acc, repo, data, windows);
    }),
  );

  return finalizeContributorStats(acc);
}

function loadHistory() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    }
  } catch {
    // ignore corrupt file — start fresh
  }
  return {
    entries: [],
    contributors: {},
    contributorsByRepo: {},
    contributorStats: {},
    contributorWeekStarts: [],
    lastContributorFetch: null,
    lastWeeklyStatsFetch: null,
  };
}

async function main() {
  console.log("[hive-history] Starting fetch...");

  const history = loadHistory();
  if (!Array.isArray(history.entries)) history.entries = [];
  if (!history.contributors) history.contributors = {};
  if (!history.contributorsByRepo) history.contributorsByRepo = {};
  if (!history.contributorStats) history.contributorStats = {};
  if (!Array.isArray(history.contributorWeekStarts))
    history.contributorWeekStarts = [];

  // ── Fetch hive snapshot ──────────────────────────────────────────────────
  let metrics = null;
  if (!HIVE_API_TOKEN) {
    console.log(
      "[hive-history] HIVE_API_TOKEN not set — skipping snapshot fetch",
    );
  } else {
    try {
      console.log("[hive-history] Fetching /api/status...");
      const res = await fetch(SNAPSHOT_API_URL, {
        headers: {
          ...ghHeaders(),
          Authorization: `Bearer ${HIVE_API_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        metrics = extractMetrics(data);
        console.log(
          `[hive-history] Snapshot parsed: ACMM L${metrics?.acmmLevel ?? "?"}, mode=${metrics?.govMode ?? "?"}`,
        );
      } else {
        console.warn(
          `[hive-history] /api/status returned HTTP ${res.status} — skipping snapshot`,
        );
      }
    } catch (err) {
      console.warn(`[hive-history] Snapshot fetch failed: ${err.message}`);
    }
  }

  // ── Append history entry ─────────────────────────────────────────────────
  if (metrics) {
    const entry = { t: Date.now(), ...metrics };
    history.entries.push(entry);
    // Trim to last MAX_ENTRIES
    if (history.entries.length > MAX_ENTRIES) {
      history.entries.splice(0, history.entries.length - MAX_ENTRIES);
    }
    console.log(
      `[hive-history] History: ${history.entries.length}/${MAX_ENTRIES} entries`,
    );
  }

  // ── Refresh all-time contributor counts (daily) ───────────────────────────
  const lastFetch = history.lastContributorFetch
    ? new Date(history.lastContributorFetch).getTime()
    : 0;
  const needsContributorRefresh = Date.now() - lastFetch > CONTRIBUTOR_TTL_MS;

  if (needsContributorRefresh) {
    console.log(
      "[hive-history] Fetching all-time contributor counts from factory repos...",
    );
    try {
      const { totals, byRepo } = await fetchContributors();
      history.contributors = totals;
      history.contributorsByRepo = byRepo;
      history.lastContributorFetch = new Date().toISOString();
      const humanCount = Object.keys(totals).length;
      const totalCommits = Object.values(totals).reduce((s, n) => s + n, 0);
      console.log(
        `[hive-history] Contributors: ${humanCount} humans, ${totalCommits} total commits`,
      );
    } catch (err) {
      console.warn(`[hive-history] Contributor fetch failed: ${err.message}`);
    }
  } else {
    console.log(
      "[hive-history] All-time contributor counts still fresh, skipping",
    );
  }

  // ── Refresh weekly contributor stats (daily) ─────────────────────────────
  const lastWeeklyFetch = history.lastWeeklyStatsFetch
    ? new Date(history.lastWeeklyStatsFetch).getTime()
    : 0;
  const needsWeeklyRefresh = Date.now() - lastWeeklyFetch > WEEKLY_STATS_TTL_MS;

  if (needsWeeklyRefresh) {
    console.log(
      "[hive-history] Fetching weekly contributor stats (stats/contributors)...",
    );
    try {
      const stats = await fetchContributorWeeklyStats();
      history.contributorStats = stats.stats;
      history.contributorWeekStarts = stats.weekStarts;
      history.lastWeeklyStatsFetch = new Date().toISOString();
      const count = Object.keys(stats.stats).length;
      const activeThisWeek = Object.values(stats.stats).filter(
        (s) => s.lastWeek > 0,
      ).length;
      const withSeries = Object.values(stats.stats).filter(
        (s) => Array.isArray(s.weeks) && s.weeks.length > 0,
      ).length;
      console.log(
        `[hive-history] Weekly stats: ${count} contributors, ${activeThisWeek} active this week, ${withSeries} with a ${stats.weekStarts.length}-week series`,
      );
    } catch (err) {
      console.warn(`[hive-history] Weekly stats fetch failed: ${err.message}`);
    }
  } else {
    console.log(
      "[hive-history] Weekly contributor stats still fresh, skipping",
    );
  }

  // ── Write output ─────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2), "utf8");
  console.log(`[hive-history] Wrote ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[hive-history] Fatal:", err);
    process.exit(1);
  });
}

module.exports = {
  accumulateRepoStats,
  computeStatsWindows,
  createStatsAccumulator,
  extractMetrics,
  finalizeContributorStats,
  MAX_WEEKLY_SERIES,
  MAX_WEEKS,
};
