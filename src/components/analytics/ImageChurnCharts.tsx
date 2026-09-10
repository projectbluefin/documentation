import React, { useState, useMemo } from "react";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import { gapSafe, FX_COLORS } from "../factory/chartTheme";
import styles from "./ImageChurnCharts.module.css";
import churnDataRaw from "@site/static/data/update-churn.json";

export interface ReleaseChurn {
  tag: string;
  date: string;
  previousTag: string | null;
  downloadChurnMB: number;
  sharedMB: number;
  totalMB: number;
  reuseEfficiencyPct: number;
  totalLayers: number;
  sharedLayers: number;
  newLayers: number;
  zstdLayers: number;
  compressionFormat: string;
  isBaseline: boolean;
}

export interface ImageChurnEntry {
  id: string;
  name: string;
  edition: string;
  package: string;
  stream: string;
  unavailable?: boolean;
  stateReason?: string;
  releases: ReleaseChurn[];
}

export interface UpdateChurnDataset {
  generatedAt: string;
  source: string;
  method: string;
  unit: string;
  unavailable?: boolean;
  stateReason?: string;
  images: Record<string, ImageChurnEntry>;
}

const typedChurnData = churnDataRaw as unknown as UpdateChurnDataset;

type MetricMode = "churn" | "efficiency" | "layers" | "zstd";

const IMAGE_ORDER = ["bluefin", "bluefin-lts", "dakota", "utah"];

export default function ImageChurnCharts(): React.JSX.Element {
  const [metric, setMetric] = useState<MetricMode>("churn");

  const images = useMemo(() => {
    const list: ImageChurnEntry[] = [];
    const record = typedChurnData?.images || {};
    for (const id of IMAGE_ORDER) {
      if (record[id]) {
        list.push(record[id]);
      }
    }
    return list;
  }, []);

  // Compute shared domains across all images for small-multiple comparability
  const sharedDomains = useMemo(() => {
    let maxChurn = 0;
    let maxLayers = 0;

    for (const img of images) {
      if (img.unavailable || !img.releases) continue;
      for (const r of img.releases) {
        if (r.downloadChurnMB > maxChurn) maxChurn = r.downloadChurnMB;
        if (r.totalLayers > maxLayers) maxLayers = r.totalLayers;
      }
    }

    return {
      maxChurn: Math.ceil(Math.max(maxChurn, 1000) / 500) * 500,
      maxLayers: Math.ceil(Math.max(maxLayers, 50) / 50) * 50,
    };
  }, [images]);

  // Aggregate stats across active images for the top KPI summary strip
  const topStats = useMemo(() => {
    let totalDownloadMB = 0;
    let totalSharedMB = 0;
    let totalChunks = 0;
    let totalZstdChunks = 0;
    let activeImagesCount = 0;
    let totalImagesCount = images.length;

    for (const img of images) {
      if (img.unavailable || !img.releases || img.releases.length === 0)
        continue;
      activeImagesCount += 1;
      const latest = img.releases[img.releases.length - 1];
      totalDownloadMB += latest.downloadChurnMB;
      totalSharedMB += latest.sharedMB;
      totalChunks += latest.totalLayers;
      totalZstdChunks += latest.zstdLayers;
    }

    const overallTotalMB = totalDownloadMB + totalSharedMB;
    const avgReusePct =
      overallTotalMB > 0
        ? ((totalSharedMB / overallTotalMB) * 100).toFixed(1)
        : "0.0";
    const zstdPct =
      totalChunks > 0
        ? ((totalZstdChunks / totalChunks) * 100).toFixed(0)
        : "0";

    return {
      totalDownloadMB,
      avgReusePct,
      totalChunks,
      zstdPct,
      activeImagesCount,
      totalImagesCount,
    };
  }, [images]);

  if (typedChurnData?.unavailable) {
    return (
      <Unavailable
        what="Update Churn Analytics"
        reason={typedChurnData.stateReason || "Data pipeline unavailable"}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* ── 1. Top KPI Summary Strip ────────────────────────────────────── */}
      <section className={styles.kpiGrid} aria-label="Key update churn metrics">
        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Latest Fleet Churn</span>
          <div className={styles.kpiValue}>
            {topStats.totalDownloadMB > 0
              ? `${(topStats.totalDownloadMB / 1024).toFixed(2)}`
              : "0"}
            <span className={styles.kpiUnit}>GB</span>
          </div>
          <span className={styles.kpiMeta}>
            Across all active stable workstation releases
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>OCI Layer Reuse</span>
          <div className={styles.kpiValue}>
            {topStats.avgReusePct}
            <span className={styles.kpiUnit}>%</span>
          </div>
          <span className={styles.kpiMeta}>
            Shared layers cached on client bootc systems
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Zstd:Chunked Adoption</span>
          <div className={styles.kpiValue}>
            {topStats.zstdPct}
            <span className={styles.kpiUnit}>%</span>
          </div>
          <span className={styles.kpiMeta}>
            {topStats.totalChunks} total package interval chunks
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Tracked Images</span>
          <div className={styles.kpiValue}>
            {topStats.activeImagesCount} of {topStats.totalImagesCount} Active
          </div>
          <span className={styles.kpiMeta}>
            Bluefin, LTS, Dakota tracked · Utah onboarding
          </span>
        </article>
      </section>

      {/* ── 2. Dominant Churn & Reuse Panel ───────────────────────────────── */}
      <section
        className={styles.panelCard}
        aria-label="Update churn rate and layer reuse efficiency"
      >
        <div className={styles.panelHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.eyebrow}>
              OCI Layer Caching & Compression
            </span>
            <Heading as="h3" className={styles.panelTitle}>
              Update Churn Rate & Layer Reuse Efficiency
            </Heading>
            <p className={styles.panelSubtitle}>
              Release-over-release download size deltas, zstd-chunked
              compression, and OCI layer cache reuse across Project Bluefin
              images.
            </p>
          </div>

          <div className={styles.controlsRow}>
            <div
              className={styles.segmentedGroup}
              role="tablist"
              aria-label="Update churn metrics"
            >
              <button
                type="button"
                role="tab"
                aria-selected={metric === "churn"}
                className={`${styles.toggleBtn} ${
                  metric === "churn" ? styles.toggleBtnActive : ""
                }`}
                onClick={() => setMetric("churn")}
              >
                Download Churn (MB)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={metric === "efficiency"}
                className={`${styles.toggleBtn} ${
                  metric === "efficiency" ? styles.toggleBtnActive : ""
                }`}
                onClick={() => setMetric("efficiency")}
              >
                Reuse Efficiency (%)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={metric === "layers"}
                className={`${styles.toggleBtn} ${
                  metric === "layers" ? styles.toggleBtnActive : ""
                }`}
                onClick={() => setMetric("layers")}
              >
                Chunk & Layer Counts
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={metric === "zstd"}
                className={`${styles.toggleBtn} ${
                  metric === "zstd" ? styles.toggleBtnActive : ""
                }`}
                onClick={() => setMetric("zstd")}
              >
                Zstd-Chunked Stats
              </button>
            </div>
          </div>
        </div>

        {/* Small Multiples Grid (one card per image) */}
        <div className={styles.grid}>
          {images.map((img) => (
            <ImageChurnPanel
              key={img.id}
              image={img}
              metric={metric}
              sharedDomains={sharedDomains}
            />
          ))}
        </div>

        <div className={styles.panelFooter}>
          <span className={styles.footerDot}>●</span>
          <span>
            Chunkah rechunks system updates into package-interval OCI layers.
            Shared layers require 0 download bytes during bootc updates.
          </span>
        </div>
      </section>
    </div>
  );
}

