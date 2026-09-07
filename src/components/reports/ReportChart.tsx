import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import ReportChartClient from "./ReportChartClient";
import styles from "./report-charts.module.css";

export type ReportChartKind =
  "calendar" | "grouped-bar" | "stacked-bar" | "line" | "lane-status";

export interface ReportChartSeries {
  id: string;
  label: string;
  values: Array<number | null>;
}

export interface ReportChartDefinition {
  id: string;
  kind: ReportChartKind;
  title: string;
  currentValue: string;
  unit: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceWindow: string;
  labels: string[];
  series: ReportChartSeries[];
  minimumPoints: number;
}

export interface ReportChartProps {
  definition: ReportChartDefinition;
}

function countPoints(definition: ReportChartDefinition): number {
  return definition.series.reduce(
    (count, series) =>
      count +
      series.values.filter((value) => value !== null && Number.isFinite(value))
        .length,
    0,
  );
}

function displayValue(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "no data" : String(value);
}

export default function ReportChart({
  definition,
}: ReportChartProps): React.JSX.Element {
  const points = countPoints(definition);
  const enoughData = points >= definition.minimumPoints;

  return (
    <figure className={styles.chartFrame}>
      <figcaption className={styles.chartCaption}>
        <div className={styles.chartHeading}>
          <h3 className={styles.chartTitle}>{definition.title}</h3>
          <div className={styles.currentMetric}>
            <span className={styles.currentValue}>
              {definition.currentValue}
            </span>
            <span className={styles.currentUnit}>{definition.unit}</span>
          </div>
        </div>
        <div className={styles.provenance}>
          <span>Source: </span>
          <a
            href={definition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {definition.sourceLabel}
          </a>
          <span> · {definition.sourceWindow}</span>
        </div>
      </figcaption>

      <BrowserOnly
        fallback={
          <div
            className={styles.chartPlaceholder}
            aria-hidden="true"
            data-report-chart-client="pending"
          />
        }
      >
        {() => <ReportChartClient definition={definition} />}
      </BrowserOnly>

      {!enoughData && (
        <p className={styles.accumulating} role="status">
          accumulating data
        </p>
      )}

      <details className={styles.dataDetails}>
        <summary>Show the numbers</summary>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <caption>
              {definition.title} data for {definition.sourceWindow}
            </caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                {definition.series.map((series) => (
                  <th scope="col" key={series.id}>
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {definition.labels.map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {definition.series.map((series) => (
                    <td key={series.id}>
                      {displayValue(series.values[index] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
