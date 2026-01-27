/**
 * Historical contributor tracking for biweekly reports
 *
 * Maintains list of all-time contributors to identify first-time contributors
 * Pattern 5 from RESEARCH.md (lines 311-346)
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Bot detection patterns from RESEARCH.md Pitfall 3 (lines 425-436)
 */
const BOT_PATTERNS = [
  /^dependabot\[bot\]$/,
  /^renovate\[bot\]$/,
  /^github-actions\[bot\]$/,
  /^github-actions$/, // GitHub Actions bot without [bot] suffix
  /^copilot-swe-agent$/,
  /^ubot-\d+$/,
  /bot$/i, // Catches most bot usernames
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
 * Update contributor history with new contributors
 *
 * @param {Array<string>} contributors - Array of contributor usernames from current report
 * @returns {Promise<Array<string>>} Array of new contributor usernames (first-time)
 */
export async function updateContributorHistory(contributors) {
  const historyPath = "./static/data/contributors-history.json";

  // Ensure directory exists
  try {
    await mkdir(dirname(historyPath), { recursive: true });
  } catch (error) {
    // Directory may already exist, ignore
  }

  // Load existing history
  let history = {
    lastUpdated: new Date().toISOString(),
    contributors: [],
  };

  try {
    const content = await readFile(historyPath, "utf8");
    history = JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist yet, start fresh
      console.log("[INFO] No existing contributor history, starting fresh");
    } else if (error instanceof SyntaxError) {
      // JSON parse error - file is corrupted
      console.log(
        `[WARN] Contributor history corrupted. Resetting history file.`,
      );
      console.log(`[WARN] Error: ${error.message}`);
      // history already initialized to fresh state above
    } else {
      // Other file system error
      console.log(
        `[WARN] Could not read contributor history: ${error.message}`,
      );
      // Continue with fresh history
    }
  }

  // Filter out bots BEFORE processing
  const humanContributors = contributors.filter((username) => !isBot(username));

  // Identify new contributors (not in historical list)
  const newContributors = humanContributors.filter(
    (username) => !history.contributors.includes(username),
  );

  // Update history if there are new contributors
  if (newContributors.length > 0) {
    history.contributors.push(...newContributors);
    history.lastUpdated = new Date().toISOString();

    await writeFile(historyPath, JSON.stringify(history, null, 2));
    console.log(`Added ${newContributors.length} new contributors to history`);
  } else {
    console.log("No new contributors this period");
  }

  return newContributors;
}

/**
 * Get new contributors from a list (convenience function)
 * Does not update history file
 *
 * @param {Array<string>} contributors - Array of contributor usernames
 * @returns {Promise<Array<string>>} Array of new contributor usernames
 */
export async function getNewContributors(contributors) {
  const historyPath = "./static/data/contributors-history.json";

  let history = { contributors: [] };

  try {
    const content = await readFile(historyPath, "utf8");
    history = JSON.parse(content);
  } catch (error) {
    // File doesn't exist, all contributors are new
    return contributors.filter((username) => !isBot(username));
  }

  // Filter out bots and existing contributors
  return contributors.filter(
    (username) => !isBot(username) && !history.contributors.includes(username),
  );
}
