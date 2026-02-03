/**
 * Community engagement tracking for monthly reports
 *
 * Tracks discussion and issue comments across Bluefin repositories,
 * identifying community members who help others (distinct from code contributors).
 *
 * CONTRIBUTOR HIERARCHY (MUTUALLY EXCLUSIVE):
 * 1. New Lights: First-time PR authors (highest priority)
 * 2. Wayfinders: Continuing PR authors (code contributors)
 * 3. Top Voices: Engagement-only (discussions/issues, NO code contributions)
 *
 * EXCLUSIVITY RULES:
 * - If you authored a PR this month → You are in New Lights OR Wayfinders (NOT Top Voices)
 * - Top Voices are ONLY people who participated in discussions/issues WITHOUT authoring PRs
 * - Each person appears in ONLY ONE subsection per monthly report
 *
 * Data sources:
 * - Discussions: ublue-os/bluefin ONLY (only repo with discussions enabled)
 * - Issues: ALL 10 monitored repos from MONITORED_REPOS
 *
 * Exclusions:
 * - Bots (via isBot() function)
 * - PR authors (anyone who merged a PR in the period)
 * - Discussion/issue authors' own comments (they're OP, not engagement)
 */

import {
  fetchDiscussionComments,
  fetchIssueComments,
} from "./graphql-queries.mjs";
import { isBot } from "./contributor-tracker.mjs";
import { MONITORED_REPOS } from "./monitored-repos.mjs";

/**
 * Aggregate engagement data from discussions and issues
 *
 * Fetches discussion comments (ublue-os/bluefin) and issue comments (all monitored repos),
 * building a map of username -> activity counts.
 *
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<Map>} Map of username -> {discussions, issues, total}
 */
export async function aggregateEngagement(startDate, endDate) {
  const engagementMap = new Map(); // username -> { discussions, issues, total }

  // Step 1: Fetch discussions (ublue-os/bluefin only)
  const discussionComments = await fetchDiscussionComments(startDate, endDate);

  for (const comment of discussionComments) {
    if (!engagementMap.has(comment.author)) {
      engagementMap.set(comment.author, {
        discussions: 0,
        issues: 0,
        total: 0,
      });
    }
    const stats = engagementMap.get(comment.author);
    stats.discussions++;
    stats.total++;
  }

  // Step 2: Fetch issue comments (all 10 monitored repos)
  for (const repo of MONITORED_REPOS) {
    const [owner, name] = repo.split("/");

    const issueComments = await fetchIssueComments(
      owner,
      name,
      startDate,
      endDate,
    );

    for (const comment of issueComments) {
      if (!engagementMap.has(comment.author)) {
        engagementMap.set(comment.author, {
          discussions: 0,
          issues: 0,
          total: 0,
        });
      }
      const stats = engagementMap.get(comment.author);
      stats.issues++;
      stats.total++;
    }
  }

  return engagementMap;
}

/**
 * Exclude contributors (PR authors) from engagement participants
 *
 * Applies strict deduplication: If someone authored ANY PR in the period,
 * they are excluded from Top Voices (to avoid duplicates with Contributors section).
 * Also filters out bots.
 *
 * @param {Map} engagementMap - Map of username -> {discussions, issues, total}
 * @param {Array<string>} contributors - Array of PR author usernames
 * @returns {Array<string>} Array of usernames eligible for Top Voices
 */
export function excludeContributors(engagementMap, contributors) {
  const prAuthorSet = new Set(contributors);

  // Filter: (1) not a bot, (2) not a PR author
  const candidates = Array.from(engagementMap.entries())
    .filter(([username]) => !isBot(username))
    .filter(([username]) => !prAuthorSet.has(username))
    .map(([username]) => username);

  return candidates;
}

/**
 * Get top N voices sorted by total activity
 *
 * @param {Array<string>} candidates - Array of usernames (after filtering)
 * @param {Map} engagementMap - Map of username -> {discussions, issues, total}
 * @param {number} count - Number of top voices to return (default: 10)
 * @returns {Array<string>} Array of top N usernames sorted by activity
 */
export function getTopVoices(candidates, engagementMap, count = 10) {
  // Sort by total activity (descending)
  const sorted = candidates.sort((a, b) => {
    return engagementMap.get(b).total - engagementMap.get(a).total;
  });

  // Take top N
  return sorted.slice(0, count);
}
