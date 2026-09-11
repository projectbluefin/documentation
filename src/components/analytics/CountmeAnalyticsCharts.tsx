import React, { useState, useMemo } from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import Sparkline from "../Sparkline";
import { gapSafe, seriesColor, seriesDash } from "../factory/chartTheme";
import styles from "./CountmeAnalyticsCharts.module.css";
import countmeHistoryData from "@site/static/data/countme-history.json";

export interface CountmeWeek {
  week: string;
  bluefin?: number | null;
  "bluefin-lts"?: number | null;
  aurora?: number | null;
  bazzite?: number | null;
  fedora?: number | null;
  dakota?: number | null;
  utah?: number | null;
  [key: string]: string | number | null | undefined;
}

export interface CountmeDataset {
  generatedAt: string;
  source: string;
  method: string;
  unit: string;
  variants: string[];
  weeks: CountmeWeek[];
  unavailable?: boolean;
  stateReason?: string | null;
}

/**
 * Parse a raw count value, preserving 0 as a valid measurement.
 * Returns null for undefined, null, empty string, or non-finite values.
 */
export function parseCount(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sum an array of counts, preserving 0 if at least one value is present,
 * and returning null if all values are missing (gaps).
 */
export function sumPresent(
  values: Array<number | null | undefined>,
): number | null {
  let hasValue = false;
  let total = 0;
  for (const raw of values) {
    const val = parseCount(raw);
    if (val !== null) {
      hasValue = true;
      total += val;
    }
  }
  return hasValue ? total : null;
}

type HeroRange = "12w" | "24w" | "all";
type HeroMode = "unified" | "split";
type RangeOption = "4w" | "12w" | "all";
type ViewMode = "workstations" | "all-ecosystem" | "with-fedora";

export interface ProjectBluefinImageSpec {
  id: "bluefin" | "bluefin-lts" | "dakota" | "utah";
  name: string;
  edition: string;
  color: string;
  link: string;
  status: "active" | "bootstrapping" | "provisioning";
  statusText: string;
}

export const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
  {
    id: "bluefin",
    name: "Bluefin",
    edition: "Flagship Workstation",
    color: "#58a6ff",
    link: "/downloads",
    status: "active",
    statusText: "Active Tracking",
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    edition: "Enterprise Workstation",
    color: "#bc8cff",
    link: "/lts",
    status: "active",
    statusText: "Active · EPEL",
  },
  {
    id: "dakota",
    name: "Project Bluefin Dakota",
    edition: "Next-Gen BuildStream",
    color: "#39d2c0",
    link: "/dakota",
    status: "bootstrapping",
    statusText: "Alpha · Collecting",
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Hummingbird",
    color: "#f0883e",
    link: "/utah",
    status: "provisioning",
    statusText: "Pre-alpha · Provisioning",
  },
];

export function getFamilyImageMetrics(
  img: ProjectBluefinImageSpec,
  weeks: CountmeWeek[],
  latestWeek: CountmeWeek,
) {
  const count = parseCount(latestWeek[img.id]);
  const history = weeks.slice(-12).map((w) => parseCount(w[img.id]));
  const hasHistory = history.some((v) => v !== null);
  const isTracked = count !== null;
  return {
    count,
    isTracked,
    hasHistory,
    history: isTracked || hasHistory ? history : [],
  };
}

export interface CountmeAnalyticsChartsProps {
  dataset?: CountmeDataset;
}

