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

export const FX_CAT_TOKENS = [
  "--fx-cat-1",
  "--fx-cat-2",
  "--fx-cat-3",
  "--fx-cat-4",
  "--fx-cat-5",
  "--fx-cat-6",
] as const;

/**
 * Dark-surface fallback for the `--fx-cat-*` ramp in tokens.css.
 *
 * One ramp through the Bluefin blues, anchored on the `#4285f4` brand accent
 * (`/press-kit`; `--color-blue` in `projectbluefin/website`). This copy only
 * applies where the tokens are absent — a chart mounted outside `.fxRoot`.
 */
const CATEGORICAL = [
  "#4285f4",
  "#c7d7ff",
  "#60a5fa",
  "#8a97f7",
  "#5c7bd1",
  "#a2b5fa",
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

export const FX_SEV_TOKENS = {
  unknown: "--fx-sev-unknown",
  ok: "--fx-sev-ok",
  watch: "--fx-sev-watch",
  alert: "--fx-sev-alert",
} as const;

/**
 * Severity as one hue at four intensities, plus a glyph and a word.
 *
 * The hue is the brand's. The Wolves cinematic names its accent `--wc-gold` and
 * then sets it to blue; that is the design language, and a traffic-light amber
 * grid sitting inside it reads as a different product. Colours here are the
 * dark-surface fallback for `--fx-sev-*`; the glyph and word are the meaning and
 * are never resolved from CSS.
 */
export const FX_SEVERITY = {
  unknown: { color: "hsl(217, 8%, 52%)", glyph: "○", word: "Unknown" },
  ok: { color: "hsl(217, 89%, 61%)", glyph: "●", word: "Nominal" },
  watch: { color: "hsl(217, 94%, 74%)", glyph: "▲", word: "Watch" },
  alert: { color: "hsl(217, 100%, 86%)", glyph: "■", word: "Alert" },
} as const;

export type SeverityLevel = keyof typeof FX_SEVERITY;

export function seriesColor(i: number): string {
  return CATEGORICAL[i % CATEGORICAL.length];
}

export function seriesDash(i: number): number[] | undefined {
  return DASHES[i % DASHES.length];
}

/**
 * Parse any colour this module can hand out into sRGB 0–255 components.
 *
 * `getComputedStyle` serialises a custom property to `rgb()` or hex even when
 * `tokens.css` declared it as `hsl()`, so a helper that only understood one
 * notation silently did nothing — which is how the heatmap shipped white labels
 * on a near-white swatch.
 */
function toRgb(color: string): [number, number, number] | null {
  const value = color.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    const n = parseInt(digits, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return [parts[0], parts[1], parts[2]];
    }
  }

  const hsl = /^hsla?\(([^)]+)\)$/i.exec(value);
  if (hsl) {
    const [h, s, l] = hsl[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((p) => Number(p.replace("%", "")));
    if (![h, s, l].every(Number.isFinite)) return null;
    const chroma = (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - chroma / 2;
    const sector = Math.floor((((h % 360) + 360) % 360) / 60);
    const rgbPrime = [
      [chroma, x, 0],
      [x, chroma, 0],
      [0, chroma, x],
      [0, x, chroma],
      [x, 0, chroma],
      [chroma, 0, x],
    ][sector];
    return rgbPrime.map((c) => Math.round((c + m) * 255)) as [
      number,
      number,
      number,
    ];
  }

  return null;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance([r, g, b]: [number, number, number]): number {
  const linear = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

const INK_DARK = "#0b1220";
const INK_LIGHT = "#f5f8ff";

/**
 * Ink that stays readable on a palette swatch.
 *
 * The ramps run from a near-navy to a near-white blue, crossing the point where
 * white stops being the higher-contrast choice. 0.45 relative luminance is that
 * crossing for this pair of inks.
 */
export function readableInk(color: string): string {
  const rgb = toRgb(color);
  if (!rgb) return INK_LIGHT;
  return luminance(rgb) >= 0.45 ? INK_DARK : INK_LIGHT;
}

/**
 * The same colour at a given alpha.
 *
 * Appending two hex digits to a token only works while the token happens to be
 * hex; `factory-theming.test.js` bans that concatenation outright. This handles
 * whatever notation the token resolved to.
 */
export function withAlpha(color: string, alpha: number): string {
  const rgb = toRgb(color);
  return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : color;
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

export interface FxTheme {
  palette: FxPalette;
  /** The `--fx-cat-*` ramp, in order. */
  categorical: string[];
  /** `--fx-sev-*` resolved, with the glyph and word carried over unchanged. */
  severity: Record<
    SeverityLevel,
    { color: string; glyph: string; word: string }
  >;
}

/** What a chart paints with before it is mounted, or outside `.fxRoot`. */
export const FX_FALLBACK_THEME: FxTheme = {
  palette: { ...FX_COLORS },
  categorical: [...CATEGORICAL],
  severity: {
    unknown: { ...FX_SEVERITY.unknown },
    ok: { ...FX_SEVERITY.ok },
    watch: { ...FX_SEVERITY.watch },
    alert: { ...FX_SEVERITY.alert },
  },
};

/**
 * Read the whole `--fx-*` chart palette off a mounted element.
 *
 * Canvas cannot resolve CSS custom properties, which is why the ramps used to
 * be duplicated as literals here and drift from `tokens.css`. `getComputedStyle`
 * resolves them fine, so `tokens.css` is the single source and this is the only
 * bridge. Outside `.fxRoot` the tokens are absent and the fallback stands in.
 */
export function resolveFxTheme(el: HTMLElement): FxTheme {
  const cs = getComputedStyle(el);
  const read = (token: string, fallback: string): string =>
    cs.getPropertyValue(token).trim() || fallback;

  const severity = {} as FxTheme["severity"];
  for (const level of Object.keys(FX_SEV_TOKENS) as SeverityLevel[]) {
    severity[level] = {
      ...FX_SEVERITY[level],
      color: read(FX_SEV_TOKENS[level], FX_SEVERITY[level].color),
    };
  }

  return {
    palette: {
      text: read(FX_COLOR_TOKENS.text, FX_COLORS.text),
      muted: read(FX_COLOR_TOKENS.muted, FX_COLORS.muted),
      faint: read(FX_COLOR_TOKENS.faint, FX_COLORS.faint),
      grid: read(FX_COLOR_TOKENS.grid, FX_COLORS.grid),
      surface: read(FX_COLOR_TOKENS.surface, FX_COLORS.surface),
      border: read(FX_COLOR_TOKENS.border, FX_COLORS.border),
    },
    categorical: FX_CAT_TOKENS.map((token, i) => read(token, CATEGORICAL[i])),
    severity,
  };
}

/**
 * An ECharts theme object built from a resolved `FxTheme`.
 *
 * Registered rather than merged into each option so a panel's own colour
 * choices still win — this only supplies what the panel left unsaid. `color` is
 * the series palette, so a panel that names no colour is on the brand ramp in
 * both themes for free.
 */
export function fxEchartsTheme(theme: FxTheme): Record<string, unknown> {
  const { palette } = theme;
  const axis = {
    axisLine: { lineStyle: { color: palette.border } },
    axisTick: { lineStyle: { color: palette.border } },
    axisLabel: { color: palette.muted },
    splitLine: { lineStyle: { color: palette.grid } },
    splitArea: { show: false },
  };
  return {
    color: theme.categorical,
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
