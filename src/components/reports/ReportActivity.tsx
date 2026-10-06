import React from "react";
import ReportChart, { type ReportChartDefinition } from "./ReportChart";
import styles from "./report-charts.module.css";

type OptionalChart = ReportChartDefinition | null | undefined;

export interface ReportPortfolioGrouping {
  stable?: string[];
  experimental?: string[];
}

export interface ReportActivitySnapshot {
  calendar?: OptionalChart;
  repositories?: OptionalChart;
  categories?: OptionalChart;
  stable?: string[];
  experimental?: string[];
  stableRepositories?: string[];
  experimentalRepositories?: string[];
  portfolio?: ReportPortfolioGrouping;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export interface ReportActivityProps extends ReportActivitySnapshot {
  activity?: ReportActivitySnapshot;
  snapshot?: ReportActivitySnapshot;
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

function PortfolioGroup({
  label,
  repositories,
}: {
  label: string;
  repositories: string[];
}): React.JSX.Element {
  return (
    <div className={styles.portfolioGroup}>
      <h3>{label}</h3>
      {repositories.length > 0 ? (
        <ul className={styles.portfolioList}>
          {repositories.map((repository) => (
            <li key={repository}>{repository}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.mutedState}>No repositories configured.</p>
      )}
    </div>
  );
}

export default function ReportActivity(
  props: ReportActivityProps,
): React.JSX.Element {
  const section = props.snapshot ?? props.activity ?? props;
  const stable =
    section.portfolio?.stable ??
    section.stableRepositories ??
    section.stable ??
    [];
  const experimental =
    section.portfolio?.experimental ??
    section.experimentalRepositories ??
    section.experimental ??
    [];
  const reason = section.unavailableReason ?? section.stateReason;

  return (
    <section className={styles.reportSection} aria-labelledby="report-activity">
      <div className={styles.sectionHeader}>
        <h2 id="report-activity">Activity</h2>
        <p>Completed work across the configured factory portfolio.</p>
      </div>

      {/* Daily activity gets full width so daily volume is legible across the month */}
      <div className={styles.fullWidthPanel}>
        <ChartSlot
          label="Daily merged pull requests"
          definition={
            section.calendar
              ? {
                  ...section.calendar,
                  kind: "line",
                  labels: section.calendar.labels.map((d) => d.slice(5)),
                }
              : null
          }
          reason={reason}
        />
      </div>

      <div className={styles.sectionGrid}>
        <ChartSlot
          label="Repository comparison"
          definition={section.repositories}
          reason={reason}
        />
        <ChartSlot
          label="Category distribution"
          definition={section.categories}
          reason={reason}
        />
      </div>

      <div className={styles.portfolioGrid}>
        <PortfolioGroup label="Stable portfolio" repositories={stable} />
        <PortfolioGroup
          label="Experimental portfolio"
          repositories={experimental}
        />
      </div>
    </section>
  );
}
