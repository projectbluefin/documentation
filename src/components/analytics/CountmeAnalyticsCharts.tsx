import React, { useState, useMemo } from "react";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
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
  [key: string]: string | number | undefined;
}

export interface CountmeDataset {
  generatedAt: string;
  source: string;
  method: string;
  unit: string;
  variants: string[];
  weeks: CountmeWeek[];
}

type LegacyRange = "12w" | "24w" | "all";
type RangeOption = "4w" | "12w" | "all";
type ViewMode = "workstations" | "all-ecosystem" | "with-fedora";

const IMAGE_CONFIGS = [
  {
    id: "bazzite",
    name: "Bazzite",
    badge: "Gaming & Handhelds",
    badgeClass: styles.badgeGaming,
    desc: "Gaming-specialized image for Steam Deck, ROG Ally, Lenovo Legion Go, and gaming PCs.",
    color: "#f0883e",
  },
  {
    id: "bluefin",
    name: "Bluefin",
    badge: "Developer Workstation",
    badgeClass: styles.badge,
    desc: "Flagship cloud-native workstation with devcontainers, eBPF tooling, and dedicated developer ergonomics.",
    color: "#58a6ff",
  },
  {
    id: "aurora",
    name: "Aurora",
    badge: "KDE Plasma Desktop",
    badgeClass: styles.badgeDesktop,
    desc: "Cloud-native desktop featuring KDE Plasma, customized for speed and polished productivity.",
    color: "#39d2c0",
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    badge: "Enterprise Base",
    badgeClass: styles.badgeEnterprise,
    desc: "CentOS Stream 10-based release for long-term deployments (counted via EPEL; represents a floor).",
    color: "#bc8cff",
  },
] as const;

