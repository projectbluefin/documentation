#!/usr/bin/env node
/**
 * Fetches platform-wide Flathub statistics and writes
 * static/data/flathub-stats.json, consumed by data-backed pages.
 *
 * The Flathub /api/v2/stats endpoint 307-redirects; fetch follows by default
 * but we set redirect:"follow" explicitly as documentation.
 *
 * Degradation: a failed fetch produces an explicit unavailable:true +
 * stateReason payload. This script never throws, never exits non-zero, and
 * never writes a silently empty file, so the build succeeds without network.
 *
 * Cache TTL: 6 hours (override with FLATHUB_CACHE_HOURS), bypassed with
 * --force.
 *
 * Usage: node scripts/fetch-flathub-stats.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/flathub-stats.json");

const FLATHUB_API = "https://flathub.org/api/v2/stats";

/** The exact set of OS ids we track. Equality match only — no prefix. */
const TRACKED_OS = new Set([
  "bluefin",
  "aurora",
  "bazzite",
  "fedora",
  "silverblue",
]);

const DAILY_WINDOW = 730;

/**
 * Split an os_versions key like "bluefin;44" into {os, version}.
 * Tolerates any separator-bearing key shape.
 */
export function splitOsKey(key) {
  const idx = (key ?? "").indexOf(";");
  if (idx === -1) return { os: key ?? "", version: "" };
  return { os: key.slice(0, idx), version: key.slice(idx + 1) };
}

/**
 * Fold os_versions into per-OS totals with a per-version breakdown.
 * Only tracked OS ids are included; matching is by exact equality on the
 * os segment, so "blue7", "bluecat", etc. are excluded.
 */
export function foldOsVersions(osVersions) {
  const map = new Map();
  for (const [key, count] of Object.entries(osVersions ?? {})) {
    const { os, version } = splitOsKey(key);
    if (!TRACKED_OS.has(os)) continue;
    if (!map.has(os)) map.set(os, { downloads: 0, versions: {} });
    const entry = map.get(os);
    entry.downloads += count;
    entry.versions[version] = (entry.versions[version] ?? 0) + count;
  }
  return map;
}

/**
 * Merge every bluefin;* bucket from os_flatpak_versions, summing per Flatpak
 * version. Returns sorted descending by installs.
 */
export function bluefinFlatpakVersions(osFlatpakVersions) {
  const totals = new Map();
  for (const [key, fpMap] of Object.entries(osFlatpakVersions ?? {})) {
    const { os } = splitOsKey(key);
    if (os !== "bluefin") continue;
    for (const [ver, count] of Object.entries(fpMap ?? {})) {
      totals.set(ver, (totals.get(ver) ?? 0) + count);
    }
  }
  return [...totals.entries()]
    .map(([version, installs]) => ({ version, installs }))
    .sort((a, b) => b.installs - a.installs);
}

/**
 * Return the last `days` entries from a downloads_per_day object, sorted
 * ascending by date.
 */
export function trimDaily(obj, days) {
  return Object.entries(obj ?? {})
    .map(([date, downloads]) => ({ date, downloads }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
}

/** Assemble the full payload written to disk. */
export function buildPayload(data, { generatedAt } = {}) {
  const totals = data.totals ?? {};
  const folded = foldOsVersions(data.os_versions);
  const totalDownloads = totals.downloads ?? null;

  const byOs = [...folded.entries()]
    .map(([id, { downloads, versions }]) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      downloads,
      share: totalDownloads ? +(downloads / totalDownloads).toFixed(4) : null,
      versions,
    }))
    .sort((a, b) => b.downloads - a.downloads);

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    source: FLATHUB_API,
    platform: {
      downloads: totals.downloads ?? null,
      apps: totals.number_of_apps ?? null,
      verifiedApps: totals.verified_apps ?? null,
    },
    downloadsPerDay: trimDaily(data.downloads_per_day, DAILY_WINDOW),
    byOs,
    flatpakVersionsOnBluefin: bluefinFlatpakVersions(data.os_flatpak_versions),
    unavailable: false,
    stateReason: null,
  };
}

function unavailablePayload(reason) {
  return {
    generatedAt: new Date().toISOString(),
    source: FLATHUB_API,
    platform: { downloads: null, apps: null, verifiedApps: null },
    downloadsPerDay: [],
    byOs: [],
    flatpakVersionsOnBluefin: [],
    unavailable: true,
    stateReason: reason,
  };
}

async function main() {
  const cacheTtlHours = parseFloat(process.env.FLATHUB_CACHE_HOURS ?? "6");
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-flathub-stats: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  // Flathub /api/v2/stats 307-redirects; redirect:"follow" is the default
  // but we state it explicitly so the intent is clear.
  const res = await fetch(FLATHUB_API, {
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "bluefin-docs/fetch-flathub-stats" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${FLATHUB_API}`);
  }

  const data = await res.json();
  const payload = buildPayload(data);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

  const bluefin = payload.byOs.find((o) => o.id === "bluefin");
  console.log(
    `fetch-flathub-stats: wrote ${OUT} ` +
      `(platform ${payload.platform.downloads?.toLocaleString()} downloads, ` +
      `bluefin ${bluefin?.downloads?.toLocaleString() ?? "n/a"} across ${Object.keys(bluefin?.versions ?? {}).length} versions, ` +
      `${payload.downloadsPerDay.length} daily entries)`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-flathub-stats: ${err.message}`);
    const payload = unavailablePayload(
      `Flathub statistics could not be generated: ${err.message}`,
    );
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
