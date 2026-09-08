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
  bluefin?: number;
  "bluefin-lts"?: number;
  aurora?: number;
  bazzite?: number;
  fedora?: number;
  dakota?: number;
  utah?: number;
  [key: string]: string | number | undefined;
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

type HeroRange = "12w" | "24w" | "all";
type HeroMode = "unified" | "split";
type RangeOption = "4w" | "12w" | "all";
type ViewMode = "workstations" | "all-ecosystem" | "with-fedora";

interface ProjectBluefinImageSpec {
  id: "bluefin" | "bluefin-lts" | "dakota" | "utah";
  name: string;
  badge: string;
  edition: string;
  stream: string;
  repo: string;
  imageRef: string;
  desc: string;
  color: string;
  link: string;
  status: "active" | "bootstrapping" | "provisioning";
  statusText: string;
}

const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
  {
    id: "bluefin",
    name: "Bluefin",
    badge: "Fedora bootc",
    edition: "Flagship Workstation",
    stream: ":stable (GNOME 50.1 / Linux 7.0)",
    repo: "projectbluefin/bluefin",
    imageRef: "ghcr.io/projectbluefin/bluefin:stable",
    desc: "Flagship cloud-native developer workstation with devcontainers, eBPF tooling, and dedicated developer ergonomics.",
    color: "#58a6ff",
    link: "/downloads",
    status: "active",
    statusText: "Active Tracking",
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    badge: "CentOS Stream 10 bootc",
    edition: "Enterprise Workstation",
    stream: ":stable (CentOS Stream 10 / Linux 6.12 LTS)",
    repo: "projectbluefin/bluefin-lts",
    imageRef: "ghcr.io/projectbluefin/bluefin-lts:stable",
    desc: "Long-term support release providing 10-year platform stability, certified enterprise kernel base, and rock-solid reliability.",
    color: "#bc8cff",
    link: "/lts",
    status: "active",
    statusText: "Active Tracking",
  },
  {
    id: "dakota",
    name: "Project Bluefin Dakota",
    badge: "GNOME OS bootc",
    edition: "Next-Gen BuildStream",
    stream: ":stable & :testing (GNOME 50)",
    repo: "projectbluefin/dakota",
    imageRef: "ghcr.io/projectbluefin/dakota:stable",
    desc: "Built from source with Apache BuildStream. Eschews traditional packaging for pure upstream GNOME delivering a direct feedback loop.",
    color: "#39d2c0",
    link: "/dakota",
    status: "bootstrapping",
    statusText: "Alpha · Countme Activating",
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    badge: "Hummingbird bootc",
    edition: "Modular Hummingbird",
    stream: ":testing (GNOME 51)",
    repo: "projectbluefin/utah",
    imageRef: "ghcr.io/projectbluefin/utah:testing",
    desc: "Hardened minimal Fedora Hummingbird bootable base with Bluefin package contract and modular GNOME 51 desktop layer.",
    color: "#f0883e",
    link: "/utah",
    status: "provisioning",
    statusText: "Pre-alpha · Countme Provisioning",
  },
];

