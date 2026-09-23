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
 *  - lts streams: keyless:false (key-based signing, not OIDC keyless).
 *    verifyAttestation() uses OIDC keyless → attestation.present:false is expected.
 *    LTS SBOMs ARE published (spdx-json format via oras attach from reusable-build-image.yml).
 *    downloadSbom() uses ORAS directly and works regardless of signing method.
 *    extractPackageVersions() handles both Syft JSON and SPDX JSON formats.
 *    Cache hit for lts uses packageVersions presence (not attestation.verified).
 *  - SBOM download: uses `oras discover` on the image tag to find the
 *    vnd.spdx+json referrer digest, then `oras pull` to download sbom.json
 *    into a temp directory.
 *    Both Syft JSON (artifacts[]) and SPDX JSON (packages[]) formats are
 *    parsed for RPM artifacts to extract packageVersions.
 *  - SBOM cache: keyed by image digest — if the digest hasn't changed AND
 *    packageVersions is non-null, the existing cache entry is reused.
 *  - NVIDIA: present in LTS NVIDIA (bluefin-lts-nvidia) SBOM as nvidia-driver RPM.
 *    Absent from base bluefin-stable/lts SBOMs (akmod, built separately).
 *    fetch-github-driver-versions.js uses null for nvidia on stable/lts streams.
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
const { requireTrustForRepo } = require("./lib/signing-trust");

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

const RELEASE_LIST_FILE = path.join(
  path.dirname(OUTPUT_FILE),
  "release-list.json",
);

// How many calendar days of releases to scan per stream.
const LOOKBACK_DAYS = Number(process.env.SBOM_LOOKBACK_DAYS || 90);

// Max releases per stream to record in output (most recent first).
const MAX_RELEASES = Number(process.env.SBOM_MAX_RELEASES || 10);

const FORCE_REFRESH = process.argv.includes("--force");

const EMPTY_RELEASES_REASON =
  "GitHub SBOM data unavailable: all configured streams produced zero releases.";
const PRIMARY_RELEASE_STREAM_IDS = ["bluefin-stable", "bluefin-lts"];
const PARTIAL_RELEASES_REASON =
  "GitHub SBOM data unavailable: primary streams produced no releases.";

/**
 * package is the GHCR container package name under the org. keyRepo selects
 * the repository's signing trust policy. Dated tags are enumerated from GHCR;
 * floating channels use their image creation date as a per-stream cache key.
 */
