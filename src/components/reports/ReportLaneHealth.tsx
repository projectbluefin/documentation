import React from "react";
import Sparkline from "../Sparkline";
import styles from "./ReportLaneHealth.module.css";

export interface ReportLaneItem {
  id: string;
  label: string;
  repo: string;
  total: number | null;
  passed: number | null;
  failed: number | null;
  pending?: number | null;
  /** Legacy name accepted while snapshots migrate to the pending field. */
  running?: number | null;
  successRate: number | null;
  medianDurationMin: number | null;
  /** Activity history points (e.g. daily runs or pass counts) for sparkline */
  sparklineData?: (number | null)[] | null;
  unavailableReason?: string | null;
}

export interface ReportLaneHealthProps {
  title?: string;
  lanes: ReportLaneItem[] | null;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export default function ReportLaneHealth({
  title = "Factory Publishing Lanes",
  lanes,
  unavailableReason,
  stateReason,
}: ReportLaneHealthProps): React.JSX.Element {
  if (!lanes || lanes.length === 0) {
    return (
      <div className={styles.container} role="status">
        <h3 className={styles.heading}>{title}</h3>
        <p className={styles.state}>
          <span aria-hidden="true">⚠</span>
          <strong>Lane data unavailable</strong>
          <span>
            {unavailableReason ??
              stateReason ??
              "No publishing-lane measurements are available."}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>{title}</h3>
      <div className={styles.grid}>
        {lanes.map((lane) => {
          const rate = lane.successRate;
          const pending = lane.pending ?? lane.running;
          const rateClass =
            rate === null
              ? ""
              : rate >= 90
                ? styles.rateHigh
                : rate >= 75
                  ? styles.rateMed
                  : styles.rateLow;

          return (
            <div key={lane.id} className={styles.card}>
              <div className={styles.laneHeader}>
                <div>
                  <div className={styles.laneLabel}>{lane.label}</div>
                  <a
                    href={`https://github.com/${lane.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.laneRepo}
                  >
                    {lane.repo}
                  </a>
                </div>
                <span
                  className={`${styles.rateBadge} ${rateClass}`}
                  aria-label={
                    rate === null
                      ? `${lane.label}: no success-rate data`
                      : `${lane.label}: ${rate}% success rate`
                  }
                >
                  {rate === null
                    ? "—"
                    : `${rate >= 90 ? "✓" : rate >= 75 ? "△" : "!"} ${rate}%`}
                </span>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>
                    {lane.passed === null ? "no data" : lane.passed}
                  </span>
                  <span className={styles.statLabel}>Passed</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>
                    {lane.failed === null ? "no data" : lane.failed}
                  </span>
                  <span className={styles.statLabel}>Failed</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>
                    {lane.medianDurationMin !== null
                      ? `${lane.medianDurationMin}m`
                      : "—"}
                  </span>
                  <span className={styles.statLabel}>Median Run</span>
                </div>
              </div>

              {pending !== null && pending !== undefined && pending > 0 && (
                <p className={styles.pendingState} role="status">
                  <span aria-hidden="true">⏳</span> Pending runs: {pending}
                </p>
              )}

              {lane.unavailableReason && (
                <p className={styles.unavailableState} role="status">
                  <span aria-hidden="true">⚠</span> Unavailable:{" "}
                  {lane.unavailableReason}
                </p>
              )}

              {lane.sparklineData && lane.sparklineData.length > 1 && (
                <div className={styles.sparklineWrap}>
                  <span className={styles.sparklineLabel}>Run History</span>
                  <Sparkline
                    data={lane.sparklineData}
                    variant="bars"
                    width={140}
                    height={28}
                    color="var(--ifm-color-primary)"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
