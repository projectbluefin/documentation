#!/usr/bin/env node
/**
 * Fetches weekly countme data from the Fedora countme totals CSV and writes
 * static/data/countme-history.json, consumed by the site to show active-device
 * trends for Bluefin, Bluefin LTS, Aurora, Bazzite, and Fedora.
 *
 * COUNTING RULE — keep in step with ublue-os/countme.
 *
 * ublue-os/countme is the project's canonical countme implementation; it
 * produces the growth_*.svg charts embedded on /analytics and the "Active Users"
 * badges carried in project READMEs. This script exists only because those
 * outputs are a rendered chart and a single latest number, and the dashboard
 * needs the weekly series as data. It must therefore agree with them, so the
 * rules below are ported from ublue-os/countme:data_processing.py rather than
 * invented here. If that file changes, change this one.
 *
 *   1. Drop sys_age == -1. Those rows are not an "all ages" subtotal — they are
 *      a separate legacy unique-IP estimate that mirrors-countme computes in a
 *      second pass and writes into the same table. Adding them to the real
 *      sys_age 1..4 rows stacks two different metrics on top of each other.
 *   2. Count one repo per system. DNF sends countme once per week for each repo
 *      that has it enabled, so `hits` counts requests, not machines. Restricting
 *      to the base ^fedora-[0-9]+$ repo picks the one repo every Fedora-based
 *      system has exactly one of; summing across those tags therefore sums
 *      across releases (F41 + F42 + …), not across repos of one machine.
 *   3. Bluefin LTS is exempt from rule 2. It is CentOS Stream based and has no
 *      fedora-N repo at all, so it is counted across its own (EPEL) repos.
 *   4. Two upstream weeks are known bad and are skipped outright.
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

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { seedIsFresh, seedAgeMs } from "./lib/seed-cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/countme-history.json");

const CSV_URL =
  "https://data-analysis.fedoraproject.org/csv-reports/countme/totals.csv";

const VARIANTS = ["bluefin", "bluefin-lts", "aurora", "bazzite", "fedora"];

/**
 * How a weekly number is derived from the CSV. Stamped into the payload so a
 * later run can tell whether stored weeks were produced by this same method —
 * see mergeHistory, which refuses to blend two methods into one series.
 *
 * Bump this whenever the counting rule changes.
 */
export const METHOD = "ublue-countme-v1";

/**
 * The one repo every Fedora-based system has exactly one of. See rule 2.
 */
const BASE_REPO = /^fedora-\d+$/;

/**
 * Variants with no fedora-N repo, counted across their own repos instead.
 * Bluefin LTS is CentOS Stream based and reaches Fedora's counter only through
 * EPEL. ublue-os/countme has this same carve-out.
 */
const NON_FEDORA_VARIANTS = new Set(["bluefin-lts"]);

/**
 * Weeks upstream got wrong, skipped exactly as ublue-os/countme skips them.
 * Keyed by week_end, which is how that project identifies them.
 *
 *   2024-12-29 — a partial week at the end of the year.
 *   2025-07-06 — Fedora infrastructure migration; a ~40% drop that is an
 *                artefact of the migration, not a loss of users.
 */
const EXCLUDED_WEEK_ENDS = new Set(["2024-12-29", "2025-07-06"]);

// Header: week_start,week_end,hits,os_name,os_version,os_variant,os_arch,sys_age,repo_tag,repo_arch
const COL = {
  week_start: 0,
  week_end: 1,
  hits: 2,
  os_name: 3,
  os_arch: 6,
  sys_age: 7,
  repo_tag: 8,
};

const FIELD_COUNT = 10;

/**
 * Split one CSV record, honouring double-quoted fields.
 *
 * The upstream os_name comes straight from a machine's /etc/os-release NAME and
 * is therefore free-form: real rows carry names containing commas, which are
 * quoted. A plain split(",") shifts every later column on those rows, so hits
 * and repo_tag get read out of the wrong positions.
 */
