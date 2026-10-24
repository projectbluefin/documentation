import React, { useState, useEffect, useMemo } from "react";
import Heading from "@theme/Heading";
import staticMetricsData from "@site/static/data/contributor-metrics.json";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import { gapSafe, withAlpha } from "../factory/chartTheme";
import styles from "./ContributorMetricsCharts.module.css";

export interface MonthlyCohort {
  new: number | null;
  returning: number | null;
}

export interface MonthlyStreams {
  humanPrs: number | null;
  automationPrs: number | null;
  issues: number | null;
  reviews: number | null;
  documentation?: number | null;
  codeBuilds?: number | null;
  codeReviews?: number | null;
  issuesTriage?: number | null;
  prsOpened?: number | null;
  totalPrsOpened?: number | null;
  prsMerged?: number | null;
  medianDaysToMerge?: number | null;
  medianResponseHours?: number | null;
  mergeRatePercent?: number | null;
}

export interface ContributorMonth {
  month: string;
  window?: {
    start: string;
    end: string;
  };
  activeContributors: number | null;
  firstTimeContributors?: number | null;
  streams?: MonthlyStreams;
  cohorts?: MonthlyCohort;
  status?: string;
  truncated?: boolean;
}

export interface ContributorDataset {
  schemaVersion?: number;
  generatedAt?: string;
  source?: string;
  org?: string;
  unavailable?: boolean;
  stateReason?: string | null;
  months: ContributorMonth[];
}

export interface ContributorMetricsChartsProps {
  data?: ContributorDataset;
  fetchUrl?: string;
}

const DEFAULT_DATA_URL = "/data/contributor-metrics.json";

