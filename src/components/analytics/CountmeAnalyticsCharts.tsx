import React, { useState, useMemo, useEffect } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import Sparkline from "../Sparkline";
import {
  gapSafe,
  readableInk,
  withAlpha,
  type SeverityLevel,
} from "../factory/chartTheme";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import "../factory/tokens.css";
import styles from "./CountmeAnalyticsCharts.module.css";
import countmeHistoryData from "@site/static/data/countme-history.json";

/**
 * The registry snapshot is generated at build time and is not a tracked seed,
 * so it is fetched rather than imported: a static import of a file that may not
 * exist fails the build instead of rendering a panel that says why.
 */
const REGISTRY_URL = "/data/ghcr-packages.json";

export interface CountmeWeek {
  week: string;
  bluefin?: number | null;
  "bluefin-lts"?: number | null;
  aurora?: number | null;
  bazzite?: number | null;
  fedora?: number | null;
  dakota?: number | null;
  utah?: number | null;
  server?: number | null;
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

/** One published tag of one GHCR package, as `scripts/fetch-ghcr-packages.js` writes it. */
export interface GhcrStream {
  tag: string;
  publishedAt?: string | null;
  ageDays?: number | null;
  state?: string | null;
  stateReason?: string | null;
}

export interface GhcrPackage {
  name: string;
  family: string;
  streams?: GhcrStream[];
  versionCount?: number;
}

export interface GhcrDataset {
  generatedAt?: string;
  source?: string;
  packages?: GhcrPackage[];
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
type EcosystemMode = "absolute" | "share";

/**
 * The promotion axis, in promotion order.
 *
 * Read from source, not from `projectbluefin/common` →
 * `docs/skills/image-registry.md`, which still claims `bluefin-lts` promotes to
 * `:lts`. Every repo's `execute-release.yml` targets `stable`:
 *
 *   bluefin      {"source_tag":"testing","target_tag":"stable"}
 *   bluefin-lts  {"source_tag":"testing","target_tag":"stable"}
 *   dakota       {"source_tag":"<build sha>","target_tag":"stable"}
 *
 * `:lts`, `:gts` and `:latest` still sit on some images as leftovers from
 * retired schemes. Nothing promotes through them, so they are not columns — a
 * column that is a dash down most of the grid teaches nobody anything.
 */
export const STREAM_COLUMNS = ["testing", "stable"] as const;
export type StreamTag = (typeof STREAM_COLUMNS)[number];

export interface ProjectBluefinImageSpec {
  id: "bluefin" | "bluefin-lts" | "dakota" | "utah" | "server";
  name: string;
  edition: string;
  /** Upstream the image is composed from. */
  base: string;
  /** Index into the resolved `--fx-cat-*` ramp. Never a literal colour. */
  cat: number;
  link: string;
  status: "active" | "bootstrapping" | "provisioning";
  statusText: string;
  /** GHCR packages this family promotes, in release-workflow order. */
  images: string[];
  /** Packages still in the registry that no release workflow promotes. */
  retired?: string[];
  /** `oci` families appear in the stream matrix; `ddi` families ship no container tags. */
  delivery: "oci" | "ddi";
}

/**
 * Every image family `projectbluefin/common` ships into, with the GHCR packages
 * each one promotes.
 *
 * **Derived from each repo's `execute-release.yml` promotion matrix, not from
 * `common` → `docs/skills/image-registry.md`.** That file was the source here
 * and it is wrong on three counts: it claims `bluefin-lts` promotes to `:lts`,
 * it lists the retired `-hwe` images as live, and it omits `bluefin-lts-nvidia`
 * and both dakota gaming images entirely. Re-derive before editing this list:
 *
 * ```bash
 * for r in bluefin bluefin-lts dakota; do
 *   gh api "repos/projectbluefin/$r/contents/.github/workflows/execute-release.yml" \
 *     --jq .content | base64 -d | grep -E '"image"'
 * done
 * ```
 *
 * `id` is the first-party countme `repo` identifier.
 */
export const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
  {
    id: "bluefin",
    name: "Bluefin",
    edition: "Flagship Workstation",
    base: "Fedora",
    cat: 0,
    link: "/downloads",
    status: "active",
    statusText: "Active Tracking",
    images: ["bluefin", "bluefin-nvidia"],
    delivery: "oci",
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    edition: "Enterprise Workstation",
    base: "CentOS Stream 10",
    cat: 1,
    link: "/lts",
    status: "active",
    statusText: "Active · EPEL",
    images: ["bluefin-lts", "bluefin-lts-nvidia"],
    retired: ["bluefin-lts-hwe", "bluefin-lts-hwe-nvidia"],
    delivery: "oci",
  },
  {
    id: "dakota",
    name: "Project Bluefin Dakota",
    edition: "Next-Gen BuildStream",
    base: "GNOME OS / BuildStream 2",
    cat: 2,
    link: "/dakota",
    status: "bootstrapping",
    statusText: "Alpha · Collecting",
    images: [
      "dakota",
      "dakota-nvidia",
      "dakota-gaming",
      "dakota-nvidia-gaming",
    ],
    delivery: "oci",
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Hummingbird",
    base: "Fedora Hummingbird",
    cat: 3,
    link: "/utah",
    status: "provisioning",
    statusText: "Pre-alpha · Provisioning",
    images: [],
    delivery: "oci",
  },
  {
    id: "server",
    name: "Bluefin Server",
    edition: "Image-Based Server",
    base: "freedesktop-sdk 26.08",
    cat: 4,
    link: "https://github.com/projectbluefin/server",
    status: "provisioning",
    statusText: "Alpha · DDI delivery",
    images: [],
    delivery: "ddi",
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

/**
 * Publication recency as one hue at four intensities plus a glyph.
 *
 * `fetch-ghcr-packages.js` already decides `fresh` vs `stale` per tag against
 * that lane's own cadence budget, so this only splits `stale` by how far past
 * the budget it has drifted. An absent stream is `unknown` — a gap, not a zero.
 */
export function freshnessLevel(stream?: GhcrStream | null): SeverityLevel {
  const age = parseCount(stream?.ageDays);
  if (!stream || age === null) return "unknown";
  if (stream.state === "fresh") return "ok";
  return age >= 30 ? "alert" : "watch";
}

const LEVEL_ORDINAL: Record<SeverityLevel, number> = {
  unknown: 0,
  ok: 1,
  watch: 2,
  alert: 3,
};

export interface MatrixRow {
  image: string;
  family: ProjectBluefinImageSpec;
}

export interface MatrixCell {
  x: number;
  y: number;
  image: string;
  stream: StreamTag;
  level: SeverityLevel;
  ageDays: number | null;
  publishedAt: string | null;
  reason: string | null;
}

/** Every OCI image the families publish, flattened into heatmap rows. */
export function matrixRows(
  families: ProjectBluefinImageSpec[] = BLUEFIN_FAMILY_IMAGES,
): MatrixRow[] {
  return families
    .filter((f) => f.delivery === "oci")
    .flatMap((family) => family.images.map((image) => ({ image, family })));
}

/**
 * Join the image catalogue against the registry snapshot.
 *
 * The catalogue drives the grid, not the snapshot: an image the factory is
 * supposed to publish but the registry does not carry still gets a cell, marked
 * unknown. A silently missing row and a published-but-stale row are different
 * claims.
 */
export function buildStreamMatrix(
  rows: MatrixRow[],
  packages: GhcrPackage[],
): MatrixCell[] {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const cells: MatrixCell[] = [];
  rows.forEach((row, y) => {
    STREAM_COLUMNS.forEach((stream, x) => {
      const published = byName
        .get(row.image)
        ?.streams?.find((s) => s.tag === stream);
      cells.push({
        x,
        y,
        image: row.image,
        stream,
        level: freshnessLevel(published),
        ageDays: parseCount(published?.ageDays),
        publishedAt: published?.publishedAt ?? null,
        reason:
          published?.stateReason ??
          (published ? null : "no version published under this tag"),
      });
    });
  });
  return cells;
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

const BAND_WINDOW = 5;
const LANE_HEIGHT = 62;
const LANE_GAP = 14;
const LANE_TOP = 16;

export interface CountmeAnalyticsChartsProps {
  dataset?: CountmeDataset;
  registry?: GhcrDataset;
}

export default function CountmeAnalyticsCharts({
  dataset,
  registry,
}: CountmeAnalyticsChartsProps = {}): React.JSX.Element {
  const data = dataset ?? (countmeHistoryData as unknown as CountmeDataset);
  const weeks = data?.weeks || [];

  const [themeRef, fxTheme] = useFactoryTheme();
  const cat = fxTheme.categorical;
  const sev = fxTheme.severity;
  const [heroRange, setHeroRange] = useState<HeroRange>("all");
  const [ecoMode, setEcoMode] = useState<EcosystemMode>("absolute");
  const [fetchedRegistry, setFetchedRegistry] = useState<GhcrDataset | null>(
    null,
  );
  const [registryReason, setRegistryReason] = useState<string | null>(null);
  const base = useBaseUrl("/");

  useEffect(() => {
    if (registry) return;
    const url = base.replace(/\/$/, "") + REGISTRY_URL;
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFetchedRegistry((await res.json()) as GhcrDataset);
      } catch (err) {
        setRegistryReason(
          `${REGISTRY_URL} could not be read (${(err as Error).message}). ` +
            `It is generated at build time and may not exist in this environment.`,
        );
      }
    })();
  }, [base, registry]);

