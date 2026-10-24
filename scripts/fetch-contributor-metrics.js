#!/usr/bin/env node
/**
 * scripts/fetch-contributor-metrics.js
 *
 * Automated data pipeline tracking monthly active contributors, cohorts
 * (new vs. returning), and activity streams (human PRs, automation PRs,
 * issues, reviews) across projectbluefin.
 *
 * Conforms to the Project Bluefin Agent Operating Contract:
 * - Pure functions exported for offline testing in scripts/fetch-contributor-metrics.test.js
 * - Never fails the build: catches all errors, writes explicit unavailable payloads, exits 0
 * - Refetch window rule: refetch current in-flight month AND previous calendar month
 *   to ensure month-end tail is never cut off.
 * - Only freeze a month if completed strictly after month end and no truncation was tripped.
 * - Truncation guard: if pagination limits or rate limits are reached, record null
 *   for the affected stream (never coerced to 0 or partial undercount).
 * - Reads scripts/data/known-contributors.json in read-only mode via loadKnownContributors.
 * - Reuses accurate data from scripts/data/report-history.json for historical months.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { githubToken } = require("./lib/request-queue");
const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "contributor-metrics.json",
);

const KNOWN_CONTRIBUTORS_PATH = path.join(
  __dirname,
  "data",
  "known-contributors.json",
);
const KNOWN_CONTRIBUTORS_SEED_PATH = path.join(
  __dirname,
  "data",
  "known-contributors-seed.json",
);

const REPORT_HISTORY_PATH = path.join(__dirname, "data", "report-history.json");

/**
 * Bot patterns matching contributor-tracker.mjs
 */
const BOT_PATTERNS = [
  /^dependabot\[bot\]$/,
  /^dependabot$/i,
  /^renovate\[bot\]$/,
  /^renovate$/i,
  /^app\/renovate$/,
  /^github-actions\[bot\]$/,
  /^github-actions$/,
  /^copilot-swe-agent$/,
  /^ubot-\d+$/,
  /^pull$/,
  /^testpullapp$/,
  /^app\//i,
  /^mergeraptor(\[bot\])?$/i,
  /^Copilot$/i,
  /^kubestellar-hive(\[bot\])?$/i,
  /^hivecommons-hive(\[bot\])?$/i,
  /^hivecommons.*$/i,
  /^kubestellar.*$/i,
  /\[bot\]$/i,
  /-bot$/i,
];

/**
 * Check if a username is a bot
 * @param {string} username
 * @returns {boolean}
 */
function isBot(username) {
  if (!username || typeof username !== "string") return false;
  return BOT_PATTERNS.some((pattern) => pattern.test(username));
}

/**
 * Load known contributors in read-only mode.
 * Falls back to seed file if main cache is missing. Never throws.
 * @param {string} [cachePath]
 * @param {string} [seedPath]
 * @returns {Set<string>}
 */
function loadKnownContributors(
  cachePath = KNOWN_CONTRIBUTORS_PATH,
  seedPath = KNOWN_CONTRIBUTORS_SEED_PATH,
) {
  for (const p of [cachePath, seedPath]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch {
      // Ignore parse/read errors and try fallback
    }
  }
  return new Set();
}

/**
 * Calculate contributor cohorts (new vs returning) given a list/set of active human
 * contributors in the period and a baseline set of known contributors.
 *
 * @param {Iterable<string>} activeContributors - Human logins active in the period
 * @param {Set<string>} knownSet - Known contributors from prior history
 * @returns {{ new: number, returning: number, newLogins: string[], returningLogins: string[] }}
 */
function calculateContributorCohorts(activeContributors, knownSet) {
  if (!activeContributors) {
    return { new: 0, returning: 0, newLogins: [], returningLogins: [] };
  }
  const known = knownSet instanceof Set ? knownSet : new Set(knownSet || []);
  const uniqueActives = Array.from(new Set(activeContributors)).filter(
    (login) => !isBot(login),
  );

  const newLogins = [];
  const returningLogins = [];

  for (const login of uniqueActives) {
    if (known.has(login)) {
      returningLogins.push(login);
    } else {
      newLogins.push(login);
    }
  }

  return {
    new: newLogins.length,
    returning: returningLogins.length,
    newLogins,
    returningLogins,
  };
}

/**
 * Aggregate monthly activity streams safely, guarding against truncation.
 * If pagination or rate limits are reached or truncated is flagged,
 * returns null for the affected stream count rather than a partial count.
 *
 * @param {Array<{ author: string, isBot?: boolean, type?: string }>} items
 * @param {{ truncated?: boolean }} [options]
 * @returns {{ humanPrs: number|null, automationPrs: number|null, totalPrs: number|null, humanContributors: string[] }}
 */