interface ImageChurnPanelProps {
  image: ImageChurnEntry;
  metric: MetricMode;
  sharedDomains: { maxChurn: number; maxLayers: number };
}

function ImageChurnPanel({
  image,
  metric,
  sharedDomains,
}: ImageChurnPanelProps): React.JSX.Element {
  const { name, edition, unavailable, stateReason, releases = [] } = image;

  if (unavailable || releases.length === 0) {
    return (
      <article className={styles.imageCard}>
        <div className={styles.imageHeader}>
          <div className={styles.imageTitleArea}>
            <span className={styles.cardEyebrow}>{edition}</span>
            <Heading as="h4" className={styles.imageName}>
              {name}
            </Heading>
          </div>
          <span className={`${styles.badge} ${styles.badgeUnavailable}`}>
            ○ Inactive
          </span>
        </div>
        <Unavailable
          what={`${name} Churn Data`}
          reason={
            stateReason ||
            "No stable release data recorded — image is under active development"
          }
        />
      </article>
    );
  }

  const latest = releases[releases.length - 1];
  const dates = releases.map((r) => r.date || r.tag);

  let chartOption: Record<string, unknown> = {};
  let summary = "";
  let chartTitle = "";

  if (metric === "churn") {
    chartTitle = `${name} Download Churn`;
    summary = `Latest update required ${latest.downloadChurnMB} MB download (${latest.reuseEfficiencyPct}% reuse).`;
    chartOption = {
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: FX_COLORS.muted, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "MB",
        min: 0,
        max: sharedDomains.maxChurn, // Shared domain across small multiples
        axisLabel: { color: FX_COLORS.muted },
        splitLine: { lineStyle: { color: FX_COLORS.grid } },
      },
      series: [
        {
          name: "Download Churn (MB)",
          type: "bar",
          data: gapSafe(releases.map((r) => r.downloadChurnMB)),
          itemStyle: { color: "#39d2c0", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "Shared Layer Cache (MB)",
          type: "bar",
          data: gapSafe(releases.map((r) => r.sharedMB)),
          itemStyle: { color: "#58a6ff", borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  } else if (metric === "efficiency") {
    chartTitle = `${name} Reuse Efficiency`;
    summary = `Latest layer reuse rate is ${latest.reuseEfficiencyPct}%.`;
    chartOption = {
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: FX_COLORS.muted, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "%",
        min: 0,
        max: 100, // Shared 0-100% domain
        axisLabel: { color: FX_COLORS.muted },
        splitLine: { lineStyle: { color: FX_COLORS.grid } },
      },
      series: [
        {
          name: "Reuse Efficiency (%)",
          type: "line",
          data: gapSafe(releases.map((r) => r.reuseEfficiencyPct)),
          itemStyle: { color: "#58a6ff" },
          lineStyle: { color: "#58a6ff", width: 3 },
          symbol: "circle",
          symbolSize: 6,
        },
      ],
    };
  } else if (metric === "layers") {
    chartTitle = `${name} Chunk & Layer Breakdown`;
    summary = `Total: ${latest.totalLayers} layers (${latest.sharedLayers} shared, ${latest.newLayers} new).`;
    chartOption = {
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: FX_COLORS.muted, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "Layers",
        min: 0,
        max: sharedDomains.maxLayers, // Shared domain
        axisLabel: { color: FX_COLORS.muted },
        splitLine: { lineStyle: { color: FX_COLORS.grid } },
      },
      series: [
        {
          name: "Shared Layers",
          type: "bar",
          stack: "layers",
          data: gapSafe(releases.map((r) => r.sharedLayers)),
          itemStyle: { color: "#58a6ff" },
        },
        {
          name: "New Churn Layers",
          type: "bar",
          stack: "layers",
          data: gapSafe(releases.map((r) => r.newLayers)),
          itemStyle: { color: "#39d2c0" },
        },
      ],
    };
  } else {
    chartTitle = `${name} Zstd-Chunked Adoption`;
    summary = `${latest.zstdLayers} of ${latest.totalLayers} layers use zstd-chunked compression format.`;
    chartOption = {
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { color: FX_COLORS.muted, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "Layers",
        min: 0,
        max: sharedDomains.maxLayers,
        axisLabel: { color: FX_COLORS.muted },
        splitLine: { lineStyle: { color: FX_COLORS.grid } },
      },
      series: [
        {
          name: "Zstd-Chunked Layers",
          type: "bar",
          data: gapSafe(releases.map((r) => r.zstdLayers)),
          itemStyle: { color: "#bc8cff", borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }

  return (
    <article className={styles.imageCard}>
      <div className={styles.imageHeader}>
        <div className={styles.imageTitleArea}>
          <span className={styles.cardEyebrow}>{edition}</span>
          <Heading as="h4" className={styles.imageName}>
            {name}
          </Heading>
        </div>
        <span className={`${styles.badge} ${styles.badgeActive}`}>
          ● {latest.compressionFormat}
        </span>
      </div>

      {/* Raw Values KPI Row alongside graphical representation */}
      <div className={styles.cardKpiGrid}>
        <div className={styles.cardKpiItem}>
          <span className={styles.cardKpiLabel}>Churn</span>
          <div className={styles.cardKpiValue}>
            {latest.downloadChurnMB}
            <span className={styles.cardKpiUnit}>MB</span>
          </div>
        </div>
        <div className={styles.cardKpiItem}>
          <span className={styles.cardKpiLabel}>Reuse</span>
          <div className={styles.cardKpiValue}>
            {latest.reuseEfficiencyPct}
            <span className={styles.cardKpiUnit}>%</span>
          </div>
        </div>
        <div className={styles.cardKpiItem}>
          <span className={styles.cardKpiLabel}>Layers</span>
          <div className={styles.cardKpiValue}>
            {latest.totalLayers}
            <span className={styles.cardKpiUnit}>chunks</span>
          </div>
        </div>
        <div className={styles.cardKpiItem}>
          <span className={styles.cardKpiLabel}>Total</span>
          <div className={styles.cardKpiValue}>
            {latest.totalMB}
            <span className={styles.cardKpiUnit}>MB</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas with Shared Domain */}
      <div className={styles.chartContainer}>
        <EChart
          option={chartOption}
          height={200}
          title={chartTitle}
          summary={summary}
          points={releases.length}
          minPoints={1}
          tableCaption={`Update Churn Statistics for ${name}`}
        />
      </div>
    </article>
  );
}
