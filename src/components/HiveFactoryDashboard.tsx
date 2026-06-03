import React, { useCallback, useEffect, useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import styles from "./HiveFactoryDashboard.module.css";

// ── Types ──────────────────────────────────────────────────────────────────

interface HiveAgent {
  name: string;
  id: string;
  displayName: string;
  role: string;
  emoji: string;
  color: string;
  state: string;
  busy: string;
  paused: boolean;
  model?: string;
  cli?: string;
  cadence?: string;
  lastKick?: string;
  nextKick?: string;
  liveSummary?: string;
  restarts?: number;
}

interface AdvisoryItem {
  agent: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
}

interface HiveTimelineTick {
  t: number;
  mode: string;
}

interface NousStatus {
  mode?: string;
  scope?: string;
  activeExperiment?: {
    id: string;
    progressPct: number;
    elapsed: number;
    ttlSec: number;
  } | null;
  snapshotCount?: number;
  snapshotTarget?: number;
  principleCount?: number;
  hasRecommendations?: boolean;
  phases?: {
    governor?: { phase: string; iteration: number };
    repo?: { phase: string; iteration: number };
  };
}

interface HiveSnapshot {
  timestamp: string;
  hiveId: string;
  agents: HiveAgent[];
  governor?: HiveGovernor;
  beads?: HiveBeads;
  cadenceMatrix?: HiveCadenceRow[];
  health?: Record<string, unknown>;
  acmmLevel?: number;
  acmmMode?: string;
  medianMergeMins?: number;
  p90MergeMins?: number;
  advisoryCount?: number;
  advisoryItems?: AdvisoryItem[];
  advisoryIssue?: number;
  // Extended fields from full render() payload
  budgetPct?: number;
  budgetTotal?: number;
  budgetUsed?: number;
  governorQueue?: number;
  governorTimeline?: HiveTimelineTick[];
  nous?: NousStatus;
  mergedToday?: number;
  mergedThisWeek?: number;
}

interface HiveConfig {
  org: string;
  primaryRepo: string;
  repos: string[];
  ai_author: string;
  eval_interval_s: number;
}

interface DakotaStats {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  ciStatus: "success" | "failure" | "pending" | "unknown";
}

interface QueueStats {
  ready: number;
  claimed: number;
  p0: number;
}

interface HiveGovernorThresholds {
  quiet?: number;
  busy?: number;
  surge?: number;
}

interface HiveGovernor {
  mode?: string;
  active?: boolean;
  issues?: number;
  prs?: number;
  nextKick?: string;
  thresholds?: HiveGovernorThresholds;
}

interface HiveBeads {
  workers: number;
  supervisor: number;
}

interface HiveCadenceRow {
  agent: string;
  surge: string;
  busy: string;
  quiet: string;
  idle: string;
}

interface MergedPR {
  number: number;
  title: string;
  repo: string;
  author: string;
  isBot: boolean;
  updatedAt: string;
  url: string;
}

interface Velocity {
  opened: number;
  closed: number;
}

interface GitHubSearchResponse<T> {
  total_count?: number;
  items?: T[];
}

interface GitHubSearchIssueItem {
  number: number;
  title: string;
  repository_url?: string;
  pull_request?: { url?: string };
  user?: { login?: string; type?: string };
  updated_at: string;
  html_url: string;
}

interface OrgStats {
  totalRepos: number;
  openIssues: number;
  openPRs: number;
  mergedThisWeek: number;
  agentReadyIssues: number;
  agentOpenPRs: number;
  sourceAgentOpen: number;
}

interface RepoPRs {
  repo: string;
  total: number;
  agentPRs: number;
  label: string;
}

// ── Hive history types ─────────────────────────────────────────────────────

interface HiveHistoryEntry {
  t: number;
  acmmLevel?: number;
  govMode?: string;
  queue?: number;
  agents?: number;
  runningAgents?: number;
  advisories?: number;
  budgetPct?: number;
  mergedToday?: number;
  mergedThisWeek?: number;
  medianMergeMins?: number;
}

interface OrgContributor {
  login: string;
  commits: number;
  repos: string[];
}

interface ContributorStat {
  total: number;
  lastWeek: number;
  lastMonth: number;
  last3Months: number;
  byRepo: Record<string, number>;
}

interface HiveHistory {
  entries: HiveHistoryEntry[];
  contributors: Record<string, number>;
  contributorsByRepo: Record<string, Record<string, number>>;
  lastContributorFetch?: string;
  // Weekly windowed stats (populated by stats/contributors endpoint)
  contributorStats?: Record<string, ContributorStat>;
  lastWeeklyStatsFetch?: string;
}

// ── Milestone badge definitions ───────────────────────────────────────────

type MilestoneTier =
  | "contributor"   // 10+ all-time commits
  | "veteran"       // 100+ all-time commits
  | "elite"         // 500+ all-time commits
  | "legend"        // 1000+ all-time commits
  | "mythic"        // 5000+ all-time commits
  | "sprint"        // 10+ commits this week
  | "rising"        // this week > rolling avg
  | "cross";        // 3+ repos

interface MilestoneBadge {
  tier: MilestoneTier;
  label: string;
  title: string;
  color: string;
}

function computeMilestones(
  total: number,
  lastWeek: number,
  lastMonth: number,
  repos: string[],
): MilestoneBadge[] {
  const badges: MilestoneBadge[] = [];

  // All-time tier (only show the highest earned)
  if (total >= 5000) {
    badges.push({ tier: "mythic", label: "Mythic", title: "5000+ lifetime commits", color: "#ff7b72" });
  } else if (total >= 1000) {
    badges.push({ tier: "legend", label: "Legend", title: "1000+ lifetime commits", color: "#f0883e" });
  } else if (total >= 500) {
    badges.push({ tier: "elite", label: "Elite", title: "500+ lifetime commits", color: "#bc8cff" });
  } else if (total >= 100) {
    badges.push({ tier: "veteran", label: "Veteran", title: "100+ lifetime commits", color: "#58a6ff" });
  } else if (total >= 10) {
    badges.push({ tier: "contributor", label: "Contributor", title: "10+ lifetime commits", color: "#3fb950" });
  }

  // Activity badges
  if (lastWeek >= 10) {
    badges.push({ tier: "sprint", label: "Sprint", title: `${lastWeek} commits this week`, color: "#d29922" });
  }

  // Weekly vs monthly avg (rising star)
  const weeklyAvg = lastMonth > 0 ? lastMonth / 4 : 0;
  if (lastWeek > 0 && weeklyAvg > 0 && lastWeek > weeklyAvg * 1.5) {
    badges.push({ tier: "rising", label: "Rising", title: "Trending up this week", color: "#3fb950" });
  }

  // Cross-formation
  if (repos.length >= 3) {
    badges.push({ tier: "cross", label: "Multi-repo", title: `Active in ${repos.length} repos`, color: "#a371f7" });
  }

  return badges;
}



interface QueueLabel { name: string; color: string; }

interface QueueIssue {
  title: string;
  html_url: string;
  repository_url?: string;
  updated_at: string;
  labels?: QueueLabel[];
}

interface QueuePR {
  title: string;
  html_url: string;
  repository_url?: string;
  updated_at: string;
  labels?: QueueLabel[];
  _reviews?: { approved: number; changes: number };
}

interface VictoryItem {
  title: string;
  html_url: string;
  repository_url?: string;
  updated_at: string;
}

interface VictoryCategory { count: number; recent: VictoryItem[]; }

interface QueueData {
  generated: string;
  repos: string[];
  issues: { p0: QueueIssue[]; p1: QueueIssue[] };
  prs: { approved: QueuePR[]; required: QueuePR[]; none: QueuePR[] };
  victories: {
    startDate: string;
    dreams: VictoryCategory;
    relief: VictoryCategory;
    toil: VictoryCategory;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────

const SNAPSHOT_HTML_URL =
  "https://raw.githubusercontent.com/kubestellar/docs/main/public/live/hive/bluefin/index.html";
const QUEUE_URL = "https://queue.projectbluefin.io/data.json";
const GH_API = "https://api.github.com";
const DAKOTA = "projectbluefin/dakota";
const BUILD_WORKFLOW = "246164114";
const REFRESH_SECS = 300;

const SEV_COLOR: Record<string, string> = {
  high: "#f85149",
  medium: "#d29922",
  low: "#8b949e",
};

const TYPE_ICON: Record<string, string> = {
  "ci-failure": "CI",
  finding: ">>",
  bug: "!",
  feature: "+",
  "coverage-gap": "cov",
  security: "sec",
  refactor: "ref",
};

const ACMM_LEVELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: "Triage Assist", desc: "Scanner reads and reports", color: "#8b949e" },
  2: { label: "Advisory", desc: "Agents suggest, humans act", color: "#58a6ff" },
  3: { label: "Supervised Autonomy", desc: "Agents act, supervisor monitors", color: "#d29922" },
  4: { label: "Full Autonomy", desc: "Agents operate independently", color: "#f0883e" },
  5: { label: "Self-Directing", desc: "Agents define their own goals", color: "#bc8cff" },
};

// ── Frame quotes (verbatim in-game dialogue, Destinypedia) ────────────────

const FRAME_QUOTES_WORKING: string[] = [
  "Security protocols on standby.",
  "I am here for maintenance and custodial needs.",
  "Please do be careful.",
  "Strength in Light.",
  "Traveler keep you safe.",
];

const FRAME_QUOTES_IDLE: string[] = [
  "Have you seen my broom?",
  "Is theft from a frame a crime?",
  "What is my purpose?",
  "Woe is me.",
  "Life...is meaningless...",
  "All is lost....All. is. lost!",
  "Is changing jobs too late in the system cycle?",
  "Malfunctional frame...will report for recycling...",
  "I have lost, a part of me...",
  "Somebody help me!",
  "They have candy, I have nothing!",
  "Dust to dust to dust to dust!?",
  "But in that sweep of death, what dreams may come?",
  "Out, out, little purple candle...",
  "Welcome home, Guardian.",
  "If you need assistance getting acclimated, maps are available.",
  "Excuse me, Guardian.",
  "Where is it? Where is it?!",
  "What does the broom say? Broom Broom.",
  "They celebrate lost souls, but what about lost things?",
];

function pickFrameQuote(id: string, working: boolean): string {
  const pool = working ? FRAME_QUOTES_WORKING : FRAME_QUOTES_IDLE;
  const hash = Array.from(id).reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) | 0, 0);
  return pool[Math.abs(hash) % pool.length] ?? pool[0];
}

