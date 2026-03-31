/**
 * fetch-github-sbom.js
 *
 * Fetches SBOM / attestation metadata for Bluefin image streams from GHCR
 * and writes the result to static/data/sbom-attestations.json.
 *
 * Runs only from .github/workflows/update-sbom-cache.yml — not part of the
 * shared fetch-data chain (pages.yml doesn't install cosign).
 *
 * Key design decisions:
 *  - Tag pattern: GHCR uses <stream>-<YYYYMMDD> (e.g. stable-20260331).
 *    We match with /[.-](\d{8})$/ and normalise lts.YYYYMMDD → lts-YYYYMMDD.
 *  - Auth: caller must export GITHUB_TOKEN (= PROJECT_READ_TOKEN in GHA) with
 *    cross-org packages:read scope.
 *  - NDJSON: cosign verify-attestation outputs one JSON object per line.
 *    We parse each line individually.
 *  - Pagination: GitHub Packages API is paginated; we fetch all pages.
 *  - Failure modes: present:false = no attestation published;
 *                   verified:false = attestation exists but verification failed.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "sbom-attestations.json",
);

// How many calendar days of releases to scan per stream.
const LOOKBACK_DAYS = Number(process.env.SBOM_LOOKBACK_DAYS || 90);

// Max releases per stream to record in output (most recent first).
const MAX_RELEASES = Number(process.env.SBOM_MAX_RELEASES || 10);

const FORCE_REFRESH = process.argv.includes("--force");

const SLSA_TYPE = "https://slsa.dev/provenance/v1";
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";

/**
 * Streams to scan.  keyRepo drives the OIDC identity regexp used by cosign.
 * package is the GHCR container package name under the org.
 */
