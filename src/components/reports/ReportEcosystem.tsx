import React from "react";
import ReportChart, { type ReportChartDefinition } from "./ReportChart";
import styles from "./report-charts.module.css";

type OptionalChart = ReportChartDefinition | null | undefined;

export interface ReportEcosystemSnapshot {
  countme?: OptionalChart;
  homebrew?: OptionalChart;
  flathub?: OptionalChart;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export interface ReportEcosystemProps extends ReportEcosystemSnapshot {
  ecosystem?: ReportEcosystemSnapshot;
  snapshot?: ReportEcosystemSnapshot;
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

function ChartSlot({
  label,
  definition,
  reason,
}: {
  label: string;
  definition: OptionalChart;
  reason?: string | null;
}): React.JSX.Element {
  return (
    <div className={styles.sectionPanel}>
      <h3>{label}</h3>
      {definition ? (
        <ReportChart definition={definition} />
      ) : (
        <State label={label} reason={reason} />
      )}
    </div>
  );
}

export default function ReportEcosystem(
  props: ReportEcosystemProps,
): React.JSX.Element {
  const section = props.snapshot ?? props.ecosystem ?? props;
  const reason = section.unavailableReason ?? section.stateReason;

  return (
    <section
      className={styles.reportSection}
      aria-labelledby="report-ecosystem"
    >
      <div className={styles.sectionHeader}>
        <h2 id="report-ecosystem">Ecosystem context</h2>
        <p>
          Public ecosystem measures labelled with their native source windows.
        </p>
      </div>

      <div className={styles.sectionGrid}>
        <ChartSlot
          label="Countme trend"
          definition={section.countme}
          reason={reason}
        />
        <ChartSlot
          label="Homebrew trend"
          definition={section.homebrew}
          reason={reason}
        />
        <ChartSlot
          label="Flathub trend"
          definition={section.flathub}
          reason={reason}
        />
      </div>
    </section>
  );
}