const RAW_STREAM_SPECS = [
  {
    id: "bluefin-stable",
    label: "Bluefin Stable",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
  },
  {
    id: "bluefin-stable-daily",
    label: "Bluefin Stable Daily",
    org: "ublue-os",
    package: "bluefin",
    streamPrefix: "stable-daily",
    keyRepo: "ublue-os/bluefin",
  },
  {
    id: "bluefin-latest",
    label: "Bluefin Latest",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
  },
  {
    id: "bluefin-lts",
    label: "Bluefin LTS",
    org: "projectbluefin",
    package: "bluefin-lts",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable",
    floatingTag: "stable",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-lts-hwe",
    label: "Bluefin LTS HWE",
    org: "projectbluefin",
    package: "bluefin-lts",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable-hwe",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-lts-hwe-testing",
    label: "Bluefin LTS HWE Testing",
    org: "projectbluefin",
    package: "bluefin-lts",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable-hwe-testing",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-lts-hwe-testing-50",
    label: "Bluefin LTS HWE Testing 50",
    org: "projectbluefin",
    package: "bluefin-lts",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable-hwe-testing-50",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-lts-testing-50",
    label: "Bluefin LTS Testing 50",
    org: "projectbluefin",
    package: "bluefin-lts",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable-testing-50",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-lts-nvidia",
    label: "Bluefin LTS NVIDIA",
    org: "projectbluefin",
    package: "bluefin-lts-nvidia",
    releasesRepo: "projectbluefin/bluefin-lts",
    streamPrefix: "stable",
    floatingTag: "stable",
    keyRepo: "projectbluefin/bluefin-lts",
  },
  {
    id: "bluefin-nvidia-open-stable",
    label: "Bluefin Nvidia Open Stable",
    org: "ublue-os",
    package: "bluefin-nvidia-open",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
  },
  {
    id: "utah-testing",
    label: "Utah Testing",
    org: "projectbluefin",
    package: "utah",
    releasesRepo: "projectbluefin/utah",
    streamPrefix: "testing",
    floatingTag: "testing",
    keyRepo: "projectbluefin/utah",
  },
  {
    id: "utah-nvidia-testing",
    label: "Utah Nvidia Testing",
    org: "projectbluefin",
    package: "utah-nvidia",
    releasesRepo: "projectbluefin/utah",
    streamPrefix: "testing",
    floatingTag: "testing",
    keyRepo: "projectbluefin/utah",
  },
  {
    id: "dakota-stable",
    label: "Dakota Stable",
    org: "projectbluefin",
    package: "dakota",
    keyRepo: "projectbluefin/dakota",
    floatingTag: "stable",
  },
  {
    id: "dakota-testing",
    label: "Dakota Testing",
    org: "projectbluefin",
    package: "dakota",
    keyRepo: "projectbluefin/dakota",
    floatingTag: "testing",
  },
  {
    id: "dakota-nvidia-stable",
    label: "Dakota Nvidia Stable",
    org: "projectbluefin",
    package: "dakota-nvidia",
    keyRepo: "projectbluefin/dakota",
    floatingTag: "stable",
  },
  {
    id: "dakota-nvidia-testing",
    label: "Dakota Nvidia Testing",
    org: "projectbluefin",
    package: "dakota-nvidia",
    keyRepo: "projectbluefin/dakota",
    floatingTag: "testing",
  },
];

// Trust policy is not restated per stream: it is derived from keyRepo via the
// shared table, so a signing-model change lands in exactly one place. An
// undeclared signing repo is fatal at load time rather than silently keyless.
const STREAM_SPECS = RAW_STREAM_SPECS.map((spec) => {
  const trust = requireTrustForRepo(
    spec.keyRepo,
    `STREAM_SPECS entry "${spec.id}"`,
  );
  return {
    ...spec,
    keyless: trust.keyless,
    cosignKeyUrl: trust.cosignKeyUrl,
    attestationLive: trust.attestationLive,
  };
});

function currentCachedStream(existing, spec) {
  const stream = existing?.streams?.[spec.id];
  return (
    stream?.org === spec.org &&
    stream?.package === spec.package &&
    stream?.keyRepo === spec.keyRepo &&
    stream?.streamPrefix === (spec.floatingTag || spec.streamPrefix)
  );
}

// Floating tags are re-verified unconditionally because a tag can move twice in
// one day, but the *result* of a refresh must not demote a good same-day entry:
// a transient SBOM download or attestation failure would otherwise replace
// verified package data with nulls and render the stream Unavailable until the
// next successful run.
//
// @returns {null|string} null to accept the refreshed entry, otherwise a short
//          reason describing what the refresh lost.
function refreshRegression(previousEntry, attestation, packageVersions) {
  if (!previousEntry) return null;
  const reasons = [];
  if (packageVersions == null && previousEntry.packageVersions != null)
    reasons.push("no SBOM");
  if (
    attestation?.verified !== true &&
    previousEntry.attestation?.verified === true
  )
    reasons.push("unverified");
  return reasons.length > 0 ? reasons.join(", ") : null;
}

