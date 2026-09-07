/**
 * Factory & Lab monthly metrics aggregator for monthly reports
 *
 * Extracts build health, active lanes, countme trends, and factory KPIs
 * for the monthly reporting window.
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isPublishRun,
  classifyRun,
  runDurationMin,
  median,
  successRate,
} from "../fetch-factory-stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTME_PATH = resolve(
  __dirname,
  "../../static/data/countme-history.json",
);

const GH_API = "https://api.github.com";

const FACTORY_LANES = [
  {
    id: "bluefin-testing",
    label: "Bluefin Testing",
    repo: "projectbluefin/bluefin",
  },
  {
    id: "bluefin-lts",
    label: "Bluefin LTS",
    repo: "projectbluefin/bluefin-lts",
  },
  {
    id: "dakota",
    label: "Dakota",
    repo: "projectbluefin/dakota",
  },
];

/**
 * Fetch factory publishing lane statistics for a date window
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{lanes: Array, totals: Object}>}
 */
export async function fetchFactoryMonthlyStats(startDate, endDate) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "bluefin-docs/generate-report",
    ...(token ? { Authorization: `token ${token}` } : {}),
  };

  const startISO = startDate.toISOString().split("T")[0];
  const endISO = endDate.toISOString().split("T")[0];
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const laneResults = [];

  for (const lane of FACTORY_LANES) {
    let runs = [];
    try {
      for (let page = 1; page <= 5; page++) {
        const url = `${GH_API}/repos/${lane.repo}/actions/runs?per_page=100&page=${page}&created=${encodeURIComponent(`${startISO}..${endISO}`)}`;
        const res = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          console.warn(`[factory-metrics] HTTP ${res.status} for ${lane.repo}`);
          break;
        }
        const data = await res.json();
        const batch = data.workflow_runs ?? [];
        runs.push(...batch);
        if (batch.length < 100) break;
      }
    } catch (err) {
      console.warn(
        `[factory-metrics] Failed fetching runs for ${lane.repo}: ${err.message}`,
      );
    }

    const publishRuns = runs.filter((r) => {
      const created = Date.parse(r.run_started_at ?? r.created_at ?? "");
      return created >= startMs && created <= endMs && isPublishRun(r);
    });

    const passed = publishRuns.filter(
      (r) => classifyRun(r) === "passed",
    ).length;
    const failed = publishRuns.filter(
      (r) => classifyRun(r) === "failed",
    ).length;
    const running = publishRuns.filter(
      (r) => classifyRun(r) === "running",
    ).length;
    const total = publishRuns.length;
    const rate = successRate(passed, failed);

    const durations = publishRuns
      .map(runDurationMin)
      .filter((d) => typeof d === "number" && Number.isFinite(d));
    const medianDur = median(durations);

    // Group runs by day to create a sparkline data array
    const dailyCounts = {};
    publishRuns.forEach((r) => {
      const day = (r.run_started_at ?? r.created_at ?? "").slice(0, 10);
      if (day) {
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    });

    const sparklineData = Object.keys(dailyCounts)
      .sort()
      .map((d) => dailyCounts[d]);

    laneResults.push({
      id: lane.id,
      label: lane.label,
      repo: lane.repo,
      total,
      passed,
      failed,
      running,
      successRate: rate,
      medianDurationMin: medianDur,
      sparklineData:
        sparklineData.length > 1 ? sparklineData : [passed, failed],
    });
  }

  const allPassed = laneResults.reduce((sum, l) => sum + l.passed, 0);
  const allFailed = laneResults.reduce((sum, l) => sum + l.failed, 0);
  const allTotal = laneResults.reduce((sum, l) => sum + l.total, 0);
  const overallRate = successRate(allPassed, allFailed);

  return {
    lanes: laneResults,
    totals: {
      totalRuns: allTotal,
      passed: allPassed,
      failed: allFailed,
      successRate: overallRate,
    },
  };
}

/**
 * Extract active systems Countme data for the report period
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Object|null}
 */
