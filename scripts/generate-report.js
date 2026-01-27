#!/usr/bin/env node
/**
 * Biweekly report generation script
 *
 * Fetches project board data, generates formatted markdown report, and writes to reports/ directory
 * Runs every other Monday (biweekly schedule)
 */

import { fetchProjectItems, filterByStatus } from "./lib/graphql-queries.js";
import { updateContributorHistory, isBot } from "./lib/contributor-tracker.js";
import { generateReportMarkdown } from "./lib/markdown-generator.js";
import { getCategoryForLabel } from "./lib/label-mapping.js";
import {
  subWeeks,
  startOfDay,
  endOfDay,
  format,
  getISOWeek,
  parseISO,
  isWithinInterval,
} from "date-fns";
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
 * Calculate report window
 * Pattern 4 from RESEARCH.md (lines 273-294)
 *
 * @returns {{startDate: Date, endDate: Date}} Report window
 */
function calculateReportWindow() {
  const reportDate = new Date(); // Today (Monday when workflow runs)
  const endDate = endOfDay(subWeeks(reportDate, 0)); // Sunday night before Monday
  const startDate = startOfDay(subWeeks(reportDate, 2)); // 2 weeks ago

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
  return isWithinInterval(itemDate, window);
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
  log.info("=== Biweekly Report Generator ===");

  // Check for GITHUB_TOKEN
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    log.error("GITHUB_TOKEN or GH_TOKEN environment variable required");
    github.error(
      "Missing authentication token. Set GITHUB_TOKEN or GH_TOKEN environment variable",
    );
    console.error("Set one of these tokens to authenticate with GitHub API");
    process.exit(1);
  }

  // Biweekly schedule check (RESEARCH.md Pitfall 6, lines 496-506)
  const currentWeek = getISOWeek(new Date());
  if (currentWeek % 2 !== 0) {
    log.info(`Skipping report generation (odd week ${currentWeek})`);
    log.info("Reports are generated on even-numbered ISO weeks");
    process.exit(0);
  }

  log.info(`Running report for ISO week ${currentWeek}`);

  // Calculate report window
  const { startDate, endDate } = calculateReportWindow();
  log.info(
    `Report period: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
  );

  try {
    // Fetch project board data
    log.info("Fetching project board data...");
    const allItems = await fetchProjectItems("projectbluefin", 2);
    log.info(`Total items on board: ${allItems.length}`);

    // Filter by Status="Done" column
    const doneItems = filterByStatus(allItems, "Done");
    log.info(`Items in "Done" column: ${doneItems.length}`);

    // Filter by date range (items updated within window)
    const itemsInWindow = doneItems.filter((item) =>
      isInReportWindow(item, { startDate, endDate }),
    );
    log.info(`Items completed in window: ${itemsInWindow.length}`);

    // Handle empty data period
    if (itemsInWindow.length === 0) {
      log.warn(
        "No items completed in this period - generating quiet period report",
      );
      github.warning("This was a quiet period with no completed items");
    }

    // Separate human contributions from bot activity
    const humanItems = itemsInWindow.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );
    const botItems = itemsInWindow.filter((item) =>
      isBot(item.content?.author?.login || ""),
    );

    log.info(`Human contributions: ${humanItems.length}`);
    log.info(`Bot contributions: ${botItems.length}`);

    // Extract contributor usernames (human only)
    const contributors = [
      ...new Set(
        humanItems
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    log.info(`Unique contributors: ${contributors.length}`);

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
      humanItems,
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
    log.info(`   ${humanItems.length} items completed`);
    log.info(`   ${contributors.length} contributors`);
    log.info(`   ${newContributors.length} new contributors`);
    log.info(`   ${botItems.length} bot PRs`);

    // GitHub Actions summary annotation
    github.notice(
      `Report generated: ${humanItems.length} items, ${contributors.length} contributors, ${newContributors.length} new`,
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
