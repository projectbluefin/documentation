import React, { useEffect, useRef, useState } from "react";
import type { ReportChartDefinition } from "./ReportChart";
import styles from "./report-charts.module.css";

interface EChartsInstance {
  setOption: (option: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

interface EChartsCore {
  use: (modules: unknown[]) => void;
  init: (
    element: HTMLDivElement,
    theme?: unknown,
    opts?: Record<string, unknown>,
  ) => EChartsInstance;
}

interface ChartTheme {
  accent: string;
  border: string;
  grid: string;
  muted: string;
  series: string[];
  surface: string;
  text: string;
}

const SERIES_VARIABLES = [
  "--report-chart-series-1",
  "--report-chart-series-2",
  "--report-chart-series-3",
  "--report-chart-series-4",
];

/** Category comparisons beyond this many rows stop being readable at a glance. */
const MAX_CATEGORY_ROWS = 15;
const CATEGORY_ROW_PX = 30;
const TIMELINE_HEIGHT_PX = 300;
const SPLIT_HEIGHT_PX = 120;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export interface EChartsModuleSet {
  charts: Record<string, unknown>;
  components: Record<string, unknown>;
  renderers: Record<string, unknown>;
}

/**
 * How a definition is drawn. Published snapshots carry kinds chosen before
 * these rules existed, so the shape is derived from the data, not trusted:
 * - timeline: date-labelled series, drawn left to right with sparse date ticks
 * - category: named comparisons, drawn as sorted horizontal bars
 * - split: one period divided between series, drawn as one horizontal bar
 */
export type ChartShape = "timeline" | "category" | "split";

export function chartShape(definition: ReportChartDefinition): ChartShape {
  const { labels, kind } = definition;
  if (labels.length > 0 && labels.every((label) => ISO_DATE.test(label))) {
    return "timeline";
  }
  if (kind === "stacked-bar" && labels.length === 1) return "split";
  if (kind === "line") return "timeline";
  return "category";
}

function cssVariable(
  styles_: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  return styles_.getPropertyValue(name).trim() || fallback;
}

function readTheme(element: HTMLDivElement): ChartTheme {
  const computed = getComputedStyle(element);
  const text = cssVariable(
    computed,
    "--report-chart-text",
    computed.color || "currentColor",
  );
  return {
    accent: cssVariable(computed, "--report-chart-accent", text),
    border: cssVariable(computed, "--report-chart-border", text),
    grid: cssVariable(computed, "--report-chart-grid", text),
    muted: cssVariable(computed, "--report-chart-muted", text),
    series: SERIES_VARIABLES.map((name) =>
      cssVariable(
        computed,
        name,
        cssVariable(computed, "--report-chart-accent", text),
      ),
    ),
    surface: cssVariable(computed, "--report-chart-surface", "transparent"),
    text,
  };
}

function finiteValue(value: number | null | undefined): number | null {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : value;
}

function formatValue(value: number): string {
  return Math.abs(value) >= 10000
    ? compactNumber.format(value)
    : value.toLocaleString("en-US");
}

interface Series {
  id: string;
  label: string;
  values: Array<number | null>;
}

/**
 * Repeated dates mean one row per event (release events): those become daily
 * counts across the observed span, where a day with no event is a real zero.
 * Any other out-of-order series is only sorted, keeping null gaps as gaps.
 */
export function timelineData(definition: ReportChartDefinition): {
  labels: string[];
  series: Series[];
  counted: boolean;
} {
  const { labels } = definition;
  const unique = new Set(labels);

  if (unique.size === labels.length) {
    const order = labels
      .map((_, i) => i)
      .sort((a, b) => labels[a].localeCompare(labels[b]));
    return {
      labels: order.map((i) => labels[i]),
      series: definition.series.map((item) => ({
        ...item,
        values: order.map((i) => finiteValue(item.values[i])),
      })),
      counted: false,
    };
  }

  const sorted = [...unique].sort();
  const days: string[] = [];
  const cursor = new Date(`${sorted[0]}T00:00:00Z`);
  const last = sorted[sorted.length - 1];
  for (
    let day = sorted[0];
    day <= last;
    cursor.setUTCDate(cursor.getUTCDate() + 1),
      day = cursor.toISOString().slice(0, 10)
  ) {
    days.push(day);
  }
  const series = definition.series.map((item) => {
    const totals = new Map<string, number>(days.map((day) => [day, 0]));
    labels.forEach((label, i) => {
      const value = finiteValue(item.values[i]);
      if (value !== null) totals.set(label, (totals.get(label) ?? 0) + value);
    });
    return { ...item, values: days.map((day) => totals.get(day) ?? 0) };
  });
  return { labels: days, series, counted: true };
}

/** Rows sorted by size, largest first, capped so every name stays legible. */
function categoryData(definition: ReportChartDefinition): {
  labels: string[];
  series: Series[];
} {
  const rows = definition.labels.map((label, i) => ({
    label: label.replace(/^(projectbluefin|ublue-os)\//, ""),
    values: definition.series.map((item) => finiteValue(item.values[i])),
  }));
  rows.sort(
    (a, b) =>
      b.values.reduce<number>((sum, v) => sum + (v ?? 0), 0) -
      a.values.reduce<number>((sum, v) => sum + (v ?? 0), 0),
  );
  const kept = rows.slice(0, MAX_CATEGORY_ROWS);
  return {
    labels: kept.map((row) => row.label),
    series: definition.series.map((item, s) => ({
      ...item,
      values: kept.map((row) => row.values[s]),
    })),
  };
}

export function chartHeight(definition: ReportChartDefinition): number {
  const shape = chartShape(definition);
  if (shape === "split") return SPLIT_HEIGHT_PX;
  if (shape === "timeline") return TIMELINE_HEIGHT_PX;
  const rows = Math.min(definition.labels.length, MAX_CATEGORY_ROWS);
  const legend = definition.series.length > 1 ? 32 : 0;
  return rows * CATEGORY_ROW_PX + 40 + legend;
}

export function selectEChartsModules({
  charts,
  components,
  renderers,
}: EChartsModuleSet): unknown[] {
  return [
    charts.LineChart,
    charts.BarChart,
    components.GridComponent,
    components.LegendComponent,
    components.TooltipComponent,
    renderers.CanvasRenderer,
  ];
}

export function buildReportChartOption(
  definition: ReportChartDefinition,
  theme: ChartTheme,
): Record<string, unknown> {
  const shape = chartShape(definition);
  const multiSeries = definition.series.length > 1;
  const color = (index: number) => theme.series[index % theme.series.length];
  const valueAxisLabel = {
    color: theme.muted,
    formatter: (value: number) => formatValue(value),
  };

  const common = {
    animation: false,
    animationDuration: 0,
    animationDurationUpdate: 0,
    backgroundColor: "transparent",
    color: theme.series,
    textStyle: { color: theme.text },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: shape === "timeline" ? "line" : "shadow" },
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text },
      valueFormatter: (value: number | null) =>
        value === null || value === undefined
          ? "no data"
          : `${formatValue(value)} ${definition.unit}`,
    },
    legend: multiSeries
      ? {
          top: 0,
          left: 0,
          icon: "roundRect",
          textStyle: { color: theme.muted },
        }
      : { show: false },
  };

