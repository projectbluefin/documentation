#!/usr/bin/env node
/**
 * Monthly report generation script
 *
 * Fetches closed issues/PRs from monitored repositories, generates formatted markdown report, and writes to reports/ directory
 * Runs on the last day of each month
 *
 * Planned work: Issues/PRs from projectbluefin/common
 * Opportunistic work: Issues/PRs from other monitored repositories
 */

import { fetchClosedItemsFromRepo } from "./lib/graphql-queries.mjs";
import { identifyNewContributors, isBot } from "./lib/contributor-tracker.mjs";
import { generateReportMarkdown } from "./lib/markdown-generator.mjs";
import { getCategoryForLabel } from "./lib/label-mapping.mjs";
import { MONITORED_REPOS } from "./lib/monitored-repos.mjs";
import { fetchBuildMetrics } from "./lib/build-metrics.mjs";
import { fetchTapPromotions } from "./lib/tap-promotions.mjs";
import {
  aggregateEngagement,
  excludeContributors,
  getTopVoices,
} from "./lib/engagement-tracker.mjs";
import { format } from "date-fns";
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
    `Report period: ${format(startDate, "MMMM yyyy")} (${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")})`,
  );

  try {
    // Fetch planned work from projectbluefin/common repository
    log.info("Fetching planned work from projectbluefin/common...");
    const plannedItems = await fetchClosedItemsFromRepo(
      "projectbluefin",
      "common",
      startDate,
      endDate,
    );

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
      const repoItems = await fetchClosedItemsFromRepo(
        owner,
        name,
        startDate,
        endDate,
      );
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

    // Separate human contributions from bot activity (both planned and opportunistic)
    const allItems = [...itemsInWindow, ...transformedOpportunisticItems];
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
    const opportunisticHumanItems = transformedOpportunisticItems.filter(
      (item) => !isBot(item.content?.author?.login || ""),
    );

    log.info(`Planned work (human): ${plannedHumanItems.length}`);
    log.info(`Opportunistic work (human): ${opportunisticHumanItems.length}`);
    log.info(`Bot contributions: ${botItems.length}`);

    // Extract contributor usernames (human only, PRs only - people who wrote code)
    // This includes PR authors from BOTH planned (projectbluefin/common) AND opportunistic repos
    const contributors = [
      ...new Set(
        humanItems
          .filter((item) => item.content?.__typename === "PullRequest")
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    log.info(`Unique contributors (PR authors): ${contributors.length}`);

    // Log contributor breakdown by source for validation
    const plannedContributors = [
      ...new Set(
        plannedHumanItems
          .filter((item) => item.content?.__typename === "PullRequest")
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    const opportunisticContributors = [
      ...new Set(
        opportunisticHumanItems
          .filter((item) => item.content?.__typename === "PullRequest")
          .map((item) => item.content?.author?.login)
          .filter((login) => login),
      ),
    ];
    log.info(
      `  - From planned work: ${plannedContributors.length} contributors`,
    );
    log.info(
      `  - From opportunistic work: ${opportunisticContributors.length} contributors`,
    );

    // Log overlap between planned and opportunistic
    const overlap = plannedContributors.filter((c) =>
      opportunisticContributors.includes(c),
    );
    if (overlap.length > 0) {
      log.info(
        `  - Contributors in both: ${overlap.length} (${overlap.join(", ")})`,
      );
    }

    // Validation: Contributors should include authors from both sources
    const expectedTotal = new Set([
      ...plannedContributors,
      ...opportunisticContributors,
    ]).size;
    if (contributors.length !== expectedTotal) {
      log.warn(
        `⚠️  Contributor count mismatch: expected ${expectedTotal}, got ${contributors.length}`,
      );
    } else {
      log.info(`✅ Contributor count validation passed`);
    }

    // Identify new contributors by querying historical contributions
    log.info("Identifying new contributors...");
    let newContributors = [];
    try {
      newContributors = await identifyNewContributors(contributors, startDate);
      if (newContributors.length > 0) {
        log.info(`New contributors this period: ${newContributors.join(", ")}`);
        github.notice(
          `🎉 ${newContributors.length} new contributor${newContributors.length > 1 ? "s" : ""} this period!`,
        );
      }
    } catch (error) {
      log.warn("New contributor detection failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      // Continue report generation even if contributor tracking fails
      newContributors = [];
    }

    // Fetch engagement data (discussions + issues)
    // CONTRIBUTOR HIERARCHY (MUTUALLY EXCLUSIVE):
    // 1. New Lights: First-time PR authors (highest priority)
    // 2. Wayfinders: Continuing PR authors (code contributors)
    // 3. Top Voices: Engagement-only (NO code contributions)
    // Rule: PR authors are EXCLUDED from Top Voices (code > engagement in priority)
    log.info("Analyzing community engagement...");
    let topVoices = [];
    let engagementStats = {
      totalDiscussions: 0,
      totalIssues: 0,
      uniqueParticipants: 0,
    };

    try {
      const engagementMap = await aggregateEngagement(startDate, endDate);

      // Exclude ALL contributors (both new and continuing) from Top Voices
      // This ensures strict separation: code contributors in New Lights/Wayfinders, engagement-only in Top Voices
      const topVoicesCandidates = excludeContributors(
        engagementMap,
        contributors,
      );
      log.info(
        `Top Voices candidates (after filtering): ${topVoicesCandidates.length}`,
      );

      // Get Top 10 (or empty if <5)
      if (topVoicesCandidates.length >= 5) {
        topVoices = getTopVoices(topVoicesCandidates, engagementMap, 10);
        log.info(`Top Voices identified: ${topVoices.length}`);

        // Validation: Verify no Top Voices users authored PRs (they should be engagement-only)
        const topVoicesWithPRs = topVoices.filter((voice) => {
          return humanItems.some(
            (item) =>
              item.content?.__typename === "PullRequest" &&
              item.content?.author?.login === voice,
          );
        });

        if (topVoicesWithPRs.length > 0) {
          log.warn(
            `⚠️  Found ${topVoicesWithPRs.length} Top Voices users who authored PRs (should be 0):`,
          );
          topVoicesWithPRs.forEach((voice) => {
            const prs = humanItems.filter(
              (item) =>
                item.content?.__typename === "PullRequest" &&
                item.content?.author?.login === voice,
            );
            log.warn(`  - ${voice}: ${prs.length} PRs`);
            prs.forEach((pr) => {
              log.warn(
                `      ${pr.content.repository}#${pr.content.number}: ${pr.content.title}`,
              );
            });
          });
        } else {
          log.info(
            `✅ Validation passed: All Top Voices are engagement-only (no PR authors)`,
          );
        }

        // Calculate stats
        engagementStats = {
          totalDiscussions: [...engagementMap.values()].reduce(
            (sum, s) => sum + s.discussions,
            0,
          ),
          totalIssues: [...engagementMap.values()].reduce(
            (sum, s) => sum + s.issues,
            0,
          ),
          uniqueParticipants: topVoicesCandidates.length,
        };

        if (topVoices.length > 0) {
          github.notice(
            `👥 ${topVoices.length} Top Voices identified (${engagementStats.uniqueParticipants} participants)`,
          );
        }
      } else {
        log.info(
          `Not enough participants for Top Voices section (need ≥5, have ${topVoicesCandidates.length})`,
        );
      }
    } catch (error) {
      log.warn("Engagement tracking failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      // Continue report generation even if engagement tracking fails
      topVoices = [];
      engagementStats = {
        totalDiscussions: 0,
        totalIssues: 0,
        uniqueParticipants: 0,
      };
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

    // Fetch tap promotions
    log.info("Fetching homebrew tap promotions...");
    let tapPromotions = [];
    try {
      tapPromotions = await fetchTapPromotions(startDate, endDate);
      if (tapPromotions.length > 0) {
        log.info(`✅ Tap promotions found: ${tapPromotions.length} packages`);
        github.notice(
          `🍺 ${tapPromotions.length} packages promoted to production-tap`,
        );
      } else {
        log.info("No tap promotions this period");
      }
    } catch (error) {
      log.warn("Tap promotions fetch failed, continuing without it");
      log.warn(`Error: ${error.message}`);
      // Continue report generation even if tap promotions fail
      tapPromotions = [];
    }

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
      buildMetrics,
      tapPromotions,
      topVoices,
      engagementStats,
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
    log.info(
      `   ${buildMetrics ? buildMetrics.images.length + " workflows tracked" : "Build metrics unavailable"}`,
    );
    log.info(`   ${tapPromotions.length} tap promotions`);
    log.info(
      `   ${topVoices.length} top voices (${engagementStats.uniqueParticipants} participants)`,
    );

    // GitHub Actions summary annotation
    github.notice(
      `Report generated: ${plannedHumanItems.length} planned + ${opportunisticHumanItems.length} opportunistic, ${contributors.length} contributors, ${newContributors.length} new, ${tapPromotions.length} tap promotions, ${topVoices.length} top voices`,
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
