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
 * Colours are literals rather than var(--fx-*) because ECharts renders to
 * canvas, where CSS custom properties do not resolve. They are kept in sync
 * with tokens.css by hand; the test asserts the banned pairs stay out.
 */

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

export const FX_CHART_THEME = {
  animation: false,
  backgroundColor: "transparent",
  textStyle: { color: FX_COLORS.text, fontSize: 12 },
  grid: { left: 48, right: 16, top: 28, bottom: 32, containLabel: true },
  tooltip: {
    trigger: "axis",
    backgroundColor: FX_COLORS.surface,
    borderColor: FX_COLORS.border,
    textStyle: { color: FX_COLORS.text },
  },
  legend: { textStyle: { color: FX_COLORS.muted }, icon: "roundRect" },
} as const;

interface MinimalOption {
  xAxis?:
    | { data?: Array<string | number> }
    | Array<{ data?: Array<string | number> }>;
  series?: Array<{ name?: string; data?: Array<number | null | undefined> }>;
}

/**
 * Flattens a chart option into rows for the <details> data table, so a chart is
 * never the sole carrier of a claim. A gap reads as "no data", not as 0.
 */
export function toTableRows(opt: MinimalOption): Array<string[]> {
  const axis = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
  const categories = (axis?.data ?? []).map(String);
  const series = opt.series ?? [];
  const header = ["", ...series.map((s, i) => s.name ?? `Series ${i + 1}`)];
  const rows = categories.map((c, r) => [
    c,
    ...series.map((s) => {
      const v = s.data?.[r];
      return v === null || v === undefined || Number.isNaN(v as number)
        ? "no data"
        : String(v);
    }),
  ]);
  return [header, ...rows];
}
