import React from "react";
import Heading from "@theme/Heading";
import staticMetricsData from "@site/static/data/contributor-metrics.json";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import { gapSafe, withAlpha } from "../factory/chartTheme";
import "../factory/tokens.css";
import styles from "./ContributorMetricsCharts.module.css";

const KINDS = [
  "changes",
  "issues",
  "comments",
  "reviews",
  "discussions",
] as const;
type Kind = (typeof KINDS)[number];
type Count = number | null;
export interface ContributorDataset {
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
    kinds: Kind[];
    complete: boolean;
    unlinkedAuthors: number;
  };
  summary: {
    totalContributors: Count;
    activeContributors90d: Count;
    activeRepositories90d: Count;
    byType90d: Record<Kind, Count>;
  };
  contributors: {
    id: string;
    login: string;
    firstContributionAt: string;
    lastContributionAt: string;
  }[];
  months: {
    month: string;
    contributors: Count;
    cumulativeContributors: Count;
  }[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): value is Count =>
  value === null ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
const date = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  Number.isFinite(Date.parse(value));

function validDataset(value: unknown): value is ContributorDataset {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    value.org !== "projectbluefin" ||
    !(value.generatedAt === null || date(value.generatedAt)) ||
    typeof value.unavailable !== "boolean" ||
    !(value.stateReason === null || typeof value.stateReason === "string")
  )
    return false;
  const { coverage, summary, contributors, months } = value;
  if (
    !record(coverage) ||
    !Array.isArray(coverage.repositories) ||
    !coverage.repositories.every(
      (r) =>
        record(r) &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        typeof r.fork === "boolean" &&
        typeof r.archived === "boolean",
    ) ||
    typeof coverage.complete !== "boolean" ||
    !count(coverage.unlinkedAuthors) ||
    coverage.unlinkedAuthors === null ||
    !Array.isArray(coverage.kinds) ||
    coverage.kinds.length !== KINDS.length ||
    new Set(coverage.kinds).size !== KINDS.length ||
    !coverage.kinds.every((kind) =>
      KINDS.some((expected) => expected === kind),
    ) ||
    !record(summary) ||
    !count(summary.totalContributors) ||
    !count(summary.activeContributors90d) ||
    !count(summary.activeRepositories90d) ||
    !record(summary.byType90d) ||
    !KINDS.every((kind) =>
      count(record(summary.byType90d) ? summary.byType90d[kind] : undefined),
    ) ||
    !Array.isArray(contributors) ||
    !contributors.every(
      (c) =>
        record(c) &&
        typeof c.id === "string" &&
        typeof c.login === "string" &&
        date(c.firstContributionAt) &&
        date(c.lastContributionAt),
    ) ||
    new Set(contributors.map((c) => c.id)).size !== contributors.length ||
    (summary.totalContributors !== null &&
      summary.totalContributors !== contributors.length) ||
    !Array.isArray(months)
  )
    return false;
  return months.every((m, index) => {
    if (
      !record(m) ||
      typeof m.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(m.month) ||
      !count(m.contributors) ||
      !count(m.cumulativeContributors)
    )
      return false;
    if (index === 0) return true;
    const previous = months[index - 1].month;
    const next = new Date(`${previous}-01T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return m.month === next.toISOString().slice(0, 7);
  });
}

const display = (value: Count) =>
  value === null ? "—" : value.toLocaleString("en-US");

export default function ContributorMetricsCharts({
  data = staticMetricsData,
}: { data?: unknown } = {}): React.JSX.Element {
  const [themeRef, theme] = useFactoryTheme();
  if (!validDataset(data)) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Contributor metrics"
          reason="The contributor dataset is missing or does not match schema version 2."
        />
      </div>
    );
  }
  const { coverage, summary, months } = data;
  const future =
    data.generatedAt !== null && Date.parse(data.generatedAt) > Date.now();
  const futureMonths = months.some(
    (m) => m.month > (data.generatedAt ?? new Date().toISOString()).slice(0, 7),
  );
  const notice = data.unavailable
    ? data.stateReason || "The latest contributor refresh failed."
    : future || futureMonths
      ? "The snapshot contains future dates; current contributor metrics are unavailable."
      : !coverage.complete
        ? "Public repository coverage is incomplete; current contributor metrics are unavailable."
        : null;
  const cards = [
    [
      "Total contributors",
      summary.totalContributors,
      "Distinct linked GitHub accounts in recorded public history",
    ],
    [
      "Active in last 90 days",
      summary.activeContributors90d,
      "Distinct participating accounts",
    ],
    [
      "Repositories with participation",
      summary.activeRepositories90d,
      "In the last 90 days",
    ],
  ] as const;

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {notice && (
        <Unavailable
          what="Current contributor metrics"
          reason={`${notice} Values below are the retained snapshot, not a successful current refresh.`}
        />
      )}
      <div className={styles.summaryCardsGrid}>
        {cards.map(([label, value, subtitle], index) => (
          <div
            key={label}
            className={`${styles.metricCard} ${index === 0 ? styles.headlineCard : ""}`}
          >
            <span className={styles.metricTitle}>{label}</span>
            <strong className={styles.metricValue}>{display(value)}</strong>
            <span className={styles.metricSubtitle}>
              {subtitle}
              {value === null ? " · Count unavailable in this snapshot" : ""}
            </span>
          </div>
        ))}
      </div>
      <p className={styles.scope} role="status">
        {notice ? "Retained snapshot" : "Snapshot refreshed"}:{" "}
        {data.generatedAt ? (
          <time dateTime={data.generatedAt}>
            {data.generatedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}
          </time>
        ) : (
          "refresh date unavailable"
        )}
        . {coverage.complete ? "Complete scan of" : "Incomplete scan of"}{" "}
        {coverage.repositories.length} current public projectbluefin
        repositories, including archived repositories and forks.{" "}
        {coverage.unlinkedAuthors} unlinked author records excluded.
      </p>
      <p className={styles.scope}>
        Contributors are distinct linked GitHub accounts, not verified people.
        Changes, issues, comments, reviews and discussions all count. Only
        recognized bots are excluded; AI use by user accounts cannot be
        detected. Months use UTC and the current month is partial. Full scope
        and exclusions are documented in the methodology below.
      </p>
      {(
        [
          ["Contributors over time", "cumulativeContributors"],
          ["Contributors each month", "contributors"],
        ] as const
      ).map(([title, field]) => {
        const values = months.map((month) => month[field]);
        const latest = months.at(-1);
        const current = latest ? latest[field] : null;
        const color = theme.categorical[0];
        return (
          <section className={styles.chartSection} key={field}>
            <EChart
              title={title}
              summary={`${display(current)} accounts · ${latest?.month ?? "no recorded months"}${current === null ? " · Count unavailable in this snapshot" : ""}${notice ? " · retained snapshot" : ""}.`}
              points={
                values.filter(
                  (value) =>
                    typeof value === "number" && Number.isFinite(value),
                ).length
              }
              minPoints={2}
              height={280}
              tableCaption={`${title} by UTC month; missing values are not zero`}
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
                  data: months.map((month) => month.month),
                  boundaryGap: false,
                },
                yAxis: { type: "value", min: 0, minInterval: 1 },
                series: [
                  {
                    name: title,
                    type: "line",
                    smooth: false,
                    connectNulls: false,
                    showSymbol:
                      values.filter((value) => value !== null).length === 1,
                    lineStyle: { color, width: 2 },
                    itemStyle: { color },
                    areaStyle: { color: withAlpha(color, 0.2) },
                    data: gapSafe(values),
                  },
                ],
              }}
            />
          </section>
        );
      })}
      <section className={styles.chartCard}>
        <Heading as="h3" className={styles.chartHeading}>
          Ways people contribute
        </Heading>
        <p className={styles.scope}>
          Unique participating accounts in the last 90 days. Kinds overlap:
          these counts must not be added together.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Kind</th>
              <th scope="col">Unique contributors (90 days)</th>
            </tr>
          </thead>
          <tbody>
            {KINDS.map((kind) => (
              <tr key={kind}>
                <th scope="row">{kind[0].toUpperCase() + kind.slice(1)}</th>
                <td>
                  {display(summary.byType90d[kind])}
                  {summary.byType90d[kind] === null
                    ? " · Count unavailable"
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