// Floating tags are sampled by channel; historical entries are keyed by their
// creation date because the registry tag itself moves between builds.
async function processFloatingTagStream(spec, existing) {
  const previous = currentCachedStream(existing, spec)
    ? existing.streams[spec.id].releases || {}
    : {};
  const releases = { ...previous };
  const imageRef = `ghcr.io/${spec.org}/${spec.package}:${spec.floatingTag}`;
  const dateStr = await getImageCreatedDate(imageRef);
  if (dateStr) {
    const cacheKey = `${spec.floatingTag}-${dateStr}`;
    // A floating tag can move twice in one day. A date-key cache hit does not
    // prove it still identifies the same image, so verify and download again.
    const rawAttestation = await verifyAttestation(imageRef, spec);
    const attestation = {
      present: rawAttestation.present,
      verified: rawAttestation.verified,
      predicateType: rawAttestation.predicateType,
      slsaType: rawAttestation.predicateType === SLSA_TYPE ? SLSA_TYPE : null,
      ...(rawAttestation.errorKind !== undefined && {
        errorKind: rawAttestation.errorKind,
      }),
      error: rawAttestation.error,
    };
    let packageVersions = null;
    let sbomPath = null;
    try {
      sbomPath = await downloadSbom(imageRef);
      if (sbomPath) packageVersions = extractPackageVersions(sbomPath);
    } catch (err) {
      console.warn(
        `    ${cacheKey}: SBOM download/parse error — ${err.message}`,
      );
    } finally {
      if (sbomPath) {
        try {
          fs.rmSync(path.dirname(sbomPath), { recursive: true, force: true });
        } catch {
          /* temporary-file cleanup is best-effort */
        }
      }
    }
    // Re-verification is unconditional, but a degraded result keeps the
    // previous good entry — see refreshRegression().
    const regression = refreshRegression(
      previous[cacheKey],
      attestation,
      packageVersions,
    );
    if (regression) {
      console.warn(
        `    ${cacheKey}: refresh degraded (${regression}) — keeping previous entry`,
      );
    } else {
      releases[cacheKey] = {
        tag: spec.floatingTag,
        imageRef,
        digest: null,
        attestation,
        packageVersions,
        checkedAt: new Date().toISOString(),
      };
    }
  }
  return {
    id: spec.id,
    label: spec.label,
    org: spec.org,
    package: spec.package,
    streamPrefix: spec.floatingTag,
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
  if (spec.floatingTag) {
    const imageKey = `${spec.org}/${spec.package}`;
    const listedTags = ghcrTagsByImage.get(imageKey);
    if (listedTags?.includes(spec.floatingTag)) {
      return processFloatingTagStream(spec, existing);
    }
    // Two different absences deserve two different answers:
    //  - the listing failed, or the package still publishes other tags while
    //    the floating tag is momentarily missing (mid-push, brief retag). The
    //    accumulated per-day history is still real, so keep it.
    //  - the package publishes no tags at all: the stream is unreleased or
    //    retired, so never keep serving history for an image the registry does
    //    not have.
    const registryIsLive = listedTags === undefined || listedTags.length > 0;
    if (registryIsLive && currentCachedStream(existing, spec)) {
      console.log(
        `  ${spec.id}: floating tag "${spec.floatingTag}" not listed — keeping existing cache`,
      );
      return existing.streams[spec.id];
    }
    return {
      id: spec.id,
      label: spec.label,
      org: spec.org,
      package: spec.package,
      streamPrefix: spec.floatingTag,
      keyRepo: spec.keyRepo,
      keyless: spec.keyless,
      releases: {},
    };
  }

  const imageKey = `${spec.org}/${spec.package}`;
  // If the GHCR tag fetch failed — preserve existing cache.
  if (!ghcrTagsByImage.has(imageKey)) {
    if (currentCachedStream(existing, spec)) {
      console.log(
        `  ${spec.id}: GHCR tags unavailable — keeping existing cache`,
      );
      return existing.streams[spec.id];
    }
    // No existing cache to fall back to; return empty stream.
    return {
      id: spec.id,
      label: spec.label,
      org: spec.org,
      package: spec.package,
      streamPrefix: spec.streamPrefix,
      keyRepo: spec.keyRepo,
      keyless: spec.keyless,
      releases: {},
    };
  }
  const ghcrTags = ghcrTagsByImage.get(imageKey);
  const recentTags = findRecentTagsForStream(ghcrTags, spec);

  console.log(
    `  ${spec.id}: found ${recentTags.length} recent tagged releases`,
  );

  const releases = {};
  for (const { tag, cacheKey, imageRef } of recentTags) {
    // Cache hit: reuse if digest matches AND packageVersions is already populated.
    const existingEntry = currentCachedStream(existing, spec)
      ? existing.streams[spec.id].releases?.[cacheKey]
      : null;
    const hasVersions = existingEntry?.packageVersions != null;
    const hasAllPackages =
      existingEntry?.packageVersions?.allPackages != null &&
      Object.keys(existingEntry.packageVersions.allPackages).length > 0;
    const isVerified = existingEntry?.attestation?.verified === true;

    const isCacheHit =
      !FORCE_REFRESH &&
      existingEntry?.imageRef === imageRef &&
      hasVersions &&
      hasAllPackages &&
      (spec.keyless || spec.attestationLive ? isVerified : true);
    if (isCacheHit) {
      console.log(
        `    ${cacheKey}: cache hit (${spec.keyless ? "verified, " : ""}versions populated)`,
      );
      releases[cacheKey] = existingEntry;
      continue;
    }

    // Partial cache hit: attestation already verified (keyless) but SBOM not yet downloaded.
    let attestation;
    if (
      !FORCE_REFRESH &&
      isVerified &&
      (!hasVersions || (hasVersions && !hasAllPackages))
    ) {
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
        slsaType: attestation.predicateType === SLSA_TYPE ? SLSA_TYPE : null,
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

/**
 * Build the explicit fallback payload used when no cache exists and every
 * stream produced zero releases.
 */
function buildUnavailableOutput(reason = EMPTY_RELEASES_REASON) {
  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    maxReleasesPerStream: MAX_RELEASES,
    streams: {},
    unavailable: true,
    stateReason: reason,
  };
}

/**
 * Write all generated SBOM artifacts for an unavailable run.
 *
 * @param {object} output fallback SBOM payload
 * @param {object} [files] output paths, overridden by tests
 */
function writeUnavailableOutputs(
  output,
  {
    outputFile = OUTPUT_FILE,
    frontendOutputFile = FRONTEND_OUTPUT_FILE,
    releaseListFile = RELEASE_LIST_FILE,
  } = {},
) {
  atomicWriteJson(outputFile, output);
  atomicWriteJson(frontendOutputFile, output);
  atomicWriteJson(releaseListFile, {
    generatedAt: output.generatedAt,
    releases: [],
    unavailable: true,
    stateReason: output.stateReason,
  });
}

/**
 * Preserve an existing cache, or write an explicit unavailable fallback when
 * no cache is available.
 *
 * @param {object|null} existing parsed existing cache
 * @param {object} [files] output paths, overridden by tests
 * @returns {object} preserved or newly written fallback payload
 */
function handleEmptyCache(existing, files, reason = EMPTY_RELEASES_REASON) {
  if (isValidSbomCache(existing)) {
    console.warn(
      "Warning: all streams produced zero releases. " +
        "Preserving the existing SBOM cache.",
    );
    return existing;
  }

  const output = buildUnavailableOutput(reason);
  console.warn(
    "Warning: all streams produced zero releases. " +
      "Writing unavailable SBOM fallback.",
  );
  writeUnavailableOutputs(output, files);
  return output;
}

function hasReleaseData(stream) {
  const releases = stream?.releases;
  return (
    releases &&
    typeof releases === "object" &&
    !Array.isArray(releases) &&
    Object.keys(releases).length > 0
  );
}

function isValidSbomCache(cache) {
  const streams = cache?.streams;
  if (
    !cache ||
    typeof cache !== "object" ||
    Array.isArray(cache) ||
    cache.unavailable ||
    !streams ||
    typeof streams !== "object" ||
    Array.isArray(streams) ||
    Object.keys(streams).length === 0
  ) {
    return false;
  }

  return (
    STREAM_SPECS.every((spec) => currentCachedStream(cache, spec)) &&
    hasPrimaryReleaseData(streams)
  );
}

function hasPrimaryReleaseData(streams) {
  // LTS releases remain catalogued even while their keyless-signed images have
  // no published SBOM. Classic must have parsed packages for version display.
  return (
    PRIMARY_RELEASE_STREAM_IDS.every((id) => hasReleaseData(streams?.[id])) &&
    Object.values(streams["bluefin-stable"].releases).some(
      (entry) =>
        entry?.packageVersions?.allPackages &&
        Object.keys(entry.packageVersions.allPackages).length > 0,
    )
  );
}

function reportMainError(err, files = {}) {
  const outputFile = files.outputFile || OUTPUT_FILE;
  let existing = null;
  if (fs.existsSync(outputFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    } catch {
      console.warn("Existing cache unreadable; writing unavailable fallback.");
    }
  }

  handleEmptyCache(existing, files);
  console.error(`fetch-github-sbom: ${err.message}`);
}

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
  const uniqueImages = new Set(
    STREAM_SPECS.map((s) => `${s.org}/${s.package}`),
  );

  console.log(`Fetching GHCR tags for ${uniqueImages.size} image(s)...`);
  const ghcrTagsByImage = new Map();
  for (const imageKey of uniqueImages) {
    const [org, pkg] = imageKey.split("/");
    console.log(`  ghcr.io/${imageKey}`);
    try {
      const tags = await fetchGhcrTags(org, pkg);
      ghcrTagsByImage.set(imageKey, tags);
      console.log(`    ${tags.length} GHCR tags fetched`);
    } catch (err) {
      console.error(
        `  Failed to fetch GHCR tags for ${imageKey}: ${err.message}`,
      );
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
      if (currentCachedStream(existing, spec)) {
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
  if (totalReleases === 0 || !hasPrimaryReleaseData(streams)) {
    handleEmptyCache(
      existing,
      undefined,
      totalReleases === 0 ? EMPTY_RELEASES_REASON : PARTIAL_RELEASES_REASON,
    );
    return;
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

  // Write release-list.json — a lightweight index of all releases across streams,
  // suitable for changelogs/feed pages without importing the full SBOM payload.
  const releaseList = [];
  for (const [streamId, stream] of Object.entries(streams)) {
    for (const [tag, entry] of Object.entries(stream.releases || {})) {
      const pv = entry.packageVersions || {};
      releaseList.push({
        stream: streamId,
        tag,
        date: entry.checkedAt,
        digest: entry.digest ? entry.digest.slice(0, 19) : null,
        kernel: pv.kernel || null,
        gnome: pv.gnome || null,
        mesa: pv.mesa || null,
      });
    }
  }
  releaseList.sort((a, b) => new Date(b.date) - new Date(a.date));
  atomicWriteJson(RELEASE_LIST_FILE, {
    generatedAt: output.generatedAt,
    releases: releaseList,
  });
  console.log(
    `Release list written to ${RELEASE_LIST_FILE} (${releaseList.length} entries)`,
  );
}

if (require.main === module) {
  main().catch(reportMainError);
}

module.exports = {
  STREAM_SPECS,
  processStream,
  buildUnavailableOutput,
  handleEmptyCache,
  hasPrimaryReleaseData,
  isValidSbomCache,
  reportMainError,
  stripEpoch,
  compareRpmVersions,
  extractPackageVersions,
  extractBstPackageVersions,
  isSemverLike,
  selectAmd64DigestFromManifest,
  findRecentTagsForStream,
  refreshRegression,
  fetchGhcrTags, // exported for integration testing
};
