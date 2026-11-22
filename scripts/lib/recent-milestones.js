const TASK_SHIPPED_LANDMARKS = [1, 10, 25, 50, 100, 250, 500];

const TRUST_TIERS = ["newcomer", "contributor", "trusted", "merger", "advisor"];

function tierRank(tier) {
  switch (tier?.toLowerCase()) {
    case "newcomer":
      return 0;
    case "contributor":
      return 1;
    case "trusted":
      return 2;
    case "merger":
      return 3;
    case "advisor":
      return 4;
    default:
      return -1;
  }
}

function tierLabel(tier) {
  switch (tier?.toLowerCase()) {
    case "contributor":
      return "Reached Contributor Tier";
    case "trusted":
      return "Reached Trusted Tier";
    case "merger":
      return "Reached Merger Tier";
    case "advisor":
      return "Reached Advisor Tier";
    default:
      return `Reached ${tier} Tier`;
  }
}

function tierDetail(tier) {
  switch (tier?.toLowerCase()) {
    case "contributor":
      return "Earned contributor trust in Hive";
    case "trusted":
      return "Maintainer-verified contributor in Hive";
    case "merger":
      return "Granted PR merge delegation in Hive";
    case "advisor":
      return "Trusted maintainer governance in Hive";
    default:
      return "Trust tier upgrade in Hive";
  }
}

/**
 * Compares previous and current contributor states to identify newly crossed milestones.
 *
 * @param {Record<string, {tier: string, tasks: number}>} prev - Baseline snapshot from prior run.
 * @param {Record<string, {tier: string, tasks: number}>} next - Current snapshot.
 * @param {string} observedAt - ISO date string of when change was detected.
 * @returns {Array<MilestoneEvent>}
 */
function diffMilestones(
  prev = {},
  next = {},
  observedAt = new Date().toISOString(),
) {
  const events = [];
  const dateLabel = observedAt.slice(0, 10);

  for (const [login, curr] of Object.entries(next)) {
    const prior = prev[login];
    if (!prior) continue; // Baseline creation; no synthetic prior state

    // 1. Check trust tier level-up
    const prevRank = tierRank(prior.tier);
    const currRank = tierRank(curr.tier);
    if (currRank > prevRank && currRank >= 1) {
      events.push({
        id: `tier-${login}-${curr.tier}-${dateLabel}`,
        login,
        type: "tier_up",
        tier: curr.tier,
        title: tierLabel(curr.tier),
        detail: tierDetail(curr.tier),
        detectedAt: observedAt,
        badge: {
          label: curr.tier.toUpperCase(),
          color:
            curr.tier === "advisor"
              ? "var(--fx-sev-alert)"
              : curr.tier === "merger"
                ? "var(--fx-cat-2)"
                : curr.tier === "trusted"
                  ? "var(--fx-sev-watch)"
                  : "var(--fx-sev-ok)",
        },
      });
    }

    // 2. Check task shipped landmark crossings
    const prevTasks = Number(prior.tasks) || 0;
    const currTasks = Number(curr.tasks) || 0;
    for (const landmark of TASK_SHIPPED_LANDMARKS) {
      if (prevTasks < landmark && currTasks >= landmark) {
        events.push({
          id: `task-${login}-${landmark}-${dateLabel}`,
          login,
          type: "task_landmark",
          value: landmark,
          title: `${landmark} ${landmark === 1 ? "task" : "tasks"} shipped`,
          detail: `Completed ${currTasks} tasks via Hive registry`,
          detectedAt: observedAt,
          badge: {
            label: `${landmark} ${landmark === 1 ? "TASK" : "TASKS"}`,
            color:
              landmark >= 100
                ? "var(--fx-sev-alert)"
                : landmark >= 25
                  ? "var(--fx-sev-watch)"
                  : "var(--fx-cat-2)",
          },
        });
      }
    }
  }

  return events;
}

