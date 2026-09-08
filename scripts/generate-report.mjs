#!/usr/bin/env node
/**
 * Monthly report generation script
 *
 * Fetches closed issues/PRs from monitored repositories, generates formatted markdown report, and writes to reports/ directory
 * Runs on the first Monday of each month, generating a report for the previous month
 *
 * Planned work: Issues/PRs from projectbluefin/common
 * Opportunistic work: Issues/PRs from other monitored repositories
 */

import { fetchClosedItemsFromRepo } from "./lib/graphql-queries.mjs";
import {
  identifyNewContributors,
  isBot,
  loadKnownContributors,
  saveKnownContributors,
} from "./lib/contributor-tracker.mjs";
import {
  generateReportMarkdown,
  getReportSlug,
} from "./lib/markdown-generator.mjs";
import { MONITORED_REPOS } from "./lib/monitored-repos.mjs";
import { REPORT_PORTFOLIO } from "./lib/report-portfolio.mjs";
import { buildReportSnapshot } from "./lib/report-snapshot.mjs";
import {
  buildFlathubReportMetrics,
  readFlathubStats,
} from "./lib/report-ecosystem-metrics.mjs";
import {
  mergeReportHistory,
  readReportHistory,
} from "./lib/report-history.mjs";
import { buildActivityMetrics } from "./lib/report-activity-metrics.mjs";
import { fetchReleaseEvents } from "./lib/report-release-metrics.mjs";
import { fetchBuildMetrics } from "./lib/build-metrics.mjs";
import {
  fetchTapPromotions,
  fetchExperimentalAdditions,
} from "./lib/tap-promotions.mjs";
import {
  fetchFactoryMonthlyStats,
  extractCountmeMetrics,
  extractLeaderboardHeroes,
} from "./lib/factory-monthly-metrics.mjs";

import { writeFile } from "fs/promises";
import { pathToFileURL } from "url";

const KNOWN_CONTRIBUTORS_CACHE = "scripts/data/known-contributors.json";
const KNOWN_CONTRIBUTORS_SEED = "scripts/data/known-contributors-seed.json";
const REPORT_HISTORY_PATH = "scripts/data/report-history.json";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const COUNTME_SOURCE_URL =
  "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv";
const FLATHUB_SOURCE_URL = "https://flathub.org/api/v2/stats";
const REPORT_ACTIVITY_REPOSITORIES = new Set(
  REPORT_PORTFOLIO.filter(
    (entry) => entry.tier !== "ecosystem" && entry.signals.includes("activity"),
  ).map((entry) => entry.repository),
);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Split an array into two arrays based on a predicate.
 * Evaluates predicate exactly once per item.
 *
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => boolean} pred
 * @returns {[T[], T[]]} [passing, failing]
 */
function partition(arr, pred) {
  const pass = [];
  const fail = [];
  for (const item of arr) {
    (pred(item) ? pass : fail).push(item);
  }
  return [pass, fail];
}

/**
 * Structured logging with timestamps and levels
 */
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
  warn: (msg) => console.log(`[${new Date().toISOString()}] WARN: ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`),
};

/**
 * GitHub Actions annotation helpers
 */
const github = {
  error: (msg, file = "scripts/generate-report.js") =>
    console.error(`::error file=${file}::${msg}`),
  warning: (msg) => console.log(`::warning::${msg}`),
  notice: (msg) => console.log(`::notice::${msg}`),
};

/**
 * Calculate report window for previous month (UTC)
 *
 * @param {string} [overrideMonth] - Optional month override in YYYY-MM format (e.g., "2026-01")
 * @returns {{startDate: Date, endDate: Date}} Report window
 */
function calculateReportWindow(overrideMonth) {
  let reportYear, reportMonth;

  if (overrideMonth) {
    // Parse override (e.g., "2026-01" -> year: 2026, month: 0)
    const [year, month] = overrideMonth.split("-").map(Number);
    reportYear = year;
    reportMonth = month - 1; // Convert to 0-indexed
  } else {
    // Default: previous month
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() - 1; // Previous month

    // Handle January (month 0) -> go to December of previous year
    reportYear = month < 0 ? year - 1 : year;
    reportMonth = month < 0 ? 11 : month;
  }

  // Simple: first day to last day of the month, UTC
  const startDate = new Date(Date.UTC(reportYear, reportMonth, 1));
  const endDate = new Date(
    Date.UTC(reportYear, reportMonth + 1, 0, 23, 59, 59, 999),
  );

  return { startDate, endDate };
}

