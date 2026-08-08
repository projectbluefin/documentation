import React from "react";
import { BuildsSection, type FactoryLive } from "../../HiveFactoryDashboard";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import { useDataset } from "../FactoryDataContext";
import { gapSafe, seriesColor, FX_SEVERITY, FX_COLORS } from "../chartTheme";
import styles from "./panels.module.css";

/* ---------- data shapes ---------- */
interface LaneRun {
  t: number;
  status: "passed" | "failed" | "running";
  durationMin: number;
}
interface Lane {
  id: string;
  label: string;
  repo: string;
  runs: LaneRun[];
  passRate: number | null;
  unavailable: boolean;
  stateReason: string | null;
}
interface FactoryStatsPayload {
  generatedAt: string;
  window: { from: string; to: string };
  lanes: Lane[];
  totals: Record<string, unknown>;
  daily: unknown[];
  unavailable: boolean;
  stateReason: string | null;
}

/* ---------- helpers ---------- */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- component ---------- */
export default function BuildsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  const { data, loading, reason } =
    useDataset<FactoryStatsPayload>("factoryStats");

  // Always render BuildsSection first
  const buildsSection = <BuildsSection s={s} />;

  if (loading) {
    return (
      <div>
        {buildsSection}
        <Unavailable what="Build analytics" reason="Loading build data…" />
      </div>
    );
  }
  if (!data || data.unavailable) {
    return (
      <div>
        {buildsSection}
        <Unavailable
          what="Build analytics"
          reason={data?.stateReason ?? reason ?? "Build data is not available."}
        />
      </div>
    );
  }

  const lanes = data.lanes;
  const allRuns = lanes.flatMap((l) => l.runs);
  const inflight = allRuns.filter((r) => r.status === "running");

  // Shared y-domain across all lane charts
  const allDurations = allRuns
    .filter((r) => r.status !== "running")
    .map((r) => r.durationMin);
  const yMax = allDurations.length > 0 ? Math.max(...allDurations) : 60;

  // Per-lane charts
  const laneCharts = lanes.map((lane, idx) => {
    const terminalRuns = lane.runs
      .filter((r) => r.status !== "running")
      .sort((a, b) => a.t - b.t);

    const durations = terminalRuns.map((r) => r.durationMin);
    const sortedDur = [...durations].sort((a, b) => a - b);
    const p25 = percentile(sortedDur, 0.25);
    const p95 = percentile(sortedDur, 0.95);

    const xData = terminalRuns.map((r) =>
      new Date(r.t * 1000).toISOString().slice(0, 10),
    );
    const yData = gapSafe(durations);
    const points = yData.filter((v) => v !== null).length;

    const option = {
      xAxis: { type: "category" as const, data: xData },
      yAxis: { type: "value" as const, min: 0, max: yMax },
      series: [
        {
          type: "line" as const,
          data: yData,
          connectNulls: false,
          symbol: "none",
          lineStyle: { color: seriesColor(idx), width: 1.5 },
          itemStyle: { color: seriesColor(idx) },
          markArea: {
            silent: true,
            data: [
              [
                {
                  yAxis: p25,
                  itemStyle: { color: "rgba(88, 166, 255, 0.08)" },
                },
                { yAxis: p95 },
              ],
            ],
          },
        },
      ],
    };

    return (
      <EChart
        key={lane.id}
        option={option}
        title={lane.label}
        summary={`${points} runs, p25=${p25.toFixed(0)} min, p95=${p95.toFixed(0)} min. Shared y-axis max ${yMax} min.`}
        points={points}
        minPoints={2}
        height={220}
        tableCaption={`${lane.label} duration over time`}
      />
    );
  });

  // Recent terminal runs table
  const recentTerminal = allRuns
    .filter((r) => r.status !== "running")
    .sort((a, b) => b.t - a.t)
    .slice(0, 40);

  // Map run to lane
  const runToLane = new Map<LaneRun, Lane>();
  for (const lane of lanes) {
    for (const r of lane.runs) runToLane.set(r, lane);
  }

  return (
    <div>
      {buildsSection}

      {/* 1. Per-lane duration trend */}
      <h2 className={styles.heading}>Duration trend per lane</h2>
      <div className={styles.chartGrid} data-testid="lane-charts">
        {laneCharts}
      </div>

      {/* 2. Recent terminal runs table */}
      <h2 className={styles.heading}>Recent terminal runs</h2>
      {inflight.length > 0 && (
        <div className={styles.inflightNote} data-testid="inflight-count">
          {inflight.length} run{inflight.length !== 1 ? "s" : ""} currently in
          flight (not shown below)
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Lane</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recentTerminal.map((r, i) => {
            const lane = runToLane.get(r);
            const sev = r.status === "passed" ? "ok" : "alert";
            return (
              <tr key={i}>
                <td>{lane?.label ?? "—"}</td>
                <td>{fmtTime(r.t)}</td>
                <td>{r.durationMin} min</td>
                <td>
                  <span aria-label={FX_SEVERITY[sev].word}>
                    {FX_SEVERITY[sev].glyph}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
