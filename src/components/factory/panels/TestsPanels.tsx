import React from "react";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import Sparkline from "../../Sparkline";
import { useDataset } from "../FactoryDataContext";
import {
  gapSafe,
  seriesColor,
  seriesDash,
  FX_SEVERITY,
  FX_COLORS,
} from "../chartTheme";
import type { FactoryLive } from "../../HiveFactoryDashboard";
import styles from "./panels.module.css";

/* ---------- data shapes ---------- */
interface Run {
  t: number;
  status: "passed" | "failed" | "running";
  durationMin: number;
  url?: string;
}
interface Suite {
  id: string;
  repo: string;
  workflow: string;
  label: string;
  runs: Run[];
  passRate: number | null;
  flips: number;
  consecutiveFailures: number;
  lastTerminalAt: string | null;
  triageRank: number;
  unavailable: boolean;
  stateReason: string | null;
}
interface TestRunsPayload {
  generatedAt: string;
  windowDays: number;
  suites: Suite[];
  unavailable: boolean;
  stateReason: string | null;
}

/* ---------- helpers ---------- */
function severityFor(suite: Suite): keyof typeof FX_SEVERITY {
  if (suite.consecutiveFailures >= 3) return "alert";
  if (suite.consecutiveFailures >= 1) return "watch";
  if (suite.passRate === null) return "unknown";
  return "ok";
}

function triageReason(suite: Suite): string {
  if (suite.consecutiveFailures >= 1)
    return `${suite.consecutiveFailures} consecutive failure${suite.consecutiveFailures > 1 ? "s" : ""}`;
  if (suite.lastTerminalAt) {
    const days = Math.floor(
      (Date.now() - new Date(suite.lastTerminalAt).getTime()) / 86400000,
    );
    if (days >= 14) return `stale — no terminal run in ${days} days`;
  }
  if (suite.flips >= 3) return `flaky — ${suite.flips} flips in window`;
  return "ranked for triage";
}

function fmtRate(r: number | null): string {
  if (r === null) return "no terminal runs";
  return `${(r * 100).toFixed(1)}%`;
}

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

