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
 *  - Auth: no PAT required. Tag enumeration uses the GitHub Releases API with
 *    the standard github.token (no cross-org scope needed). For GHCR access,
 *    we attempt `oras login ghcr.io` with GITHUB_TOKEN/GH_TOKEN when available.
 *    Public images may also work anonymously.
 *  - NDJSON: cosign verify-attestation outputs one JSON object per line.
 *    We parse each line individually.
 *  - Pagination: GitHub Releases API is paginated; we fetch all pages.
 *  - Failure modes: present:false = no attestation published;
 *                   verified:false = attestation exists but verification failed.
 *  - lts/gdx streams: keyless:false (key-based signing, not OIDC keyless).
 *    verifyAttestation() uses OIDC keyless → attestation.present:false is expected.
 *    LTS SBOMs ARE published (spdx-json format via oras attach from reusable-build-image.yml).
 *    downloadSbom() uses ORAS directly and works regardless of signing method.
 *    extractPackageVersions() handles both Syft JSON and SPDX JSON formats.
 *    Cache hit for lts/gdx uses packageVersions presence (not attestation.verified).
 *  - SBOM download: uses `oras discover` on the image tag to find the
 *    vnd.spdx+json referrer digest, then `oras pull` to download sbom.json
 *    into a temp directory.
 *    Both Syft JSON (artifacts[]) and SPDX JSON (packages[]) formats are
 *    parsed for RPM artifacts to extract packageVersions.
 *  - SBOM cache: keyed by image digest — if the digest hasn't changed AND
 *    packageVersions is non-null, the existing cache entry is reused.
 *  - NVIDIA: intentionally absent from SBOM (akmod, built outside the image).
 *    Consumers fall back to releases/feeds for NVIDIA versions.
 *  - Atomic write: output is written to a temp file then renamed to avoid
 *    leaving a truncated JSON file if the process is interrupted.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Module imports
// ---------------------------------------------------------------------------

const {
  SLSA_TYPE,
  orasLogin,
  verifyAttestation,
  downloadSbom,
  fetchGhcrTags,
  selectAmd64DigestFromManifest,
  getImageCreatedDate,
} = require("./lib/sbom/api");

const {
  extractPackageVersions,
  findRecentTagsForStream,
  stripEpoch,
  compareRpmVersions,
} = require("./lib/sbom/parser");

const { extractBstPackageVersions, isSemverLike } = require("./lib/sbom/bst");
const { buildSlimFrontendStreams } = require("./lib/sbom/slim");
const { atomicWriteJson } = require("./lib/sbom/writer");

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

/**
 * Frontend-facing slim copy of the SBOM cache.
 * Identical structure but with `allPackages` stripped from every release —
 * keeping only `packageVersions` and `attestation`. This prevents the full
 * RPM inventory (hundreds of entries per release) from bloating the JS bundle.
 */
const FRONTEND_OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "sbom-attestations-frontend.json",
);

// How many calendar days of releases to scan per stream.
const LOOKBACK_DAYS = Number(process.env.SBOM_LOOKBACK_DAYS || 90);

// Max releases per stream to record in output (most recent first).
const MAX_RELEASES = Number(process.env.SBOM_MAX_RELEASES || 10);

const FORCE_REFRESH = process.argv.includes("--force");

/**
 * Streams to scan.  keyRepo drives the OIDC identity regexp used by cosign.
 * package is the GHCR container package name under the org.
 * releasesRepo is the GitHub repo used for tag enumeration via Releases API.
 *
 * keyless:true  → OIDC keyless signing (stable/latest/beta mainline streams)
 * keyless:false → key-based signing; cosignKeyUrl required (lts/gdx streams).
 *                 These streams have no SBOMs yet — present:false is expected.
 *                 When lts SBOMs are published, no code changes are needed.
 *
 * GTS is retired and absent from this list.
 */
const COSIGN_KEY_LTS =
  "https://raw.githubusercontent.com/ublue-os/bluefin-lts/main/cosign.pub";

