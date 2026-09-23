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
  const startMs = Date.parse(season.start);
  const unlocks = [];

  // Group first commit dates per contributor: login -> Array<{ repo, dateMs, dateStr }>
  const contributorFirsts = new Map();

  for (const [repo, commits] of Object.entries(commitsByRepo)) {
    if (!Array.isArray(commits)) continue;
    for (const item of commits) {
      const login = item?.author?.login;
      if (!login || isBot(login)) continue;
      if (item?.parents?.length > 1) continue; // skip merges
      const dateStr = item?.commit?.committer?.date;
      const dateMs = Date.parse(dateStr);
      if (!Number.isFinite(dateMs) || (startMs && dateMs < startMs)) continue;

      let userRepos = contributorFirsts.get(login);
      if (!userRepos) {
        userRepos = new Map();
        contributorFirsts.set(login, userRepos);
      }
      const existing = userRepos.get(repo);
      if (!existing || dateMs < existing.dateMs) {
        userRepos.set(repo, { repo, dateMs, dateStr });
      }
    }
  }

  // For each contributor, sort their distinct repos chronologically by first commit date
  for (const [login, repoMap] of contributorFirsts.entries()) {
    const sortedProjects = Array.from(repoMap.values()).sort(
      (a, b) => a.dateMs - b.dateMs,
    );

    for (const tier of BREADTH_TIER_THRESHOLDS) {
      if (sortedProjects.length >= tier.count) {
        // The commit that crossed the threshold is the Nth project (0-indexed: tier.count - 1)
        const triggeringProject = sortedProjects[tier.count - 1];
        unlocks.push({
          id: `season-${season.version}-${login}-breadth-${tier.count}`,
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
 * Merges new milestone events into an existing ledger, deduplicating by id
 * and capping at maxEntries, sorted newest first.
 */
function mergeMilestonesLedger(existing = [], newEvents = [], maxEntries = 50) {
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
  mergeMilestonesLedger,
};
