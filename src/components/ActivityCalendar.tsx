import React from "react";
import styles from "./ActivityCalendar.module.css";

/** One observation. `date` is an ISO `yyyy-mm-dd` calendar day, interpreted as UTC. */
export interface ActivityDay {
  date: string;
  value: number;
}

export interface ActivityCalendarProps {
  /**
   * Observations, in any order. Repeated dates for the same day are summed.
   * A day absent from this array is *missing*, which renders differently from a
   * day present with `value: 0` — see the module comment.
   */
  data: ActivityDay[];
  /** Number of week columns. Clamped to 1-53; 53 covers a full year. */
  weeks?: number;
  /** Last day shown, ISO `yyyy-mm-dd` UTC. Defaults to today in UTC. */
  endDate?: string;
  /** Discrete colour steps including the zero step. Clamped to 2-9. */
  levels?: number;
  /** Base hue. Intensity is opacity of this one colour, never a second hue. */
  color?: string;
  /**
   * Shared upper bound for the colour scale. Pass the same value to every
   * calendar in a grid; without it each one autoscales and they stop being
   * comparable. Defaults to the largest value in the window.
   */
  maxValue?: number;
  /**
   * Text alternative. When supplied the graphic becomes `role="img"` and is
   * announced as one summarizing sentence; when omitted it stays `aria-hidden`,
   * which is correct only if adjacent prose already states the same facts.
   */
  label?: string;
  /** Shown when the window holds too little data. Without it nothing renders. */
  emptyLabel?: string;
  /** Days with real data required before the grid draws at all. */
  minDays?: number;
  /** Noun for the per-cell tooltip, e.g. "builds" -> "2026-03-04: 12 builds". */
  unit?: string;
  cellSize?: number;
  cellGap?: number;
  weekdayLabels?: boolean;
  monthLabels?: boolean;
  /** Draw the "Less / More" swatch key beneath the grid. */
  legend?: boolean;
  /** Applied to the `<svg>` and to the empty-state `<span>`. */
  className?: string;
}

const MS_PER_DAY = 86_400_000;