const STREAM_SPECS = [
  {
    id: "bluefin-stable",
    label: "Bluefin Stable",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-stable-daily",
    label: "Bluefin Stable Daily",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "stable-daily",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-latest",
    label: "Bluefin Latest",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-lts",
    label: "Bluefin LTS",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-lts-hwe",
    label: "Bluefin LTS HWE",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-hwe",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-lts-hwe-testing",
    label: "Bluefin LTS HWE Testing",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-hwe-testing",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-lts-hwe-testing-50",
    label: "Bluefin LTS HWE Testing 50",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-hwe-testing-50",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-lts-testing-50",
    label: "Bluefin LTS Testing 50",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-testing-50",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-dx-stable",
    label: "Bluefin DX Stable",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-dx-latest",
    label: "Bluefin DX Latest",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-dx-lts",
    label: "Bluefin DX LTS",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-dx-lts-hwe-testing",
    label: "Bluefin DX LTS HWE Testing",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-hwe-testing",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-dx-lts-hwe-testing-50",
    label: "Bluefin DX LTS HWE Testing 50",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-hwe-testing-50",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-dx-lts-testing-50",
    label: "Bluefin DX LTS Testing 50",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts-testing-50",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-gdx-lts",
    label: "Bluefin GDX LTS",
    org: "ublue-os",
    package: "bluefin-gdx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-gdx-latest",
    label: "Bluefin GDX Latest",
    org: "ublue-os",
    package: "bluefin-gdx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "dakota-latest",
    label: "Dakota Latest",
    org: "projectbluefin",
    package: "dakota",
    // No releasesRepo: Dakota does not publish GitHub releases.
    // No streamPrefix: uses the :latest floating tag, not date-based tags.
    // usesLatestTag: true triggers a dedicated path in processStream() that
    // bypasses findRecentTagsForStream() and works directly with :latest.
    keyRepo: "projectbluefin/dakota",
    keyless: true,
    usesLatestTag: true,
    // Dakota's publish.yml uses `cosign sign` (keyless OIDC) without push-to-registry: true
    // on the SLSA attestation step, so the attestation is only in GitHub's internal store
    // and not discoverable as an OCI referrer via cosign verify-attestation.
    // TODO: Remove signingType once projectbluefin/dakota#391 (push-to-registry: true) merges;
    //       then switch to standard keyless: true SLSA path (remove this signingType entirely).
    signingType: "cosign-sign",
  },
];

// ---------------------------------------------------------------------------
// Latest-tag stream processing (Dakota)
// ---------------------------------------------------------------------------

/**
 * Process a stream that uses a :latest floating tag instead of date-based tags.
 * Used for Dakota, which pushes :latest on every scheduled/dispatch build but
 * does not create YYYYMMDD-suffixed release tags.
 *
 * Cache key is derived from the image creation date annotation:
 *   "latest-YYYYMMDD"  (e.g. "latest-20260502")
 * Falls back to "latest-unknown" if the annotation is absent.
 *
 * @param {object}      spec      Stream spec with usesLatestTag: true
 * @param {object|null} existing  Existing SBOM cache for incremental updates
 */
