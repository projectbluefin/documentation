import React from "react";

export type SparklineVariant = "line" | "winloss" | "bars" | "bullet";

/**
 * How the value axis is derived.
 * - "minmax" shows shape: the lowest point sits at the bottom of the box.
 * - "zero" shows magnitude: the baseline is always 0.
 * An explicit `domain` overrides both, and is required for small multiples —
 * per-series autoscaling makes every cell of a grid look identical.
 */
export type SparklineScale = "minmax" | "zero";

/** `null` marks a gap. Gaps are drawn as gaps, never interpolated or coerced to 0. */
export type SparklinePoint = number | null | undefined;

interface SparklineProps {
  data: SparklinePoint[];
  variant?: SparklineVariant;
  scale?: SparklineScale;
  /** Shared [min, max]. Pass the same value across a grid of small multiples. */
  domain?: [number, number];
  width?: number;
  height?: number;
  /**
   * Stroke and fill colour, applied as the CSS `color` property on the `<svg>`
   * so the shapes can paint with `currentColor`. Any CSS colour works,
   * including a custom property such as `var(--fx-accent)` — which would *not*
   * resolve if it were written into an SVG presentation attribute.
   */
  color?: string;
  /** Area fill under the line. "none" or omitted disables it. */
  areaColor?: string;
  /** Applied to the <svg>, so colors can come from a CSS module instead of props. */
  className?: string;
  /** Filled dot on the last point, so the eye lands on "now". */
  showEnd?: boolean;
  /** Open dots on the lowest and highest points. */
  showExtremes?: boolean;
  /** Shaded horizontal band marking an expected range, in data units. */
  band?: [number, number];
  /** Reference marker. Drawn as a tick in "bullet", a horizontal rule otherwise. */
  target?: number;
  /** Below this many real points, render `emptyLabel` instead of a misleading line. */
  minPoints?: number;
  /** Shown when there is not enough data. Without it the component renders nothing. */
  emptyLabel?: string;
  /**
   * Text alternative. When supplied the graphic becomes role="img" and is announced;
   * when omitted it stays aria-hidden, which is correct only if an adjacent number
   * already states the value and trend.
   */
  label?: string;
}

function resolveDomain(
  values: number[],
  scale: SparklineScale,
  domain?: [number, number],
): [number, number] {
  if (domain) return domain;
  const max = Math.max(...values);
  const min = scale === "zero" ? Math.min(0, ...values) : Math.min(...values);
  return min === max ? [min, max + 1] : [min, max];
}

/** Contiguous runs of real points, so a gap breaks the line instead of crossing it. */
function segments(
  data: SparklinePoint[],
): Array<Array<{ i: number; v: number }>> {
  const out: Array<Array<{ i: number; v: number }>> = [];
  let run: Array<{ i: number; v: number }> = [];
  data.forEach((v, i) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      run.push({ i, v });
    } else if (run.length) {
      out.push(run);
      run = [];
    }
  });
  if (run.length) out.push(run);
  return out;
}

/**
 * Zero-dependency inline SVG sparkline. Renders during SSG — no refs, effects or
 * window access. Sized to sit inline with text, per Tufte's "word-sized graphic".
 *
 * A sparkline should never appear without its current value printed beside it:
 * the line carries the trend, the number carries the scale.
 */
