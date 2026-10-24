#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseBadgeCount } from "./lib/classic-countme.mjs";
import { UPSTREAM_ALLOWED } from "./lib/countme-sources.mjs";
import { githubFetch, githubHeaders, githubToken } from "./lib/gh.js";
import { mapWithConcurrency } from "./lib/request-queue.js";
import { seedIsFresh } from "./lib/seed-cache.js";

export const METHOD = "classic-badge-history-v1";
export const WINDOW_DAYS = 270;
const BADGE_PATH = "badge-endpoints/bluefin.json";
const OUT = fileURLToPath(
  new URL("../static/data/classic-countme-history.json", import.meta.url),
);
const UNAVAILABLE_REASON =
  "Bluefin Classic population history is temporarily unavailable.";

function publicationTime(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)
  ) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value.slice(0, 10)
    ? time
    : null;
}

/** Publications are real badge revisions, not estimates of earlier days. */
export function buildClassicHistory(
  publications,
  { generatedAt, currentBadge = null },
) {
  const byDay = new Map();
  for (const { publishedAt, message } of publications) {
    const time = publicationTime(publishedAt);
    if (time === null) throw new Error("Invalid badge publication date");
    const date = new Date(time).toISOString().slice(0, 10);
    const prior = byDay.get(date);
    if (!prior || time > prior.time) {
      byDay.set(date, { time, count: parseBadgeCount(message) });
    }
  }
  const current = parseBadgeCount(currentBadge);
  if (current !== null) {
    byDay.set(generatedAt.slice(0, 10), { count: current });
  }
  return {
    generatedAt,
    source: UPSTREAM_ALLOWED.source,
    method: METHOD,
    observations: [...byDay]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count }]) => ({ date, count })),
  };
}

/** Only a comparable, dated cache may survive an upstream outage. */
export function isValidClassicHistory(payload) {
  if (
    !payload ||
    payload.source !== UPSTREAM_ALLOWED.source ||
    payload.method !== METHOD ||
    payload.unavailable ||
    publicationTime(payload.generatedAt) === null ||
    !Array.isArray(payload.observations) ||
    payload.observations.length === 0
  ) {
    return false;
  }
  let previous = "";
  for (const observation of payload.observations) {
    if (!observation || typeof observation.date !== "string") return false;
    const { date, count } = observation;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      publicationTime(`${date}T00:00:00Z`) === null ||
      date <= previous ||
      (count !== null &&
        (typeof count !== "number" || !Number.isFinite(count) || count < 0))
    ) {
      return false;
    }
    previous = date;
  }
  return true;
}

/** Fetch only the permitted file, at validated immutable revisions. */
export async function fetchClassicHistory({
  now = new Date(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const generatedAt = now.toISOString();
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const apiHeaders = githubHeaders(githubToken());
  const badgeHeaders = githubHeaders(null, {
    accept: "application/json",
    apiVersion: false,
  });
  const getJson = async (path, headers) => {
    const response = await githubFetch(path, {
      headers,
      fetchImpl,
      signal: AbortSignal.timeout(30_000),
    });
    return response.json();
  };
  const commits = [];
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      path: BADGE_PATH,
      since: since.toISOString(),
      until: generatedAt,
      per_page: "100",
      page: String(page),
    });
    const items = await getJson(
      `/repos/ublue-os/countme/commits?${query}`,
      apiHeaders,
    );
    if (!Array.isArray(items))
      throw new Error("Invalid badge revision history");
    for (const item of items) {
      const publishedAt = item?.commit?.committer?.date;
      const time = publicationTime(publishedAt);
      if (!/^[a-f\d]{40}$/i.test(item?.sha ?? "") || time === null) {
        throw new Error("Invalid badge revision");
      }
      if (time >= since.getTime() && time <= now.getTime()) {
        commits.push({ sha: item.sha, publishedAt });
      }
    }
    if (items.length < 100) break;
  }
  const publications = await mapWithConcurrency(
    commits,
    async ({ sha, publishedAt }) => {
      const badge = await getJson(
        UPSTREAM_ALLOWED.source.replace("/main/", `/${sha}/`),
        badgeHeaders,
      );
      return { publishedAt, message: badge?.message };
    },
    { concurrency: 4 },
  );
  const current = await getJson(UPSTREAM_ALLOWED.source, badgeHeaders);
  const payload = buildClassicHistory(publications, {
    generatedAt,
    currentBadge: current?.message,
  });
  if (!payload.observations.length) {
    throw new Error("No badge observations available");
  }
  return payload;
}

export async function main({
  out = OUT,
  now = new Date(),
  force = process.argv.includes("--force"),
  fetchImpl = globalThis.fetch,
} = {}) {
  let cached = null;
  try {
    cached = JSON.parse(readFileSync(out, "utf8"));
  } catch {
    // A missing or malformed cache must be refetched.
  }
  const validCache = isValidClassicHistory(cached);
  if (!force && validCache && seedIsFresh(out, 24, now.getTime())) {
    return cached;
  }

  let payload;
  try {
    payload = await fetchClassicHistory({ now, fetchImpl });
  } catch {
    if (validCache) {
      console.warn(
        "fetch-classic-countme: retaining published population history",
      );
      return cached;
    }
    payload = {
      generatedAt: now.toISOString(),
      source: UPSTREAM_ALLOWED.source,
      method: METHOD,
      observations: [],
      unavailable: true,
      stateReason: UNAVAILABLE_REASON,
    };
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
