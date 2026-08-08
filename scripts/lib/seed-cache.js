/**
 * Cache-age helper for the tracked data seeds.
 *
 * `static/data/countme-history.json` and `scorecard-history.json` are committed
 * so their history accumulates across builds. That makes file mtime useless as
 * a freshness signal: `git checkout` writes every tracked file with the current
 * time, so in CI the seed always looks one minute old and the fetch is skipped
 * forever. Observed live in run 31261238667:
 *
 *   fetch-countme:   cache fresh (1m old), skipping
 *   fetch-scorecard: cache fresh (1m old), skipping
 *
 * The payload's own `generatedAt` is checkout-proof, so it is the age that
 * counts. An unreadable or undated payload is treated as stale, because
 * refetching costs a request and not refetching costs the whole feature.
 */

import { readFileSync } from "fs";

/**
 * Age of a seed in milliseconds, from the `generatedAt` inside it.
 * Returns null when the file is missing, unparseable, or carries no timestamp —
 * all of which mean "refetch". A missing file throws from the reader and is
 * caught here, so no separate existence check is needed.
 */
export function seedAgeMs(file, now = Date.now(), read = readFileSync) {
  try {
    const parsed = JSON.parse(read(file, "utf8"));
    const stamp = Date.parse(parsed?.generatedAt ?? "");
    return Number.isFinite(stamp) ? now - stamp : null;
  } catch {
    return null;
  }
}

/**
 * True when the seed was generated inside the TTL and the fetch may be skipped.
 * A missing or undated seed is never fresh.
 */
export function seedIsFresh(
  file,
  ttlHours,
  now = Date.now(),
  read = readFileSync,
) {
  if (!(ttlHours > 0)) return false;
  const age = seedAgeMs(file, now, read);
  return age !== null && age < ttlHours * 3_600_000;
}