  const ghcr = registry ?? fetchedRegistry;

  const latestWeek = weeks[weeks.length - 1] || ({} as CountmeWeek);
  const familyIds = BLUEFIN_FAMILY_IMAGES.map((f) => f.id);
  const fleetOf = (w: CountmeWeek): number | null =>
    sumPresent(familyIds.map((id) => w[id]));
  const currentTotalBluefin = fleetOf(latestWeek) ?? 0;

  const heroFilteredWeeks = useMemo(() => {
    if (heroRange === "12w") return weeks.slice(-12);
    if (heroRange === "24w") return weeks.slice(-24);
    return weeks;
  }, [weeks, heroRange]);

  /**
   * Issue #1087: the delta describes the range on screen, and a shrinking fleet
   * reads as a minus sign rather than "+-4.2%".
   */
  const baselineTotal = fleetOf(heroFilteredWeeks[0] || ({} as CountmeWeek));
  const bluefinDelta =
    baselineTotal !== null && baselineTotal > 0
      ? ((currentTotalBluefin - baselineTotal) / baselineTotal) * 100
      : null;
  const deltaText =
    bluefinDelta === null
      ? null
      : `${bluefinDelta >= 0 ? "+" : ""}${bluefinDelta.toFixed(1)}%`;

  const fleetSeries = useMemo(
    () => gapSafe(heroFilteredWeeks.map(fleetOf)),
    [heroFilteredWeeks],
  );

