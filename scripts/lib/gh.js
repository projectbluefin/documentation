/**
 * Shared GitHub API client for the /factory build-time pipelines.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * Exists so run classification has exactly one definition. `classifyRun` is
 * re-exported from fetch-factory-stats.js rather than reimplemented: the rule
 * that an in-flight run is never a failure is the guardrail against
 * projectbluefin/lab#616, and a second copy of it is a second chance to get it
 * wrong.
 *
 * Nothing here emits a token, a host address or an internal URL.
 */

import { classifyRun } from "../fetch-factory-stats.js";

export { classifyRun };

export const GH_API = "https://api.github.com";

export function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

/**
 * Build GitHub API request headers with the repo's single contract.
 *
 * Canonical defaults: `accept: application/vnd.github+json`, the pinned
 * `x-github-api-version`, the project user agent, and a `Bearer` authorization
 * whenever a token is present. Callers override `accept` only where an endpoint
 * needs a different representation — e.g. the Contents API's `.raw` representation
 * returns the file bytes directly, so callers pass
 * `application/vnd.github.v3.raw`. Everything else (token source, api-version
 * pin, user agent, auth scheme) now flows through this one builder instead of
 * being restated at every fetch site.
 */
export function githubHeaders(token, { accept, apiVersion, userAgent } = {}) {
  const h = {
    accept: accept ?? "application/vnd.github+json",
    "user-agent": userAgent ?? "projectbluefin-documentation-factory",
  };
  if (apiVersion !== false) {
    h["x-github-api-version"] = apiVersion ?? "2022-11-28";
  }
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

/**
 * One request through the shared client.
 *
 * Accepts pre-built headers (usually from `githubHeaders`) so a caller can
 * override the `accept` representation for a specific endpoint, plus an optional
 * timeout `signal` and a `fetchImpl` override for tests. Throws on a non-2xx
 * unless `throwOnError` is false — the fail-soft sites that prefer a null
 * fallback over an exception pass `throwOnError: false`.
 */
export async function githubFetch(
  path,
  { headers, signal, fetchImpl, throwOnError = true } = {},
) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await doFetch(url, { headers, signal });
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

function headers(token) {
  return githubHeaders(token);
}

/**
 * One request. Throws on a non-2xx so the caller's try/catch can write an
 * explicit unavailable payload; it never returns a partial success.
 */
export async function ghFetch(path, { token = githubToken() } = {}) {
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await fetch(url, { headers: headers(token) });
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? " (a token with the required scope is missing or exhausted)"
        : "";
    throw new Error(`GET ${path} -> ${res.status}${hint}`);
  }
  return res.json();
}

/**
 * Pages until a short page, `maxPages`, or an empty result.
 *
 * `select` pulls the array out of a wrapped response — the packages endpoints
 * return a bare array, the runs endpoints return `{ workflow_runs: [...] }`.
 */
export async function ghPaginate(
  path,
  { token = githubToken(), maxPages = 5, select } = {},
) {
  const perPage = 100;
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await ghFetch(
      `${path}${sep}per_page=${perPage}&page=${page}`,
      {
        token,
      },
    );
    const items = select ? select(body) : body;
    if (!Array.isArray(items) || items.length === 0) break;
    out.push(...items);
    if (items.length < perPage) break;
  }
  return out;
}

/** Milliseconds between an ISO timestamp and now, or null when absent. */
export function ageMs(iso, now = Date.now()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? now - t : null;
}

/** Whole days since an ISO timestamp. null is a gap, never 0. */
export function ageDays(iso, now = Date.now()) {
  const ms = ageMs(iso, now);
  return ms === null ? null : Math.floor(ms / 86_400_000);
}
