import {
  FIRST_PARTY,
  UPSTREAM_ALLOWED,
} from "@site/scripts/lib/countme-sources.mjs";
import { parseBadgeCount } from "@site/scripts/lib/classic-countme.mjs";

/**
 * Reading daily active systems alongside Classic's published weekly history.
 *
 * This module is deliberately separate from the component that renders it.
 * `scripts/countme-first-party.test.js` forbids a file that holds the image
 * catalogue from also indexing a countme week by a computed key, because that
 * exact shape twice published a Fedora-derived number under a Project Bluefin
 * name. Keeping the reader here means the catalogue and the week keys never sit
 * in one file, and the rule stays a real gate rather than an exemption list.
 *
 * Daily measurements use the aggregate served by `countme.projectbluefin.io`.
 * Classic uses only the permitted badge's dated observations. A weekly reading
 * holds from its publication date, never before it or through an explicit gap.
 */

/**
 * The aggregate is fetched at runtime rather than built into the site because
 * it accumulates continuously, while the site rebuilds only on merge.
 */
/** The first-party origin. Every route below is served by our own worker. */
export const FIRST_PARTY_ORIGIN: string = FIRST_PARTY.origin;

/** Systems active per UTC day and image, from `projectbluefin-countme` pings. */
export const DAILY_URL = `${FIRST_PARTY_ORIGIN}/v1/daily.json`;

/** `image` is `<image-name>/<image-flavor>:<stream>`. */
export interface DailyRow {
  day: string;
  image: string;
  n: number;
}

export interface DailyDataset {
  unit?: string;
  days?: DailyRow[];
  unavailable?: boolean;
  stateReason?: string | null;
}

export const DAILY_STREAMS = ["stable", "testing", "unknown"] as const;

/**
 * One image family's daily actives per stream (`utah` matches `utah/…` and
 * `utah-nvidia/…`). The axis is every UTC day from the first report to the
 * last, so a day nobody reported stays on the axis as a null gap.
 */
export function familyDaily(
  rows: DailyRow[],
  family?: string,
): { days: string[]; streams: Record<string, Array<number | null>> } {
  const mine =
    family === undefined
      ? rows
      : rows.filter(
          (r) =>
            r.image.startsWith(`${family}/`) ||
            r.image.startsWith(`${family}-`),
        );
  const reported = mine.map((r) => r.day).sort();
  const days: string[] = [];
  if (reported.length) {
    const last = Date.parse(`${reported[reported.length - 1]}T00:00:00Z`);
    for (
      let t = Date.parse(`${reported[0]}T00:00:00Z`);
      t <= last;
      t += 86_400_000
    ) {
      days.push(new Date(t).toISOString().slice(0, 10));
    }
  }
  const streams: Record<string, Array<number | null>> = {};
  for (const stream of DAILY_STREAMS) {
    streams[stream] = days.map((day) => {
      const hits = mine.filter(
        (r) => r.day === day && r.image.endsWith(`:${stream}`),
      );
      return hits.length ? hits.reduce((sum, r) => sum + r.n, 0) : null;
    });
  }
  return { days, streams };
}

export type FamilyDaily = ReturnType<typeof familyDaily>;

/** Days on which at least one stream reported, as `measuredWeekCount` does. */
export function measuredDays(daily: FamilyDaily): number {
  return daily.days.filter((_, i) =>
    DAILY_STREAMS.some((stream) => daily.streams[stream][i] !== null),
  ).length;
}

/** The last day any stream reported, with that day's total across streams. */
export function latestDaily(
  daily: FamilyDaily,
): { value: number; day: string } | null {
  for (let i = daily.days.length - 1; i >= 0; i -= 1) {
    const values = DAILY_STREAMS.map((stream) => daily.streams[stream][i]);
    if (values.some((v) => v !== null)) {
      return {
        value: values.reduce<number>((sum, v) => sum + (v ?? 0), 0),
        day: daily.days[i],
      };
    }
  }
  return null;
}

export type PopulationSeries = {
  days: string[];
  values: Array<number | null>;
};

export interface ClassicHistoryDataset {
  generatedAt: string;
  source: string;
  method: "classic-badge-history-v1";
  observations: Array<{ date: string; count: number | null }>;
  unavailable?: boolean;
  stateReason?: string;
}

function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Actual Classic publications, with today's badge only on its observation day. */
export function classicPopulation(
  history: ClassicHistoryDataset | null | undefined,
  currentBadge: string | null,
  observedDay: string,
): PopulationSeries {
  const observations = new Map<string, number | null>();
  if (
    history &&
    !history.unavailable &&
    history.source === UPSTREAM_ALLOWED.source &&
    history.method === "classic-badge-history-v1" &&
    typeof history.generatedAt === "string" &&
    Number.isFinite(Date.parse(history.generatedAt)) &&
    Array.isArray(history.observations) &&
    history.observations.every(
      (observation) =>
        observation !== null &&
        typeof observation === "object" &&
        isDay(observation.date) &&
        (observation.count === null || isCount(observation.count)),
    )
  ) {
    for (const { date, count } of history.observations) {
      observations.set(date, count);
    }
  }
  const current = parseBadgeCount(currentBadge);
  if (current !== null && isDay(observedDay)) {
    observations.set(observedDay, current);
  }
  const days = [...observations.keys()].sort();
  return { days, values: days.map((day) => observations.get(day)!) };
}

/** Each family's own same-day streams; missing or invalid days remain gaps. */
function dailyTotals(daily: FamilyDaily): Map<string, number | null> {
  const totals = new Map<string, number | null>();
  for (const [i, day] of daily.days.entries()) {
    if (!isDay(day)) continue;
    let total: number | null = null;
    for (const stream of DAILY_STREAMS) {
      const value = daily.streams[stream]?.[i];
      if (value === null) continue;
      if (!isCount(value)) {
        total = null;
        break;
      }
      total = (total ?? 0) + value;
    }
    totals.set(day, total !== null && Number.isFinite(total) ? total : null);
  }
  return totals;
}

/** Date-aligned daily totals with the latest Classic publication as of each day. */
export function sumBluefinHistories(
  bluefin: FamilyDaily,
  utah: FamilyDaily,
  classic: PopulationSeries,
): PopulationSeries {
  const bluefinTotals = dailyTotals(bluefin);
  const utahTotals = dailyTotals(utah);
  const days = [
    ...new Set([...bluefinTotals.keys(), ...utahTotals.keys()]),
  ].sort();
  const publications = new Map<string, number | null>();
  for (const [i, day] of classic.days.entries()) {
    if (isDay(day)) {
      const value = classic.values[i];
      publications.set(day, isCount(value) ? value : null);
    }
  }
  const classicDays = [...publications.keys()].sort();
  let nextPublication = 0;
  let classicCount: number | null = null;
  const values = days.map((day) => {
    while (
      nextPublication < classicDays.length &&
      classicDays[nextPublication] <= day
    ) {
      classicCount = publications.get(classicDays[nextPublication])!;
      nextPublication += 1;
    }
    const bluefinCount = bluefinTotals.get(day);
    const utahCount = utahTotals.get(day);
    if (bluefinCount == null || utahCount == null || classicCount === null) {
      return null;
    }
    const total = bluefinCount + utahCount + classicCount;
    return Number.isFinite(total) ? total : null;
  });
  return { days, values };
}
