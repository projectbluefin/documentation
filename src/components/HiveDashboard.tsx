import React, { useCallback, useEffect, useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import styles from "./HiveDashboard.module.css";

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
}

interface RepoPRs {
  repo: string;
  total: number;
  agentPRs: number;
  label: string;
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

interface HiveHealthEntry {
  status?: string;
  passed?: boolean;
  lastRun?: string;
  name?: string;
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
  pull_request?: {
    url?: string;
  };
  user?: {
    login?: string;
    type?: string;
  };
  updated_at: string;
  html_url: string;
}

interface OrgStats {
  totalRepos:       number;
  openIssues:       number;
  openPRs:          number;
  mergedThisWeek:   number;
  agentReadyIssues: number;
  agentOpenPRs:     number;
  sourceAgentOpen:  number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SNAPSHOT_URL =
  "https://raw.githubusercontent.com/kubestellar/docs/main/public/live/hive/bluefin/snapshot.json";
const SNAPSHOT_HTML_FALLBACK =
  "https://raw.githubusercontent.com/kubestellar/docs/main/public/live/hive/bluefin/index.html";
const GH_API = "https://api.github.com";
const DAKOTA = "projectbluefin/dakota";
const BUILD_WORKFLOW = "246164114";
const REFRESH_SECS = 300;

// ── Data helpers ───────────────────────────────────────────────────────────

// ACMM level descriptions
const ACMM_LEVELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: "Triage Assist",       desc: "Scanner reads and reports",                color: "#8b949e" },
  2: { label: "Advisory",            desc: "Agents suggest, humans act",              color: "#58a6ff" },
  3: { label: "Supervised Autonomy", desc: "Agents act, supervisor monitors",         color: "#d29922" },
  4: { label: "Full Autonomy",       desc: "Agents operate independently",            color: "#f0883e" },
  5: { label: "Self-Directing",      desc: "Agents define their own goals",           color: "#bc8cff" },
};

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
    const issueToMerge = data.issueToMerge as { avg_minutes?: number; median_minutes?: number; p90_minutes?: number } | undefined;
    const advisoryItems = (data.advisoryItems as AdvisoryItem[]) ?? [];

    const snapshot: HiveSnapshot = {
      timestamp:       (data.timestamp as string) ?? new Date().toISOString(),
      hiveId:          (data.hiveId as string) ?? "",
      agents,
      governor,
      beads,
      cadenceMatrix,
      health,
      acmmLevel:       agentMetrics?.outreach?.acmm ?? undefined,
      acmmMode:        governor.mode,
      medianMergeMins: issueToMerge?.median_minutes ?? issueToMerge?.avg_minutes,
      p90MergeMins:    issueToMerge?.p90_minutes,
      advisoryCount:   advisoryItems.length,
      advisoryItems,
      advisoryIssue:   (data.advisoryIssue as number) ?? undefined,
    };

    // Derive config from repos array in the status JSON
    const rawRepos = (data.repos as Array<{ full?: string; name?: string }>) ?? [];
    const config: HiveConfig | null = rawRepos.length > 0 ? {
      org:            (data.hiveId as string ?? "").replace(/^hive-[^-]+-/, "") || "projectbluefin",
      primaryRepo:    rawRepos[0]?.full ?? "",
      repos:          rawRepos.map((r) => r.full ?? r.name ?? "").filter(Boolean),
      ai_author:      "",
      eval_interval_s: 300,
    } : null;

    return { snapshot, config };
  } catch {
    return { snapshot: null, config: null };
  }
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

// Try snapshot.json first; fall back to HTML snapshot (render({...}) pattern)
// until kubestellar/hive publishes snapshot.json for the bluefin formation.
async function fetchSnapshotData(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchTimeout(SNAPSHOT_URL);
    if (res.ok) return await res.json() as Record<string, unknown>;
  } catch { /* fall through */ }
  try {
    const res = await fetchTimeout(SNAPSHOT_HTML_FALLBACK);
    if (!res.ok) return null;
    const html = await res.text();
    // build-snapshot.mjs embeds data as: render(JSON.stringify(data));
    // Extract by walking chars and tracking string context (handles { } inside strings)
    const marker = 'render({"timestamp"';
    const markerIdx = html.indexOf(marker);
    if (markerIdx < 0) return null;
    const jsonStart = markerIdx + 'render('.length;
    let depth = 0, inStr = false, esc = false;
    for (let i = jsonStart; i < html.length; i++) {
      const c = html[i];
      if (esc) { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        if (--depth === 0) {
          try { return JSON.parse(html.slice(jsonStart, i + 1)) as Record<string, unknown>; }
          catch { return null; }
        }
      }
    }
  } catch { /* ignore */ }
  return null;
}


function cleanSummaryLine(line: string): string {
  return line
    .replace(/^[●❯│┃╔╗╚╝╠╣═─┌┐└┘├┤┬┴┼|\s]+/, "")
    .trim();
}

function meaningfulSummaryLines(raw: string, count = 2): string[] {
  return (raw || "")
    .split("\n")
    .map(cleanSummaryLine)
    .filter(
      (line) =>
        line.length > 0 &&
        !/^[─│╔╗╚╝╠╣═┌┐└┘├┤┬┴┼]+$/.test(line) &&
        !line.startsWith("/") &&
        !line.includes("──") &&
        !line.toUpperCase().includes("AUTHORIZED") &&
        !line.includes("Do not investigate") &&
        !line.includes("Do not fix"),
    )
    .slice(0, count);
}

