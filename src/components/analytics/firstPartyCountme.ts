import { FIRST_PARTY } from "@site/scripts/lib/countme-sources.mjs";

/**
 * Reading weekly active systems from the first-party countme service.
 *
 * This module is deliberately separate from the component that renders it.
 * `scripts/countme-first-party.test.js` forbids a file that holds the image
 * catalogue from also indexing a countme week by a computed key, because that
 * exact shape twice published a Fedora-derived number under a Project Bluefin
 * name. Keeping the reader here means the catalogue and the week keys never sit
 * in one file, and the rule stays a real gate rather than an exemption list.
 *
 * Everything below reads one dataset only: the aggregate served by
 * `countme.projectbluefin.io`, whose `source` the policy module permits.
 */

/**
 * The aggregate is fetched at runtime rather than built into the site because
 * it accumulates continuously, while the site rebuilds only on merge.
 */
/** The first-party origin. Every route below is served by our own worker. */
export const FIRST_PARTY_ORIGIN: string = FIRST_PARTY.origin;

export const COUNTS_URL = `${FIRST_PARTY_ORIGIN}/counts.json`;

/** One week of first-party counts. A null stream is a gap, never zero. */
export interface CountmeWeek {
  week: string;
  [repo: string]: string | number | null | undefined;
}

export interface CountmeDataset {
  generatedAt?: string;
  source?: string;
  method?: string;
  unit?: string;
  variants?: string[];
  weeks?: CountmeWeek[];
  unavailable?: boolean;
  stateReason?: string | null;
}

/**
 * Parse a raw count, preserving 0 as a real measurement.
 *
 * `0` and `null` are different claims: "nobody was running it" against "nobody
 * reported". Returns null for undefined, null, empty string, and non-finite.
 */
export function parseReading(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Latest real reading for a repo, with the week it belongs to.
 *
 * Reads backwards so a trailing gap does not read as "no data": the number is
 * the most recent one actually measured, and the caller states its week rather
 * than implying it is current.
 */
export function latestReading(
  weeks: CountmeWeek[],
  repo: string,
): { value: number; week: string } | null {
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    const value = parseReading(weeks[i]?.[repo]);
    if (value !== null) return { value, week: String(weeks[i].week) };
  }
  return null;
}

/** A repo's series across the week axis, gaps preserved as null. */
export function repoSeries(
  weeks: CountmeWeek[],
  repo: string,
): Array<number | null> {
  return weeks.map((w) => parseReading(w[repo]));
}

/** The week axis, as category labels. */
export function weekLabels(weeks: CountmeWeek[]): string[] {
  return weeks.map((w) => String(w.week));
}

/**
 * Weeks carrying at least one real reading.
 *
 * This is the count presentation rule 5 tests against, so an axis padded with
 * empty weeks cannot pass for accumulated data.
 */
export function measuredWeekCount(
  weeks: CountmeWeek[],
  repos: string[],
): number {
  return weeks.filter((w) =>
    repos.some((repo) => parseReading(w[repo]) !== null),
  ).length;
}

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
  family: string,
): { days: string[]; streams: Record<string, Array<number | null>> } {
  const mine = rows.filter(
    (r) => r.image.startsWith(`${family}/`) || r.image.startsWith(`${family}-`),
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