function aggregateMonthlyStreams(items, options = {}) {
  if (options.truncated) {
    return {
      humanPrs: null,
      automationPrs: null,
      totalPrs: null,
      humanContributors: [],
    };
  }

  if (!Array.isArray(items)) {
    return {
      humanPrs: 0,
      automationPrs: 0,
      totalPrs: 0,
      humanContributors: [],
    };
  }

  let humanPrs = 0;
  let automationPrs = 0;
  const humanContributorsSet = new Set();

  for (const item of items) {
    const author = item.author || item.login || (item.user && item.user.login);
    const botFlag = item.isBot !== undefined ? item.isBot : isBot(author);

    if (botFlag) {
      automationPrs++;
    } else {
      humanPrs++;
      if (author) {
        humanContributorsSet.add(author);
      }
    }
  }

  return {
    humanPrs,
    automationPrs,
    totalPrs: humanPrs + automationPrs,
    humanContributors: Array.from(humanContributorsSet).sort(),
  };
}

/**
 * Merge new monthly data into the existing dataset, preserving historical frozen months
 * and unmeasured gaps (null) appropriately.
 *
 * @param {Array<object>} existingMonths
 * @param {object} updatedMonth
 * @returns {Array<object>}
 */
function mergeMonthData(existingMonths = [], updatedMonth) {
  if (!updatedMonth || !updatedMonth.month) {
    return [...existingMonths];
  }

  const existingMap = new Map();
  for (const m of existingMonths) {
    if (m && m.month) {
      existingMap.set(m.month, m);
    }
  }

  const existing = existingMap.get(updatedMonth.month);
  // If existing month is frozen and completed, and the update is not forced, retain existing
  if (existing && existing.status === "frozen" && !updatedMonth.force) {
    existingMap.set(updatedMonth.month, existing);
  } else {
    existingMap.set(updatedMonth.month, {
      ...existing,
      ...updatedMonth,
    });
  }

  return Array.from(existingMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}

/**
 * Determine the 2-month refetch window: current in-flight month AND previous calendar month.
 * @param {Date} [referenceDate]
 * @returns {[string, string]} [prevMonthStr, currentMonthStr] (format: YYYY-MM)
 */
function getRefetchMonths(referenceDate = new Date()) {
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonthIdx = referenceDate.getUTCMonth(); // 0-based

  const currentMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;

  const prevDate = new Date(Date.UTC(currentYear, currentMonthIdx - 1, 1));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonthIdx = prevDate.getUTCMonth();
  const prevMonthStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}`;

  return [prevMonthStr, currentMonthStr];
}

/**
 * Read baseline data from scripts/data/report-history.json if present
 * @param {string} [historyPath]
 * @returns {Map<string, object>}
 */
function loadReportHistoryBaseline(historyPath = REPORT_HISTORY_PATH) {
  const baseline = new Map();
  try {
    if (fs.existsSync(historyPath)) {
      const data = JSON.parse(fs.readFileSync(historyPath, "utf8"));
      if (Array.isArray(data.snapshots)) {
        for (const s of data.snapshots) {
          const month = s.period && s.period.month;
          if (!month) continue;

          let humanPrs = null;
          let automationPrs = null;
          if (
            s.participation &&
            s.participation.automation &&
            Array.isArray(s.participation.automation.series)
          ) {
            for (const ser of s.participation.automation.series) {
              if (ser.id === "human" && Array.isArray(ser.values)) {
                humanPrs = ser.values[0];
              }
              if (ser.id === "automation" && Array.isArray(ser.values)) {
                automationPrs = ser.values[0];
              }
            }
          }

          // Distinct contributor count and newcomer cohort cannot be inferred from
          // truncated heroes lists (heroes is only top-N PR contributors, never an org total).
          // Per AGENTS.md, unmeasured historical values remain null.
          baseline.set(month, {
            month,
            window: {
              start: s.period.start,
              end: s.period.end,
            },
            activeContributors: null,
            streams: {
              humanPrs,
              automationPrs,
              issues: null,
              reviews: null,
            },
            cohorts: {
              new: null,
              returning: null,
            },
            status: "frozen",
            truncated: false,
          });
        }
      }
    }
  } catch (err) {
    console.warn(
      `[WARN] Failed to load report history baseline: ${err.message}`,
    );
  }
  return baseline;
}

/**
 * Main execution function
 */
async function executeGraphQL(query, token) {
  const url = "https://api.github.com/graphql";
  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Bluefin-Docs-Build",
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`,
    );
  }
  return json.data;
}

/**
 * Fetch monthly metrics from GitHub for a target month (YYYY-MM).
 * Uses partitioned date queries and pagination to stay well within rate limits
 * and GitHub's 1000-search-results ceiling.
 */
/**
 * Recursively subdivide date intervals until every slice has < 1,000 search results,
 * or interval cannot be divided further (single-day ceiling).
 */