const BREADTH_TIER_THRESHOLDS = [
  {
    count: 10,
    label: "CORNERSTONE",
    title: "Reached Cornerstone Tier",
    color: "var(--fx-sev-alert)",
  },
  {
    count: 7,
    label: "LEGEND",
    title: "Reached Legend Tier",
    color: "var(--fx-sev-watch)",
  },
  {
    count: 5,
    label: "ANCHOR",
    title: "Reached Anchor Tier",
    color: "var(--fx-cat-2)",
  },
  {
    count: 3,
    label: "BUILDER",
    title: "Reached Builder Tier",
    color: "var(--fx-cat-2)",
  },
  {
    count: 2,
    label: "CONTRIBUTOR",
    title: "Reached Contributor Breadth",
    color: "var(--fx-sev-ok)",
  },
];

/**
 * Collects each contributor's earliest commit per repo within the season
 * window, keyed by login. Merge commits and bots are excluded, and only
 * commits whose committer date falls inside `[start, end)` are kept.
 *
 * @param {Object} season - GNOME season metadata (version, name, start, end)
 * @param {Record<string, Array<{author: {login: string}, commit: {committer: {date: string}}, parents: any[], htmlUrl?: string}>>} commitsByRepo
 * @param {(login: string) => boolean} isBot
 * @returns {Map<string, Map<string, { repo: string, dateMs: number, dateStr: string, htmlUrl?: string }>>}
 */
function collectContributorFirstCommits(
  season,
  commitsByRepo = {},
  isBot = () => false,
) {
  const contributorFirsts = new Map();
  if (!season || !commitsByRepo) return contributorFirsts;
  const startMs = Date.parse(season.start);
  const endMs =
    season.end != null && Number.isFinite(Date.parse(season.end))
      ? Date.parse(season.end)
      : null;

  for (const [repo, commits] of Object.entries(commitsByRepo)) {
    if (!Array.isArray(commits)) continue;
    for (const item of commits) {
      const login = item?.author?.login;
      if (!login || isBot(login)) continue;
      if (item?.parents?.length > 1) continue; // skip merges
      const dateStr = item?.commit?.committer?.date;
      const dateMs = Date.parse(dateStr);
      if (
        !Number.isFinite(dateMs) ||
        (Number.isFinite(startMs) && dateMs < startMs) ||
        (endMs != null && dateMs >= endMs)
      )
        continue;

      let userRepos = contributorFirsts.get(login);
      if (!userRepos) {
        userRepos = new Map();
        contributorFirsts.set(login, userRepos);
      }
      const existing = userRepos.get(repo);
      if (!existing || dateMs < existing.dateMs) {
        userRepos.set(repo, {
          repo,
          dateMs,
          dateStr,
          htmlUrl: item.htmlUrl,
        });
      }
    }
  }

  return contributorFirsts;
}

/**
 * Extracts season project breadth level-up milestones from season commits.
 * Emits an event only when a contributor crosses the breadth thresholds (2, 3, 5, 7, 10 distinct repos)
 * in the season, dated by the commit that unlocked that distinct project.
 *
 * @param {Object} season - GNOME season metadata (version, name, start)
 * @param {Record<string, Array<{author: {login: string}, commit: {committer: {date: string}}, parents: any[]}>>} commitsByRepo
 * @param {(login: string) => boolean} isBot
 * @returns {Array<MilestoneEvent>}
 */
function extractSeasonProjectUnlocks(
  season,
  commitsByRepo = {},
  isBot = () => false,
) {
  if (!season || !commitsByRepo) return [];
  const unlocks = [];
  const contributorFirsts = collectContributorFirstCommits(
    season,
    commitsByRepo,
    isBot,
  );

  // For each contributor, sort their distinct repos chronologically by first commit date
  const seasonKey = season.id || String(season.version);
  for (const [login, repoMap] of contributorFirsts.entries()) {
    const sortedProjects = Array.from(repoMap.values()).sort(
      (a, b) => a.dateMs - b.dateMs,
    );

    for (const tier of BREADTH_TIER_THRESHOLDS) {
      if (sortedProjects.length >= tier.count) {
        // The commit that crossed the threshold is the Nth project (0-indexed: tier.count - 1)
        const triggeringProject = sortedProjects[tier.count - 1];
        unlocks.push({
          id: `season-${seasonKey}-${login}-breadth-${tier.count}`,
          login,
          type: "project_unlock",
          value: tier.count,
          repo: triggeringProject.repo,
          title: tier.title,
          detail: `Active across ${tier.count} projects in Season of ${season.name || `GNOME ${season.version}`} (unlocked by ${triggeringProject.repo})`,
          detectedAt: triggeringProject.dateStr,
          badge: {
            label: tier.label,
            color: tier.color,
          },
        });
      }
    }
  }

  // Sort chronologically newest first
  unlocks.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
  return unlocks;
}