function isBotLogin(login: string): boolean {
  const l = login.toLowerCase();
  return (
    l.includes("[bot]") ||
    l.endsWith("-bot") ||
    /^(renovate|dependabot|github-actions|copilot|allcontributors|imgbot|stale|snyk)/.test(l)
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSnapshotJson(data: Record<string, unknown>): {
  snapshot: HiveSnapshot | null;
  config: HiveConfig | null;
} {
  try {
    const agents = (data.agents as HiveAgent[]) ?? [];
    const governor = (data.governor as HiveGovernor) ?? {};
    const beads = isRecord(data.beads)
      ? {
          workers: typeof data.beads.workers === "number" ? data.beads.workers : 0,
          supervisor: typeof data.beads.supervisor === "number" ? data.beads.supervisor : 0,
        }
      : undefined;
    const cadenceMatrix = Array.isArray(data.cadenceMatrix)
      ? (data.cadenceMatrix as HiveCadenceRow[])
      : undefined;
    const health = isRecord(data.health) ? data.health : undefined;
    const agentMetrics = data.agentMetrics as { outreach?: { acmm?: number } } | undefined;
    const issueToMerge = data.issueToMerge as {
      avg_minutes?: number;
      median_minutes?: number;
      p90_minutes?: number;
    } | undefined;
    const advisoryItems = (data.advisoryItems as AdvisoryItem[]) ?? [];

    // Extended: token budget from governor or top-level
    const govObj = isRecord(data.governor) ? data.governor : {};
    const budgetPct =
      typeof govObj.budgetPct === "number" ? govObj.budgetPct :
      typeof data.budgetPct === "number" ? data.budgetPct : undefined;
    const tokenBudget = isRecord(data.tokenBudget) ? data.tokenBudget :
      isRecord(govObj.budget) ? govObj.budget : null;
    const budgetTotal = typeof tokenBudget?.total === "number" ? tokenBudget.total :
      typeof tokenBudget?.totalTokens === "number" ? (tokenBudget.totalTokens as number) : undefined;
    const budgetUsed = typeof tokenBudget?.used === "number" ? tokenBudget.used :
      budgetPct != null && budgetTotal != null ? Math.round(budgetPct / 100 * budgetTotal) : undefined;

    // Extended: governor queue depth
    const governorQueue = typeof govObj.queue === "number" ? govObj.queue :
      typeof govObj.issues === "number" ? (govObj.issues as number) : undefined;

    // Extended: governor timeline (24h mode strip)
    const governorTimeline = Array.isArray(data.timeline)
      ? (data.timeline as HiveTimelineTick[])
      : Array.isArray(data.governorTimeline)
        ? (data.governorTimeline as HiveTimelineTick[])
        : undefined;

    // Extended: Nous/Strategy Lab
    const nousRaw = isRecord(data.nous) ? data.nous :
      isRecord(data.nousStatus) ? data.nousStatus : null;
    const nous: NousStatus | undefined = nousRaw ? {
      mode: typeof nousRaw.mode === "string" ? nousRaw.mode : undefined,
      scope: typeof nousRaw.scope === "string" ? nousRaw.scope : undefined,
      activeExperiment: isRecord(nousRaw.activeExperiment)
        ? {
            id: String(nousRaw.activeExperiment.id ?? ""),
            progressPct: typeof nousRaw.activeExperiment.progressPct === "number" ? nousRaw.activeExperiment.progressPct : 0,
            elapsed: typeof nousRaw.activeExperiment.elapsed === "number" ? nousRaw.activeExperiment.elapsed : 0,
            ttlSec: typeof nousRaw.activeExperiment.ttlSec === "number" ? nousRaw.activeExperiment.ttlSec : 0,
          }
        : null,
      snapshotCount: typeof nousRaw.snapshotCount === "number" ? nousRaw.snapshotCount : undefined,
      snapshotTarget: typeof nousRaw.snapshotTarget === "number" ? nousRaw.snapshotTarget : undefined,
      principleCount: typeof nousRaw.principleCount === "number" ? nousRaw.principleCount : undefined,
      hasRecommendations: typeof nousRaw.hasRecommendations === "boolean" ? nousRaw.hasRecommendations : undefined,
      phases: isRecord(nousRaw.phases) ? (nousRaw.phases as NousStatus["phases"]) : undefined,
    } : undefined;

    // Extended: merge counts from snapshot
    const mergeActivity = isRecord(data.mergeActivity) ? data.mergeActivity : null;
    const mergedToday = typeof mergeActivity?.today === "number" ? mergeActivity.today : undefined;
    const mergedThisWeek = typeof mergeActivity?.week === "number" ? mergeActivity.week : undefined;

    const snapshot: HiveSnapshot = {
      timestamp: (data.timestamp as string) ?? new Date().toISOString(),
      hiveId: (data.hiveId as string) ?? "",
      agents,
      governor,
      beads,
      cadenceMatrix,
      health,
      acmmLevel: typeof data.acmmLevel === "number" ? data.acmmLevel : agentMetrics?.outreach?.acmm ?? undefined,
      acmmMode: governor.mode,
      medianMergeMins: issueToMerge?.median_minutes ?? issueToMerge?.avg_minutes,
      p90MergeMins: issueToMerge?.p90_minutes,
      advisoryCount: advisoryItems.length,
      advisoryItems,
      advisoryIssue: (data.advisoryIssue as number) ?? undefined,
      budgetPct,
      budgetTotal,
      budgetUsed,
      governorQueue,
      governorTimeline,
      nous,
      mergedToday,
      mergedThisWeek,
    };

    const rawRepos = (data.repos as Array<{ full?: string; name?: string }>) ?? [];
    const config: HiveConfig | null =
      rawRepos.length > 0
        ? {
            org:
              (data.hiveId as string ?? "").replace(/^hive-[^-]+-/, "") ||
              "projectbluefin",
            primaryRepo: rawRepos[0]?.full ?? "",
            repos: rawRepos.map((r) => r.full ?? r.name ?? "").filter(Boolean),
            ai_author: "",
            eval_interval_s: 300,
          }
        : null;

    return { snapshot, config };
  } catch {
    return { snapshot: null, config: null };
  }
}

async function extractRenderJson(
  html: string,
): Promise<Record<string, unknown> | null> {
  // Skip render(data) function definition and render(window._lastStatus) calls.
  // Find the first render({...}) call with an object literal payload.
  let searchFrom = 0;
  while (searchFrom < html.length) {
    const callIdx = html.indexOf("render(", searchFrom);
    if (callIdx === -1) return null;
    const afterParen = callIdx + 7;
    // Skip whitespace to find what follows render(
    let j = afterParen;
    while (j < html.length && (html[j] === " " || html[j] === "\n" || html[j] === "\r")) j++;
    if (html[j] !== "{") {
      searchFrom = afterParen;
      continue;
    }
    const start = j;
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
            return JSON.parse(html.slice(start, i + 1)) as Record<string, unknown>;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
  return null;
}

async function fetchTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function cleanSummaryLine(line: string): string {
  return line
    .replace(/^[-*>#\s]+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function meaningfulSummaryLines(raw: string, count = 2): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map(cleanSummaryLine)
    .filter(
      (l) =>
        l.length > 15 &&
        !/^(summary|status|update|working on|currently):/i.test(l),
    )
    .slice(0, count);
}

function relTime(ts?: string): string {
  if (!ts) return "—";
  try {
    const diff = Math.max(Date.now() - new Date(ts).getTime(), 0);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  } catch {
    return "—";
  }
}

function parseRepoName(...sources: Array<string | undefined>): string {
  const source = sources.find(Boolean) ?? "";
  const match = source.match(/\/repos\/[^/]+\/([^/]+)(?:\/|$)/);
  if (match?.[1]) return match[1];
  const parts = source.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "repo";
}

function repoAccent(repo: string): string {
  const palette = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f85149", "#f0883e"];
  const hash = Array.from(repo).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[hash % palette.length] ?? "#58a6ff";
}

function pickAgentOfDay(agents: HiveAgent[]): HiveAgent | null {
  const working = agents
    .filter((a) => a.state === "running" && a.busy === "working")
    .sort(
      (a, b) =>
        (b.restarts ?? 0) - (a.restarts ?? 0) ||
        new Date(b.lastKick ?? 0).getTime() - new Date(a.lastKick ?? 0).getTime(),
    );
  if (working[0]) return working[0];
  return (
    [...agents].sort(
      (a, b) =>
        new Date(b.lastKick ?? 0).getTime() - new Date(a.lastKick ?? 0).getTime(),
    )[0] ?? null
  );
}

function governorModeClass(mode?: string): string {
  switch ((mode ?? "idle").toLowerCase()) {
    case "surge": return styles.govModeSurge;
    case "busy": return styles.govModeBusy;
    case "quiet": return styles.govModeQuiet;
    default: return styles.govModeIdle;
  }
}

async function parseSearchCount(
  result: PromiseSettledResult<Response>,
): Promise<number> {
  if (result.status !== "fulfilled" || !result.value.ok) return 0;
  const data = (await result.value.json()) as GitHubSearchResponse<unknown>;
  return data.total_count ?? 0;
}

async function parseMergedPRs(
  result: PromiseSettledResult<Response>,
): Promise<MergedPR[]> {
  if (result.status !== "fulfilled" || !result.value.ok) return [];
  const data = (await result.value.json()) as GitHubSearchResponse<GitHubSearchIssueItem>;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => ({
    number: item.number,
    title: item.title,
    repo: parseRepoName(item.repository_url),
    author: item.user?.login ?? "unknown",
    isBot: item.user?.type === "Bot" || isBotLogin(item.user?.login ?? ""),
    updatedAt: item.updated_at,
    url: item.html_url,
  }));
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LivePulse() {
  return (
    <span className={styles.livePulse}>
      <span className={styles.liveDot} />
      LIVE
    </span>
  );
}

function HealthBar({ active, total }: { active: number; total: number }) {
  const filled = total > 0 ? Math.round((active / total) * 10) : 0;
  return (
    <div className={styles.healthBar}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`${styles.healthBarSegment} ${
            i < filled ? styles.healthBarFilled : styles.healthBarEmpty
          }`}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  spark,
  sparkColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  spark?: number[];
  sparkColor?: SparkColor;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardBody}>
        <div
          className={styles.statValue}
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </div>
        <div className={styles.statLabel}>{label}</div>
        {sub ? <div className={styles.statSub}>{sub}</div> : null}
        {spark && spark.some((v) => v > 0) && (
          <div className={styles.statSpark}>
            <MiniSparkline data={spark} color={sparkColor} />
          </div>
        )}
      </div>
    </div>
  );
}

function FrameCard({ agent, advisoryItems: agentAdvisories }: { agent: HiveAgent; advisoryItems: AdvisoryItem[] }) {
  const isRunning = agent.state === "running";
  const isWorking = agent.busy === "working";
  const summaryLines = meaningfulSummaryLines(agent.liveSummary ?? "", 5);
  const quote = pickFrameQuote(agent.id, isWorking);
  const shortModel = (agent.model ?? "")
    .replace("claude-", "")
    .replace("gpt-", "")
    .replace("-latest", "");
  const topAdvisories = agentAdvisories.slice(0, 3);

  return (
    <div
      className={`${styles.agentCard} ${
        isRunning ? styles.agentCardActive : styles.agentCardIdle
      }`}
    >
      <div className={styles.agentCardHeader}>
        <span className={styles.agentInitial}>
          {(agent.displayName || agent.name).slice(0, 1).toUpperCase()}
        </span>
        <div className={styles.agentMeta}>
          <span className={styles.agentName}>
            {agent.displayName || agent.name}
          </span>
          <span className={styles.agentRole}>{agent.role}</span>
        </div>
        <span
          className={`${styles.agentState} ${
            isWorking
              ? styles.agentStateWorking
              : isRunning
                ? styles.agentStateRunning
                : styles.agentStatePaused
          }`}
        >
          {isWorking ? "working" : isRunning ? "running" : "paused"}
        </span>
      </div>
      {shortModel ? (
        <div className={styles.agentModel}>{shortModel}</div>
      ) : null}
      {topAdvisories.length > 0 ? (
        <div className={styles.agentSummary}>
          {topAdvisories.map((item, i) => (
            <div key={i} className={styles.frameAdvisoryItem}>
              <span style={{ color: SEV_COLOR[item.severity] ?? "#8b949e", marginRight: "0.35rem", fontVariantNumeric: "tabular-nums" }}>
                {TYPE_ICON[item.type] ?? "·"}
              </span>
              {item.title.slice(0, 90)}
            </div>
          ))}
        </div>
      ) : summaryLines.length > 0 ? (
        <div className={styles.agentSummary}>
          {summaryLines.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      ) : null}
      <div className={styles.frameQuote}>&ldquo;{quote}&rdquo;</div>
      {agent.cadence ? (
        <div className={styles.agentCadence}>{agent.cadence}</div>
      ) : null}
    </div>
  );
}

function CiBadge({ status }: { status: DakotaStats["ciStatus"] }) {
  const map = {
    success: { label: "CI PASS", cls: styles.ciBadgePass },
    failure: { label: "CI FAIL", cls: styles.ciBadgeFail },
    pending: { label: "CI PENDING", cls: styles.ciBadgePending },
    unknown: { label: "CI UNKNOWN", cls: styles.ciBadgeUnknown },
  };
  const { label, cls } = map[status] ?? map.unknown;
  return <span className={`${styles.ciBadge} ${cls}`}>{label}</span>;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 120;
  const H = 36;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 6 - (v / max) * (H - 12);
    return `${x},${y}`;
  });
  const linePts = pts.join(" ");
  const area = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${W},${H} L 0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.sparkline}
      aria-hidden="true"
    >
      <path d={area} className={styles.sparklineArea} />
      <polyline points={linePts} className={styles.sparklineLine} />
    </svg>
  );
}

