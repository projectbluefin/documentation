import { FIRST_PARTY } from "@site/scripts/lib/countme-sources.mjs";

/**
 * Reading daily active systems and combining them with the Classic badge snapshot.
 *
 * This module is deliberately separate from the component that renders it.
 * `scripts/countme-first-party.test.js` forbids a file that holds the image
 * catalogue from also indexing a countme week by a computed key, because that
 * exact shape twice published a Fedora-derived number under a Project Bluefin
 * name. Keeping the reader here means the catalogue and the week keys never sit
 * in one file, and the rule stays a real gate rather than an exemption list.
 *
 * Daily measurements use the aggregate served by `countme.projectbluefin.io`.
 * The summary also accepts the permitted Classic badge's current weekly count;
 * it does not construct combined historical totals from these different periods.
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

/**
 * Combined daily actives across all Bluefin families and flavors per stream.
 */
export function allBluefinDaily(rows: DailyRow[]): FamilyDaily {
  return familyDaily(rows);
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

const CLASSIC_SCALES: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/** A current snapshot combining Classic's weekly badge with one measured day. */
export function allBluefinSummary(
  daily: FamilyDaily,
  classic: string | null,
): {
  total: number;
  classic: number;
  daily: number;
  day: string;
  approximate: boolean;
} | null {
  const latest = latestDaily(daily);
  const message = classic?.trim();
  if (!latest || !message) return null;

  const compact = message.match(/^(\d+(?:\.\d+)?)([kmb])$/i);
  if (!compact && !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(message)) {
    return null;
  }
  const classicCount = compact
    ? Number(compact[1]) * CLASSIC_SCALES[compact[2].toLowerCase()]
    : Number(message.replace(/,/g, ""));
  const total = classicCount + latest.value;
  if (
    !Number.isFinite(classicCount) ||
    !Number.isFinite(total) ||
    latest.value < 0
  ) {
    return null;
  }

  return {
    total,
    classic: classicCount,
    daily: latest.value,
    day: latest.day,
    approximate: compact !== null,
  };
}
