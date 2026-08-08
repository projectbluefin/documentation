#!/usr/bin/env node
/**
 * Fetches Homebrew install analytics by OS version for three time windows
 * (30d, 90d, 365d) and writes static/data/brew-analytics.json, consumed by
 * the site to show Bluefin's rank among Homebrew-reported operating systems.
 *
 * Source: https://formulae.brew.sh/api/analytics/os-version/{window}.json
 * Public, unauthenticated, ~55 KB each.
 *
 * Degradation: a window that fails records unavailable under its own key; the
 * top-level unavailable is set only when all three fail. This script never
 * throws, never exits non-zero, and never writes a silently empty file.
 *
 * Cache TTL: 12 hours (override with BREW_CACHE_HOURS), bypassed with --force.
 *
 * Usage: node scripts/fetch-brew-analytics.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/brew-analytics.json");

const BASE_URL = "https://formulae.brew.sh/api/analytics/os-version";
const WINDOWS = ["30d", "90d", "365d"];

const BLUEFIN_EXACT = new Set(["Bluefin", "Bluefin LTS"]);
const PEER_PREFIXES = ["Fedora Linux", "Ubuntu", "macOS"];

/** Slug: lowercase, non-alphanumerics → hyphen. */
function toSlug(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse a count string with thousands separators into a number.
 * Returns null (not 0) for undefined or unparseable values.
 */
export function parseCount(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pick Bluefin rows from the items array — exact match only.
 * Never uses includes to avoid lookalikes like "Blueflower".
 */
export function pickBluefinRows(items) {
  return (items ?? [])
    .filter((item) => BLUEFIN_EXACT.has(item.os_version))
    .map((item) => ({
      id: toSlug(item.os_version),
      label: item.os_version,
      rank: item.number,
      count: parseCount(item.count),
      percent: parseCount(item.percent),
    }));
}

/**
 * Pick peer comparison rows: Fedora Linux, Ubuntu, macOS — excluding Bluefin
 * lanes, top 10 by count.
 */
export function pickPeerRows(items) {
  return (items ?? [])
    .filter(
      (item) =>
        !BLUEFIN_EXACT.has(item.os_version) &&
        PEER_PREFIXES.some((p) => (item.os_version ?? "").startsWith(p)),
    )
    .map((item) => ({
      id: toSlug(item.os_version),
      label: item.os_version,
      rank: item.number,
      count: parseCount(item.count),
    }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 10);
}

/** Build a single window entry from the API response. */
export function buildWindow(data) {
  const items = data.items ?? [];
  return {
    startDate: data.start_date ?? null,
    endDate: data.end_date ?? null,
    totalCount:
      parseCount(data.total_count) ??
      (typeof data.total_count === "number" ? data.total_count : null),
    trackedItems: data.total_items ?? null,
    rows: pickBluefinRows(items),
    peers: pickPeerRows(items),
    unavailable: false,
    stateReason: null,
  };
}

/** Assemble the full payload. */
export function buildPayload(windows, { generatedAt } = {}) {
  const allUnavailable =
    Object.values(windows).length > 0 &&
    Object.values(windows).every((w) => w.unavailable);
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    source: `${BASE_URL}/{window}.json`,
    windows,
    unavailable: allUnavailable,
    stateReason: allUnavailable
      ? "All Homebrew analytics windows unavailable"
      : null,
  };
}

// ── main ─────────────────────────────────────────────────────────────────

async function fetchWindow(window) {
  const url = `${BASE_URL}/${window}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": "bluefin-docs/fetch-brew-analytics" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  const cacheTtlHours = parseFloat(process.env.BREW_CACHE_HOURS ?? "12");
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-brew-analytics: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  const windowResults = {};
  const results = await Promise.all(
    WINDOWS.map(async (w) => {
      try {
        const data = await fetchWindow(w);
        return { window: w, result: buildWindow(data) };
      } catch (err) {
        console.warn(`fetch-brew-analytics: ${w} unavailable — ${err.message}`);
        return {
          window: w,
          result: {
            startDate: null,
            endDate: null,
            totalCount: null,
            trackedItems: null,
            rows: [],
            peers: [],
            unavailable: true,
            stateReason: `Homebrew analytics ${w} unavailable: ${err.message}`,
          },
        };
      }
    }),
  );

  for (const { window, result } of results) {
    windowResults[window] = result;
  }

  const now = new Date().toISOString();
  const payload = buildPayload(windowResults, { generatedAt: now });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

  for (const w of WINDOWS) {
    const wr = windowResults[w];
    if (!wr.unavailable) {
      const bluefinRow = wr.rows.find((r) => r.id === "bluefin");
      console.log(
        `fetch-brew-analytics: ${w} — ${wr.rows.length} Bluefin rows, ` +
          `rank ${bluefinRow?.rank ?? "n/a"}, count ${bluefinRow?.count ?? "n/a"}`,
      );
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-brew-analytics: ${err.message}`);
    const now = new Date().toISOString();
    const reason = `Homebrew analytics could not be fetched: ${err.message}`;
    const windowResults = {};
    for (const w of WINDOWS) {
      windowResults[w] = {
        startDate: null,
        endDate: null,
        totalCount: null,
        trackedItems: null,
        rows: [],
        peers: [],
        unavailable: true,
        stateReason: reason,
      };
    }
    const payload = buildPayload(windowResults, { generatedAt: now });
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
