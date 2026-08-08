#!/usr/bin/env node
/**
 * Fetches the GHCR container-package inventory for Project Bluefin and writes
 * static/data/ghcr-packages.json — a freshness and inventory view of every
 * published container image.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * This pipeline complements fetch-github-images.js (which produces a catalog
 * with GNOME/kernel versions per stream). This one answers "how many packages
 * exist, which streams are published, and how fresh are they?"
 *
 * Degradation: a missing token or a failed fetch produces an explicit
 * unavailable:true + stateReason payload. This script never throws, never exits
 * non-zero, and never writes a silently empty file, so the build succeeds
 * without a token. No private or internal URLs are emitted.
 *
 * Cache TTL: 6 hours (override with GHCR_CACHE_HOURS), bypassed with --force.
 *
 * Usage: node scripts/fetch-ghcr-packages.js [--force]
 */

import { writeFileSync, existsSync, statSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { githubToken, ghFetch, ghPaginate, ageDays } from "./lib/gh.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../static/data/ghcr-packages.json");

const ORGS = ["projectbluefin"];
const MAX_VERSION_PAGES = 2;

const COSIGN_TAG = /^sha256-.*\.(sig|att|sbom)$/;

const REPORTED_TAGS = new Set([
  "stable",
  "testing",
  "latest",
  "gts",
  "lts",
  "nightly",
  "beta",
]);
const ROLLING_TAGS = new Set(["testing", "latest", "nightly", "beta"]);

/**
 * Match date-stamped variants of stream tags.
 * Real-world tags: stable-20260720, testing-20260808, testing-44.20260808.2
 * Captures the base stream name (group 1).
 */
const DATED_STREAM_TAG = /^(stable|testing|latest|nightly|beta|gts|lts)-\d{8}/;

// ── Pure exports ────────────────────────────────────────────────────────

/**
 * Classify a package into a family bucket.
 * Order matters: internal must be checked before os.
 */
export function classifyFamily(name) {
  if (name.endsWith("-cache") || name.endsWith("-pr")) return "internal";
  if (name.endsWith("-toolbox")) return "toolbox";
  if (name.startsWith("bluefin") || name.startsWith("dakota")) return "os";
  if (
    name.startsWith("base") ||
    name.startsWith("static") ||
    name.startsWith("skopeo") ||
    name.startsWith("buildah") ||
    name.startsWith("qemu-img") ||
    name.startsWith("lab-runner") ||
    name === "brew"
  )
    return "userspace";
  if (
    name.startsWith("testsuite") ||
    name.startsWith("knuckle") ||
    name === "common" ||
    name === "finpilot"
  )
    return "tooling";
  return "tooling";
}

/**
 * Determine freshness state for a stream tag given its age in days.
 * null ageDays means no version carries this tag yet.
 */
export function freshnessState(tag, days) {
  if (days === null) {
    return {
      state: "awaiting",
      stateReason: "no published version carries this tag yet",
    };
  }
  const threshold = ROLLING_TAGS.has(tag) ? 7 : 14;
  if (days <= threshold / 2) {
    return { state: "fresh", stateReason: null };
  }
  if (days <= threshold) {
    return { state: "recent", stateReason: null };
  }
  return {
    state: "stale",
    stateReason: `${tag} lanes are expected to publish within ${threshold} days`,
  };
}

/**
 * From a list of version objects, extract one entry per distinct reported
 * stream tag (newest wins). Ignores cosign artefacts and untagged versions.
 */
