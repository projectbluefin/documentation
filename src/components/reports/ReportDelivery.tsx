import React from "react";
import ReportChart, { type ReportChartDefinition } from "./ReportChart";
import ReportLaneHealth, { type ReportLaneItem } from "./ReportLaneHealth";
import styles from "./report-charts.module.css";

type OptionalChart = ReportChartDefinition | null | undefined;

export interface ReportDeliverySnapshot {
  lanes?: ReportLaneItem[] | null;
  cadence?: OptionalChart;
  releases?: OptionalChart;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export interface ReportDeliveryProps extends ReportDeliverySnapshot {
  delivery?: ReportDeliverySnapshot;
  snapshot?: ReportDeliverySnapshot;
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

export default function ReportDelivery(
  props: ReportDeliveryProps,
): React.JSX.Element {
  const section = props.snapshot ?? props.delivery ?? props;
  const lanes = section.lanes ?? [];
  const reason = section.unavailableReason ?? section.stateReason;

  return (
    <section className={styles.reportSection} aria-labelledby="report-delivery">
      <div className={styles.sectionHeader}>
        <h2 id="report-delivery">Delivery</h2>
        <p>Publishing-lane outcomes, cadence, duration, and release events.</p>
      </div>

      <ReportLaneHealth lanes={lanes} unavailableReason={reason} />

      <div className={styles.sectionGrid}>
        <ChartSlot
          label="Cadence and duration trend"
          definition={section.cadence}
          reason={reason}
        />
        <ChartSlot
          label="Release-event timeline"
          definition={section.releases}
          reason={reason}
        />
      </div>

      <p className={styles.canonicalLink}>
        Release details remain on the canonical{" "}
        <a href="/changelogs">/changelogs</a> surface.
      </p>
    </section>
  );
}
