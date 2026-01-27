#!/usr/bin/env node
/**
 * Monthly report generation script
 *
 * Fetches project board data, generates formatted markdown report, and writes to reports/ directory
 * Runs on the first Monday of each month
 */

import {
  fetchProjectItems,
  filterByStatus,
  fetchClosedItemsFromRepo,
} from "./lib/graphql-queries.js";
import { updateContributorHistory, isBot } from "./lib/contributor-tracker.js";
import { generateReportMarkdown } from "./lib/markdown-generator.js";
import { getCategoryForLabel } from "./lib/label-mapping.js";
import { MONITORED_REPOS } from "./lib/monitored-repos.js";
import { format, parseISO, isWithinInterval } from "date-fns";
import { writeFile } from "fs/promises";

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
 * @returns {{startDate: Date, endDate: Date}} Report window
 */
function calculateReportWindow() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - 1; // Previous month

  // Handle January (month 0) -> go to December of previous year
  const reportYear = month < 0 ? year - 1 : year;
  const reportMonth = month < 0 ? 11 : month;

  // Simple: first day to last day of the month, UTC
  const startDate = new Date(Date.UTC(reportYear, reportMonth, 1));
  const endDate = new Date(
    Date.UTC(reportYear, reportMonth + 1, 0, 23, 59, 59, 999),
  );

  return { startDate, endDate };
}

/**
 * Check if item was updated within report window
 *
 * @param {Object} item - Project item
 * @param {{startDate: Date, endDate: Date}} window - Report window
 * @returns {boolean} True if item updated in window
 */
function isInReportWindow(item, window) {
  // Find Status field to get updatedAt timestamp
  const statusField = item.fieldValues.nodes.find(
    (fv) => fv.field?.name === "Status",
  );

  if (!statusField?.updatedAt) {
    return false;
  }

  const itemDate = parseISO(statusField.updatedAt);
  return isWithinInterval(itemDate, {
    start: window.startDate,
    end: window.endDate,
  });
}

/**
 * Aggregate bot activity by repository and bot username
 *
 * @param {Array} botItems - Bot items from project board
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

/**
 * Main report generation function
 */
async function generateReport() {
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

  // Calculate report window (previous month)
  const { startDate, endDate } = calculateReportWindow();
  log.info(
    `Report period: ${format(startDate, "MMMM yyyy")} (${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")})`,
  );

  try {
    // Fetch project board data
    log.info("Fetching project board data...");
    const boardItems = await fetchProjectItems("projectbluefin", 2);
    log.info(`Total items on board: ${boardItems.length}`);

    // Filter by Status="Done" column
    const doneItems = filterByStatus(boardItems, "Done");
    log.info(`Items in "Done" column: ${doneItems.length}`);

    // Filter by date range (items updated within window)
    const itemsInWindow = doneItems
      .filter((item) => isInReportWindow(item, { startDate, endDate }))
      .filter((item) => item.content && item.content.title && item.content.url); // Skip items without valid content
    log.info(`Items completed in window: ${itemsInWindow.length}`);

    // Fetch opportunistic work from monitored repositories
    log.info("Fetching opportunistic work from monitored repositories...");
    const allOpportunisticItems = [];

    for (const repo of MONITORED_REPOS) {
      const [owner, name] = repo.split("/");
      log.info(`  Fetching from ${repo}...`);
      const repoItems = await fetchClosedItemsFromRepo(
        owner,
        name,
        startDate,
        endDate,
      );
      allOpportunisticItems.push(...repoItems);
    }

    log.info(
      `Total closed items from monitored repos: ${allOpportunisticItems.length}`,
    );

    // Extract URLs from project board items to identify opportunistic work
    const boardItemUrls = new Set(
      itemsInWindow.map((item) => item.content?.url).filter(Boolean),
    );

    // Filter opportunistic items (not on project board)
    const opportunisticItems = allOpportunisticItems
      .filter((item) => !boardItemUrls.has(item.url))
      .map((item) => {
        // Transform to match board item structure for consistency
        return {
          content: {
            __typename: item.type, // "Issue" or "PullRequest"
            number: item.number,
            title: item.title,
            url: item.url,
            repository: { nameWithOwner: item.repository },
            labels: { nodes: item.labels },
            author: { login: item.author },
          },
        };
      });

    log.info(
      `Opportunistic items (not on board): ${opportunisticItems.length}`,
    );

    // Handle empty data period
    if (itemsInWindow.length === 0 && opportunisticItems.length === 0) {
      log.warn(
        "No items completed in this period - generating quiet period report",
      );
      github.warning("This was a quiet period with no completed items");
    }

    // Separate human contributions from bot activity (both planned and opportunistic)
    const allItems = [...itemsInWindow, ...opportunisticItems];
    const humanItems = allItems.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );
    const botItems = allItems.filter((item) =>
      isBot(item.content?.author?.login || ""),
    );

    // Separate planned vs opportunistic within human items
    const plannedHumanItems = itemsInWindow.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );
    const opportunisticHumanItems = opportunisticItems.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );

    log.info(`Planned work (human): ${plannedHumanItems.length}`);
    log.info(`Opportunistic work (human): ${opportunisticHumanItems.length}`);
    log.info(`Bot contributions: ${botItems.length}`);

    // Extract contributor usernames (human only, PRs only - people who wrote code)
    const contributors = [
      ...new Set(
        humanItems
          .filter((item) => item.content?.__typename === "PullRequest")
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    log.info(`Unique contributors (PR authors): ${contributors.length}`);

    // Track contributors and identify new ones (with error handling)
    log.info("Updating contributor history...");
    let newContributors = [];
    try {
      newContributors = await updateContributorHistory(contributors);
      if (newContributors.length > 0) {
        log.info(`New contributors this period: ${newContributors.join(", ")}`);
        github.notice(
          `🎉 ${newContributors.length} new contributor${newContributors.length > 1 ? "s" : ""} this period!`,
        );
      }
    } catch (error) {
      log.warn("Contributor history update failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      // Continue report generation even if contributor tracking fails
      newContributors = [];
    }

    // Aggregate bot activity
    const botActivity = aggregateBotActivity(botItems);
    log.info(`Bot activity groups: ${botActivity.length}`);

    // Generate markdown
    log.info("Generating markdown...");
    const markdown = generateReportMarkdown(
      plannedHumanItems,
      opportunisticHumanItems,
      contributors,
      newContributors,
      botActivity,
      startDate,
      endDate,
    );

    // Write to file
    const filename = `reports/${format(endDate, "yyyy-MM-dd")}-report.mdx`;
    await writeFile(filename, markdown, "utf8");

    log.info(`✅ Report generated: ${filename}`);
    log.info(`   ${plannedHumanItems.length} planned work items`);
    log.info(`   ${opportunisticHumanItems.length} opportunistic work items`);
    log.info(`   ${contributors.length} contributors`);
    log.info(`   ${newContributors.length} new contributors`);
    log.info(`   ${botItems.length} bot PRs`);

    // GitHub Actions summary annotation
    github.notice(
      `Report generated: ${plannedHumanItems.length} planned + ${opportunisticHumanItems.length} opportunistic, ${contributors.length} contributors, ${newContributors.length} new`,
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

// Run the script
generateReport().catch((error) => {
  log.error("Unhandled error in report generation");
  log.error(error.message);
  github.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});
