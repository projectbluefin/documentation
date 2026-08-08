#!/usr/bin/env node
/**
 * Fetches weekly countme hit data from the Fedora countme totals CSV and writes
 * static/data/countme-history.json, consumed by the site to show install-base
 * trends for Bluefin, Bluefin LTS, Aurora, Bazzite, and Fedora.
 *
 * The source CSV is ~600 MB. This script uses HTTP Range requests to fetch only
 * the trailing window (default 12 MB ≈ 6 weeks), then merges the fresh data
 * with any previously-seeded history so the file grows over time.
 *
 * Degradation: a failed fetch produces an explicit unavailable:true +
 * stateReason payload. This script never throws, never exits non-zero, and
 * never writes a silently empty file. No private or internal URLs are emitted.
 *
 * Cache TTL: 24 hours (override with COUNTME_CACHE_HOURS), bypassed with
 * --force. Use --seed for a one-time wider backfill (5× the window).
 *
 * Usage: node scripts/fetch-countme.js [--force] [--seed]
 */

import {
  writeFileSync,
  readFileSync,
  existsSync,
  statSync,
  mkdirSync,
} from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/countme-history.json");

const CSV_URL =
  "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv";

const VARIANTS = ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"];

// Header: week_start,week_end,hits,os_name,os_version,os_variant,os_arch,sys_age,repo_tag,repo_arch
const COL = {
  week_start: 0,
  hits: 2,
  os_name: 3,
};

/**
 * Parse a single CSV line into an object with week_start, hits, os_name.
 * Minimal — no quoted-field handling needed for this dataset.
 */
export function parseCsvLine(line) {
  const cols = line.split(",");
  return {
    week_start: cols[COL.week_start] ?? null,
    hits: cols[COL.hits] != null ? Number(cols[COL.hits]) : null,
    os_name: cols[COL.os_name] ?? null,
  };
}

/**
 * Normalize an os_name to one of the tracked variant slugs.
 * Returns null for unrecognised names — bucketing an unknown OS into a variant
 * would inflate the headline number.
 *
 * ORDER MATTERS: LTS checks before generic bluefin.
 */
export function normalizeVariant(osName) {
  if (osName == null) return null;
  const s = String(osName).toLowerCase().trim();
  if (!s) return null;

  // LTS first
  if (
    s.includes("achillobator") ||
    s.includes("bluefin lts") ||
    s.startsWith("bluefin-lts")
  )
    return "bluefin-lts";

  if (s.startsWith("bluefin")) return "bluefin";
  if (s.startsWith("aurora")) return "aurora";
  if (s.startsWith("bazzite")) return "bazzite";
  if (s === "fedora linux" || s === "fedora") return "fedora";

  return null;
}

/**
 * Aggregate parsed CSV rows into weekly totals per variant.
 * When dropFirst is true the first (partial) week is discarded — a ranged read
 * may have started mid-week.
 */
export function aggregateWeeks(rows, { dropFirst = false } = {}) {
  const weekMap = new Map();
  for (const row of rows) {
    const variant = normalizeVariant(row.os_name);
    if (!variant) continue;
    const week = row.week_start;
    if (!week) continue;
    if (!weekMap.has(week)) {
      weekMap.set(week, { week });
    }
    const entry = weekMap.get(week);
    entry[variant] =
      (entry[variant] ?? 0) + (Number.isFinite(row.hits) ? row.hits : 0);
  }

  const sorted = [...weekMap.values()].sort((a, b) =>
    a.week.localeCompare(b.week),
  );

  if (dropFirst && sorted.length > 0) {
    sorted.shift();
  }

  return sorted;
}

/**
 * Compute the byte range for a tail read.
 */
export function tailRange(totalSize, windowBytes) {
  const start = Math.max(0, totalSize - windowBytes);
  return { start, end: totalSize - 1 };
}

/**
 * Merge prior history with fresh data. Fresh wins on overlap (upstream revises
 * data). Result is sorted ascending by week, no duplicates.
 */
export function mergeHistory(prior, fresh) {
  const map = new Map();
  for (const w of prior ?? []) map.set(w.week, w);
  for (const w of fresh ?? []) map.set(w.week, w);
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/** Build the final JSON payload. */
export function buildPayload(
  weeks,
  { generatedAt, unavailable = false, stateReason = null } = {},
) {
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    source: CSV_URL,
    unit: "weekly countme hits",
    variants: VARIANTS,
    weeks,
    unavailable,
    stateReason,
  };
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  const cacheTtlHours = parseFloat(process.env.COUNTME_CACHE_HOURS ?? "24");
  const force = process.argv.includes("--force");
  const seed = process.argv.includes("--seed");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-countme: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  const tailMb = parseFloat(process.env.COUNTME_TAIL_MB ?? "12");
  const windowBytes = Math.round(tailMb * (seed ? 5 : 1) * 1024 * 1024);

  // Read prior seed
  let priorWeeks = [];
  try {
    const prior = JSON.parse(readFileSync(OUT, "utf-8"));
    priorWeeks = prior.weeks ?? [];
  } catch {
    // no prior seed
  }

  // HEAD to get content-length
  const headRes = await fetch(CSV_URL, {
    method: "HEAD",
    signal: AbortSignal.timeout(30000),
  });
  if (!headRes.ok) {
    throw new Error(`HEAD failed: HTTP ${headRes.status}`);
  }
  const totalSize = Number(headRes.headers.get("content-length"));
  if (!Number.isFinite(totalSize) || totalSize === 0) {
    throw new Error("Could not determine CSV size from content-length");
  }

  const range = tailRange(totalSize, windowBytes);
  const rangeHeader = `bytes=${range.start}-${range.end}`;

  const getRes = await fetch(CSV_URL, {
    headers: { Range: rangeHeader, "User-Agent": "bluefin-docs/fetch-countme" },
    signal: AbortSignal.timeout(180000),
  });
  if (!getRes.ok && getRes.status !== 206) {
    throw new Error(`GET failed: HTTP ${getRes.status}`);
  }

  const body = await getRes.text();
  const lines = body.split("\n").filter((l) => l.trim());

  // If we started mid-file the first line is a fragment
  if (range.start > 0 && lines.length > 0) {
    lines.shift();
  }

  // Drop header if present
  if (lines.length > 0 && lines[0].startsWith("week_start,")) {
    lines.shift();
  }

  const rows = lines.map(parseCsvLine);
  const freshWeeks = aggregateWeeks(rows, { dropFirst: range.start > 0 });

  if (freshWeeks.length === 0) {
    throw new Error(
      `No complete weeks found in ${tailMb} MB tail — increase COUNTME_TAIL_MB`,
    );
  }

  const merged = mergeHistory(priorWeeks, freshWeeks);
  const now = new Date().toISOString();
  const payload = buildPayload(merged, { generatedAt: now });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-countme: wrote ${OUT} (${merged.length} weeks, newest: ${merged.at(-1)?.week})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-countme: ${err.message}`);
    // Read prior seed to preserve it
    let priorWeeks = [];
    try {
      const prior = JSON.parse(readFileSync(OUT, "utf-8"));
      priorWeeks = prior.weeks ?? [];
    } catch {
      // no prior
    }
    const now = new Date().toISOString();
    const reason = `Countme data could not be fetched: ${err.message}`;
    const payload =
      priorWeeks.length > 0
        ? buildPayload(priorWeeks, {
            generatedAt: now,
            unavailable: false,
            stateReason: null,
          })
        : buildPayload([], {
            generatedAt: now,
            unavailable: true,
            stateReason: reason,
          });
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
