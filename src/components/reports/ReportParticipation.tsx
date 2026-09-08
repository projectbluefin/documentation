import React from "react";
import ReportChart, { type ReportChartDefinition } from "./ReportChart";
import ReportLeaderboard, {
  type ReportLeaderboardProps,
} from "./ReportLeaderboard";
import styles from "./report-charts.module.css";

type OptionalChart = ReportChartDefinition | null | undefined;

export interface ReportParticipationSnapshot {
  automation?: OptionalChart;
  leaderboard?: ReportLeaderboardProps | null;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export interface ReportParticipationProps extends ReportParticipationSnapshot {
  participation?: ReportParticipationSnapshot;
  snapshot?: ReportParticipationSnapshot;
}

function State({
  label,
  reason,
}: {
  label: string;
  reason?: string | null;
}): React.JSX.Element {
  return (
    <div className={styles.state} role="status">
      <span className={styles.stateGlyph} aria-hidden="true">
        ⚠
      </span>
      <strong>{label}</strong>
      <span>Data unavailable{reason ? `: ${reason}` : ""}</span>
    </div>
  );
}

export default function ReportParticipation(
  props: ReportParticipationProps,
): React.JSX.Element {
  const section = props.snapshot ?? props.participation ?? props;
  const leaderboard = section.leaderboard;
  const hasLeaderboard = Boolean(leaderboard?.heroes?.length);
  const reason = section.unavailableReason ?? section.stateReason;

  return (
    <section
      className={styles.reportSection}
      aria-labelledby="report-participation"
    >
      <div className={styles.sectionHeader}>
        <h2 id="report-participation">Participation</h2>
        <p>Human and automated contributions with current contributors.</p>
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.sectionPanel}>
          <h3>Human and automation activity</h3>
          {section.automation ? (
            <ReportChart definition={section.automation} />
          ) : (
            <State label="Human and automation activity" reason={reason} />
          )}
        </div>
      </div>

      <div className={styles.sectionPanel}>
        <h3>Current contributor leaderboard</h3>
        {hasLeaderboard && leaderboard ? (
          <ReportLeaderboard
            title={leaderboard.title}
            subtitle={leaderboard.subtitle}
            period={leaderboard.period}
            heroes={leaderboard.heroes}
            newLights={leaderboard.newLights}
          />
        ) : (
          <State label="Current contributor leaderboard" reason={reason} />
        )}
      </div>
    </section>
  );
}
