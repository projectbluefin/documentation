export interface SeasonReleaseRange {
  count: number;
  first: string | null;
  last: string | null;
  firstDate: string | null;
  lastDate: string | null;
}

export interface SeasonEntry {
  id?: string;
  seasonNumber?: number;
  version: number;
  name: string | null;
  nicknameNote?: string | null;
  title?: string;
  start: string;
  end?: string | null;
  source?: string;
  updatedAt?: string;
  generatedAt?: string;
  isCurrent?: boolean;
  unavailable?: boolean;
  stateReason?: string | null;
  failedRepos?: Array<{ repo: string; reason: string } | string>;
  boundaryMilestone?: string | null;
  splitRule?: string | null;
  bluefinReleases?: SeasonReleaseRange | null;
  repos?: string[];
  byLogin?: Record<string, { commits: number; repos: Record<string, number> }>;
  weekStarts?: number[];
  weeklyCommits?: number[];
  totalCommits?: number | null;
  contributorCount?: number | null;
  breadthUnlocks?: Array<{
    id: string;
    login: string;
    type: "tier_up" | "task_landmark" | "project_unlock";
    title: string;
    detail: string;
    detectedAt: string;
    tier?: string;
    value?: number;
    repo?: string;
    badge?: {
      label: string;
      color: string;
    };
  }>;
}

export interface SeasonTab {
  id: string;
  seasonNumber: number;
  label: string;
  shortLabel: string;
  title: string;
  isCurrent: boolean;
  unavailable: boolean;
  stateReason: string | null;
  season: SeasonEntry;
}

export function formatSeasonDisplayTitle(
  season: Pick<SeasonEntry, "version" | "name" | "title"> | null | undefined,
): string {
  if (!season) return "Contribution Season";
  if (season.title) return season.title;
  if (season.name) return `Season of ${season.name}`;
  return `Season of GNOME ${season.version}`;
}

export function seasonIdOf(season: SeasonEntry): string {
  return season.id || `gnome-${season.version}`;
}

/**
 * Build the ordered list of season tabs (newest to oldest) from HiveHistory.
 * Falls back gracefully to a single tab from `history.season` if `history.seasons`
 * has not been backfilled yet.
 */
export function buildSeasonTabList(
  history: {
    season?: SeasonEntry | null;
    seasons?: SeasonEntry[] | null;
    seasonError?: string | null;
  } | null,
): SeasonTab[] {
  if (!history) return [];

  const rawSeasons: SeasonEntry[] = [];
  const seen = new Set<string>();

  if (Array.isArray(history.seasons) && history.seasons.length > 0) {
    for (const s of history.seasons) {
      if (!s) continue;
      const id = seasonIdOf(s);
      if (seen.has(id)) continue;
      seen.add(id);
      rawSeasons.push(s);
    }
  }

  if (history.season) {
    const currentId = seasonIdOf(history.season);
    if (!seen.has(currentId)) {
      rawSeasons.push({ ...history.season, isCurrent: true });
      seen.add(currentId);
    }
  }

  if (rawSeasons.length === 0) return [];

  // Sort oldest-to-newest first to assign stable sequential 1..N season numbers
  // when seasonNumber isn't already stamped, then reverse for newest-to-oldest tabs.
  const chronological = [...rawSeasons].sort(
    (a, b) => Date.parse(a.start || "") - Date.parse(b.start || ""),
  );

  const currentId = history.season
    ? seasonIdOf(history.season)
    : seasonIdOf(chronological[chronological.length - 1]);

  const numbered = chronological.map((season, index) => {
    const id = seasonIdOf(season);
    const seasonNumber =
      typeof season.seasonNumber === "number" && season.seasonNumber > 0
        ? season.seasonNumber
        : index + 1;
    const isCurrent = Boolean(season.isCurrent) || id === currentId;
    const title = formatSeasonDisplayTitle(season);
    const shortLabel = season.name
      ? `Season ${seasonNumber} · ${season.name}`
      : `Season ${seasonNumber} · GNOME ${season.version}`;
    const unavailable = Boolean(season.unavailable);
    const stateReason =
      season.stateReason ??
      (isCurrent && unavailable ? (history.seasonError ?? null) : null);

    return {
      id,
      seasonNumber,
      label: `Season ${seasonNumber}`,
      shortLabel,
      title,
      isCurrent,
      unavailable,
      stateReason,
      season: {
        ...season,
        id,
        seasonNumber,
        isCurrent,
        title,
      },
    };
  });

  // Return newest to oldest (highest seasonNumber first).
  return numbered.sort((a, b) => b.seasonNumber - a.seasonNumber);
}

/**
 * Return the default selected season ID: the current season if present,
 * otherwise the newest season in the list.
 */
export function getDefaultSeasonId(tabs: SeasonTab[]): string | null {
  if (tabs.length === 0) return null;
  const current = tabs.find((t) => t.isCurrent);
  return current ? current.id : tabs[0].id;
}

/**
 * Resolve the currently selected tab, falling back to the default tab when
 * selectedId is absent or no longer present.
 */
export function resolveSelectedSeason(
  tabs: SeasonTab[],
  selectedId: string | null,
): SeasonTab | null {
  if (tabs.length === 0) return null;
  if (selectedId) {
    const match = tabs.find((t) => t.id === selectedId);
    if (match) return match;
  }
  const defaultId = getDefaultSeasonId(tabs);
  return tabs.find((t) => t.id === defaultId) ?? tabs[0];
}

/**
 * Filter milestone events to those landing within the selected season's window.
 * For the current season (no explicit end), includes events on or after `start`.
 * For a completed season, includes events in half-open `[start, end)`.
 */
export function filterMilestonesForSeason<
  T extends { detectedAt?: string | null },
>(milestones: T[] | undefined, season: SeasonEntry | null | undefined): T[] {
  if (!Array.isArray(milestones) || milestones.length === 0) return [];
  if (!season || !season.start) return milestones;
  const startMs = Date.parse(season.start);
  if (!Number.isFinite(startMs)) return milestones;
  const endMs =
    season.end != null && Number.isFinite(Date.parse(season.end))
      ? Date.parse(season.end)
      : null;

  return milestones.filter((m) => {
    const ms = Date.parse(m?.detectedAt || "");
    if (!Number.isFinite(ms)) return false;
    if (ms < startMs) return false;
    if (endMs != null && ms >= endMs) return false;
    return true;
  });
}
