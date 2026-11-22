#!/usr/bin/env node
/**
 * fetch-hive-history.js
 *
 * Runs every 2 hours via update-hive-cache.yml.
 * Appends a snapshot of key Hive metrics to static/data/hive-history.json.
 * Refreshes contributor counts and weekly stats every six hours when published.
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
 *   "contributorError": null | "refresh failed",
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
 *   "lastWeeklyStatsFetch": "ISO timestamp",
 *   "weeklyStatsError": null | "refresh failed"
 * }
 */

const fs = require("fs");
const path = require("path");
const { githubToken, githubHeaders } = require("./lib/request-queue");
const {
  parseGnomeReleases,
  releaseFromFeed,
  parseGnomeNickname,
  formatSeasonTitle,
  parseSeason,
  buildSeasonWindows,
  collectSeason,
  fetchSeasonCommits,
} = require("./lib/gnome-season");
const {
  assignFirstContributionOwners,
  diffMilestones,
  extractSeasonFirstContributions,
  extractSeasonProjectUnlocks,
  mergeMilestonesLedger,
} = require("./lib/recent-milestones");

// Snapshot data comes from the hosted Knuckle /api/status endpoint.
// The old raw.githubusercontent.com HTML snapshot (bluefin/index.html) is no longer published.
// HIVE_API_TOKEN: optional Bearer token for CI — if unset, snapshot fetch is skipped gracefully.
const HOSTED_INSTANCE_URL =
  "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev";
const SNAPSHOT_API_URL = `${HOSTED_INSTANCE_URL}/api/status`;
const HIVE_API_TOKEN = process.env.HIVE_API_TOKEN || "";

const OUTPUT_FILE = path.join(__dirname, "../static/data/hive-history.json");

// 14 days at one entry per 2h = 168 entries
const MAX_ENTRIES = 168;

// The site publishes every six hours; refresh both datasets on every publish.
const CONTRIBUTOR_TTL_MS = 6 * 60 * 60 * 1000;
const WEEKLY_STATS_TTL_MS = 6 * 60 * 60 * 1000;
const SEASON_TTL_MS = 6 * 60 * 60 * 1000;

// Bump when the per-season derived data shape changes. Cached historical
// seasons stamped with an older version are re-fetched so they gain the new
// fields (e.g. firstContribution markers) instead of silently staying empty.
const SEASON_FIRST_CONTRIB_VERSION = 2;

// GitHub's stats/contributors endpoint returns 52 weekly buckets per contributor.
const MAX_WEEKS = 52;

// hive-history.json is a tracked CI seed, so the weekly series is capped:
// only the top N contributors by commits inside the 52-week window keep a
// `weeks` array. Everyone else gets an empty array. 100 comfortably covers any
// leaderboard view (only ~33 contributors are active in a given year).
const MAX_WEEKLY_SERIES = 100;

// Verified active community repositories across projectbluefin.
// Excludes projectbluefin/lab per AGENTS.md data-pipeline rules.
const FALLBACK_FACTORY_REPOS = [
  "common",
  "bluefin",
  "actions",
  "dakota",
  "dakota-iso",
  "bonedigger",
  "bootc-installer",
  "knuckle",
  "server",
  "fsdk-containers",
  "finpilot",
  "testsuite",
  "utah",
  "utah-packages",
  "documentation",
  "website",
  "contribute",
  "bluefin-bling",
  "chairlift",
  "iso",
];

// Repositories that are forks or upstreams but core to projectbluefin development
const ALLOWED_CORE_FORKS = new Set(["dakota-iso", "chairlift"]);
const EXCLUDED_REPOS = new Set(["lab"]);

// Read-only upstream Bluefin repositories included in backfilled historical seasons
// (ublue-os/* is strictly read-only per AGENTS.md).
const EXTERNAL_LEADERBOARD_REPOS = ["ublue-os/bluefin", "ublue-os/bluefin-lts"];
// Archived projectbluefin repos with historical commits prior to archival.
const HISTORICAL_ARCHIVED_ORG_REPOS = ["bluefin"];
// Creation timestamp of ublue-os/bluefin (earliest commit in Bluefin history).
const BLUEFIN_PROJECT_START = "2023-03-08T18:39:32Z";