type SparkColor = "default" | "green" | "amber" | "purple";

function MiniSparkline({ data, color = "default" }: { data: number[]; color?: SparkColor }) {
  if (data.length < 2) return null;
  const W = 100;
  const H = 24;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 2 - (v / max) * (H - 6);
    return `${x},${y}`;
  });
  const linePts = pts.join(" ");
  const area = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${W},${H} L 0,${H} Z`;
  const colorCls = color === "green"
    ? styles.miniSparklineGreen
    : color === "amber"
      ? styles.miniSparklineAmber
      : color === "purple"
        ? styles.miniSparklinePurple
        : "";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`${styles.miniSparkline} ${colorCls}`}
      aria-hidden="true"
    >
      <path d={area} className={styles.miniSparklineArea} />
      <polyline points={linePts} className={styles.miniSparklineLine} />
    </svg>
  );
}

function victorySparkData(recent: VictoryItem[], days = 14): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  for (const item of recent) {
    const daysAgo = (now - new Date(item.updated_at).getTime()) / 86400000;
    const idx = Math.min(Math.floor(daysAgo), days - 1);
    if (idx >= 0) buckets[days - 1 - idx]++;
  }
  return buckets;
}

function _QueueBar({ ready, claimed, p0 }: QueueStats) {
  const total = Math.max(ready + claimed, 1);
  const claimedPct = (claimed / total) * 100;
  const readyPct = (ready / total) * 100;
  return (
    <div className={styles.queueBar}>
      <div className={styles.queueBarTrack}>
        <div
          className={styles.queueBarClaimed}
          style={{ width: `${claimedPct}%` }}
          title={`${claimed} claimed`}
        />
        <div
          className={styles.queueBarReady}
          style={{ width: `${readyPct}%` }}
          title={`${ready} ready`}
        />
      </div>
      <div className={styles.queueBarLegend}>
        <span className={styles.queueClaimedLegend}>{claimed} claimed</span>
        <span className={styles.queueReadyLegend}>{ready} ready</span>
        {p0 > 0 && (
          <span className={styles.queueP0Legend}>{p0} P0</span>
        )}
      </div>
    </div>
  );
}

function PrQueueChart({ data }: { data: RepoPRs[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className={styles.prQueueChart}>
      {data.map((d) => {
        const pct = (d.total / max) * 100;
        const agentPct = d.total > 0 ? (d.agentPRs / d.total) * 100 : 0;
        return (
          <div key={d.repo} className={styles.prQueueRow}>
            <span className={styles.prQueueLabel}>{d.label}</span>
            <div className={styles.prQueueTrack}>
              <div
                className={styles.prQueueHuman}
                style={{ width: `${pct - agentPct * (pct / 100)}%` }}
              />
              <div
                className={styles.prQueueAgent}
                style={{ width: `${agentPct * (pct / 100)}%` }}
              />
            </div>
            <span className={styles.prQueueCount}>{d.total}</span>
          </div>
        );
      })}
    </div>
  );
}

function prTypeTag(title: string): { label: string; color: string } | null {
  const m = title.match(/^(feat|fix|ci|chore|refactor|docs|perf|test|revert|build|style)[\s(!/:]?/i);
  if (!m) return null;
  const t = m[1].toLowerCase();
  const map: Record<string, { label: string; color: string }> = {
    feat: { label: "feat", color: "#3fb950" },
    fix: { label: "fix", color: "#f85149" },
    ci: { label: "ci", color: "#58a6ff" },
    chore: { label: "chore", color: "#8b949e" },
    refactor: { label: "refactor", color: "#d29922" },
    docs: { label: "docs", color: "#bc8cff" },
    perf: { label: "perf", color: "#f0883e" },
    test: { label: "test", color: "#d97706" },
    revert: { label: "revert", color: "#f85149" },
    build: { label: "build", color: "#8b949e" },
    style: { label: "style", color: "#8b949e" },
  };
  return map[t] ?? null;
}

function MergedPRFeed({ prs }: { prs: MergedPR[] }) {
  const human = prs.filter((p) => !p.isBot);
  const bots = prs.filter((p) => p.isBot);

  function PRCard({ pr }: { pr: MergedPR }) {
    const accent = repoAccent(pr.repo);
    const tag = prTypeTag(pr.title);
    return (
      <Link
        href={pr.url}
        target="_blank"
        rel="noreferrer"
        className={styles.mergedCard}
      >
        <div className={styles.mergedCardTop}>
          <span className={styles.mergedCardNum}>#{pr.number}</span>
          <span
            className={styles.mergedCardRepo}
            style={{ color: accent, borderColor: `${accent}66` }}
          >
            {pr.repo}
          </span>
          {tag && (
            <span
              className={styles.mergedCardTag}
              style={{ color: tag.color, borderColor: `${tag.color}44` }}
            >
              {tag.label}
            </span>
          )}
          {pr.isBot && (
            <span className={styles.mergedCardAgent}>agent</span>
          )}
        </div>
        <span className={styles.mergedCardTitle}>{pr.title.slice(0, 90)}</span>
        <div className={styles.mergedCardMeta}>
          <span>{pr.isBot ? "hive[bot]" : pr.author}</span>
          <span>{relTime(pr.updatedAt)}</span>
        </div>
      </Link>
    );
  }

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Recently Merged</Heading>
      <p className={styles.panelMeta}>
        Latest {prs.length} merged PRs across projectbluefin &middot;{" "}
        {human.length} human &middot; {bots.length} agent
      </p>
      {prs.length === 0 ? (
        <div className={styles.empty}>No recently merged pull requests found.</div>
      ) : (
        <>
          {human.length > 0 && (
            <div className={styles.mergedSection}>
              <div className={styles.mergedSectionLabel}>
                Guardians &mdash; {human.length} human contributions
              </div>
              <div className={styles.mergedGrid}>
                {human.map((pr) => <PRCard key={`${pr.repo}-${pr.number}`} pr={pr} />)}
              </div>
            </div>
          )}
          {bots.length > 0 && (
            <div className={styles.mergedSection}>
              <div className={styles.mergedSectionLabel} style={{ color: "#93c5fd" }}>
                Ghosts &mdash; {bots.length} agent contributions
              </div>
              <div className={styles.mergedGrid}>
                {bots.map((pr) => <PRCard key={`${pr.repo}-${pr.number}`} pr={pr} />)}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── Governor timeline strip ────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  surge: "#f85149",
  busy: "#d97706",
  quiet: "#3b82f6",
  idle: "#21262d",
  unknown: "#30363d",
};

function GovernorTimeline({ ticks }: { ticks: HiveTimelineTick[] }) {
  if (ticks.length < 10) return null;
  const sorted = [...ticks].sort((a, b) => a.t - b.t);
  const start = sorted[0].t;
  const end = sorted[sorted.length - 1].t;
  const span = end - start || 1;

  const modeCounts: Record<string, number> = {};
  for (const t of sorted) {
    const m = (t.mode ?? "unknown").toLowerCase();
    modeCounts[m] = (modeCounts[m] ?? 0) + 1;
  }
  const dominant = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "idle";
  const dominantPct = Math.round(((modeCounts[dominant] ?? 0) / sorted.length) * 100);

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Governor Timeline &mdash; 24h Mode History
      </Heading>
      <p className={styles.panelMeta}>
        Surge / busy / quiet / idle distribution &mdash; dominant: <strong style={{ color: MODE_COLORS[dominant] ?? "#8b949e" }}>{dominant}</strong> at {dominantPct}%
      </p>
      <div className={styles.timelineStrip} role="img" aria-label="24-hour governor mode timeline">
        {sorted.map((tick, i) => {
          const mode = (tick.mode ?? "unknown").toLowerCase();
          const color = MODE_COLORS[mode] ?? MODE_COLORS.unknown;
          const widthPct = i < sorted.length - 1
            ? ((sorted[i + 1].t - tick.t) / span) * 100
            : (1 / sorted.length) * 100;
          return (
            <div
              key={tick.t}
              className={styles.timelineTick}
              style={{ width: `${widthPct}%`, background: color }}
              title={`${mode} at ${new Date(tick.t).toLocaleTimeString()}`}
            />
          );
        })}
      </div>
      <div className={styles.timelineLegend}>
        {(["surge", "busy", "quiet", "idle"] as const).map((m) => (
          modeCounts[m] ? (
            <span key={m} className={styles.timelineLegendItem}>
              <span className={styles.timelineDot} style={{ background: MODE_COLORS[m] }} />
              {m} ({Math.round(((modeCounts[m] ?? 0) / sorted.length) * 100)}%)
            </span>
          ) : null
        ))}
      </div>
    </section>
  );
}

// ── Token budget panel ─────────────────────────────────────────────────────

function TokenBudgetPanel({
  pct,
  total,
  used,
  mode,
}: {
  pct?: number;
  total?: number;
  used?: number;
  mode?: string;
}) {
  if (pct == null) return null;
  const safeMode = (mode ?? "idle").toLowerCase();
  const danger = pct > 85;
  const warn = pct > 65 && !danger;
  const barColor = danger ? "#f85149" : warn ? "#d97706" : "#3fb950";
  const remaining = total != null && used != null ? total - used : null;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Token Budget</Heading>
      <p className={styles.panelMeta}>
        Governor mode: <strong style={{ color: MODE_COLORS[safeMode] ?? "#8b949e" }}>{mode ?? "idle"}</strong>
        {total != null && <> &middot; {total.toLocaleString()} tokens / period</>}
      </p>
      <div className={styles.budgetTrack}>
        <div
          className={styles.budgetBar}
          style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
        />
      </div>
      <div className={styles.budgetStats}>
        <span style={{ color: barColor }}>{pct.toFixed(1)}% used</span>
        {used != null && <span>{used.toLocaleString()} tokens consumed</span>}
        {remaining != null && (
          <span style={{ color: "#3fb950" }}>{remaining.toLocaleString()} remaining</span>
        )}
      </div>
    </section>
  );
}

// ── Nous / Strategy Lab panel ──────────────────────────────────────────────

function NousPanel({ nous }: { nous: NousStatus }) {
  const exp = nous.activeExperiment;
  const snapPct = nous.snapshotTarget && nous.snapshotCount != null
    ? Math.round((nous.snapshotCount / nous.snapshotTarget) * 100)
    : null;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Strategy Lab (Nous)</Heading>
      <p className={styles.panelMeta}>
        Autonomous experiment engine &mdash; optimizing governor configuration
      </p>
      <div className={styles.nousGrid}>
        <div className={styles.nousItem}>
          <div className={styles.nousLabel}>Mode</div>
          <div className={styles.nousValue} style={{ color: nous.mode === "auto" ? "#3fb950" : nous.mode === "suggest" ? "#d97706" : "#8b949e" }}>
            {nous.mode ?? "observe"}
          </div>
        </div>
        {nous.scope && (
          <div className={styles.nousItem}>
            <div className={styles.nousLabel}>Scope</div>
            <div className={styles.nousValue}>{nous.scope}</div>
          </div>
        )}
        {nous.principleCount != null && (
          <div className={styles.nousItem}>
            <div className={styles.nousLabel}>Principles</div>
            <div className={styles.nousValue} style={{ color: "#bc8cff" }}>{nous.principleCount}</div>
          </div>
        )}
        {nous.hasRecommendations && (
          <div className={styles.nousItem}>
            <div className={styles.nousLabel}>Status</div>
            <div className={styles.nousValue} style={{ color: "#d97706" }}>Recommendations ready</div>
          </div>
        )}
      </div>
      {exp && (
        <div className={styles.nousExperiment}>
          <div className={styles.nousExpLabel}>Active experiment: <code>{exp.id}</code></div>
          <div className={styles.budgetTrack}>
            <div
              className={styles.budgetBar}
              style={{ width: `${exp.progressPct}%`, background: "#bc8cff" }}
            />
          </div>
          <div className={styles.nousExpMeta}>
            {exp.progressPct}% &middot; {Math.round(exp.elapsed / 60)}m elapsed of {Math.round(exp.ttlSec / 60)}m
          </div>
        </div>
      )}
      {snapPct != null && (
        <div className={styles.nousSnapshot}>
          <span className={styles.nousLabel}>Snapshot collection:</span>
          <div className={styles.budgetTrack} style={{ marginTop: "0.4rem" }}>
            <div className={styles.budgetBar} style={{ width: `${snapPct}%`, background: "#58a6ff" }} />
          </div>
          <div className={styles.nousExpMeta}>{nous.snapshotCount}/{nous.snapshotTarget} snapshots ({snapPct}%)</div>
        </div>
      )}
      {nous.phases && (
        <div className={styles.nousPhases}>
          {nous.phases.governor && (
            <span className={styles.nousPhaseItem}>
              Governor: {nous.phases.governor.phase} i{nous.phases.governor.iteration}
            </span>
          )}
          {nous.phases.repo && (
            <span className={styles.nousPhaseItem}>
              Repo: {nous.phases.repo.phase} i{nous.phases.repo.iteration}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function ContributorWall({
  prs,
  history,
}: {
  prs: MergedPR[];
  history: HiveHistory | null;
}) {
  // Use org-wide history contributors if available; fall back to recent PRs
  // Metric: repos active in (not commits)
  const orgContributors: OrgContributor[] = React.useMemo(() => {
    if (history?.contributors && Object.keys(history.contributors).length > 0) {
      const byRepo = history.contributorsByRepo ?? {};
      return Object.entries(history.contributors)
        .filter(([login]) => !isBotLogin(login))
        .map(([login, commits]) => {
          const repos = Object.entries(byRepo)
            .filter(([, rc]) => rc[login] != null)
            .sort((a, b) => (b[1][login] ?? 0) - (a[1][login] ?? 0))
            .map(([repo]) => repo);
          return { login, commits, repos };
        })
        .sort((a, b) => b.repos.length - a.repos.length || b.commits - a.commits)
        .slice(0, 48);
    }
    // fallback: derive from recent PRs
    const seen = new Set<string>();
    const out: OrgContributor[] = [];
    for (const pr of prs) {
      if (pr.isBot || isBotLogin(pr.author) || seen.has(pr.author)) continue;
      seen.add(pr.author);
      out.push({ login: pr.author, commits: 0, repos: [pr.repo] });
      if (out.length >= 20) break;
    }
    return out;
  }, [history, prs]);

  const isOrgWide = history?.contributors && Object.keys(history.contributors).length > 0;
  const totalHumans = orgContributors.length;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Factory Contributors
      </Heading>
      <p className={styles.panelMeta}>
        {isOrgWide
          ? `${totalHumans} humans active across factory repos`
          : "Humans landing code in the latest merged queue"}
      </p>
      {orgContributors.length > 0 ? (
        <div className={styles.contributorGrid}>
          {orgContributors.map(({ login, repos }) => (
            <Link
              key={login}
              href={`https://github.com/${login}`}
              target="_blank"
              rel="noreferrer"
              className={styles.contributorCard}
              title={repos.length > 0 ? `${login} · ${repos.slice(0, 3).join(", ")}` : login}
            >
              <img
                src={`https://github.com/${login}.png?size=40`}
                alt={login}
                className={styles.contributorAvatar}
                loading="lazy"
              />
              <span className={styles.contributorName}>{login}</span>
              {repos.length > 0 && (
                <span className={styles.contributorCommits}>{repos.length} repo{repos.length !== 1 ? "s" : ""}</span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Frames are running the show</div>
      )}
    </section>
  );
}

