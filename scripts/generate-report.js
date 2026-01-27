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
  console.log("=== Biweekly Report Generator ===\n");

  // Check for GITHUB_TOKEN
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    console.error(
      "Error: GITHUB_TOKEN or GH_TOKEN environment variable required",
    );
    console.error("Set one of these tokens to authenticate with GitHub API");
    process.exit(1);
  }

  // Biweekly schedule check (RESEARCH.md Pitfall 6, lines 496-506)
  const currentWeek = getISOWeek(new Date());
  if (currentWeek % 2 !== 0) {
    console.log(`Skipping report generation (odd week ${currentWeek})`);
    console.log("Reports are generated on even-numbered ISO weeks");
    process.exit(0);
  }

  console.log(`Running report for ISO week ${currentWeek}`);

  // Calculate report window
  const { startDate, endDate } = calculateReportWindow();
  console.log(
    `Report period: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
  );

  try {
    // Fetch project board data
    console.log("\nFetching project board data...");
    const allItems = await fetchProjectItems("projectbluefin", 2);
    console.log(`Total items on board: ${allItems.length}`);

    // Filter by Status="Done" column
    const doneItems = filterByStatus(allItems, "Done");
    console.log(`Items in "Done" column: ${doneItems.length}`);

    // Filter by date range (items updated within window)
    const itemsInWindow = doneItems.filter((item) =>
      isInReportWindow(item, { startDate, endDate }),
    );
    console.log(`Items completed in window: ${itemsInWindow.length}`);

    // Separate human contributions from bot activity
    const humanItems = itemsInWindow.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );
    const botItems = itemsInWindow.filter((item) =>
      isBot(item.content?.author?.login || ""),
    );

    console.log(`Human contributions: ${humanItems.length}`);
    console.log(`Bot contributions: ${botItems.length}`);

    // Extract contributor usernames (human only)
    const contributors = [
      ...new Set(
        humanItems
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    console.log(`Unique contributors: ${contributors.length}`);

    // Track contributors and identify new ones
    console.log("\nUpdating contributor history...");
    const newContributors = await updateContributorHistory(contributors);
    if (newContributors.length > 0) {
      console.log(
        `New contributors this period: ${newContributors.join(", ")}`,
      );
    }

    // Aggregate bot activity
    const botActivity = aggregateBotActivity(botItems);
    console.log(`Bot activity groups: ${botActivity.length}`);

    // Generate markdown
    console.log("\nGenerating markdown...");
    const markdown = generateReportMarkdown(
      humanItems,
      contributors,
      newContributors,
      botActivity,
      startDate,
      endDate,
    );

    // Write to file
    const filename = `reports/${format(endDate, "yyyy-MM-dd")}-report.md`;
    await writeFile(filename, markdown, "utf8");

    console.log(`\n✅ Report generated: ${filename}`);
    console.log(`   ${humanItems.length} items completed`);
    console.log(`   ${contributors.length} contributors`);
    console.log(`   ${newContributors.length} new contributors`);
    console.log(`   ${botItems.length} bot PRs`);
  } catch (error) {
    console.error("\n❌ Report generation failed:");
    console.error(error.message);

    if (error.message.includes("rate limit")) {
      console.error(
        "\nTip: Use a personal access token with higher rate limits",
      );
    }

    if (error.message.includes("authentication")) {
      console.error("\nTip: Set GITHUB_TOKEN or GH_TOKEN environment variable");
    }

    process.exit(1);
  }
}

// Run the script
generateReport().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
