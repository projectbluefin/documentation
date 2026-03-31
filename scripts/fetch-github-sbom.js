/**
 * fetch-github-sbom.js
 *
 * Fetches SBOM / attestation metadata for Bluefin image streams from GHCR
 * and writes the result to static/data/sbom-attestations.json.
 *
 * Runs only from .github/workflows/update-sbom-cache.yml — not part of the
 * shared fetch-data chain (pages.yml doesn't install cosign/oras).
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
 *  - SBOM download: uses `oras discover` to find the vnd.spdx+json referrer
 *    digest, then `oras pull` to download sbom.json into a temp directory.
 *    The Syft JSON is parsed for RPM artifacts to extract packageVersions.
 *  - SBOM cache: keyed by image digest — if the digest hasn't changed AND
 *    packageVersions is non-null, the existing cache entry is reused.
 *  - NVIDIA: intentionally absent from SBOM (akmod, built outside the image).
 *    Consumers fall back to releases/feeds for NVIDIA versions.
 *  - Atomic write: output is written to a temp file then renamed to avoid
 *    leaving a truncated JSON file if the process is interrupted.
 */

"use strict";

const fs = require("fs");
const os = require("os");
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
 *
 * All streams use OIDC keyless signing (keyless: true).
 * bluefin-lts historically used key-based signing but is treated identically
 * here — it will be migrated to OIDC keyless signing upstream.
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
 * Normalise an lts.YYYYMMDD tag (and any suffix) to lts-YYYYMMDD format.
 * Handles: lts.20260331 → lts-20260331
 *          lts.20260331-hwe → lts-20260331-hwe
 */
function normaliseLtsTag(tag) {
  return tag.replace(/^lts\.(\d{8})(.*)?$/, "lts-$1$2");
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
// SBOM download via oras
// ---------------------------------------------------------------------------

/**
 * Download the Syft SBOM for an image from GHCR via oras.
 *
 * Steps:
 *   1. oras discover --format json <imageRef>@<digest>
 *      → find referrer with artifactType == "application/vnd.spdx+json"
 *   2. oras pull <imageRef>@<sbomDigest> --output <tmpdir>
 *   3. Return path to the pulled sbom.json
 *
 * Returns null on any error (caller treats packageVersions as null).
 */
async function downloadSbom(imageRef, digest) {
  if (!digest) {
    console.warn("    downloadSbom: no digest available, skipping");
    return null;
  }

  const ref = `${imageRef.replace(/:.*$/, "")}@${digest}`;
  let tmpDir = null;

  try {
    // Step 1: discover referrers
    const discoverResult = await execFileAsync(
      "oras",
      ["discover", "--format", "json", ref],
      {
        env: { ...process.env },
        maxBuffer: 4 * 1024 * 1024,
        timeout: 60000,
      },
    );

    let referrers = [];
    try {
      const discovered = JSON.parse(discoverResult.stdout);
      // oras discover --format json returns { manifests: [...] }
      referrers = discovered?.manifests || discovered?.referrers || [];
    } catch {
      console.warn("    downloadSbom: failed to parse oras discover output");
      return null;
    }

    const sbomReferrer = referrers.find(
      (r) =>
        r?.artifactType === "application/vnd.spdx+json" ||
        r?.mediaType === "application/vnd.spdx+json",
    );

    if (!sbomReferrer) {
      console.warn(`    downloadSbom: no SPDX referrer found for ${digest}`);
      return null;
    }

    const sbomDigest = sbomReferrer.digest;
    if (!sbomDigest) {
      console.warn("    downloadSbom: referrer has no digest");
      return null;
    }

    // Step 2: pull SBOM into temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bluefin-sbom-"));
    const sbomRef = `${imageRef.replace(/:.*$/, "")}@${sbomDigest}`;

    await execFileAsync("oras", ["pull", sbomRef, "--output", tmpDir], {
      env: { ...process.env },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120000,
    });

    // SBOM file may be named sbom.json or spdx.json
    const candidates = ["sbom.json", "spdx.json"];
    for (const candidate of candidates) {
      const candidate_path = path.join(tmpDir, candidate);
      if (fs.existsSync(candidate_path)) {
        return candidate_path;
      }
    }

    // Fallback: find first .json file in tmpdir
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".json"));
    if (files.length > 0) {
      return path.join(tmpDir, files[0]);
    }

    console.warn("    downloadSbom: no JSON file found after oras pull");
    return null;
  } catch (err) {
    console.warn(`    downloadSbom: error — ${err.message}`);
    return null;
  }
  // Note: tmpDir cleanup happens in the caller (extractPackageVersions wrapper)
}

/**
 * Compare two RPM-style version strings numerically by segment.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Example: "6.18.2-200.fc43" vs "6.18.13-200.fc43" → "6.18.2" < "6.18.13"
 */
