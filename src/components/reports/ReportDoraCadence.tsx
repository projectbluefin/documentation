import React from "react";
import styles from "./ReportDoraCadence.module.css";

export interface ReportDoraCadenceProps {
  deploymentsPerWeek?: number | string | null;
  changeFailureRate?: number | string | null;
  medianLeadTimeHours?: number | string | null;
  totalReleases?: number;
}

export default function ReportDoraCadence({
  deploymentsPerWeek,
  changeFailureRate,
  medianLeadTimeHours,
  totalReleases,
}: ReportDoraCadenceProps): React.JSX.Element {
  if (
    deploymentsPerWeek === undefined &&
    changeFailureRate === undefined &&
    totalReleases === undefined
  ) {
    return <></>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>DORA Cadence & Release Velocity</div>
      <div className={styles.subtitle}>
        Delivery performance across production and testing release lanes
      </div>

      <div className={styles.grid}>
        {totalReleases !== undefined && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{totalReleases}</span>
            <span className={styles.metricLabel}>Published Releases</span>
            <span className={styles.metricHint}>Across all image lanes</span>
          </div>
        )}

        {deploymentsPerWeek !== undefined && deploymentsPerWeek !== null && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{deploymentsPerWeek}</span>
            <span className={styles.metricLabel}>Deployments / Week</span>
            <span className={styles.metricHint}>Continuous delivery</span>
          </div>
        )}

        {changeFailureRate !== undefined && changeFailureRate !== null && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{changeFailureRate}%</span>
            <span className={styles.metricLabel}>Change Failure Rate</span>
            <span className={styles.metricHint}>Rollbacks / hotfixes</span>
          </div>
        )}

        {medianLeadTimeHours !== undefined && medianLeadTimeHours !== null && (
          <div className={styles.metricItem}>
            <span className={styles.metricValue}>{medianLeadTimeHours}h</span>
            <span className={styles.metricLabel}>Median Lead Time</span>
            <span className={styles.metricHint}>Commit to container push</span>
          </div>
        )}
      </div>
    </div>
  );
}
