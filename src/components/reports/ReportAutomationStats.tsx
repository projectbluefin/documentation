import React from "react";
import styles from "./ReportAutomationStats.module.css";

export interface RepoBotActivity {
  repo: string;
  count: number;
  percentage?: string;
}

export interface ReportAutomationStatsProps {
  totalPRs: number;
  botPRs: number;
  humanPRs: number;
  automationPercentage: string | number;
  repoBreakdown?: RepoBotActivity[];
}

export default function ReportAutomationStats({
  totalPRs,
  botPRs,
  humanPRs,
  automationPercentage,
  repoBreakdown = [],
}: ReportAutomationStatsProps): React.JSX.Element {
  if (totalPRs === 0) {
    return <></>;
  }

  const botPct =
    typeof automationPercentage === "number"
      ? automationPercentage
      : parseFloat(automationPercentage);
  const humanPct = Math.max(0, 100 - botPct);

  return (
    <div className={styles.container}>
      <div className={styles.title}>Autonomous Factory Operations</div>
      <div className={styles.subtitle}>
        Continuous maintenance, dependency rebasing, and image automation
      </div>

      <div className={styles.barTrack}>
        <div className={styles.botBar} style={{ width: `${botPct}%` }} />
        <div className={styles.humanBar} style={{ width: `${humanPct}%` }} />
      </div>

      <div className={styles.barLegend}>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: "var(--ifm-color-primary)" }}
          />
          <span>
            <strong>Automation:</strong> {botPRs} PRs ({botPct}%)
          </span>
        </div>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: "#28a745" }}
          />
          <span>
            <strong>Human:</strong> {humanPRs} PRs ({humanPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {repoBreakdown.length > 0 && (
        <div className={styles.repoGrid}>
          {repoBreakdown.map((item) => (
            <div key={item.repo} className={styles.repoCard}>
              <span className={styles.repoName}>{item.repo}</span>
              <span className={styles.repoCount}>
                {item.count} PRs {item.percentage ? `(${item.percentage})` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