/* ---------- component ---------- */
export default function TestsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  const { data, loading, reason } = useDataset<TestRunsPayload>("testRuns");

  if (loading) {
    return <Unavailable what="Tests" reason="Loading test run data…" />;
  }
  if (!data || data.unavailable) {
    return (
      <Unavailable
        what="Tests"
        reason={
          data?.stateReason ?? reason ?? "Test run data is not available."
        }
      />
    );
  }

  const suites = data.suites;
  const terminalRuns = suites.flatMap((su) =>
    su.runs.filter((r) => r.status !== "running"),
  );
  const allRuns = suites.flatMap((su) => su.runs);
  const inflight = allRuns.filter((r) => r.status === "running");

  // KPI computations
  const overallPassRate =
    terminalRuns.length > 0
      ? terminalRuns.filter((r) => r.status === "passed").length /
        terminalRuns.length
      : null;
  const failingSuites = suites.filter((su) => su.consecutiveFailures > 0);
  const staleSuites = suites.filter((su) => {
    if (!su.lastTerminalAt) return true;
    return Date.now() - new Date(su.lastTerminalAt).getTime() > 14 * 86400000;
  });

  // Triage
  const triageItems = suites
    .filter((su) => su.triageRank > 0)
    .sort((a, b) => b.triageRank - a.triageRank);

  // Pass-rate trend (top 8 most active)
  const sortedByActivity = [...suites].sort(
    (a, b) => b.runs.length - a.runs.length,
  );
  const trendSuites = sortedByActivity.slice(0, 8);
  const trendCapped = sortedByActivity.length > 8;

  // Build day buckets across 30 days
  const now = Date.now();
  const days: string[] = [];
  for (let i = data.windowDays - 1; i >= 0; i--) {
    days.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  }

  const trendSeries = trendSuites.map((su, idx) => {
    const byDay = new Map<string, { passed: number; total: number }>();
    for (const r of su.runs) {
      if (r.status === "running") continue;
      const d = dayKey(r.t);
      const entry = byDay.get(d) ?? { passed: 0, total: 0 };
      entry.total++;
      if (r.status === "passed") entry.passed++;
      byDay.set(d, entry);
    }
    const values = days.map((d) => {
      const entry = byDay.get(d);
      if (!entry) return null;
      return entry.passed / entry.total;
    });
    return {
      name: su.label,
      type: "line" as const,
      data: gapSafe(values),
      connectNulls: false,
      symbol: "none",
      lineStyle: {
        color: seriesColor(idx),
        type: seriesDash(idx) ? "dashed" : ("solid" as const),
        width: 1.5,
      },
      itemStyle: { color: seriesColor(idx) },
    };
  });

  const trendPoints = trendSeries.reduce(
    (sum, s2) => sum + s2.data.filter((v) => v !== null).length,
    0,
  );

  const trendOption = {
    xAxis: { type: "category" as const, data: days },
    yAxis: { type: "value" as const, min: 0, max: 1 },
    series: trendSeries,
    legend: { show: true },
  };

  // Heatmap: repo × suite
  const repos = [...new Set(suites.map((su) => su.repo))];
  const suiteLabels = suites.map((su) => su.label);
  const heatmapData: Array<[number, number, number]> = [];
  for (let ri = 0; ri < repos.length; ri++) {
    for (let si = 0; si < suites.length; si++) {
      if (suites[si].repo !== repos[ri]) {
        heatmapData.push([si, ri, -1]); // no-data
      } else {
        const sev = severityFor(suites[si]);
        const val =
          sev === "alert" ? 3 : sev === "watch" ? 2 : sev === "ok" ? 1 : 0;
        heatmapData.push([si, ri, val]);
      }
    }
  }

  const heatmapOption = {
    xAxis: {
      type: "category" as const,
      data: suiteLabels,
      axisLabel: { rotate: 45 },
    },
    yAxis: { type: "category" as const, data: repos },
    series: [
      {
        type: "heatmap" as const,
        data: heatmapData,
        label: { show: false },
      },
    ],
    visualMap: {
      min: 0,
      max: 3,
      calculable: false,
      show: false,
      inRange: {
        color: [
          FX_SEVERITY.unknown.color,
          FX_SEVERITY.ok.color,
          FX_SEVERITY.watch.color,
          FX_SEVERITY.alert.color,
        ],
      },
      outOfRange: { color: FX_COLORS.grid },
    },
  };
  const heatmapPoints = heatmapData.filter(([, , v]) => v >= 0).length;

  // Flake sparklines — all share one domain
  const sparklineDomain: [number, number] = [0, 1];
  const suiteSparklines = suites.map((su) => {
    // Map runs to +1 (pass) / -1 (fail), skip running
    const terminal = su.runs.filter((r) => r.status !== "running");
    const values = terminal.map((r) => (r.status === "passed" ? 1 : -1));
    return { label: su.label, values, passRate: su.passRate };
  });

  // Run history table — newest 40 terminal
  const recentTerminal = allRuns
    .filter((r) => r.status !== "running")
    .sort((a, b) => b.t - a.t)
    .slice(0, 40);

  // Map run back to suite
  const runToSuite = new Map<Run, Suite>();
  for (const su of suites) {
    for (const r of su.runs) runToSuite.set(r, su);
  }

  return (
    <div>
      {/* 1. KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{suites.length}</div>
          <div className={styles.kpiLabel}>suites tracked</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{fmtRate(overallPassRate)}</div>
          <div className={styles.kpiLabel}>overall pass rate</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{failingSuites.length}</div>
          <div className={styles.kpiLabel}>current failure streaks</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{staleSuites.length}</div>
          <div className={styles.kpiLabel}>stale (no run in 14 d)</div>
        </div>
      </div>

      {/* 2. Triage list */}
      <h2 className={styles.heading}>Triage</h2>
      {triageItems.length === 0 ? (
        <div className={styles.triageEmpty} data-testid="triage-empty">
          Nothing needs triage
        </div>
      ) : (
        <ul className={styles.triageList}>
          {triageItems.map((su) => {
            const sev = severityFor(su);
            const newest =
              su.runs.length > 0 ? su.runs[su.runs.length - 1] : null;
            return (
              <li key={su.id} className={styles.triageItem}>
                <span className={styles.triageGlyph} aria-hidden="true">
                  {FX_SEVERITY[sev].glyph}
                </span>
                <div>
                  <span className={styles.triageLabel}>{su.label}</span>
                  <span className={styles.triageReason}>
                    {" — "}
                    {triageReason(su)}
                  </span>
                  {newest?.url && (
                    <>
                      {" "}
                      <a
                        href={newest.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        latest run ↗
                      </a>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 3. Pass-rate trend */}
      <EChart
        option={trendOption}
        title="Pass-rate trend (30 days)"
        summary={`${trendCapped ? "Top 8 most active suites. " : ""}Overall pass rate is ${fmtRate(overallPassRate)} across ${terminalRuns.length} terminal runs.`}
        points={trendPoints}
        minPoints={2}
        height={300}
        tableCaption="Daily pass rate per suite"
      />

      {/* 4. Repo × suite heatmap */}
      <EChart
        option={heatmapOption}
        title="Suite health heatmap"
        summary={`${suites.length} suites across ${repos.length} repos. Severity uses ${FX_SEVERITY.alert.glyph} alert / ${FX_SEVERITY.watch.glyph} watch / ${FX_SEVERITY.ok.glyph} ok / ${FX_SEVERITY.unknown.glyph} unknown. Grey cells have no data.`}
        points={heatmapPoints}
        minPoints={1}
        height={Math.max(160, repos.length * 40 + 60)}
        tableCaption="Suite state by repository"
      />

      {/* 5. Flake sparkline grid */}
      <h2 className={styles.heading}>Suite pass/fail pattern</h2>
      <div className={styles.sparklineGrid} data-testid="sparkline-grid">
        {suiteSparklines.map((sp) => (
          <div key={sp.label} className={styles.sparklineRow}>
            <span className={styles.sparklineLabel}>{sp.label}</span>
            <Sparkline
              data={sp.values}
              variant="winloss"
              domain={sparklineDomain}
              label={`${sp.label} pass/fail pattern`}
              minPoints={2}
              emptyLabel="no terminal runs"
            />
            <span className={styles.sparklineRate}>{fmtRate(sp.passRate)}</span>
          </div>
        ))}
      </div>

      {/* 6. Run history table */}
      <h2 className={styles.heading}>Recent runs</h2>
      {inflight.length > 0 && (
        <div className={styles.inflightNote} data-testid="inflight-count">
          {inflight.length} run{inflight.length !== 1 ? "s" : ""} currently in
          flight (not shown below)
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Suite</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {recentTerminal.map((r, i) => {
            const su = runToSuite.get(r);
            const sev = r.status === "passed" ? "ok" : "alert";
            return (
              <tr key={i}>
                <td>{su?.label ?? "—"}</td>
                <td>{fmtTime(r.t)}</td>
                <td>{r.durationMin} min</td>
                <td>
                  <span aria-label={FX_SEVERITY[sev].word}>
                    {FX_SEVERITY[sev].glyph}
                  </span>
                </td>
                <td>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
