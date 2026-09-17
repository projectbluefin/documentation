/**
 * Shared request-queue utilities for GitHub API fetch scripts.
 *
 * Consolidates patterns that were duplicated across multiple scripts:
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
 *
 * 3. The single GitHub API header + token contract (`githubToken`,
 *    `githubHeaders`, `githubFetch`) — the CJS twin of `lib/gh.js`. It exists
 *    so the CJS fetchers (fetch-feeds.js, fetch-pin-state.js, ...) route their
 *    token acquisition, Accept / api-version pinning, and user-agent through
 *    one place instead of restating them per script (projectbluefin/
 *    documentation#1232).
 */

"use strict";

/** GitHub REST API origin for CJS fetchers. */
const GH_API = "https://api.github.com";

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

// ── GitHub API client (CJS twin of lib/gh.js) ──────────────────────────────

/**
 * The single GitHub token source. Reads `GITHUB_TOKEN`, then `GH_TOKEN`.
 *
 * @returns {string|null} The token, or null when neither env var is set.
 */
function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

/**
 * Build the single GitHub API header contract used by the CJS fetchers.
 *
 * Canonical defaults: the project user-agent, `application/vnd.github+json`,
 * and the pinned `x-github-api-version`. `Authorization: Bearer` is added
 * whenever a token is present. Callers override `accept` only where an
 * endpoint needs a different representation (e.g. the Contents API `.raw`).
 *
 * @param {string}  [token]              GitHub token. Falls back to the env.
 * @param {object}  [opts]               Options.
 * @param {string}  [opts.accept]        Accept header override.
 * @param {string}  [opts.apiVersion]    api-version override; `false` omits it.
 * @param {string}  [opts.userAgent]     User-Agent override.
 * @returns {object} Headers object suitable for `fetch()`.
 */
function githubHeaders(token, { accept, apiVersion, userAgent } = {}) {
  const t = token || githubToken();
  const headers = {
    "User-Agent": userAgent || "Bluefin-Docs-Build",
    Accept: accept || "application/vnd.github+json",
  };
  if (apiVersion !== false) {
    headers["X-GitHub-Api-Version"] = apiVersion || "2022-11-28";
  }
  if (t) headers["Authorization"] = `Bearer ${t}`;
  return headers;
}

/**
 * One request through the shared CJS client. Mirrors `githubFetch` in
 * lib/gh.js so the two module systems share one header/error contract.
 *
 * Throws on a non-2xx unless `throwOnError` is false — the fail-soft callers
 * that prefer a null fallback over an exception pass `throwOnError: false`.
 *
 * @param {string}  path            API path (e.g. "/repos/o/r/releases") or full URL.
 * @param {object}  [opts]          Options.
 * @param {object}  [opts.headers]  Pre-built headers (usually from `githubHeaders`).
 * @param {AbortSignal} [opts.signal] Optional timeout / cancellation signal.
 * @param {boolean} [opts.throwOnError=true] Throw on non-2xx instead of returning null.
 * @returns {Promise<Response|null>} The fetch Response, or null when
 *                                   `throwOnError` is false and the status is not ok.
 */
async function githubFetch(
  path,
  { headers, signal, throwOnError = true } = {},
) {
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await fetch(url, { headers: headers ?? githubHeaders(), signal });
  if (!res.ok) {
    if (!throwOnError) return null;
    const hint =
      res.status === 401 || res.status === 403
        ? " (a token with the required scope is missing or exhausted)"
        : "";
    throw new Error(`GET ${path} -> ${res.status}${hint}`);
  }
  return res;
}

module.exports = {
  GH_API,
  isNetworkError,
  retryWithBackoff,
  sequentialFetchWithDelay,
  githubToken,
  githubHeaders,
  githubFetch,
};
