// Dependency-free SVG rendering for first-party countme charts and badges.
// The Worker runtime has no DOM, so every chart is assembled as a string.
//
// Published copy carries no host, URL, or service description: these panels
// render on public pages, and a panel explaining our internals is an
// infrastructure disclosure wearing an error message.

import { FIRST_PARTY_PENDING_REASON } from "../../scripts/lib/countme-sources.mjs";

const PALETTE = {
  bg: "#0d1117",
  panel: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  muted: "#8b949e",
  accent: "#58a6ff",
};

export const REPO_ACCENTS = {
  bluefin: "#58a6ff",
  "bluefin-lts": "#bc8cff",
  dakota: "#39d2c0",
  utah: "#f0883e",
  server: "#7ee787",
};

export const REPO_LABELS = {
  bluefin: "Bluefin",
  "bluefin-lts": "Bluefin LTS",
  dakota: "Dakota",
  utah: "Utah",
  server: "Server",
};

const FONT = "Inter, Segoe UI, Arial, sans-serif";
const WIDTH = 1280;
const HEIGHT = 720;
const PLOT_LEFT = 200;
const PLOT_RIGHT = 1210;
const PLOT_TOP = 280;
const PLOT_BOTTOM = 600;
const GRID_LINES = 4;
const DEFAULT_UNIT = "weekly active systems";
const FOOTER = "Project Bluefin countme";

export function repoLabel(repo) {
  return REPO_LABELS[repo] || String(repo);
}

export function repoAccent(repo) {
  return REPO_ACCENTS[repo] || PALETTE.accent;
}

export function formatCount(value) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return (
    sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/gu, ",")
  );
}

function escapeXml(value) {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Weekly points for one repo, oldest first. A week whose repo key is absent or
 * non-numeric is a gap and carries `value: null`; a recorded 0 stays 0.
 */
export function buildSeries(dataset, repo) {
  const weeks = dataset && Array.isArray(dataset.weeks) ? dataset.weeks : [];
  return weeks
    .filter((entry) => entry && typeof entry.week === "string")
    .slice()
    .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0))
    .map((entry) => {
      const raw = entry[repo];
      const value =
        typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      return { week: entry.week, value };
    });
}

/** Runs of consecutive recorded weeks. A gap ends a run; it is never bridged. */
function buildSegments(points) {
  const segments = [];
  let current = null;

  for (const point of points) {
    if (point.value === null) {
      current = null;
      continue;
    }
    if (!current) {
      current = [];
      segments.push(current);
    }
    current.push(point);
  }

  return segments;
}

export function latestPoint(series) {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (series[index].value !== null) return series[index];
  }
  return null;
}

function scaleBounds(values) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad =
    rawMax === rawMin
      ? Math.max(1, Math.abs(rawMax) * 0.1)
      : (rawMax - rawMin) * 0.12;

  let min = rawMin - pad;
  let max = rawMax + pad;
  if (rawMin >= 0 && min < 0) min = 0;

  // Counts are whole systems. A range narrower than one gridline per unit
  // would print the same rounded number on every axis label.
  if (max - min < GRID_LINES) {
    min = Math.round((rawMin + rawMax) / 2) - GRID_LINES / 2;
    if (rawMin >= 0 && min < 0) min = 0;
    max = min + GRID_LINES;
  }

  return { min, max };
}