/**
 * Aggregate bot activity by repository and bot username
 *
 * @param {Array} botItems - Bot items from monitored repositories
 * @returns {Array} Aggregated bot activity [{repo, bot, count, items}]
 */
function aggregateBotActivity(botItems) {
  const activity = {};

  botItems.forEach((item) => {
    if (!item.content?.repository) return;

    const repo = item.content.repository.nameWithOwner;
    const bot = item.content.author?.login || "unknown";

    const key = `${repo}::${bot}`;

    if (!activity[key]) {
      activity[key] = {
        repo,
        bot,
        count: 0,
        items: [],
      };
    }

    activity[key].count++;
    activity[key].items.push(item);
  });

  return Object.values(activity);
}

function reportPeriod(startDate, endDate) {
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);
  return {
    month: start.slice(0, 7),
    start,
    end,
  };
}

function sourceRecord(id, status, stateReason, url, period, extra = {}) {
  return {
    id,
    status,
    stateReason: status === "available" ? null : stateReason || "Unavailable",
    url,
    window: { start: period.start, end: period.end },
    ...extra,
  };
}

function chartDefinition({
  id,
  kind,
  title,
  currentValue,
  unit,
  sourceLabel,
  sourceUrl,
  sourceWindow,
  labels,
  series,
  minimumPoints = 1,
}) {
  return {
    id,
    kind,
    title,
    currentValue: String(currentValue),
    unit,
    sourceLabel,
    sourceUrl,
    sourceWindow,
    labels: labels.length > 0 ? labels : [sourceWindow],
    series,
    minimumPoints,
  };
}

function numericTotal(values) {
  return values.reduce(
    (total, value) => (typeof value === "number" ? total + value : total),
    0,
  );
}

function periodSourceWindow(startDate, endDate) {
  return `${MONTH_NAMES[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()} UTC (${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)})`;
}

function withoutNestedHistory(snapshots) {
  return snapshots.map((snapshot) => {
    const copy = { ...snapshot };
    delete copy.history;
    return copy;
  });
}

export async function writeImmutableReport(
  filename,
  markdown,
  write = writeFile,
) {
  await write(filename, markdown, { encoding: "utf8", flag: "wx" });
}

