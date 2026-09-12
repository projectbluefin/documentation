// Shaping the counts document. Pure functions only: the D1 round-trip lives in
// index.mjs so the counting rules can be tested without a database.

import {
  FIRST_PARTY,
  FIRST_PARTY_PENDING_REASON,
  PROJECTBLUEFIN_REPOS,
} from "../../scripts/lib/countme-sources.mjs";

const COUNT_METHOD = "first-party-d1-v2";
const COUNT_UNIT = "estimated weekly active systems";
const WEEK_WINDOW_DAYS = 180;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Game mode is an attribute of a ping, not an image of its own.
 *
 * Clients report it two ways — a `-gaming` repo id, or `gamemode=1` — and both
 * must land in the same bucket, counted under the base image.
 */
export const GAMING_SUFFIX = "-gaming";

/**
 * Weekly counts per reported image and game-mode flag, Monday-anchored.
 *
 * `weekday 0` advances to that week's Sunday, so `-6 days` lands on its Monday.
 *
 * No repo filter here on purpose. Filtering to bare family ids in SQL discarded
 * every hardware variant before the counting rules ever saw it;
 * `normalizeCountmeRepo` decides what is ours, and it folds variants in.
 */
export const WEEKLY_COUNTS_SQL = `SELECT date(received_at, 'weekday 0', '-6 days') AS week,
          repo,
          gamemode,
          COUNT(*) AS hits
   FROM telemetry_events
   WHERE received_at >= date('now', '-${WEEK_WINDOW_DAYS} days')
   GROUP BY week, repo, gamemode
   ORDER BY week ASC`;

/**
 * Hardware and driver variants, stripped before the family is matched.
 *
 * Clients send the published image name, so
 * the id on the wire is the whole thing — `bluefin-lts-hwe-nvidia`, not
 * `bluefin-lts`. Matching bare family ids threw every one of these away, which
 * is why LTS counted 2 while its images were reporting.
 *
 * A driver or hardware build is the same population on different silicon, so it
 * folds into its family. Game mode is a genuine attribute and is kept.
 */
const VARIANT_SUFFIXES = ["-nvidia", "-hwe"];

/**
 * Fold a reported image name into a first-party repo plus a game-mode flag.
 *
 * Idempotent: a result fed back through is unchanged, because every suffix is
 * already gone and the flag is already set. Returns null for ids that are not
 * ours, which is how anything outside PROJECTBLUEFIN_REPOS drops.
 *
 * `bluefin-lts` is matched before `bluefin`: longest family first, or every LTS
 * image is counted as flagship.
 */
export function normalizeCountmeRepo(repo, gamemode) {
  let id = String(repo ?? "")
    .trim()
    .toLowerCase();
  if (!id) return null;

  const gaming = id.endsWith(GAMING_SUFFIX) || Number(gamemode) === 1;
  if (id.endsWith(GAMING_SUFFIX)) id = id.slice(0, -GAMING_SUFFIX.length);

  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const suffix of VARIANT_SUFFIXES) {
      if (id.endsWith(suffix) && id.length > suffix.length) {
        id = id.slice(0, -suffix.length);
        stripped = true;
      }
    }
  }

  const family = [...PROJECTBLUEFIN_REPOS]
    .sort((a, b) => b.length - a.length)
    .find((repoId) => id === repoId);

  return family ? { repo: family, gaming } : null;
}

function countsMeta() {
  return {
    generatedAt: new Date().toISOString(),
    source: FIRST_PARTY.origin,
    method: COUNT_METHOD,
    unit: COUNT_UNIT,
  };
}

/** The document served when nothing countable is available yet. */
export function pendingCountsDocument() {
  return {
    ...countsMeta(),
    variants: [],
    weeks: [],
    unavailable: true,
    stateReason: FIRST_PARTY_PENDING_REASON,
  };
}

/** Every Monday from `first` through `last`, so a silent week stays visible. */
function weekAxis(first, last) {
  const axis = [];
  for (
    let stamp = Date.parse(`${first}T00:00:00Z`);
    stamp <= Date.parse(`${last}T00:00:00Z`);
    stamp += WEEK_MS
  ) {
    axis.push(new Date(stamp).toISOString().slice(0, 10));
  }
  return axis;
}

/**
 * The counts document.
 *
 * `week[repo]` is the total for that image, game mode included, because that
 * is the population. `week.gaming[repo]` is the part of it that was in game
 * mode: 0 is a real measurement — the image reported, nobody was in game mode
 * — while null means the image did not report at all that week. The same
 * distinction governs the totals, so neither can be inferred from the other.
 */
export function buildCountsDocument(rows) {
  const counted = (Array.isArray(rows) ? rows : []).filter(
    (row) => row && typeof row.week === "string" && Number.isFinite(row.hits),
  );

  const byWeek = new Map();
  for (const row of counted) {
    const normalized = normalizeCountmeRepo(row.repo, row.gamemode);
    if (!normalized) continue;

    const week = byWeek.get(row.week) || new Map();
    const cell = week.get(normalized.repo) || { total: 0, gaming: 0 };
    cell.total += row.hits;
    if (normalized.gaming) cell.gaming += row.hits;
    week.set(normalized.repo, cell);
    byWeek.set(row.week, week);
  }

  if (byWeek.size === 0) return pendingCountsDocument();

  const observed = [...byWeek.keys()].sort();
  const weeks = weekAxis(observed[0], observed[observed.length - 1]).map(
    (week) => {
      const counts = byWeek.get(week);
      const entry = { week };
      const gaming = {};

      for (const repo of PROJECTBLUEFIN_REPOS) {
        const cell = counts && counts.get(repo);
        entry[repo] = cell ? cell.total : null;
        gaming[repo] = cell ? cell.gaming : null;
      }

      entry.gaming = gaming;
      return entry;
    },
  );

  return {
    ...countsMeta(),
    variants: PROJECTBLUEFIN_REPOS.filter((repo) =>
      weeks.some((week) => week[repo] !== null),
    ),
    weeks,
  };
}
