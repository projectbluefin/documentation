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
import { REPORT_PORTFOLIO } from "./report-portfolio.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COUNTME_PATH = resolve(
  __dirname,
  "../../static/data/countme-history.json",
);

const GH_API = "https://api.github.com";

const LANE_LABELS = {
  "projectbluefin/bluefin": "Bluefin Testing",
  "projectbluefin/bluefin-lts": "Bluefin LTS",
  "projectbluefin/dakota": "Dakota",
};

function laneId(repository) {
  const name = repository.split("/").pop();
  return name === "bluefin" ? "bluefin-testing" : name;
}

export const FACTORY_LANES = REPORT_PORTFOLIO.filter((entry) =>
  entry.signals?.includes("lanes"),
).map((entry) => ({
  id: laneId(entry.repository),
  label:
    LANE_LABELS[entry.repository] ??
    entry.repository
      .split("/")
      .pop()
      .replace(
        /(^|-)([a-z])/g,
        (_, separator, letter) =>
          `${separator === "-" ? " " : ""}${letter.toUpperCase()}`,
      ),
  repo: entry.repository,
}));

async function fetchLaneRuns(lane, startISO, endISO, fetchImpl, headers) {
  const runs = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `${GH_API}/repos/${lane.repo}/actions/runs?per_page=100&page=${page}&created=${encodeURIComponent(`${startISO}..${endISO}`)}`;
    const response = await fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response?.ok) {
      throw new Error(`HTTP ${response?.status ?? "unknown"} for ${lane.repo}`);
    }
    const data = await response.json();
    const batch = data.workflow_runs ?? [];
    runs.push(...batch);
    if (batch.length < 100) break;
  }
  return runs;
}

function datesInclusive(start, end) {
  const dates = [];
  for (
    let current = new Date(`${start}T00:00:00.000Z`);
    current <= new Date(`${end}T00:00:00.000Z`);
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

function buildLaneMetrics(lane, runs, startMs, endMs, startISO, endISO) {
  const publishRuns = (runs ?? []).filter((run) => {
    const created = Date.parse(run.run_started_at ?? run.created_at ?? "");
    return (
      Number.isFinite(created) &&
      created >= startMs &&
      created <= endMs &&
      isPublishRun(run)
    );
  });

  const classified = publishRuns.map((run) => ({
    run,
    status: classifyRun(run),
  }));
  const passed = classified.filter(({ status }) => status === "passed").length;
  const failed = classified.filter(({ status }) => status === "failed").length;
  const pending = classified.filter(
    ({ status }) => status === "running",
  ).length;
  const durations = classified
    .filter(({ status }) => status !== "running")
    .map(({ run }) => runDurationMin(run))
    .filter(
      (duration) => typeof duration === "number" && Number.isFinite(duration),
    );

  const dailyCounts = {};
  for (const run of publishRuns) {
    const day = (run.run_started_at ?? run.created_at ?? "").slice(0, 10);
    if (day) dailyCounts[day] = (dailyCounts[day] ?? 0) + 1;
  }
  const trendLabels = datesInclusive(startISO, endISO);
  const trendValues = trendLabels.map((day) => dailyCounts[day] ?? 0);

  return {
    id: lane.id,
    label: lane.label,
    repo: lane.repo,
    total: publishRuns.length,
    passed,
    failed,
    pending,
    successRate: successRate(passed, failed),
    medianDurationMin: median(durations),
    sparklineData: trendValues.length > 1 ? trendValues : [passed, failed],
    trend: {
      labels: trendLabels,
      values: trendValues,
    },
    unavailableReason: null,
  };
}

function unavailableLane(lane, reason) {
  return {
    id: lane.id,
    label: lane.label,
    repo: lane.repo,
    total: null,
    passed: null,
    failed: null,
    pending: null,
    successRate: null,
    medianDurationMin: null,
    sparklineData: null,
    trend: null,
    unavailableReason: reason,
  };
}

/**
 * Fetch factory publishing lane statistics for a date window
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<{lanes: Array, totals: Object}>}
 */
export async function fetchFactoryMonthlyStats(
  startDate,
  endDate,
  fetchImpl = globalThis.fetch,
) {
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

  const laneResults = await Promise.all(
    FACTORY_LANES.map(async (lane) => {
      try {
        const runs = await fetchLaneRuns(
          lane,
          startISO,
          endISO,
          fetchImpl,
          headers,
        );
        return buildLaneMetrics(lane, runs, startMs, endMs, startISO, endISO);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[factory-metrics] ${lane.repo} unavailable — ${reason}`);
        return unavailableLane(lane, reason);
      }
    }),
  );

  const availableLanes = laneResults.filter(
    (lane) => lane.unavailableReason === null,
  );
  const allPassed = availableLanes.reduce((sum, lane) => sum + lane.passed, 0);
  const allFailed = availableLanes.reduce((sum, lane) => sum + lane.failed, 0);
  const allPending = availableLanes.reduce(
    (sum, lane) => sum + lane.pending,
    0,
  );
  const allTotal = availableLanes.reduce((sum, lane) => sum + lane.total, 0);
  const overallRate = successRate(allPassed, allFailed);

  return {
    lanes: laneResults,
    totals: {
      totalRuns: allTotal,
      passed: allPassed,
      failed: allFailed,
      pending: allPending,
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
function numericOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumKnown(values) {
  const numbers = values.map(numericOrNull);
  return numbers.every((value) => value !== null)
    ? numbers.reduce((sum, value) => sum + value, 0)
    : null;
}

export function extractCountmeMetricsFromPayload(payload, startDate, endDate) {
  if (payload?.unavailable === true) return null;

  const weeks = Array.isArray(payload?.weeks) ? payload.weeks : [];
  if (weeks.length === 0) return null;

  const endISO = endDate.toISOString().split("T")[0];
  const eligible = weeks
    .filter((week) => typeof week?.week === "string" && week.week <= endISO)
    .sort((left, right) => left.week.localeCompare(right.week));
  if (eligible.length === 0) return null;

  const latest = eligible[eligible.length - 1];
  const previous =
    eligible.length >= 5 ? eligible[eligible.length - 5] : eligible[0];
  const recentWeeks = eligible.slice(-10);

  return {
    currentTotal: sumKnown([latest.bluefin, latest["bluefin-lts"]]),
    previousTotal: sumKnown([previous.bluefin, previous["bluefin-lts"]]),
    historyPoints: recentWeeks.map((week) =>
      sumKnown([week.bluefin, week["bluefin-lts"]]),
    ),
    variants: [
      {
        name: "Bluefin",
        count: numericOrNull(latest.bluefin),
        color: "#1D76DB",
      },
      {
        name: "Bluefin LTS",
        count: numericOrNull(latest["bluefin-lts"]),
        color: "#2AA198",
      },
      {
        name: "Aurora",
        count: numericOrNull(latest.aurora),
        color: "#8A63D2",
      },
    ],
    sourceDate: latest.week,
  };
}

export function extractCountmeMetrics(startDate, endDate) {
  if (!existsSync(COUNTME_PATH)) return null;

  try {
    const raw = readFileSync(COUNTME_PATH, "utf8");
    return extractCountmeMetricsFromPayload(
      JSON.parse(raw),
      startDate,
      endDate,
    );
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