export function extractCountmeMetrics(startDate, endDate) {
  if (!existsSync(COUNTME_PATH)) {
    return null;
  }

  try {
    const raw = readFileSync(COUNTME_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const weeks = parsed.weeks ?? [];
    if (weeks.length === 0) return null;

    const endISO = endDate.toISOString().split("T")[0];

    // Filter weeks up to end date
    const eligible = weeks.filter((w) => w.week <= endISO);
    if (eligible.length === 0) return null;

    const latest = eligible[eligible.length - 1];
    const prev =
      eligible.length >= 5 ? eligible[eligible.length - 5] : eligible[0];

    const currentTotal = (latest.bluefin || 0) + (latest["bluefin-lts"] || 0);
    const prevTotal = (prev.bluefin || 0) + (prev["bluefin-lts"] || 0);

    // Get last 8-12 weeks of Bluefin totals for sparkline
    const recentWeeks = eligible.slice(-10);
    const historyPoints = recentWeeks.map(
      (w) => (w.bluefin || 0) + (w["bluefin-lts"] || 0),
    );

    const variants = [
      { name: "Bluefin", count: latest.bluefin || 0, color: "#1D76DB" },
      {
        name: "Bluefin LTS",
        count: latest["bluefin-lts"] || 0,
        color: "#2AA198",
      },
      { name: "Aurora", count: latest.aurora || 0, color: "#8A63D2" },
    ];

    return {
      currentTotal,
      previousTotal: prevTotal,
      historyPoints,
      variants,
      sourceDate: latest.week,
    };
  } catch (err) {
    console.warn(
      `[factory-metrics] Failed reading countme history: ${err.message}`,
    );
    return null;
  }
}

/**
 * Extract Hive leaderboard heroes and new lights for monthly report
 *
 * @param {Array} allHumanItems - Closed/merged human items
 * @param {Array<string>} [newContributors=[]] - List of first-time contributor logins
 * @returns {{heroes: Array, newLights: Array}}
 */
export function extractLeaderboardHeroes(
  allHumanItems = [],
  newContributors = [],
) {
  const newSet = new Set(newContributors);
  const byAuthor = new Map();

  for (const item of allHumanItems) {
    const type = item.content?.__typename || item.type;
    if (type && type !== "PullRequest") continue;

    const login = item.content?.author?.login || item.author;
    if (!login) continue;

    const rawRepo =
      item.content?.repository?.nameWithOwner || item.repository || "";
    const repo = rawRepo
      .replace(/^projectbluefin\//, "")
      .replace(/^ublue-os\//, "");

    let entry = byAuthor.get(login);
    if (!entry) {
      entry = {
        login,
        contributions: 0,
        repos: new Set(),
        isNew: newSet.has(login),
      };
      byAuthor.set(login, entry);
    }
    entry.contributions += 1;
    if (repo) entry.repos.add(repo);
  }

  // Sort by contributions desc, projects desc, login asc
  const sorted = Array.from(byAuthor.values())
    .map((e) => ({
      login: e.login,
      contributions: e.contributions,
      projects: e.repos.size,
      repos: Array.from(e.repos),
      isNew: e.isNew,
    }))
    .sort((a, b) => {
      if (b.contributions !== a.contributions)
        return b.contributions - a.contributions;
      if (b.projects !== a.projects) return b.projects - a.projects;
      return a.login.localeCompare(b.login);
    });

  const heroes = sorted.map((hero, idx) => {
    const rank = idx + 1;
    let badge = undefined;
    if (rank === 1) {
      badge = { label: "Top Hero", color: "#F9C74F", title: "Month MVP" };
    } else if (hero.isNew) {
      badge = {
        label: "New Light",
        color: "#1D76DB",
        title: "First-time Contributor",
      };
    } else if (hero.contributions >= 5) {
      badge = {
        label: "High Velocity",
        color: "#2AA198",
        title: "5+ Merged PRs",
      };
    } else if (hero.projects >= 3) {
      badge = {
        label: "Cross-Fleet",
        color: "#8A63D2",
        title: "Multi-Repo Impact",
      };
    }

    return {
      rank,
      login: hero.login,
      avatarUrl: `https://github.com/${hero.login}.png?size=64`,
      contributions: hero.contributions,
      projects: hero.projects,
      repos: hero.repos,
      badge,
      isNew: hero.isNew,
    };
  });

  const newLights = newContributors.map((login) => {
    const hero = byAuthor.get(login);
    return {
      login,
      avatarUrl: `https://github.com/${login}.png?size=32`,
      repos: hero ? Array.from(hero.repos) : [],
    };
  });

  return { heroes, newLights };
}