/** Fixed English names: `toLocaleString` varies with the build machine's ICU data. */
const MONTH_NAMES = [
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

/** Parse `yyyy-mm-dd` as UTC midnight. Returns null for anything else, including 2026-02-30. */
function parseDay(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return null;
  const [, y, m, d] = match;
  const ms = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (!Number.isFinite(ms)) return null;
  const back = new Date(ms);
  if (
    back.getUTCFullYear() !== Number(y) ||
    back.getUTCMonth() !== Number(m) - 1 ||
    back.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return ms;
}

function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Discrete bucket for a value. 0 and below sit on step 0; every positive value
 * sits on step 1..levels-1, so "a little" is never rendered as "none".
 * Boundaries are `max * k / (levels - 1)`, taken inclusively from below:
 * with levels=5 and max=100, 25->1, 26->2, 50->2, 51->3, 75->3, 76->4, 100->4.
 */
export function bucket(value: number, max: number, levels: number): number {
  const steps = Math.max(levels - 1, 1);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!(max > 0)) return steps;
  return Math.min(Math.max(Math.ceil((value / max) * steps), 1), steps);
}

/** Opacity ramp for one hue. Step 0 is faint but solid; it means "zero", not "unknown". */
function levelOpacity(level: number, levels: number): number {
  const steps = Math.max(levels - 1, 1);
  if (level <= 0) return 0.12;
  return Math.round((0.3 + (level / steps) * 0.7) * 100) / 100;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/**
 * GitHub-contribution-graph-style heatmap: one `<rect>` per day, weeks as
 * columns, weekdays as rows. Hand-rolled inline SVG with no dependencies, and
 * safe to render during SSG - no refs, no effects, no `window`.
 *
 * Three properties are deliberate and load-bearing:
 *
 * 1. **Discrete steps, one hue.** Intensity is the opacity of `color`. A
 *    continuous ramp loses its steps to JPEG artefacts the moment the panel is
 *    screenshotted, and two hues lose their order to a colour-blind reader.
 * 2. **Missing is not zero.** A day with no observation renders as an unfilled
 *    dashed outline; a day observed at zero renders as a solid faint square.
 *    The difference is shape as well as colour, so it survives greyscale, and
 *    the `<title>` says "no data" rather than "0".
 * 3. **All date maths is UTC.** The same props produce the same markup on every
 *    build machine regardless of its timezone.
 *
 * Days after `endDate` in the final column are omitted rather than drawn as
 * missing: the future is not a gap in the record.
 */
export default function ActivityCalendar({
  data,
  weeks = 53,
  endDate,
  levels = 5,
  color = "#58a6ff",
  maxValue,
  label,
  emptyLabel,
  minDays = 1,
  unit = "",
  cellSize = 11,
  cellGap = 3,
  weekdayLabels = true,
  monthLabels = true,
  legend = false,
  className,
}: ActivityCalendarProps) {
  const columns = clamp(Math.floor(weeks) || 53, 1, 53);
  const steps = clamp(Math.floor(levels) || 5, 2, 9);

  const endMs = (endDate ? parseDay(endDate) : null) ?? todayUtc();

  // The last column is the week containing endDate, Sunday-first.
  const lastColumnStart = endMs - new Date(endMs).getUTCDay() * MS_PER_DAY;
  const startMs = lastColumnStart - (columns - 1) * 7 * MS_PER_DAY;

  const totals = new Map<string, number>();
  for (const entry of data ?? []) {
    if (!entry || typeof entry.date !== "string") continue;
    if (!Number.isFinite(entry.value)) continue;
    const ms = parseDay(entry.date);
    if (ms === null || ms < startMs || ms > endMs) continue;
    const key = formatDay(ms);
    totals.set(key, (totals.get(key) ?? 0) + entry.value);
  }

  if (totals.size < Math.max(minDays, 1)) {
    return emptyLabel ? (
      <span className={className ?? styles.empty}>{emptyLabel}</span>
    ) : null;
  }

  const observed = Array.from(totals.values());
  const domainMax =
    typeof maxValue === "number" && Number.isFinite(maxValue) && maxValue > 0
      ? maxValue
      : Math.max(0, ...observed);

  const size = Math.max(Math.floor(cellSize) || 11, 2);
  const gap = Math.max(Math.floor(cellGap) || 0, 0);
  const stride = size + gap;
  const padLeft = weekdayLabels ? size * 2.6 : 0;
  const padTop = monthLabels ? 14 : 0;
  const legendH = legend ? size + 10 : 0;
  const gridW = columns * stride - gap;
  const gridH = 7 * stride - gap;
  const width = Math.round(padLeft + gridW);
  const height = Math.round(padTop + gridH + legendH);

  const cells: React.ReactElement[] = [];
  let total = 0;
  let zeroDays = 0;
  let missingDays = 0;
  let busiest: { date: string; value: number } | null = null;

  for (let col = 0; col < columns; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const ms = startMs + (col * 7 + row) * MS_PER_DAY;
      if (ms > endMs) continue;
      const key = formatDay(ms);
      const value = totals.get(key);
      const present = value !== undefined;
      const x = Math.round(padLeft + col * stride);
      const y = Math.round(padTop + row * stride);

      if (!present) {
        missingDays += 1;
        cells.push(
          <rect
            key={key}
            x={x}
            y={y}
            width={size}
            height={size}
            rx={2}
            fill="none"
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="2 2"
          >
            <title>{`${key}: no data`}</title>
          </rect>,
        );
        continue;
      }

      total += value;
      if (value <= 0) zeroDays += 1;
      if (!busiest || value > busiest.value) busiest = { date: key, value };
      const level = bucket(value, domainMax, steps);
      cells.push(
        <rect
          key={key}
          x={x}
          y={y}
          width={size}
          height={size}
          rx={2}
          fill={color}
          fillOpacity={levelOpacity(level, steps)}
        >
          <title>{`${key}: ${value}${unit ? ` ${unit}` : ""}`}</title>
        </rect>,
      );
    }
  }

  const months: React.ReactElement[] = [];
  if (monthLabels) {
    let previous = new Date(startMs).getUTCMonth();
    for (let col = 1; col < columns; col += 1) {
      const columnStart = startMs + col * 7 * MS_PER_DAY;
      const month = new Date(columnStart).getUTCMonth();
      if (month !== previous) {
        months.push(
          <text
            key={`m${col}`}
            x={Math.round(padLeft + col * stride)}
            y={padTop - 4}
            className={styles.axisLabel}
          >
            {MONTH_NAMES[month]}
          </text>,
        );
        previous = month;
      }
    }
  }

  const weekdays: React.ReactElement[] = [];
  if (weekdayLabels) {
    (
      [
        [1, "Mon"],
        [3, "Wed"],
        [5, "Fri"],
      ] as const
    ).forEach(([row, name]) =>
      weekdays.push(
        <text
          key={name}
          x={0}
          y={Math.round(padTop + row * stride + size * 0.85)}
          className={styles.axisLabel}
        >
          {name}
        </text>,
      ),
    );
  }

  const legendMarks: React.ReactElement[] = [];
  if (legend) {
    const baseY = padTop + gridH + 8;
    const swatchX = padLeft + 30;
    legendMarks.push(
      <text
        key="less"
        x={padLeft}
        y={Math.round(baseY + size * 0.85)}
        className={styles.axisLabel}
      >
        Less
      </text>,
    );
    for (let level = 0; level < steps; level += 1) {
      legendMarks.push(
        <rect
          key={`s${level}`}
          x={Math.round(swatchX + level * stride)}
          y={Math.round(baseY)}
          width={size}
          height={size}
          rx={2}
          fill={color}
          fillOpacity={levelOpacity(level, steps)}
        />,
      );
    }
    legendMarks.push(
      <rect
        key="s-missing"
        x={Math.round(swatchX + (steps + 0.5) * stride)}
        y={Math.round(baseY)}
        width={size}
        height={size}
        rx={2}
        fill="none"
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={1}
        strokeDasharray="2 2"
      />,
    );
    legendMarks.push(
      <text
        key="more"
        x={Math.round(swatchX + (steps + 1.8) * stride)}
        y={Math.round(baseY + size * 0.85)}
        className={styles.axisLabel}
      >
        More / no data
      </text>,
    );
  }

  // One sentence, not 371 announcements: with role="img" the cell <title>
  // elements stay out of the accessibility tree and serve only native tooltips.
  const summary = label
    ? [
        label,
        `${total}${unit ? ` ${unit}` : ""} across ${totals.size - zeroDays} active ${plural(totals.size - zeroDays, "day")}`,
        `${zeroDays} ${plural(zeroDays, "day")} with none`,
        `${missingDays} ${plural(missingDays, "day")} without data`,
        busiest
          ? `busiest ${busiest.date} with ${busiest.value}${unit ? ` ${unit}` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(". ") + "."
    : undefined;

  const a11y = summary
    ? ({ role: "img", "aria-label": summary } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={
        className ? `${styles.calendar} ${className}` : styles.calendar
      }
      {...a11y}
    >
      {summary ? <title>{summary}</title> : null}
      {months}
      {weekdays}
      {cells}
      {legendMarks}
    </svg>
  );
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}

/** Today at UTC midnight. Only reached when `endDate` is omitted. */
function todayUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
