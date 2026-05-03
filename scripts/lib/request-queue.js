/**
 * Shared request-queue utilities for GitHub API fetch scripts.
 *
 * Consolidates two patterns that were duplicated across multiple scripts:
 *
 * 1. `retryWithBackoff(fn, opts)` — exponential-backoff retry for transient
 *    network errors (ECONNRESET, ETIMEDOUT, etc.).  Skips retry on auth/rate-
 *    limit errors (401/403).  Previously duplicated in graphql-queries.mjs
 *    and build-metrics.mjs.
 *
 * 2. `sequentialFetchWithDelay(items, fetchFn, delayMs)` — iterates an array,
 *    calling an async function for each item with a fixed inter-request delay.
 *    Previously duplicated in fetch-github-repos.js, fetch-contributors.js,
 *    and fetch-github-profiles.js.
 */

"use strict";

// ── Retry with exponential backoff ──────────────────────────────────────────

/**
 * Determine whether an error is a transient network error worth retrying.
 *
 * @param {Error} error
 * @returns {boolean}
 */
function isNetworkError(error) {
  return (
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND" ||
    error.code === "EAI_AGAIN" ||
    error.message?.includes("socket hang up") ||
    error.message?.includes("timeout")
  );
}

/**
 * Retry an async function with exponential backoff on transient network errors.
 *
 * Behaviour preserved from the original implementations:
 *  - 401 / 403 → throw immediately (auth / rate-limit).
 *  - Network errors → retry up to `maxRetries` times with 2^attempt × 1 000 ms delay.
 *  - Any other error → throw immediately.
 *
 * @param {Function} fn          Async function to execute.
 * @param {object}   [opts]      Options.
 * @param {number}   [opts.maxRetries=3]  Maximum retry attempts.
 * @param {string}   [opts.label]         Optional log prefix (e.g. "[build-metrics]").
 * @returns {Promise<any>} Result of the successful call.
 */
async function retryWithBackoff(fn, opts = {}) {
  const maxRetries = opts.maxRetries ?? 3;
  const label = opts.label ? `${opts.label} ` : "";
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication or rate limit errors
      if (error.status === 401 || error.status === 403) {
        if (label) {
          console.warn(
            `${label}Authentication/rate limit error: ${error.message}`,
          );
        }
        throw error;
      }

      // Retry on network errors
      if (isNetworkError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(
          `${label}Retry ${attempt}/${maxRetries} after network error: ${error.message || error.code}`,
        );
        console.log(`${label}Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If not a network error or max retries reached, throw
      throw error;
    }
  }

  throw lastError;
}

// ── Sequential fetch with inter-request delay ──────────────────────────────

/**
 * Process an array of items sequentially, calling `fetchFn` for each and
 * pausing `delayMs` between requests to avoid hitting GitHub rate limits.
 *
 * @param {Array}    items       Items to iterate.
 * @param {Function} fetchFn    `async (item) => result | null`. Called once per item.
 * @param {object}   [opts]     Options.
 * @param {number}   [opts.delayMs=100]  Milliseconds to wait between requests.
 * @returns {Promise<Map>} Map of item → result (null results are excluded).
 */
async function sequentialFetchWithDelay(items, fetchFn, opts = {}) {
  const delayMs = opts.delayMs ?? 100;
  const results = new Map();

  for (const item of items) {
    const result = await fetchFn(item);
    if (result != null) {
      results.set(item, result);
    }

    // Inter-request delay to be nice to GitHub's API
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ── GitHub auth headers helper ──────────────────────────────────────────────

/**
 * Build standard GitHub API request headers.
 *
 * @param {string} [token]  GitHub personal access token. Falls back to
 *                          GITHUB_TOKEN / GH_TOKEN env vars when omitted.
 * @returns {object} Headers object suitable for `fetch()`.
 */
function githubHeaders(token) {
  const t = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = { "User-Agent": "Bluefin-Docs-Build" };
  if (t) {
    headers["Authorization"] = `Bearer ${t}`;
  }
  return headers;
}

module.exports = {
  isNetworkError,
  retryWithBackoff,
  sequentialFetchWithDelay,
  githubHeaders,
};
