const WEEK = 7 * 86400;
const DAY_MS = 86400 * 1000;
// 6-month cap (half a calendar year = 183 days; every standard 26-week GNOME cycle is 182 days).
const MAX_SEASON_DURATION_MS = 183 * DAY_MS;

// 1970-01-01 was Thursday (weekday 4); align unix days to Sunday starts.
function sundayStart(ms) {
  const day = Math.floor(ms / 86400000);
  return (day - ((day + 4) % 7)) * 86400;
}

/**
 * Parse all published major GNOME releases from https://release.gnome.org/atom.xml.
 * Returns releases sorted oldest-to-newest.
 */
function parseGnomeReleases(feed, now = Date.now()) {
  const entries = [...feed.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)];
  const seen = new Set();
  const releases = [];
  for (const [, entry] of entries) {
    const titleMatch = entry.match(
      /<title>(?:Introducing\s+)?GNOME\s+(\d+)<\/title>/,
    );
    const version = Number(titleMatch?.[1]);
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const timestamp = Date.parse(published);
    if (
      !version ||
      version <= 0 ||
      !Number.isFinite(timestamp) ||
      timestamp > now ||
      seen.has(version)
    ) {
      continue;
    }
    seen.add(version);
    releases.push({
      version,
      timestamp,
      start: new Date(timestamp).toISOString(),
      source: `https://release.gnome.org/${version}/`,
    });
  }
  releases.sort((a, b) => a.timestamp - b.timestamp || a.version - b.version);
  return releases;
}

function releaseFromFeed(feed, now = Date.now()) {
  const releases = parseGnomeReleases(feed, now);
  const released = releases[releases.length - 1];
  if (!released)
    throw new Error("No published GNOME release in the official feed");
  return {
    version: released.version,
    start: released.start,
    source: released.source,
  };
}

/**
 * Extract the official GNOME release nickname from its release-notes HTML <h1>.
 * Returns null when the release heading matches the expected version but carries
 * no official nickname (e.g. GNOME 42). Throws if the heading mismatches the version.
 */
function parseGnomeNickname(version, notes) {
  const heading = notes
    ?.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]
    ?.replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|\u00a0/g, " ")
    .trim();
  if (!heading) return null;
  const mentioned = heading.match(/GNOME\s*(\d+)/);
  if (mentioned && Number(mentioned[1]) !== Number(version)) {
    throw new Error(
      `GNOME ${version} nickname mismatch: release notes heading is for GNOME ${mentioned[1]}`,
    );
  }
  const nickname = heading.match(
    new RegExp(`GNOME\\s*${version}\\s*,\\s*[“"]([^”"]+)[”"]`),
  )?.[1];
  return nickname ? nickname.trim() : null;
}

function formatSeasonTitle(season) {
  if (season?.name) return `Season of ${season.name}`;
  if (season?.version != null) return `Season of GNOME ${season.version}`;
  return "Season";
}

function parseSeason(feed, notes, now = Date.now()) {
  const released = releaseFromFeed(feed, now);
  const nickname = parseGnomeNickname(released.version, notes);
  if (!nickname)
    throw new Error(
      `GNOME ${released.version} nickname missing from its release notes`,
    );
  return { ...released, name: nickname };
}

