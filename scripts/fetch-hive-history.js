#!/usr/bin/env node
/**
 * fetch-hive-history.js
 *
 * Runs every 2 hours via update-hive-cache.yml.
 * Appends a snapshot of key Hive metrics to static/data/hive-history.json.
 * Also refreshes all-time contributor stats from every active factory repo.
 *
 * History file format:
 * {
 *   "entries": [ { t, acmmLevel, govMode, budgetPct, queue, agents, advisories,
 *                  mergedToday, mergedWeek, runningAgents } ... ],
 *   "contributors": { "login": totalCommits, ... },
 *   "contributorsByRepo": { "repo": { "login": commits } },
 *   "lastContributorFetch": "ISO timestamp"
 * }
 */

const fs = require("fs");
const path = require("path");

const SNAPSHOT_HTML_URL =
  "https://raw.githubusercontent.com/kubestellar/docs/main/public/live/hive/bluefin/index.html";
const OUTPUT_FILE = path.join(__dirname, "../static/data/hive-history.json");

// 14 days at one entry per 2h = 168 entries
const MAX_ENTRIES = 168;

// Refresh contributor stats at most once every 6 hours
const CONTRIBUTOR_TTL_MS = 6 * 60 * 60 * 1000;

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

async function fetchText(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// fetchJson kept as utility for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Extract the render({...}) JSON blob from the hive index.html.
 * Mirrors the string-aware brace-balancing in HiveFactoryDashboard.tsx,
 * but skips function-definition occurrences by looking for render({"
 */
function extractRenderData(html) {
  // Find render({"  — the actual data call, not the function definition
  let searchFrom = 0;
  while (searchFrom < html.length) {
    const idx = html.indexOf("render(", searchFrom);
    if (idx === -1) return null;
    // The character immediately after render( must be { to be a data payload
    const afterParen = html.indexOf("{", idx + 7);
    // Make sure there's nothing but whitespace between render( and {
    const between = html.slice(idx + 7, afterParen);
    if (afterParen === -1 || between.trim() !== "") {
      searchFrom = idx + 7;
      continue;
    }
    const start = afterParen;
    let depth = 0;
    let inStr = false;
    let strChar = "";
    let escaped = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (escaped) { escaped = false; continue; }
      if (ch === "\\" && inStr) { escaped = true; continue; }
      if (inStr) { if (ch === strChar) inStr = false; continue; }
      if (ch === '"' || ch === "'") { inStr = true; strChar = ch; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    searchFrom = idx + 7;
  }
  return null;
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
  const advisoryItems = Array.isArray(data.advisoryItems) ? data.advisoryItems : [];

  return {
    acmmLevel: safeNum(data.acmmLevel),
    govMode: typeof gov.mode === "string" ? gov.mode : undefined,
    budgetPct:
      safeNum(gov.budgetPct) ??
      safeNum(data.budgetPct),
    budgetTotal:
      safeNum(govBudget.totalTokens) ??
      safeNum(govBudget.total),
    budgetUsed: safeNum(govBudget.used),
    queue:
      safeNum(gov.queue) ??
      safeNum(gov.issues),
    agents: agents.length,
    runningAgents: agents.filter((a) => !a.paused).length,
    advisories: advisoryItems.length,
    mergedToday: safeNum(mergeActivity.today),
    mergedWeek: safeNum(mergeActivity.week),
    medianMergeMins: safeNum(
      typeof data.issueToMerge === "object" && data.issueToMerge
        ? data.issueToMerge.median_minutes ?? data.issueToMerge.avg_minutes
        : undefined
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
        if (res.status === 404 || res.status === 403 || res.status === 204) break;
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
    })
  );

  return { totals, byRepo };
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
    lastContributorFetch: null,
  };
}

async function main() {
  console.log("[hive-history] Starting fetch...");

  const history = loadHistory();
  if (!Array.isArray(history.entries)) history.entries = [];
  if (!history.contributors) history.contributors = {};
  if (!history.contributorsByRepo) history.contributorsByRepo = {};

  // ── Fetch hive snapshot ──────────────────────────────────────────────────
  let metrics = null;
  try {
    console.log("[hive-history] Fetching snapshot HTML...");
    const html = await fetchText(SNAPSHOT_HTML_URL);
    const data = extractRenderData(html);
    if (data) {
      metrics = extractMetrics(data);
      console.log(
        `[hive-history] Snapshot parsed: ACMM L${metrics?.acmmLevel ?? "?"}, mode=${metrics?.govMode ?? "?"}`,
      );
    } else {
      console.warn("[hive-history] Could not extract render() data from HTML");
    }
  } catch (err) {
    console.warn(`[hive-history] Snapshot fetch failed: ${err.message}`);
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

  // ── Refresh contributor stats if stale ───────────────────────────────────
  const lastFetch = history.lastContributorFetch
    ? new Date(history.lastContributorFetch).getTime()
    : 0;
  const needsContributorRefresh = Date.now() - lastFetch > CONTRIBUTOR_TTL_MS;

  if (needsContributorRefresh) {
    console.log("[hive-history] Fetching contributor stats from factory repos...");
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
    console.log("[hive-history] Contributor stats still fresh, skipping fetch");
  }

  // ── Write output ─────────────────────────────────────────────────────────
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2), "utf8");
  console.log(`[hive-history] Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("[hive-history] Fatal:", err);
  process.exit(1);
});
