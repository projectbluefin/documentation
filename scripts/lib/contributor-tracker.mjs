/**
 * Contributor tracking for monthly reports
 *
 * Identifies first-time contributors using a GHA cache append-only set.
 * New contributor = not seen in any previous run. Known = in cache from prior run.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

const DEFAULT_CACHE_PATH = "scripts/data/known-contributors.json";
const DEFAULT_SEED_PATH = "scripts/data/known-contributors-seed.json";

/**
 * Bot detection patterns — explicit known bots only
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
  /\[bot\]$/i,
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
 * Load known contributors from cache file.
 * Falls back to seed file if cache is absent.
 * Returns empty Set on any parse error (never throws).
 *
 * @param {string} [cachePath] - Path to GHA-managed cache file
 * @param {string} [seedPath] - Path to committed seed file (fallback)
 * @returns {Promise<Set<string>>}
 */
export async function loadKnownContributors(
  cachePath = DEFAULT_CACHE_PATH,
  seedPath = DEFAULT_SEED_PATH,
) {
  for (const path of [cachePath, seedPath]) {
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        console.log(`[INFO] Loaded ${parsed.length} known contributors from ${path}`);
        return new Set(parsed);
      }
    } catch {
      // ENOENT or malformed JSON — try next path
    }
  }
  console.log("[INFO] No known contributors file found — cold start");
  return new Set();
}

/**
 * Save known contributors to cache file.
 * Creates parent directory if missing. Throws on write failure.
 *
 * @param {Set<string>} knownSet
 * @param {string} [cachePath]
 */
export async function saveKnownContributors(
  knownSet,
  cachePath = DEFAULT_CACHE_PATH,
) {
  await mkdir(dirname(cachePath), { recursive: true });
  const sorted = [...knownSet].sort();
  await writeFile(cachePath, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  console.log(`[INFO] Saved ${knownSet.size} known contributors to ${cachePath}`);
}

/**
 * Identify new contributors for a report period.
 * Pure function — caller owns load/save lifecycle.
 *
 * @param {string[]} contributors - Human contributors this period (pre-filtered, no bots)
 * @param {Set<string>} knownSet - All contributors seen in prior runs
 * @returns {string[]} Contributors not present in knownSet
 */
export function identifyNewContributors(contributors, knownSet) {
  const newContributors = contributors.filter((u) => !knownSet.has(u));

  if (newContributors.length > 0) {
    console.log(
      `[INFO] Identified ${newContributors.length} new contributors: ${newContributors.join(", ")}`,
    );
  } else {
    console.log("[INFO] No new contributors this period");
  }

  return newContributors;
}