export function buildReportSnapshotPayload({
  startDate,
  endDate,
  plannedPRs = [],
  opportunisticPRs = [],
  plannedPartial,
  plannedError,
  opportunisticPartial,
  truncationWarnings = { planned: [], opportunistic: [] },
  factoryStats,
  factoryError,
  releaseResult,
  releaseError,
  countmeStats,
  countmeError,
  flathubStats,
  tapAdditions = { production: [], experimental: [] },
  tapError,
  botActivity,
  leaderboard,
  history = { schemaVersion: 2, snapshots: [] },
}) {
  const period = reportPeriod(startDate, endDate);
  const sourceWindow = periodSourceWindow(startDate, endDate);
  const allPRs = [...plannedPRs, ...opportunisticPRs].filter((item) => {
    const repository =
      item?.repository ?? item?.content?.repository?.nameWithOwner;
    return REPORT_ACTIVITY_REPOSITORIES.has(repository);
  });
  const activityMetrics = buildActivityMetrics(allPRs, period);
  const activityReason =
    plannedPartial || opportunisticPartial
      ? [
          plannedError,
          ...truncationWarnings.planned,
          ...truncationWarnings.opportunistic,
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/^> /, "") || "GitHub activity data is partial."
      : null;
  const activitySource = sourceRecord(
    "github-activity",
    activityReason ? "unavailable" : "available",
    activityReason,
    GITHUB_GRAPHQL_URL,
    period,
  );
  const stableRepositories = REPORT_PORTFOLIO.filter(
    (entry) => entry.tier === "stable",
  ).map((entry) => entry.repository);
  const experimentalRepositories = REPORT_PORTFOLIO.filter(
    (entry) => entry.tier === "experimental",
  ).map((entry) => entry.repository);

  const activity = {
    calendar: activityReason
      ? null
      : chartDefinition({
          id: "activity-calendar",
          kind: "calendar",
          title: "Daily merged pull requests",
          currentValue: numericTotal(
            activityMetrics.dailyMerges.map((entry) => entry.value),
          ),
          unit: "merged pull requests",
          sourceLabel: "GitHub GraphQL",
          sourceUrl: GITHUB_GRAPHQL_URL,
          sourceWindow,
          labels: activityMetrics.dailyMerges.map((entry) => entry.date),
          series: [
            {
              id: "merged",
              label: "Merged pull requests",
              values: activityMetrics.dailyMerges.map((entry) => entry.value),
            },
          ],
          minimumPoints: 1,
        }),
    repositories: activityReason
      ? null
      : chartDefinition({
          id: "activity-repositories",
          kind: "grouped-bar",
          title: "Merged pull requests by repository",
          currentValue: numericTotal(
            activityMetrics.repositoryCounts.map((entry) => entry.value),
          ),
          unit: "merged pull requests",
          sourceLabel: "GitHub GraphQL",
          sourceUrl: GITHUB_GRAPHQL_URL,
          sourceWindow,
          labels: activityMetrics.repositoryCounts.map((entry) => entry.name),
          series: [
            {
              id: "repositories",
              label: "Merged pull requests",
              values: activityMetrics.repositoryCounts.map(
                (entry) => entry.value,
              ),
            },
          ],
          minimumPoints: 1,
        }),
    categories: activityReason
      ? null
      : chartDefinition({
          id: "activity-categories",
          kind: "grouped-bar",
          title: "Merged pull requests by label",
          currentValue: numericTotal(
            activityMetrics.categoryCounts.map((entry) => entry.value),
          ),
          unit: "label assignments",
          sourceLabel: "GitHub GraphQL",
          sourceUrl: GITHUB_GRAPHQL_URL,
          sourceWindow,
          labels: activityMetrics.categoryCounts.map((entry) => entry.name),
          series: [
            {
              id: "categories",
              label: "Label assignments",
              values: activityMetrics.categoryCounts.map(
                (entry) => entry.value,
              ),
            },
          ],
          minimumPoints: 1,
        }),
    portfolio: {
      stable: stableRepositories,
      experimental: experimentalRepositories,
    },
    ...(activityReason ? { unavailableReason: activityReason } : {}),
  };

  const fallbackReleaseSource = sourceRecord(
    "github-releases",
    "unavailable",
    releaseError || "GitHub release data is unavailable.",
    "https://api.github.com/repos",
    period,
  );
  const releaseSources = releaseResult?.sources ?? [fallbackReleaseSource];
  const releaseAggregateSource =
    releaseResult?.source ??
    (releaseSources.length === 1 ? releaseSources[0] : fallbackReleaseSource);
  const releaseProvenance = releaseResult?.source
    ? [releaseAggregateSource, ...releaseSources]
    : releaseSources;
  const releaseReasons = [releaseAggregateSource, ...releaseSources]
    .filter((source) => source.status === "unavailable")
    .map((source) => source.stateReason)
    .filter(Boolean);
  const releaseUnavailableReason =
    releaseError ||
    (releaseReasons.length > 0
      ? [...new Set(releaseReasons)].join("; ")
      : null);
  const releaseEvents = releaseResult?.events ?? [];
  const releaseSource = releaseAggregateSource;
  const hasAvailableReleaseSource =
    releaseAggregateSource.status === "available";
  const releaseChart =
    releaseResult && !releaseError && hasAvailableReleaseSource
      ? chartDefinition({
          id: "delivery-releases",
          kind: "line",
          title: "Release events",
          currentValue: releaseEvents.length,
          unit: "release events",
          sourceLabel: "GitHub Releases API",
          sourceUrl: releaseSource.url,
          sourceWindow,
          labels:
            releaseEvents.length > 0
              ? releaseEvents.map((event) => event.publishedAt.slice(0, 10))
              : [period.end],
          series: [
            {
              id: "releases",
              label: "Release events",
              values:
                releaseEvents.length > 0 ? releaseEvents.map(() => 1) : [0],
            },
          ],
          minimumPoints: 1,
        })
      : null;
  const laneLabels = factoryStats?.lanes?.map((lane) => lane.label) ?? [];
  const laneValues =
    factoryStats?.lanes?.map((lane) =>
      typeof lane.total === "number" ? lane.total : null,
    ) ?? [];
  const laneReasons =
    factoryStats?.lanes
      ?.map((lane) => lane.unavailableReason)
      .filter(Boolean) ?? [];
  const hasAvailableLane = factoryStats?.lanes?.some(
    (lane) => !lane.unavailableReason,
  );
  const laneUnavailableReason =
    factoryError ||
    (laneReasons.length > 0 ? laneReasons.join("; ") : null) ||
    (!hasAvailableLane
      ? "No publishing-lane measurements are available."
      : null);
  const cadenceLabels = [
    ...new Set(
      (factoryStats?.lanes ?? []).flatMap((lane) => lane.trend?.labels ?? []),
    ),
  ].sort();
  const cadenceSeries = (factoryStats?.lanes ?? []).map((lane) => ({
    id: lane.id,
    label: lane.label,
    values: cadenceLabels.map((label) => {
      const index = lane.trend?.labels?.indexOf(label) ?? -1;
      return index >= 0 ? (lane.trend.values[index] ?? null) : null;
    }),
  }));
  const hasCadenceTrend = cadenceLabels.length > 0;
  const delivery = {
    lanes: factoryStats?.lanes ?? null,
    cadence: hasAvailableLane
      ? chartDefinition({
          id: "delivery-cadence",
          kind: "line",
          title: "Publishing-lane cadence",
          currentValue: numericTotal(laneValues),
          unit: "publish runs",
          sourceLabel: "GitHub Actions",
          sourceUrl:
            "https://api.github.com/repos/projectbluefin/bluefin/actions/runs",
          sourceWindow,
          labels: hasCadenceTrend ? cadenceLabels : laneLabels,
          series: hasCadenceTrend
            ? cadenceSeries
            : [
                {
                  id: "publish-runs",
                  label: "Publish runs",
                  values: laneValues,
                },
              ],
          minimumPoints: 1,
        })
      : null,
    releases: releaseChart,
    ...(releaseUnavailableReason || laneUnavailableReason
      ? {
          unavailableReason: [laneUnavailableReason, releaseUnavailableReason]
            .filter(Boolean)
            .join("; "),
        }
      : {}),
  };

  const totalPRs = allPRs.length;
  const totalBotPRs = Math.min(
    totalPRs,
    numericTotal((botActivity ?? []).map((entry) => entry.count)),
  );
  const totalHumanPRs = totalPRs - totalBotPRs;
  const automationValues = [totalHumanPRs, totalBotPRs];
  const participationUnavailableReason =
    plannedPartial || opportunisticPartial
      ? activityReason || "GitHub participation data is partial."
      : null;
  const participation = {
    automation: participationUnavailableReason
      ? null
      : chartDefinition({
          id: "participation-automation",
          kind: "stacked-bar",
          title: "Human and automation activity",
          currentValue: totalHumanPRs + totalBotPRs,
          unit: "pull requests",
          sourceLabel: "GitHub GraphQL",
          sourceUrl: GITHUB_GRAPHQL_URL,
          sourceWindow,
          labels: ["Report period"],
          series: [
            { id: "human", label: "Human", values: [automationValues[0]] },
            {
              id: "automation",
              label: "Automation",
              values: [automationValues[1]],
            },
          ],
          minimumPoints: 1,
        }),
    leaderboard: participationUnavailableReason ? null : leaderboard,
    ...(participationUnavailableReason
      ? { unavailableReason: participationUnavailableReason }
      : {}),
  };

  const countmeIncomplete =
    countmeStats !== null &&
    countmeStats !== undefined &&
    (typeof countmeStats.currentTotal !== "number" ||
      !Number.isFinite(countmeStats.currentTotal));
  const countmeUnavailableReason =
    countmeError ||
    (countmeIncomplete
      ? "Countme active-system measurement is incomplete."
      : countmeStats
        ? null
        : "Countme data is unavailable.");
  const countmeSource = sourceRecord(
    "countme",
    countmeStats && !countmeIncomplete ? "available" : "unavailable",
    countmeUnavailableReason,
    COUNTME_SOURCE_URL,
    period,
  );
  const countmeChart =
    countmeStats && !countmeIncomplete
      ? chartDefinition({
          id: "ecosystem-countme",
          kind: "line",
          title: "Countme active systems",
          currentValue: countmeStats.currentTotal,
          unit: "estimated weekly active systems",
          sourceLabel: "Countme",
          sourceUrl: COUNTME_SOURCE_URL,
          sourceWindow: `Through ${countmeStats.sourceDate}`,
          labels: countmeStats.historyPoints.map(
            (_, index) => `week-${index + 1}`,
          ),
          series: [
            {
              id: "active-systems",
              label: "Active systems",
              values: countmeStats.historyPoints,
            },
          ],
          minimumPoints: 1,
        })
      : null;
  const tapSource = sourceRecord(
    "homebrew",
    tapError ? "unavailable" : "available",
    tapError,
    "https://github.com/ublue-os/homebrew-tap",
    period,
  );
  const tapValues = [
    tapAdditions.production?.length ?? 0,
    tapAdditions.experimental?.length ?? 0,
  ];
  const homebrewChart = tapError
    ? null
    : chartDefinition({
        id: "ecosystem-homebrew",
        kind: "grouped-bar",
        title: "Homebrew tap additions",
        currentValue: numericTotal(tapValues),
        unit: "package additions",
        sourceLabel: "Homebrew taps",
        sourceUrl: "https://github.com/ublue-os/homebrew-tap",
        sourceWindow,
        labels: ["Production tap", "Experimental tap"],
        series: [{ id: "additions", label: "Additions", values: tapValues }],
        minimumPoints: 1,
      });
  const flathubMetrics = buildFlathubReportMetrics(flathubStats, period);
  const flathubSource = sourceRecord(
    "flathub",
    flathubMetrics.chart ? "available" : "unavailable",
    flathubMetrics.reason,
    FLATHUB_SOURCE_URL,
    period,
  );
  const ecosystem = {
    countme: countmeChart,
    homebrew: homebrewChart,
    flathub: flathubMetrics.chart,
    unavailableReason: [countmeSource, tapSource, flathubSource]
      .filter((source) => source.status === "unavailable")
      .map((source) => source.stateReason)
      .join("; "),
  };

  return buildReportSnapshot({
    period,
    sources: [
      activitySource,
      sourceRecord(
        "github-lanes",
        hasAvailableLane ? "available" : "unavailable",
        laneUnavailableReason,
        "https://api.github.com/repos/projectbluefin/bluefin/actions/runs",
        period,
      ),
      ...releaseProvenance,
      countmeSource,
      tapSource,
      flathubSource,
    ],
    activity,
    delivery,
    participation,
    ecosystem,
    history: withoutNestedHistory(history.snapshots),
  });
}

