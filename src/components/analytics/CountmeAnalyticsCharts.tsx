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
type ViewMode = "all-ecosystem" | "workstations" | "with-fedora";

interface ProjectBluefinImageSpec {
  id: "bluefin" | "bluefin-lts" | "dakota" | "utah";
  name: string;
  edition: string;
  color: string;
  link: string;
  status: "active" | "bootstrapping" | "provisioning";
  statusText: string;
}

const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
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

  // 12-week delta calculation
  const week12wAgo = weeks.length > 12 ? weeks[weeks.length - 13] : weeks[0];
  const total12wAgo =
    (Number(week12wAgo?.bluefin) || 0) +
    (Number(week12wAgo?.["bluefin-lts"]) || 0) +
    (Number(week12wAgo?.dakota) || 0) +
    (Number(week12wAgo?.utah) || 0);

  const delta12wPct =
    total12wAgo > 0
      ? (((currentTotalBluefin - total12wAgo) / total12wAgo) * 100).toFixed(1)
      : "0.0";
  const isPositiveDelta = Number(delta12wPct) >= 0;

  // Filtered weeks for comparative time-series charts
  const filteredWeeks = useMemo(() => {
    if (range === "4w") return weeks.slice(-4);
    if (range === "12w") return weeks.slice(-12);
    return weeks;
  }, [weeks, range]);

  // Ecosystem totals (Bazzite + Total Bluefin fleet + Aurora)
  const bazziteCount = Number(latestWeek.bazzite) || 0;
  const auroraCount = Number(latestWeek.aurora) || 0;
  const peerTotal = bazziteCount + currentTotalBluefin + auroraCount;

  const bazzitePct = peerTotal > 0 ? (bazziteCount / peerTotal) * 100 : 0;
  const bluefinPct =
    peerTotal > 0 ? (currentTotalBluefin / peerTotal) * 100 : 0;
  const auroraPct = peerTotal > 0 ? (auroraCount / peerTotal) * 100 : 0;

  // Point counts for EChart to prevent bypassing accumulating data
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
            showSymbol: false,
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
            showSymbol: false,
            symbolSize: 6,
            itemStyle: { color: "#bc8cff" },
            lineStyle: { width: 3, color: "#bc8cff", type: [6, 3] },
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
          name: "Bluefin Family",
          type: "line",
          data: totalSeries,
          smooth: true,
          showSymbol: false,
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
                { offset: 0, color: "rgba(88, 166, 255, 0.4)" },
                { offset: 1, color: "rgba(57, 210, 192, 0.02)" },
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
      );
    } else {
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

  return (
    <div className={styles.container}>
      {/* ── 1. Top KPI Summary Strip ────────────────────────────────────── */}
      <section className={styles.kpiGrid} aria-label="Key adoption indicators">
        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Bluefin Fleet</span>
          <div className={styles.kpiValue}>
            {currentTotalBluefin.toLocaleString()}
          </div>
          <span className={styles.kpiMeta}>
            Weekly active systems · {latestWeek.week}
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>12-Week Growth</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{delta12wPct}%</span>
            <span
              className={`${styles.trendBadge} ${
                isPositiveDelta ? styles.trendUp : styles.trendDown
              }`}
            >
              {isPositiveDelta ? "↑" : "↓"} {Math.abs(Number(delta12wPct))}%
            </span>
          </div>
          <span className={styles.kpiMeta}>vs 12 weeks ago</span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Ecosystem Share</span>
          <div className={styles.kpiValue}>{bluefinPct.toFixed(1)}%</div>
          <span className={styles.kpiMeta}>
            Of {peerTotal.toLocaleString()} desktop devices
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Fleet Coverage</span>
          <div className={styles.kpiValue}>2 of 4 Active</div>
          <span className={styles.kpiMeta}>Dakota & Utah onboarding</span>
        </article>
      </section>

      {/* ── 2. Dominant Fleet Chart Panel ─────────────────────────────────── */}
      <section
        className={styles.panelCard}
        aria-label="Bluefin weekly active systems"
      >
        <div className={styles.panelHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.eyebrow}>Weekly Active Systems</span>
            <Heading as="h3" className={styles.panelTitle}>
              Project Bluefin Fleet
            </Heading>
          </div>

          <div className={styles.controlsRow}>
            <div
              className={styles.segmentedGroup}
              role="group"
              aria-label="Fleet view mode"
            >
              <button
                type="button"
                className={`${styles.toggleBtn} ${heroMode === "unified" ? styles.toggleBtnActive : ""}`}
                onClick={() => setHeroMode("unified")}
                aria-pressed={heroMode === "unified"}
              >
                Unified Fleet
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${heroMode === "split" ? styles.toggleBtnActive : ""}`}
                onClick={() => setHeroMode("split")}
                aria-pressed={heroMode === "split"}
              >
                By Edition
              </button>
            </div>

            <div
              className={styles.segmentedGroup}
              role="group"
              aria-label="Fleet time range"
            >
              {(["12w", "24w", "all"] as HeroRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.toggleBtn} ${heroRange === r ? styles.toggleBtnActive : ""}`}
                  onClick={() => setHeroRange(r)}
                  aria-pressed={heroRange === r}
                >
                  {r === "12w" ? "12w" : r === "24w" ? "24w" : "All"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <EChart
          option={heroChartOption}
          title="Bluefin Systems"
          summary={`Project Bluefin weekly active systems: currently ${currentTotalBluefin.toLocaleString()} systems as of week ${latestWeek.week}, ${delta12wPct}% 12-week change across ${weeks.length} tracked weeks.`}
          points={realHeroPoints}
          minPoints={2}
          height={320}
          tableCaption="Project Bluefin weekly active systems history"
        />

        <div className={styles.panelFooter}>
          Canonical weekly active systems across Project Bluefin workstation
          variants (ADR 0004).
        </div>
      </section>

      {/* ── 3. Family Cards Grid ─────────────────────────────────────────── */}
      <section
        className={styles.familySection}
        aria-label="Project Bluefin image family"
      >
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Image Editions</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Workstation Family
          </Heading>
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
              <article key={img.id} className={styles.familyCard}>
                <div className={styles.familyTopRow}>
                  <span className={styles.cardEyebrow}>{img.edition}</span>
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

                <Heading as="h4" className={styles.familyName}>
                  {img.name}
                </Heading>

                <div className={styles.countRow}>
                  <span className={styles.countValue}>
                    {isTracked
                      ? count.toLocaleString()
                      : img.status === "bootstrapping"
                        ? "Alpha"
                        : "Pre-alpha"}
                  </span>
                  {isTracked && currentTotalBluefin > 0 && (
                    <span className={styles.sharePct}>
                      {((count / currentTotalBluefin) * 100).toFixed(1)}% fleet
                    </span>
                  )}
                </div>

                <div className={styles.sparklineContainer}>
                  <Sparkline
                    data={history}
                    variant="line"
                    domain={workstationDomain}
                    width={220}
                    height={36}
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
                    label={`${img.name} adoption trend: currently ${count.toLocaleString()}`}
                  />
                </div>

                <div className={styles.familyCardFooter}>
                  <Link to={img.link} className={styles.cardLink}>
                    View Details &rarr;
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── 4. Comparative Trajectory Panel ──────────────────────────────── */}
      <section
        className={styles.panelCard}
        aria-label="Comparative adoption trajectories"
      >
        <div className={styles.panelHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.eyebrow}>Cloud-Native Ecosystem</span>
            <Heading as="h3" className={styles.panelTitle}>
              Comparative Adoption Trajectories
            </Heading>
            <div className={styles.ecosystemChips}>
              <span className={styles.chipBazzite}>
                Bazzite: {bazziteCount.toLocaleString()} (
                {bazzitePct.toFixed(1)}%)
              </span>
              <span className={styles.chipBluefin}>
                Bluefin: {currentTotalBluefin.toLocaleString()} (
                {bluefinPct.toFixed(1)}%)
              </span>
              <span className={styles.chipAurora}>
                Aurora: {auroraCount.toLocaleString()} ({auroraPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          <div className={styles.controlsRow}>
            <div
              className={styles.segmentedGroup}
              role="group"
              aria-label="Comparative scope"
            >
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "all-ecosystem" ? styles.toggleBtnActive : ""}`}
                onClick={() => setViewMode("all-ecosystem")}
                aria-pressed={viewMode === "all-ecosystem"}
              >
                All Desktops
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "workstations" ? styles.toggleBtnActive : ""}`}
                onClick={() => setViewMode("workstations")}
                aria-pressed={viewMode === "workstations"}
              >
                Workstations
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "with-fedora" ? styles.toggleBtnActive : ""}`}
                onClick={() => setViewMode("with-fedora")}
                aria-pressed={viewMode === "with-fedora"}
              >
                + Fedora
              </button>
            </div>

            <div
              className={styles.segmentedGroup}
              role="group"
              aria-label="Comparative time range"
            >
              {(["4w", "12w", "all"] as RangeOption[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.toggleBtn} ${range === r ? styles.toggleBtnActive : ""}`}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                >
                  {r === "4w" ? "4w" : r === "12w" ? "12w" : "All"}
                </button>
              ))}
            </div>
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

        <div className={styles.panelFooter}>
          Derived from weekly Countme telemetry tracking via{" "}
          <code>ublue-countme-v1</code> baseline aggregation.
        </div>
      </section>
    </div>
  );
}