  const realHeroPoints = useMemo(
    () => fleetSeries.filter((v) => v !== null).length,
    [fleetSeries],
  );

  const heroChartOption = useMemo(() => {
    const p50 = rollingPercentile(fleetSeries, BAND_WINDOW, 0.5);
    const p95 = rollingPercentile(fleetSeries, BAND_WINDOW, 0.95);
    const spread = p50.map((median, i) => {
      const upper = p95[i];
      return median === null || upper === null ? null : upper - median;
    });
    const banded = realHeroPoints >= BAND_WINDOW;

    return {
      grid: { left: 64, right: 24, top: 44, bottom: 40, containLabel: true },
      legend: { top: 0, icon: "roundRect" },
      xAxis: { type: "category", data: heroFilteredWeeks.map((w) => w.week) },
      yAxis: { type: "value", min: "dataMin" },
      series: [
        ...(banded
          ? [
              {
                name: "Rolling median (5w)",
                type: "line",
                stack: "band",
                data: p50,
                showSymbol: false,
                smooth: true,
                lineStyle: { width: 2, type: [6, 3], color: cat[5] },
                itemStyle: { color: cat[5] },
                connectNulls: false,
              },
              {
                name: "p50–p95 spread",
                type: "line",
                stack: "band",
                data: spread,
                showSymbol: false,
                smooth: true,
                lineStyle: { opacity: 0 },
                itemStyle: { color: withAlpha(cat[0], 0.35) },
                areaStyle: { color: cat[0], opacity: 0.18 },
                connectNulls: false,
              },
            ]
          : []),
        {
          name: "Weekly active systems",
          type: "line",
          data: fleetSeries,
          smooth: false,
          showSymbol: true,
          symbolSize: 6,
          z: 5,
          itemStyle: { color: cat[0] },
          lineStyle: { width: 3, color: cat[0] },
          connectNulls: false,
        },
      ],
    };
  }, [heroFilteredWeeks, fleetSeries, realHeroPoints]);

