import React, { useMemo } from "react";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import Sparkline from "../Sparkline";
import {
  gapSafe,
  readableInk,
  seriesDash,
  withAlpha,
  type SeverityLevel,
} from "../factory/chartTheme";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import "../factory/tokens.css";
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

const IMAGE_ORDER = ["bluefin", "bluefin-lts", "dakota", "utah"];

/**
 * A rolling percentile band needs this many consecutive deltas before it
 * describes a distribution rather than extrapolating from a handful of points.
 */
const BAND_WINDOW = 5;

/** Ridgeline geometry, in pixels. One lane per image, all on one domain. */
const LANE_TOP = 30;
const LANE_HEIGHT = 78;
const LANE_GAP = 36;
const LANE_LEFT = 64;

/** Heatmap geometry, in pixels. */
const HEAT_ROW = 46;
const HEAT_CHROME = 82;

const INT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const LEVEL_ORDINAL: Record<SeverityLevel, number> = {
  unknown: 0,
  ok: 1,
  watch: 2,
  alert: 3,
};

const LEGEND_ORDER: SeverityLevel[] = ["ok", "watch", "alert", "unknown"];

/**
 * A baseline release is the first tag this pipeline tracked for an image, so
 * `previousTag` is null and there is nothing to diff against. `fetch-update-churn`
 * writes its `downloadChurnMB` as the whole image and its `sharedMB` and
 * `reuseEfficiencyPct` as 0 — which is "not measured", not "measured as zero".
 * Every delta-derived series withholds those points and marks them instead, so a
 * baseline never reads as a regression against a release it was never compared to.
 */
export function isDelta(release: ReleaseChurn): boolean {
  return !release.isBaseline && release.previousTag !== null;
}

/**
 * Layer reuse as one hue at four intensities plus a glyph — never hue alone.
 * An unmeasurable release is `unknown`: a gap, not a floor.
 */
export function reuseLevel(pct: number | null): SeverityLevel {
  if (pct === null) return "unknown";
  if (pct >= 60) return "ok";
  if (pct >= 25) return "watch";
  return "alert";
}

/**
 * The compression format as a state lane. `zstd:chunked` is what the images are
 * moving to; `gzip` is the lane still to migrate. An absent format is unknown.
 */
export function compressionLevel(format: string | null): SeverityLevel {
  if (!format) return "unknown";
  return format.startsWith("zstd") ? "ok" : "watch";
}

/**
 * Rolling percentile over the trailing `window` real values.
 *
 * Returns null until the window is full, so the band starts where it is
 * actually supported instead of being extrapolated from two points.
 */
export function rollingPercentile(
  values: Array<number | null>,
  window: number,
  p: number,
): Array<number | null> {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    if (slice.length < window) return null;
    const sorted = [...slice].sort((a, b) => a - b);
    const rank = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(p * sorted.length) - 1),
    );
    return sorted[rank];
  });
}

/** One image's releases, aligned onto the shared release-date domain. */
interface Lane {
  image: ImageChurnEntry;
  releases: ReleaseChurn[];
  byDate: Map<string, ReleaseChurn>;
  deltas: ReleaseChurn[];
  latest: ReleaseChurn | null;
  latestDelta: ReleaseChurn | null;
  /** downloadChurnMB, delta releases only. */
  churn: Array<number | null>;
  /** totalMB, baseline releases only. */
  baseline: Array<number | null>;
  /** sharedMB and downloadChurnMB, delta releases only. */
  cached: Array<number | null>;
  downloaded: Array<number | null>;
  p50: Array<number | null>;
  spread: Array<number | null>;
  banded: boolean;
}

/** A heatmap cell: severity drives the colour, `text` carries the number. */
interface HeatDatum {
  value: [number, number, number];
  text: string;
  tip: string;
  label: { color: string };
}

