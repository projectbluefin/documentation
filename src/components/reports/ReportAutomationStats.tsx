import React from "react";
import styles from "./ReportAutomationStats.module.css";

export interface RepoBotActivity {
  repo: string;
  count: number;
  percentage?: string;
}

export interface ReportAutomationStatsProps {
  totalPRs: number | null;
  botPRs: number | null;
  humanPRs: number | null;
  automationPercentage: string | number | null;
  repoBreakdown?: RepoBotActivity[];
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export default function ReportAutomationStats({
  totalPRs,
  botPRs,
  humanPRs,
  automationPercentage,
  repoBreakdown = [],
  unavailableReason,
  stateReason,
}: ReportAutomationStatsProps): React.JSX.Element {
  if (
    totalPRs === null ||
    totalPRs === undefined ||
    botPRs === null ||
    botPRs === undefined ||
    humanPRs === null ||
    humanPRs === undefined ||
    automationPercentage === null ||
    automationPercentage === undefined
  ) {
    return (
      <div className={styles.container} role="status">
        <div className={styles.unavailable}>
          <span aria-hidden="true">⚠</span>
          <strong>Automation data unavailable</strong>
          <span>
            {unavailableReason ??
              stateReason ??
              "No source measurement is available."}
          </span>
        </div>
      </div>
    );
  }

  const botPct =
    typeof automationPercentage === "number"
      ? automationPercentage
      : parseFloat(automationPercentage);
  if (!Number.isFinite(botPct)) {
    return (
      <div className={styles.container} role="status">
        <div className={styles.unavailable}>
          <span aria-hidden="true">⚠</span>
          <strong>Automation data unavailable</strong>
          <span>Automation percentage is not a number.</span>
        </div>
      </div>
    );
  }
  const humanPct = totalPRs === 0 ? 0 : Math.max(0, 100 - botPct);

  return (
    <div className={styles.container}>
      <div className={styles.title}>Autonomous Factory Operations</div>
      <div className={styles.subtitle}>
        Continuous maintenance, dependency rebasing, and image automation
      </div>

      <div className={styles.barTrack}>
        <div
          className={styles.botBar}
          style={{ width: `${botPct}%` }}
          aria-label={`Automation: ${botPct}%`}
        />
        <div
          className={styles.humanBar}
          style={{ width: `${humanPct}%` }}
          aria-label={`Human: ${humanPct.toFixed(1)}%`}
        />
      </div>

      <div className={styles.barLegend}>
        <div className={styles.legendItem}>
          <span className={styles.legendGlyph} aria-hidden="true">
            ◆
          </span>
          <span>
            <strong>◆ Automation:</strong> {botPRs} PRs ({botPct}%)
          </span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendGlyph} aria-hidden="true">
            ◇
          </span>
          <span>
            <strong>◇ Human:</strong> {humanPRs} PRs ({humanPct.toFixed(1)}%)
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