function normalizeBluefinReleases(bluefinReleases = []) {
  return (Array.isArray(bluefinReleases) ? bluefinReleases : [])
    .map((r) => {
      const date = r?.published_at || r?.date || r?.created_at;
      const ms = Date.parse(date);
      const tag = r?.tag_name || r?.tag || r?.name || "";
      if (!tag || !Number.isFinite(ms)) return null;
      return {
        tag,
        date: new Date(ms).toISOString(),
        ms,
        prerelease: Boolean(r?.prerelease),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.ms - b.ms || a.tag.localeCompare(b.tag));
}

function summarizeBluefinReleases(releases, startMs, endMs) {
  const inWindow = releases.filter(
    (r) => r.ms >= startMs && (endMs == null ? true : r.ms < endMs),
  );
  if (inWindow.length === 0) {
    return {
      count: 0,
      first: null,
      last: null,
      firstDate: null,
      lastDate: null,
    };
  }
  return {
    count: inWindow.length,
    first: inWindow[0].tag,
    last: inWindow[inWindow.length - 1].tag,
    firstDate: inWindow[0].date,
    lastDate: inWindow[inWindow.length - 1].date,
  };
}

function pickSplitRelease(releases, startMs, endMs) {
  const midpoint = startMs + (endMs - startMs) / 2;
  const candidates = releases.filter((r) => r.ms > startMs && r.ms < endMs);
  if (candidates.length === 0) return null;
  const stableCandidates = candidates.filter((r) => !r.prerelease);
  const pool = stableCandidates.length > 0 ? stableCandidates : candidates;
  return pool.reduce((best, cur) =>
    Math.abs(cur.ms - midpoint) < Math.abs(best.ms - midpoint) ? cur : best,
  );
}

/**
 * Split a single GNOME release interval if its duration exceeds maxDurationMs,
 * anchoring each split to the nearest meaningful ublue-os/bluefin release.
 */
function splitIntervalIfNeeded(
  startMs,
  endMs,
  bluefinReleases,
  maxDurationMs = MAX_SEASON_DURATION_MS,
) {
  if (endMs - startMs <= maxDurationMs) {
    return [{ startMs, endMs, splitRule: null }];
  }
  const splitRel = pickSplitRelease(bluefinReleases, startMs, endMs);
  if (splitRel && splitRel.ms > startMs && splitRel.ms < endMs) {
    const rule = `Split >6-month gap at ublue-os/bluefin release ${splitRel.tag} (${splitRel.date.slice(0, 10)})`;
    const left = splitIntervalIfNeeded(
      startMs,
      splitRel.ms,
      bluefinReleases,
      maxDurationMs,
    ).map((seg) => ({ ...seg, splitRule: seg.splitRule || rule }));
    const right = splitIntervalIfNeeded(
      splitRel.ms,
      endMs,
      bluefinReleases,
      maxDurationMs,
    ).map((seg) => ({ ...seg, splitRule: seg.splitRule || rule }));
    return [...left, ...right];
  }
  const midMs = Math.floor(startMs + (endMs - startMs) / 2);
  const midIso = new Date(midMs).toISOString().slice(0, 10);
  const fallbackRule = `Split >6-month gap at midpoint ${midIso} (no ublue-os/bluefin release in interval)`;
  return [
    ...splitIntervalIfNeeded(startMs, midMs, bluefinReleases, maxDurationMs),
    ...splitIntervalIfNeeded(midMs, endMs, bluefinReleases, maxDurationMs),
  ].map((seg) => ({ ...seg, splitRule: seg.splitRule || fallbackRule }));
}

/**
 * Build contiguous, non-overlapping backfilled season windows from major GNOME
 * releases covering earliestDate up to currentSeasonStart, enforcing the 6-month cap.
 *
 * Each entry in gnomeReleases should have: { version, start, source, name, nicknameNote? }
 */
function buildSeasonWindows(
  gnomeReleases,
  bluefinReleases = [],
  {
    earliestDate,
    currentSeasonStart,
    maxDurationMs = MAX_SEASON_DURATION_MS,
  } = {},
) {
  const sortedGnome = [...(gnomeReleases || [])]
    .map((r) => ({
      ...r,
      ms: Number.isFinite(r.timestamp) ? r.timestamp : Date.parse(r.start),
    }))
    .filter((r) => Number.isFinite(r.ms))
    .sort((a, b) => a.ms - b.ms || a.version - b.version);

  const currentStartMs = Date.parse(currentSeasonStart);
  if (!Number.isFinite(currentStartMs)) {
    throw new Error("currentSeasonStart must be a valid ISO timestamp");
  }

  const earliestMs = Number.isFinite(Date.parse(earliestDate))
    ? Date.parse(earliestDate)
    : currentStartMs;

  const normalizedBluefin = normalizeBluefinReleases(bluefinReleases);

  // Find the latest GNOME release published on or before earliestMs
  let startIdx = 0;
  for (let i = 0; i < sortedGnome.length; i++) {
    if (sortedGnome[i].ms <= earliestMs) {
      startIdx = i;
    }
  }

  const priorGnome = sortedGnome
    .slice(startIdx)
    .filter((r) => r.ms < currentStartMs);

  const windows = [];
  for (let i = 0; i < priorGnome.length; i++) {
    const cur = priorGnome[i];
    const next = priorGnome[i + 1];
    const intervalEndMs = next ? next.ms : currentStartMs;
    const nextLabel = next
      ? `GNOME ${next.version}${next.name ? ` (${next.name})` : ""}`
      : `Current season (${new Date(currentStartMs).toISOString().slice(0, 10)})`;
    const curLabel = `GNOME ${cur.version}${cur.name ? ` (${cur.name})` : ""}`;

    const segments = splitIntervalIfNeeded(
      cur.ms,
      intervalEndMs,
      normalizedBluefin,
      maxDurationMs,
    );

    segments.forEach((seg, segIdx) => {
      const partSuffix = segments.length > 1 ? `-part-${segIdx + 1}` : "";
      const title = formatSeasonTitle(cur);
      const bluefinRange = summarizeBluefinReleases(
        normalizedBluefin,
        seg.startMs,
        seg.endMs,
      );
      windows.push({
        id: `gnome-${cur.version}${partSuffix}`,
        version: cur.version,
        name: cur.name ?? null,
        nicknameNote:
          cur.name == null
            ? cur.nicknameNote ||
              `GNOME ${cur.version} has no official release nickname`
            : null,
        title: segments.length > 1 ? `${title} (Part ${segIdx + 1})` : title,
        start: new Date(seg.startMs).toISOString(),
        end: new Date(seg.endMs).toISOString(),
        source: cur.source || `https://release.gnome.org/${cur.version}/`,
        boundaryMilestone: `${curLabel} → ${nextLabel}`,
        splitRule: seg.splitRule,
        bluefinReleases: bluefinRange,
        isCurrent: false,
      });
    });
  }

  return windows.map((w, index) => ({
    ...w,
    seasonNumber: index + 1,
  }));
}

function collectSeason(
  season,
  commitsByRepo,
  now = Date.now(),
  isBot = () => false,
) {
  const start = Date.parse(season.start);
  const hasExplicitEnd =
    season.end != null && Number.isFinite(Date.parse(season.end));
  const endMs = hasExplicitEnd ? Date.parse(season.end) : now;
  const first = sundayStart(start);
  const last = sundayStart(hasExplicitEnd ? Math.max(start, endMs - 1) : endMs);
  const weekStarts = [];
  const weeklyCommits = [];
  for (let week = first; week <= last; week += WEEK) {
    weekStarts.push(week);
    weeklyCommits.push(0);
  }
  const byLogin = {};
  let totalCommits = 0;
  for (const [repo, commits] of Object.entries(commitsByRepo)) {
    if (!Array.isArray(commits)) continue;
    for (const item of commits) {
      const login = item?.author?.login;
      if (item?.parents?.length > 1) continue;
      const landed = Date.parse(item?.commit?.committer?.date);
      const inRange = hasExplicitEnd
        ? landed >= start && landed < endMs
        : landed >= start && landed <= endMs;
      if (!login || isBot(login) || !Number.isFinite(landed) || !inRange)
        continue;
      const week = sundayStart(landed);
      const index = (week - first) / WEEK;
      if (!byLogin[login]) byLogin[login] = { commits: 0, repos: {} };
      byLogin[login].commits++;
      byLogin[login].repos[repo] = (byLogin[login].repos[repo] || 0) + 1;
      if (index >= 0 && index < weeklyCommits.length) {
        weeklyCommits[index]++;
      }
      totalCommits++;
    }
  }
  return { byLogin, weekStarts, weeklyCommits, totalCommits };
}

/**
 * Assign commits from all tracked repositories across contiguous season windows,
 * reusing collectSeason's exact attribution and bot-filtering logic.
 * Any commit landing before the earliest season's start is reported in `preseason`.
 */
function assignCommitsToSeasons(
  seasons,
  commitsByRepo,
  isBot = () => false,
  now = Date.now(),
) {
  const ordered = [...(seasons || [])].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  );
  const earliestStart =
    ordered.length > 0 ? Date.parse(ordered[0].start) : Infinity;

  const populated = ordered.map((season) => {
    const stats = collectSeason(season, commitsByRepo, now, isBot);
    return {
      ...season,
      ...stats,
      contributorCount: Object.keys(stats.byLogin).length,
    };
  });

  const preseasonByLogin = {};
  let preseasonCommits = 0;
  for (const [repo, commits] of Object.entries(commitsByRepo || {})) {
    if (!Array.isArray(commits)) continue;
    for (const item of commits) {
      const login = item?.author?.login;
      if (item?.parents?.length > 1) continue;
      const landed = Date.parse(item?.commit?.committer?.date);
      if (
        !login ||
        isBot(login) ||
        !Number.isFinite(landed) ||
        landed >= earliestStart
      ) {
        continue;
      }
      if (!preseasonByLogin[login]) {
        preseasonByLogin[login] = { commits: 0, repos: {} };
      }
      preseasonByLogin[login].commits++;
      preseasonByLogin[login].repos[repo] =
        (preseasonByLogin[login].repos[repo] || 0) + 1;
      preseasonCommits++;
    }
  }

  return {
    seasons: populated,
    preseason: {
      byLogin: preseasonByLogin,
      totalCommits: preseasonCommits,
      contributorCount: Object.keys(preseasonByLogin).length,
    },
  };
}

function repoApiSlug(repo) {
  return repo.includes("/") ? repo : `projectbluefin/${repo}`;
}

async function fetchSeasonCommits(
  repos,
  start,
  end,
  request,
  { allowPartial = false } = {},
) {
  const byRepo = {};
  const failedRepos = [];
  await Promise.all(
    repos.map(async (repo) => {
      const slug = repoApiSlug(repo);
      const commits = [];
      let url = `https://api.github.com/repos/${slug}/commits?since=${encodeURIComponent(start)}&until=${encodeURIComponent(end)}&per_page=100`;
      try {
        while (url) {
          const response = await request(url);
          if ([204, 404, 409].includes(response.status)) break;
          if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}`);
          const page = await response.json();
          if (!Array.isArray(page))
            throw new Error(`${repo}: invalid commit response`);
          for (const { author, commit, parents, html_url } of page) {
            commits.push({
              author: author ? { login: author.login } : null,
              commit: { committer: { date: commit?.committer?.date } },
              parents,
              htmlUrl: html_url,
            });
          }
          const next = response.headers
            .get("Link")
            ?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
          if (next && new URL(next).origin !== "https://api.github.com")
            throw new Error(`${repo}: unsafe pagination URL`);
          url = next || null;
        }
        byRepo[repo] = commits;
      } catch (err) {
        if (!allowPartial) throw err;
        failedRepos.push({ repo, reason: err.message });
      }
    }),
  );
  if (allowPartial) {
    return { byRepo, failedRepos };
  }
  return byRepo;
}

module.exports = {
  MAX_SEASON_DURATION_MS,
  parseGnomeReleases,
  releaseFromFeed,
  parseGnomeNickname,
  formatSeasonTitle,
  parseSeason,
  buildSeasonWindows,
  collectSeason,
  assignCommitsToSeasons,
  fetchSeasonCommits,
};
