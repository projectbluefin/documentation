import { readFileSync } from "node:fs";

const FLATHUB_PATH = new URL(
  "../../static/data/flathub-stats.json",
  import.meta.url,
);

export const FLATHUB_SOURCE_URL = "https://flathub.org/api/v2/stats";

function inWindow(date, period) {
  return date >= period.start && date <= period.end;
}

function datesInclusive(start, end) {
  const dates = [];
  for (
    let current = new Date(`${start}T00:00:00.000Z`);
    current <= new Date(`${end}T00:00:00.000Z`);
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

export function buildFlathubReportMetrics(payload, period) {
  if (payload?.unavailable === true) {
    return {
      chart: null,
      reason: payload.stateReason || "Flathub statistics are unavailable.",
    };
  }

  const entries = (payload?.downloadsPerDay ?? [])
    .filter(
      (entry) =>
        typeof entry?.date === "string" && inWindow(entry.date, period),
    )
    .sort((left, right) => left.date.localeCompare(right.date));

  if (entries.length === 0) {
    return {
      chart: null,
      reason:
        "No Flathub daily download data is available for this report window.",
    };
  }

  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const labels = datesInclusive(period.start, period.end);
  const values = labels.map((date) => {
    const downloads = byDate.get(date)?.downloads;
    return typeof downloads === "number" && Number.isFinite(downloads)
      ? downloads
      : null;
  });
  if (values.some((value) => value === null)) {
    return {
      chart: null,
      reason:
        "Flathub daily download data is incomplete for this report window.",
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    chart: {
      id: "ecosystem-flathub",
      kind: "line",
      title: "Flathub downloads",
      currentValue: String(total),
      unit: "calendar-month downloads",
      sourceLabel: "Flathub",
      sourceUrl: FLATHUB_SOURCE_URL,
      sourceWindow: `${period.start} to ${period.end} UTC`,
      labels,
      series: [
        {
          id: "downloads",
          label: "Downloads",
          values,
        },
      ],
      minimumPoints: 1,
    },
    reason: null,
  };
}

export function readFlathubStats(file = FLATHUB_PATH, read = readFileSync) {
  try {
    return JSON.parse(read(file, "utf8"));
  } catch (error) {
    return {
      unavailable: true,
      stateReason:
        error instanceof SyntaxError
          ? "Flathub statistics contain invalid JSON."
          : "Flathub statistics could not be read.",
    };
  }
}
