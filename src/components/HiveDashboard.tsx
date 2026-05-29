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

function parseSnapshotHtml(html: string): {
  snapshot: HiveSnapshot | null;
  config: HiveConfig | null;
} {
  try {
    const cfgMatch = html.match(/_cfg\s*=\s*(\{[^;]+\})/);
    const config = cfgMatch
      ? (JSON.parse(cfgMatch[1]) as HiveConfig)
      : null;

    // Extract agents array (same pattern as hive-status-sync workflow)
    const agentsMatch = html.match(/"agents":\s*(\[.*?\])\s*,\s*"(?:governor|repos|token|hiveId)"/);
    const agents: HiveAgent[] = agentsMatch ? (JSON.parse(agentsMatch[1]) as HiveAgent[]) : [];

    // Extract timestamp + hiveId from render() opening
    const tsMatch = html.match(/render\(\{"timestamp":"([^"]+)","hiveId":"([^"]+)"/);

    // Extract ACMM level
    const acmmMatch = html.match(/"acmmLevel":(\d+)/);
    const acmmLevel = acmmMatch ? parseInt(acmmMatch[1]) : undefined;

    // Extract advisory mode (SURGE / NORMAL etc)
    const modeMatch = html.match(/"acmmLevel":\d+[^}]*"mode":"([^"]+)"/);
    const acmmMode = modeMatch ? modeMatch[1] : undefined;

    // Extract PR merge time stats
    const medianMatch = html.match(/"median_minutes":(\d+)/);
    const p90Match    = html.match(/"p90_minutes":(\d+)/);
    const medianMergeMins = medianMatch ? parseInt(medianMatch[1]) : undefined;
    const p90MergeMins    = p90Match    ? parseInt(p90Match[1])    : undefined;

    // Count advisory items
    const advisoryCount = (html.match(/"type":"[^"]+","severity":/g) ?? []).length;

    // Extract advisory items from digest
    const advisoryItems: AdvisoryItem[] = [];
    const adItemRe = /"agent":"([^"]+)","timestamp":"([^"]+)","type":"([^"]+)","severity":"([^"]+)","title":"([^"]+)"/g;
    let adM: RegExpExecArray | null;
    while ((adM = adItemRe.exec(html)) !== null) {
      advisoryItems.push({
        agent:     adM[1],
        timestamp: adM[2],
        type:      adM[3],
        severity:  adM[4] as AdvisoryItem["severity"],
        title:     adM[5],
      });
    }

    // Advisory issue number
    const advisoryIssueM = html.match(/HIVE_ADVISORY_ISSUE='(\d+)'/);
    const advisoryIssue = advisoryIssueM ? parseInt(advisoryIssueM[1]) : undefined;

    const snapshot: HiveSnapshot = {
      timestamp: tsMatch?.[1] ?? new Date().toISOString(),
      hiveId:    tsMatch?.[2] ?? "",
      agents,
      acmmLevel,
      acmmMode,
      medianMergeMins,
      p90MergeMins,
      advisoryCount: advisoryItems.length || advisoryCount,
      advisoryItems,
      advisoryIssue,
    };
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

function cleanSummaryLine(line: string): string {
  return line
    .replace(/^[●❯│┃╔╗╚╝╠╣═─┌┐└┘├┤┬┴┼|\s]+/, "")
    .trim();
}

function firstMeaningfulLines(raw: string, count = 2): string {
  return (raw || "")
    .split("\n")
    .map(cleanSummaryLine)
    .filter(
      (l) =>
        l.length > 12 &&
        !l.startsWith("/") &&
        !l.includes("──") &&
        !l.toUpperCase().includes("AUTHORIZED") &&
        !l.includes("Do not investigate") &&
        !l.includes("Do not fix"),
    )
    .slice(0, count)
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
        <span className={styles.agentEmoji}>{agent.emoji}</span>
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
          <span className={styles.queueLegendP0}>🔥 {p0} P0</span>
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
                  <span className={styles.prAgentCount}> 🤖{d.agentPRs}</span>
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
  "ci-failure":   "🔴",
  "finding":      "🔍",
  "bug":          "🐛",
  "feature":      "✨",
  "coverage-gap": "🧪",
  "security":     "🛡️",
  "refactor":     "♻️",
};

function relTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const d    = Math.floor(diff / 86400000);
    const h    = Math.floor(diff / 3600000);
    const m    = Math.floor(diff / 60000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  } catch {
    return "";
  }
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
                  const icon  = TYPE_ICON[item.type] ?? "📌";
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
            📋 View full advisory digest (issue #{advisoryIssue}) →
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
        <Heading as="h2" className={styles.panelTitle}>🌐 projectbluefin Org</Heading>
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
        <Heading as="h2" className={styles.panelTitle}>🤖 Agent Activity</Heading>
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
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshIn, setRefreshIn] = useState(REFRESH_SECS);

  const fetchAll = useCallback(async () => {
    try {
      // Fan out all independent fetches
      const [snapRes, repoRes, ciRes, commitsRes] = await Promise.allSettled([
        fetchTimeout(SNAPSHOT_URL),
        fetchTimeout(`${GH_API}/repos/${DAKOTA}`),
        fetchTimeout(
          `${GH_API}/repos/${DAKOTA}/actions/workflows/${BUILD_WORKFLOW}/runs?per_page=1&status=completed`,
        ),
        fetchTimeout(`${GH_API}/repos/${DAKOTA}/stats/participation`),
      ]);

      // ── Snapshot (agents + config)
      if (snapRes.status === "fulfilled" && snapRes.value.ok) {
        const html = await snapRes.value.text();
        const { snapshot: snap, config: cfg } = parseSnapshotHtml(html);
        if (snap) setSnapshot(snap);
        if (cfg) setConfig(cfg);
      }

      // ── Repo stats + CI
      if (repoRes.status === "fulfilled" && repoRes.value.ok) {
        const repo = await repoRes.value.json();

        let ciStatus: DakotaStats["ciStatus"] = "unknown";
        if (ciRes.status === "fulfilled" && ciRes.value.ok) {
          const ciData = await ciRes.value.json();
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
            const prData = await prRes.json();
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
      if (commitsRes.status === "fulfilled" && commitsRes.value.ok) {
        const { all } = await commitsRes.value.json();
        if (Array.isArray(all)) setCommits(all.slice(-12));
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
        title="🐝 Dakota OS Factory"
        description="Community Driven Agentic OS Development — live AI agent dashboard for projectbluefin/dakota"
      >
        <div className={styles.dashboard}>
          <div className={styles.loadingWrap}>
            <div className={styles.loadingBee}>🐝</div>
            <div className={styles.loadingText}>Connecting to the hive…</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="🐝 Dakota OS Factory"
      description="Live AI agent dashboard for the world's first agentic operating system"
    >
      <div className={styles.dashboard}>
        {/* ── Hero header ─────────────────────────────────────── */}
        <header className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroTitle}>
              <span className={styles.heroBee}>🐝</span>
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
                    <>
                      {" "}
                      · {workingAgents.map((a) => a.emoji).join(" ")} working
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroRight}>
            <LivePulse />
            {snapshot?.acmmMode && (
              <span className={`${styles.modeBadge} ${snapshot.acmmMode === "SURGE" ? styles.modeSurge : styles.modeNormal}`}>
                ⚡ {snapshot.acmmMode}
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
                icon="🔀"
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
              icon="🎯"
              label="Agent Queue"
              value={`${queue.ready} ready`}
              sub={`${queue.claimed} claimed${queue.p0 > 0 ? ` · 🔥 ${queue.p0} P0` : ""}`}
              accent={queue.p0 > 0 ? "#f85149" : undefined}
            />
          )}
          <StatCard
            icon="🤖"
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
              icon="📦"
              label="Repos"
              value={repos.length}
              sub="in formation"
            />
          )}
          {totalCommits > 0 && (
            <StatCard
              icon="📈"
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
                icon="⚡"
                label="ACMM Level"
                value={`L${snapshot.acmmLevel}`}
                sub={info.label}
                accent={info.color}
              />
            );
          })()}
          {snapshot?.advisoryCount != null && snapshot.advisoryCount > 0 && (
            <StatCard
              icon="📝"
              label="Advisories"
              value={snapshot.advisoryCount}
              sub="in digest"
              accent="#f0883e"
            />
          )}
          {snapshot?.medianMergeMins != null && (
            <StatCard
              icon="⏱️"
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
              <Heading as="h2" className={styles.panelTitle}>⚡ AI Maturity Level (ACMM)</Heading>
              <div className={styles.acmmRow}>
                <div className={styles.acmmLevelBig} style={{ color: info.color }}>
                  L{snapshot.acmmLevel}
                </div>
                <div className={styles.acmmInfo}>
                  <div className={styles.acmmLabel} style={{ color: info.color }}>{info.label}</div>
                  <div className={styles.acmmDesc}>{info.desc}</div>
                  {snapshot.acmmMode && (
                    <span className={`${styles.modeBadge} ${snapshot.acmmMode === "SURGE" ? styles.modeSurge : styles.modeNormal}`} style={{ marginTop: "0.5rem", display: "inline-flex" }}>
                      ⚡ {snapshot.acmmMode} mode
                    </span>
                  )}
                  {snapshot.medianMergeMins != null && (
                    <div className={styles.acmmStat}>
                      ⏱ Median merge: <strong>
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
            <Heading as="h2" className={styles.panelTitle}>🤖 Agent Formation</Heading>
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
            <Heading as="h2" className={styles.panelTitle}>📈 Commit Activity</Heading>
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
            <Heading as="h2" className={styles.panelTitle}>💬 What the Team Is Doing</Heading>
            {workingAgents.length > 0 ? (
              <div className={styles.activityList}>
                {workingAgents.map((a) => {
                  const snippet = firstMeaningfulLines(a.liveSummary ?? "", 3);
                  if (!snippet) return null;
                  return (
                    <div key={a.id} className={styles.activityItem}>
                      <span className={styles.activityEmoji}>{a.emoji}</span>
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
              <Heading as="h2" className={styles.panelTitle}>🎯 Issue Queue</Heading>
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
              <Heading as="h2" className={styles.panelTitle}>📦 Repos in Formation</Heading>
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
                    {r === "dakota" ? "⚙️" : "📦"} {r}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── PR Queue ─────────────────────────────────────────── */}
        {repoPRs.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>🔀 PR Queue</Heading>
            <p className={styles.panelMeta}>Open pull requests across formation repos · 🤖 = hive agent authored</p>
            <PrQueueChart data={repoPRs} />
          </section>
        )}

        {/* ── Agent work log ───────────────────────────────────── */}
        {advisoryItems.length > 0 && (
          <section className={styles.panel}>
            <Heading as="h2" className={styles.panelTitle}>📋 What Agents Are Working On</Heading>
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

        {/* ── What is Hive ─────────────────────────────────────── */}
        <section className={styles.panel}>
          <Heading as="h2" className={styles.panelTitle}>🔬 About the Hive</Heading>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutText}>
              <p>
                Project Bluefin&apos;s <strong>Dakota</strong> — is built and
                maintained by this formation. Fully automated OS development,
                humans in charge.
              </p>
              <p>
                <strong>Hive</strong> is an open-source AI agent orchestration
                system. Autonomous agents triage issues, write fixes, review PRs,
                and keep CI green — around the clock, across every repo in the
                formation.
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
            </div>
            <div className={styles.agentRoles}>
              {[
                { e: "👑", n: "Supervisor", d: "Monitors all agents, detects stalls" },
                { e: "🔍", n: "Scanner", d: "Triages issues, dispatches fixes" },
                { e: "🔧", n: "CI Maintainer", d: "CI health, workflow fixes" },
                { e: "🏗️", n: "Architect", d: "Cross-cutting RFCs, new features" },
                { e: "🛡️", n: "Sec-Check", d: "Security gate on PRs" },
              ].map(({ e, n, d }) => (
                <div key={n} className={styles.roleRow}>
                  <span>{e}</span>
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