async function resolveSub1000Slices(startDateStr, endDateStr, token) {
  const query = `
    query {
      search(query: "org:projectbluefin type:pr -author:app/renovate -author:app/github-actions -author:app/mergeraptor -author:app/hivecommons-hive created:${startDateStr}..${endDateStr}", type: ISSUE, first: 1) {
        issueCount
      }
    }
  `;

  let countData;
  try {
    countData = await executeGraphQL(query, token);
  } catch (err) {
    console.warn(
      `[WARN] Failed to check slice count for ${startDateStr}..${endDateStr}: ${err.message}`,
    );
    return [
      {
        start: startDateStr,
        end: endDateStr,
        issueCount: 9999,
        overflow: true,
      },
    ];
  }

  const issueCount = countData.search.issueCount;
  if (issueCount < 1000) {
    return [
      { start: startDateStr, end: endDateStr, issueCount, overflow: false },
    ];
  }

  const startD = new Date(`${startDateStr}T00:00:00Z`);
  const endD = new Date(`${endDateStr}T00:00:00Z`);
  const diffDays = Math.round(
    (endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays <= 0) {
    // Cannot subdivide further than 1 day
    return [
      { start: startDateStr, end: endDateStr, issueCount, overflow: true },
    ];
  }

  const midDays = Math.floor(diffDays / 2);
  const midD = new Date(startD.getTime() + midDays * 24 * 60 * 60 * 1000);
  const nextMidD = new Date(midD.getTime() + 24 * 60 * 60 * 1000);

  const midStr = midD.toISOString().slice(0, 10);
  const nextMidStr = nextMidD.toISOString().slice(0, 10);

  const left = await resolveSub1000Slices(startDateStr, midStr, token);
  const right = await resolveSub1000Slices(nextMidStr, endDateStr, token);

  return [...left, ...right];
}

/**
 * Fetch monthly metrics from GitHub for a target month (YYYY-MM).
 * Uses adaptive date partitioning and strict truncation guards.
 */
async function fetchMonthMetrics(targetMonth, token, knownSet, isCurrentMonth) {
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10); // 1-12
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const monthStart = `${targetMonth}-01`;
  const monthEnd = `${targetMonth}-${String(daysInMonth).padStart(2, "0")}`;

  // 1. Get totals via search counts: both created PRs and merged PRs
  const countQuery = `
    query {
      all_prs_created: search(query: "org:projectbluefin type:pr created:${monthStart}..${monthEnd}", type: ISSUE, first: 1) { issueCount }
      all_prs_merged: search(query: "org:projectbluefin type:pr is:merged created:${monthStart}..${monthEnd}", type: ISSUE, first: 1) { issueCount }
      issues: search(query: "org:projectbluefin type:issue -author:app/github-actions -author:app/hivecommons-hive created:${monthStart}..${monthEnd}", type: ISSUE, first: 1) { issueCount }
    }
  `;

  let countsData;
  try {
    countsData = await executeGraphQL(countQuery, token);
  } catch (err) {
    console.warn(
      `[WARN] Failed to fetch count metrics for ${targetMonth}: ${err.message}`,
    );
    return {
      month: targetMonth,
      window: { start: monthStart, end: monthEnd },
      activeContributors: null,
      streams: {
        humanPrs: null,
        automationPrs: null,
        issues: null,
        reviews: null,
      },
      cohorts: { new: null, returning: null },
      status: isCurrentMonth ? "in_flight" : "frozen",
      truncated: true,
    };
  }

  const totalPrsCreated = countsData.all_prs_created.issueCount;
  const totalPrsMerged = countsData.all_prs_merged.issueCount;
  const issueCount = countsData.issues.issueCount;

  // 2. Resolve sub-1,000 slices adaptively
  // 2. Resolve sub-1,000 slices adaptively for merged PRs
  const slices = await resolveSub1000Slices(monthStart, monthEnd, token);
  const distinctAuthors = new Set();
  let humanPrsCount = 0;
  let truncated = false;

  for (const slice of slices) {
    if (slice.overflow) {
      console.warn(
        `[WARN] Slice ${slice.start}..${slice.end} has ${slice.issueCount} results (> 1,000 cap). Marking truncated.`,
      );
      truncated = true;
      break;
    }

    let cursor = null;
    let page = 0;
    const maxPages = 10; // 10 pages * 100 per page = 1,000 items

    while (page < maxPages) {
      page++;
      const afterClause = cursor ? `, after: "${cursor}"` : "";
      const pageQuery = `
        query {
          search(query: "org:projectbluefin type:pr is:merged created:${slice.start}..${slice.end}", type: ISSUE, first: 100${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              ... on PullRequest {
                author { login }
              }
            }
          }
        }
      `;

      let pageData;
      try {
        pageData = await executeGraphQL(pageQuery, token);
      } catch (err) {
        console.warn(
          `[WARN] GraphQL page fetch failed for ${slice.start}..${slice.end}: ${err.message}`,
        );
        truncated = true;
        break;
      }

      const nodes = pageData.search.nodes || [];
      for (const node of nodes) {
        const login = node.author && node.author.login;
        if (login && !isBot(login)) {
          humanPrsCount++;
          distinctAuthors.add(login);
        }
      }

      if (!pageData.search.pageInfo.hasNextPage) {
        break;
      }

      if (page >= maxPages && pageData.search.pageInfo.hasNextPage) {
        console.warn(
          `[WARN] Search page limit reached with hasNextPage true for ${slice.start}..${slice.end}. Marking truncated.`,
        );
        truncated = true;
        break;
      }

      cursor = pageData.search.pageInfo.endCursor;
    }

    if (truncated) break;
  }

  let cohorts = { new: null, returning: null };
  let activeCount = null;

  if (!truncated) {
    activeCount = distinctAuthors.size;
    const cohortRes = calculateContributorCohorts(distinctAuthors, knownSet);
    cohorts = {
      new: cohortRes.new,
      returning: cohortRes.returning,
    };
  }

  return {
    month: targetMonth,
    window: {
      start: monthStart,
      end: monthEnd,
    },
    activeContributors: activeCount,
    streams: {
      prsOpened: totalPrsCreated,
      prsMerged: totalPrsMerged,
      humanPrs: truncated ? null : humanPrsCount,
      automationPrs: truncated ? null : totalPrsMerged - humanPrsCount,
      issues: issueCount,
      reviews: null,
    },
    cohorts,
    status: isCurrentMonth ? "in_flight" : "frozen",
    truncated,
  };
}

