import React from "react";
import Sparkline from "../Sparkline";
import styles from "./ReportLaneHealth.module.css";

export interface ReportLaneItem {
  id: string;
  label: string;
  repo: string;
  total: number;
  passed: number;
  failed: number;
  running?: number;
  successRate: number | null;
  medianDurationMin: number | null;
  /** Activity history points (e.g. daily runs or pass counts) for sparkline */
  sparklineData?: (number | null)[];
}

export interface ReportLaneHealthProps {
  title?: string;
  lanes: ReportLaneItem[];
}

export default function ReportLaneHealth({
  title = "Factory Publishing Lanes",
  lanes,
}: ReportLaneHealthProps): React.JSX.Element {
  if (!lanes || lanes.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>{title}</h3>
      <div className={styles.grid}>
        {lanes.map((lane) => {
          const rate = lane.successRate;
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
                {rate !== null && (
                  <span className={`${styles.rateBadge} ${rateClass}`}>
                    {rate}%
                  </span>
                )}
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{lane.passed}</span>
                  <span className={styles.statLabel}>Passed</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>{lane.failed}</span>
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
