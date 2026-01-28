/**
 * Historical contributor tracking for monthly reports
 *
 * Identifies first-time contributors by querying GitHub history
 * This allows accurate regeneration of past reports
 */

import { fetchClosedItemsFromRepo } from "./graphql-queries.mjs";
import { MONITORED_REPOS } from "./monitored-repos.mjs";

/**
 * Bot detection patterns
 */
const BOT_PATTERNS = [
  /^dependabot\[bot\]$/,
  /^dependabot$/i, // Dependabot without [bot] suffix
  /^renovate\[bot\]$/,
  /^renovate$/i, // Renovate without [bot] suffix (GraphQL returns this)
  /^app\/renovate$/, // Renovate GitHub App format (REST API format)
  /^github-actions\[bot\]$/,
  /^github-actions$/, // GitHub Actions bot without [bot] suffix
  /^copilot-swe-agent$/,
  /^ubot-\d+$/,
  /^pull$/,
  /^testpullapp$/,
  /^app\//i, // GitHub Apps (app/renovate, app/dependabot, etc.)
  /bot$/i, // Catches most bot usernames (must be last)
];

/**
 * Check if username matches bot patterns
 *
 * @param {string} username - GitHub username
 * @returns {boolean} True if username is a bot
 */
export function isBot(username) {
  return BOT_PATTERNS.some((pattern) => pattern.test(username));
}

/**
 * Fetch all contributors who contributed BEFORE a given date
 *
 * This determines who was already a contributor before the report period
 *
 * @param {Date} beforeDate - Cutoff date (start of report period)
 * @returns {Promise<Set<string>>} Set of contributor usernames who contributed before this date
 */
export async function fetchContributorsBeforeDate(beforeDate) {
  console.log(
    `[INFO] Fetching historical contributors before ${beforeDate.toISOString()}...`,
  );

  const allContributors = new Set();

  // Query all monitored repos for PRs merged before the report period
  for (const repo of MONITORED_REPOS) {
    const [owner, name] = repo.split("/");

    try {
      // Fetch PRs from project start (2024-01-01) to report start date
      const projectStart = new Date(Date.UTC(2024, 0, 1));
      const items = await fetchClosedItemsFromRepo(
        owner,
        name,
        projectStart,
        beforeDate,
      );

      // Filter to merged PRs only
      const mergedPRs = items.filter((item) => item.type === "PullRequest");

      // Extract human contributors
      mergedPRs.forEach((item) => {
        const author = item.author;
        if (author && !isBot(author)) {
          allContributors.add(author);
        }
      });

      console.log(
        `[INFO]   ${repo}: ${mergedPRs.length} historical PRs, ${Array.from(allContributors).length} unique contributors so far`,
      );
    } catch (error) {
      console.warn(`[WARN] Failed to fetch historical data from ${repo}`);
      console.warn(`[WARN] Error: ${error.message}`);
      // Continue with other repos
    }
  }

  console.log(
    `[INFO] Found ${allContributors.size} contributors before ${beforeDate.toISOString().split("T")[0]}`,
  );

  return allContributors;
}

/**
 * Identify new contributors for a report period
 *
 * A contributor is "new" if they have no merged PRs before the report start date
 *
 * @param {Array<string>} contributors - Contributors in current report period
 * @param {Date} reportStartDate - Start of report period
 * @returns {Promise<Array<string>>} Array of new contributor usernames
 */
export async function identifyNewContributors(contributors, reportStartDate) {
  // Filter out bots first
  const humanContributors = contributors.filter((username) => !isBot(username));

  // Fetch contributors who contributed before this report period
  const historicalContributors =
    await fetchContributorsBeforeDate(reportStartDate);

  // New contributors are those NOT in historical set
  const newContributors = humanContributors.filter(
    (username) => !historicalContributors.has(username),
  );

  if (newContributors.length > 0) {
    console.log(
      `[INFO] Identified ${newContributors.length} new contributors: ${newContributors.join(", ")}`,
    );
  } else {
    console.log("[INFO] No new contributors this period");
  }

  return newContributors;
}

/**
 * DEPRECATED: Legacy function for backwards compatibility
 * Use identifyNewContributors() instead for accurate historical detection
 */
export async function updateContributorHistory(contributors) {
  console.warn(
    "[WARN] updateContributorHistory() is deprecated. This function uses a cumulative history file which breaks report regeneration.",
  );
  console.warn(
    "[WARN] For accurate regeneration, use identifyNewContributors() which queries GitHub history.",
  );

  // Return empty array to indicate no new contributors with legacy method
  return [];
}