export function splitCsvRow(line) {
  const out = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        // "" inside a quoted field is a literal quote.
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/**
 * Parse a single CSV line into the fields the aggregation needs.
 *
 * Returns null for a record that does not have the documented column count. A
 * short or long row means the shape is not what we think it is, and reading
 * hits out of a shifted row would corrupt a total silently — dropping it is the
 * honest failure.
 */
export function parseCsvLine(line) {
  const cols = splitCsvRow(line);
  if (cols.length !== FIELD_COUNT) return null;

  const hits = Number(cols[COL.hits]);
  const sysAge = Number(cols[COL.sys_age]);

  return {
    week_start: cols[COL.week_start] || null,
    week_end: cols[COL.week_end] || null,
    hits: Number.isFinite(hits) ? hits : null,
    os_name: cols[COL.os_name] || null,
    os_arch: cols[COL.os_arch] || null,
    sys_age: Number.isFinite(sysAge) ? sysAge : null,
    repo_tag: cols[COL.repo_tag] || null,
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
 * Aggregate parsed CSV rows into weekly per-variant active-device counts.
 *
 * Applies the four rules documented at the top of this file, which are ported
 * from ublue-os/countme:data_processing.py so that this series and the project's
 * published charts and badges cannot drift apart.
 *
 * When dropFirst is true the earliest week in the input is discarded — a ranged
 * read may have started mid-week. That week is identified from the rows as they
 * arrive, before any filtering: the partial week is often thin enough that the
 * rules below drop it completely, and trimming the first *surviving* week would
 * then silently discard a good one instead.
 */
export function aggregateWeeks(rows, { dropFirst = false } = {}) {
  const weekMap = new Map();

  // Identified pre-filter; see the note above.
  let partialWeek = null;
  if (dropFirst) {
    for (const row of rows) {
      if (!row?.week_start) continue;
      if (partialWeek == null || row.week_start < partialWeek) {
        partialWeek = row.week_start;
      }
    }
  }

  for (const row of rows) {
    if (!row) continue;

    // Rule 1 — sys_age -1 is the legacy unique-IP series, not countme. A null
    // sys_age means the row did not parse cleanly enough to place.
    if (row.sys_age == null || row.sys_age < 1) continue;

    // Rule 4 — skip the weeks upstream got wrong.
    if (row.week_end && EXCLUDED_WEEK_ENDS.has(row.week_end)) continue;

    const variant = normalizeVariant(row.os_name);
    if (!variant) continue;

    const week = row.week_start;
    if (!week) continue;
    if (partialWeek != null && week === partialWeek) continue;
    if (!Number.isFinite(row.hits)) continue;

    // Rules 2 and 3 — one repo per system, except for the variants that have no
    // fedora-N repo to be restricted to.
    if (
      !NON_FEDORA_VARIANTS.has(variant) &&
      !BASE_REPO.test(row.repo_tag ?? "")
    )
      continue;

    if (!weekMap.has(week)) weekMap.set(week, { week });
    const entry = weekMap.get(week);
    entry[variant] = (entry[variant] ?? 0) + row.hits;
  }

  return [...weekMap.values()].sort((a, b) => a.week.localeCompare(b.week));
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
 *
 * Prior weeks are only kept when they were produced by the current method. A
 * routine run reads a ~6 week window, so blending across a method change would
 * correct the recent weeks and leave the older ones at their old values —
 * yielding one series with a step discontinuity in the middle and nothing on the
 * page to say so. Dropping the incomparable history is the lesser harm; the
 * backfill run then refills it.
 */
export function mergeHistory(prior, fresh, priorMethod = METHOD) {
  const map = new Map();
  if (priorMethod === METHOD) {
    for (const w of prior ?? []) map.set(w.week, w);
  }
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
    method: METHOD,
    unit: "estimated weekly active systems",
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

  // Freshness comes from the payload's own generatedAt, not file mtime: this
  // seed is tracked, and git checkout stamps every tracked file with the
  // current time, so mtime would report "1m old" on every CI run and the seed
  // would never refresh. See scripts/lib/seed-cache.js.
  if (!force && seedIsFresh(OUT, cacheTtlHours)) {
    const age = seedAgeMs(OUT);
    console.log(
      `fetch-countme: seed generated ${Math.round((age ?? 0) / 60000)}m ago, skipping`,
    );
    return;
  }

  const tailMb = parseFloat(process.env.COUNTME_TAIL_MB ?? "12");
  const windowBytes = Math.round(tailMb * (seed ? 5 : 1) * 1024 * 1024);

  // Read prior seed
  let priorWeeks = [];
  let priorMethod = null;
  try {
    const prior = JSON.parse(readFileSync(OUT, "utf-8"));
    priorWeeks = prior.weeks ?? [];
    priorMethod = prior.method ?? null;
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

  const merged = mergeHistory(priorWeeks, freshWeeks, priorMethod);
  const now = new Date().toISOString();
  const payload = buildPayload(merged, { generatedAt: now });

  if (priorWeeks.length > 0 && priorMethod !== METHOD) {
    console.log(
      `fetch-countme: prior seed used method ${priorMethod ?? "(none)"}, ` +
        `current is ${METHOD} — dropped ${priorWeeks.length} incomparable week(s). ` +
        `Run with --seed to backfill.`,
    );
  }

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
    // Read prior seed to preserve it — but only if it was produced by the
    // current method. Rewriting old weeks through buildPayload would stamp them
    // with the current METHOD and launder incomparable numbers into the series.
    let priorWeeks = [];
    try {
      const prior = JSON.parse(readFileSync(OUT, "utf-8"));
      if ((prior.method ?? null) === METHOD) {
        priorWeeks = prior.weeks ?? [];
      }
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