function firstMeaningfulLines(raw: string, count = 2): string {
  return meaningfulSummaryLines(raw, count)
    .filter((line) => line.length > 12)
    .join(" · ");
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LivePulse() {
  return (
    <span className={styles.livePulse}>
      <span className={styles.pulseDot} />
      LIVE
    </span>
  );
}

function HealthBar({ active, total }: { active: number; total: number }) {
  const filled = total > 0 ? Math.round((active / total) * 10) : 0;
  return (
    <div
      className={styles.healthBar}
      title={`${active}/${total} agents active`}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={i < filled ? styles.hFilled : styles.hEmpty}
        />
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div>
        <div
          className={styles.statValue}
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </div>
        <div className={styles.statLabel}>{label}</div>
        {sub && <div className={styles.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: HiveAgent }) {
  const running = agent.state === "running";
  const working = running && agent.busy === "working";
  const paused = running && agent.paused;

  let statusCls = styles.sStopped;
  let statusLabel = "stopped";
  if (working) {
    statusCls = styles.sWorking;
    statusLabel = "working";
  } else if (paused) {
    statusCls = styles.sPaused;
    statusLabel = "paused";
  } else if (running) {
    statusCls = styles.sIdle;
    statusLabel = "idle";
  }

  const snippet = firstMeaningfulLines(agent.liveSummary ?? "", 2);
  const shortModel = (agent.model ?? "")
    .replace("claude-", "")
    .replace("-latest", "")
    .replace("sonnet-4-6", "sonnet-4.6")
    .replace("opus-4-5", "opus-4.5");

  return (
    <div
      className={`${styles.agentCard} ${running ? styles.agentOn : styles.agentOff}`}
      style={{ "--ac": agent.color } as React.CSSProperties}
    >
      <div className={styles.agentHead}>
        <span className={styles.agentEmoji}>{agent.name.slice(0, 1).toUpperCase()}</span>
        <div className={styles.agentMeta}>
          <span className={styles.agentName}>{agent.displayName}</span>
          <span className={`${styles.agentPill} ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
        {shortModel && (
          <span className={styles.agentModel}>{shortModel}</span>
        )}
      </div>
      {snippet && <div className={styles.agentSnippet}>{snippet.slice(0, 140)}</div>}
      <div className={styles.agentFoot}>
        {agent.cli && <span className={styles.agentTag}>{agent.cli}</span>}
        {agent.cadence && (
          <span className={styles.agentTag}>↻ {agent.cadence}</span>
        )}
        {agent.restarts != null && agent.restarts > 0 && (
          <span className={`${styles.agentTag} ${styles.agentTagWarn}`}>
            ↺ {agent.restarts}
          </span>
        )}
        {agent.lastKick && (
          <span className={styles.agentTagMuted}>{agent.lastKick}</span>
        )}
      </div>
    </div>
  );
}

function CiBadge({ status }: { status: DakotaStats["ciStatus"] }) {
  const map: Record<string, { icon: string; label: string; color: string }> = {
    success: { icon: "✅", label: "CI Passing", color: "#3fb950" },
    failure: { icon: "❌", label: "CI Failing", color: "#f85149" },
    pending: { icon: "⏳", label: "CI Running", color: "#d29922" },
    unknown: { icon: "⚪", label: "CI Unknown", color: "#8b949e" },
  };
  const { icon, label, color } = map[status] ?? map.unknown;
  return (
    <Link
      href={`https://github.com/${DAKOTA}/actions/workflows/build.yml`}
      className={styles.ciBadge}
      style={{ color }}
    >
      {icon} {label}
    </Link>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const W = 400;
  const H = 72;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 6 - ((v / max) * (H - 12));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePts = pts.join(" ");
  const area = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${W},${H} L 0,${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.sparkline}
      aria-label="Commit activity over last 12 weeks"
    >
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fb950" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3fb950" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <polyline
        points={linePts}
        fill="none"
        stroke="#3fb950"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest point dot */}
      <circle
        cx={W}
        cy={pts[pts.length - 1].split(",")[1]}
        r="4"
        fill="#3fb950"
        stroke="#0d1117"
        strokeWidth="2"
      />
    </svg>
  );
}

function QueueBar({ ready, claimed, p0 }: QueueStats) {
  const total = Math.max(ready + claimed, 1);
  const claimedPct = (claimed / total) * 100;
  const readyPct = (ready / total) * 100;
  return (
    <div className={styles.queueWrap}>
      <div className={styles.queueBar}>
        <div
          className={styles.queueClaimed}
          style={{ width: `${claimedPct}%` }}
          title={`${claimed} claimed`}
        />
        <div
          className={styles.queueReady}
          style={{ width: `${readyPct}%` }}
          title={`${ready} ready`}
        />
      </div>
      <div className={styles.queueLegend}>
        <span className={styles.queueLegendClaimed}>
          ■ {claimed} claimed
        </span>
        <span className={styles.queueLegendReady}>■ {ready} ready</span>
        {p0 > 0 && (
          <span className={styles.queueLegendP0}>P0: {p0}</span>
        )}
      </div>
    </div>
  );
}


// ── PR Queue horizontal bar chart ─────────────────────────────────────────

function PrQueueChart({ data }: { data: RepoPRs[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className={styles.prChart}>
      {data.map((d) => {
        const pct     = (d.total / max) * 100;
        const agentPct = d.total > 0 ? (d.agentPRs / d.total) * 100 : 0;
        return (
          <div key={d.repo} className={styles.prRow}>
            <Link
              href={`https://github.com/projectbluefin/${d.repo}/pulls`}
              className={styles.prRepoLabel}
            >
              {d.repo}
            </Link>
            <div className={styles.prBarWrap}>
              <div className={styles.prBarTrack}>
                <div
                  className={styles.prBarFill}
                  style={{ width: `${pct}%` }}
                >
                  {/* agent-authored segment */}
                  <div
                    className={styles.prBarAgent}
                    style={{ width: `${agentPct}%` }}
                    title={`${d.agentPRs} agent PRs`}
                  />
                </div>
              </div>
              <span className={styles.prCount}>
                {d.total}
                {d.agentPRs > 0 && (
                  <span className={styles.prAgentCount}> (agent: {d.agentPRs})</span>
                )}
              </span>
            </div>
          </div>
        );
      })}
      <div className={styles.prLegend}>
        <span className={styles.prLegendHuman}>■ Human / bot</span>
        <span className={styles.prLegendAgent}>■ Hive agent</span>
      </div>
    </div>
  );
}

// ── Agent work log ─────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  high:   "#f85149",
  medium: "#d29922",
  low:    "#8b949e",
};

const TYPE_ICON: Record<string, string> = {
  "ci-failure":   "CI",
  "finding":      ">>",
  "bug":          "!",
  "feature":      "+",
  "coverage-gap": "cov",
  "security":     "sec",
  "refactor":     "ref",
};

function relTime(ts?: string): string {
  if (!ts) return "—";
  try {
    const diff = Math.max(Date.now() - new Date(ts).getTime(), 0);
    const d    = Math.floor(diff / 86400000);
    const h    = Math.floor(diff / 3600000);
    const m    = Math.floor(diff / 60000);
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
    .filter((agent) => agent.state === "running" && agent.busy === "working")
    .sort(
      (a, b) =>
        (b.restarts ?? 0) - (a.restarts ?? 0) ||
        new Date(b.lastKick ?? 0).getTime() - new Date(a.lastKick ?? 0).getTime(),
    );
  if (working[0]) return working[0];

  return [...agents].sort(
    (a, b) => new Date(b.lastKick ?? 0).getTime() - new Date(a.lastKick ?? 0).getTime(),
  )[0] ?? null;
}

function governorModeClass(mode?: string): string {
  switch ((mode ?? "idle").toLowerCase()) {
    case "surge":
      return styles.govModeSurge;
    case "busy":
      return styles.govModeBusy;
    case "quiet":
      return styles.govModeQuiet;
    default:
      return styles.govModeIdle;
  }
}

function healthTone(entry: unknown): "pass" | "fail" | "warn" {
  if (!isRecord(entry)) return "warn";
  const status = typeof entry.status === "string" ? entry.status.toLowerCase() : "";
  if (entry.passed === true || status === "passing" || status === "success") return "pass";
  if (entry.passed === false || status === "failing" || status === "failure") return "fail";
  return "warn";
}

async function parseSearchCount(result: PromiseSettledResult<Response>): Promise<number> {
  if (result.status !== "fulfilled" || !result.value.ok) return 0;
  const data = (await result.value.json()) as GitHubSearchResponse<unknown>;
  return typeof data.total_count === "number" ? data.total_count : 0;
}

async function parseMergedPRs(result: PromiseSettledResult<Response>): Promise<MergedPR[]> {
  if (result.status !== "fulfilled" || !result.value.ok) return [];
  const data = (await result.value.json()) as GitHubSearchResponse<GitHubSearchIssueItem>;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => {
    const author = item.user?.login ?? "unknown";
    return {
      number: item.number,
      title: item.title,
      repo: parseRepoName(item.repository_url, item.pull_request?.url),
      author,
      isBot: author.endsWith("[bot]") || item.user?.type === "Bot",
      updatedAt: item.updated_at,
      url: item.html_url,
    };
  });
}

function MergedPRFeed({ prs }: { prs: MergedPR[] }) {
  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Merged PR Feed</Heading>
      <p className={styles.panelMeta}>Last 15 merged pull requests across projectbluefin</p>
      {prs.length > 0 ? (
        <div className={styles.feedList}>
          {prs.map((pr) => {
            const accent = repoAccent(pr.repo);
            return (
              <Link
                key={`${pr.repo}-${pr.number}`}
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className={styles.feedItem}
              >
                <span
                  className={styles.feedRepo}
                  style={{ backgroundColor: `${accent}22`, borderColor: `${accent}66`, color: accent }}
                >
                  {pr.repo}
                </span>
                <span className={styles.feedTitle}>{pr.title}</span>
                <span className={styles.feedMeta}>
                  {pr.isBot ? "[agent] " : ""}
                  {pr.author} · {relTime(pr.updatedAt)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>No recently merged pull requests found.</div>
      )}
    </section>
  );
}

function ContributorWall({ prs }: { prs: MergedPR[] }) {
  const humans: string[] = [];
  for (const pr of prs) {
    if (pr.isBot || humans.includes(pr.author)) continue;
    humans.push(pr.author);
    if (humans.length >= 20) break;
  }
  const botCount = prs.filter((pr) => pr.isBot).length;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Contributor Wall</Heading>
      <p className={styles.panelMeta}>Humans landing code in the latest merged queue</p>
      {humans.length > 0 ? (
        <div className={styles.contributorGrid}>
          {humans.map((login) => (
            <Link
              key={login}
              href={`https://github.com/${login}`}
              target="_blank"
              rel="noreferrer"
              className={styles.contributorCard}
            >
              <img
                src={`https://github.com/${login}.png?size=40`}
                alt={login}
                className={styles.contributorAvatar}
                loading="lazy"
              />
              <span className={styles.contributorName}>{login}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Agents are running the show</div>
      )}
      {botCount > 0 ? <div className={styles.botCountChip}>{botCount} agent PRs</div> : null}
    </section>
  );
}

function VelocityPanel({ velocity, p0 }: { velocity: Velocity | null; p0?: number }) {
  const opened = velocity?.opened ?? 0;
  const closed = velocity?.closed ?? 0;
  const net = opened - closed;
  const deltaLabel =
    net > 0 ? `▲ net +${net}` : net < 0 ? `▼ net −${Math.abs(net)}` : "◆ net 0";

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Issue Velocity</Heading>
      <p className={styles.panelMeta}>Issues · last 7 days · projectbluefin org</p>
      <div className={styles.velocityRow}>
        <div>
          <div className={styles.velocityNum}>{opened}</div>
          <div className={styles.miniLabel}>opened this week</div>
        </div>
        <div>
          <div className={styles.velocityNum}>{closed}</div>
          <div className={styles.miniLabel}>closed this week</div>
        </div>
      </div>
      <div
        className={`${styles.velocityDelta} ${
          net > 0 ? styles.velocityDeltaUp : net < 0 ? styles.velocityDeltaDown : styles.velocityDeltaFlat
        }`}
      >
        {deltaLabel}
      </div>
      {typeof p0 === "number" && p0 > 0 ? <div className={styles.p0Alert}>P0 unresolved: {p0}</div> : null}
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
      <Heading as="h2" className={styles.panelTitle}>Governor</Heading>
      <div className={`${styles.govMode} ${governorModeClass(governor?.mode)}`}>{mode}</div>
      <div className={styles.kv}>
        <span>Queue depth</span>
        <strong>{issues} issues + {prs} PRs in queue</strong>
      </div>
      <div className={styles.govThreshBar}>
        <div className={styles.govThreshZoneQuiet} style={{ width: `${quietWidth}%` }}>QUIET</div>
        <div className={styles.govThreshZoneBusy} style={{ width: `${busyWidth}%` }}>BUSY</div>
        <div className={styles.govThreshZoneSurge} style={{ width: `${surgeWidth}%` }}>SURGE</div>
        <span className={styles.govThreshMarker} style={{ left: `calc(${markerLeft}% - 1px)` }} />
      </div>
      <div className={styles.govThreshLegend}>
        <span>Q ≤ {quiet}</span>
        <span>B ≤ {busy}</span>
        <span>S ≥ {surge}</span>
      </div>
      <p className={styles.panelMeta}>Next kick: {governor?.nextKick ? relTime(governor.nextKick) : "—"}</p>
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
      <Heading as="h2" className={styles.panelTitle}>Beads + Cadence</Heading>
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

function AgentOfDay({ agent }: { agent: HiveAgent | null }) {
  if (!agent) {
    return (
      <section className={`${styles.panel} ${styles.agentOfDayCard}`}>
      <Heading as="h2" className={styles.panelTitle}>Agent of the Day</Heading>
        <div className={styles.empty}>No agent spotlight available.</div>
      </section>
    );
  }

  const summaryLines = meaningfulSummaryLines(agent.liveSummary ?? "", 3);

  return (
    <section className={`${styles.panel} ${styles.agentOfDayCard}`}>
      <Heading as="h2" className={styles.panelTitle}>Agent of the Day</Heading>
      <div className={styles.agentOfDayHero}>
        <div className={styles.agentHeroInitial}>{(agent.displayName || agent.name).slice(0, 1).toUpperCase()}</div>
        <div>
          <div className={styles.agentOfDayLabel}>
            {agent.busy === "working" ? "Currently active" : "Most recently active"}
          </div>
          <div className={styles.agentHeroName}>{agent.displayName || agent.name}</div>
          <div className={styles.agentHeroMeta}>{agent.role || "Generalist"} · {agent.model || "Unknown model"}</div>
        </div>
      </div>
      <div className={styles.agentOfDaySummary}>
        {summaryLines.length > 0 ? summaryLines.map((line) => <div key={line}>{line}</div>) : "Awaiting next assignment…"}
      </div>
    </section>
  );
}

function FormationLog({ supervisor, timestamp }: { supervisor: HiveAgent | null; timestamp?: string }) {
  const lines = supervisor?.liveSummary ? meaningfulSummaryLines(supervisor.liveSummary, 8) : [];

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Formation Log</Heading>
      {lines.length > 0 ? (
        <div className={styles.formationLogList}>
          {lines.map((line, idx) => (
            <div key={`${idx}-${line}`} className={styles.formationLogEntry}>
              <span className={styles.formationLogStamp}>{timestamp ? relTime(timestamp) : "recent"}</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>No formation log available</div>
      )}
    </section>
  );
}

function HealthPanel({ health }: { health?: Record<string, unknown> }) {
  const entries = Object.entries(health ?? {}).filter(([, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return null;

  return (
    <section className={styles.panel}>
      <Heading as="h2" className={styles.panelTitle}>Health Checks</Heading>
      <div className={styles.healthList}>
        {entries.map(([key, raw]) => {
          const tone = healthTone(raw);
          const entry = isRecord(raw) ? (raw as HiveHealthEntry) : {};
          return (
            <div key={key} className={styles.healthItem}>
              <span
                className={`${styles.healthDot} ${
                  tone === "pass" ? styles.healthDotPass : tone === "fail" ? styles.healthDotFail : styles.healthDotWarn
                }`}
              />
              <span>{entry.name || key}</span>
              <span className={styles.feedMeta}>{entry.lastRun ? relTime(entry.lastRun) : entry.status || "status unknown"}</span>
            </div>
          );
        })}
      </div>
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

  // Group items by agent, newest first
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

  // Extract repo from advisory title (e.g. "knuckle PR #285")
  function repoFromTitle(title: string): string | null {
    const m = title.match(/\b(knuckle|documentation|testsuite|dakota|dakota-iso|website|bootc-installer)\b/i);
    return m ? m[1] : null;
  }

  const org = config?.org ?? "projectbluefin";

  return (
    <div className={styles.workLog}>
      {agents.map((agent) => {
        const agentItems = byAgent[agent.name] ?? [];
        const isExpanded = expanded === agent.name;
        const visible    = isExpanded ? agentItems : agentItems.slice(0, 3);
        const repos      = [...new Set(agentItems.map((i) => repoFromTitle(i.title)).filter(Boolean))];

        return (
          <div key={agent.id} className={styles.workLogAgent}>
            <div className={styles.workLogHeader}>
              <span className={styles.workLogEmoji}>{agent.emoji}</span>
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
                  const icon  = TYPE_ICON[item.type] ?? "?";
                  const color = SEV_COLOR[item.severity] ?? "#8b949e";
                  const repo  = repoFromTitle(item.title);
                  return (
                    <div key={i} className={styles.workLogItem}>
                      <span className={styles.workLogIcon}>{icon}</span>
                      <div className={styles.workLogItemBody}>
                        <span className={styles.workLogTitle}>{item.title.slice(0, 110)}</span>
                        <div className={styles.workLogMeta}>
                          <span className={styles.workLogSev} style={{ color }}>{item.severity}</span>
                          <span className={styles.workLogType}>{item.type}</span>
                          {repo && (
                            <Link
                              href={`https://github.com/${org}/${repo}`}
                              className={styles.workLogRepo}
                            >
                              {repo}
                            </Link>
                          )}
                          <span className={styles.workLogTime}>{relTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agentItems.length > 3 && (
                  <button
                    className={styles.workLogToggle}
                    onClick={() => setExpanded(isExpanded ? null : agent.name)}
                  >
                    {isExpanded
                      ? "▲ Show less"
                      : `▼ Show ${agentItems.length - 3} more`}
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
      {advisoryIssue && (
        <div className={styles.workLogFooter}>
          <Link
            href={`https://github.com/${org}/knuckle/issues/${advisoryIssue}`}
            className={styles.workLogDigestLink}
          >
            View full advisory digest (issue #{advisoryIssue}) →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Org stats panel ───────────────────────────────────────────────────────

function OrgStatsPanel({ stats }: { stats: OrgStats }) {
  const agentTotal = stats.agentReadyIssues + stats.agentOpenPRs + stats.sourceAgentOpen;
  return (
    <div className={styles.orgGrid}>
      {/* Left: org overview */}
      <div className={styles.orgOverview}>
        <Heading as="h2" className={styles.panelTitle}>projectbluefin Org</Heading>
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

      {/* Right: agent activity */}
      <div className={styles.orgAgentActivity}>
        <Heading as="h2" className={styles.panelTitle}>Agent Activity</Heading>
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

// ── Main component ─────────────────────────────────────────────────────────

export default function HiveDashboard(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<HiveSnapshot | null>(null);
  const [config, setConfig] = useState<HiveConfig | null>(null);
  const [dakotaStats, setDakotaStats] = useState<DakotaStats | null>(null);
  const [queue, setQueue] = useState<QueueStats | null>(null);
  const [commits, setCommits] = useState<number[]>([]);
  const [orgStats, setOrgStats]   = useState<OrgStats | null>(null);
  const [repoPRs, setRepoPRs]     = useState<RepoPRs[]>([]);
  const [mergedPRs, setMergedPRs] = useState<MergedPR[]>([]);
  const [velocity, setVelocity] = useState<Velocity | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIn, setRefreshIn] = useState(REFRESH_SECS);

  const fetchAll = useCallback(async () => {
    try {
      // Fan out all independent fetches
      const weekAgoISO = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const [repoRes, ciRes, commitsRes, mergedRes, openedRes, closedRes] = await Promise.allSettled([
        fetchTimeout(`${GH_API}/repos/${DAKOTA}`),
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/actions/workflows/${BUILD_WORKFLOW}/runs?per_page=1&status=completed`,
        ),
        fetchTimeout(`${GH_API}/repos/${DAKOTA}/stats/participation`),
        fetchTimeout(`${GH_API}/search/issues?q=org:projectbluefin+type:pr+is:merged&sort=updated&per_page=15`),
        fetchTimeout(`${GH_API}/search/issues?q=org:projectbluefin+type:issue+created:>${weekAgoISO}&per_page=1`),
        fetchTimeout(`${GH_API}/search/issues?q=org:projectbluefin+type:issue+closed:>${weekAgoISO}&per_page=1`),
      ]);

      // ── Snapshot (agents + config) — JSON first, HTML render() fallback
      const snapData = await fetchSnapshotData();
      if (snapData) {
        const { snapshot: snap, config: cfg } = parseSnapshotJson(snapData);
        if (snap) setSnapshot(snap);
        if (cfg) setConfig(cfg);
      }

      setMergedPRs(await parseMergedPRs(mergedRes));
      const opened = await parseSearchCount(openedRes);
      const closed = await parseSearchCount(closedRes);
      setVelocity({ opened, closed });

      // ── Repo stats + CI
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

        // PR count via search API
        let openPRs = 0;
        try {
          const prRes = await fetchTimeout(
            `${GH_API}/search/issues?q=repo:${DAKOTA}+type:pr+state:open`,
          );
          if (prRes.ok) {
            const prData = (await prRes.json()) as GitHubSearchResponse<unknown>;
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

      // ── Commit sparkline (52-week participation)
      // GitHub returns 202 when stats are being computed — status 200 means real data
      if (commitsRes.status === "fulfilled" && commitsRes.value.status === 200) {
        const commitData = (await commitsRes.value.json()) as { all?: number[] };
        if (Array.isArray(commitData.all)) setCommits(commitData.all.slice(-12));
      }

      // ── Queue stats
      const [readyRes, claimedRes, p0Res] = await Promise.allSettled([
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/issues?state=open&labels=queue%2Fagent-ready&per_page=100`,
        ),
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/issues?state=open&labels=queue%2Fclaimed&per_page=100`,
        ),
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/issues?state=open&labels=P0&per_page=100`,
        ),
      ]);
      setQueue({
        ready:
          readyRes.status === "fulfilled" && readyRes.value.ok
            ? ((await readyRes.value.json()) as unknown[]).length
            : 0,
        claimed:
          claimedRes.status === "fulfilled" && claimedRes.value.ok
            ? ((await claimedRes.value.json()) as unknown[]).length
            : 0,
        p0:
          p0Res.status === "fulfilled" && p0Res.value.ok
            ? ((await p0Res.value.json()) as unknown[]).length
            : 0,
      });
      // ── Org-wide stats (search API — sequential to respect rate limit)
      try {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const orgQueries: [string, string][] = [
          ["openIssues",       `org:projectbluefin+state:open+type:issue`],
          ["openPRs",          `org:projectbluefin+state:open+type:pr`],
          ["mergedThisWeek",   `org:projectbluefin+type:pr+merged:>${weekAgo}`],
          ["agentReadyIssues", `org:projectbluefin+label:queue%2Fagent-ready+state:open`],
          ["agentOpenPRs",     `org:projectbluefin+author:kubestellar-hive%5Bbot%5D+state:open+type:pr`],
          ["sourceAgentOpen",  `org:projectbluefin+label:source%3Aagent+state:open`],
        ];
        const orgRepoRes = await fetchTimeout(`${GH_API}/orgs/projectbluefin`);
        const orgRepo    = orgRepoRes.ok ? await orgRepoRes.json() : {};
        const counts: Record<string, number> = {};
        for (const [key, q] of orgQueries) {
          try {
            const res = await fetchTimeout(`${GH_API}/search/issues?q=${q}&per_page=1`);
            if (res.ok) { const d = await res.json(); counts[key] = d.total_count ?? 0; }
            else counts[key] = 0;
          } catch { counts[key] = 0; }
        }
        setOrgStats({
          totalRepos:       orgRepo.public_repos ?? 0,
          openIssues:       counts.openIssues       ?? 0,
          openPRs:          counts.openPRs           ?? 0,
          mergedThisWeek:   counts.mergedThisWeek    ?? 0,
          agentReadyIssues: counts.agentReadyIssues  ?? 0,
          agentOpenPRs:     counts.agentOpenPRs      ?? 0,
          sourceAgentOpen:  counts.sourceAgentOpen   ?? 0,
        });
      } catch { /* non-fatal */ }

      // ── Per-repo PR queue
      const HIVE_REPOS = ["knuckle", "documentation", "testsuite", "dakota", "dakota-iso"];
      const HIVE_BOT   = "kubestellar-hive[bot]";
      const prResults  = await Promise.allSettled(
        HIVE_REPOS.map((r) =>
          fetchTimeout(`${GH_API}/repos/projectbluefin/${r}/pulls?state=open&per_page=100`),
        ),
      );
      const rPRs: RepoPRs[] = [];
      for (let i = 0; i < HIVE_REPOS.length; i++) {
        const res = prResults[i];
        if (res.status === "fulfilled" && res.value.ok) {
          const prs = (await res.value.json()) as Array<{ user: { login: string } }>;
          rPRs.push({
            repo:     HIVE_REPOS[i],
            total:    prs.length,
            agentPRs: prs.filter((p) => p.user.login === HIVE_BOT).length,
            label:    HIVE_REPOS[i],
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

  useEffect(() => {
    void fetchAll();
    const iv = setInterval(() => void fetchAll(), REFRESH_SECS * 1000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // Countdown ticker
  useEffect(() => {
    const t = setInterval(
      () => setRefreshIn((n) => (n > 0 ? n - 1 : REFRESH_SECS)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  // ── Derived state
  const agents      = snapshot?.agents ?? [];
  const advisoryItems = snapshot?.advisoryItems ?? [];
  const activeAgents = agents.filter((a) => a.state === "running");
  const workingAgents = activeAgents.filter((a) => a.busy === "working");
  const repos = config?.repos ?? [];
  const agentOfDay = pickAgentOfDay(agents);
  const supervisorAgent = agents.find(
    (agent) =>
      agent.role?.toLowerCase().includes("supervisor") ||
      agent.name.toLowerCase().includes("supervisor") ||
      agent.displayName?.toLowerCase().includes("supervisor"),
  ) ?? null;
  const hasHealth = Boolean(snapshot?.health && Object.keys(snapshot.health).length > 0);

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

  // ── Loading state
  if (loading) {
    return (
      <Layout
        title="Dakota OS Factory"
        description="Community Driven Agentic OS Development — live AI agent dashboard for projectbluefin/dakota"
      >
        <div className={styles.dashboard}>
          <div className={styles.loadingWrap}>
            <div className={styles.loadingText}>Connecting to the hive…</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Dakota OS Factory"
      description="Live AI agent dashboard for the world's first agentic operating system"
    >
      <div className={styles.dashboard}>
        {/* ── Hero header ─────────────────────────────────────── */}
        <header className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroTitle}>
            <div>
                <Heading as="h1" className={styles.heroH1}>Dakota OS Factory</Heading>
                <p className={styles.heroSub}>
                  Community Driven Agentic OS Development
                  {" · "}
                  <Link
                    href={`https://github.com/${DAKOTA}`}
                    className={styles.heroLink}
                  >
                    projectbluefin/dakota ↗
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
                  {formation} · {activeAgents.length}/{agents.length} active
                  {workingAgents.length > 0 && (
                    <> · {workingAgents.length} working</>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroRight}>
            <LivePulse />
            {snapshot?.acmmMode && (
              <span className={`${styles.modeBadge} ${snapshot.acmmMode === "SURGE" ? styles.modeSurge : styles.modeNormal}`}>
                {snapshot.acmmMode}
              </span>
            )}
            {dakotaStats && <CiBadge status={dakotaStats.ciStatus} />}
          </div>
        </header>

        {/* ── Stats strip ─────────────────────────────────────── */}
        <div className={styles.statsRow}>
          {dakotaStats && (
            <>
              <StatCard
                icon="⭐"
                label="Stars"
                value={dakotaStats.stars.toLocaleString()}
              />
              <StatCard
              icon="prs"
                label="Open PRs"
                value={dakotaStats.openPRs}
              />
              <StatCard
                icon="🍴"
                label="Forks"
                value={dakotaStats.forks.toLocaleString()}
              />
            </>
          )}
          {queue && (
            <StatCard
              icon="queue"
              label="Agent Queue"
              value={`${queue.ready} ready`}
              sub={`${queue.claimed} claimed${queue.p0 > 0 ? ` · ${queue.p0} P0` : ""}`}
              accent={queue.p0 > 0 ? "#f85149" : undefined}
            />
          )}
          <StatCard
            icon="agents"
            label="Agents"
            value={`${activeAgents.length}/${agents.length}`}
            sub={
              workingAgents.length > 0
                ? `${workingAgents.length} working now`
                : "standing by"
            }
            accent={formationColor}
          />
          {repos.length > 0 && (
            <StatCard
              icon="repos"
              label="Repos"
              value={repos.length}
              sub="in formation"
            />
          )}
          {totalCommits > 0 && (
            <StatCard
              icon="commits"
              label="Commits"
              value={totalCommits}
              sub="last 12 weeks"
              accent="#58a6ff"
            />
          )}
          {snapshot?.acmmLevel != null && (() => {
            const info = ACMM_LEVELS[snapshot.acmmLevel!] ?? { label: "Unknown", desc: "", color: "#8b949e" };
            return (
              <StatCard
                icon="acmm"
                label="ACMM Level"
                value={`L${snapshot.acmmLevel}`}
                sub={info.label}
                accent={info.color}
              />
            );
          })()}
          {snapshot?.advisoryCount != null && snapshot.advisoryCount > 0 && (
            <StatCard
              icon="notes"
              label="Advisories"
              value={snapshot.advisoryCount}
              sub="in digest"
              accent="#f0883e"
            />
          )}
          {snapshot?.medianMergeMins != null && (
            <StatCard
              icon="time"
              label="Merge Time"
              value={
                snapshot.medianMergeMins < 60
                  ? `${snapshot.medianMergeMins}m`
                  : `${Math.round(snapshot.medianMergeMins / 60 * 10) / 10}h`
              }
              sub="median PR cycle"
              accent="#39d2c0"
            />
          )}
        </div>

        {/* ── Org stats ───────────────────────────────────── */}
        {orgStats && (
          <section className={styles.panel}>
            <OrgStatsPanel stats={orgStats} />
          </section>
        )}

        {/* ── ACMM level panel ──────────────────────────────────── */}
        {snapshot?.acmmLevel != null && (() => {
          const info = ACMM_LEVELS[snapshot.acmmLevel!] ?? { label: "Unknown", desc: "", color: "#8b949e" };
          return (
            <section className={styles.panel}>
              <Heading as="h2" className={styles.panelTitle}>AI Maturity Level (ACMM)</Heading>
              <div className={styles.acmmRow}>
                <div className={styles.acmmLevelBig} style={{ color: info.color }}>
                  L{snapshot.acmmLevel}
                </div>
                <div className={styles.acmmInfo}>
                  <div className={styles.acmmLabel} style={{ color: info.color }}>{info.label}</div>
                  <div className={styles.acmmDesc}>{info.desc}</div>
                  {snapshot.acmmMode && (
                    <span className={`${styles.modeBadge} ${snapshot.acmmMode === "SURGE" ? styles.modeSurge : styles.modeNormal}`} style={{ marginTop: "0.5rem", display: "inline-flex" }}>
                      {snapshot.acmmMode} mode
                    </span>
                  )}
                  {snapshot.medianMergeMins != null && (
                    <div className={styles.acmmStat}>
                      Median merge: <strong>
                        {snapshot.medianMergeMins < 60
                          ? `${snapshot.medianMergeMins}m`
                          : `${Math.round(snapshot.medianMergeMins / 60 * 10) / 10}h`}
                      </strong>
                      {snapshot.p90MergeMins != null && (
                        <> · p90: <strong>
                          {snapshot.p90MergeMins < 60
                            ? `${snapshot.p90MergeMins}m`
                            : `${Math.round(snapshot.p90MergeMins / 60 * 10) / 10}h`}
                        </strong></>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.acmmScale}>
                  {[1, 2, 3, 4, 5].map((l) => {
                    const li = ACMM_LEVELS[l];
                    const active = l === snapshot.acmmLevel;
                    const past = l < (snapshot.acmmLevel ?? 0);
                    return (
                      <div
                        key={l}
                        className={`${styles.acmmStep} ${
                          active ? styles.acmmStepActive : past ? styles.acmmStepPast : styles.acmmStepFuture
                        }`}
                        style={active || past ? { borderColor: li.color, color: li.color } : undefined}
                        title={li.desc}
                      >
                        <span className={styles.acmmStepNum}>L{l}</span>
                        <span className={styles.acmmStepLabel}>{li.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}

        {agents.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>Agent Formation</Heading>
            <div className={styles.agentGrid}>
              {agents.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </section>
        )}

        {/* ── Commits + Activity ───────────────────────────────── */}
        <div className={styles.twoCol}>
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>Commit Activity</Heading>
            <p className={styles.panelMeta}>
              Last 12 weeks · projectbluefin/dakota
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
            <Heading as="h2" className={styles.panelTitle}>What the Team Is Doing</Heading>
            {workingAgents.length > 0 ? (
              <div className={styles.activityList}>
                {workingAgents.map((a) => {
                  const snippet = firstMeaningfulLines(a.liveSummary ?? "", 3);
                  if (!snippet) return null;
                  return (
                    <div key={a.id} className={styles.activityItem}>
                      <span className={styles.activityInitial}>{(a.displayName || a.name).slice(0, 1).toUpperCase()}</span>
                      <div>
                        <div className={styles.activityAgent}>
                          {a.displayName}
                        </div>
                        <div className={styles.activityText}>
                          {snippet.slice(0, 180)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                {agents.length > 0
                  ? "Agents are between tasks"
                  : "No agent data — snapshot may be updating"}
              </div>
            )}
          </section>
        </div>

        {/* ── Queue + Repos ────────────────────────────────────── */}
        <div className={styles.twoCol}>
          {queue && (queue.ready > 0 || queue.claimed > 0) && (
            <section className={styles.panel}>
              <Heading as="h2" className={styles.panelTitle}>Issue Queue</Heading>
              <p className={styles.panelMeta}>
                Agent-managed work items in projectbluefin/dakota
              </p>
              <QueueBar
                ready={queue.ready}
                claimed={queue.claimed}
                p0={queue.p0}
              />
              <div className={styles.queueLinks}>
                <Link
                  href={`https://github.com/${DAKOTA}/issues?q=is:open+label:queue%2Fagent-ready`}
                  className={styles.queueLink}
                >
                  View ready →
                </Link>
                <Link
                  href={`https://github.com/${DAKOTA}/issues?q=is:open+label:queue%2Fclaimed`}
                  className={styles.queueLink}
                >
                  View claimed →
                </Link>
              </div>
            </section>
          )}

          {repos.length > 0 && (
            <section className={styles.panel}>
              <Heading as="h2" className={styles.panelTitle}>Repos in Formation</Heading>
              <p className={styles.panelMeta}>
                All repositories managed by this hive instance
              </p>
              <div className={styles.repoGrid}>
                {repos.map((r) => (
                  <Link
                    key={r}
                    href={`https://github.com/${config?.org ?? "projectbluefin"}/${r}`}
                    className={`${styles.repoChip} ${r === "dakota" ? styles.repoChipDakota : ""}`}
                  >
                    {r}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── PR Queue ─────────────────────────────────────────── */}
        {repoPRs.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>PR Queue</Heading>
            <p className={styles.panelMeta}>Open pull requests across formation repos · [agent] = hive agent authored</p>
            <PrQueueChart data={repoPRs} />
          </section>
        )}

        {/* ── Agent work log ───────────────────────────────────── */}
        {advisoryItems.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>What Agents Are Working On</Heading>
            <p className={styles.panelMeta}>
              Advisory digest — findings, bugs, CI failures logged by each agent
            </p>
            <AgentWorkLog
              agents={agents}
              items={advisoryItems}
              advisoryIssue={snapshot?.advisoryIssue}
              config={config}
            />
          </section>
        )}

        <div className={styles.twoCol}>
          <MergedPRFeed prs={mergedPRs} />
          <ContributorWall prs={mergedPRs} />
        </div>

        <div className={styles.twoCol}>
          <VelocityPanel velocity={velocity} p0={queue?.p0} />
          <GovernorPanel governor={snapshot?.governor} />
        </div>

        <BeadsCadencePanel
          beads={snapshot?.beads}
          cadenceMatrix={snapshot?.cadenceMatrix}
          mode={snapshot?.governor?.mode}
        />

        <div className={styles.twoCol}>
          <AgentOfDay agent={agentOfDay} />
          <FormationLog supervisor={supervisorAgent} timestamp={snapshot?.timestamp} />
        </div>

        {hasHealth ? <HealthPanel health={snapshot?.health} /> : null}

        {/* ── What is Hive ─────────────────────────────────────── */}
        <section className={styles.panel}>
          <Heading as="h2" className={styles.panelTitle}>About the Hive</Heading>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <p>
                Project Bluefin&apos;s <strong>Dakota</strong> is built and
                maintained by this formation. Fully automated OS development,
                humans in charge.
              </p>
              <p>
                <strong>Hive</strong> is an open-source AI agent orchestration
                system by Andy Anderson. Autonomous agents triage issues, write
                fixes, review PRs, and keep CI green — around the clock, across
                every repo in the formation.
              </p>
              <p>
                The system implements the{" "}
                <Link href="https://arxiv.org/abs/2604.09388">
                  AI Codebase Maturity Model
                </Link>{" "}
                (ACMM) — a six-level framework from AI-assisted coding to fully
                autonomous development. The current level is shown live in the Formation Status panel above.
              </p>
              <div className={styles.aboutLinks}>
                <Link href="https://kubestellar.io/live/hive/bluefin/">
                  Full Dashboard ↗
                </Link>
                <Link href={`https://github.com/${DAKOTA}`}>
                  Dakota Repo ↗
                </Link>
                <Link href="https://github.com/kubestellar/hive">
                  Hive Project ↗
                </Link>
                <Link href={`https://github.com/${DAKOTA}/issues`}>
                  Issue Queue ↗
                </Link>
              </div>
              <div className={styles.aboutReadingList}>
                <span className={styles.readingListLabel}>Further reading</span>
                <Link href="https://arxiv.org/abs/2604.09388">
                  arXiv: The AI Codebase Maturity Model ↗
                </Link>
                <Link href="https://www.cncf.io/blog/2026/05/14/when-ai-agents-become-contributors-how-kubestellar-reached-81-pr-acceptance/">
                  CNCF Blog: When AI agents become contributors ↗
                </Link>
                <Link href="https://thenewstack.io/ai-codebase-maturity-model/">
                  The New Stack: Beyond Prompting — 81% PR acceptance ↗
                </Link>
                <Link href="https://clubanderson.medium.com/">
                  Andy Anderson on Medium ↗
                </Link>
                <Link href="https://github.com/kubestellar/hive/blob/main/docs/architecture.md">
                  Hive Architecture Deep Dive ↗
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

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className={styles.dashFooter}>
          <div className={styles.footerLeft}>
            {lastUpdated && (
              <span>
                Updated {lastUpdated.toLocaleTimeString()} · Next refresh in{" "}
                {Math.floor(refreshIn / 60)}:
                {String(refreshIn % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className={styles.footerRight}>
            Data:{" "}
            <Link href="https://kubestellar.io/live/hive/bluefin/">Hive snapshot</Link>{" "}
            +{" "}
            <Link href="https://docs.github.com/en/rest">GitHub API</Link>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