function chrome(ariaLabel) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(ariaLabel)}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PALETTE.bg}"/>
  <rect x="30" y="30" width="1220" height="660" rx="12" fill="${PALETTE.panel}" stroke="${PALETTE.border}" stroke-width="2"/>`;
}

function datasetUnit(dataset) {
  return dataset && typeof dataset.unit === "string" && dataset.unit
    ? dataset.unit
    : DEFAULT_UNIT;
}

/**
 * Chart of one repo's weekly series. Fewer than two recorded weeks cannot make
 * an honest line, so that case renders an accumulating-data panel.
 */
export function renderRepoChartSvg(dataset, repo) {
  const series = buildSeries(dataset, repo).map((point, index) => ({
    ...point,
    index,
  }));
  const recorded = series.filter((point) => point.value !== null);

  if (recorded.length < 2) {
    return renderAccumulatingSvg(repo, recorded.length);
  }

  const label = repoLabel(repo);
  const accent = repoAccent(repo);
  const unit = datasetUnit(dataset);
  const current = recorded[recorded.length - 1];
  const currentText = formatCount(current.value);
  const { min, max } = scaleBounds(recorded.map((point) => point.value));
  const span = max - min;
  const lastIndex = series.length - 1;

  const x = (index) =>
    round2(PLOT_LEFT + (index / lastIndex) * (PLOT_RIGHT - PLOT_LEFT));
  const y = (value) =>
    round2(PLOT_BOTTOM - ((value - min) / span) * (PLOT_BOTTOM - PLOT_TOP));

  const paths = buildSegments(series)
    .map((segment) => {
      if (segment.length === 1) {
        const only = segment[0];
        return `  <circle cx="${x(only.index)}" cy="${y(only.value)}" r="6" fill="${accent}"/>`;
      }
      const d = segment
        .map(
          (point, offset) =>
            `${offset === 0 ? "M" : "L"}${x(point.index)} ${y(point.value)}`,
        )
        .join(" ");
      return `  <path d="${d}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("\n");

  const grid = Array.from({ length: GRID_LINES + 1 }, (_, step) => {
    const value = min + (span * step) / GRID_LINES;
    const gy = round2(
      PLOT_BOTTOM - (step / GRID_LINES) * (PLOT_BOTTOM - PLOT_TOP),
    );
    return `  <line x1="${PLOT_LEFT}" y1="${gy}" x2="${PLOT_RIGHT}" y2="${gy}" stroke="${PALETTE.border}" stroke-width="1"/>
  <text x="${PLOT_LEFT - 20}" y="${gy + 7}" text-anchor="end" fill="${PALETTE.muted}" font-size="20" font-family="${FONT}">${escapeXml(formatCount(value))}</text>`;
  }).join("\n");

  const gapCount = series.length - recorded.length;
  const gapNote =
    gapCount > 0
      ? `${gapCount} week${gapCount === 1 ? "" : "s"} without data shown as gaps`
      : `${series.length} weeks tracked`;

  const ariaLabel = `${label} ${unit}: current ${currentText} for the week of ${current.week}`;

  return `${chrome(ariaLabel)}
  <text x="70" y="100" fill="${PALETTE.text}" font-size="38" font-family="${FONT}">${escapeXml(label)} — ${escapeXml(unit)}</text>
  <text x="70" y="190" fill="${accent}" font-size="68" font-family="${FONT}" font-weight="700">${escapeXml(currentText)}</text>
  <text x="70" y="232" fill="${PALETTE.muted}" font-size="24" font-family="${FONT}">current, week of ${escapeXml(current.week)} · ${escapeXml(gapNote)}</text>
${grid}
${paths}
  <circle cx="${x(current.index)}" cy="${y(current.value)}" r="8" fill="${accent}" stroke="${PALETTE.panel}" stroke-width="3"/>
  <text x="${PLOT_LEFT}" y="640" fill="${PALETTE.muted}" font-size="20" font-family="${FONT}">${escapeXml(series[0].week)}</text>
  <text x="${PLOT_RIGHT}" y="640" text-anchor="end" fill="${PALETTE.muted}" font-size="20" font-family="${FONT}">${escapeXml(series[lastIndex].week)}</text>
  <text x="70" y="678" fill="${PALETTE.muted}" font-size="18" font-family="${FONT}">${FOOTER}</text>
</svg>`;
}

/**
 * Shown when a repo has fewer than two recorded weeks, including when nothing
 * has been recorded at all.
 */
export function renderAccumulatingSvg(repo, pointCount) {
  const label = repoLabel(repo);
  const accent = repoAccent(repo);
  const plural = pointCount === 1 ? "point" : "points";
  const ariaLabel = `${label} accumulating data, ${pointCount} weekly data ${plural} recorded`;

  return `${chrome(ariaLabel)}
  <text x="70" y="120" fill="${PALETTE.text}" font-size="40" font-family="${FONT}">${escapeXml(label)} — accumulating data</text>
  <text x="70" y="190" fill="${PALETTE.muted}" font-size="28" font-family="${FONT}">${escapeXml(FIRST_PARTY_PENDING_REASON)}</text>
  <text x="70" y="250" fill="${PALETTE.muted}" font-size="24" font-family="${FONT}">${pointCount} weekly data ${plural} recorded; a trend line needs at least 2</text>
  <line x1="70" y1="520" x2="1210" y2="520" stroke="${accent}" stroke-width="4" stroke-dasharray="12 10" opacity="0.7"/>
  <text x="70" y="600" fill="${PALETTE.muted}" font-size="22" font-family="${FONT}">${FOOTER}</text>
</svg>`;
}

/** shields.io endpoint payload for a repo. */
export function renderRepoBadge(dataset, repo) {
  const current = latestPoint(buildSeries(dataset, repo));

  return {
    schemaVersion: 1,
    label: repoLabel(repo),
    message: current ? formatCount(current.value) : "accumulating",
    color: (current ? repoAccent(repo) : PALETTE.muted).replace("#", ""),
  };
}

/**
 * The upstream chart, recoloured to the Bluefin palette.
 *
 * Presentation only. Every coordinate, tick and label stays exactly as upstream
 * drew it; this rewrites the four colours matplotlib emits and nothing else.
 * The data is not re-derived, because it may not be: `isPermittedSource` allows
 * one source for `ublue-os/bluefin:stable`, and recomputing the series from
 * Fedora's CSV would be a forbidden source wearing our palette.
 *
 * The background becomes transparent rather than dark. An SVG inside an `<img>`
 * cannot read the page's CSS, so a baked dark canvas would be wrong in light
 * mode; letting the panel behind it show through is correct in both. The ink
 * tones are chosen to clear AA on either surface for the same reason.
 */
const UPSTREAM_PALETTE = Object.freeze({
  "#ffffff": "none", // canvas — let the panel behind show through
  "#cccccc": "#7d848d", // gridlines
  "#616161": "#8b949e", // axis labels and ticks
  "#77aadd": "#58a6ff", // the series itself, in Bluefin blue
});

export function restyleUpstreamChart(svg) {
  let out = String(svg);

  for (const [from, to] of Object.entries(UPSTREAM_PALETTE)) {
    out = out.replaceAll(from, to);
    out = out.replaceAll(from.toUpperCase(), to);
  }

  // matplotlib paints the canvas as an opaque rect before anything else.
  // `fill="none"` above handles the declared colour; this catches the pair of
  // full-bleed rects it emits with an explicit style instead.
  out = out.replaceAll('style="fill: none"', 'style="fill:none"');

  return out;
}