  if (shape === "split") {
    return {
      ...common,
      legend: {
        bottom: 0,
        left: 0,
        icon: "roundRect",
        textStyle: { color: theme.muted },
      },
      grid: { left: 0, right: 0, top: 8, bottom: 32, containLabel: false },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", data: definition.labels, show: false },
      series: definition.series.map((item, index) => ({
        id: item.id,
        name: item.label,
        type: "bar",
        stack: "total",
        barWidth: 44,
        data: item.values.map(finiteValue),
        itemStyle: { color: color(index) },
        label: {
          show: true,
          position: "inside",
          color: "#fff",
          fontWeight: 600,
          formatter: ({ value }: { value: number | null }) =>
            value === null ? "" : `${item.label} ${formatValue(value)}`,
        },
      })),
    };
  }

  if (shape === "category") {
    const { labels, series } = categoryData(definition);
    return {
      ...common,
      grid: {
        left: 0,
        right: 48,
        top: multiSeries ? 32 : 4,
        bottom: 8,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: valueAxisLabel,
        splitLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: "category",
        data: labels,
        inverse: true,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.border } },
        axisLabel: { color: theme.text, fontSize: 13 },
      },
      series: series.map((item, index) => ({
        id: item.id,
        name: item.label,
        type: "bar",
        data: item.values,
        barMaxWidth: 18,
        itemStyle: { color: color(index), borderRadius: [0, 3, 3, 0] },
        label: {
          show: !multiSeries,
          position: "right",
          color: theme.text,
          formatter: ({ value }: { value: number | null }) =>
            value === null ? "" : formatValue(value),
        },
      })),
    };
  }

  const { labels, series, counted } = timelineData(definition);
  const asBars = counted || definition.kind !== "line";
  // About one tick per week, never rotated.
  const tickEvery = Math.max(1, Math.ceil(labels.length / 6));
  const integers = series.every((item) =>
    item.values.every((v) => v === null || Number.isInteger(v)),
  );
  return {
    ...common,
    grid: {
      left: 0,
      right: 12,
      top: multiSeries ? 36 : 12,
      bottom: 4,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: asBars,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.border } },
      axisLabel: {
        color: theme.muted,
        interval: (index: number) => index % tickEvery === 0,
        formatter: (label: string) =>
          ISO_DATE.test(label)
            ? `${MONTHS[Number(label.slice(5, 7)) - 1]} ${Number(label.slice(8))}`
            : label,
      },
    },
    yAxis: {
      type: "value",
      minInterval: integers ? 1 : undefined,
      axisLabel: valueAxisLabel,
      splitLine: { lineStyle: { color: theme.grid } },
    },
    series: series.map((item, index) => ({
      id: item.id,
      name: item.label,
      type: asBars ? "bar" : "line",
      data: item.values.map(finiteValue),
      connectNulls: false,
      showSymbol: false,
      barMaxWidth: 14,
      itemStyle: { color: color(index) },
      lineStyle: { color: color(index), width: 2 },
      areaStyle: !asBars && !multiSeries ? { opacity: 0.12 } : undefined,
    })),
  };
}