// GitHub bot and automation accounts to exclude from human contributor lists
const BOT_LOGINS = new Set([
  "mergeraptor",
  "renovate-bot",
  "github-actions",
  "semantic-release-bot",
  "Copilot",
  "copilot",
  "web-flow",
  "scanner",
  "sec-check",
  "ci-maintainer",
  "reviewer",
  "architect",
  "quality",
  "codex",
  "claude",
  "unknown",
  "hive-agent",
]);
const GH_API = "https://api.github.com";
const REGISTRY_URL = "https://hive.hivecommons.dev/api/registry";
const TARGET_ORG = "projectbluefin";

function ghHeaders() {
  return githubHeaders(githubToken(), {
    userAgent: "bluefin-hive-history/1.0",
  });
}

function registryHeaders() {
  return { "User-Agent": "bluefin-hive-history/1.0" };
}

function safeNum(v) {
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

function trackedProjectRepos(data) {
  const hive = data?.hives?.find((entry) => entry?.org === TARGET_ORG);
  return Array.isArray(hive?.repos)
    ? [
        ...new Set(
          hive.repos.filter(
            (repo) => typeof repo === "string" && !EXCLUDED_REPOS.has(repo),
          ),
        ),
      ]
    : [];
}

async function fetchTrackedProjectRepos() {
  // Prefer live listing of non-fork, active repos from the projectbluefin org
  try {
    const url = `${GH_API}/orgs/${TARGET_ORG}/repos?per_page=100&type=public`;
    const res = await fetch(url, { headers: ghHeaders() });
    if (res.ok) {
      const repos = await res.json();
      if (Array.isArray(repos) && repos.length > 0) {
        const active = repos
          .filter(
            (r) =>
              !r.archived &&
              (!r.fork || ALLOWED_CORE_FORKS.has(r.name)) &&
              !EXCLUDED_REPOS.has(r.name) &&
              typeof r.name === "string",
          )
          .map((r) => r.name);
        if (active.length > 0)
          return [...new Set([...active, ...ALLOWED_CORE_FORKS])];
      }
    }
  } catch {
    // Fall back to registry or hardcoded list below
  }

  try {
    const res = await fetch(REGISTRY_URL, { headers: registryHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const repos = trackedProjectRepos(await res.json());
    if (repos.length === 0) throw new Error(`no ${TARGET_ORG} repos`);
    return repos;
  } catch (err) {
    console.warn(
      `[hive-history] Repository discovery fallback (${err.message}) — using default set`,
    );
    return FALLBACK_FACTORY_REPOS;
  }
}
function extractHiveContributorTiers(rows = []) {
  const nextTiers = {};
  if (!Array.isArray(rows)) return nextTiers;
  for (const row of rows) {
    if (row && row.github_username && row.trust_tier !== "agent") {
      const a2 = row.achievement_2 || {};
      const localCount = Number(a2.local) || 0;
      nextTiers[row.github_username] = {
        tier: row.trust_tier || "newcomer",
        tasks: Number(row.tasks_completed) || 0,
        ...(localCount > 0 ? { local: localCount, primaryModel: "local" } : {}),
        ...(row.registered_at ? { registeredAt: row.registered_at } : {}),
      };
    }
  }
  return nextTiers;
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

/** Fetch complete, paginated contributor counts for every tracked repo. */
async function fetchContributors(repos = FALLBACK_FACTORY_REPOS) {
  const byRepo = {};
  const totals = {};

  await Promise.all(
    repos.map(async (repo) => {
      const repoMap = {};
      let url = `${GH_API}/repos/projectbluefin/${repo}/contributors?per_page=100&anon=false`;
      while (url) {
        const res = await fetch(url, { headers: ghHeaders() });
        if (res.status === 204) break;
        if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
        const contributors = await res.json();
        if (!Array.isArray(contributors))
          throw new Error(`${repo}: invalid contributor response`);
        for (const c of contributors) {
          if (!c.login || c.login.endsWith("[bot]") || BOT_LOGINS.has(c.login))
            continue;
          repoMap[c.login] = (repoMap[c.login] || 0) + (c.contributions || 0);
        }
        const link = res.headers.get("Link") || "";
        url = link.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
      }
      byRepo[repo] = repoMap;
    }),
  );

  for (const repoMap of Object.values(byRepo)) {
    for (const [login, count] of Object.entries(repoMap)) {
      totals[login] = (totals[login] || 0) + count;
    }
  }
  if (Object.keys(totals).length === 0)
    throw new Error("no contributor data returned");
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
async function fetchContributorWeeklyStats(
  repos = FALLBACK_FACTORY_REPOS,
  { existingStats = {}, existingWeekStarts = [] } = {},
) {
  const windows = computeStatsWindows();
  const acc = createStatsAccumulator();

  // Seed accumulator with known timestamps if available
  for (const ts of existingWeekStarts) {
    if (typeof ts === "number" && ts > 0) acc.weekStarts[ts] = true;
  }

  const failedRepos = [];

  await Promise.all(
    repos.map(async (repo) => {
      const url = `${GH_API}/repos/projectbluefin/${repo}/stats/contributors`;
      for (let attempts = 1; attempts <= 4; attempts++) {
        const res = await fetch(url, { headers: ghHeaders() });
        if (res.status === 204 || res.status === 404) return;
        if (res.status === 202) {
          if (attempts === 4) {
            failedRepos.push(`${repo} (computing)`);
            return;
          }
          await new Promise((r) => setTimeout(r, 1500 * attempts));
          continue;
        }
        if (!res.ok) {
          failedRepos.push(`${repo} (HTTP ${res.status})`);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          failedRepos.push(`${repo} (invalid format)`);
          return;
        }
        accumulateRepoStats(acc, repo, data, windows);
        return;
      }
    }),
  );

  if (Object.keys(acc.stats).length === 0) {
    throw new Error(
      failedRepos.length > 0
        ? `weekly stats unavailable: ${failedRepos.join(", ")}`
        : "no weekly stats returned",
    );
  }

  const finalized = finalizeContributorStats(acc);
  return {
    ...finalized,
    failedRepos,
  };
}

function backfillReposForHistory(trackedRepos = []) {
  return [
    ...new Set([
      ...trackedRepos.filter((r) => !EXCLUDED_REPOS.has(r)),
      ...HISTORICAL_ARCHIVED_ORG_REPOS,
      ...EXTERNAL_LEADERBOARD_REPOS,
    ]),
  ].sort();
}

async function fetchBluefinReleases(request) {
  const releases = [];
  let url = `${GH_API}/repos/ublue-os/bluefin/releases?per_page=100`;
  while (url) {
    const res = await request(url);
    if (!res.ok)
      throw new Error(`ublue-os/bluefin releases: HTTP ${res.status}`);
    const page = await res.json();
    if (!Array.isArray(page))
      throw new Error("ublue-os/bluefin releases: invalid response");
    for (const r of page) {
      if (r?.tag_name && (r?.published_at || r?.created_at)) {
        releases.push({
          tag_name: r.tag_name,
          published_at: r.published_at || r.created_at,
          prerelease: Boolean(r.prerelease),
        });
      }
    }
    const next = res.headers.get("Link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    if (next && new URL(next).origin !== "https://api.github.com")
      throw new Error("ublue-os/bluefin releases: unsafe pagination URL");
    url = next || null;
  }
  return releases;
}

async function resolveGnomeNicknames(gnomeReleases, request) {
  const resolved = [];
  for (const rel of gnomeReleases) {
    let name = null;
    let nicknameNote = null;
    try {
      const res = await request(rel.source);
      if (res.ok) {
        const html = await res.text();
        name = parseGnomeNickname(rel.version, html);
        if (name == null) {
          nicknameNote = `GNOME ${rel.version} has no official release nickname`;
        }
      } else {
        nicknameNote = `GNOME ${rel.version} release notes unavailable (HTTP ${res.status})`;
      }
    } catch (err) {
      nicknameNote = `GNOME ${rel.version} nickname lookup failed: ${err.message}`;
    }
    resolved.push({ ...rel, name, nicknameNote });
  }
  return resolved;
}

function summarizeCurrentBluefinReleases(bluefinReleases, startIso) {
  const startMs = Date.parse(startIso);
  if (!Number.isFinite(startMs) || !Array.isArray(bluefinReleases)) return null;
  const inWindow = bluefinReleases
    .filter((r) => Date.parse(r.published_at) >= startMs)
    .sort((a, b) => Date.parse(a.published_at) - Date.parse(b.published_at));
  if (inWindow.length === 0) {
    return {
      count: 0,
      first: null,
      last: null,
      firstDate: null,
      lastDate: null,
    };
  }
  return {
    count: inWindow.length,
    first: inWindow[0].tag_name,
    last: inWindow[inWindow.length - 1].tag_name,
    firstDate: inWindow[0].published_at,
    lastDate: inWindow[inWindow.length - 1].published_at,
  };
}

function loadHistory(file = OUTPUT_FILE) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
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
    contributorError: null,
    weeklyStatsError: null,
    milestonesError: null,
    hiveContributorTiers: {},
    milestones: [],
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
  if (!history.hiveContributorTiers) history.hiveContributorTiers = {};
  if (!Array.isArray(history.milestones)) history.milestones = [];
  const trackedRepos = await fetchTrackedProjectRepos();

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

  // ── Fetch hosted Hive leaderboard for trust tier and task milestones ──────
  try {
    const lbUrl = `${HOSTED_INSTANCE_URL}/api/leaderboard`;
    console.log(`[hive-history] Fetching ${lbUrl}...`);
    const res = await fetch(lbUrl, { signal: AbortSignal.timeout(15000) });
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data.leaderboard) ? data.leaderboard : [];
      const nextTiers = extractHiveContributorTiers(rows);
      if (Object.keys(nextTiers).length > 0) {
        const detectedAt = new Date().toISOString();
        const diffEvents = diffMilestones(
          history.hiveContributorTiers,
          nextTiers,
          detectedAt,
        );
        if (diffEvents.length > 0) {
          console.log(
            `[hive-history] Detected ${diffEvents.length} new Hive milestone(s)`,
          );
          // Keep the whole season stream: a newest-N cap here would evict the
          // oldest milestones (and thus the earliest season weeks) from the
          // published ledger.
          history.milestones = mergeMilestonesLedger(
            history.milestones,
            diffEvents,
          );
        }
        history.hiveContributorTiers = nextTiers;
      }
      history.milestonesError = null;
    } else {
      history.milestonesError = `Hive leaderboard HTTP ${res.status}`;
      console.warn(
        `[hive-history] /api/leaderboard returned HTTP ${res.status}`,
      );
    }
  } catch (err) {
    history.milestonesError = `Hive leaderboard unavailable: ${err.message}`;
    console.warn(
      `[hive-history] Hive leaderboard fetch failed: ${err.message}`,
    );
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
  const forceRefresh =
    process.argv.includes("--force") || process.env.FORCE_REFRESH === "1";
  const lastFetch = history.lastContributorFetch
    ? new Date(history.lastContributorFetch).getTime()
    : 0;
  const needsContributorRefresh =
    forceRefresh || Date.now() - lastFetch > CONTRIBUTOR_TTL_MS;
  if (needsContributorRefresh) {
    console.log(
      "[hive-history] Fetching all-time contributor counts from factory repos...",
    );
    try {
      const { totals, byRepo } = await fetchContributors(trackedRepos);
      history.contributors = totals;
      history.contributorsByRepo = byRepo;
      history.lastContributorFetch = new Date().toISOString();
      history.contributorError = null;
      const humanCount = Object.keys(totals).length;
      const totalCommits = Object.values(totals).reduce((s, n) => s + n, 0);
      console.log(
        `[hive-history] Contributors: ${humanCount} humans, ${totalCommits} total commits`,
      );
    } catch (err) {
      history.contributorError = `GitHub contributor refresh failed (${err.message}); showing last complete snapshot`;
      console.warn(`[hive-history] ${history.contributorError}`);
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
  const needsWeeklyRefresh =
    forceRefresh || Date.now() - lastWeeklyFetch > WEEKLY_STATS_TTL_MS;
  if (needsWeeklyRefresh) {
    console.log(
      "[hive-history] Fetching weekly contributor stats (stats/contributors)...",
    );
    try {
      const stats = await fetchContributorWeeklyStats(trackedRepos, {
        existingStats: history.contributorStats,
        existingWeekStarts: history.contributorWeekStarts,
      });
      history.contributorStats = stats.stats;
      history.contributorWeekStarts = stats.weekStarts;
      if (stats.failedRepos && stats.failedRepos.length > 0) {
        // Keep timestamp stale so the next scheduled run retries the computing repos
        history.weeklyStatsError = `Partial update: stats computing for ${stats.failedRepos.join(", ")}`;
      } else {
        history.lastWeeklyStatsFetch = new Date().toISOString();
        history.weeklyStatsError = null;
      }
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
      history.weeklyStatsError = `GitHub weekly stats refresh failed (${err.message}); showing last complete snapshot`;
      console.warn(`[hive-history] ${history.weeklyStatsError}`);
    }
  } else {
    console.log(
      "[hive-history] Weekly contributor stats still fresh, skipping",
    );
  }

  // A GNOME release defines the season boundary, independent of the OS image version.
  const isBot = (login) => login.endsWith("[bot]") || BOT_LOGINS.has(login);
  let gnomeFeedText = null;
  try {
    const feedResponse = await fetch("https://release.gnome.org/atom.xml", {
      signal: AbortSignal.timeout(15000),
    });
    if (!feedResponse.ok)
      throw new Error(`GNOME release feed: HTTP ${feedResponse.status}`);
    const feed = await feedResponse.text();
    gnomeFeedText = feed;
    const release = releaseFromFeed(feed);
    const notesResponse = await fetch(release.source, {
      signal: AbortSignal.timeout(15000),
    });
    if (!notesResponse.ok)
      throw new Error(`GNOME release notes: HTTP ${notesResponse.status}`);
    const season = parseSeason(feed, await notesResponse.text());
    const fetchedAt = Date.parse(history.season?.updatedAt ?? "");
    if (
      forceRefresh ||
      history.season?.version !== season.version ||
      !Number.isFinite(fetchedAt) ||
      history.season?.firstContribVersion !== SEASON_FIRST_CONTRIB_VERSION ||
      Date.now() - fetchedAt > SEASON_TTL_MS
    ) {
      const now = Date.now();
      const commits = await fetchSeasonCommits(
        trackedRepos,
        season.start,
        new Date(now).toISOString(),
        (url) =>
          fetch(url, {
            headers: ghHeaders(),
            signal: AbortSignal.timeout(30000),
          }),
      );
      const previousFirsts =
        history.season?.version === season.version
          ? {
              firstContributions: history.season.firstContributions,
              firstContributionCandidates:
                history.season.firstContributionCandidates,
              firstContribVersion: history.season.firstContribVersion,
            }
          : {};
      history.season = {
        ...season,
        ...collectSeason(season, commits, now, isBot),
        ...previousFirsts,
        repos: [...trackedRepos].sort(),
        updatedAt: new Date().toISOString(),
      };
      console.log(
        `[hive-history] GNOME ${season.version} ${season.name}: ${history.season.totalCommits} commits across ${trackedRepos.length} repos`,
      );
      // Extract season project breadth level-ups (stored per-season, not in persistent ledger)
      try {
        const unlocks = extractSeasonProjectUnlocks(season, commits, isBot);
        history.season.breadthUnlocks = unlocks;
        console.log(
          `[hive-history] Extracted ${unlocks.length} season breadth milestone(s)`,
        );
      } catch (err) {
        console.warn(
          `[hive-history] Failed to extract season project unlocks: ${err.message}`,
        );
      }
      // Cache the raw per-season candidates. Which season ultimately shows a
      // contributor's marker is recomputed across all seasons every run, so a
      // season whose sources failed earlier can reclaim it after recovery
      // without leaving a duplicate in a newer season.
      try {
        history.season.firstContributionCandidates =
          extractSeasonFirstContributions(season, commits, isBot);
        console.log(
          `[hive-history] Extracted ${history.season.firstContributionCandidates.length} first-contribution candidate(s)`,
        );
      } catch (err) {
        history.season.firstContributionCandidates ??= [];
        console.warn(
          `[hive-history] Failed to extract season first contributions: ${err.message}`,
        );
      }
    }
    history.seasonError = null;
  } catch (err) {
    history.seasonError = `Season data unavailable: ${err.message}${history.season ? "; showing the last complete season snapshot" : ""}`;
    console.warn(`[hive-history] ${history.seasonError}`);
  }

  // ── Backfill prior GNOME release seasons (immutable once completed) ────────
  // Current season (history.season) stays completely untouched; prior seasons
  // draw from all tracked projectbluefin/* repos + read-only ublue-os/bluefin
  // and ublue-os/bluefin-lts so every historical contributor lands in a season.
  if (history.season && gnomeFeedText) {
    try {
      const ghReq = (url) =>
        fetch(url, {
          headers: ghHeaders(),
          signal: AbortSignal.timeout(30000),
        });
      const webReq = (url) =>
        fetch(url, { signal: AbortSignal.timeout(15000) });

      const allGnomeReleases = parseGnomeReleases(gnomeFeedText);
      const currentStartMs = Date.parse(history.season.start);
      const earliestMs = Date.parse(BLUEFIN_PROJECT_START);

      // Keep only GNOME releases from the release active at BLUEFIN_PROJECT_START up to currentSeason.start
      let startIdx = 0;
      for (let i = 0; i < allGnomeReleases.length; i++) {
        if (allGnomeReleases[i].timestamp <= earliestMs) startIdx = i;
      }
      const relevantPriorReleases = allGnomeReleases
        .slice(startIdx)
        .filter((r) => r.timestamp < currentStartMs);

      const existingById = new Map(
        (Array.isArray(history.seasons) ? history.seasons : [])
          .filter((s) => s && s.id)
          .map((s) => [s.id, s]),
      );

      let bluefinReleases = [];
      let bluefinReleasesError = null;
      try {
        bluefinReleases = await fetchBluefinReleases(ghReq);
      } catch (err) {
        bluefinReleasesError = err.message;
        console.warn(
          `[hive-history] Failed to fetch ublue-os/bluefin releases: ${err.message}`,
        );
      }

      const releasesWithNicknames = await resolveGnomeNicknames(
        relevantPriorReleases,
        webReq,
      );

      const priorWindows = buildSeasonWindows(
        releasesWithNicknames,
        bluefinReleases,
        {
          earliestDate: BLUEFIN_PROJECT_START,
          currentSeasonStart: history.season.start,
        },
      );

      const backfillRepos = backfillReposForHistory(trackedRepos);
      const populatedPrior = [];

      for (const win of priorWindows) {
        const cached = existingById.get(win.id);
        const hasValidCache =
          !forceRefresh &&
          cached &&
          !cached.unavailable &&
          (!cached.failedRepos || cached.failedRepos.length === 0) &&
          cached.firstContribVersion === SEASON_FIRST_CONTRIB_VERSION &&
          typeof cached.generatedAt === "string" &&
          Number.isFinite(Date.parse(cached.generatedAt));

        if (hasValidCache) {
          populatedPrior.push({
            ...win,
            ...cached,
            seasonNumber: win.seasonNumber,
            title: win.title,
            name: win.name,
            nicknameNote: win.nicknameNote,
            boundaryMilestone: win.boundaryMilestone,
            splitRule: win.splitRule,
            bluefinReleases: win.bluefinReleases,
          });
          continue;
        }

        console.log(
          `[hive-history] Backfilling Season ${win.seasonNumber} (${win.title}: ${win.start.slice(0, 10)} → ${win.end.slice(0, 10)}) across ${backfillRepos.length} repos...`,
        );
        const { byRepo, failedRepos } = await fetchSeasonCommits(
          backfillRepos,
          win.start,
          win.end,
          ghReq,
          { allowPartial: true },
        );

        const succeededRepos = Object.keys(byRepo).sort();
        const allFailed = succeededRepos.length === 0 && failedRepos.length > 0;
        const stats = allFailed
          ? {
              byLogin: {},
              weekStarts: [],
              weeklyCommits: [],
              totalCommits: null,
            }
          : collectSeason(win, byRepo, Date.parse(win.end), isBot);
        const breadthUnlocks = allFailed
          ? []
          : extractSeasonProjectUnlocks(win, byRepo, isBot);
        // Raw candidates for this window; global ownership is resolved after
        // every season (cached and fresh) is assembled.
        const firstContributionCandidates = allFailed
          ? []
          : extractSeasonFirstContributions(win, byRepo, isBot);

        const stateReason = allFailed
          ? `Upstream sources unavailable: ${failedRepos.map((f) => `${f.repo} (${f.reason})`).join(", ")}`
          : failedRepos.length > 0
            ? `Partial source failure (${failedRepos.length}/${backfillRepos.length}): ${failedRepos.map((f) => f.repo).join(", ")}`
            : bluefinReleasesError
              ? `ublue-os/bluefin release tags unavailable: ${bluefinReleasesError}`
              : null;

        populatedPrior.push({
          ...win,
          ...stats,
          contributorCount: allFailed
            ? null
            : Object.keys(stats.byLogin).length,
          repos: succeededRepos,
          failedRepos,
          unavailable: allFailed,
          stateReason,
          breadthUnlocks,
          firstContributionCandidates,
          firstContribVersion: SEASON_FIRST_CONTRIB_VERSION,
          generatedAt: new Date().toISOString(),
        });
        console.log(
          `[hive-history] Season ${win.seasonNumber} (${win.title}): ${stats.totalCommits ?? "unavailable"} commits, ${allFailed ? "unavailable" : Object.keys(stats.byLogin).length} contributors${failedRepos.length ? ` (${failedRepos.length} failed repos)` : ""}`,
        );
      }

      const currentSeasonNumber = populatedPrior.length + 1;
      const currentSeasonEntry = {
        ...history.season,
        id: `gnome-${history.season.version}`,
        seasonNumber: currentSeasonNumber,
        title: formatSeasonTitle(history.season),
        end: null,
        isCurrent: true,
        unavailable: false,
        stateReason: history.seasonError || null,
        failedRepos: [],
        boundaryMilestone: `GNOME ${history.season.version} (${history.season.name}) → ongoing`,
        splitRule: null,
        bluefinReleases: summarizeCurrentBluefinReleases(
          bluefinReleases,
          history.season.start,
        ),
        contributorCount: Object.keys(history.season.byLogin || {}).length,
        generatedAt: history.season.updatedAt || new Date().toISOString(),
      };

      // Resolve exactly one first-contribution marker per contributor into the
      // season holding their globally earliest commit. Recomputed from raw
      // candidates every run (cached seasons included), so ownership does not
      // depend on fetch order or on an earlier partial-source failure.
      const firstContributionPools = [currentSeasonEntry, ...populatedPrior];
      const ownedFirstContributions = assignFirstContributionOwners(
        firstContributionPools,
      );
      firstContributionPools.forEach((seasonEntry, index) => {
        seasonEntry.firstContributions = ownedFirstContributions[index];
      });
      history.season.firstContributions = currentSeasonEntry.firstContributions;
      history.season.firstContribVersion = SEASON_FIRST_CONTRIB_VERSION;
      console.log(
        `[hive-history] First-contribution markers: ${ownedFirstContributions.reduce((total, events) => total + events.length, 0)} across ${firstContributionPools.length} seasons`,
      );

      // Store newest-to-oldest so consumers and tabs read directly in display order.
      history.seasons = [currentSeasonEntry, ...populatedPrior.reverse()];
      history.seasonsGeneratedAt = new Date().toISOString();
      history.seasonsError = null;
    } catch (err) {
      history.seasonsError = `Historical seasons unavailable: ${err.message}${Array.isArray(history.seasons) && history.seasons.length > 0 ? "; showing last complete snapshot" : ""}`;
      console.warn(`[hive-history] ${history.seasonsError}`);
    }
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
  backfillReposForHistory,
  BLUEFIN_PROJECT_START,
  computeStatsWindows,
  createStatsAccumulator,
  EXTERNAL_LEADERBOARD_REPOS,
  extractHiveContributorTiers,
  extractMetrics,
  fetchBluefinReleases,
  fetchContributors,
  fetchContributorWeeklyStats,
  finalizeContributorStats,
  HISTORICAL_ARCHIVED_ORG_REPOS,
  loadHistory,
  MAX_WEEKLY_SERIES,
  MAX_WEEKS,
  registryHeaders,
  resolveGnomeNicknames,
  safeNum,
  summarizeCurrentBluefinReleases,
  trackedProjectRepos,
};