  // ── Image × stream publication matrix ──────────────────────────────────
  const ghcrPackages = ghcr?.packages ?? [];
  const rows = useMemo(() => matrixRows(), []);
  const cells = useMemo(
    () => buildStreamMatrix(rows, ghcrPackages),
    [rows, ghcrPackages],
  );
  const publishedCells = cells.filter((c) => c.ageDays !== null).length;

  const matrixOption = useMemo(
    () => ({
      // The shared option supplies a legend; a single-series heatmap has no use
      // for one, and it lands on top of the stream labels.
      legend: { show: false },
      grid: { left: 200, right: 32, top: 12, bottom: 44, containLabel: false },
      tooltip: {
        trigger: "item",
        formatter: (p: { data: { tip: string } }) => p.data.tip,
      },
      xAxis: {
        type: "category",
        position: "bottom",
        data: STREAM_COLUMNS.map((s) => `:${s}`),
        axisLabel: { fontSize: 13, fontWeight: 600 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((r) => r.image),
        axisLabel: { fontSize: 12 },
        splitArea: { show: false },
      },
      visualMap: {
        show: false,
        type: "piecewise",
        pieces: (Object.keys(LEVEL_ORDINAL) as SeverityLevel[]).map(
          (level) => ({
            value: LEVEL_ORDINAL[level],
            color: sev[level].color,
          }),
        ),
      },
      series: [
        {
          name: "Stream freshness",
          type: "heatmap",
          data: cells.map((c) => {
            const level = sev[c.level];
            return {
              value: [c.x, c.y, LEVEL_ORDINAL[c.level]],
              text: c.ageDays === null ? "—" : `${level.glyph} ${c.ageDays}d`,
              label: { color: readableInk(level.color) },
              tip: [
                `${c.image}:${c.stream}`,
                c.ageDays === null
                  ? "No published version"
                  : `Published ${c.ageDays} day${c.ageDays === 1 ? "" : "s"} ago — ${level.word}`,
                c.publishedAt
                  ? `Last push ${c.publishedAt.slice(0, 10)}`
                  : null,
                c.reason,
              ]
                .filter(Boolean)
                .join("\n"),
            };
          }),
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 600,
            formatter: (p: { data: { text: string } }) => p.data.text,
          },
          itemStyle: {
            borderColor: withAlpha(fxTheme.palette.border, 0.9),
            borderWidth: 2,
            borderRadius: 6,
          },
          emphasis: {
            itemStyle: { borderColor: cat[0], borderWidth: 3 },
          },
        },
      ],
    }),
    [rows, cells, sev, cat, fxTheme.palette.border],
  );

  // ── Family ridgeline ───────────────────────────────────────────────────
  const laneSeriesData = useMemo(
    () =>
      BLUEFIN_FAMILY_IMAGES.map((family) =>
        gapSafe(weeks.map((w) => parseCount(w[family.id]))),
      ),
    [weeks],
  );

  /** One domain for every lane — per-lane autoscaling makes each cell look identical. */
  const ridgelineMax = useMemo(() => {
    let max = 0;
    for (const lane of laneSeriesData) {
      for (const v of lane) if (v !== null && v > max) max = v;
    }
    return max > 0 ? max : 100;
  }, [laneSeriesData]);

