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
 * The single GitHub API header contract. Every fetcher in the factory layer
 * builds headers through here so Accept / api-version / user-agent cannot drift
 * per file (projectbluefin/documentation#1232).
 */
export function githubHeaders(token) {
  const h = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "projectbluefin-documentation-factory",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

/**
 * One request. Throws on a non-2xx so the caller's try/catch can write an
 * explicit unavailable payload; it never returns a partial success.
 *
 * `signal` is forwarded to fetch so a caller can pin its own timeout; the
 * shared client has no retry of its so a wedged endpoint fails fast instead of
 * hanging the build.
 */
export async function ghFetch(path, { token = githubToken(), signal } = {}) {
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await fetch(url, {
    headers: githubHeaders(token),
    ...(signal ? { signal } : {}),
  });
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
  { token = githubToken(), maxPages = 5, select, signal } = {},
) {
  const perPage = 100;
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await ghFetch(
      `${path}${sep}per_page=${perPage}&page=${page}`,
      {
        token,
        signal,
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