export default function ContributorMetricsCharts({
  data: propData,
  fetchUrl = DEFAULT_DATA_URL,
}: ContributorMetricsChartsProps = {}): React.JSX.Element {
  const [themeRef, theme] = useFactoryTheme();
  const [fetchedData, setFetchedData] = useState<ContributorDataset | null>(
    null,
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (propData) return;
    let isCancelled = false;

    // Client-side runtime fetch fallback if static import is empty/not used
    fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching contributor metrics`);
        }
        return res.json();
      })
      .then((json: ContributorDataset) => {
        if (!isCancelled) {
          setFetchedData(json);
        }
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setFetchError(err.message || "Failed to fetch contributor metrics");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [propData, fetchUrl]);

  const activeData =
    propData ??
    fetchedData ??
    (staticMetricsData as unknown as ContributorDataset);

  if (activeData?.unavailable) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Contributor metrics"
          reason={
            activeData.stateReason ||
            "Contributor metrics are currently unavailable."
          }
        />
      </div>
    );
  }

  if (fetchError && !activeData) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable what="Contributor metrics" reason={fetchError} />
      </div>
    );
  }

  const months = activeData?.months ?? [];
  const validMonths = useMemo(() => {
    return [...months].sort((a, b) => a.month.localeCompare(b.month));
  }, [months]);

  const monthLabels = useMemo(
    () => validMonths.map((m) => m.month),
    [validMonths],
  );

  // Latest measured values for summary cards
  const latestMeasuredMonth = useMemo(() => {
    for (let i = validMonths.length - 1; i >= 0; i--) {
      const m = validMonths[i];
      if (m.activeContributors !== null || m.streams?.humanPrs !== null) {
        return m;
      }
    }
    return null;
  }, [validMonths]);

  // Derived metrics for summary cards
  const activeHumans = latestMeasuredMonth?.activeContributors ?? null;
  const firstTimeHumans =
    latestMeasuredMonth?.firstTimeContributors ??
    latestMeasuredMonth?.cohorts?.new ??
    null;

  // PR Merge rate: either explicit or computed from prsMerged / prsOpened or humanPrs
  const mergeRate = useMemo(() => {
    if (!latestMeasuredMonth) return null;
    if (
      latestMeasuredMonth.streams?.mergeRatePercent !== undefined &&
      latestMeasuredMonth.streams?.mergeRatePercent !== null
    ) {
      return latestMeasuredMonth.streams.mergeRatePercent;
    }
    const merged =
      latestMeasuredMonth.streams?.prsMerged ??
      latestMeasuredMonth.streams?.humanPrs ??
      null;
    const opened =
      latestMeasuredMonth.streams?.prsOpened ??
      latestMeasuredMonth.streams?.totalPrsOpened ??
      null;
    if (merged !== null && opened !== null && opened > 0) {
      return Math.round((merged / opened) * 100);
    }
    return null;
  }, [latestMeasuredMonth]);

  // Median response time (in hours or days)
  const medianResponseHours = useMemo(() => {
    if (!latestMeasuredMonth) return null;
    if (
      latestMeasuredMonth.streams?.medianResponseHours !== undefined &&
      latestMeasuredMonth.streams?.medianResponseHours !== null
    ) {
      return latestMeasuredMonth.streams.medianResponseHours;
    }
    if (
      latestMeasuredMonth.streams?.medianDaysToMerge !== undefined &&
      latestMeasuredMonth.streams?.medianDaysToMerge !== null
    ) {
      return latestMeasuredMonth.streams.medianDaysToMerge * 24;
    }
    return null;
  }, [latestMeasuredMonth]);

  // Series for Chart 1: Active Human Contributors Trend (New vs Returning area fill)
  const newCohortsSeries = useMemo(() => {
    return validMonths.map((m) => m.cohorts?.new ?? null);
  }, [validMonths]);

  const returningCohortsSeries = useMemo(() => {
    return validMonths.map((m) => m.cohorts?.returning ?? null);
  }, [validMonths]);

  const chart1PointsCount = useMemo(() => {
    return validMonths.filter(
      (m) =>
        (m.cohorts?.new !== null && m.cohorts?.new !== undefined) ||
        (m.cohorts?.returning !== null && m.cohorts?.returning !== undefined),
    ).length;
  }, [validMonths]);

  const chart1Option = useMemo(() => {
    const cat = theme.categorical;
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["New Contributors", "Returning Contributors"],
        right: 8,
        top: 6,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 48, right: 24, top: 40, bottom: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: monthLabels,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { show: true },
      },
      series: [
        {
          name: "New Contributors",
          type: "line",
          stack: "Total",
          areaStyle: {
            color: withAlpha(cat[0] ?? "#4285f4", 0.3),
          },
          lineStyle: {
            color: cat[0] ?? "#4285f4",
            width: 2,
          },
          itemStyle: {
            color: cat[0] ?? "#4285f4",
          },
          data: gapSafe(newCohortsSeries),
        },
        {
          name: "Returning Contributors",
          type: "line",
          stack: "Total",
          areaStyle: {
            color: withAlpha(cat[1] ?? "#22306b", 0.3),
          },
          lineStyle: {
            color: cat[1] ?? "#22306b",
            width: 2,
          },
          itemStyle: {
            color: cat[1] ?? "#22306b",
          },
          data: gapSafe(returningCohortsSeries),
        },
      ],
    };
  }, [theme, monthLabels, newCohortsSeries, returningCohortsSeries]);

  // Series for Chart 2: Human Contribution Types Breakdown
  // (Code & Builds, Code Reviews, Issues & Triage, Documentation)
  const codeBuildsSeries = useMemo(() => {
    return validMonths.map(
      (m) => m.streams?.codeBuilds ?? m.streams?.humanPrs ?? null,
    );
  }, [validMonths]);

  const codeReviewsSeries = useMemo(() => {
    return validMonths.map(
      (m) => m.streams?.codeReviews ?? m.streams?.reviews ?? null,
    );
  }, [validMonths]);

  const issuesTriageSeries = useMemo(() => {
    return validMonths.map(
      (m) => m.streams?.issuesTriage ?? m.streams?.issues ?? null,
    );
  }, [validMonths]);

  const docsSeries = useMemo(() => {
    return validMonths.map((m) => m.streams?.documentation ?? null);
  }, [validMonths]);

  const chart2PointsCount = useMemo(() => {
    return validMonths.filter((m) => {
      const s = m.streams;
      return (
        s &&
        (s.codeBuilds !== null ||
          s.humanPrs !== null ||
          s.codeReviews !== null ||
          s.reviews !== null ||
          s.issuesTriage !== null ||
          s.issues !== null ||
          s.documentation !== null)
      );
    }).length;
  }, [validMonths]);

  const chart2Option = useMemo(() => {
    const cat = theme.categorical;
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["Merged PRs", "Issues & Triage"],
        right: 8,
        top: 6,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 48, right: 24, top: 40, bottom: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: monthLabels,
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { show: true },
      },
      series: [
        {
          name: "Merged PRs",
          type: "line",
          lineStyle: { color: cat[0] ?? "#4285f4", width: 2 },
          itemStyle: { color: cat[0] ?? "#4285f4" },
          data: gapSafe(codeBuildsSeries),
        },
        {
          name: "Issues & Triage",
          type: "line",
          lineStyle: { color: cat[2] ?? "#5c7bd1", width: 2 },
          itemStyle: { color: cat[2] ?? "#5c7bd1" },
          data: gapSafe(issuesTriageSeries),
        },
      ],
    };
  }, [theme, monthLabels, codeBuildsSeries, issuesTriageSeries]);

  // Series for Chart 3: PR Velocity & Merge Rate (Opened vs Merged, median days to merge)
  const prsOpenedSeries = useMemo(() => {
    return validMonths.map((m) => m.streams?.prsOpened ?? null);
  }, [validMonths]);

  const prsMergedSeries = useMemo(() => {
    return validMonths.map(
      (m) => m.streams?.prsMerged ?? m.streams?.humanPrs ?? null,
    );
  }, [validMonths]);

  const medianDaysSeries = useMemo(() => {
    return validMonths.map((m) => m.streams?.medianDaysToMerge ?? null);
  }, [validMonths]);

  const chart3PointsCount = useMemo(() => {
    return validMonths.filter((m) => {
      const s = m.streams;
      return (
        s &&
        (s.prsOpened !== null ||
          s.prsMerged !== null ||
          s.humanPrs !== null ||
          s.medianDaysToMerge !== null)
      );
    }).length;
  }, [validMonths]);

  const chart3Option = useMemo(() => {
    const cat = theme.categorical;
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["PRs Opened", "PRs Merged"],
        right: 8,
        top: 6,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 48, right: 24, top: 40, bottom: 32, containLabel: true },
      xAxis: {
        type: "category",
        data: monthLabels,
        boundaryGap: false,
      },
      yAxis: [
        {
          type: "value",
          name: "PR Count",
          minInterval: 1,
          splitLine: { show: true },
        },
      ],
      series: [
        {
          name: "PRs Opened",
          type: "line",
          lineStyle: { color: cat[0] ?? "#4285f4", width: 2 },
          itemStyle: { color: cat[0] ?? "#4285f4" },
          data: gapSafe(prsOpenedSeries),
        },
        {
          name: "PRs Merged",
          type: "line",
          lineStyle: { color: cat[2] ?? "#5c7bd1", width: 2 },
          itemStyle: { color: cat[2] ?? "#5c7bd1" },
          data: gapSafe(prsMergedSeries),
        },
      ],
    };
  }, [theme, monthLabels, prsOpenedSeries, prsMergedSeries]);

  const currentMonthLabel = latestMeasuredMonth?.month ?? "current";

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {/* 4 Summary Metric Cards */}
      <div className={styles.summaryCardsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>Monthly Active Humans</span>
          <span className={styles.metricValue}>
            {activeHumans !== null ? activeHumans.toLocaleString("en-US") : "—"}
          </span>
          <span className={styles.metricSubtitle}>
            {latestMeasuredMonth
              ? `${currentMonthLabel} window`
              : "accumulating data"}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>First-Time Humans</span>
          <span className={styles.metricValue}>
            {firstTimeHumans !== null
              ? firstTimeHumans.toLocaleString("en-US")
              : "—"}
          </span>
          <span className={styles.metricSubtitle}>
            {latestMeasuredMonth
              ? `New contributors in ${currentMonthLabel}`
              : "accumulating data"}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>PR Merge Rate</span>
          <span className={styles.metricValue}>
            {mergeRate !== null ? `${mergeRate}%` : "—"}
          </span>
          <span className={styles.metricSubtitle}>
            {latestMeasuredMonth
              ? `Merged efficiency in ${currentMonthLabel}`
              : "accumulating data"}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>Human Merged PRs</span>
          <span className={styles.metricValue}>
            {latestMeasuredMonth?.streams?.humanPrs !== undefined &&
            latestMeasuredMonth?.streams?.humanPrs !== null
              ? latestMeasuredMonth.streams.humanPrs.toLocaleString("en-US")
              : "—"}
          </span>
          <span className={styles.metricSubtitle}>
            {latestMeasuredMonth
              ? `Human throughput (${currentMonthLabel})`
              : "accumulating data"}
          </span>
        </div>
      </div>

      {/* Chart 1: Active Human Contributors Trend */}
      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <Heading as="h3" className={styles.chartHeading}>
            Active Human Contributors Trend
          </Heading>
          <p className={styles.currentValue}>
            <strong>
              {activeHumans !== null
                ? activeHumans.toLocaleString("en-US")
                : "—"}
            </strong>{" "}
            active human contributors · {currentMonthLabel}
          </p>
        </div>
        <EChart
          option={chart1Option}
          title="Active Human Contributors Trend"
          summary={
            activeHumans !== null
              ? `${activeHumans} active human contributors (${firstTimeHumans ?? 0} new, ${activeHumans - (firstTimeHumans ?? 0)} returning) in ${currentMonthLabel}.`
              : "accumulating data"
          }
          points={chart1PointsCount}
          minPoints={3}
          height={300}
          tableCaption="Monthly breakdown of new vs returning human contributors across Project Bluefin"
        />
      </section>

      {/* Chart 2: Human Contribution Types Breakdown */}
      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <Heading as="h3" className={styles.chartHeading}>
            Contribution Activity Streams
          </Heading>
          <p className={styles.currentValue}>
            <strong>
              {(latestMeasuredMonth?.streams?.humanPrs ?? 0).toLocaleString(
                "en-US",
              )}
            </strong>{" "}
            human merged PRs · {currentMonthLabel}
          </p>
        </div>
        <EChart
          option={chart2Option}
          title="Contribution Activity Streams"
          summary={
            latestMeasuredMonth
              ? `Activity volume for ${currentMonthLabel} across Merged PRs and Issues.`
              : "accumulating data"
          }
          points={chart2PointsCount}
          minPoints={3}
          height={300}
          tableCaption="Monthly activity breakdown by contribution stream across projectbluefin"
        />
      </section>

      {/* Chart 3: PR Velocity & Merge Rate */}
      <section className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <Heading as="h3" className={styles.chartHeading}>
            PR Velocity &amp; Merge Rate
          </Heading>
          <p className={styles.currentValue}>
            <strong>{mergeRate !== null ? `${mergeRate}%` : "—"}</strong> merge
            rate · {currentMonthLabel}
          </p>
        </div>
        <EChart
          option={chart3Option}
          title="PR Velocity & Merge Rate"
          summary={
            latestMeasuredMonth
              ? `Pull request throughput for ${currentMonthLabel}: ${latestMeasuredMonth.streams?.prsOpened ?? 0} opened, ${latestMeasuredMonth.streams?.prsMerged ?? 0} merged.`
              : "accumulating data"
          }
          points={chart3PointsCount}
          minPoints={3}
          height={300}
          tableCaption="Monthly pull request velocity and merge efficiency across projectbluefin"
        />
      </section>
    </div>
  );
}
