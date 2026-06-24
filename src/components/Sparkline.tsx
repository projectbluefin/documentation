import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color — use named CSS colors or hex; CSS custom properties not supported in inline SVG */
  color?: string;
  /** Fill color for the area under the line. Defaults to 10% opacity of stroke color. Pass "none" to disable. */
  areaColor?: string;
}

/**
 * Zero-dependency inline SVG sparkline. Works in SSR/SSG contexts.
 * Normalizes data to fill the available height range.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 28,
  color = "#58a6ff",
  areaColor,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePts = pts.join(" ");
  const fill =
    areaColor === "none"
      ? "none"
      : (areaColor ?? "rgba(88, 166, 255, 0.10)");
  const area = `M ${pts[0]} L ${pts.slice(1).join(" L ")} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", overflow: "visible" }}
    >
      {fill !== "none" && <path d={area} fill={fill} />}
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
