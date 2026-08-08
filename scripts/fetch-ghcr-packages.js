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
import { execFile } from "child_process";
import { promisify } from "util";
import { githubToken, ghFetch, ghPaginate, ageDays } from "./lib/gh.js";

const execFileAsync = promisify(execFile);

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

/**
 * Lanes queried anonymously from the public GHCR registry when the GitHub
 * Packages API is unavailable.
 *
 * The Packages API needs a token carrying `read:packages`, and CI's default
 * `github.token` is repository-scoped, so listing an organisation's packages
 * fails there. The images themselves are public, so the registry answers
 * anonymously — which is the more original source anyway. This list is the
 * lanes the Images and Userspace views actually report on; the API path, when
 * it works, still discovers everything.
 */
export const FALLBACK_LANES = [
  "bluefin",
  "bluefin-lts",
  "bluefin-lts-hwe",
  "bluefin-nvidia",
  "bluefin-lts-hwe-nvidia",
  "dakota",
  "dakota-nvidia",
  "bluefin-toolbox",
  "ubuntu-toolbox",
  "base",
  "static",
  "skopeo",
  "buildah",
  "qemu-img",
  "lab-runner",
  "brew",
  "common",
  "testsuite",
];

/** Tags worth an inspect call. Everything else is noise or a cosign artefact. */
export function fallbackTagsOf(tags) {
  const wanted = [];
  for (const tag of tags) {
    if (COSIGN_TAG.test(tag)) continue;
    if (REPORTED_TAGS.has(tag)) wanted.push(tag);
  }
  return wanted;
}

/**
 * Reads one lane from the public registry with skopeo, which is already a
 * build dependency of scripts/fetch-github-images.js.
 *
 * Returns version-shaped records so buildPackage can consume them unchanged.
 */
async function registryVersions(org, name) {
  const ref = `docker://ghcr.io/${org}/${name}`;
  let tags;
  try {
    const { stdout } = await execFileAsync("skopeo", ["list-tags", ref], {
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    });
    tags = JSON.parse(stdout).Tags ?? [];
  } catch {
    return null;
  }

  const versions = [];
  for (const tag of fallbackTagsOf(tags)) {
    try {
      const { stdout } = await execFileAsync(
        "skopeo",
        ["inspect", "--no-tags", `${ref}:${tag}`],
        { timeout: 60_000, maxBuffer: 32 * 1024 * 1024 },
      );
      const info = JSON.parse(stdout);
      if (!info.Created) continue;
      versions.push({
        name: info.Digest,
        created_at: info.Created,
        metadata: { container: { tags: [tag] } },
      });
    } catch {
      // A tag that cannot be inspected is a gap, not a failure of the lane.
    }
  }
  return versions;
}

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
  const allPackages = [];

  for (const org of token ? ORGS : []) {
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

  // Fall back to the public registry when the Packages API produced nothing.
  // CI's default github.token is repository-scoped, so listing an org's
  // packages fails there — but the images are public, so skopeo answers
  // anonymously. Without this the Images and Userspace views would be empty in
  // production while looking fine locally.
  let source = "github-packages-api";
  if (allPackages.length === 0) {
    source = "public-registry";
    console.warn(
      "fetch-ghcr-packages: Packages API returned nothing — falling back to " +
        "anonymous registry reads for the reported lanes",
    );
    for (const org of ORGS) {
      for (const name of FALLBACK_LANES) {
        const versions = await registryVersions(org, name);
        if (versions === null) continue;
        allPackages.push(buildPackage({ name }, versions));
      }
    }
  }

  const payload = buildPayload(allPackages, {
    generatedAt: new Date().toISOString(),
    orgs: ORGS,
    unavailable: allPackages.length === 0,
    stateReason:
      allPackages.length === 0
        ? "Neither the GitHub Packages API nor anonymous registry reads returned any lane."
        : null,
  });
  payload.source = source;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `fetch-ghcr-packages: wrote ${OUT} (${payload.packages.length} packages via ${source}, families: ${JSON.stringify(payload.familyCounts)})`,
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