function compareRpmVersions(a, b) {
  // Split on non-alphanumeric boundaries, compare each segment numerically if possible
  const segA = a.split(/[.\-~]/).filter(Boolean);
  const segB = b.split(/[.\-~]/).filter(Boolean);
  const len = Math.max(segA.length, segB.length);
  for (let i = 0; i < len; i++) {
    const sa = segA[i] || "0";
    const sb = segB[i] || "0";
    const na = parseInt(sa, 10);
    const nb = parseInt(sb, 10);
    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb;
    } else {
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * Strip RPM epoch prefix ("1:") from a version string.
 * "1:25.3.6-6.fc43" → "25.3.6-6.fc43"
 */
function stripEpoch(version) {
  if (!version) return version;
  return version.replace(/^\d+:/, "");
}

/**
 * Extract package versions from a Syft SBOM JSON file.
 * Returns a PackageVersions object or null on parse failure.
 *
 * Package mapping:
 *   kernel   → name == "kernel", pick lowest semver (booted kernel, not the newer alongside)
 *   gnome    → name == "gnome-shell"
 *   mesa     → name == "mesa-filesystem", strip epoch prefix
 *   podman   → name == "podman"
 *   systemd  → name == "systemd"
 *   bootc    → name == "bootc"
 *   fedora   → name == "fedora-release-common", extract leading digits → "F" + digits
 */
function extractPackageVersions(sbomPath) {
  if (!sbomPath) return null;

  let sbom;
  try {
    const raw = fs.readFileSync(sbomPath, "utf-8");
    sbom = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `    extractPackageVersions: failed to parse SBOM — ${err.message}`,
    );
    return null;
  }

  const artifacts = sbom?.artifacts;
  if (!Array.isArray(artifacts)) {
    console.warn("    extractPackageVersions: no artifacts array in SBOM");
    return null;
  }

  // Only RPM artifacts
  const rpms = artifacts.filter((a) => a?.type === "rpm");

  const result = {
    kernel: null,
    gnome: null,
    mesa: null,
    podman: null,
    systemd: null,
    bootc: null,
    fedora: null,
  };

  // Collect all kernel versions to pick the lowest (booted kernel)
  const kernelVersions = [];

  for (const pkg of rpms) {
    const name = pkg?.name;
    const version = pkg?.version;
    if (!name || !version) continue;

    switch (name) {
      case "kernel":
        kernelVersions.push(String(version));
        break;
      case "gnome-shell":
        if (!result.gnome) result.gnome = String(version);
        break;
      case "mesa-filesystem":
        if (!result.mesa) result.mesa = stripEpoch(String(version));
        break;
      case "podman":
        if (!result.podman) result.podman = String(version);
        break;
      case "systemd":
        if (!result.systemd) result.systemd = String(version);
        break;
      case "bootc":
        if (!result.bootc) result.bootc = String(version);
        break;
      case "fedora-release-common": {
        if (!result.fedora) {
          // Strip any epoch prefix, then extract leading integer
          const stripped = stripEpoch(String(version));
          const fedoraMatch = stripped.match(/^(\d+)/);
          if (fedoraMatch) {
            result.fedora = `F${fedoraMatch[1]}`;
          }
        }
        break;
      }
    }
  }

  // Pick the lowest kernel version (the booted kernel, not a newer pending update)
  if (kernelVersions.length === 0) {
    console.warn("    extractPackageVersions: no kernel RPM found in SBOM");
  } else {
    if (kernelVersions.length > 1) {
      console.log(
        `    extractPackageVersions: found ${kernelVersions.length} kernel versions, picking lowest`,
      );
    }
    kernelVersions.sort(compareRpmVersions);
    result.kernel = kernelVersions[0];
  }

  return result;
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
    // Cache hit: reuse if digest matches AND packageVersions is already populated.
    // If packageVersions is null (e.g. SBOM download previously failed), retry.
    const existingEntry = existing?.streams?.[spec.id]?.releases?.[cacheKey];
    const digestMatches = existingEntry?.digest === digest;
    const hasVersions = existingEntry?.packageVersions != null;
    const isVerified = existingEntry?.attestation?.verified === true;

    if (!FORCE_REFRESH && digestMatches && isVerified && hasVersions) {
      console.log(
        `    ${cacheKey}: cache hit (digest match, verified, versions populated)`,
      );
      releases[cacheKey] = existingEntry;
      continue;
    }

    // Partial cache hit: attestation already verified but SBOM not yet downloaded
    let attestation;
    if (!FORCE_REFRESH && digestMatches && isVerified && !hasVersions) {
      console.log(
        `    ${cacheKey}: attestation cached, fetching SBOM packageVersions`,
      );
      attestation = existingEntry.attestation;
    } else {
      console.log(`    ${cacheKey}: verifying attestation for ${imageRef}`);
      attestation = await verifyAttestation(imageRef, spec);
      attestation = {
        present: attestation.present,
        verified: attestation.verified,
        predicateType: attestation.predicateType,
        slsaType: SLSA_TYPE,
        error: attestation.error,
      };
    }

    // Download and parse SBOM to extract packageVersions
    let packageVersions = null;
    let sbomPath = null;
    let tmpDir = null;
    try {
      sbomPath = await downloadSbom(imageRef, digest);
      if (sbomPath) {
        tmpDir = path.dirname(sbomPath);
        packageVersions = extractPackageVersions(sbomPath);
        if (packageVersions) {
          console.log(
            `    ${cacheKey}: extracted packageVersions (kernel: ${packageVersions.kernel})`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `    ${cacheKey}: SBOM download/parse error — ${err.message}`,
      );
    } finally {
      // Clean up temp directory
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }

    releases[cacheKey] = {
      tag,
      imageRef,
      digest,
      attestation,
      packageVersions,
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
  for (const [key, { org, package: pkgName }] of uniquePackages) {
    console.log(`  ${key}`);
    try {
      const versions = await fetchAllPackageVersions(org, pkgName);
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

  // Atomic write: write to temp file then rename to avoid truncated JSON on interrupt
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const tmpFile = OUTPUT_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(output, null, 2), "utf-8");
  fs.renameSync(tmpFile, OUTPUT_FILE);
  console.log(`\nSBOM attestation cache written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