export default function CountmeAnalyticsCharts({
  dataset,
}: CountmeAnalyticsChartsProps = {}): React.JSX.Element {
  const data = dataset ?? (countmeHistoryData as unknown as CountmeDataset);
  const weeks = data?.weeks || [];

  const [heroRange, setHeroRange] = useState<HeroRange>("all");
  const [heroMode, setHeroMode] = useState<HeroMode>("unified");
  const [range, setRange] = useState<RangeOption>("12w");
  const [viewMode, setViewMode] = useState<ViewMode>("all-ecosystem");

  const latestWeek = weeks[weeks.length - 1] || ({} as CountmeWeek);
  const latestBluefin = parseCount(latestWeek.bluefin);
  const latestBluefinLts = parseCount(latestWeek["bluefin-lts"]);
  const latestDakota = parseCount(latestWeek.dakota);
  const latestUtah = parseCount(latestWeek.utah);
  const currentTotalBluefin =
    sumPresent([latestBluefin, latestBluefinLts, latestDakota, latestUtah]) ??
    0;

  // Filtered weeks for Hero Bluefin chart
  const heroFilteredWeeks = useMemo(() => {
    if (heroRange === "12w") return weeks.slice(-12);
    if (heroRange === "24w") return weeks.slice(-24);
    return weeks;
  }, [weeks, heroRange]);

  // Delta calculation for Bluefin fleet
  const firstWeek = heroFilteredWeeks[0] || ({} as CountmeWeek);
  const initialTotalBluefin =
    sumPresent([
      firstWeek.bluefin,
      firstWeek["bluefin-lts"],
      firstWeek.dakota,
      firstWeek.utah,
    ]) ?? currentTotalBluefin;

  const bluefinDeltaPct =
    initialTotalBluefin > 0
      ? (
          ((currentTotalBluefin - initialTotalBluefin) / initialTotalBluefin) *
          100
        ).toFixed(1)
      : "0.0";
  const bluefinDeltaIsPositive = parseFloat(bluefinDeltaPct) >= 0;

  // Filtered weeks for comparative time-series charts
  const filteredWeeks = useMemo(() => {
    if (range === "4w") return weeks.slice(-4);
    if (range === "12w") return weeks.slice(-12);
    return weeks;
  }, [weeks, range]);

  // Ecosystem totals (Bazzite + Total Bluefin fleet + Aurora)
  const peerTotal = useMemo(() => {
    const bazzite = parseCount(latestWeek.bazzite) ?? 0;
    const aurora = parseCount(latestWeek.aurora) ?? 0;
    return bazzite + currentTotalBluefin + aurora;
  }, [latestWeek, currentTotalBluefin]);

  // Real finite point counts for EChart to prevent bypassing accumulating data
  const realHeroPoints = useMemo(() => {
    return heroFilteredWeeks.filter(
      (w) =>
        parseCount(w.bluefin) !== null ||
        parseCount(w["bluefin-lts"]) !== null ||
        parseCount(w.dakota) !== null ||
        parseCount(w.utah) !== null,
    ).length;
  }, [heroFilteredWeeks]);

  const realComparativePoints = useMemo(() => {
    return filteredWeeks.filter(
      (w) =>
        parseCount(w.bazzite) !== null ||
        parseCount(w.bluefin) !== null ||
        parseCount(w["bluefin-lts"]) !== null ||
        parseCount(w.dakota) !== null ||
        parseCount(w.utah) !== null ||
        parseCount(w.aurora) !== null,
    ).length;
  }, [filteredWeeks]);

  // Shared domain for workstation small multiples
  const workstationDomain = useMemo<[number, number]>(() => {
    let min = Infinity;
    let max = -Infinity;
    const workstationKeys = BLUEFIN_FAMILY_IMAGES.map((img) => img.id);
    for (const w of weeks) {
      for (const k of workstationKeys) {
        const val = parseCount(w[k]);
        if (val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    const safeMin = Number.isFinite(min) ? Math.max(0, min) : 0;
    const safeMax = Number.isFinite(max) ? Math.max(100, max) : 100;
    return [safeMin, safeMax];
  }, [weeks]);

  // 1. "Bluefin Systems (Total Fleet)" EChart option
  const heroChartOption = useMemo(() => {
    const labels = heroFilteredWeeks.map((w) => w.week);

    if (heroMode === "split") {
      const flagshipSeries = gapSafe(
        heroFilteredWeeks.map((w) => parseCount(w.bluefin)),
      );
      const ltsSeries = gapSafe(
        heroFilteredWeeks.map((w) => parseCount(w["bluefin-lts"])),
      );
      const dakotaSeries = gapSafe(
        heroFilteredWeeks.map((w) => w.dakota ?? null),
      );
      const utahSeries = gapSafe(heroFilteredWeeks.map((w) => w.utah ?? null));

      return {
        xAxis: {
          type: "category",
          data: labels,
        },
        yAxis: {
          type: "value",
          min: "dataMin",
        },
        series: [
          {
            name: "Bluefin Flagship",
            type: "line",
            data: flagshipSeries,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            itemStyle: { color: "#58a6ff" },
            lineStyle: { width: 3, color: "#58a6ff" },
            connectNulls: false,
          },
          {
            name: "Bluefin LTS",
            type: "line",
            data: ltsSeries,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            itemStyle: { color: "#bc8cff" },
            lineStyle: { width: 3, color: "#bc8cff", type: [6, 3] },
            connectNulls: false,
          },
          {
            name: "Dakota",
            type: "line",
            data: dakotaSeries,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            itemStyle: { color: "#39d2c0" },
            lineStyle: { width: 3, color: "#39d2c0", type: [2, 2] },
            connectNulls: false,
          },
          {
            name: "Utah",
            type: "line",
            data: utahSeries,
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            itemStyle: { color: "#f0883e" },
            lineStyle: { width: 3, color: "#f0883e", type: [1, 2] },
            connectNulls: false,
          },
        ],
      };
    }

    // Unified fleet total series
    const totalSeries = gapSafe(
      heroFilteredWeeks.map((w) =>
        sumPresent([w.bluefin, w["bluefin-lts"], w.dakota, w.utah]),
      ),
    );

    return {
      xAxis: {
        type: "category",
        data: labels,
      },
      yAxis: {
        type: "value",
        min: "dataMin",
      },
      series: [
        {
          name: "Bluefin Family (All Systems)",
          type: "line",
          data: totalSeries,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: "#58a6ff" },
          lineStyle: { width: 3, color: "#58a6ff" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(88, 166, 255, 0.45)" },
                { offset: 1, color: "rgba(57, 210, 192, 0.05)" },
              ],
            },
          },
          connectNulls: false,
        },
      ],
    };
  }, [heroFilteredWeeks, heroMode]);

  // 2. Comparative EChart configuration
  const comparativeChartOption = useMemo(() => {
    const labels = filteredWeeks.map((w) => w.week);
    const seriesList = [];

    if (viewMode === "with-fedora") {
      seriesList.push({
        name: "Fedora (Base)",
        type: "line",
        data: gapSafe(filteredWeeks.map((w) => parseCount(w.fedora))),
        connectNulls: false,
        itemStyle: { color: "#79b8ff" },
        lineStyle: { type: [4, 4] },
      });
    }

    if (viewMode === "all-ecosystem" || viewMode === "with-fedora") {
      seriesList.push({
        name: "Bazzite (Gaming)",
        type: "line",
        data: gapSafe(filteredWeeks.map((w) => parseCount(w.bazzite))),
        connectNulls: false,
        itemStyle: { color: "#f0883e" },
        lineStyle: { type: seriesDash(3) },
      });
    }

    if (viewMode === "workstations") {
      seriesList.push(
        {
          name: "Bluefin Flagship",
          type: "line",
          data: gapSafe(filteredWeeks.map((w) => parseCount(w.bluefin))),
          connectNulls: false,
          itemStyle: { color: seriesColor(0) },
          lineStyle: { type: seriesDash(0) },
        },
        {
          name: "Bluefin LTS",
          type: "line",
          data: gapSafe(filteredWeeks.map((w) => parseCount(w["bluefin-lts"]))),
          connectNulls: false,
          itemStyle: { color: seriesColor(1) },
          lineStyle: { type: seriesDash(1) },
        },
        {
          name: "Dakota",
          type: "line",
          data: gapSafe(filteredWeeks.map((w) => w.dakota ?? null)),
          connectNulls: false,
          itemStyle: { color: "#39d2c0" },
          lineStyle: { type: seriesDash(3) },
        },
        {
          name: "Utah",
          type: "line",
          data: gapSafe(filteredWeeks.map((w) => w.utah ?? null)),
          connectNulls: false,
          itemStyle: { color: "#f0883e" },
          lineStyle: { type: seriesDash(4) },
        },
      );
    } else {
      // Total Bluefin family
      seriesList.push({
        name: "Bluefin Family",
        type: "line",
        data: gapSafe(
          filteredWeeks.map((w) =>
            sumPresent([w.bluefin, w["bluefin-lts"], w.dakota, w.utah]),
          ),
        ),
        connectNulls: false,
        itemStyle: { color: seriesColor(0) },
        lineStyle: { type: seriesDash(0) },
      });
    }

    seriesList.push({
      name: "Aurora (KDE)",
      type: "line",
      data: gapSafe(filteredWeeks.map((w) => parseCount(w.aurora))),
      connectNulls: false,
      itemStyle: { color: seriesColor(2) },
      lineStyle: { type: seriesDash(2) },
    });

    return {
      xAxis: { type: "category", data: labels },
      yAxis: { type: "value" },
      series: seriesList,
    };
  }, [filteredWeeks, viewMode]);

  if (data?.unavailable || !weeks.length) {
    return (
      <div className={styles.container}>
        <Unavailable
          what="Countme Analytics"
          reason={
            data?.stateReason ?? "Countme dataset is currently unavailable."
          }
        />
      </div>
    );
  }

  // Distribution calculations
  const bazziteCount = parseCount(latestWeek.bazzite) ?? 0;
  const auroraCount = parseCount(latestWeek.aurora) ?? 0;
  const bazzitePct = peerTotal > 0 ? (bazziteCount / peerTotal) * 100 : 0;
  const bluefinPct =
    peerTotal > 0 ? (currentTotalBluefin / peerTotal) * 100 : 0;
  const auroraPct = peerTotal > 0 ? (auroraCount / peerTotal) * 100 : 0;

  return (
    <div className={styles.container}>
      {/* ── 1. Hero: Bluefin Systems (Total Fleet) ─────────────────────────── */}
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div className={styles.heroTitleGroup}>
            <Heading as="h3" className={styles.heroTitle}>
              Weekly Active Systems
            </Heading>
            <p className={styles.heroSubtitle}>
              Weekly DNF countme check-ins across Project Bluefin workstation
              variants (Fedora countme)
            </p>
            <div className={styles.heroSubBadges}>
              <span
                className={`${styles.heroSubBadge} ${styles.heroSubBadgeHighlight}`}
              >
                Flagship (projectbluefin/bluefin):{" "}
                {latestBluefin !== null
                  ? `${latestBluefin.toLocaleString()} (${currentTotalBluefin > 0 ? ((latestBluefin / currentTotalBluefin) * 100).toFixed(1) : "0.0"}%)`
                  : "Pending"}
              </span>
              <span className={styles.heroSubBadge}>
                LTS (projectbluefin/bluefin-lts):{" "}
                {latestBluefinLts !== null
                  ? `${latestBluefinLts.toLocaleString()} (${currentTotalBluefin > 0 ? ((latestBluefinLts / currentTotalBluefin) * 100).toFixed(1) : "0.0"}%)`
                  : "Pending"}
              </span>
              <span className={styles.heroSubBadge}>
                {latestDakota !== null
                  ? `Dakota: ${latestDakota.toLocaleString()}${currentTotalBluefin > 0 ? ` (${((latestDakota / currentTotalBluefin) * 100).toFixed(1)}%)` : ""}`
                  : "Dakota: Bootstrapping"}
              </span>
              <span className={styles.heroSubBadge}>
                {latestUtah !== null
                  ? `Utah: ${latestUtah.toLocaleString()}${currentTotalBluefin > 0 ? ` (${((latestUtah / currentTotalBluefin) * 100).toFixed(1)}%)` : ""}`
                  : "Utah: Provisioning"}
              </span>
            </div>
          </div>

          <div className={styles.heroKPI}>
            <div className={styles.heroNumber}>
              {currentTotalBluefin.toLocaleString()}
            </div>
            <div className={styles.heroMeta}>
              <span style={{ fontWeight: 700, color: "#39d2c0" }}>
                {bluefinDeltaIsPositive ? "+" : ""}
                {bluefinDeltaPct}% overall
              </span>
              <span>latest week ({latestWeek.week})</span>
            </div>
          </div>
        </div>

        <div className={styles.chartControls}>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${heroMode === "unified" ? styles.toggleBtnActive : ""}`}
              onClick={() => setHeroMode("unified")}
            >
              Unified Fleet
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${heroMode === "split" ? styles.toggleBtnActive : ""}`}
              onClick={() => setHeroMode("split")}
            >
              By Edition
            </button>
          </div>

          <div className={styles.toggleGroup}>
            {(["12w", "24w", "all"] as HeroRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.toggleBtn} ${heroRange === r ? styles.toggleBtnActive : ""}`}
                onClick={() => setHeroRange(r)}
              >
                {r === "12w"
                  ? "12 Weeks"
                  : r === "24w"
                    ? "6 Months"
                    : `All History (${weeks.length}w)`}
              </button>
            ))}
          </div>
        </div>

        <EChart
          option={heroChartOption}
          title="Bluefin Systems"
          summary={`Project Bluefin weekly active systems: currently ${currentTotalBluefin.toLocaleString()} systems as of week ${latestWeek.week}, ${bluefinDeltaIsPositive ? "up" : "down"} ${Math.abs(parseFloat(bluefinDeltaPct))}% across ${heroFilteredWeeks.length} tracked weeks.`}
          points={realHeroPoints}
          minPoints={2}
          height={320}
          tableCaption="Project Bluefin weekly active systems history"
        />

        <div className={styles.chartNote}>
          <strong>Lineage:</strong> Single source of truth for Project Bluefin,
          unifying flagship (<code>projectbluefin/bluefin</code>) and enterprise
          LTS (<code>projectbluefin/bluefin-lts</code>) into one fleet view.
        </div>
      </div>

      {/* ── 2. Project Bluefin Image Family ─────────────────────────────────── */}
      <div className={styles.familySection}>
        <div className={styles.sectionHeading}>
          Project Bluefin Image Family
        </div>
        <div className={styles.sectionSubtext}>
          Workstation operating system images built, maintained, and
          instrumented by Project Bluefin
        </div>

        <div className={styles.familyGrid}>
          {BLUEFIN_FAMILY_IMAGES.map((img) => {
            const { count, isTracked, hasHistory, history } =
              getFamilyImageMetrics(img, weeks, latestWeek);

            return (
              <div key={img.id} className={styles.familyCard}>
                <div className={styles.familyCardHeader}>
                  <div className={styles.familyCardTitleGroup}>
                    <Heading as="h4" className={styles.familyName}>
                      {img.name}
                    </Heading>
                    <span className={styles.familyEdition}>{img.edition}</span>
                  </div>
                  <span
                    className={`${styles.statusPill} ${
                      img.status === "active"
                        ? styles.statusActive
                        : styles.statusPending
                    }`}
                  >
                    {img.statusText}
                  </span>
                </div>

                <div className={styles.countRow}>
                  <span className={styles.countValue}>
                    {isTracked && count !== null
                      ? count.toLocaleString()
                      : img.status === "bootstrapping"
                        ? "Initial"
                        : "Pending"}
                  </span>
                  {isTracked && count !== null && currentTotalBluefin > 0 && (
                    <span className={styles.sharePct}>
                      {((count / currentTotalBluefin) * 100).toFixed(1)}% fleet
                    </span>
                  )}
                </div>

                <div className={styles.cardSparkline}>
                  <span className={styles.sparklineLabel}>
                    {isTracked || hasHistory
                      ? "12-week trend"
                      : "Countme status"}
                  </span>
                  <Sparkline
                    data={history}
                    variant="line"
                    domain={workstationDomain}
                    width={220}
                    height={32}
                    color={img.color}
                    areaColor="currentColor"
                    areaOpacity={0.12}
                    showEnd={isTracked}
                    minPoints={2}
                    emptyLabel={
                      img.status === "bootstrapping"
                        ? "accumulating countme data"
                        : "provisioning countme"
                    }
                    label={
                      count !== null
                        ? `${img.name} 12-week adoption trend: currently ${count.toLocaleString()}`
                        : `${img.name} countme status: ${img.statusText}`
                    }
                  />
                </div>

                <div className={styles.familyFooter}>
                  <Link to={img.link} className={styles.familyLink}>
                    View {img.name} Details &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Cloud-Native Ecosystem Overview ─────────────────────────────── */}
      <div className={styles.shareSection}>
        <div className={styles.sectionHeading}>
          Cloud-Native Desktop Ecosystem
        </div>
        <div className={styles.sectionSubtext}>
          Share of {peerTotal.toLocaleString()} total estimated active
          cloud-native desktop devices (latest week: {latestWeek.week})
        </div>

        {/* Distribution Bar */}
        <div
          className={styles.distributionBar}
          role="region"
          aria-label={`Desktop ecosystem distribution across ${peerTotal.toLocaleString()} systems`}
        >
          <div
            className={styles.segment}
            style={{ width: `${bazzitePct}%`, backgroundColor: "#f0883e" }}
            title={`Bazzite (Gaming): ${bazziteCount.toLocaleString()} (${bazzitePct.toFixed(1)}%)`}
          />
          <div
            className={styles.segment}
            style={{ width: `${bluefinPct}%`, backgroundColor: "#58a6ff" }}
            title={`Bluefin Family: ${currentTotalBluefin.toLocaleString()} (${bluefinPct.toFixed(1)}%)`}
          />
          <div
            className={styles.segment}
            style={{ width: `${auroraPct}%`, backgroundColor: "#39d2c0" }}
            title={`Aurora (KDE): ${auroraCount.toLocaleString()} (${auroraPct.toFixed(1)}%)`}
          />
        </div>

        {/* Legend */}
        <div className={styles.shareLegend}>
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: "#f0883e" }}
            />
            <span className={styles.legendLabel}>Bazzite (Gaming):</span>
            <span className={styles.legendValue}>
              {bazziteCount.toLocaleString()} ({bazzitePct.toFixed(1)}%)
            </span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: "#58a6ff" }}
            />
            <span className={styles.legendLabel}>Bluefin Family:</span>
            <span className={styles.legendValue}>
              {currentTotalBluefin.toLocaleString()} ({bluefinPct.toFixed(1)}%)
            </span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: "#39d2c0" }}
            />
            <span className={styles.legendLabel}>Aurora (KDE):</span>
            <span className={styles.legendValue}>
              {auroraCount.toLocaleString()} ({auroraPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Interactive Comparative Trajectory ───────────────────────────── */}
      <div className={styles.chartCard}>
        <div className={styles.chartControls}>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "all-ecosystem" ? styles.toggleBtnActive : ""}`}
              onClick={() => setViewMode("all-ecosystem")}
            >
              All Desktop Images
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "workstations" ? styles.toggleBtnActive : ""}`}
              onClick={() => setViewMode("workstations")}
            >
              Workstations (Flagship, LTS & Aurora)
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "with-fedora" ? styles.toggleBtnActive : ""}`}
              onClick={() => setViewMode("with-fedora")}
            >
              Include Fedora Base
            </button>
          </div>

          <div className={styles.toggleGroup}>
            {(["4w", "12w", "all"] as RangeOption[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.toggleBtn} ${range === r ? styles.toggleBtnActive : ""}`}
                onClick={() => setRange(r)}
              >
                {r === "4w"
                  ? "4 Weeks"
                  : r === "12w"
                    ? "12 Weeks"
                    : "All Weeks"}
              </button>
            ))}
          </div>
        </div>

        <EChart
          option={comparativeChartOption}
          title="Comparative Image Trajectories"
          summary={`Comparative adoption trajectories across cloud-native images over ${filteredWeeks.length} weeks. Latest week (${latestWeek.week}): Bazzite ${(parseCount(latestWeek.bazzite) ?? 0).toLocaleString()} (Gaming), Bluefin Family ${currentTotalBluefin.toLocaleString()} (Workstations), Aurora ${(parseCount(latestWeek.aurora) ?? 0).toLocaleString()} (KDE).`}
          points={realComparativePoints}
          minPoints={2}
          height={320}
          tableCaption="Weekly estimated active systems by image variant"
        />

        <div className={styles.chartNote}>
          <strong>Methodology:</strong> Derived from weekly Countme telemetry
          tracking with <code>ublue-countme-v1</code> baseline aggregation,
          supplemented by first-party <code>countme.projectbluefin.io</code>{" "}
          pings.
        </div>
      </div>
    </div>
  );
}