async function main() {
  const token = githubToken();
  const now = new Date();
  const [prevMonth, currentMonth] = getRefetchMonths(now);

  console.log(
    `[INFO] Refetch window: previous month ${prevMonth}, current month ${currentMonth}`,
  );

  let existingData = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    source: "GitHub GraphQL & PR Events",
    org: "projectbluefin",
    unavailable: false,
    stateReason: null,
    months: [],
  };

  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      if (parsed && Array.isArray(parsed.months)) {
        existingData = parsed;
      }
    } catch {
      // Keep initial existingData
    }
  }

  // Load known contributors in read-only mode
  const knownSet = loadKnownContributors();
  console.log(
    `[INFO] Loaded ${knownSet.size} known contributors (read-only mode)`,
  );

  // Ensure 2026-07 and 2026-08 baseline from report-history.json exist
  const historyBaseline = loadReportHistoryBaseline();
  for (const [m, baseData] of historyBaseline.entries()) {
    if (!existingData.months.some((em) => em.month === m)) {
      existingData.months = mergeMonthData(existingData.months, baseData);
    }
  }

  // If no GITHUB_TOKEN is available, we gracefully exit with existing data or unavailable state
  if (!token) {
    console.log(
      "[INFO] No GITHUB_TOKEN configured. Preserving existing metrics without live API query.",
    );
    existingData.generatedAt = now.toISOString();
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(existingData, null, 2) + "\n",
      "utf8",
    );
    return;
  }

  // Fetch metrics for previous month and current in-flight month
  console.log(`[INFO] Querying live metrics for ${prevMonth}...`);
  const prevMonthData = await fetchMonthMetrics(
    prevMonth,
    token,
    knownSet,
    false,
  );
  existingData.months = mergeMonthData(existingData.months, {
    ...prevMonthData,
    force: true,
  });

  console.log(`[INFO] Querying live metrics for ${currentMonth}...`);
  const currentMonthData = await fetchMonthMetrics(
    currentMonth,
    token,
    knownSet,
    true,
  );
  existingData.months = mergeMonthData(existingData.months, {
    ...currentMonthData,
    force: true,
  });

  existingData.generatedAt = now.toISOString();
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(existingData, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `[INFO] Successfully written contributor metrics to ${OUTPUT_FILE}`,
  );
}

module.exports = {
  OUTPUT_FILE,
  BOT_PATTERNS,
  isBot,
  loadKnownContributors,
  calculateContributorCohorts,
  aggregateMonthlyStreams,
  mergeMonthData,
  getRefetchMonths,
  loadReportHistoryBaseline,
  fetchMonthMetrics,
  main,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`[ERROR] fetch-contributor-metrics error: ${err.message}`);
    const fallback = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: "GitHub GraphQL & PR Events",
      org: "projectbluefin",
      unavailable: true,
      stateReason: err.message,
      months: [],
    };
    try {
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(fallback, null, 2) + "\n",
        "utf8",
      );
    } catch {
      // ignore
    }
    process.exit(0);
  });
}
