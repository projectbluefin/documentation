import React from "react";
import styles from "./ReportDoraCadence.module.css";

export interface ReportDoraCadenceProps {
  deploymentsPerWeek?: number | string | null;
  changeFailureRate?: number | string | null;
  medianLeadTimeHours?: number | string | null;
  totalReleases?: number | null;
  pending?: boolean | number | null;
  pendingRuns?: number | null;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export default function ReportDoraCadence({
  deploymentsPerWeek,
  changeFailureRate,
  medianLeadTimeHours,
  totalReleases,
  pending = false,
  pendingRuns,
  unavailableReason,
  stateReason,
}: ReportDoraCadenceProps): React.JSX.Element {
  const values = [
    deploymentsPerWeek,
    changeFailureRate,
    medianLeadTimeHours,
    totalReleases,
  ];
  const hasMeasurement = values.some(
    (value) => value !== undefined && value !== null,
  );
  const hasPending =
    (typeof pending === "number" && pending > 0) ||
    pending === true ||
    (typeof pendingRuns === "number" && pendingRuns > 0);
  const pendingCount =
    typeof pending === "number" && pending > 0 ? pending : pendingRuns;
  const reason = unavailableReason ?? stateReason;

  return (
    <div className={styles.container}>
      <div className={styles.title}>DORA Cadence & Release Velocity</div>
      <div className={styles.subtitle}>
        Delivery performance across production and testing release lanes
      </div>

      {!hasMeasurement && (
        <p className={styles.state} role="status">
          <span aria-hidden="true">⚠</span>
          <strong>Delivery data unavailable</strong>
          <span>
            {reason ?? "No completed release measurements are available."}
          </span>
        </p>
      )}

      {hasPending && (
        <p className={styles.state} role="status">
          <span aria-hidden="true">⏳</span>
          <strong>Pending delivery measurements</strong>
          {pendingCount !== null && pendingCount !== undefined
            ? `: ${pendingCount} run${pendingCount === 1 ? "" : "s"}`
            : ""}
        </p>
      )}

      <div className={styles.grid}>
        {totalReleases !== undefined && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {totalReleases === null ? "no data" : totalReleases}
            </span>
            <span className={styles.metricLabel}>Published Releases</span>
            <span className={styles.metricHint}>Across all image lanes</span>
          </div>
        )}

        {deploymentsPerWeek !== undefined && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {deploymentsPerWeek === null ? "no data" : deploymentsPerWeek}
            </span>
            <span className={styles.metricLabel}>Deployments / Week</span>
            <span className={styles.metricHint}>Continuous delivery</span>
          </div>
        )}

        {changeFailureRate !== undefined && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {changeFailureRate === null ? "no data" : `${changeFailureRate}%`}
            </span>
            <span className={styles.metricLabel}>Change Failure Rate</span>
            <span className={styles.metricHint}>Rollbacks / hotfixes</span>
          </div>
        )}

        {medianLeadTimeHours !== undefined && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>
              {medianLeadTimeHours === null
                ? "no data"
                : `${medianLeadTimeHours}h`}
            </span>
            <span className={styles.metricLabel}>Median Lead Time</span>
            <span className={styles.metricHint}>Commit to container push</span>
          </div>
        )}
      </div>
    </div>
  );
}