function HistoryTrends({ history }: { history: HiveHistory | null }) {
  if (!history || history.entries.length < 2) return null;

  const entries = history.entries.slice(-72); // last ~6 days (2h interval)

  function sparkPoints(values: Array<number | undefined>, w: number, h: number): string {
    const nums = values.map((v) => v ?? 0);
    const max = Math.max(...nums, 1);
    const step = w / Math.max(nums.length - 1, 1);
    return nums.map((v, i) => `${i * step},${h - (v / max) * (h - 2) - 1}`).join(" ");
  }

  const acmm = entries.map((e) => e.acmmLevel);
  const budget = entries.map((e) => e.budgetPct);
  const queueDepth = entries.map((e) => e.queue);
  const advisories = entries.map((e) => e.advisories);
  const mergedDay = entries.map((e) => e.mergedToday);
  const medianTime = entries.map((e) => e.medianMergeMins);

  type SparkDef = {
    label: string;
    values: Array<number | undefined>;
    color: string;
    unit?: string;
    latest?: number | undefined;
  };

  const sparks: SparkDef[] = [
    { label: "ACMM Level", values: acmm, color: "#d29922", unit: "L", latest: acmm.at(-1) },
    { label: "Budget Used", values: budget, color: "#f85149", unit: "%", latest: budget.at(-1) },
    { label: "Queue Depth", values: queueDepth, color: "#58a6ff", unit: "", latest: queueDepth.at(-1) },
    { label: "Advisories", values: advisories, color: "#bc8cff", unit: "", latest: advisories.at(-1) },
    { label: "Merged / Cycle", values: mergedDay, color: "#3fb950", unit: "", latest: mergedDay.at(-1) },
    { label: "Median Merge (m)", values: medianTime, color: "#f0883e", unit: "m", latest: medianTime.at(-1) },
  ];

  const W = 160;
  const H = 36;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Factory Trends
      </Heading>
      <p className={styles.panelMeta}>
        Historical metrics · {entries.length} snapshots · last {Math.round(entries.length * 2)}h
      </p>
      <div className={styles.historyTrendsGrid}>
        {sparks.map(({ label, values, color, unit, latest }) => {
          const hasData = values.some((v) => v != null && v > 0);
          return (
            <div key={label} className={styles.historyTrendCard}>
              <div className={styles.historyTrendLabel}>{label}</div>
              <div className={styles.historyTrendValue} style={{ color }}>
                {latest != null ? `${unit === "L" ? "L" : ""}${typeof latest === "number" ? latest : "—"}${unit && unit !== "L" ? unit : ""}` : "—"}
              </div>
              {hasData ? (
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  className={styles.historySparkline}
                  aria-hidden
                >
                  <polyline
                    points={sparkPoints(values, W, H)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </svg>
              ) : (
                <div className={styles.historySparklineEmpty}>accumulating data</div>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.panelMeta} style={{ marginTop: "0.75rem" }}>
        Updated every 2 hours by the cache pipeline
      </p>
    </section>
  );
}

// ── Contributor Leaderboard ───────────────────────────────────────────────

type LeaderboardTab = "alltime" | "monthly" | "weekly";

interface LeaderboardEntry {
  rank: number;
  login: string;
  commits: number;
  delta?: number;      // change vs previous window (weekly only)
  repos: string[];
  badges: MilestoneBadge[];
  hasStats: boolean;
}

function ContributorLeaderboard({ history }: { history: HiveHistory | null }) {
  const [tab, setTab] = React.useState<LeaderboardTab>("alltime");

  const hasWeeklyStats =
    history?.contributorStats != null &&
    Object.keys(history.contributorStats).length > 0;

  const ranked = React.useMemo((): LeaderboardEntry[] => {
    if (!history) return [];

    const stats = history.contributorStats ?? {};
    const allTimeMap = history.contributors ?? {};
    const byRepo = history.contributorsByRepo ?? {};

    // Build a unified map of all known contributors (no bots)
    const allLogins = new Set(
      [...Object.keys(stats), ...Object.keys(allTimeMap)].filter((l) => !isBotLogin(l))
    );
    const rows: LeaderboardEntry[] = [];

    for (const login of allLogins) {
      const s = stats[login];
      const allTime = s?.total ?? allTimeMap[login] ?? 0;
      const lastWeek = s?.lastWeek ?? 0;
      const lastMonth = s?.lastMonth ?? 0;
      const last3Months = s?.last3Months ?? 0;

      let commits = 0;
      if (tab === "alltime") commits = allTime;
      else if (tab === "monthly") commits = lastMonth;
      else commits = lastWeek;

      if (commits === 0) continue;

      // Repos from stats.byRepo or contributorsByRepo
      const repoMap = s?.byRepo ?? {};
      const repos = Object.keys(
        Object.keys(repoMap).length > 0
          ? repoMap
          : Object.fromEntries(
              Object.entries(byRepo)
                .filter(([, rc]) => rc[login] != null)
                .map(([r, rc]) => [r, rc[login]])
            ),
      ).sort((a, b) => {
        const ma = (repoMap[a] ?? byRepo[a]?.[login] ?? 0);
        const mb = (repoMap[b] ?? byRepo[b]?.[login] ?? 0);
        return mb - ma;
      });

      // Delta: for weekly tab, this week vs weekly avg of last month
      let delta: number | undefined;
      if (tab === "weekly" && lastMonth > 0) {
        const avg = lastMonth / 4;
        delta = Math.round(lastWeek - avg);
      } else if (tab === "monthly" && last3Months > 0) {
        const avg = last3Months / 3;
        delta = Math.round(lastMonth - avg);
      }

      rows.push({
        rank: 0,
        login,
        commits,
        delta,
        repos,
        badges: computeMilestones(allTime, lastWeek, lastMonth, repos),
        hasStats: s != null,
      });
    }

    rows.sort((a, b) => b.commits - a.commits);
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows.slice(0, 25);
  }, [history, tab]);

  if (!history || ranked.length === 0) return null;

  const lastUpdated = history.lastWeeklyStatsFetch
    ? new Date(history.lastWeeklyStatsFetch).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Contributor Leaderboard
      </Heading>
      <p className={styles.panelMeta}>
        Factory-wide commit rankings across all 15 repos
        {lastUpdated ? ` · stats as of ${lastUpdated}` : ""}
        {!hasWeeklyStats ? " · weekly/monthly windows accumulating" : ""}
      </p>

      <div className={styles.lbTabs}>
        {(["alltime", "monthly", "weekly"] as LeaderboardTab[]).map((t) => (
          <button
            key={t}
            className={`${styles.lbTab} ${tab === t ? styles.lbTabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "alltime" ? "All Time" : t === "monthly" ? "This Month" : "This Week"}
          </button>
        ))}
      </div>

      <div className={styles.lbTable}>
        <div className={styles.lbHeader}>
          <span className={styles.lbColRank}>#</span>
          <span className={styles.lbColUser}>Contributor</span>
          <span className={styles.lbColCommits}>Commits</span>
          <span className={styles.lbColRepos}>Repos</span>
          <span className={styles.lbColBadges}>Milestones</span>
        </div>
        {ranked.map(({ rank, login, commits, delta, repos, badges }) => (
          <Link
            key={login}
            href={`https://github.com/${login}`}
            target="_blank"
            rel="noreferrer"
            className={styles.lbRow}
          >
            <span className={`${styles.lbColRank} ${rank <= 3 ? styles.lbTopRank : ""}`}>
              {rank === 1 ? "01" : rank === 2 ? "02" : rank === 3 ? "03" : String(rank).padStart(2, "0")}
            </span>
            <span className={styles.lbColUser}>
              <img
                src={`https://github.com/${login}.png?size=24`}
                alt={login}
                className={styles.lbAvatar}
                loading="lazy"
              />
              <span className={styles.lbLogin}>{login}</span>
            </span>
            <span className={styles.lbColCommits}>
              <span className={styles.lbCommitCount}>
                {commits >= 1000 ? `${(commits / 1000).toFixed(1)}k` : commits}
              </span>
              {delta != null && delta !== 0 && (
                <span className={`${styles.lbDelta} ${delta > 0 ? styles.lbDeltaUp : styles.lbDeltaDown}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </span>
            <span className={styles.lbColRepos}>
              {repos.slice(0, 3).map((r) => (
                <span key={r} className={styles.lbRepoChip}>{r}</span>
              ))}
              {repos.length > 3 && <span className={styles.lbRepoMore}>+{repos.length - 3}</span>}
            </span>
            <span className={styles.lbColBadges}>
              {badges.map((b) => (
                <span
                  key={b.tier}
                  className={styles.lbBadge}
                  style={{ borderColor: b.color, color: b.color }}
                  title={b.title}
                >
                  {b.label}
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>

      {ranked.length >= 25 && (
        <p className={styles.panelMeta} style={{ marginTop: "0.5rem" }}>
          Showing top 25 of {Object.keys(history.contributors ?? {}).length} contributors
        </p>
      )}
    </section>
  );
}

function VelocityPanel({
  velocity,
  p0,
}: {
  velocity: Velocity | null;
  p0?: number;
}) {
  const opened = velocity?.opened ?? 0;
  const closed = velocity?.closed ?? 0;
  const net = opened - closed;
  const deltaLabel =
    net > 0
      ? `up net +${net}`
      : net < 0
        ? `down net ${net}`
        : "flat net 0";

  const maxVal = Math.max(opened, closed, 1);
  const openedH = Math.max((opened / maxVal) * 52, opened > 0 ? 4 : 0);
  const closedH = Math.max((closed / maxVal) * 52, closed > 0 ? 4 : 0);

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Issue Velocity
      </Heading>
      <p className={styles.panelMeta}>Issues · last 7 days · projectbluefin org</p>
      <div className={styles.velocityBars}>
        <div
          className={`${styles.velocityBar} ${styles.velocityBarOpened}`}
          style={{ height: `${openedH}px` }}
          title={`${opened} opened`}
        >
          <span className={styles.velocityBarLabel}>{opened} opened</span>
        </div>
        <div
          className={`${styles.velocityBar} ${styles.velocityBarClosed}`}
          style={{ height: `${closedH}px` }}
          title={`${closed} closed`}
        >
          <span className={styles.velocityBarLabel}>{closed} closed</span>
        </div>
      </div>
      <div className={styles.velocityRow} style={{ marginTop: "1.5rem" }}>
        <div>
          <div className={styles.velocityNum}>{opened}</div>
          <div className={styles.miniLabel}>opened</div>
        </div>
        <div>
          <div className={styles.velocityNum}>{closed}</div>
          <div className={styles.miniLabel}>closed</div>
        </div>
      </div>
      <div
        className={`${styles.velocityDelta} ${
          net > 0
            ? styles.velocityDeltaUp
            : net < 0
              ? styles.velocityDeltaDown
              : styles.velocityDeltaFlat
        }`}
      >
        {deltaLabel}
      </div>
      {typeof p0 === "number" && p0 > 0 ? (
        <div className={styles.p0Alert}>P0 unresolved: {p0}</div>
      ) : null}
    </section>
  );
}

function GovernorPanel({ governor }: { governor?: HiveGovernor }) {
  const mode = (governor?.mode ?? "idle").toUpperCase();
  const issues = governor?.issues ?? 0;
  const prs = governor?.prs ?? 0;
  const depth = issues + prs;
  const quiet = governor?.thresholds?.quiet ?? 0;
  const busy = governor?.thresholds?.busy ?? Math.max(quiet + 1, depth, 1);
  const surge = governor?.thresholds?.surge ?? Math.max(busy + 1, depth, 1);
  const maxDepth = Math.max(surge, depth, 1);
  const quietWidth = Math.max((quiet / maxDepth) * 100, 18);
  const busyWidth = Math.max(((busy - quiet) / maxDepth) * 100, 18);
  const surgeWidth = Math.max(100 - quietWidth - busyWidth, 18);
  const markerLeft = Math.min((depth / maxDepth) * 100, 100);

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Governor
      </Heading>
      <div className={`${styles.govMode} ${governorModeClass(governor?.mode)}`}>
        {mode}
      </div>
      <div className={styles.kv}>
        <span>Queue depth</span>
        <strong>
          {issues} issues + {prs} PRs in queue
        </strong>
      </div>
      <div className={styles.govThreshBar}>
        <div
          className={styles.govThreshZoneQuiet}
          style={{ width: `${quietWidth}%` }}
        >
          QUIET
        </div>
        <div
          className={styles.govThreshZoneBusy}
          style={{ width: `${busyWidth}%` }}
        >
          BUSY
        </div>
        <div
          className={styles.govThreshZoneSurge}
          style={{ width: `${surgeWidth}%` }}
        >
          SURGE
        </div>
        <span
          className={styles.govThreshMarker}
          style={{ left: `calc(${markerLeft}% - 1px)` }}
        />
      </div>
      <div className={styles.govThreshLegend}>
        <span>Q &le; {quiet}</span>
        <span>B &le; {busy}</span>
        <span>S &ge; {surge}</span>
      </div>
      <p className={styles.panelMeta}>
        Next kick: {" "}
        {governor?.nextKick ? relTime(governor.nextKick) : "—"}
      </p>
    </section>
  );
}

function BeadsCadencePanel({
  beads,
  cadenceMatrix,
  mode,
}: {
  beads?: HiveBeads;
  cadenceMatrix?: HiveCadenceRow[];
  mode?: string;
}) {
  const currentMode = (mode ?? "idle").toLowerCase();
  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Beads + Cadence
      </Heading>
      <div className={styles.beadsRow}>
        <span>{beads?.workers ?? 0} worker tasks</span>
        <span>{beads?.supervisor ?? 0} supervisor tasks</span>
      </div>
      {cadenceMatrix?.length ? (
        <div className={styles.cadenceTable}>
          <div className={`${styles.cadenceRow} ${styles.cadenceHeader}`}>
            <span className={styles.cadenceCell}>Agent</span>
            <span className={`${styles.cadenceCell} ${currentMode === "surge" ? styles.cadenceCellActive : ""}`}>SURGE</span>
            <span className={`${styles.cadenceCell} ${currentMode === "busy" ? styles.cadenceCellActive : ""}`}>BUSY</span>
            <span className={`${styles.cadenceCell} ${currentMode === "quiet" ? styles.cadenceCellActive : ""}`}>QUIET</span>
            <span className={`${styles.cadenceCell} ${currentMode === "idle" ? styles.cadenceCellActive : ""}`}>IDLE</span>
          </div>
          {cadenceMatrix.map((row) => (
            <div key={row.agent} className={styles.cadenceRow}>
              <span className={styles.cadenceCell}>{row.agent}</span>
              <span className={`${styles.cadenceCell} ${currentMode === "surge" ? styles.cadenceCellActive : ""}`}>{row.surge}</span>
              <span className={`${styles.cadenceCell} ${currentMode === "busy" ? styles.cadenceCellActive : ""}`}>{row.busy}</span>
              <span className={`${styles.cadenceCell} ${currentMode === "quiet" ? styles.cadenceCellActive : ""}`}>{row.quiet}</span>
              <span className={`${styles.cadenceCell} ${currentMode === "idle" ? styles.cadenceCellActive : ""}`}>{row.idle}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FrameOfDay({ agent, advisoryItems: agentAdvisories }: { agent: HiveAgent | null; advisoryItems: AdvisoryItem[] }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!agent) {
    return (
      <section className={`${styles.panel} ${styles.agentOfDayCard}`}>
        <Heading as="h2" className={styles.panelTitle}>
          Frame of the Day
        </Heading>
        <div className={styles.empty}>No Frame spotlight available.</div>
      </section>
    );
  }
  const isWorking = agent.busy === "working";
  const allLines = meaningfulSummaryLines(agent.liveSummary ?? "", 20);
  const visibleLines = expanded ? allLines : allLines.slice(0, 10);
  const quote = pickFrameQuote(agent.id, isWorking);

  return (
    <section className={`${styles.panel} ${styles.agentOfDayCard}`}>
      <Heading as="h2" className={styles.panelTitle}>
        Frame of the Day
      </Heading>
      <div className={styles.agentOfDayHero}>
        <div className={styles.agentHeroInitial}>
          {(agent.displayName || agent.name).slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className={styles.agentOfDayLabel}>
            {isWorking ? "Currently active" : "Most recently active"}
          </div>
          <div className={styles.agentHeroName}>{agent.displayName || agent.name}</div>
          <div className={styles.agentHeroMeta}>
            {agent.role || "Generalist"} · {agent.model || "Unknown model"}
          </div>
        </div>
      </div>
      {agentAdvisories.length > 0 && (
        <div className={styles.agentOfDaySummary} style={{ marginTop: "0.75rem" }}>
          <div style={{ color: "#8b949e", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
            Recent work items
          </div>
          {agentAdvisories.slice(0, 5).map((item, i) => (
            <div key={i} className={styles.frameAdvisoryItem}>
              <span style={{ color: SEV_COLOR[item.severity] ?? "#8b949e", marginRight: "0.35rem" }}>
                {TYPE_ICON[item.type] ?? "·"}
              </span>
              {item.title.slice(0, 110)}
            </div>
          ))}
        </div>
      )}
      {visibleLines.length > 0 && (
        <div className={styles.agentOfDaySummary}>
          {visibleLines.map((line, i) => <div key={i}>{line}</div>)}
          {allLines.length > 10 && (
            <button className={styles.workLogToggle} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show ${allLines.length - 10} more`}
            </button>
          )}
        </div>
      )}
      {visibleLines.length === 0 && agentAdvisories.length === 0 && (
        <div className={styles.agentOfDaySummary}>Awaiting next assignment…</div>
      )}
      <div className={styles.frameQuote}>&ldquo;{quote}&rdquo;</div>
    </section>
  );
}

function FormationLog({
  supervisor,
  timestamp,
}: {
  supervisor: HiveAgent | null;
  timestamp?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const allLines = supervisor?.liveSummary
    ? meaningfulSummaryLines(supervisor.liveSummary, 30)
    : [];
  const PREVIEW = 15;
  const visibleLines = expanded ? allLines : allLines.slice(0, PREVIEW);
  const quote = supervisor ? pickFrameQuote(supervisor.id, supervisor.busy === "working") : null;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>
        Formation Log
      </Heading>
      {allLines.length > 0 ? (
        <>
          <div className={styles.formationLogList}>
            {visibleLines.map((line, idx) => (
              <div key={`${idx}-${line}`} className={styles.formationLogEntry}>
                <span className={styles.formationLogStamp}>
                  {timestamp ? relTime(timestamp) : "recent"}
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
          {allLines.length > PREVIEW && (
            <button className={styles.workLogToggle} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show less" : `Show ${allLines.length - PREVIEW} more`}
            </button>
          )}
          {quote && <div className={styles.frameQuote}>&ldquo;{quote}&rdquo;</div>}
        </>
      ) : (
        <div className={styles.empty}>No formation log available</div>
      )}
    </section>
  );
}

function AgentWorkLog({
  agents,
  items,
  advisoryIssue,
  config,
}: {
  agents: HiveAgent[];
  items: AdvisoryItem[];
  advisoryIssue?: number;
  config: HiveConfig | null;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const byAgent: Record<string, AdvisoryItem[]> = {};
  for (const item of items) {
    if (!byAgent[item.agent]) byAgent[item.agent] = [];
    byAgent[item.agent].push(item);
  }
  for (const key of Object.keys(byAgent)) {
    byAgent[key].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  function repoFromTitle(title: string): string | null {
    const m = title.match(
      /\b(knuckle|documentation|testsuite|dakota|dakota-iso|website|bootc-installer)\b/i,
    );
    return m ? m[1] : null;
  }

  const org = config?.org ?? "projectbluefin";

  return (
    <div className={styles.workLog}>
      {agents.map((agent) => {
        const agentItems = byAgent[agent.name] ?? [];
        const isExpandedAgent = expanded === agent.name;
        const visible = isExpandedAgent ? agentItems : agentItems.slice(0, 3);
        const repos = [
          ...new Set(
            agentItems.map((i) => repoFromTitle(i.title)).filter(Boolean),
          ),
        ];
        return (
          <div key={agent.id} className={styles.workLogAgent}>
            <div className={styles.workLogHeader}>
              <div className={styles.workLogAgentMeta}>
                <span className={styles.workLogName}>{agent.displayName}</span>
                {repos.length > 0 && (
                  <div className={styles.workLogRepos}>
                    {repos.map((r) => (
                      <Link
                        key={r}
                        href={`https://github.com/${org}/${r}`}
                        className={styles.workLogRepoChip}
                      >
                        {r}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.workLogCount}>{agentItems.length} items</span>
            </div>
            {visible.length > 0 && (
              <div className={styles.workLogItems}>
                {visible.map((item, i) => {
                  const icon = TYPE_ICON[item.type] ?? "?";
                  const color = SEV_COLOR[item.severity] ?? "#8b949e";
                  const repo = repoFromTitle(item.title);
                  return (
                    <div key={i} className={styles.workLogItem}>
                      <span className={styles.workLogIcon}>{icon}</span>
                      <div className={styles.workLogItemBody}>
                        <span className={styles.workLogTitle}>
                          {item.title.slice(0, 110)}
                        </span>
                        <div className={styles.workLogMeta}>
                          <span className={styles.workLogSev} style={{ color }}>
                            {item.severity}
                          </span>
                          <span className={styles.workLogType}>{item.type}</span>
                          {repo && (
                            <Link
                              href={`https://github.com/${org}/${repo}`}
                              className={styles.workLogRepo}
                            >
                              {repo}
                            </Link>
                          )}
                          <span className={styles.workLogTime}>
                            {relTime(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agentItems.length > 3 && (
                  <button
                    className={styles.workLogToggle}
                    onClick={() =>
                      setExpanded(isExpandedAgent ? null : agent.name)
                    }
                  >
                    {isExpandedAgent
                      ? "Show less"
                      : `Show ${agentItems.length - 3} more`}
                  </button>
                )}
              </div>
            )}
            {agentItems.length === 0 && (
              <div className={styles.workLogEmpty}>No advisory items yet</div>
            )}
          </div>
        );
      })}
      {advisoryIssue != null && (
        <div className={styles.workLogFooter}>
          <Link
            href={`https://github.com/${org}/knuckle/issues/${advisoryIssue}`}
            className={styles.workLogDigestLink}
          >
            View full advisory digest (issue #{advisoryIssue}) &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function OrgStatsPanel({ stats }: { stats: OrgStats }) {
  const agentTotal =
    stats.agentReadyIssues + stats.agentOpenPRs + stats.sourceAgentOpen;
  return (
    <div className={styles.orgGrid}>
      <div className={styles.orgOverview}>
        <Heading as="h2" className={styles.panelTitle}>
          projectbluefin Org
        </Heading>
        <div className={styles.orgStats}>
          <div className={styles.orgStat}>
            <span className={styles.orgStatValue}>{stats.totalRepos}</span>
            <span className={styles.orgStatLabel}>repos</span>
          </div>
          <div className={styles.orgStatDivider} />
          <div className={styles.orgStat}>
            <span className={styles.orgStatValue}>{stats.openIssues}</span>
            <span className={styles.orgStatLabel}>open issues</span>
          </div>
          <div className={styles.orgStatDivider} />
          <div className={styles.orgStat}>
            <span className={styles.orgStatValue}>{stats.openPRs}</span>
            <span className={styles.orgStatLabel}>open PRs</span>
          </div>
          <div className={styles.orgStatDivider} />
          <div className={styles.orgStat}>
            <span className={styles.orgStatValue} style={{ color: "#3fb950" }}>
              {stats.mergedThisWeek}
            </span>
            <span className={styles.orgStatLabel}>merged this week</span>
          </div>
        </div>
      </div>
      <div className={styles.orgAgentActivity}>
        <Heading as="h2" className={styles.panelTitle}>
          Agent Activity
        </Heading>
        <div className={styles.orgAgentRows}>
          <Link
            href="https://github.com/issues?q=org%3Aprojectbluefin+label%3Aqueue%2Fagent-ready+state%3Aopen"
            className={styles.orgAgentRow}
          >
            <span className={styles.orgAgentRowDot} style={{ background: "#3fb950" }} />
            <span className={styles.orgAgentRowLabel}>Agent-ready</span>
            <span className={styles.orgAgentRowCount} style={{ color: "#3fb950" }}>
              {stats.agentReadyIssues}
            </span>
            <span className={styles.orgAgentRowSub}>issues awaiting pickup</span>
          </Link>
          <Link
            href="https://github.com/issues?q=org%3Aprojectbluefin+author%3Akubestellar-hive%5Bbot%5D+state%3Aopen+type%3Apr"
            className={styles.orgAgentRow}
          >
            <span className={styles.orgAgentRowDot} style={{ background: "#58a6ff" }} />
            <span className={styles.orgAgentRowLabel}>Agent PRs open</span>
            <span className={styles.orgAgentRowCount} style={{ color: "#58a6ff" }}>
              {stats.agentOpenPRs}
            </span>
            <span className={styles.orgAgentRowSub}>awaiting review</span>
          </Link>
          <Link
            href="https://github.com/issues?q=org%3Aprojectbluefin+label%3Asource%3Aagent+state%3Aopen"
            className={styles.orgAgentRow}
          >
            <span className={styles.orgAgentRowDot} style={{ background: "#f59e0b" }} />
            <span className={styles.orgAgentRowLabel}>Agent-sourced</span>
            <span className={styles.orgAgentRowCount} style={{ color: "#f59e0b" }}>
              {stats.sourceAgentOpen}
            </span>
            <span className={styles.orgAgentRowSub}>open items</span>
          </Link>
          <div className={styles.orgAgentTotal}>
            <span>{agentTotal} total agent-tracked items across the org</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New: Guardians column ──────────────────────────────────────────────────

function GuardiansColumn({ prs }: { prs: QueueData["prs"] | null }) {
  if (!prs) {
    return (
      <div className={`${styles.destinyCol} ${styles.guardiansCol}`}>
        <div>
          <p className={styles.destinyColTitle + " " + styles.guardiansColTitle}>Guardians</p>
          <p className={styles.destinyColSubtitle}>Human contributor pull requests</p>
        </div>
        <div className={styles.empty}>Loading…</div>
      </div>
    );
  }

  const tiers: Array<{
    key: keyof QueueData["prs"];
    label: string;
    labelCls: string;
    items: QueuePR[];
  }> = [
    { key: "approved", label: "APPROVED", labelCls: styles.prTierLabelApproved, items: prs.approved },
    { key: "required", label: "NEEDS REVIEW", labelCls: styles.prTierLabelRequired, items: prs.required },
    { key: "none", label: "NO REVIEWS", labelCls: styles.prTierLabelNone, items: prs.none },
  ];

  return (
    <div className={`${styles.destinyCol} ${styles.guardiansCol}`}>
      <div>
        <p className={styles.destinyColTitle + " " + styles.guardiansColTitle}>Guardians</p>
        <p className={styles.destinyColSubtitle}>Human contributor pull requests — the Light we carry</p>
      </div>
      {tiers.map(({ key, label, labelCls, items }) => (
        <div key={key} className={styles.prTier}>
          <div className={styles.prTierHeader}>
            <span className={`${styles.prTierLabel} ${labelCls}`}>{label}</span>
            <span className={styles.prTierCount}>{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className={styles.prTierEmpty}>None</div>
          ) : (
            items.slice(0, 8).map((pr, i) => {
              const repo = parseRepoName(pr.repository_url);
              const approvals = pr._reviews?.approved ?? 0;
              return (
                <Link
                  key={i}
                  href={pr.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.prCard}
                >
                  <span className={styles.prCardTitle}>
                    {pr.title.slice(0, 80)}
                  </span>
                  <div className={styles.prCardMeta}>
                    <span className={styles.prCardRepo}>{repo}</span>
                    {approvals > 0 && (
                      <span className={styles.prCardApprovals}>
                        {approvals} approved
                      </span>
                    )}
                    <span className={styles.prCardAge}>{relTime(pr.updated_at)}</span>
                  </div>
                </Link>
              );
            })
          )}
          {items.length > 8 && (
            <div className={styles.prTierEmpty}>
              +{items.length - 8} more &mdash; {" "}
              <Link href="https://queue.projectbluefin.io/">see all</Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── New: Ghosts column ─────────────────────────────────────────────────────

function GhostsColumn({ issues }: { issues: QueueData["issues"] | null }) {
  if (!issues) {
    return (
      <div className={`${styles.destinyCol} ${styles.ghostsCol}`}>
        <div>
          <p className={styles.destinyColTitle + " " + styles.ghostsColTitle}>Ghosts</p>
          <p className={styles.destinyColSubtitle}>Agent-driven issues and work queue</p>
        </div>
        <div className={styles.empty}>Loading…</div>
      </div>
    );
  }

  const SKIP_LABEL_PREFIXES = ["hive/", "priority/", "queue/"];

  function visibleLabels(labels?: QueueLabel[]): QueueLabel[] {
    return (labels ?? []).filter(
      (l) => !SKIP_LABEL_PREFIXES.some((p) => l.name.startsWith(p)),
    );
  }

  const tiers: Array<{
    key: keyof QueueData["issues"];
    label: string;
    labelCls: string;
    items: QueueIssue[];
  }> = [
    { key: "p0", label: "P0", labelCls: styles.issueTierLabelP0, items: issues.p0 },
    { key: "p1", label: "P1", labelCls: styles.issueTierLabelP1, items: issues.p1 },
  ];

  return (
    <div className={`${styles.destinyCol} ${styles.ghostsCol}`}>
      <div>
        <p className={styles.destinyColTitle + " " + styles.ghostsColTitle}>Ghosts</p>
        <p className={styles.destinyColSubtitle}>Agent-driven issues — the machines at work</p>
      </div>
      {tiers.map(({ key, label, labelCls, items }) => (
        <div key={key} className={styles.prTier}>
          <div className={styles.prTierHeader}>
            <span className={`${styles.prTierLabel} ${labelCls}`}>{label}</span>
            <span className={styles.prTierCount}>{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className={styles.prTierEmpty}>
              {key === "p0" ? "No blockers" : "Queue clear"}
            </div>
          ) : (
            items.slice(0, 8).map((issue, i) => {
              const repo = parseRepoName(issue.repository_url);
              const lbls = visibleLabels(issue.labels).slice(0, 3);
              return (
                <Link
                  key={i}
                  href={issue.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.issueCard}
                >
                  <span className={styles.issueCardTitle}>
                    {issue.title.slice(0, 80)}
                  </span>
                  <div className={styles.issueCardMeta}>
                    <span className={styles.issueCardRepo}>{repo}</span>
                    {lbls.map((l) => (
                      <span
                        key={l.name}
                        className={styles.issueLabel}
                        style={{
                          background: `#${l.color}22`,
                          color: `#${l.color}`,
                          border: `1px solid #${l.color}44`,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                    <span className={styles.issueCardAge}>
                      {relTime(issue.updated_at)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
          {items.length > 8 && (
            <div className={styles.prTierEmpty}>+{items.length - 8} more</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── New: Victory Log ───────────────────────────────────────────────────────

function VictoryLog({
  victories,
}: {
  victories: QueueData["victories"] | null;
}) {
  if (!victories) return null;

  const cols: Array<{
    key: keyof Omit<QueueData["victories"], "startDate">;
    label: string;
    labelCls: string;
    sparkColor: SparkColor;
    data: VictoryCategory;
  }> = [
    { key: "dreams", label: "FEATURES", labelCls: styles.victoryCategoryFeatures, sparkColor: "purple", data: victories.dreams },
    { key: "relief", label: "FIXED", labelCls: styles.victoryCategoryFixed, sparkColor: "amber", data: victories.relief },
    { key: "toil", label: "AUTOMATED", labelCls: styles.victoryCategoryAutomated, sparkColor: "green", data: victories.toil },
  ];

  return (
    <div className={styles.victoryLog}>
      <div className={styles.victoryLogHeader}>
        <p className={styles.victoryLogTitle}>This Cycle</p>
        <p className={styles.victoryLogSubtitle}>
          Since {victories.startDate} &mdash; what the factory has shipped
        </p>
      </div>
      <div className={styles.victoryColumns}>
        {cols.map(({ key, label, labelCls, sparkColor, data }) => {
          const spark = victorySparkData(data.recent, 14);
          return (
            <div key={key} className={styles.victoryCol}>
              <div className={styles.victoryColHeader}>
                <span className={`${styles.victoryCategoryLabel} ${labelCls}`}>
                  {label}
                </span>
                <span className={styles.victoryCount}>{data.count}</span>
                <span className={styles.victoryCountSub}>this cycle</span>
              </div>
              {spark.some((v) => v > 0) && (
                <div className={styles.victorySpark}>
                  <MiniSparkline data={spark} color={sparkColor} />
                </div>
              )}
              <div className={styles.victoryList}>
                {data.recent.slice(0, 5).map((item, i) => {
                  const repo = parseRepoName(item.repository_url);
                  return (
                    <Link
                      key={i}
                      href={item.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.victoryItem}
                    >
                      <span className={styles.victoryItemTitle}>
                        {item.title.slice(0, 72)}
                      </span>
                      <div className={styles.victoryItemMeta}>
                        <span className={styles.victoryItemRepo}>{repo}</span>
                        <span className={styles.victoryItemAge}>
                          {relTime(item.updated_at)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function HiveFactoryDashboard(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<HiveSnapshot | null>(null);
  const [config, setConfig] = useState<HiveConfig | null>(null);
  const [dakotaStats, setDakotaStats] = useState<DakotaStats | null>(null);
  const [queue, setQueue] = useState<QueueStats | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [commits, setCommits] = useState<number[]>([]);
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [repoPRs, setRepoPRs] = useState<RepoPRs[]>([]);
  const [mergedPRs, setMergedPRs] = useState<MergedPR[]>([]);
  const [velocity, setVelocity] = useState<Velocity | null>(null);
  const [hiveHistory, setHiveHistory] = useState<HiveHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIn, setRefreshIn] = useState(REFRESH_SECS);

  const fetchAll = useCallback(async () => {
    try {
      const weekAgoISO = new Date(Date.now() - 7 * 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10);

      const [
        htmlRes,
        queueRes,
        repoRes,
        ciRes,
        commitsRes,
        mergedRes,
        openedRes,
        closedRes,
      ] = await Promise.allSettled([
        fetchTimeout(SNAPSHOT_HTML_URL),
        fetchTimeout(QUEUE_URL),
        fetchTimeout(`${GH_API}/repos/${DAKOTA}`),
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/actions/workflows/${BUILD_WORKFLOW}/runs?per_page=1&status=completed`,
        ),
        fetchTimeout(`${GH_API}/repos/${DAKOTA}/stats/participation`),
        fetchTimeout(
          `${GH_API}/search/issues?q=org:projectbluefin+type:pr+is:merged&sort=updated&per_page=30`,
        ),
        fetchTimeout(
          `${GH_API}/search/issues?q=org:projectbluefin+type:issue+created:>${weekAgoISO}&per_page=1`,
        ),
        fetchTimeout(
          `${GH_API}/search/issues?q=org:projectbluefin+type:issue+closed:>${weekAgoISO}&per_page=1`,
        ),
      ]);

      // Hive snapshot from embedded HTML
      if (htmlRes.status === "fulfilled" && htmlRes.value.ok) {
        const html = await htmlRes.value.text();
        const data = await extractRenderJson(html);
        if (data) {
          const { snapshot: snap, config: cfg } = parseSnapshotJson(data);
          if (snap) setSnapshot(snap);
          if (cfg) setConfig(cfg);
        }
      }

      // Queue data
      if (queueRes.status === "fulfilled" && queueRes.value.ok) {
        const qd = (await queueRes.value.json()) as QueueData;
        setQueueData(qd);
        // Derive legacy queue stats for QueueBar
        const p0Count = qd.issues.p0.length;
        const agentReady = qd.issues.p1.filter((i) =>
          (i.labels ?? []).some((l) => l.name === "queue/agent-ready"),
        ).length;
        setQueue({ ready: agentReady, claimed: 0, p0: p0Count });
      }

      setMergedPRs(await parseMergedPRs(mergedRes));
      const opened = await parseSearchCount(openedRes);
      const closed = await parseSearchCount(closedRes);
      setVelocity({ opened, closed });

      // Repo stats + CI
      if (repoRes.status === "fulfilled" && repoRes.value.ok) {
        const repo = (await repoRes.value.json()) as {
          stargazers_count: number;
          forks_count: number;
          open_issues_count: number;
        };
        let ciStatus: DakotaStats["ciStatus"] = "unknown";
        if (ciRes.status === "fulfilled" && ciRes.value.ok) {
          const ciData = (await ciRes.value.json()) as {
            workflow_runs?: Array<{ conclusion?: string | null }>;
          };
          const run = ciData.workflow_runs?.[0];
          if (run) {
            ciStatus =
              run.conclusion === "success"
                ? "success"
                : run.conclusion === "failure"
                  ? "failure"
                  : "pending";
          }
        }
        let openPRs = 0;
        try {
          const prRes = await fetchTimeout(
            `${GH_API}/search/issues?q=repo:${DAKOTA}+type:pr+state:open`,
          );
          if (prRes.ok) {
            const prData =
              (await prRes.json()) as GitHubSearchResponse<unknown>;
            openPRs = prData.total_count ?? 0;
          }
        } catch {
          /* non-fatal */
        }
        setDakotaStats({
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          openPRs,
          ciStatus,
        });
      }

      // Commit sparkline
      if (commitsRes.status === "fulfilled" && commitsRes.value.ok) {
        const commitData =
          (await commitsRes.value.json()) as { all?: number[] };
        if (Array.isArray(commitData.all))
          setCommits(commitData.all.slice(-12));
      }

      // Org-wide stats
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000)
          .toISOString()
          .slice(0, 10);
        const orgQueries: [string, string][] = [
          ["openIssues", `org:projectbluefin+state:open+type:issue`],
          ["openPRs", `org:projectbluefin+state:open+type:pr`],
          ["mergedThisWeek", `org:projectbluefin+type:pr+merged:>${weekAgo}`],
          ["agentReadyIssues", `org:projectbluefin+label:queue%2Fagent-ready+state:open`],
          ["agentOpenPRs", `org:projectbluefin+author:kubestellar-hive%5Bbot%5D+state:open+type:pr`],
          ["sourceAgentOpen", `org:projectbluefin+label:source%3Aagent+state:open`],
        ];
        const orgRepoRes = await fetchTimeout(`${GH_API}/orgs/projectbluefin`);
        const orgRepo = orgRepoRes.ok ? ((await orgRepoRes.json()) as { public_repos?: number }) : {};
        const counts: Record<string, number> = {};
        for (const [key, q] of orgQueries) {
          try {
            const res = await fetchTimeout(
              `${GH_API}/search/issues?q=${q}&per_page=1`,
            );
            if (res.ok) {
              const d = (await res.json()) as GitHubSearchResponse<unknown>;
              counts[key] = d.total_count ?? 0;
            } else {
              counts[key] = 0;
            }
          } catch {
            counts[key] = 0;
          }
        }
        setOrgStats({
          totalRepos: orgRepo.public_repos ?? 0,
          openIssues: counts.openIssues ?? 0,
          openPRs: counts.openPRs ?? 0,
          mergedThisWeek: counts.mergedThisWeek ?? 0,
          agentReadyIssues: counts.agentReadyIssues ?? 0,
          agentOpenPRs: counts.agentOpenPRs ?? 0,
          sourceAgentOpen: counts.sourceAgentOpen ?? 0,
        });
      } catch {
        /* non-fatal */
      }

      // Per-repo PR breakdown
      const HIVE_REPOS = [
        "knuckle",
        "documentation",
        "testsuite",
        "dakota",
        "dakota-iso",
      ];
      const HIVE_BOT = "kubestellar-hive[bot]";
      const prResults = await Promise.allSettled(
        HIVE_REPOS.map((r) =>
          fetchTimeout(
            `${GH_API}/repos/projectbluefin/${r}/pulls?state=open&per_page=100`,
          ),
        ),
      );
      const rPRs: RepoPRs[] = [];
      for (let i = 0; i < HIVE_REPOS.length; i++) {
        const res = prResults[i];
        if (res.status === "fulfilled" && res.value.ok) {
          const prs = (await res.value.json()) as Array<{
            user: { login: string };
          }>;
          rPRs.push({
            repo: HIVE_REPOS[i],
            total: prs.length,
            agentPRs: prs.filter((p) => p.user.login === HIVE_BOT).length,
            label: HIVE_REPOS[i],
          });
        }
      }
      setRepoPRs(rPRs);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setRefreshIn(REFRESH_SECS);
    }
  }, []);

  // Fetch hive history (build-time JSON, no token required)
  useEffect(() => {
    fetch("/data/hive-history.json")
      .then((r) => r.ok ? r.json() as Promise<HiveHistory> : null)
      .then((data) => { if (data) setHiveHistory(data); })
      .catch(() => {/* non-fatal */});
  }, []);

  useEffect(() => {
    void fetchAll();
    const iv = setInterval(() => void fetchAll(), REFRESH_SECS * 1000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  useEffect(() => {
    const t = setInterval(
      () => setRefreshIn((n) => (n > 0 ? n - 1 : REFRESH_SECS)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  // Derived state
  const agents = snapshot?.agents ?? [];
  const advisoryItems = snapshot?.advisoryItems ?? [];
  const activeAgents = agents.filter((a) => a.state === "running");
  const workingAgents = activeAgents.filter((a) => a.busy === "working");
  const repos = config?.repos ?? [];
  const agentOfDay = pickAgentOfDay(agents);
  const supervisorAgent =
    agents.find(
      (a) =>
        a.role?.toLowerCase().includes("supervisor") ||
        a.name.toLowerCase().includes("supervisor"),
    ) ?? null;

  const advisoriesByAgent = React.useMemo(() => {
    const map: Record<string, AdvisoryItem[]> = {};
    for (const item of advisoryItems) {
      if (!map[item.agent]) map[item.agent] = [];
      map[item.agent].push(item);
    }
    return map;
  }, [advisoryItems]);

  let formation = "Formation broken";
  let formationColor = "#f85149";
  if (activeAgents.length >= Math.ceil(agents.length * 0.6)) {
    formation = "Formation coherent";
    formationColor = "#3fb950";
  } else if (activeAgents.length >= 1) {
    formation = "Coverage reduced";
    formationColor = "#d29922";
  }

  const totalCommits = commits.reduce((a, b) => a + b, 0);
  const p0Count = queueData?.issues.p0.length ?? 0;
  const p1Count = queueData?.issues.p1.length ?? 0;
  const prsNeedingReview =
    (queueData?.prs.required.length ?? 0) + (queueData?.prs.none.length ?? 0);

  if (loading) {
    return (
      <Layout
        title="Bluefin Operating System Factory"
        description="Community Driven Agentic OS Development — live AI agent dashboard for projectbluefin"
      >
        <div className={styles.dashboard}>
          <div className={styles.loadingWrap}>
            <div className={styles.loadingText}>
              Connecting to the factory…
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Bluefin Operating System Factory"
      description="Community Driven Agentic OS Development — live AI agent dashboard for projectbluefin"
    >
      <div className={styles.dashboard}>
        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroTitle}>
              <div>
                <Heading as="h1" className={styles.heroH1}>
                  Bluefin Operating System Factory
                </Heading>
                <p className={styles.heroSub}>
                  Community Driven Agentic OS Development &mdash; live AI agent
                  dashboard for{" "}
                  <Link
                    href="https://github.com/projectbluefin"
                    className={styles.heroLink}
                  >
                    projectbluefin
                  </Link>
                </p>
              </div>
            </div>
            {agents.length > 0 && (
              <div className={styles.formationRow}>
                <HealthBar
                  active={activeAgents.length}
                  total={agents.length}
                />
                <span
                  className={styles.formationLabel}
                  style={{ color: formationColor }}
                >
                  {formation} &middot; {activeAgents.length}/{agents.length}{" "}
                  active
                  {workingAgents.length > 0 && (
                    <> &middot; {workingAgents.length} working</>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className={styles.heroRight}>
            <LivePulse />
            {commits.length > 1 && (
              <div className={styles.heroSpark}>
                <svg
                  viewBox="0 0 100 28"
                  className={styles.heroSparkline}
                  aria-hidden="true"
                >
                  {(() => {
                    const W = 100; const H = 28;
                    const max = Math.max(...commits, 1);
                    const pts = commits.map((v, i) => {
                      const x = (i / (commits.length - 1)) * W;
                      const y = H - 2 - (v / max) * (H - 6);
                      return `${x},${y}`;
                    });
                    const area = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${W},${H} L 0,${H} Z`;
                    return (
                      <>
                        <path d={area} fill="rgba(63,185,80,0.12)" />
                        <polyline
                          points={pts.join(" ")}
                          fill="none"
                          stroke="#3fb950"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </>
                    );
                  })()}
                </svg>
                <span className={styles.heroSparkLabel}>{totalCommits} commits / 12w</span>
              </div>
            )}
            {snapshot?.acmmMode && (
              <span
                className={`${styles.modeBadge} ${
                  snapshot.acmmMode === "SURGE"
                    ? styles.modeSurge
                    : styles.modeNormal
                }`}
              >
                {snapshot.acmmMode}
              </span>
            )}
            {dakotaStats && <CiBadge status={dakotaStats.ciStatus} />}
          </div>
        </header>

        {/* Stats strip */}
        <div className={styles.statsRow}>
          {p0Count > 0 && (
            <StatCard
              label="P0 Blockers"
              value={p0Count}
              accent="#f85149"
            />
          )}
          <StatCard label="P1 This Cycle" value={p1Count} />
          <StatCard
            label="Frames"
            value={`${activeAgents.length}/${agents.length}`}
            sub={
              workingAgents.length > 0
                ? `${workingAgents.length} working`
                : "standing by"
            }
            accent={formationColor}
          />
          {prsNeedingReview > 0 && (
            <StatCard
              label="PRs Need Review"
              value={prsNeedingReview}
              accent="#d97706"
            />
          )}
          {queueData && (
            <StatCard
              label="Approved PRs"
              value={queueData.prs.approved.length}
              sub="ready to merge"
              accent="#3fb950"
            />
          )}
          {queueData && (
            <StatCard
              label="Shipped This Cycle"
              value={
                (queueData.victories.dreams.count ?? 0) +
                (queueData.victories.relief.count ?? 0)
              }
              sub="features + fixes"
              accent="#3fb950"
              spark={victorySparkData([
                ...queueData.victories.dreams.recent,
                ...queueData.victories.relief.recent,
              ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), 14)}
              sparkColor="green"
            />
          )}
          {commits.length > 1 && (
            <StatCard
              label="Commit Activity"
              value={totalCommits}
              sub="last 12 weeks"
              spark={commits}
              sparkColor="green"
            />
          )}
          {repos.length > 0 && (
            <StatCard label="Repos" value={repos.length} sub="in formation" />
          )}
          {snapshot?.medianMergeMins != null && (
            <StatCard
              label="Merge Time"
              value={
                snapshot.medianMergeMins < 60
                  ? `${snapshot.medianMergeMins}m`
                  : `${Math.round((snapshot.medianMergeMins / 60) * 10) / 10}h`
              }
              sub="median PR cycle"
              accent="#39d2c0"
            />
          )}
          {snapshot?.acmmLevel != null && (() => {
            const info =
              ACMM_LEVELS[snapshot.acmmLevel!] ?? {
                label: "Unknown",
                desc: "",
                color: "#8b949e",
              };
            return (
              <StatCard
                label="ACMM Level"
                value={`L${snapshot.acmmLevel}`}
                sub={info.label}
                accent={info.color}
              />
            );
          })()}
        </div>

        {/* Guardians / Ghosts */}
        <div className={styles.destinyColumns}>
          <GuardiansColumn prs={queueData?.prs ?? null} />
          <GhostsColumn issues={queueData?.issues ?? null} />
        </div>

        {/* Victory Log */}
        <VictoryLog victories={queueData?.victories ?? null} />

        {/* Governor */}
        <GovernorPanel governor={snapshot?.governor} />

        {/* Commit activity + What agents are doing */}
        <div className={styles.twoCol}>
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>
              Commit Activity
            </Heading>
            <p className={styles.panelMeta}>
              Last 12 weeks &middot; projectbluefin/dakota
            </p>
            {commits.length > 1 ? (
              <div className={styles.sparkWrap}>
                <Sparkline data={commits} />
                <div className={styles.sparkLabels}>
                  <span>12 weeks ago</span>
                  <span className={styles.sparkTotal}>
                    {totalCommits} commits
                  </span>
                  <span>now</span>
                </div>
                <div className={styles.sparkBar}>
                  {commits.map((v, i) => {
                    const max = Math.max(...commits, 1);
                    const h = Math.max((v / max) * 40, v > 0 ? 3 : 1);
                    return (
                      <div
                        key={i}
                        className={styles.sparkBarItem}
                        style={{ height: `${h}px` }}
                        title={`Week ${i + 1}: ${v} commits`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles.empty}>Fetching data…</div>
            )}
          </section>

          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>
              What Frames Are Doing
            </Heading>
            {workingAgents.length > 0 ? (
              <div className={styles.activityList}>
                {workingAgents.map((a) => {
                  const lines = meaningfulSummaryLines(a.liveSummary ?? "", 5);
                  if (lines.length === 0) return null;
                  return (
                    <div key={a.id} className={styles.activityItem}>
                      <span className={styles.activityInitial}>
                        {(a.displayName || a.name)
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <div>
                        <div className={styles.activityAgent}>
                          {a.displayName}
                        </div>
                        {lines.map((line, i) => (
                          <div key={i} className={styles.activityText}>{line}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                {agents.length > 0
                  ? "Frames are between tasks"
                  : "No Frame data — snapshot updating"}
              </div>
            )}
          </section>
        </div>

        {/* Frame formation */}
        {agents.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>
              Frame Formation
            </Heading>
            <div className={styles.agentGrid}>
              {agents.map((a) => (
                <FrameCard key={a.id} agent={a} advisoryItems={advisoriesByAgent[a.name] ?? []} />
              ))}
            </div>
          </section>
        )}

        {/* Frame work log */}
        {advisoryItems.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>
              What Frames Are Working On
            </Heading>
            <p className={styles.panelMeta}>
              Advisory digest — findings, bugs, CI failures logged by each Frame
            </p>
            <AgentWorkLog
              agents={agents}
              items={advisoryItems}
              advisoryIssue={snapshot?.advisoryIssue}
              config={config}
            />
          </section>
        )}

        {/* PR queue chart */}
        {repoPRs.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>PR Queue</Heading>
            <p className={styles.panelMeta}>
              Open pull requests across formation repos &middot; [agent] = hive
              agent authored
            </p>
            <PrQueueChart data={repoPRs} />
          </section>
        )}

        {/* Merged + Contributors */}
        <MergedPRFeed prs={mergedPRs} />
        <ContributorWall prs={mergedPRs} history={hiveHistory} />
        <HistoryTrends history={hiveHistory} />
        <ContributorLeaderboard history={hiveHistory} />

        {/* Velocity + Org stats */}
        <div className={styles.twoCol}>
          <VelocityPanel velocity={velocity} p0={queue?.p0} />
          {orgStats ? (
            <section className={styles.panel}>
              <OrgStatsPanel stats={orgStats} />
            </section>
          ) : null}
        </div>

        {/* Beads + Agent of Day */}
        <div className={styles.twoCol}>
          <BeadsCadencePanel
            beads={snapshot?.beads}
            cadenceMatrix={snapshot?.cadenceMatrix}
            mode={snapshot?.governor?.mode}
          />
          <FrameOfDay agent={agentOfDay} advisoryItems={advisoriesByAgent[agentOfDay?.name ?? ""] ?? []} />
        </div>

        {/* Formation log */}
        <FormationLog
          supervisor={supervisorAgent}
          timestamp={snapshot?.timestamp}
        />

        {/* Governor 24h timeline */}
        {snapshot?.governorTimeline && snapshot.governorTimeline.length >= 10 && (
          <GovernorTimeline ticks={snapshot.governorTimeline} />
        )}

        {/* Token budget */}
        {snapshot?.budgetPct != null && (
          <TokenBudgetPanel
            pct={snapshot.budgetPct}
            total={snapshot.budgetTotal}
            used={snapshot.budgetUsed}
            mode={snapshot.acmmMode ?? snapshot.governor?.mode}
          />
        )}

        {/* Strategy Lab */}
        {snapshot?.nous && (
          <NousPanel nous={snapshot.nous} />
        )}

        {/* About */}
        <section className={styles.panel}>
          <Heading as="h2" className={styles.panelTitle}>
            About the Factory
          </Heading>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <p>
                Project Bluefin is built and maintained by this formation.
                Autonomous agents triage issues, write fixes, review pull
                requests, and keep CI green — around the clock, across every
                repository in the formation.
              </p>
              <p>
                <strong>Hive</strong> is an open-source AI agent orchestration
                system by Andy Anderson. The system implements the{" "}
                <Link href="https://arxiv.org/abs/2604.09388">
                  AI Codebase Maturity Model
                </Link>{" "}
                (ACMM) — a framework from AI-assisted coding to fully autonomous
                development.
              </p>
              <p>
                No one has ever built an agentic OS like this before. This
                dashboard is the control surface.
              </p>
              <div className={styles.aboutLinks}>
                <Link href="https://kubestellar.io/live/hive/bluefin/">
                  Full Hive Dashboard
                </Link>
                <Link href={`https://github.com/${DAKOTA}`}>Dakota Repo</Link>
                <Link href="https://github.com/kubestellar/hive">Hive Project</Link>
                <Link href="https://arxiv.org/abs/2604.09388">
                  ACMM Paper
                </Link>
                <Link href="https://www.cncf.io/blog/2026/05/14/when-ai-agents-become-contributors-how-kubestellar-reached-81-pr-acceptance/">
                  CNCF Blog
                </Link>
              </div>
            </div>
            <div className={styles.agentRoles}>
              {[
                { n: "Supervisor", d: "Monitors all agents, detects stalls" },
                { n: "Scanner", d: "Triages issues, dispatches fixes" },
                { n: "Reviewer", d: "Code review, quality checks" },
                { n: "Architect", d: "Cross-cutting RFCs, new features" },
                { n: "Outreach", d: "Community engagement, coverage tracking" },
              ].map(({ n, d }) => (
                <div key={n} className={styles.roleRow}>
                  <span className={styles.roleName}>{n}</span>
                  <span className={styles.roleDesc}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.dashFooter}>
          <div className={styles.footerLeft}>
            {lastUpdated && (
              <span>
                Updated {lastUpdated.toLocaleTimeString()} &middot; Next refresh
                in {Math.floor(refreshIn / 60)}:
                {String(refreshIn % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className={styles.footerRight}>
            Data:{" "}
            <Link href="https://kubestellar.io/live/hive/bluefin/">
              Hive snapshot
            </Link>{" "}
            +{" "}
            <Link href="https://queue.projectbluefin.io/">
              queue.projectbluefin.io
            </Link>{" "}
            +{" "}
            <Link href="https://docs.github.com/en/rest">GitHub API</Link>
          </div>
        </footer>
        <div className={styles.factoryTagline}>
          Enslaving the Oppressors since 2026
        </div>
      </div>
    </Layout>
  );
}