export default function CountmeAnalyticsCharts(): React.JSX.Element {
  const data = countmeHistoryData as unknown as CountmeDataset;
  const weeks = data.weeks || [];

  const [legacyRange, setLegacyRange] = useState<LegacyRange>("all");
  const [range, setRange] = useState<RangeOption>("12w");
  const [viewMode, setViewMode] = useState<ViewMode>("all-ecosystem");

  const latestWeek = weeks[weeks.length - 1] || ({} as CountmeWeek);
  const currentBluefin = Number(latestWeek.bluefin) || 0;

  // Filtered weeks for Legacy Bluefins chart
  const legacyFilteredWeeks = useMemo(() => {
    if (legacyRange === "12w") return weeks.slice(-12);
    if (legacyRange === "24w") return weeks.slice(-24);
    return weeks;
  }, [weeks, legacyRange]);

  // First recorded bluefin count for delta computation
  const initialBluefin = Number(weeks[0]?.bluefin) || currentBluefin;
  const bluefinDeltaPct =
    initialBluefin > 0
      ? (((currentBluefin - initialBluefin) / initialBluefin) * 100).toFixed(1)
      : "0.0";

  // Filtered weeks for comparative time-series charts
  const filteredWeeks = useMemo(() => {
    if (range === "4w") return weeks.slice(-4);
    if (range === "12w") return weeks.slice(-12);
    return weeks;
  }, [weeks, range]);

  // Ecosystem totals (excluding Fedora base)
  const peerImages = ["bazzite", "bluefin", "aurora", "bluefin-lts"] as const;
  const peerTotal = useMemo(() => {
    return peerImages.reduce(
      (sum, key) => sum + (Number(latestWeek[key]) || 0),
      0,
    );
  }, [latestWeek]);

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

  // 1. "Legacy Bluefins" EChart option
  const legacyChartOption = useMemo(() => {
    const labels = legacyFilteredWeeks.map((w) => w.week);
    const bluefinSeries = gapSafe(
      legacyFilteredWeeks.map((w) => w.bluefin ?? null),
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
          name: "Bluefin",
          type: "line",
          data: bluefinSeries,
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
                { offset: 1, color: "rgba(88, 166, 255, 0.02)" },
              ],
            },
          },
          connectNulls: false,
        },
      ],
    };
  }, [legacyFilteredWeeks]);

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

    seriesList.push(
      {
        name: "Bluefin",
        type: "line",
        data: gapSafe(filteredWeeks.map((w) => w.bluefin ?? null)),
        connectNulls: false,
        itemStyle: { color: seriesColor(0) },
        lineStyle: { type: seriesDash(0) },
      },
      {
        name: "Aurora",
        type: "line",
        data: gapSafe(filteredWeeks.map((w) => w.aurora ?? null)),
        connectNulls: false,
        itemStyle: { color: seriesColor(2) },
        lineStyle: { type: seriesDash(2) },
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

    return {
      xAxis: { type: "category", data: labels },
      yAxis: { type: "value" },
      series: seriesList,
    };
  }, [filteredWeeks, viewMode]);

  return (
    <div className={styles.container}>
      {/* ── 1. Hero: Legacy Bluefins ────────────────────────────────────────── */}
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div className={styles.heroTitleGroup}>
            <Heading as="h3" className={styles.heroTitle}>
              Legacy Bluefins
              <span className={styles.heroBadge}>ublue-os historical</span>
            </Heading>
            <p className={styles.heroSubtitle}>
              Canonical weekly active systems curve ported from ublue-os/countme
              methodology
            </p>
          </div>

          <div className={styles.heroKPI}>
            <div className={styles.heroNumber}>
              {currentBluefin.toLocaleString()}
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
            {(["12w", "24w", "all"] as LegacyRange[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.toggleBtn} ${legacyRange === r ? styles.toggleBtnActive : ""}`}
                onClick={() => setLegacyRange(r)}
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
          option={legacyChartOption}
          title="Legacy Bluefins"
          summary={`Legacy Bluefins historical weekly active systems: currently ${currentBluefin.toLocaleString()} systems as of week ${latestWeek.week}, up ${bluefinDeltaPct}% across ${weeks.length} tracked weeks.`}
          points={legacyFilteredWeeks.length}
          minPoints={2}
          height={320}
          tableCaption="Legacy Bluefins weekly active systems history"
        />

        <div className={styles.chartNote}>
          <strong>Lineage:</strong> This replaces the legacy matplotlib chart
          with native interactive rendering while preserving exact numerical
          parity with <code>ublue-os/countme:growth_bluefins.svg</code> and
          project README badges.
        </div>
      </div>

      {/* ── 2. Cloud-Native Ecosystem Overview ─────────────────────────────── */}
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
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {IMAGE_CONFIGS.map((cfg) => {
            const count = Number(latestWeek[cfg.id]) || 0;
            const pct = peerTotal > 0 ? (count / peerTotal) * 100 : 0;
            return (
              <div
                key={cfg.id}
                className={styles.segment}
                style={{
                  width: `${pct}%`,
                  backgroundColor: cfg.color,
                }}
                title={`${cfg.name}: ${count.toLocaleString()} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className={styles.shareLegend}>
          {IMAGE_CONFIGS.map((cfg) => {
            const count = Number(latestWeek[cfg.id]) || 0;
            const pct =
              peerTotal > 0 ? ((count / peerTotal) * 100).toFixed(1) : "0.0";
            return (
              <div key={cfg.id} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: cfg.color }}
                />
                <span className={styles.legendLabel}>{cfg.name}:</span>
                <span className={styles.legendValue}>
                  {count.toLocaleString()} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Image Breakdown Cards ────────────────────────────────────────── */}
      <div className={styles.kpiGrid}>
        {IMAGE_CONFIGS.map((cfg) => {
          const count = Number(latestWeek[cfg.id]) || 0;
          const pct =
            peerTotal > 0 ? ((count / peerTotal) * 100).toFixed(1) : "0.0";
          const history = weeks
            .slice(-12)
            .map((w) => (w[cfg.id] as number) ?? null);

          // Shared domain for workstations, separate domain for high-scale gaming
          const domain = cfg.id === "bazzite" ? undefined : workstationDomain;

          return (
            <div key={cfg.id} className={styles.kpiCard}>
              <div className={styles.cardHeader}>
                <span className={styles.imageTitle}>{cfg.name}</span>
                <span className={`${styles.badge} ${cfg.badgeClass}`}>
                  {cfg.badge}
                </span>
              </div>
              <div className={styles.countRow}>
                <span className={styles.countValue}>
                  {count.toLocaleString()}
                </span>
                <span className={styles.sharePct}>{pct}%</span>
              </div>
              <p className={styles.cardDesc}>{cfg.desc}</p>
              <div className={styles.cardSparkline}>
                <span className={styles.sparklineLabel}>12-week trend</span>
                <Sparkline
                  data={history}
                  variant="line"
                  domain={domain}
                  width={200}
                  height={32}
                  color={cfg.color}
                  areaColor="currentColor"
                  areaOpacity={0.12}
                  showEnd={true}
                  minPoints={2}
                  emptyLabel="accumulating data"
                  label={`${cfg.name} 12-week adoption trend: currently ${count.toLocaleString()}`}
                />
              </div>
            </div>
          );
        })}
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
              Workstations (Bluefin & Aurora)
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
          summary={`Comparative adoption trajectories across cloud-native images over ${filteredWeeks.length} weeks. Latest week (${latestWeek.week}): Bazzite ${Number(latestWeek.bazzite || 0).toLocaleString()} (Gaming), Bluefin ${Number(latestWeek.bluefin || 0).toLocaleString()} (Workstation), Aurora ${Number(latestWeek.aurora || 0).toLocaleString()} (KDE), Bluefin LTS ${Number(latestWeek["bluefin-lts"] || 0).toLocaleString()} (CentOS EPEL floor).`}
          points={filteredWeeks.length}
          minPoints={2}
          height={320}
          tableCaption="Weekly estimated active systems by image variant"
        />

        <div className={styles.chartNote}>
          <strong>Methodology:</strong> Derived from Fedora Countme weekly
          reporting using the canonical <code>ublue-countme-v1</code> counting
          rules (one base repository per device, excluding legacy sys_age=-1
          rows). Bluefin LTS is CentOS Stream based and counted via EPEL, which
          acts as a lower-bound floor.
        </div>
      </div>
    </div>
  );
}