const STREAM_SPECS = [
  {
    id: "bluefin-stable",
    label: "Bluefin Stable",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-gts",
    label: "Bluefin GTS",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "gts",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-latest",
    label: "Bluefin Latest",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-lts",
    label: "Bluefin LTS",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: true,
  },
  {
    id: "bluefin-dx-stable",
    label: "Bluefin DX Stable",
    org: "ublue-os",
    package: "bluefin-dx",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
];

// ---------------------------------------------------------------------------
// HTTP helpers (same pattern as fetch-github-images.js)
// ---------------------------------------------------------------------------

async function fetchText(url) {
  const headers = {
    "User-Agent": "BluefinDocsSBOM/1.0",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// GitHub Packages API — paginated tag listing
// ---------------------------------------------------------------------------

/**
 * Fetch all package versions (tags) for an org/package, handling pagination.
 * Returns an array of version objects from the GitHub Packages API.
 */
async function fetchAllPackageVersions(org, pkg) {
  const versions = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `https://api.github.com/orgs/${org}/packages/container/${pkg}/versions?per_page=100&page=${page}`;
    let batch;
    try {
      batch = await fetchJson(url);
    } catch (err) {
      console.warn(`  Packages API page ${page} failed: ${err.message}`);
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    versions.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return versions;
}

// ---------------------------------------------------------------------------
// Tag filtering helpers
// ---------------------------------------------------------------------------

/**
 * Extract the YYYYMMDD date from a GHCR tag.
 * Handles patterns:
 *   stable-20260331    → 20260331
 *   lts-20260331       → 20260331
 *   lts.20260331       → 20260331
 *   lts-hwe-testing-20260331 → 20260331
 */
function extractDateFromTag(tag) {
  const match = tag.match(/[.-](\d{8})$/);
  return match ? match[1] : null;
}

/**
 * Normalise an lts.YYYYMMDD tag to the lts-YYYYMMDD cache-key format.
 */
function normaliseLtsTag(tag) {
  return tag.replace(/^lts\.(\d{8})$/, "lts-$1");
}

/**
 * Build the stream-prefixed cache key used in FeedItems.tsx.
 * extractReleaseTag() in FeedItems produces: stable-YYYYMMDD, gts-YYYYMMDD,
 * lts-YYYYMMDD, etc.
 */
function buildCacheKey(streamPrefix, dateStr) {
  return `${streamPrefix}-${dateStr}`;
}

// ---------------------------------------------------------------------------
// cosign verification
// ---------------------------------------------------------------------------

/**
 * Attempt cosign verify-attestation for an image digest.
 * Returns { present, verified, predicateType, error }.
 *
 * present:false  → no attestation found for this image
 * verified:false → attestation found but signature check failed
 */
async function verifyAttestation(imageRef, spec) {
  const oidcIdentityRegexp = `^https://github.com/${spec.keyRepo}/.github/workflows/`;

  const args = [
    "verify-attestation",
    "--type",
    SLSA_TYPE,
    "--certificate-oidc-issuer",
    OIDC_ISSUER,
    "--certificate-identity-regexp",
    oidcIdentityRegexp,
    imageRef,
  ];

  let stdout = "";
  let stderr = "";
  try {
    const result = await execFileAsync("cosign", args, {
      env: { ...process.env },
      maxBuffer: 4 * 1024 * 1024,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err) {
    const msg = (err.stderr || err.message || "").toLowerCase();
    // cosign exits non-zero when no attestation exists
    if (
      msg.includes("no matching attestations") ||
      msg.includes("no attestations") ||
      msg.includes("not found")
    ) {
      return {
        present: false,
        verified: false,
        predicateType: null,
        error: "no attestation",
      };
    }
    return {
      present: true,
      verified: false,
      predicateType: null,
      error: String(err.stderr || err.message),
    };
  }

  // cosign outputs NDJSON (one JSON object per line)
  const lines = (stdout + stderr)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"));

  let predicateType = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      // Each NDJSON object has a payload field (base64-encoded)
      if (obj.payload) {
        const decoded = Buffer.from(obj.payload, "base64").toString("utf-8");
        const inner = JSON.parse(decoded);
        predicateType = inner?.predicateType || inner?.predicate_type || null;
        break;
      }
    } catch {
      // skip malformed lines
    }
  }

  return { present: true, verified: true, predicateType, error: null };
}

// ---------------------------------------------------------------------------
// Per-stream scanning
// ---------------------------------------------------------------------------

/**
 * Find recent dated tags for a given stream prefix.
 * Returns an array of { tag, cacheKey, dateStr, imageRef } objects,
 * most-recent first, limited to MAX_RELEASES within LOOKBACK_DAYS.
 */
function findRecentTagsForStream(allVersions, spec) {
  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const found = [];

  for (const version of allVersions) {
    const tags = version?.metadata?.container?.tags || [];
    const updatedAt = version.updated_at
      ? Date.parse(version.updated_at)
      : null;
    if (updatedAt !== null && updatedAt < cutoff) continue;

    for (const rawTag of tags) {
      const normalised = normaliseLtsTag(rawTag.toLowerCase());
      if (!normalised.startsWith(`${spec.streamPrefix}-`)) continue;
      const dateStr = extractDateFromTag(normalised);
      if (!dateStr) continue;

      found.push({
        tag: normalised,
        cacheKey: buildCacheKey(spec.streamPrefix, dateStr),
        dateStr,
        imageRef: `ghcr.io/${spec.org}/${spec.package}:${rawTag}`,
        digest: version.name || null,
      });
    }
  }

  // Deduplicate by cacheKey (keep first/most-recent encounter)
  const seen = new Set();
  const unique = [];
  for (const entry of found) {
    if (!seen.has(entry.cacheKey)) {
      seen.add(entry.cacheKey);
      unique.push(entry);
    }
  }

  // Sort descending by date string (YYYYMMDD sorts lexicographically)
  unique.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return unique.slice(0, MAX_RELEASES);
}

/**
 * Build the result object for a single stream.
 */
async function processStream(spec, allVersionsByPackage, existing) {
  const pkgKey = `${spec.org}/${spec.package}`;
  const allVersions = allVersionsByPackage.get(pkgKey) || [];
  const recentTags = findRecentTagsForStream(allVersions, spec);

  console.log(
    `  ${spec.id}: found ${recentTags.length} recent tagged releases`,
  );

  const releases = {};
  for (const { tag, cacheKey, imageRef, digest } of recentTags) {
    // Check if we already have a verified result in the existing cache
    const existingEntry = existing?.streams?.[spec.id]?.releases?.[cacheKey];
    if (!FORCE_REFRESH && existingEntry?.verified === true) {
      console.log(`    ${cacheKey}: cache hit (already verified)`);
      releases[cacheKey] = existingEntry;
      continue;
    }

    console.log(`    ${cacheKey}: verifying attestation for ${imageRef}`);
    const attestation = await verifyAttestation(imageRef, spec);

    releases[cacheKey] = {
      tag,
      imageRef,
      digest,
      attestation: {
        present: attestation.present,
        verified: attestation.verified,
        predicateType: attestation.predicateType,
        slsaType: SLSA_TYPE,
        error: attestation.error,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    id: spec.id,
    label: spec.label,
    org: spec.org,
    package: spec.package,
    streamPrefix: spec.streamPrefix,
    keyRepo: spec.keyRepo,
    keyless: spec.keyless,
    releases,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    console.warn(
      "Warning: GITHUB_TOKEN / GH_TOKEN not set. Packages API calls may be rate-limited.",
    );
  }

  // Load existing cache for incremental updates
  let existing = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    } catch {
      console.warn("Existing cache unreadable; starting fresh.");
    }
  }

  // Fetch package versions once per unique org/package pair (avoid duplicate API calls)
  const uniquePackages = new Map();
  for (const spec of STREAM_SPECS) {
    const key = `${spec.org}/${spec.package}`;
    if (!uniquePackages.has(key)) {
      uniquePackages.set(key, { org: spec.org, package: spec.package });
    }
  }

  console.log(
    `Fetching package versions for ${uniquePackages.size} package(s)...`,
  );
  const allVersionsByPackage = new Map();
  for (const [key, { org, pkg: pkgName }] of uniquePackages) {
    const pkg = pkgName || key.split("/")[1];
    console.log(`  ${key}`);
    try {
      const versions = await fetchAllPackageVersions(org, pkg);
      allVersionsByPackage.set(key, versions);
      console.log(`    ${versions.length} versions fetched`);
    } catch (err) {
      console.error(`  Failed to fetch versions for ${key}: ${err.message}`);
      allVersionsByPackage.set(key, []);
    }
  }

  // Process each stream
  const streams = {};
  for (const spec of STREAM_SPECS) {
    console.log(`\nProcessing stream: ${spec.id}`);
    try {
      const result = await processStream(spec, allVersionsByPackage, existing);
      streams[spec.id] = result;
    } catch (err) {
      console.error(`  Error processing ${spec.id}: ${err.message}`);
      // Preserve existing data for this stream on error
      if (existing?.streams?.[spec.id]) {
        streams[spec.id] = existing.streams[spec.id];
        console.log(`  Kept existing cache for ${spec.id}`);
      }
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    maxReleasesPerStream: MAX_RELEASES,
    streams,
  };

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nSBOM attestation cache written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