export default function CountmeAnalyticsCharts(): React.JSX.Element {
  const data = countmeHistoryData as unknown as CountmeDataset;
  const weeks = data?.weeks || [];

  const [heroRange, setHeroRange] = useState<HeroRange>("all");
  const [heroMode, setHeroMode] = useState<HeroMode>("unified");
  const [range, setRange] = useState<RangeOption>("12w");
  const [viewMode, setViewMode] = useState<ViewMode>("all-ecosystem");

  const latestWeek = weeks[weeks.length - 1] || ({} as CountmeWeek);
  const latestBluefin = Number(latestWeek.bluefin) || 0;
  const latestBluefinLts = Number(latestWeek["bluefin-lts"]) || 0;
  const latestDakota = Number(latestWeek.dakota) || 0;
  const latestUtah = Number(latestWeek.utah) || 0;
  const currentTotalBluefin =
    latestBluefin + latestBluefinLts + latestDakota + latestUtah;

  // Filtered weeks for Hero Bluefin chart
  const heroFilteredWeeks = useMemo(() => {
    if (heroRange === "12w") return weeks.slice(-12);
    if (heroRange === "24w") return weeks.slice(-24);
    return weeks;
  }, [weeks, heroRange]);

  // Delta calculation for Bluefin fleet
  const firstWeek = weeks[0] || ({} as CountmeWeek);
  const initialTotalBluefin =
    (Number(firstWeek.bluefin) || 0) +
      (Number(firstWeek["bluefin-lts"]) || 0) +
      (Number(firstWeek.dakota) || 0) +
      (Number(firstWeek.utah) || 0) || currentTotalBluefin;

  const bluefinDeltaPct =
    initialTotalBluefin > 0
      ? (
          ((currentTotalBluefin - initialTotalBluefin) / initialTotalBluefin) *
          100
        ).toFixed(1)
      : "0.0";

  // Filtered weeks for comparative time-series charts
  const filteredWeeks = useMemo(() => {
    if (range === "4w") return weeks.slice(-4);
    if (range === "12w") return weeks.slice(-12);
    return weeks;
  }, [weeks, range]);

  // Ecosystem totals (Bazzite + Total Bluefin fleet + Aurora)
  const peerTotal = useMemo(() => {
    const bazzite = Number(latestWeek.bazzite) || 0;
    const aurora = Number(latestWeek.aurora) || 0;
    return bazzite + currentTotalBluefin + aurora;
  }, [latestWeek, currentTotalBluefin]);

  // Real finite point counts for EChart to prevent bypassing accumulating data
  const realHeroPoints = useMemo(() => {
    return heroFilteredWeeks.filter(
      (w) =>
        (typeof w.bluefin === "number" && !Number.isNaN(w.bluefin)) ||
        (typeof w["bluefin-lts"] === "number" &&
          !Number.isNaN(w["bluefin-lts"])),
    ).length;
  }, [heroFilteredWeeks]);

  const realComparativePoints = useMemo(() => {
    return filteredWeeks.filter(
      (w) =>
        (typeof w.bazzite === "number" && !Number.isNaN(w.bazzite)) ||
        (typeof w.bluefin === "number" && !Number.isNaN(w.bluefin)) ||
        (typeof w.aurora === "number" && !Number.isNaN(w.aurora)),
    ).length;
  }, [filteredWeeks]);

  // Shared domain for workstation small multiples
  const workstationDomain = useMemo<[number, number]>(() => {
    let min = Infinity;
    let max = -Infinity;
    const workstationKeys = ["bluefin", "aurora", "bluefin-lts"] as const;
    for (const w of weeks) {
      for (const k of workstationKeys) {
        const val = w[k];
        if (typeof val === "number") {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    return [Math.max(0, min), Math.max(100, max)];
  }, [weeks]);

  // 1. "Bluefin Systems (Total Fleet)" EChart option
  const heroChartOption = useMemo(() => {
    const labels = heroFilteredWeeks.map((w) => w.week);

    if (heroMode === "split") {
      const flagshipSeries = gapSafe(
        heroFilteredWeeks.map((w) => w.bluefin ?? null),
      );
      const ltsSeries = gapSafe(
        heroFilteredWeeks.map((w) => w["bluefin-lts"] ?? null),
      );
      const dakotaSeries = gapSafe(
        heroFilteredWeeks.map((w) => w.dakota ?? null),
      );
      const utahSeries = gapSafe(
        heroFilteredWeeks.map((w) => w.utah ?? null),
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
      heroFilteredWeeks.map((w) => {
        const bf = typeof w.bluefin === "number" ? w.bluefin : 0;
        const lts = typeof w["bluefin-lts"] === "number" ? w["bluefin-lts"] : 0;
        const dakota = typeof w.dakota === "number" ? w.dakota : 0;
        const utah = typeof w.utah === "number" ? w.utah : 0;
        const sum = bf + lts + dakota + utah;
        return sum > 0 ? sum : null;
      }),
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
        data: gapSafe(filteredWeeks.map((w) => w.fedora ?? null)),
        connectNulls: false,
        itemStyle: { color: "#79b8ff" },
        lineStyle: { type: [4, 4] },
      });
    }

    if (viewMode === "all-ecosystem" || viewMode === "with-fedora") {
      seriesList.push({
        name: "Bazzite (Gaming)",
        type: "line",
        data: gapSafe(filteredWeeks.map((w) => w.bazzite ?? null)),
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
          data: gapSafe(filteredWeeks.map((w) => w.bluefin ?? null)),
          connectNulls: false,
          itemStyle: { color: seriesColor(0) },
          lineStyle: { type: seriesDash(0) },
        },
        {
          name: "Bluefin LTS",
          type: "line",
          data: gapSafe(filteredWeeks.map((w) => w["bluefin-lts"] ?? null)),
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
          filteredWeeks.map((w) => {
            const sum =
              (Number(w.bluefin) || 0) +
              (Number(w["bluefin-lts"]) || 0) +
              (Number(w.dakota) || 0) +
              (Number(w.utah) || 0);
            return sum > 0 ? sum : null;
          }),
        ),
        connectNulls: false,
        itemStyle: { color: seriesColor(0) },
        lineStyle: { type: seriesDash(0) },
      });
    }

    seriesList.push({
      name: "Aurora (KDE)",
      type: "line",
      data: gapSafe(filteredWeeks.map((w) => w.aurora ?? null)),
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
  const bazziteCount = Number(latestWeek.bazzite) || 0;
  const auroraCount = Number(latestWeek.aurora) || 0;
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
              Bluefin Systems
              <span className={styles.heroBadge}>Source of Truth</span>
            </Heading>
            <p className={styles.heroSubtitle}>
              Canonical weekly active systems across all Project Bluefin
              workstation variants
            </p>
            <div className={styles.heroSubBadges}>
              <span
                className={`${styles.heroSubBadge} ${styles.heroSubBadgeHighlight}`}
              >
                Flagship (projectbluefin/bluefin):{" "}
                {latestBluefin.toLocaleString()} (
                {((latestBluefin / currentTotalBluefin) * 100).toFixed(1)}%)
              </span>
              <span className={styles.heroSubBadge}>
                LTS (projectbluefin/bluefin-lts):{" "}
                {latestBluefinLts.toLocaleString()} (
                {((latestBluefinLts / currentTotalBluefin) * 100).toFixed(1)}%)
              </span>
              <span className={styles.heroSubBadge}>Dakota: Bootstrapping</span>
              <span className={styles.heroSubBadge}>Utah: Provisioning</span>
            </div>
          </div>

          <div className={styles.heroKPI}>
            <div className={styles.heroNumber}>
              {currentTotalBluefin.toLocaleString()}
            </div>
            <div className={styles.heroMeta}>
              <span style={{ fontWeight: 700, color: "#39d2c0" }}>
                +{bluefinDeltaPct}% overall
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
          summary={`Project Bluefin weekly active systems: currently ${currentTotalBluefin.toLocaleString()} systems as of week ${latestWeek.week}, up ${bluefinDeltaPct}% across ${weeks.length} tracked weeks.`}
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
            const count =
              img.id === "bluefin"
                ? latestBluefin
                : img.id === "bluefin-lts"
                  ? latestBluefinLts
                  : img.id === "dakota"
                    ? latestDakota
                    : latestUtah;

            const isTracked = count > 0;
            const history = isTracked
              ? weeks.slice(-12).map((w) => (w[img.id] as number) ?? null)
              : [];

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
                    {isTracked
                      ? count.toLocaleString()
                      : img.status === "bootstrapping"
                        ? "Initial"
                        : "Pending"}
                  </span>
                  {isTracked && currentTotalBluefin > 0 && (
                    <span className={styles.sharePct}>
                      {((count / currentTotalBluefin) * 100).toFixed(1)}% fleet
                    </span>
                  )}
                </div>

                <p className={styles.cardDesc}>{img.desc}</p>

                <div className={styles.familyMetaRow}>
                  <div className={styles.familyMetaItem}>
                    <span className={styles.familyMetaLabel}>Base Stack</span>
                    <span className={styles.familyMetaValue}>{img.badge}</span>
                  </div>
                  <div className={styles.familyMetaItem}>
                    <span className={styles.familyMetaLabel}>Repository</span>
                    <span className={styles.familyMetaValue}>
                      <code>{img.repo}</code>
                    </span>
                  </div>
                  <div className={styles.familyMetaItem}>
                    <span className={styles.familyMetaLabel}>Image</span>
                    <span className={styles.familyMetaValue}>
                      <code>{img.imageRef}</code>
                    </span>
                  </div>
                  <div className={styles.familyMetaItem}>
                    <span className={styles.familyMetaLabel}>Streams</span>
                    <span className={styles.familyMetaValue}>{img.stream}</span>
                  </div>
                </div>

                <div className={styles.cardSparkline}>
                  <span className={styles.sparklineLabel}>
                    {isTracked ? "12-week trend" : "Countme status"}
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
                    label={`${img.name} 12-week adoption trend: currently ${count.toLocaleString()}`}
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
          summary={`Comparative adoption trajectories across cloud-native images over ${filteredWeeks.length} weeks. Latest week (${latestWeek.week}): Bazzite ${Number(latestWeek.bazzite || 0).toLocaleString()} (Gaming), Bluefin Family ${currentTotalBluefin.toLocaleString()} (Workstations), Aurora ${Number(latestWeek.aurora || 0).toLocaleString()} (KDE).`}
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
