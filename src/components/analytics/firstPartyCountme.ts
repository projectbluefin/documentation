import {
  FIRST_PARTY,
  PROJECTBLUEFIN_REPOS,
} from "@site/scripts/lib/countme-sources.mjs";

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

/** One week of first-party counts. A missing repo is `null` — a gap, never 0. */
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

/**
 * Repos carrying at least one real reading, in policy order.
 *
 * A repo that never reported is excluded rather than plotted: a series of all
 * gaps draws as a flat line on the floor and reads as "zero systems".
 */
export function reportingRepos(weeks: CountmeWeek[]): string[] {
  return (PROJECTBLUEFIN_REPOS as readonly string[]).filter((repo) =>
    weeks.some((w) => parseReading(w[repo]) !== null),
  );
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

/**
 * Game-mode counts for a week, when the service reports them.
 *
 * Game mode is an attribute of a ping, not an image: a client reports it as a
 * `-gaming` repo id or a `gamemode=1` flag, and the service folds both into the
 * base image. `weeks[i][repo]` is therefore the whole population and
 * `weeks[i].gaming[repo]` is the part of it that was in game mode, so the two
 * are never added together.
 */
export function gamingOf(
  week: CountmeWeek | undefined,
): Record<string, unknown> {
  const gaming = week?.gaming;
  return gaming && typeof gaming === "object"
    ? (gaming as Record<string, unknown>)
    : {};
}

/** A repo's game-mode series across the week axis, gaps preserved as null. */
export function gamingSeries(
  weeks: CountmeWeek[],
  repo: string,
): Array<number | null> {
  return weeks.map((w) => parseReading(gamingOf(w)[repo]));
}

/**
 * Latest game-mode reading for a repo, read backwards like `latestReading`.
 *
 * A repo that reported but had nobody in game mode is `0`, which is a real
 * measurement and distinct from the `null` of a week it did not report at all.
 */
export function latestGaming(
  weeks: CountmeWeek[],
  repo: string,
): number | null {
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    const value = parseReading(gamingOf(weeks[i])[repo]);
    if (value !== null) return value;
  }
  return null;
}

/** Repos carrying at least one non-zero game-mode reading. */
export function gamingRepos(weeks: CountmeWeek[], repos: string[]): string[] {
  return repos.filter((repo) =>
    weeks.some((w) => (parseReading(gamingOf(w)[repo]) ?? 0) > 0),
  );
}
