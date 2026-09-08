import React, { useState, useMemo } from "react";
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
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div className={styles.heroTitleGroup}>
            <h3 className={styles.heroTitle}>
              Update Churn Rate & Layer Reuse Efficiency
            </h3>
            <p className={styles.heroSubtitle}>
              Release-over-release download size deltas, zstd-chunked
              compression, and OCI layer cache reuse across Project Bluefin
              stable images.
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className={styles.metricTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={metric === "churn"}
            className={`${styles.metricTab} ${metric === "churn" ? styles.metricTabActive : ""}`}
            onClick={() => setMetric("churn")}
          >
            Update Download Churn (MB)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === "efficiency"}
            className={`${styles.metricTab} ${metric === "efficiency" ? styles.metricTabActive : ""}`}
            onClick={() => setMetric("efficiency")}
          >
            Layer Reuse Efficiency (%)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === "layers"}
            className={`${styles.metricTab} ${metric === "layers" ? styles.metricTabActive : ""}`}
            onClick={() => setMetric("layers")}
          >
            Chunk & Layer Counts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === "zstd"}
            className={`${styles.metricTab} ${metric === "zstd" ? styles.metricTabActive : ""}`}
            onClick={() => setMetric("zstd")}
          >
            Zstd-Chunked Stats
          </button>
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

        <div className={styles.metaNotes}>
          <span className={styles.metaNoteDot}>●</span>
          <span>
            Chunkah rechunks system updates into package-interval OCI layers.
            Shared layers require 0 download bytes during bootc updates.
          </span>
        </div>
      </div>
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
      <div className={styles.imageCard}>
        <div className={styles.imageHeader}>
          <div className={styles.imageTitleArea}>
            <span className={styles.imageEdition}>{edition}</span>
            <h4 className={styles.imageName}>{name}</h4>
          </div>
          <span className={`${styles.badge} ${styles.badgeUnavailable}`}>
            ○ Inactive
          </span>
        </div>
        <Unavailable
          what={`${name} Churn Data`}
          reason={stateReason || "No stable release data recorded"}
        />
      </div>
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
    <div className={styles.imageCard}>
      <div className={styles.imageHeader}>
        <div className={styles.imageTitleArea}>
          <span className={styles.imageEdition}>{edition}</span>
          <h4 className={styles.imageName}>{name}</h4>
        </div>
        <span className={`${styles.badge} ${styles.badgeActive}`}>
          ● {latest.compressionFormat}
        </span>
      </div>

      {/* Raw Values KPI Row alongside graphical representation */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiItem}>
          <span className={styles.kpiLabel}>Update Churn</span>
          <span className={styles.kpiValue}>
            {latest.downloadChurnMB}
            <span className={styles.kpiUnit}>MB</span>
          </span>
        </div>
        <div className={styles.kpiItem}>
          <span className={styles.kpiLabel}>Reuse Rate</span>
          <span className={styles.kpiValue}>
            {latest.reuseEfficiencyPct}
            <span className={styles.kpiUnit}>%</span>
          </span>
        </div>
        <div className={styles.kpiItem}>
          <span className={styles.kpiLabel}>Layers</span>
          <span className={styles.kpiValue}>
            {latest.totalLayers}
            <span className={styles.kpiUnit}>chunks</span>
          </span>
        </div>
        <div className={styles.kpiItem}>
          <span className={styles.kpiLabel}>Image Size</span>
          <span className={styles.kpiValue}>
            {latest.totalMB}
            <span className={styles.kpiUnit}>MB</span>
          </span>
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
    </div>
  );
}