export function pickStreams(versions, now = Date.now()) {
  const tagMap = new Map(); // tag -> { publishedAt, created_at raw }

  for (const v of versions) {
    const tags = v?.metadata?.container?.tags;
    if (!Array.isArray(tags) || tags.length === 0) continue;

    const createdAt = v.created_at ?? v.updated_at ?? null;
    const createdMs = createdAt ? Date.parse(createdAt) : NaN;
    if (!Number.isFinite(createdMs)) continue;

    for (const rawTag of tags) {
      if (COSIGN_TAG.test(rawTag)) continue;

      let normalTag = null;
      if (REPORTED_TAGS.has(rawTag)) {
        normalTag = rawTag;
      } else {
        const m = DATED_STREAM_TAG.exec(rawTag);
        if (m) normalTag = m[1];
      }
      if (!normalTag) continue;

      const existing = tagMap.get(normalTag);
      if (!existing || createdMs > existing.ms) {
        tagMap.set(normalTag, { ms: createdMs, publishedAt: createdAt });
      }
    }
  }

  return [...tagMap.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .map(([tag, info]) => {
      const days = ageDays(info.publishedAt, now);
      const { state, stateReason } = freshnessState(tag, days);
      return {
        tag,
        publishedAt: info.publishedAt,
        ageDays: days,
        state,
        stateReason,
      };
    });
}

/** Build one package entry from the raw API data. */
export function buildPackage(pkg, versions, now = Date.now()) {
  return {
    name: pkg.name,
    family: classifyFamily(pkg.name),
    streams: pickStreams(versions, now),
    versionCount: versions.length,
  };
}

/** Assemble the full payload written to disk. */
export function buildPayload(
  packages,
  { generatedAt, orgs, unavailable = false, stateReason = null } = {},
) {
  const familyCounts = {};
  for (const p of packages) {
    familyCounts[p.family] = (familyCounts[p.family] || 0) + 1;
  }
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    orgs: orgs ?? ORGS,
    packages,
    familyCounts,
    unavailable,
    stateReason,
  };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const cacheTtlHours = parseFloat(process.env.GHCR_CACHE_HOURS ?? "6");
  const force = process.argv.includes("--force");

  if (!force && existsSync(OUT)) {
    const age = Date.now() - statSync(OUT).mtimeMs;
    if (age < cacheTtlHours * 60 * 60 * 1000) {
      console.log(
        `fetch-ghcr-packages: cache fresh (${Math.round(age / 60000)}m old), skipping`,
      );
      return;
    }
  }

  const token = githubToken();
  if (!token) {
    console.warn(
      "fetch-ghcr-packages: no GITHUB_TOKEN/GH_TOKEN — writing unavailable payload",
    );
    const payload = buildPayload([], {
      generatedAt: new Date().toISOString(),
      orgs: ORGS,
      unavailable: true,
      stateReason:
        "GITHUB_TOKEN or GH_TOKEN with read:packages scope is required to list GHCR packages",
    });
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  const allPackages = [];

  for (const org of ORGS) {
    let pkgList;
    try {
      pkgList = await ghPaginate(
        `/orgs/${org}/packages?package_type=container`,
        { token, maxPages: 5 },
      );
    } catch (err) {
      console.warn(
        `fetch-ghcr-packages: ${org} package list unavailable — ${err.message}`,
      );
      continue;
    }

    for (const pkg of pkgList) {
      let versions = [];
      try {
        const encodedName = encodeURIComponent(pkg.name);
        versions = await ghPaginate(
          `/orgs/${org}/packages/container/${encodedName}/versions`,
          { token, maxPages: MAX_VERSION_PAGES },
        );
      } catch (err) {
        console.warn(
          `fetch-ghcr-packages: versions for ${pkg.name} unavailable — ${err.message}`,
        );
        allPackages.push({
          name: pkg.name,
          family: classifyFamily(pkg.name),
          streams: [],
          versionCount: 0,
          stateReason: `Versions unavailable: ${err.message}`,
        });
        continue;
      }

      allPackages.push(buildPackage(pkg, versions));
    }
  }

  const payload = buildPayload(allPackages, {
    generatedAt: new Date().toISOString(),
    orgs: ORGS,
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-ghcr-packages: wrote ${OUT} (${payload.packages.length} packages, families: ${JSON.stringify(payload.familyCounts)})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (err) {
    console.error(`fetch-ghcr-packages: ${err.message}`);
    const payload = buildPayload([], {
      generatedAt: new Date().toISOString(),
      orgs: ORGS,
      unavailable: true,
      stateReason: `GHCR package data could not be generated: ${err.message}`,
    });
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  }
}
