import React, { useEffect, useRef, useState } from "react";
import type { ReportChartDefinition, ReportChartKind } from "./ReportChart";
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
  text: string;
}

const SERIES_VARIABLES = [
  "--report-chart-series-1",
  "--report-chart-series-2",
  "--report-chart-series-3",
  "--report-chart-series-4",
];

export interface EChartsModuleSet {
  charts: Record<string, unknown>;
  components: Record<string, unknown>;
  renderers: Record<string, unknown>;
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
    text,
  };
}

function finiteValue(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : value;
}

export function selectEChartsModules(
  kind: ReportChartKind,
  { charts, components, renderers }: EChartsModuleSet,
): unknown[] {
  if (kind === "calendar") {
    return [
      charts.HeatmapChart,
      components.CalendarComponent,
      components.TooltipComponent,
      components.VisualMapComponent,
      renderers.CanvasRenderer,
    ];
  }

  return [
    kind === "line" ? charts.LineChart : charts.BarChart,
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
  const isHorizontalBar = definition.kind === "grouped-bar";
  const series = definition.series.map((item, index) => {
    const color = theme.series[index % theme.series.length];
    return {
      id: item.id,
      name: item.label,
      type: definition.kind === "line" ? "line" : "bar",
      data: item.values.map(finiteValue),
      connectNulls: false,
      barMaxWidth: isHorizontalBar ? 18 : 32,
      itemStyle: {
        color,
        borderRadius:
          definition.kind === "line"
            ? 0
            : isHorizontalBar
              ? [0, 4, 4, 0]
              : [4, 4, 0, 0],
      },
      lineStyle: { color, width: 2 },
      ...(definition.kind === "stacked-bar" ? { stack: "total" } : {}),
    };
  });

  const common = {
    animation: false,
    animationDuration: 0,
    animationDurationUpdate: 0,
    backgroundColor: "transparent",
    color: theme.series,
    textStyle: { color: theme.text },
    tooltip: {
      trigger: "axis",
      backgroundColor: "var(--ifm-color-emphasis-100, #f8f9fa)",
      borderColor: theme.border,
      textStyle: { color: theme.text },
    },
  };

  if (definition.kind === "calendar") {
    const sortedLabels = [...definition.labels].sort();
    const range =
      sortedLabels.length >= 2
        ? [sortedLabels[0], sortedLabels[sortedLabels.length - 1]]
        : sortedLabels[0] || "2026";
    return {
      ...common,
      tooltip: {
        formatter: (params: { value?: [string, number] }) => {
          const date = params.value?.[0];
          const val = params.value?.[1];
          return `<strong>${date}</strong><br/>${val ?? 0} ${definition.unit}`;
        },
        backgroundColor: "var(--ifm-color-emphasis-100, #f8f9fa)",
        borderColor: theme.border,
        textStyle: { color: theme.text },
      },
      calendar: {
        top: 25,
        bottom: 45,
        left: 36,
        right: 36,
        range,
        cellSize: ["auto", 22],
        itemStyle: { borderColor: theme.border, borderWidth: 1 },
        splitLine: { show: false },
        yearLabel: { show: false },
        monthLabel: { color: theme.muted, nameMap: "en" },
        dayLabel: { color: theme.muted, firstDay: 1, nameMap: "en" },
      },
      visualMap: {
        min: 0,
        max: Math.max(
          1,
          ...definition.series.flatMap((item) =>
            item.values.filter(
              (value): value is number =>
                value !== null && Number.isFinite(value),
            ),
          ),
        ),
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 10,
        inRange: { color: [theme.grid, theme.accent] },
        textStyle: { color: theme.muted },
      },
      series: definition.series.map((item, index) => ({
        id: item.id,
        name: item.label,
        type: "heatmap",
        coordinateSystem: "calendar",
        data: definition.labels.map((label, labelIndex) => [
          label,
          finiteValue(item.values[labelIndex] ?? null),
        ]),
        connectNulls: false,
        itemStyle: { color: theme.series[index % theme.series.length] },
      })),
    };
  }

  const cleanLabels = definition.labels.map((l) =>
    l
      .replace(/^projectbluefin\//, "")
      .replace(/^ublue-os\//, "")
      .replace(/^hive\//, ""),
  );

  if (isHorizontalBar) {
    return {
      ...common,
      legend: {
        data: definition.series.map((item) => item.label),
        textStyle: { color: theme.muted },
      },
      grid: {
        left: 12,
        right: 24,
        top: 32,
        bottom: 24,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: { color: theme.muted },
        axisLine: { lineStyle: { color: theme.border } },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      yAxis: {
        type: "category",
        data: cleanLabels,
        inverse: true,
        axisLabel: {
          color: theme.text,
          fontSize: 12,
        },
        axisLine: { lineStyle: { color: theme.border } },
        splitLine: { show: false },
      },
      series,
    };
  }

  return {
    ...common,
    legend: {
      data: definition.series.map((item) => item.label),
      textStyle: { color: theme.muted },
    },
    grid: {
      left: 16,
      right: 16,
      top: 32,
      bottom: definition.labels.length > 5 ? 70 : 40,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: cleanLabels,
      axisLabel: {
        color: theme.muted,
        interval: 0,
        rotate: definition.labels.length > 5 ? 35 : 0,
        fontSize: 11,
        formatter: (val: string) =>
          val.length > 16 ? `${val.slice(0, 14)}…` : val,
      },
      axisLine: { lineStyle: { color: theme.border } },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: theme.muted },
      axisLine: { lineStyle: { color: theme.border } },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    series,
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
        selectEChartsModules(definitionRef.current.kind, {
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
  }, [definition.kind, enoughData]);

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

  const isHorizontalBarChart = definition.kind === "grouped-bar";
  const dynamicHeight = isHorizontalBarChart
    ? `${Math.max(22, definition.labels.length * 28 + 60)}px`
    : undefined;

  return (
    <div
      ref={elementRef}
      className={styles.chartCanvas}
      style={
        dynamicHeight
          ? { height: dynamicHeight, minHeight: dynamicHeight }
          : undefined
      }
      role="img"
      aria-label={`${definition.title}. ${definition.currentValue} ${definition.unit}.`}
    />
  );
}