export default function ImageChurnCharts(): React.JSX.Element {
  const [themeRef, fxTheme] = useFactoryTheme();
  const cat = fxTheme.categorical;
  const sev = fxTheme.severity;

  const images = useMemo(() => {
    const list: ImageChurnEntry[] = [];
    const record = typedChurnData?.images || {};
    for (const id of IMAGE_ORDER) {
      if (record[id]) list.push(record[id]);
    }
    return list;
  }, []);

  /**
   * One x domain for every small multiple: the union of every release date any
   * tracked image published on. An image with no release on a given date gets a
   * gap there rather than a lane of its own scale.
   */
  const dateAxis = useMemo(() => {
    const seen = new Set<string>();
    for (const img of images) {
      for (const r of img.releases || []) {
        if (r.date) seen.add(r.date);
      }
    }
    return [...seen].sort();
  }, [images]);

  const lanes: Lane[] = useMemo(
    () =>
      images.map((image) => {
        const releases = image.releases || [];
        const byDate = new Map(releases.map((r) => [r.date, r]));
        const deltas = releases.filter(isDelta);
        const deltaIndex = new Map(deltas.map((r, i) => [r.date, i]));
        const compact = gapSafe(deltas.map((r) => r.downloadChurnMB));
        const compactP50 = rollingPercentile(compact, BAND_WINDOW, 0.5);
        const compactP95 = rollingPercentile(compact, BAND_WINDOW, 0.95);
        // Percentiles are computed over the lane's own consecutive deltas, then
        // scattered back onto the shared date domain: a window measured across
        // the gaps where another image released would not describe this lane.
        const onAxis = dateAxis.map((d) => deltaIndex.get(d) ?? -1);
        const p50 = onAxis.map((i) => (i < 0 ? null : compactP50[i]));
        const p95 = onAxis.map((i) => (i < 0 ? null : compactP95[i]));
        const pickDelta = (read: (r: ReleaseChurn) => number) =>
          gapSafe(
            dateAxis.map((d) => {
              const r = byDate.get(d);
              return r && isDelta(r) ? read(r) : null;
            }),
          );

        return {
          image,
          releases,
          byDate,
          deltas,
          latest: releases.length ? releases[releases.length - 1] : null,
          latestDelta: deltas.length ? deltas[deltas.length - 1] : null,
          churn: pickDelta((r) => r.downloadChurnMB),
          baseline: gapSafe(
            dateAxis.map((d) => {
              const r = byDate.get(d);
              return r && !isDelta(r) ? r.totalMB : null;
            }),
          ),
          cached: pickDelta((r) => r.sharedMB),
          downloaded: pickDelta((r) => r.downloadChurnMB),
          p50,
          spread: p50.map((median, i) => {
            const upper = p95[i];
            return median === null || upper === null ? null : upper - median;
          }),
          banded: deltas.length >= BAND_WINDOW,
        };
      }),
    [images, dateAxis],
  );

  /** Shared value domains, so a small multiple never autoscales into a lie. */
  const domains = useMemo(() => {
    let maxChurn = 0;
    let maxBytes = 0;
    for (const lane of lanes) {
      for (const r of lane.releases) {
        if (r.downloadChurnMB > maxChurn) maxChurn = r.downloadChurnMB;
        if (r.totalMB > maxChurn) maxChurn = r.totalMB;
        if (r.totalMB > maxBytes) maxBytes = r.totalMB;
      }
    }
    const round = (v: number) => Math.ceil(Math.max(v, 500) / 500) * 500;
    return { maxChurn: round(maxChurn), maxBytes: round(maxBytes) };
  }, [lanes]);

  /** Lanes that can be drawn, and the ones that cannot, with their reason. */
  const drawnLanes = useMemo(
    () => lanes.filter((l) => l.releases.length > 0 && !l.image.unavailable),
    [lanes],
  );
  const emptyLanes = useMemo(
    () => lanes.filter((l) => l.releases.length === 0 || l.image.unavailable),
    [lanes],
  );

  const topStats = useMemo(() => {
    let totalDownloadMB = 0;
    let totalSharedMB = 0;
    let totalChunks = 0;
    let totalZstdChunks = 0;
    let activeImagesCount = 0;

    for (const lane of drawnLanes) {
      const latest = lane.latest;
      if (!latest) continue;
      activeImagesCount += 1;
      totalDownloadMB += latest.downloadChurnMB;
      totalSharedMB += latest.sharedMB;
      totalChunks += latest.totalLayers;
      totalZstdChunks += latest.zstdLayers;
    }

    const overallTotalMB = totalDownloadMB + totalSharedMB;
    return {
      totalDownloadMB,
      avgReusePct:
        overallTotalMB > 0
          ? ((totalSharedMB / overallTotalMB) * 100).toFixed(1)
          : "0.0",
      totalChunks,
      zstdPct:
        totalChunks > 0
          ? ((totalZstdChunks / totalChunks) * 100).toFixed(0)
          : "0",
      activeImagesCount,
      totalImagesCount: lanes.length,
    };
  }, [drawnLanes, lanes]);

  // ── 1. Download churn per release: ridgeline over one shared domain ──────
  const churnPoints = useMemo(
    () =>
      drawnLanes.reduce(
        (n, l) => n + l.churn.filter((v) => v !== null).length,
        0,
      ),
    [drawnLanes],
  );

  const churnOption = useMemo(() => {
    const grids: Array<Record<string, unknown>> = [];
    const titles: Array<Record<string, unknown>> = [];
    const xAxis: Array<Record<string, unknown>> = [];
    const yAxis: Array<Record<string, unknown>> = [];
    const series: Array<Record<string, unknown>> = [];

    drawnLanes.forEach((lane, i) => {
      const top = LANE_TOP + i * (LANE_HEIGHT + LANE_GAP);
      const color = cat[i % cat.length];
      const last = i === drawnLanes.length - 1;
      const value = lane.latestDelta?.downloadChurnMB ?? null;

      grids.push({
        left: LANE_LEFT,
        right: 24,
        top,
        height: LANE_HEIGHT,
        containLabel: false,
      });
      titles.push({
        text:
          `${lane.image.name} — ` +
          (value === null
            ? "no measured delta yet"
            : `${INT.format(value)} MB latest delta`),
        left: 0,
        top: top - 22,
        textStyle: {
          color: fxTheme.palette.text,
          fontSize: 12,
          fontWeight: 600,
        },
      });
      xAxis.push({
        gridIndex: i,
        type: "category",
        data: dateAxis,
        boundaryGap: false,
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: last,
          fontSize: 10,
          formatter: (v: string) => v.slice(5),
        },
      });
      yAxis.push({
        gridIndex: i,
        type: "value",
        min: 0,
        max: domains.maxChurn,
        splitNumber: 2,
        axisLabel: { fontSize: 10, formatter: (v: number) => INT.format(v) },
        axisLine: { show: false },
        axisTick: { show: false },
      });

      if (lane.banded) {
        series.push(
          {
            name: `${lane.image.name} rolling median (${BAND_WINDOW})`,
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            stack: `band-${i}`,
            data: lane.p50,
            showSymbol: false,
            smooth: true,
            connectNulls: false,
            lineStyle: { width: 2, type: [6, 3], color: withAlpha(color, 0.8) },
            itemStyle: { color: withAlpha(color, 0.8) },
          },
          {
            name: `${lane.image.name} p50–p95 spread`,
            type: "line",
            xAxisIndex: i,
            yAxisIndex: i,
            stack: `band-${i}`,
            data: lane.spread,
            showSymbol: false,
            smooth: true,
            connectNulls: false,
            lineStyle: { opacity: 0 },
            itemStyle: { color: withAlpha(color, 0.3) },
            areaStyle: { color, opacity: 0.18 },
          },
        );
      }

      series.push(
        {
          name: `${lane.image.name} download delta (MB)`,
          type: "line",
          xAxisIndex: i,
          yAxisIndex: i,
          data: lane.churn,
          connectNulls: false,
          showSymbol: true,
          symbolSize: 7,
          z: 5,
          lineStyle: { width: 2.5, color, type: seriesDash(i) },
          itemStyle: { color },
          areaStyle: { color, opacity: 0.1 },
        },
        {
          name: `${lane.image.name} baseline pull (MB)`,
          type: "scatter",
          xAxisIndex: i,
          yAxisIndex: i,
          data: lane.baseline,
          symbol: "diamond",
          symbolSize: 12,
          z: 6,
          itemStyle: {
            color: withAlpha(color, 0.25),
            borderColor: color,
            borderWidth: 1.5,
          },
        },
      );
    });

    return {
      legend: { show: false },
      title: titles,
      grid: grids,
      xAxis,
      yAxis,
      series,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", link: [{ xAxisIndex: "all" }] },
      },
    };
  }, [drawnLanes, dateAxis, domains.maxChurn, cat, fxTheme.palette.text]);

  // ── 2. Layer reuse: image × release heatmap ──────────────────────────────
  const reuseCells = useMemo(() => {
    const out: HeatDatum[] = [];
    lanes.forEach((lane, y) => {
      dateAxis.forEach((date, x) => {
        const r = lane.byDate.get(date);
        const level: SeverityLevel =
          !r || !isDelta(r) ? "unknown" : reuseLevel(r.reuseEfficiencyPct);
        const tone = sev[level];
        let text = "—";
        let tip = `${lane.image.name} · ${date}\nNo release published on this date`;

        if (r && isDelta(r)) {
          text = `${tone.glyph} ${Math.round(r.reuseEfficiencyPct)}%`;
          tip =
            `${lane.image.name} · ${r.tag}\n` +
            `${r.reuseEfficiencyPct}% of bytes reused — ${tone.word}\n` +
            `${INT.format(r.sharedMB)} MB cached of ${INT.format(r.totalMB)} MB total\n` +
            `${r.sharedLayers} of ${r.totalLayers} layers shared with ${r.previousTag}`;
        } else if (r) {
          text = `${tone.glyph} base`;
          tip =
            `${lane.image.name} · ${r.tag}\n` +
            `First tracked tag — no previous tag to diff against, so reuse is not measured\n` +
            `Whole image is ${INT.format(r.totalMB)} MB across ${r.totalLayers} layers`;
        } else if (lane.image.unavailable) {
          tip = `${lane.image.name} · ${date}\n${lane.image.stateReason || "No release data recorded"}`;
        }

        out.push({
          value: [x, y, LEVEL_ORDINAL[level]],
          text,
          tip,
          label: { color: readableInk(tone.color) },
        });
      });
    });
    return out;
  }, [lanes, dateAxis, sev]);

  const reuseMeasured = useMemo(
    () => lanes.reduce((n, l) => n + l.deltas.length, 0),
    [lanes],
  );

  // ── 3. Cached vs downloaded bytes: stacked area over one shared domain ───
  const bytesPoints = useMemo(
    () =>
      drawnLanes.reduce(
        (n, l) => n + l.downloaded.filter((v) => v !== null).length,
        0,
      ),
    [drawnLanes],
  );

  const bytesOption = useMemo(() => {
    const grids: Array<Record<string, unknown>> = [];
    const titles: Array<Record<string, unknown>> = [];
    const xAxis: Array<Record<string, unknown>> = [];
    const yAxis: Array<Record<string, unknown>> = [];
    const series: Array<Record<string, unknown>> = [];
    // Cached and downloaded are the categories here, not the images, so each
    // keeps one colour down the whole stack of lanes. Colouring them per lane
    // would make the same band mean a different thing three rows apart.
    const cachedColor = cat[0];
    const newColor = cat[3];

    drawnLanes.forEach((lane, i) => {
      const top = LANE_TOP + i * (LANE_HEIGHT + LANE_GAP);
      const last = i === drawnLanes.length - 1;
      const latest = lane.latestDelta;

      grids.push({
        left: LANE_LEFT,
        right: 24,
        top,
        height: LANE_HEIGHT,
        containLabel: false,
      });
      titles.push({
        text:
          `${lane.image.name} — ` +
          (latest === null
            ? "no measured split yet"
            : `${INT.format(latest.sharedMB)} MB cached / ${INT.format(latest.downloadChurnMB)} MB downloaded`),
        left: 0,
        top: top - 22,
        textStyle: {
          color: fxTheme.palette.text,
          fontSize: 12,
          fontWeight: 600,
        },
      });
      xAxis.push({
        gridIndex: i,
        type: "category",
        data: dateAxis,
        boundaryGap: false,
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: last,
          fontSize: 10,
          formatter: (v: string) => v.slice(5),
        },
      });
      yAxis.push({
        gridIndex: i,
        type: "value",
        min: 0,
        max: domains.maxBytes,
        splitNumber: 2,
        axisLabel: { fontSize: 10, formatter: (v: number) => INT.format(v) },
        axisLine: { show: false },
        axisTick: { show: false },
      });

      series.push(
        {
          name: `${lane.image.name} cached (MB)`,
          type: "line",
          xAxisIndex: i,
          yAxisIndex: i,
          stack: `bytes-${i}`,
          data: lane.cached,
          connectNulls: false,
          showSymbol: true,
          symbolSize: 5,
          smooth: false,
          lineStyle: { width: 1.5, color: cachedColor },
          itemStyle: { color: cachedColor },
          areaStyle: { color: cachedColor, opacity: 0.55 },
        },
        {
          name: `${lane.image.name} downloaded (MB)`,
          type: "line",
          xAxisIndex: i,
          yAxisIndex: i,
          stack: `bytes-${i}`,
          data: lane.downloaded,
          connectNulls: false,
          showSymbol: true,
          symbolSize: 5,
          smooth: false,
          lineStyle: { width: 1.5, color: newColor, type: seriesDash(1) },
          itemStyle: { color: newColor },
          areaStyle: { color: newColor, opacity: 0.28 },
        },
      );
    });

    return {
      legend: { show: false },
      title: titles,
      grid: grids,
      xAxis,
      yAxis,
      series,
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", link: [{ xAxisIndex: "all" }] },
      },
    };
  }, [drawnLanes, dateAxis, domains.maxBytes, cat, fxTheme.palette.text]);

  // ── 4. Compression format: a state lane in the heatmap vocabulary ────────
  const compressionCells = useMemo(() => {
    const out: HeatDatum[] = [];
    lanes.forEach((lane, y) => {
      dateAxis.forEach((date, x) => {
        const r = lane.byDate.get(date);
        const level = compressionLevel(r?.compressionFormat ?? null);
        const tone = sev[level];
        let text = "—";
        let tip = `${lane.image.name} · ${date}\nNo release published on this date`;

        if (r) {
          text = `${tone.glyph} ${r.zstdLayers}/${r.totalLayers}`;
          tip =
            `${lane.image.name} · ${r.tag}\n` +
            `${r.compressionFormat} — ${tone.word}\n` +
            `${r.zstdLayers} of ${r.totalLayers} layers in zstd:chunked form` +
            (isDelta(r) ? "" : "\nFirst tracked tag for this image");
        } else if (lane.image.unavailable) {
          tip = `${lane.image.name} · ${date}\n${lane.image.stateReason || "No release data recorded"}`;
        }

        out.push({
          value: [x, y, LEVEL_ORDINAL[level]],
          text,
          tip,
          label: { color: readableInk(tone.color) },
        });
      });
    });
    return out;
  }, [lanes, dateAxis, sev]);

  const compressionMeasured = useMemo(
    () => lanes.reduce((n, l) => n + l.releases.length, 0),
    [lanes],
  );

  /**
   * Both heatmaps share one frame — same rows, same columns, same severity
   * pieces — so the reuse grid and the format grid read as one instrument
   * rather than two charts that happen to sit near each other.
   */
  const heatOptions = useMemo(() => {
    const frame = {
      legend: { show: false },
      grid: { left: 190, right: 28, top: 12, bottom: 46, containLabel: false },
      tooltip: {
        trigger: "item",
        formatter: (p: { data: { tip: string } }) => p.data.tip,
      },
      xAxis: {
        type: "category",
        position: "bottom",
        data: dateAxis,
        axisLabel: {
          fontSize: 11,
          interval: 0,
          rotate: dateAxis.length > 6 ? 30 : 0,
        },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: lanes.map((l) => l.image.name),
        axisLabel: { fontSize: 12 },
        splitArea: { show: false },
      },
      visualMap: {
        show: false,
        type: "piecewise",
        pieces: LEGEND_ORDER.map((level) => ({
          value: LEVEL_ORDINAL[level],
          color: sev[level].color,
        })),
      },
    };
    const series = (name: string, data: HeatDatum[]) => ({
      name,
      type: "heatmap",
      data,
      label: {
        show: true,
        fontSize: 11,
        fontWeight: 600,
        formatter: (p: { data: { text: string } }) => p.data.text,
      },
      itemStyle: {
        borderColor: withAlpha(fxTheme.palette.border, 0.9),
        borderWidth: 2,
        borderRadius: 6,
      },
      emphasis: { itemStyle: { borderColor: cat[0], borderWidth: 3 } },
    });
    return {
      reuse: { ...frame, series: [series("Layer reuse", reuseCells)] },
      compression: {
        ...frame,
        series: [series("Compression format", compressionCells)],
      },
    };
  }, [
    dateAxis,
    lanes,
    sev,
    cat,
    fxTheme.palette.border,
    reuseCells,
    compressionCells,
  ]);

  if (typedChurnData?.unavailable) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Update churn analytics"
          reason={
            typedChurnData.stateReason ||
            "The update-churn pipeline produced no data for this build"
          }
        />
      </div>
    );
  }

  const bandShort = drawnLanes.filter((l) => !l.banded);
  const heatHeight = lanes.length * HEAT_ROW + HEAT_CHROME;
  const ridgeHeight =
    LANE_TOP + Math.max(drawnLanes.length, 1) * (LANE_HEIGHT + LANE_GAP) + 20;

  const latestList = (read: (l: Lane) => string | null) =>
    drawnLanes
      .map(read)
      .filter((s): s is string => s !== null)
      .join(", ");

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {/* ── Fleet totals, as numbers ─────────────────────────────────────── */}
      <section className={styles.kpiGrid} aria-label="Key update churn metrics">
        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Latest Fleet Churn</span>
          <div className={styles.kpiValue}>
            {(topStats.totalDownloadMB / 1024).toFixed(2)}
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
            {INT.format(topStats.totalChunks)} total package interval chunks
          </span>
        </article>

        <article className={styles.kpiCard}>
          <span className={styles.kpiEyebrow}>Tracked Images</span>
          <div className={styles.kpiValue}>
            {topStats.activeImagesCount}
            <span className={styles.kpiUnit}>
              of {topStats.totalImagesCount}
            </span>
          </div>
          <span className={styles.kpiMeta}>
            Images carrying at least one recorded release
          </span>
        </article>
      </section>

      {/* ── 1. Download churn per release ────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>OCI Layer Caching</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Download Churn per Release
          </Heading>
          <p className={styles.sectionSubtext}>
            Bytes a client actually pulls for each release, one lane per image
            on a single 0&ndash;{INT.format(domains.maxChurn)} MB domain.
            Diamonds are baseline pulls: the first tag this pipeline tracked,
            which has no previous tag to diff against, so it carries the whole
            image rather than a delta.
          </p>
        </header>

        {churnPoints > 0 ? (
          <EChart
            option={churnOption}
            height={ridgeHeight}
            title="Download churn per release"
            summary={`Latest measured delta — ${latestList((l) =>
              l.latestDelta
                ? `${l.image.name} ${INT.format(l.latestDelta.downloadChurnMB)} MB`
                : null,
            )}. ${churnPoints} measured delta${churnPoints === 1 ? "" : "s"} across ${drawnLanes.length} image lanes, all on one 0–${INT.format(domains.maxChurn)} MB domain.`}
            points={churnPoints}
            minPoints={1}
            tableCaption="Download churn and baseline pull size per image and release date, in MB"
          />
        ) : (
          <Unavailable
            what="Download churn per release"
            reason="No image has a release with a previous tag to diff against yet"
          />
        )}

        {bandShort.length > 0 && (
          <p className={styles.chartNote}>
            <strong>Percentile band withheld:</strong> a rolling p50 and
            p50&ndash;p95 band needs {BAND_WINDOW} consecutive measured deltas.{" "}
            {bandShort
              .map(
                (l) =>
                  `${l.image.name} has ${l.deltas.length} (${BAND_WINDOW - l.deltas.length} more needed)`,
              )
              .join(", ")}
            . The band is drawn per lane as soon as that lane reaches{" "}
            {BAND_WINDOW}.
          </p>
        )}

        {emptyLanes.map((l) => (
          <Unavailable
            key={l.image.id}
            what={`${l.image.name} download churn`}
            reason={
              l.image.stateReason ||
              "No release recorded for this image, so it has no lane"
            }
          />
        ))}
      </section>

      {/* ── 2. Layer reuse heatmap ───────────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Cache Hit Rate</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Layer Reuse by Image and Release
          </Heading>
          <p className={styles.sectionSubtext}>
            Share of bytes already on disk when each release landed. One hue at
            four intensities, plus a glyph:
          </p>
          <p className={styles.legendRow}>
            {LEGEND_ORDER.map((level) => (
              <span key={level} className={styles.legendChip}>
                <span
                  aria-hidden="true"
                  className={styles.legendGlyph}
                  style={{ color: sev[level].color }}
                >
                  {sev[level].glyph}
                </span>
                {level === "ok"
                  ? "60%+ reused"
                  : level === "watch"
                    ? "25–59% reused"
                    : level === "alert"
                      ? "under 25% reused"
                      : "not measured"}
              </span>
            ))}
          </p>
        </header>

        {reuseMeasured > 0 ? (
          <EChart
            option={heatOptions.reuse}
            height={heatHeight}
            title="Layer reuse by image and release"
            summary={`${reuseMeasured} of ${lanes.length * dateAxis.length} image-by-release cells carry a measured reuse figure. Latest — ${latestList(
              (l) =>
                l.latestDelta
                  ? `${l.image.name} ${l.latestDelta.reuseEfficiencyPct}%`
                  : null,
            )}.`}
            points={reuseMeasured}
            minPoints={1}
            tableCaption="Layer reuse efficiency per image and release date"
          />
        ) : (
          <Unavailable
            what="Layer reuse heatmap"
            reason="No release has a previous tag to diff against, so reuse cannot be measured yet"
          />
        )}
      </section>

      {/* ── 3. Cached vs downloaded bytes ────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Byte Composition</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Cached vs Downloaded Bytes
          </Heading>
          <p className={styles.sectionSubtext}>
            Each release split into bytes served from the local layer cache and
            bytes pulled over the network, stacked to the image&rsquo;s full
            size. Every lane shares one 0&ndash;{INT.format(domains.maxBytes)}{" "}
            MB domain; baseline tags are withheld because their split is not
            measured.
          </p>
          <p className={styles.legendRow}>
            <span className={styles.legendChip}>
              <span
                aria-hidden="true"
                className={styles.legendGlyph}
                style={{ color: cat[0] }}
              >
                ▬
              </span>
              Cached, served from disk
            </span>
            <span className={styles.legendChip}>
              <span
                aria-hidden="true"
                className={styles.legendGlyph}
                style={{ color: cat[3] }}
              >
                ┄
              </span>
              Downloaded over the network
            </span>
          </p>
        </header>

        {bytesPoints > 0 ? (
          <EChart
            option={bytesOption}
            height={ridgeHeight}
            title="Cached versus downloaded bytes per release"
            summary={`Latest split — ${latestList((l) =>
              l.latestDelta
                ? `${l.image.name} ${INT.format(l.latestDelta.sharedMB)} MB cached and ${INT.format(l.latestDelta.downloadChurnMB)} MB downloaded of ${INT.format(l.latestDelta.totalMB)} MB`
                : null,
            )}.`}
            points={bytesPoints}
            minPoints={1}
            tableCaption="Cached and downloaded megabytes per image and release date"
          />
        ) : (
          <Unavailable
            what="Cached versus downloaded bytes"
            reason="No release has a measured byte split yet"
          />
        )}
      </section>

      {/* ── 4. Compression format state lane ─────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Layer Format Migration</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Compression Format State Lane
          </Heading>
          <p className={styles.sectionSubtext}>
            The layer format each release shipped in, with the count of layers
            already in <code>zstd:chunked</code> form out of the release&rsquo;s
            total. One hue plus a glyph:
          </p>
          <p className={styles.legendRow}>
            {(["ok", "watch", "unknown"] as SeverityLevel[]).map((level) => (
              <span key={level} className={styles.legendChip}>
                <span
                  aria-hidden="true"
                  className={styles.legendGlyph}
                  style={{ color: sev[level].color }}
                >
                  {sev[level].glyph}
                </span>
                {level === "ok"
                  ? "zstd:chunked"
                  : level === "watch"
                    ? "gzip"
                    : "no release"}
              </span>
            ))}
          </p>
        </header>

        {compressionMeasured > 0 ? (
          <EChart
            option={heatOptions.compression}
            height={heatHeight}
            title="Compression format per image and release"
            summary={`${compressionMeasured} recorded release${compressionMeasured === 1 ? "" : "s"} carry a layer format. Latest — ${latestList(
              (l) =>
                l.latest
                  ? `${l.image.name} ${l.latest.compressionFormat} (${l.latest.zstdLayers} of ${l.latest.totalLayers} layers)`
                  : null,
            )}.`}
            points={compressionMeasured}
            minPoints={1}
            tableCaption="Layer compression format per image and release date"
          />
        ) : (
          <Unavailable
            what="Compression format state lane"
            reason="No release has recorded a layer compression format yet"
          />
        )}
      </section>

      {/* ── 5. Per-image cards ───────────────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Per Image</span>
          <Heading as="h3" className={styles.sectionTitle}>
            Latest Release per Image
          </Heading>
          <p className={styles.sectionSubtext}>
            The current numbers behind every lane above, with the measured
            deltas as a sparkline on the shared 0&ndash;
            {INT.format(domains.maxChurn)} MB churn domain.
          </p>
        </header>

        <div className={styles.cardGrid}>
          {lanes.map((lane, i) => (
            <ImageCard
              key={lane.image.id}
              lane={lane}
              color={cat[i % cat.length]}
              severity={sev}
              domain={[0, domains.maxChurn]}
            />
          ))}
        </div>

        <p className={styles.chartNote}>
          Chunkah rechunks system updates into package-interval OCI layers.
          Shared layers require 0 download bytes during bootc updates. Source:{" "}
          {typedChurnData.source} · method <code>{typedChurnData.method}</code>{" "}
          · generated {typedChurnData.generatedAt.slice(0, 10)}.
        </p>
      </section>
    </div>
  );
}

interface ImageCardProps {
  lane: Lane;
  color: string;
  severity: Record<
    SeverityLevel,
    { color: string; glyph: string; word: string }
  >;
  domain: [number, number];
}

function ImageCard({
  lane,
  color,
  severity,
  domain,
}: ImageCardProps): React.JSX.Element {
  const { image, latest, latestDelta, deltas } = lane;
  const format = compressionLevel(latest?.compressionFormat ?? null);
  const tone = severity[format];

  return (
    <article className={styles.imageCard}>
      <div className={styles.imageCardHeader}>
        <div className={styles.imageTitleGroup}>
          <Heading as="h4" className={styles.imageName}>
            {image.name}
          </Heading>
          <span className={styles.imageEdition}>
            {image.edition} · :{image.stream}
          </span>
        </div>
        <span className={styles.statusPill} style={{ color: tone.color }}>
          <span aria-hidden="true">{tone.glyph}</span>{" "}
          {latest?.compressionFormat ?? "no release"}
        </span>
      </div>

      {latest === null || image.unavailable ? (
        <Unavailable
          what={`${image.name} churn data`}
          reason={
            image.stateReason || "No stable release recorded for this image yet"
          }
        />
      ) : (
        <>
          <div className={styles.cardKpiGrid}>
            <div className={styles.cardKpiItem}>
              <span className={styles.cardKpiLabel}>Churn</span>
              <div className={styles.cardKpiValue}>
                {latestDelta === null
                  ? "—"
                  : INT.format(latestDelta.downloadChurnMB)}
                <span className={styles.cardKpiUnit}>MB</span>
              </div>
            </div>
            <div className={styles.cardKpiItem}>
              <span className={styles.cardKpiLabel}>Reuse</span>
              <div className={styles.cardKpiValue}>
                {latestDelta === null ? "—" : latestDelta.reuseEfficiencyPct}
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
                {INT.format(latest.totalMB)}
                <span className={styles.cardKpiUnit}>MB</span>
              </div>
            </div>
          </div>

          <div className={styles.cardSparkline}>
            <span className={styles.sparklineLabel}>
              Measured deltas · {deltas.length} of {lane.releases.length}{" "}
              releases
            </span>
            <Sparkline
              data={gapSafe(deltas.map((r) => r.downloadChurnMB))}
              domain={domain}
              scale="zero"
              color={color}
              areaColor="currentColor"
              areaOpacity={0.18}
              width={220}
              height={34}
              showEnd
              minPoints={2}
              emptyLabel="accumulating data"
              label={
                latestDelta === null
                  ? `${image.name} has no measured delta yet`
                  : `${image.name} download churn, latest ${INT.format(latestDelta.downloadChurnMB)} MB across ${deltas.length} measured deltas`
              }
            />
          </div>
        </>
      )}
    </article>
  );
}