/**
 * Extracts each contributor's first contribution milestone for a season: one
 * gold-badged event per login, dated by their earliest in-window commit. The
 * caller owns cross-season de-duplication so exactly one event is emitted per
 * contributor across all seasons (in the season that holds their earliest
 * commit).
 *
 * @param {Object} season - GNOME season metadata (version, name, start)
 * @param {Record<string, Array<{author: {login: string}, commit: {committer: {date: string}}, parents: any[]}>>} commitsByRepo
 * @param {(login: string) => boolean} isBot
 * @returns {Array<MilestoneEvent>}
 */
function extractSeasonFirstContributions(
  season,
  commitsByRepo = {},
  isBot = () => false,
) {
  if (!season || !commitsByRepo) return [];
  const contributorFirsts = collectContributorFirstCommits(
    season,
    commitsByRepo,
    isBot,
  );

  const seasonKey = season.id || String(season.version);
  const events = [];
  for (const [login, repoMap] of contributorFirsts.entries()) {
    const sortedProjects = Array.from(repoMap.values()).sort(
      (a, b) => a.dateMs - b.dateMs,
    );
    const first = sortedProjects[0];
    if (!first) continue;

    events.push({
      id: `season-${seasonKey}-${login}-first`,
      login,
      type: "first_contribution",
      repo: first.repo,
      title: "First Contribution",
      detail: `First contribution to Bluefin (via ${first.repo})`,
      detectedAt: first.dateStr,
      commitUrl: first.htmlUrl,
      badge: {
        label: "FIRST",
        color: "var(--fx-gold)",
      },
    });
  }

  // Sort chronologically newest first
  events.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
  return events;
}

/**
 * Resolves exactly one first-contribution event per login to the season that
 * holds their globally earliest in-window commit.
 *
 * Input seasons each carry their raw `firstContributionCandidates` (all logins
 * seen in that window). Ownership is computed across every season on each run
 * rather than carried forward, so it is order-independent and self-healing: a
 * season whose sources failed on an earlier run can reclaim a contributor once
 * it recovers, and the newer season that provisionally held the marker drops
 * it. Returns owned events aligned to `seasons` by index.
 *
 * @param {Array<{firstContributionCandidates?: Array<MilestoneEvent>}>} seasons
 * @returns {Array<Array<MilestoneEvent>>}
 */
function assignFirstContributionOwners(seasons = []) {
  const singleOwner = new Map(); // login -> { index, ms }

  seasons.forEach((season, index) => {
    for (const event of season?.firstContributionCandidates ?? []) {
      if (!event?.login) continue;
      const ms = Date.parse(event.detectedAt);
      const prior = singleOwner.get(event.login);
      if (!prior || ms < prior.ms) {
        singleOwner.set(event.login, { index, ms });
      }
    }
  });

  return seasons.map((season, index) => {
    const owned = (season?.firstContributionCandidates ?? []).filter(
      (event) => event?.login && singleOwner.get(event.login)?.index === index,
    );
    owned.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
    return owned;
  });
}

/**
 * Merges new milestone events into an existing ledger, deduplicating by id
 * and capping at maxEntries, sorted newest first.
 */
function mergeMilestonesLedger(
  existing = [],
  newEvents = [],
  maxEntries = Infinity,
) {
  const seen = new Set();
  const merged = [];

  for (const event of [...newEvents, ...existing]) {
    if (!event || !event.id) continue;
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }

  merged.sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
  return merged.slice(0, maxEntries);
}

module.exports = {
  TASK_SHIPPED_LANDMARKS,
  TRUST_TIERS,
  tierRank,
  tierLabel,
  tierDetail,
  diffMilestones,
  extractSeasonProjectUnlocks,
  extractSeasonFirstContributions,
  assignFirstContributionOwners,
  mergeMilestonesLedger,
};
