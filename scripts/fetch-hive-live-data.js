#!/usr/bin/env node
/**
 * Fetches all GitHub data needed by the Hive Factory Dashboard at build time.
 * Saves to static/data/hive-live-data.json so the browser never makes
 * unauthenticated GitHub API calls (10 req/min limit) for this data.
 *
 * Uses GITHUB_TOKEN (or GH_TOKEN) for authenticated requests (5000 req/hr).
 * Cache TTL: 15 minutes (live operational data; controlled by HIVE_LIVE_CACHE_HOURS).
 *
 * Output shape:
 * {
 *   fetchedAt: ISO string,
 *   mergedPRs: GitHubIssueItem[],
 *   discussions: GitHubIssueItem[],   // Guardians — community issues
 *   hivePRs: GitHubIssueItem[],       // Ghosts — hive-bot open PRs
 *   copilotPRs: GitHubIssueItem[],    // Ghosts — source:agent open PRs
 *   velocity: { opened: number, closed: number },
 *   testBuilds: number,
 *   tapPromotions: number,
 *   agentMergedCount: number,
 *   orgStats: {
 *     totalRepos, openIssues, openPRs, mergedThisWeek,
 *     agentReadyIssues, agentOpenPRs, sourceAgentOpen
 *   }
 * }
 */

import { writeFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/hive-live-data.json");

const CACHE_TTL_HOURS = parseFloat(process.env.HIVE_LIVE_CACHE_HOURS ?? "0.25"); // 15 min default
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;
const force = process.argv.includes("--force");

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!TOKEN) {
  console.warn("fetch-hive-live-data: no GITHUB_TOKEN — API calls will be rate-limited");
}

if (!force && existsSync(OUT)) {
  const age = Date.now() - statSync(OUT).mtimeMs;
  if (age < CACHE_TTL_MS) {
    console.log(`fetch-hive-live-data: cache fresh (${Math.round(age / 60000)}m old, TTL ${Math.round(CACHE_TTL_HOURS * 60)}m), skipping`);
    process.exit(0);
  }
}

const GH_API = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github.v3+json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function ghSearch(q, perPage = 30) {
  const url = `${GH_API}/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${perPage}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} for ${url}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

async function ghGet(path) {
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function safeSearch(q, perPage = 30) {
  try { return await ghSearch(q, perPage); } catch (e) {
    console.warn(`  warn: ${q.slice(0, 80)} — ${e.message}`);
    return { total_count: 0, items: [] };
  }
}

async function safeGet(path) {
  try { return await ghGet(path); } catch (e) {
    console.warn(`  warn: GET ${path} — ${e.message}`);
    return {};
  }
}

console.log("fetch-hive-live-data: fetching GitHub data...");

const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const org = "projectbluefin";

// All queries run in parallel — authenticated token handles the rate limit
const [
  mergedData,
  discussData,
  hivePRData,
  copilotPRData,
  openedData,
  closedData,
  testData,
  promosData,
  agentMergedData,
  orgData,
  openIssuesData,
  openPRsData,
  agentReadyData,
] = await Promise.all([
  safeSearch(`org:${org} type:pr is:merged`, 30),
  safeSearch(`org:${org} type:issue is:open -label:queue/agent-ready -label:source:agent`, 25),
  safeSearch(`org:${org} type:pr is:open author:kubestellar-hive[bot]`, 25),
  safeSearch(`org:${org} type:pr is:open label:source:agent`, 25),
  safeSearch(`org:${org} type:issue created:>${weekAgo}`, 1),
  safeSearch(`org:${org} type:issue closed:>${weekAgo}`, 1),
  safeGet(`/repos/${org}/testsuite/actions/runs?status=success&per_page=1`),
  safeSearch(`repo:ublue-os/homebrew-tap type:pr is:merged merged:>${monthAgo}`, 1),
  safeSearch(`org:${org} type:pr is:merged author:kubestellar-hive[bot] merged:>${weekAgo}`, 1),
  safeGet(`/orgs/${org}`),
  safeSearch(`org:${org} state:open type:issue`, 1),
  safeSearch(`org:${org} state:open type:pr`, 1),
  safeSearch(`org:${org} label:queue/agent-ready state:open`, 1),
]);

function mapItem(i) {
  return {
    number: i.number,
    title: i.title,
    html_url: i.html_url,
    repository_url: i.repository_url,
    updated_at: i.updated_at,
    created_at: i.created_at,
    labels: (i.labels ?? []).map((l) => ({ name: l.name, color: l.color })),
    comments: i.comments ?? 0,
    user: i.user ? { login: i.user.login, avatar_url: i.user.avatar_url } : undefined,
    draft: i.draft ?? false,
    pull_request: i.pull_request ? { merged_at: i.pull_request.merged_at } : undefined,
  };
}

const output = {
  fetchedAt: new Date().toISOString(),
  mergedPRs: (mergedData.items ?? []).map(mapItem),
  discussions: (discussData.items ?? []).map(mapItem),
  hivePRs: (hivePRData.items ?? []).map(mapItem),
  copilotPRs: (copilotPRData.items ?? []).map(mapItem),
  velocity: {
    opened: openedData.total_count ?? 0,
    closed: closedData.total_count ?? 0,
  },
  testBuilds: testData.total_count ?? testData.workflow_runs?.length ?? 0,
  tapPromotions: promosData.total_count ?? 0,
  agentMergedCount: agentMergedData.total_count ?? 0,
  orgStats: {
    totalRepos: orgData.public_repos ?? 0,
    openIssues: openIssuesData.total_count ?? 0,
    openPRs: openPRsData.total_count ?? 0,
    mergedThisWeek: closedData.total_count ?? 0,
    agentReadyIssues: agentReadyData.total_count ?? 0,
    agentOpenPRs: hivePRData.total_count ?? 0,
    sourceAgentOpen: copilotPRData.total_count ?? 0,
  },
};

writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
console.log(
  `fetch-hive-live-data: wrote ${OUT}` +
  ` (${output.mergedPRs.length} merged, ${output.discussions.length} discussions,` +
  ` ${output.hivePRs.length + output.copilotPRs.length} agent PRs)`,
);
