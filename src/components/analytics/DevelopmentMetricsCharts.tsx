import React from "react";
import staticMetricsData from "@site/static/data/contributor-metrics.json";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import { gapSafe } from "../factory/chartTheme";
import "../factory/tokens.css";
import styles from "./ContributorMetricsCharts.module.css";

type Count = number | null;

export interface DevelopmentWindow {
  start: string;
  end: string;
  mergedPRs: Count;
  activeRepositories: Count;
  medianDurationHours: Count;
  p75DurationHours: Count;
}

export interface DevelopmentDataset {
  schemaVersion: 2;
  org: "projectbluefin";
  generatedAt: string | null;
  unavailable: boolean;
  stateReason: string | null;
  coverage: {
    repositories: {
      id: string;
      name: string;
      fork: boolean;
      archived: boolean;
    }[];
    complete: boolean;
  };
  development?: {
    current: {
      mergedPRs7d: Count;
      mergedPRs30d?: Count;
      activeRepositories7d: Count;
      medianDurationHours7d: Count;
      p75DurationHours7d: Count;
    };
    windows: DevelopmentWindow[];
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const count = (value: unknown): value is Count =>
  value === null ||
  (typeof value === "number" && Number.isFinite(value) && value >= 0);

function validDevelopment(value: unknown): value is DevelopmentDataset {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    value.org !== "projectbluefin" ||
    typeof value.unavailable !== "boolean" ||
    !(value.stateReason === null || typeof value.stateReason === "string")
  ) {
    return false;
  }

  const { coverage, development } = value;
  if (
    !record(coverage) ||
    !Array.isArray(coverage.repositories) ||
    typeof coverage.complete !== "boolean"
  ) {
    return false;
  }

  if (!development) return true;
  if (!record(development)) return false;
  const { current, windows } = development;
  if (
    !record(current) ||
    !count(current.mergedPRs7d) ||
    !count(current.activeRepositories7d) ||
    !count(current.medianDurationHours7d) ||
    !count(current.p75DurationHours7d) ||
    (current.mergedPRs30d !== undefined && !count(current.mergedPRs30d)) ||
    !Array.isArray(windows)
  ) {
    return false;
  }

  return windows.every(
    (w) =>
      record(w) &&
      typeof w.start === "string" &&
      typeof w.end === "string" &&
      count(w.mergedPRs) &&
      count(w.activeRepositories) &&
      count(w.medianDurationHours) &&
      count(w.p75DurationHours),
  );
}

function formatDuration(hours: Count): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export default function DevelopmentMetricsCharts({
  data = staticMetricsData,
}: { data?: unknown } = {}): React.JSX.Element {
  const [themeRef, theme] = useFactoryTheme();

  if (!validDevelopment(data)) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Development metrics"
          reason="The development dataset is missing or malformed"
        />
      </div>
    );
  }

  const dev = data.development;
  if (!dev || !dev.windows || dev.windows.length === 0) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Development metrics"
          reason={
            data.unavailable
              ? data.stateReason || "Development metrics are unavailable."
              : "Development metrics accumulating."
          }
        />
      </div>
    );
  }

  const notice = data.unavailable
    ? data.stateReason || "The latest development metrics refresh failed."
    : !data.coverage.complete
      ? "Public repository coverage is incomplete; values shown are from a partial scan."
      : null;

  const current = dev.current;

  const cards = [
    [
      "Merged PRs (7 days)",
      current.mergedPRs7d === null
        ? "—"
        : current.mergedPRs7d.toLocaleString("en-US"),
      current.activeRepositories7d !== null
        ? `Across ${current.activeRepositories7d} ${current.activeRepositories7d === 1 ? "repository" : "repositories"}`
        : "Trailing 168-hour window",
    ],
    [
      "Merged PRs (30 days)",
      current.mergedPRs30d === null || current.mergedPRs30d === undefined
        ? "—"
        : current.mergedPRs30d.toLocaleString("en-US"),
      "Trailing 30-day window",
    ],
    [
      "Median merge cycle",
      formatDuration(current.medianDurationHours7d),
      "Open to merge elapsed time",
    ],
    [
      "P75 merge cycle",
      formatDuration(current.p75DurationHours7d),
      "75th percentile of merged cohort",
    ],
  ] as const;

  // Chart chronological order: oldest window to newest (left to right)
  const chronoWindows = [...dev.windows].reverse();
  const values = chronoWindows.map((w) => w.mergedPRs);
  const color = theme.categorical[0];

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {notice && (
        <Unavailable
          what="Current development metrics"
          reason={`${notice} Values below are the retained snapshot.`}
        />
      )}

      <div className={styles.summaryCardsGrid}>
        {cards.map(([label, value, subtitle]) => (
          <div key={label} className={styles.metricCard}>
            <span className={styles.metricTitle}>{label}</span>
            <strong className={styles.metricValue}>{value}</strong>
            <span className={styles.metricSubtitle}>{subtitle}</span>
          </div>
        ))}
      </div>

      <section className={styles.chartSection}>
        <EChart
          title="Weekly merged pull requests"
          summary={`${current.mergedPRs7d === null ? "—" : current.mergedPRs7d.toLocaleString("en-US")} merged pull requests in the latest 7-day window.`}
          points={
            values.filter((v) => typeof v === "number" && Number.isFinite(v))
              .length
          }
          minPoints={2}
          height={260}
          tableCaption="Merged pull requests across rolling 7-day UTC windows; gaps are not zero"
          option={{
            animation: false,
            legend: { show: false },
            tooltip: { trigger: "axis" },
            grid: {
              left: 16,
              right: 16,
              top: 20,
              bottom: 24,
              containLabel: true,
            },
            xAxis: {
              type: "category",
              data: chronoWindows.map((w) => w.end.slice(5, 10)),
              boundaryGap: true,
            },
            yAxis: { type: "value", min: 0, minInterval: 1 },
            series: [
              {
                name: "Merged PRs",
                type: "bar",
                barMaxWidth: 32,
                itemStyle: { color, borderRadius: [4, 4, 0, 0] },
                data: gapSafe(values),
              },
            ],
          }}
        />
      </section>
    </div>
  );
}