/**
 * Main report generation function
 */
export async function generateReport() {
  log.info("=== Monthly Report Generator ===");

  // Check for GITHUB_TOKEN
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    log.error("GITHUB_TOKEN or GH_TOKEN environment variable required");
    github.error(
      "Missing authentication token. Set GITHUB_TOKEN or GH_TOKEN environment variable",
    );
    console.error("Set one of these tokens to authenticate with GitHub API");
    process.exit(1);
  }

  // Parse CLI arguments for month override (e.g., --month=2026-01)
  const monthOverride = process.argv
    .find((arg) => arg.startsWith("--month="))
    ?.split("=")[1];

  if (monthOverride) {
    log.info(`Using month override: ${monthOverride}`);
  }

  // Calculate report window (previous month or override)
  const { startDate, endDate } = calculateReportWindow(monthOverride);
  log.info(
    `Report period: ${MONTH_NAMES[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()} (${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)})`,
  );

  try {
    const truncationWarnings = {
      planned: [],
      opportunistic: [],
    };

    // Fetch planned work from projectbluefin/common repository
    log.info("Fetching planned work from projectbluefin/common...");
    const plannedResult = await fetchClosedItemsFromRepo(
      "projectbluefin",
      "common",
      startDate,
      endDate,
    );
    const {
      items: plannedItems,
      partial: plannedPartial,
      error: plannedError,
    } = plannedResult;

    if (plannedPartial) {
      truncationWarnings.planned.push(
        `> ⚠️ **Data truncated** — \`projectbluefin/common\` pagination failed mid-fetch (fetched ${plannedItems.length} items before error: ${plannedError || "unknown error"}). This section may be incomplete.`,
      );
      log.warn(
        `Planned work data is partial for projectbluefin/common (${plannedItems.length} items): ${plannedError || "unknown error"}`,
      );
      github.warning(
        `Data truncated for projectbluefin/common (fetched ${plannedItems.length} items before error)`,
      );
    }

    // Filter to only include merged PRs (exclude closed issues)
    const plannedPRs = plannedItems.filter(
      (item) => item.type === "PullRequest",
    );
    log.info(
      `Planned work items from projectbluefin/common: ${plannedPRs.length} PRs (${plannedItems.length - plannedPRs.length} issues excluded)`,
    );

    // Fetch opportunistic work from other monitored repositories
    log.info(
      "Fetching opportunistic work from other monitored repositories...",
    );
    const opportunisticItems = [];

    for (const repo of MONITORED_REPOS) {
      // Skip projectbluefin/common since we already fetched it as planned work
      if (repo === "projectbluefin/common") {
        continue;
      }

      const [owner, name] = repo.split("/");
      log.info(`  Fetching from ${repo}...`);
      const repoResult = await fetchClosedItemsFromRepo(
        owner,
        name,
        startDate,
        endDate,
      );
      const { items: repoItems, partial, error } = repoResult;
      if (partial) {
        truncationWarnings.opportunistic.push(
          `> ⚠️ **Data truncated** — \`${repo}\` pagination failed mid-fetch (fetched ${repoItems.length} items before error: ${error || "unknown error"}). This section may be incomplete.`,
        );
        log.warn(
          `Opportunistic data is partial for ${repo} (${repoItems.length} items): ${error || "unknown error"}`,
        );
        github.warning(
          `Data truncated for ${repo} (fetched ${repoItems.length} items before error)`,
        );
      }
      opportunisticItems.push(...repoItems);
    }

    // Filter to only include merged PRs (exclude closed issues)
    const opportunisticPRs = opportunisticItems.filter(
      (item) => item.type === "PullRequest",
    );
    log.info(
      `Opportunistic work items from other repos: ${opportunisticPRs.length} PRs (${opportunisticItems.length - opportunisticPRs.length} issues excluded)`,
    );

    // Transform items to match expected structure
    const transformItem = (item) => ({
      content: {
        __typename: item.type, // "Issue" or "PullRequest"
        number: item.number,
        title: item.title,
        url: item.url,
        repository: { nameWithOwner: item.repository },
        labels: { nodes: item.labels },
        author: { login: item.author },
      },
    });

    const itemsInWindow = plannedPRs.map(transformItem);
    const transformedOpportunisticItems = opportunisticPRs.map(transformItem);

    // Handle empty data period
    if (
      itemsInWindow.length === 0 &&
      transformedOpportunisticItems.length === 0
    ) {
      log.warn(
        "No items completed in this period - generating quiet period report",
      );
      github.warning("This was a quiet period with no completed items");
    }

    // Single bot filter pass — isBot evaluated once per item
    const isHuman = (item) => !isBot(item.content?.author?.login || "");
    const [plannedHumanItems, plannedBotItems] = partition(
      itemsInWindow,
      isHuman,
    );
    const [opportunisticHumanItems, opportunisticBotItems] = partition(
      transformedOpportunisticItems,
      isHuman,
    );
    const botItems = [...plannedBotItems, ...opportunisticBotItems];

    log.info(`Planned work (human): ${plannedHumanItems.length}`);
    log.info(`Opportunistic work (human): ${opportunisticHumanItems.length}`);
    log.info(`Bot contributions: ${botItems.length}`);

    // Extract contributor usernames (human PRs only)
    const allHumanItems = [...plannedHumanItems, ...opportunisticHumanItems];
    const contributors = [
      ...new Set(
        allHumanItems
          .filter((item) => item.content?.__typename === "PullRequest")
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    log.info(`Unique contributors (PR authors): ${contributors.length}`);

    // Load known contributors from cache, identify new ones (pure), save after report write
    log.info("Identifying new contributors...");
    let newContributors = [];
    let knownSet = new Set();
    try {
      knownSet = await loadKnownContributors(
        KNOWN_CONTRIBUTORS_CACHE,
        KNOWN_CONTRIBUTORS_SEED,
      );
      newContributors = identifyNewContributors(contributors, knownSet);
      if (newContributors.length > 0) {
        log.info(`New contributors this period: ${newContributors.join(", ")}`);
        github.notice(
          `🎉 ${newContributors.length} new contributor${newContributors.length > 1 ? "s" : ""} this period!`,
        );
      }
    } catch (error) {
      log.warn("New contributor detection failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      newContributors = [];
    }

    // Aggregate bot activity
    const botActivity = aggregateBotActivity(botItems);
    log.info(`Bot activity groups: ${botActivity.length}`);

    // Fetch build health metrics
    log.info("Fetching build health metrics...");
    let buildMetrics = null;
    try {
      buildMetrics = await fetchBuildMetrics(startDate, endDate);
      if (buildMetrics) {
        log.info(
          `✅ Build metrics fetched: ${buildMetrics.images.length} workflows tracked`,
        );
      } else {
        log.warn("Build metrics unavailable, section will be skipped");
      }
    } catch (error) {
      log.warn("Build metrics fetch failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      // Continue report generation even if build metrics fail
      buildMetrics = null;
    }

    // Fetch tap additions
    log.info("Fetching homebrew tap additions...");
    const tapAdditions = { production: [], experimental: [] };
    let tapError = null;
    try {
      tapAdditions.production = await fetchTapPromotions(startDate, endDate);
      tapAdditions.experimental = await fetchExperimentalAdditions(
        startDate,
        endDate,
      );

      const totalAdditions =
        tapAdditions.production.length + tapAdditions.experimental.length;

      if (totalAdditions > 0) {
        log.info(
          `✅ Tap additions found: ${tapAdditions.production.length} production, ${tapAdditions.experimental.length} experimental`,
        );
        github.notice(`🍺 ${totalAdditions} new packages added to taps`);
      } else {
        log.info("No tap additions this period");
      }
    } catch (error) {
      log.warn("Tap additions fetch failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      tapError = error.message;
      // Continue report generation even if tap additions fail
    }

    // Load the Flathub snapshot refreshed by the workflow before assembling
    // this archive.
    log.info("Loading Flathub statistics...");
    let flathubStats = null;
    try {
      flathubStats = readFlathubStats();
    } catch (error) {
      log.warn(`Flathub statistics unavailable: ${error.message}`);
    }

    // Fetch factory monthly stats
    log.info("Fetching factory publishing lane metrics...");
    let factoryStats = null;
    let factoryError = null;
    try {
      factoryStats = await fetchFactoryMonthlyStats(startDate, endDate);
      log.info(
        `✅ Factory stats fetched: ${factoryStats.lanes.length} lanes tracked`,
      );
    } catch (error) {
      log.warn(`Factory stats fetch failed: ${error.message}`);
      factoryError = error.message;
      factoryStats = null;
    }

    // Fetch release metadata from the configured public GitHub sources
    log.info("Fetching release events...");
    let releaseResult = null;
    let releaseError = null;
    try {
      releaseResult = await fetchReleaseEvents(
        REPORT_PORTFOLIO,
        reportPeriod(startDate, endDate),
      );
      log.info(`✅ Release events fetched: ${releaseResult.events.length}`);
    } catch (error) {
      releaseError = error instanceof Error ? error.message : String(error);
      log.warn(`Release event fetch failed: ${releaseError}`);
    }

    // Extract countme telemetry metrics
    log.info("Extracting countme telemetry metrics...");
    let countmeStats = null;
    let countmeError = null;
    try {
      countmeStats = extractCountmeMetrics(startDate, endDate);
      if (countmeStats) {
        log.info(
          `✅ Countme telemetry extracted: ${countmeStats.currentTotal} active systems`,
        );
      }
    } catch (error) {
      log.warn(`Countme telemetry extraction failed: ${error.message}`);
      countmeError = error.message;
      countmeStats = null;
    }
    if (!countmeStats && !countmeError) {
      countmeError = "Countme data is unavailable.";
    }

    // Extract Hive leaderboard heroes and new lights
    log.info("Extracting Hive leaderboard heroes...");
    let leaderboard = null;
    try {
      leaderboard = extractLeaderboardHeroes(allHumanItems, newContributors);
      log.info(
        `✅ Leaderboard extracted: ${leaderboard.heroes.length} heroes, ${leaderboard.newLights.length} new lights`,
      );
    } catch (error) {
      log.warn(`Leaderboard extraction failed: ${error.message}`);
      leaderboard = null;
    }

    let reportHistory;
    try {
      reportHistory = readReportHistory();
    } catch (error) {
      log.warn(
        `Report history unavailable, starting from the seed: ${error.message}`,
      );
      reportHistory = { schemaVersion: 2, snapshots: [] };
    }

    const snapshot = buildReportSnapshotPayload({
      startDate,
      endDate,
      plannedPRs,
      opportunisticPRs,
      plannedPartial,
      plannedError,
      opportunisticPartial: truncationWarnings.opportunistic.length > 0,
      truncationWarnings,
      factoryStats,
      factoryError,
      releaseResult,
      releaseError,
      countmeStats,
      countmeError,
      flathubStats,
      tapAdditions,
      tapError,
      botActivity,
      leaderboard,
      history: reportHistory,
    });

    // Generate markdown
    log.info("Generating markdown...");
    let markdown = generateReportMarkdown({
      snapshot,
      plannedItems: plannedHumanItems,
      opportunisticItems: opportunisticHumanItems,
      contributors,
      newContributors,
    });

    if (
      truncationWarnings.planned.length > 0 ||
      truncationWarnings.opportunistic.length > 0
    ) {
      const warningSections = ["## Data Quality Warnings"];
      if (truncationWarnings.planned.length > 0) {
        warningSections.push("### Planned Work", ...truncationWarnings.planned);
      }
      if (truncationWarnings.opportunistic.length > 0) {
        warningSections.push(
          "### Opportunistic Work",
          ...truncationWarnings.opportunistic,
        );
      }
      const warningBlock = warningSections.join("\n\n");
      markdown = markdown.replace("# Summary", `# Summary\n\n${warningBlock}`);
    }

    // Write to blog directory
    const slug = getReportSlug(startDate);
    const filename = `blog/${endDate.toISOString().slice(0, 10)}-${slug}.mdx`;
    await writeImmutableReport(filename, markdown);

    // Persist history only after the immutable post has been written successfully.
    const nextHistory = mergeReportHistory(reportHistory, snapshot);
    await writeFile(
      REPORT_HISTORY_PATH,
      `${JSON.stringify(nextHistory, null, 2)}\n`,
      "utf8",
    );

    // Save known contributors cache after the post and history writes.
    try {
      const updatedSet = new Set([...knownSet, ...contributors]);
      await saveKnownContributors(updatedSet, KNOWN_CONTRIBUTORS_CACHE);
    } catch (error) {
      log.warn(
        "Failed to save known contributors cache — next run may re-identify some contributors as new",
      );
      log.warn(`Error: ${error.message}`);
    }

    log.info(`✅ Report generated: ${filename}`);
    log.info(`   ${plannedHumanItems.length} planned work items`);
    log.info(`   ${opportunisticHumanItems.length} opportunistic work items`);
    log.info(`   ${contributors.length} contributors`);
    log.info(`   ${newContributors.length} new contributors`);
    log.info(`   ${botItems.length} bot PRs`);
    log.info(
      `   ${buildMetrics ? buildMetrics.images.length + " workflows tracked" : "Build metrics unavailable"}`,
    );
    const totalAdditions =
      tapAdditions.production.length + tapAdditions.experimental.length;
    log.info(`   ${totalAdditions} tap additions`);

    // GitHub Actions summary annotation
    github.notice(
      `Report generated: ${plannedHumanItems.length} planned + ${opportunisticHumanItems.length} opportunistic, ${contributors.length} contributors, ${newContributors.length} new, ${totalAdditions} tap additions`,
    );
  } catch (error) {
    log.error("Report generation failed");
    log.error(error.message);

    // GitHub Actions error annotation
    if (error.message.includes("rate limit")) {
      github.error(
        "GitHub API rate limit exceeded. Wait for rate limit reset or use token with higher limits.",
      );
      console.error(
        "\nTip: Use a personal access token with higher rate limits",
      );
      process.exit(1);
    }

    if (
      error.message.includes("authentication") ||
      error.message.includes("Authentication")
    ) {
      github.error(
        "GitHub authentication failed. Ensure GITHUB_TOKEN or GH_TOKEN is valid and has required permissions.",
      );
      console.error("\nTip: Set GITHUB_TOKEN or GH_TOKEN environment variable");
      process.exit(1);
    }

    if (
      error.message.includes("Network") ||
      error.message.includes("timeout")
    ) {
      github.error(
        "Network failure during report generation. Check connectivity and GitHub API status.",
      );
      process.exit(1);
    }

    // Generic error
    github.error(`Report generation failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  generateReport().catch((error) => {
    log.error("Unhandled error in report generation");
    log.error(error.message);
    github.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}