export interface ReportChartClientProps {
  definition: ReportChartDefinition;
}

export default function ReportChartClient({
  definition,
}: ReportChartClientProps): React.JSX.Element | null {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsInstance | null>(null);
  const definitionRef = useRef(definition);
  const [ready, setReady] = useState(false);
  const definitionKey = JSON.stringify(definition);
  const points = definition.series.reduce(
    (count, series) =>
      count +
      series.values.filter((value) => value !== null && Number.isFinite(value))
        .length,
    0,
  );
  const enoughData = points >= definition.minimumPoints;

  definitionRef.current = definition;

  useEffect(() => {
    if (!enoughData || !elementRef.current) return;

    let disposed = false;
    let observer: ResizeObserver | null = null;

    void (async () => {
      const [coreModule, chartsModule, componentsModule, renderersModule] =
        await Promise.all([
          import("echarts/core"),
          import("echarts/charts"),
          import("echarts/components"),
          import("echarts/renderers"),
        ]);

      if (disposed || !elementRef.current) return;

      const core = coreModule as unknown as EChartsCore;
      core.use(
        selectEChartsModules({
          charts: chartsModule as unknown as Record<string, unknown>,
          components: componentsModule as unknown as Record<string, unknown>,
          renderers: renderersModule as unknown as Record<string, unknown>,
        }),
      );
      chartRef.current = core.init(elementRef.current, undefined, {
        renderer: "canvas",
      });
      chartRef.current.setOption(
        buildReportChartOption(
          definitionRef.current,
          readTheme(elementRef.current),
        ),
        true,
      );
      observer = new ResizeObserver(() => chartRef.current?.resize());
      observer.observe(elementRef.current);
      setReady(true);
    })();

    return () => {
      disposed = true;
      setReady(false);
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [enoughData]);

  useEffect(() => {
    if (!ready || !chartRef.current || !elementRef.current) return;
    chartRef.current.setOption(
      buildReportChartOption(
        definitionRef.current,
        readTheme(elementRef.current),
      ),
      true,
    );
  }, [definitionKey, ready]);

  if (!enoughData) return null;

  const hiddenRows =
    chartShape(definition) === "category"
      ? definition.labels.length - MAX_CATEGORY_ROWS
      : 0;

  return (
    <>
      <div
        ref={elementRef}
        className={styles.chartCanvas}
        style={{ height: `${chartHeight(definition)}px` }}
        role="img"
        aria-label={`${definition.title}. ${definition.currentValue} ${definition.unit}.`}
      />
      {hiddenRows > 0 && (
        <p className={styles.accumulating}>
          Top {MAX_CATEGORY_ROWS} of {definition.labels.length} shown; the total
          includes all {definition.labels.length}. Every value is in the table
          below.
        </p>
      )}
    </>
  );
}