  const realRidgelinePoints = useMemo(
    () =>
      laneSeriesData.reduce(
        (n, lane) => n + lane.filter((v) => v !== null).length,
        0,
      ),
    [laneSeriesData],
  );

  const ridgelineOption = useMemo(
    () => ({
      // Each lane is titled beside its own grid, so the shared legend would
      // only repeat five names under the axis.
      legend: { show: false },
      grid: BLUEFIN_FAMILY_IMAGES.map((_, i) => ({
        left: 196,
        right: 28,
        top: LANE_TOP + i * (LANE_HEIGHT + LANE_GAP),
        height: LANE_HEIGHT,
      })),
      title: BLUEFIN_FAMILY_IMAGES.map((family, i) => {
        const current = parseCount(latestWeek[family.id]);
        return {
          text: family.name,
          subtext:
            current === null
              ? `no telemetry — ${family.statusText}`
              : `${current.toLocaleString()} systems`,
          left: 0,
          top: LANE_TOP + i * (LANE_HEIGHT + LANE_GAP) + 10,
          textStyle: { color: cat[family.cat], fontSize: 13, fontWeight: 600 },
          subtextStyle: { fontSize: 12 },
        };
      }),
      axisPointer: { link: [{ xAxisIndex: "all" }] },
      xAxis: BLUEFIN_FAMILY_IMAGES.map((_, i) => ({
        type: "category",
        gridIndex: i,
        data: weeks.map((w) => w.week),
        boundaryGap: false,
        axisTick: { show: false },
        axisLabel: {
          show: i === BLUEFIN_FAMILY_IMAGES.length - 1,
          fontSize: 11,
        },
      })),
      yAxis: BLUEFIN_FAMILY_IMAGES.map((_, i) => ({
        type: "value",
        gridIndex: i,
        min: 0,
        max: ridgelineMax,
        show: false,
      })),
      series: BLUEFIN_FAMILY_IMAGES.map((family, i) => {
        const laneColor = cat[family.cat];
        return {
          name: family.name,
          type: "line",
          xAxisIndex: i,
          yAxisIndex: i,
          data: laneSeriesData[i],
          smooth: true,
          symbol: "none",
          connectNulls: false,
          lineStyle: { width: 2, color: laneColor },
          itemStyle: { color: laneColor },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: withAlpha(laneColor, 0.4) },
                { offset: 1, color: withAlpha(laneColor, 0.05) },
              ],
            },
          },
        };
      }),
    }),
    [weeks, laneSeriesData, ridgelineMax, latestWeek, cat],
  );

  // ── Ecosystem streamgraph ──────────────────────────────────────────────
  const ecoSeries = useMemo(
    () => [
      {
        name: "Bazzite (Gaming)",
        color: cat[2],
        values: weeks.map((w) => parseCount(w.bazzite)),
      },
      {
        name: "Bluefin family (Workstation)",
        color: cat[0],
        values: weeks.map(fleetOf),
      },
      {
        name: "Aurora (KDE)",
        color: cat[4],
        values: weeks.map((w) => parseCount(w.aurora)),
      },
    ],
    [weeks, cat],
  );

  const ecoTotals = useMemo(
    () =>
      weeks.map((_, i) => sumPresent(ecoSeries.map((s) => s.values[i])) ?? 0),
    [weeks, ecoSeries],
  );

  const realEcoPoints = useMemo(
    () => ecoTotals.filter((t) => t > 0).length,
    [ecoTotals],
  );

  const ecosystemOption = useMemo(
    () => ({
      grid: { left: 64, right: 24, top: 44, bottom: 40, containLabel: true },
      legend: { top: 0, icon: "roundRect" },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: weeks.map((w) => w.week),
      },
      yAxis: {
        type: "value",
        max: ecoMode === "share" ? 100 : undefined,
        axisLabel: { formatter: ecoMode === "share" ? "{value}%" : "{value}" },
      },
      series: ecoSeries.map((s, i) => ({
        name: s.name,
        type: "line",
        stack: "ecosystem",
        smooth: true,
        symbol: "none",
        connectNulls: false,
        lineStyle: { width: 1, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.72 - i * 0.06 },
        data: gapSafe(
          s.values.map((v, w) => {
            if (v === null) return null;
            if (ecoMode !== "share") return v;
            const total = ecoTotals[w];
            return total > 0 ? Number(((v / total) * 100).toFixed(2)) : null;
          }),
        ),
      })),
    }),
    [weeks, ecoSeries, ecoTotals, ecoMode],
  );

  if (data?.unavailable || !weeks.length) {
    return (
      <div ref={themeRef} className={`fxRoot ${styles.container}`}>
        <Unavailable
          what="Countme Analytics"
          reason={
            data?.stateReason ?? "Countme dataset is currently unavailable."
          }
        />
      </div>
    );
  }

  const bazziteCount = parseCount(latestWeek.bazzite);
  const auroraCount = parseCount(latestWeek.aurora);
  const fedoraCount = parseCount(latestWeek.fedora);
  const peerTotal =
    sumPresent([bazziteCount, auroraCount, currentTotalBluefin]) ?? 0;
  const trackedFamilies = BLUEFIN_FAMILY_IMAGES.filter(
    (f) => parseCount(latestWeek[f.id]) !== null,
  ).length;
  const packageIndex = new Map(ghcrPackages.map((p) => [p.name, p]));

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {/* ── 1. Fleet trend with rolling median band ─────────────────────── */}
      <section className={styles.heroCard}>
        <header className={styles.heroHeader}>
          <div className={styles.heroTitleGroup}>
            <Heading as="h3" className={styles.heroTitle}>
              Weekly Active Systems
            </Heading>
            <p className={styles.heroSubtitle}>
              Every Project Bluefin image family, summed. The dashed line is the
              five-week rolling median and the shaded envelope is its
              p50&ndash;p95 spread &mdash; countme is a weekly estimate, not a
              census, and the band is how wide that estimate swings.
            </p>
          </div>

          <div className={styles.heroKPI}>
            <div className={styles.heroNumber}>
              {currentTotalBluefin.toLocaleString()}
            </div>
            <div className={styles.heroMeta}>
              {deltaText && (
                <span
                  className={`${styles.trendBadge} ${
                    (bluefinDelta ?? 0) >= 0 ? styles.trendUp : styles.trendDown
                  }`}
                >
                  {deltaText} over {heroFilteredWeeks.length}w
                </span>
              )}
              <span>latest week ({latestWeek.week})</span>
            </div>
          </div>
        </header>

        <div className={styles.chartControls}>
          <div className={styles.toggleGroup} role="group" aria-label="Range">
            {(["12w", "24w", "all"] as HeroRange[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={heroRange === r}
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
          <div className={styles.statStrip}>
            <span>
              <strong>{trackedFamilies}</strong> of{" "}
              {BLUEFIN_FAMILY_IMAGES.length} families reporting
            </span>
            <span>
              <strong>{rows.length}</strong> OCI images published
            </span>
            <span>
              Fedora base:{" "}
              <strong>
                {fedoraCount === null
                  ? "no data"
                  : fedoraCount.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>

        <EChart
          option={heroChartOption}
          title="Project Bluefin fleet"
          summary={`${currentTotalBluefin.toLocaleString()} weekly active systems as of week ${latestWeek.week}${
            deltaText === null
              ? ", with no baseline week to compare against"
              : `, ${deltaText} across the ${heroFilteredWeeks.length} weeks shown`
          }. The p50–p95 band needs ${BAND_WINDOW} weeks of real data and ${realHeroPoints >= BAND_WINDOW ? "is drawn" : "is not drawn yet"}.`}
          points={realHeroPoints}
          minPoints={2}
          height={340}
          tableCaption="Project Bluefin weekly active systems, rolling median, and p50–p95 spread"
        />
      </section>

      {/* ── 2. Image × stream publication matrix ────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Image &times; Stream Publication Matrix
          </Heading>
          <p className={styles.sectionSubtext}>
            Days since each published image last pushed to each promotion
            stream. One hue at four intensities, plus a glyph:
          </p>
          <p className={styles.legendRow}>
            {(["ok", "watch", "alert", "unknown"] as SeverityLevel[]).map(
              (level) => (
                <span key={level} className={styles.legendChip}>
                  <span
                    aria-hidden="true"
                    className={styles.legendGlyph}
                    style={{ color: sev[level].color }}
                  >
                    {sev[level].glyph}
                  </span>
                  {sev[level].word}
                </span>
              ),
            )}
          </p>
        </header>

        {ghcr?.unavailable || !ghcrPackages.length ? (
          <Unavailable
            what="Image stream matrix"
            reason={
              ghcr?.stateReason ??
              registryReason ??
              "Reading the registry snapshot…"
            }
          />
        ) : (
          <EChart
            option={matrixOption}
            title="Image stream freshness"
            summary={`${publishedCells} of ${cells.length} image-stream lanes carry a published version, across ${rows.map((r) => r.image).join(", ")} and the :${STREAM_COLUMNS.join(", :")} streams.`}
            points={publishedCells}
            minPoints={1}
            height={rows.length * 46 + 64}
            tableCaption="Days since last publish per image and promotion stream"
          />
        )}

        <p className={styles.chartNote}>
          <strong>Streams:</strong> every image promotes <code>:testing</code>{" "}
          &rarr; <code>:stable</code>, which is the whole axis. Read from each
          repository&rsquo;s <code>execute-release.yml</code> promotion matrix.
          The <code>:lts</code>, <code>:gts</code> and <code>:latest</code> tags
          still sit on some images as leftovers from retired schemes; nothing
          promotes through them, so they are not columns here.
        </p>
      </section>

      {/* ── 3. Family ridgeline ─────────────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Adoption by Image Family
          </Heading>
          <p className={styles.sectionSubtext}>
            Small multiples on one shared domain (0 &ndash;{" "}
            {ridgelineMax.toLocaleString()}), so a lane that is small looks
            small. A family with no first-party telemetry keeps its lane and
            says so rather than disappearing.
          </p>
        </header>

        <EChart
          option={ridgelineOption}
          title="Adoption by image family"
          summary={BLUEFIN_FAMILY_IMAGES.map((f) => {
            const v = parseCount(latestWeek[f.id]);
            return `${f.name}: ${v === null ? `no telemetry (${f.statusText})` : `${v.toLocaleString()} systems`}`;
          }).join(". ")}
          points={realRidgelinePoints}
          minPoints={2}
          height={
            BLUEFIN_FAMILY_IMAGES.length * (LANE_HEIGHT + LANE_GAP) +
            LANE_TOP +
            36
          }
          tableCaption="Weekly active systems per Project Bluefin image family"
        />
      </section>

      {/* ── 4. Family cards ─────────────────────────────────────────────── */}
      <section className={styles.familySection}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Project Bluefin Image Family
          </Heading>
          <p className={styles.sectionSubtext}>
            Every image <code>projectbluefin/common</code> ships into, with the
            GHCR flavors each family publishes.
          </p>
        </header>

        <div className={styles.familyGrid}>
          {BLUEFIN_FAMILY_IMAGES.map((img) => {
            const { count, isTracked, hasHistory, history } =
              getFamilyImageMetrics(img, weeks, latestWeek);

            return (
              <article key={img.id} className={styles.familyCard}>
                <div className={styles.familyCardHeader}>
                  <div className={styles.familyCardTitleGroup}>
                    <Heading as="h4" className={styles.familyName}>
                      {img.name}
                    </Heading>
                    <span className={styles.familyEdition}>
                      {img.edition} · {img.base}
                    </span>
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
                      : "No telemetry"}
                  </span>
                  {isTracked && count !== null && currentTotalBluefin > 0 && (
                    <span className={styles.sharePct}>
                      {((count / currentTotalBluefin) * 100).toFixed(1)}% of
                      fleet
                    </span>
                  )}
                </div>

                <div className={styles.cardSparkline}>
                  <span className={styles.sparklineLabel}>
                    {isTracked || hasHistory ? "12-week trend" : "Countme"}
                  </span>
                  <Sparkline
                    data={history}
                    variant="line"
                    domain={[0, ridgelineMax]}
                    width={220}
                    height={32}
                    color={cat[img.cat]}
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

                <ul className={styles.variantList}>
                  {img.images.length === 0 ? (
                    <li className={styles.variantEmpty}>
                      {img.delivery === "ddi"
                        ? "DDI + systemd-sysupdate delivery — no container stream"
                        : "No image published to GHCR yet"}
                    </li>
                  ) : (
                    img.images.map((name) => (
                      <li key={name} className={styles.variantRow}>
                        <code className={styles.variantName}>{name}</code>
                        <span className={styles.variantStreams}>
                          {STREAM_COLUMNS.map((stream) => {
                            const published = packageIndex
                              .get(name)
                              ?.streams?.find((s) => s.tag === stream);
                            const level = freshnessLevel(published);
                            const age = parseCount(published?.ageDays);
                            return (
                              <span
                                key={stream}
                                className={styles.streamChip}
                                title={`${name}:${stream} — ${sev[level].word}${
                                  age === null ? "" : `, ${age} days old`
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={styles.legendGlyph}
                                  style={{ color: sev[level].color }}
                                >
                                  {sev[level].glyph}
                                </span>
                                {stream} {age === null ? "—" : `${age}d`}
                              </span>
                            );
                          })}
                        </span>
                      </li>
                    ))
                  )}
                  {img.retired?.length ? (
                    <li className={styles.variantEmpty}>
                      Retired, still in the registry:{" "}
                      {img.retired.map((name, i) => (
                        <React.Fragment key={name}>
                          {i > 0 && ", "}
                          <code>{name}</code>
                        </React.Fragment>
                      ))}
                    </li>
                  ) : null}
                </ul>

                <div className={styles.familyFooter}>
                  <Link to={img.link} className={styles.familyLink}>
                    {img.name} details &rarr;
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── 5. Ecosystem streamgraph ────────────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Cloud-Native Desktop Ecosystem
          </Heading>
          <p className={styles.sectionSubtext}>
            {peerTotal.toLocaleString()} estimated active devices across the
            cloud-native desktop images in week {latestWeek.week}.
          </p>
        </header>

        <div className={styles.chartControls}>
          <div className={styles.toggleGroup} role="group" aria-label="Scale">
            {(["absolute", "share"] as EcosystemMode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={ecoMode === m}
                className={`${styles.toggleBtn} ${ecoMode === m ? styles.toggleBtnActive : ""}`}
                onClick={() => setEcoMode(m)}
              >
                {m === "absolute" ? "Active devices" : "Share of ecosystem"}
              </button>
            ))}
          </div>
        </div>

        <EChart
          option={ecosystemOption}
          title="Cloud-native desktop ecosystem"
          summary={`Week ${latestWeek.week}: Bazzite ${bazziteCount === null ? "no data" : bazziteCount.toLocaleString()}, Bluefin family ${currentTotalBluefin.toLocaleString()}, Aurora ${auroraCount === null ? "no data" : auroraCount.toLocaleString()} — ${peerTotal.toLocaleString()} devices in total, shown ${ecoMode === "share" ? "as share of the ecosystem" : "as absolute active devices"}.`}
          points={realEcoPoints}
          minPoints={2}
          height={340}
          tableCaption={`Weekly ${ecoMode === "share" ? "share" : "estimated active systems"} by cloud-native desktop image`}
        />

        <p className={styles.chartNote}>
          <strong>Methodology:</strong> Fedora countme totals aggregated by the{" "}
          <code>ublue-countme-v1</code> baseline (ADR 0004), supplemented by
          first-party <code>countme.projectbluefin.io</code> pings. Bluefin LTS
          is CentOS Stream based and reaches Fedora&rsquo;s counter only through
          EPEL, so its lane undercounts and is not comparable like-for-like.
        </p>
      </section>
    </div>
  );
}