async function processLatestTagStream(spec, existing) {
  const imageRef = `ghcr.io/${spec.org}/${spec.package}:latest`;
  console.log(`  ${spec.id}: processing :latest tag (${imageRef})`);

  const dateStr = await getImageCreatedDate(imageRef);
  const cacheKey = dateStr ? `latest-${dateStr}` : "latest-unknown";
  console.log(`  ${spec.id}: cache key = ${cacheKey}`);

  const existingEntry = existing?.streams?.[spec.id]?.releases?.[cacheKey];
  const hasVersions = existingEntry?.packageVersions != null;
  const hasAllPackages =
    existingEntry?.packageVersions?.allPackages != null &&
    Object.keys(existingEntry.packageVersions.allPackages).length > 0;
  const isVerified = existingEntry?.attestation?.verified === true;
  const isCacheHit =
    !FORCE_REFRESH && hasVersions && hasAllPackages && isVerified;

  const releases = {};

  if (isCacheHit) {
    console.log(`  ${spec.id}: cache hit (verified, versions populated)`);
    releases[cacheKey] = existingEntry;
  } else {
    console.log(`  ${spec.id}: verifying attestation for ${imageRef}`);
    const rawAttestation = await verifyAttestation(imageRef, spec);
    const attestation = {
      present: rawAttestation.present,
      verified: rawAttestation.verified,
      predicateType: rawAttestation.predicateType,
      slsaType: SLSA_TYPE,
      ...(rawAttestation.errorKind !== undefined && {
        errorKind: rawAttestation.errorKind,
      }),
      error: rawAttestation.error,
    };

    let packageVersions = null;
    let sbomPath = null;
    let tmpDir = null;
    try {
      sbomPath = await downloadSbom(imageRef);
      if (sbomPath) {
        tmpDir = path.dirname(sbomPath);
        packageVersions = extractPackageVersions(sbomPath);
        if (packageVersions) {
          console.log(
            `    ${cacheKey}: extracted packageVersions ` +
              `(gnome: ${packageVersions.gnome}, kernel: ${packageVersions.kernel})`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `    ${cacheKey}: SBOM download/parse error — ${err.message}`,
      );
    } finally {
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }

    releases[cacheKey] = {
      tag: "latest",
      imageRef,
      digest: null,
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
    streamPrefix: "latest",
    keyRepo: spec.keyRepo,
    keyless: spec.keyless,
    releases,
  };
}

// ---------------------------------------------------------------------------
// Per-stream scanning
// ---------------------------------------------------------------------------

/**
 * Build the result object for a single stream.
 *
 * @param {object} spec  Stream spec from STREAM_SPECS.
 * @param {Map<string, string[]>} ghcrTagsByImage
 *   Pre-fetched GHCR tag strings keyed by "org/package".
 * @param {object|null} existing  Existing cache for incremental updates.
 */
async function processStream(spec, ghcrTagsByImage, existing) {
  // Dakota uses a :latest floating tag instead of date-based release tags.
  if (spec.usesLatestTag) {
    return processLatestTagStream(spec, existing);
  }

  const imageKey = `${spec.org}/${spec.package}`;
  // If the GHCR tag fetch failed — preserve existing cache.
  if (!ghcrTagsByImage.has(imageKey)) {
    if (existing?.streams?.[spec.id]) {
      console.log(
        `  ${spec.id}: GHCR tags unavailable — keeping existing cache`,
      );
      return existing.streams[spec.id];
    }
    // No existing cache to fall back to; return empty stream.
    return { id: spec.id, label: spec.label, org: spec.org, package: spec.package, streamPrefix: spec.streamPrefix, keyRepo: spec.keyRepo, keyless: spec.keyless, releases: {} };
  }
  const ghcrTags = ghcrTagsByImage.get(imageKey);
  const recentTags = findRecentTagsForStream(ghcrTags, spec);

  console.log(
    `  ${spec.id}: found ${recentTags.length} recent tagged releases`,
  );

  const releases = {};
  for (const { tag, cacheKey, imageRef } of recentTags) {
    // Cache hit: reuse if digest matches AND packageVersions is already populated.
    const existingEntry = existing?.streams?.[spec.id]?.releases?.[cacheKey];
    const hasVersions = existingEntry?.packageVersions != null;
    const hasAllPackages =
      existingEntry?.packageVersions?.allPackages != null &&
      Object.keys(existingEntry.packageVersions.allPackages).length > 0;
    const isVerified = existingEntry?.attestation?.verified === true;

    const isCacheHit = !FORCE_REFRESH && hasVersions && hasAllPackages &&
      (spec.keyless ? isVerified : true);

    if (isCacheHit) {
      console.log(
        `    ${cacheKey}: cache hit (${spec.keyless ? "verified, " : ""}versions populated)`,
      );
      releases[cacheKey] = existingEntry;
      continue;
    }

    // Partial cache hit: attestation already verified (keyless) but SBOM not yet downloaded.
    let attestation;
    if (!FORCE_REFRESH && isVerified && (!hasVersions || (hasVersions && !hasAllPackages))) {
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
        ...(attestation.errorKind !== undefined && {
          errorKind: attestation.errorKind,
        }),
        error: attestation.error,
      };
    }

    // Download and parse SBOM to extract packageVersions
    let packageVersions = null;
    let sbomPath = null;
    let tmpDir = null;
    try {
      sbomPath = await downloadSbom(imageRef);
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
      digest: existingEntry?.digest || null,
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
      "Warning: GITHUB_TOKEN / GH_TOKEN not set. GitHub API calls may be rate-limited.",
    );
  }
  await orasLogin();

  // Load existing cache for incremental updates
  let existing = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    } catch {
      console.warn("Existing cache unreadable; starting fresh.");
    }
  }

  // Deduplicate by GHCR image — multiple streams share the same image
  const uniqueImages = new Set(STREAM_SPECS.map((s) => `${s.org}/${s.package}`));

  console.log(
    `Fetching GHCR tags for ${uniqueImages.size} image(s)...`,
  );
  const ghcrTagsByImage = new Map();
  for (const imageKey of uniqueImages) {
    const [org, pkg] = imageKey.split("/");
    console.log(`  ghcr.io/${imageKey}`);
    try {
      const tags = await fetchGhcrTags(org, pkg);
      ghcrTagsByImage.set(imageKey, tags);
      console.log(`    ${tags.length} GHCR tags fetched`);
    } catch (err) {
      console.error(`  Failed to fetch GHCR tags for ${imageKey}: ${err.message}`);
    }
  }

  // Process each stream
  const streams = {};
  for (const spec of STREAM_SPECS) {
    console.log(`\nProcessing stream: ${spec.id}`);
    try {
      const result = await processStream(spec, ghcrTagsByImage, existing);
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

  // Empty-cache guard
  const totalReleases = Object.values(streams).reduce(
    (sum, s) => sum + Object.keys(s?.releases || {}).length,
    0,
  );
  if (totalReleases === 0) {
    console.error(
      "Error: all streams produced zero releases. " +
      "This indicates a Releases API failure. " +
      "Refusing to overwrite cache with empty data.",
    );
    process.exit(1);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    maxReleasesPerStream: MAX_RELEASES,
    streams,
  };

  // Write full SBOM cache
  atomicWriteJson(OUTPUT_FILE, output);
  console.log(`\nSBOM attestation cache written to ${OUTPUT_FILE}`);

  // Write slim frontend copy — strips allPackages from every release
  const frontendStreams = buildSlimFrontendStreams(streams);
  const frontendOutput = { ...output, streams: frontendStreams };
  atomicWriteJson(FRONTEND_OUTPUT_FILE, frontendOutput);
  console.log(`SBOM frontend slim cache written to ${FRONTEND_OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  stripEpoch,
  compareRpmVersions,
  extractPackageVersions,
  extractBstPackageVersions,
  isSemverLike,
  selectAmd64DigestFromManifest,
  findRecentTagsForStream,
  fetchGhcrTags,   // exported for integration testing
};