export default function Sparkline({
  data,
  variant = "line",
  scale = "minmax",
  domain,
  width = 120,
  height = 28,
  color = "currentColor",
  areaColor,
  className,
  showEnd = false,
  showExtremes = false,
  band,
  target,
  minPoints = 2,
  emptyLabel,
  label,
}: SparklineProps) {
  const real = (data ?? []).filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );

  // A bullet graph plots a single current value against its target, so it needs
  // one point; every other variant needs at least two to imply a trend.
  const required = variant === "bullet" ? 1 : Math.max(minPoints, 2);
  if (real.length < required) {
    return emptyLabel ? <span className={className}>{emptyLabel}</span> : null;
  }

  const pad = 2;
  const [lo, hi] = resolveDomain(real, scale, domain);
  const span = hi - lo || 1;
  const y = (v: number) =>
    height -
    pad -
    ((Math.min(Math.max(v, lo), hi) - lo) / span) * (height - pad * 2);

  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  const svgProps = {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    className,
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      overflow: "visible" as const,
      // `color` is a CSS property, so a var() token resolves here. The shapes
      // below paint with currentColor; an SVG presentation attribute such as
      // stroke="var(--x)" would not resolve and would render nothing.
      color,
    },
    ...a11y,
  };

  const bandRect = band ? (
    <rect
      x={0}
      y={Math.min(y(band[0]), y(band[1]))}
      width={width}
      height={Math.max(Math.abs(y(band[0]) - y(band[1])), 1)}
      fill="currentColor"
      opacity={0.12}
    />
  ) : null;

  if (variant === "bullet") {
    const value = real[real.length - 1];
    const mid = height / 2;
    const barH = Math.max(height * 0.4, 4);
    const x = (v: number) =>
      ((Math.min(Math.max(v, lo), hi) - lo) / span) * width;
    return (
      <svg {...svgProps}>
        {label ? <title>{label}</title> : null}
        {band ? (
          <rect
            x={x(band[0])}
            y={mid - barH / 2}
            width={Math.max(x(band[1]) - x(band[0]), 1)}
            height={barH}
            fill="currentColor"
            opacity={0.12}
          />
        ) : (
          <rect
            x={0}
            y={mid - barH / 2}
            width={width}
            height={barH}
            fill="currentColor"
            opacity={0.1}
          />
        )}
        <rect
          x={0}
          y={mid - barH / 4}
          width={Math.max(x(value), 1)}
          height={barH / 2}
          fill="currentColor"
        />
        {typeof target === "number" ? (
          <line
            x1={x(target)}
            x2={x(target)}
            y1={mid - barH * 0.7}
            y2={mid + barH * 0.7}
            stroke="currentColor"
            strokeWidth={2}
          />
        ) : null}
      </svg>
    );
  }

  if (variant === "winloss" || variant === "bars") {
    const slot = width / data.length;
    const barW = Math.max(slot * 0.65, 1);
    const mid = height / 2;
    return (
      <svg {...svgProps}>
        {label ? <title>{label}</title> : null}
        {variant === "bars" ? bandRect : null}
        {data.map((v, i) => {
          if (typeof v !== "number" || !Number.isFinite(v)) return null;
          const x = i * slot + (slot - barW) / 2;
          if (variant === "winloss") {
            const win = v > 0;
            const h = height * 0.32;
            return (
              <rect
                key={i}
                x={x}
                y={win ? mid - h : mid}
                width={barW}
                height={h}
                fill="currentColor"
                opacity={win ? 1 : 0.4}
              />
            );
          }
          const top = y(v);
          return (
            <rect
              key={i}
              x={x}
              y={top}
              width={barW}
              height={Math.max(height - pad - top, 1)}
              fill="currentColor"
            />
          );
        })}
      </svg>
    );
  }

  const x = (i: number) =>
    data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
  const runs = segments(data);
  const fill =
    areaColor === "none" || areaColor === undefined ? "transparent" : areaColor;

  let minPt = runs[0][0];
  let maxPt = runs[0][0];
  runs.forEach((run) =>
    run.forEach((p) => {
      if (p.v < minPt.v) minPt = p;
      if (p.v > maxPt.v) maxPt = p;
    }),
  );
  const lastRun = runs[runs.length - 1];
  const endPt = lastRun[lastRun.length - 1];

  return (
    <svg {...svgProps}>
      {label ? <title>{label}</title> : null}
      {bandRect}
      {typeof target === "number" ? (
        <line
          x1={0}
          x2={width}
          y1={y(target)}
          y2={y(target)}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.6}
        />
      ) : null}
      {fill !== "transparent"
        ? runs
            .filter((run) => run.length > 1)
            .map((run, k) => (
              <path
                key={k}
                d={`M ${run.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" L ")} L ${x(run[run.length - 1].i).toFixed(1)},${height} L ${x(run[0].i).toFixed(1)},${height} Z`}
                fill={fill}
              />
            ))
        : null}
      {runs
        .filter((run) => run.length > 1)
        .map((run, k) => (
          <polyline
            key={k}
            points={run
              .map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      {showExtremes && minPt.i !== maxPt.i ? (
        <>
          <circle
            cx={x(minPt.i)}
            cy={y(minPt.v)}
            r={1.8}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
          <circle
            cx={x(maxPt.i)}
            cy={y(maxPt.v)}
            r={1.8}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
          />
        </>
      ) : null}
      {showEnd ? (
        <circle cx={x(endPt.i)} cy={y(endPt.v)} r={2.2} fill="currentColor" />
      ) : null}
    </svg>
  );
}
