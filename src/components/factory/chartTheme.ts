/**
 * Shared ECharts configuration for /factory.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * The five sparkline rules from ADR 0002's addendum bind these charts too. Two
 * of them are enforced here rather than left to each panel:
 *   - gapSafe() is the only sanctioned way to feed a series, so a missing
 *     sample can never arrive as 0.
 *   - animation is off, so prefers-reduced-motion needs no runtime branch.
 *
 * ECharts renders to canvas, where CSS custom properties do not resolve, so the
 * literals below are the dark-mode fallback. EChart.tsx reads the live
 * `--fx-*` tokens off the mounted element and registers them as an ECharts
 * theme, which is what makes a chart legible in light mode; these values only
 * apply where the tokens are absent. The test asserts the banned pairs stay
 * out.
 */

/** The token each palette slot is resolved from at runtime. */
export const FX_COLOR_TOKENS = {
  text: "--fx-text",
  muted: "--fx-text-muted",
  faint: "--fx-text-faint",
  grid: "--fx-border",
  surface: "--fx-surface",
  border: "--fx-border",
} as const;

export const FX_COLORS = {
  text: "#e6edf3",
  muted: "#8b949e",
  faint: "#808893",
  grid: "rgba(139, 148, 158, 0.16)",
  surface: "#161b22",
  border: "#30363d",
} as const;

/** Categorical palette. Index 0..5, wrapping. */
const CATEGORICAL = [
  "#58a6ff",
  "#bc8cff",
  "#39d2c0",
  "#f0883e",
  "#79b8ff",
  "#a371f7",
] as const;

/** Dash patterns paired with the palette so series differ by shape too. */
const DASHES: Array<number[] | undefined> = [
  undefined,
  [6, 3],
  [2, 3],
  [10, 4, 2, 4],
  [4, 2],
  [1, 3],
];

/** Severity as one hue at four intensities. Never hue-encoded, never red/green. */
export const FX_SEVERITY = {
  unknown: { color: "hsl(38, 6%, 45%)", glyph: "○", word: "Unknown" },
  ok: { color: "hsl(38, 26%, 55%)", glyph: "●", word: "Nominal" },
  watch: { color: "hsl(38, 80%, 56%)", glyph: "▲", word: "Watch" },
  alert: { color: "hsl(38, 100%, 68%)", glyph: "■", word: "Alert" },
} as const;

export type SeverityLevel = keyof typeof FX_SEVERITY;

export function seriesColor(i: number): string {
  return CATEGORICAL[i % CATEGORICAL.length];
}

export function seriesDash(i: number): number[] | undefined {
  return DASHES[i % DASHES.length];
}

/**
 * The only sanctioned way to build a series array.
 * undefined and NaN become null (a gap). A real 0 stays 0.
 */
export function gapSafe(
  values: Array<number | null | undefined>,
): Array<number | null> {
  return values.map((v) =>
    v === null || v === undefined || Number.isNaN(v) ? null : v,
  );
}

/**
 * Spread over every panel's option. Colours are deliberately absent: they come
 * from the runtime theme EChart.tsx registers, so a panel that says nothing
 * about colour follows the site's light/dark toggle.
 */
export const FX_CHART_THEME = {
  animation: false,
  backgroundColor: "transparent",
  textStyle: { fontSize: 12 },
  grid: { left: 48, right: 16, top: 28, bottom: 32, containLabel: true },
  tooltip: { trigger: "axis" },
  legend: { icon: "roundRect" },
} as const;

export interface FxPalette {
  text: string;
  muted: string;
  faint: string;
  grid: string;
  surface: string;
  border: string;
}

/**
 * An ECharts theme object built from resolved token values.
 *
 * Registered rather than merged into each option so a panel's own colour
 * choices still win — this only supplies what the panel left unsaid.
 */
export function fxEchartsTheme(palette: FxPalette): Record<string, unknown> {
  const axis = {
    axisLine: { lineStyle: { color: palette.border } },
    axisTick: { lineStyle: { color: palette.border } },
    axisLabel: { color: palette.muted },
    splitLine: { lineStyle: { color: palette.grid } },
    splitArea: { show: false },
  };
  return {
    backgroundColor: "transparent",
    textStyle: { color: palette.text },
    title: {
      textStyle: { color: palette.text },
      subtextStyle: { color: palette.muted },
    },
    categoryAxis: axis,
    valueAxis: axis,
    timeAxis: axis,
    logAxis: axis,
    legend: { textStyle: { color: palette.muted } },
    tooltip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      textStyle: { color: palette.text },
    },
  };
}

interface MinimalAxis {
  data?: Array<string | number>;
}

/** A heatmap datum: `[columnIndex, rowIndex, value]`, optionally with a label. */
export interface HeatCell {
  value: [number, number, number | null];
  text?: string;
}

interface MinimalSeries {
  name?: string;
  type?: string;
  data?: Array<number | null | undefined> | HeatCell[];
}

interface MinimalOption {
  xAxis?: MinimalAxis | MinimalAxis[];
  yAxis?: MinimalAxis | MinimalAxis[];
  series?: MinimalSeries[];
}

/**
 * A heatmap's rows are its y categories and its columns are its x categories,
 * so the generic category-by-series flattening below would emit `[x, y, v]`
 * triples instead of a readable table. Pivot it back into the grid a sighted
 * reader sees. An absent cell reads "no data" — never 0.
 */
function heatmapRows(
  opt: MinimalOption,
  series: MinimalSeries,
): Array<string[]> {
  const xAxis = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
  const yAxis = Array.isArray(opt.yAxis) ? opt.yAxis[0] : opt.yAxis;
  const cols = (xAxis?.data ?? []).map(String);
  const rowLabels = (yAxis?.data ?? []).map(String);
  const cells = new Map<string, string>();
  for (const cell of (series.data ?? []) as HeatCell[]) {
    if (!cell || !Array.isArray(cell.value)) continue;
    const [x, y, v] = cell.value;
    cells.set(
      `${x}:${y}`,
      cell.text ?? (v === null || v === undefined ? "no data" : String(v)),
    );
  }
  return [
    ["", ...cols],
    ...rowLabels.map((label, y) => [
      label,
      ...cols.map((_, x) => cells.get(`${x}:${y}`) ?? "no data"),
    ]),
  ];
}

/**
 * Flattens a chart option into rows for the <details> data table, so a chart is
 * never the sole carrier of a claim. A gap reads as "no data", not as 0.
 */
export function toTableRows(opt: MinimalOption): Array<string[]> {
  const series = opt.series ?? [];
  const heat = series.find((s) => s.type === "heatmap");
  if (heat) return heatmapRows(opt, heat);

  const axis = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
  const categories = (axis?.data ?? []).map(String);
  const header = ["", ...series.map((s, i) => s.name ?? `Series ${i + 1}`)];
  const rows = categories.map((c, r) => [
    c,
    ...series.map((s) => {
      const v = (s.data as Array<number | null | undefined> | undefined)?.[r];
      return v === null || v === undefined || Number.isNaN(v as number)
        ? "no data"
        : String(v);
    }),
  ]);
  return [header, ...rows];
}
