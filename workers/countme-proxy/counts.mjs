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

/** Every repo id the service accepts, in both spellings. */
export const COUNTED_REPO_IDS = [
  ...PROJECTBLUEFIN_REPOS,
  ...PROJECTBLUEFIN_REPOS.map((repo) => `${repo}${GAMING_SUFFIX}`),
];

/**
 * Weekly counts per reported repo and game-mode flag, Monday-anchored.
 *
 * `weekday 0` advances to that week's Sunday, so `-6 days` lands on its Monday
 * — the same week key the published series has always used.
 */
export const WEEKLY_COUNTS_SQL = `SELECT date(received_at, 'weekday 0', '-6 days') AS week,
          repo,
          gamemode,
          COUNT(*) AS hits
   FROM telemetry_events
   WHERE received_at >= date('now', '-${WEEK_WINDOW_DAYS} days')
     AND repo IN (${COUNTED_REPO_IDS.map(() => "?").join(", ")})
   GROUP BY week, repo, gamemode
   ORDER BY week ASC`;

/**
 * Fold a reported id into a first-party repo plus a game-mode flag.
 *
 * Idempotent: feeding a result back through changes nothing, because the
 * suffix is already gone and the flag is already set. Returns null for ids
 * that are not ours, which is how anything outside PROJECTBLUEFIN_REPOS drops.
 */
export function normalizeCountmeRepo(repo, gamemode) {
  const id = String(repo ?? "");
  const suffixed = id.endsWith(GAMING_SUFFIX);
  const base = suffixed ? id.slice(0, -GAMING_SUFFIX.length) : id;

  if (!PROJECTBLUEFIN_REPOS.includes(base)) return null;

  return { repo: base, gaming: suffixed || Number(gamemode) === 1 };
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
