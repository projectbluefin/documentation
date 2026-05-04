/**
 * SBOM parsing, RPM version handling, and tag filtering helpers.
 */

"use strict";

const fs = require("fs");
const { extractBstPackageVersions } = require("./bst");

// ---------------------------------------------------------------------------
// RPM version helpers
// ---------------------------------------------------------------------------

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
 * Strip RPM release/dist suffix from non-kernel version strings.
 * RPM NEVRA: Name-Epoch:Version-Release.Dist — after stripEpoch we have "Version-Release.Dist".
 * For display purposes only the upstream Version matters (e.g. "49.5", not "49.5-100.el10gnomeqr.el10").
 * Kernel versions intentionally retain their release ("6.12.0-224.el10") since the build
 * number and dist tag are part of the kernel's meaningful identity.
 *
 * @param {string} version - already epoch-stripped RPM version string
 * @returns {string}
 */
function stripRpmRelease(version) {
  if (!version) return version;
  const dash = version.indexOf("-");
  if (dash === -1) return version;
  return version.slice(0, dash);
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
 * Normalise an lts*.YYYYMMDD tag to lts*-YYYYMMDD format.
 * Handles: lts.20260331       → lts-20260331
 *          lts.20260331-hwe   → lts-20260331-hwe
 *          lts-hwe.20260501   → lts-hwe-20260501
 */
function normaliseLtsTag(tag) {
  // lts.20260501       → lts-20260501
  // lts-hwe.20260501   → lts-hwe-20260501
  return tag.replace(/^(lts[a-z-]*)\.(\d{8})/, "$1-$2");
}

/**
 * Build the stream-prefixed cache key used in FeedItems.tsx.
 * extractReleaseTag() in FeedItems produces: stable-YYYYMMDD, gts-YYYYMMDD,
 * lts-YYYYMMDD, etc.
 */
function buildCacheKey(streamPrefix, dateStr) {
  return `${streamPrefix}-${dateStr}`;
}

/**
 * Filter a list of GHCR tag strings to find recent dated tags for a given stream.
 *
 * @param {string[]} ghcrTags  Raw tag strings from fetchGhcrTags().
 * @param {object}   spec      Stream spec from STREAM_SPECS.
 * @param {object}   [opts]    Options.
 * @param {number}   [opts.lookbackDays]  How many calendar days to look back (default: 90).
 * @param {number}   [opts.maxReleases]   Max releases to return (default: 10).
 * @returns {Array<{tag, cacheKey, dateStr, imageRef, publishedAt}>}
 */
function findRecentTagsForStream(ghcrTags, spec, opts = {}) {
  const lookbackDays = opts.lookbackDays || Number(process.env.SBOM_LOOKBACK_DAYS || 90);
  const maxReleases = opts.maxReleases || Number(process.env.SBOM_MAX_RELEASES || 10);
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const found = [];

  for (const tagName of ghcrTags) {
    const normalised = normaliseLtsTag(tagName.toLowerCase());
    if (!normalised.startsWith(`${spec.streamPrefix}-`)) continue;
    const dateStr = extractDateFromTag(normalised);
    if (!dateStr) continue;

    // Enforce canonical tag: only exact `<streamPrefix>-YYYYMMDD` is accepted.
    const expectedCanonical = `${spec.streamPrefix}-${dateStr}`;
    if (normalised !== expectedCanonical) continue;

    // Tags from GHCR have no publishedAt — derive from the date string.
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const publishedAt = `${year}-${month}-${day}T00:00:00Z`;
    const publishedMs = Date.parse(publishedAt);
    if (isNaN(publishedMs) || publishedMs < cutoff) continue;

    found.push({
      tag: normalised,
      cacheKey: buildCacheKey(spec.streamPrefix, dateStr),
      dateStr,
      imageRef: `ghcr.io/${spec.org}/${spec.package}:${tagName}`,
      publishedAt,
    });
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

  // Sort descending by dateStr (YYYYMMDD sorts lexicographically)
  unique.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return unique.slice(0, maxReleases);
}

// ---------------------------------------------------------------------------
// SBOM extraction
// ---------------------------------------------------------------------------

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
 *
 * Also collects allPackages: a flat {name: version} map of every RPM artifact.
 * This enables per-release diff computation in fetch-firehose.js without
 * additional network calls at build time.
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

  // Detect SBOM format.
  //
  // Syft JSON (stable/daily streams): top-level `artifacts` array; each entry
  //   has a `type` field ("rpm", "deb", etc.).
  //
  // SPDX JSON (LTS/GDX streams): top-level `packages` array with `spdxVersion`
  //   present; RPM packages are identified by a pkg:rpm/ PURL in externalRefs.
  //   Normalise to the same {name, version, type} shape before processing.
  //
  // BST SPDX (Dakota): SPDX with `bst-element` externalRefs instead of pkg:rpm/
  //   PURLs. Generated by buildstream-sbom from the BuildStream element graph.
  //   Packages represent BST elements, not RPM packages. Extraction uses
  //   (name, BST element path suffix) pairs to disambiguate between components
  //   that share a name (e.g. the `linux` kernel element vs. Rust `linux` crates).
  const isSpdx = Array.isArray(sbom?.packages) && typeof sbom?.spdxVersion === "string";
  const isBstSpdx =
    isSpdx &&
    (sbom.packages || []).some((pkg) =>
      (pkg?.externalRefs || []).some((r) => r?.referenceType === "bst-element"),
    );

  if (isBstSpdx) {
    return extractBstPackageVersions(sbom);
  }

  let artifacts;
  if (isSpdx) {
    artifacts = (sbom.packages || [])
      .filter((pkg) => {
        const refs = pkg?.externalRefs || [];
        return refs.some(
          (r) =>
            r?.referenceCategory === "PACKAGE-MANAGER" &&
            r?.referenceLocator?.startsWith("pkg:rpm/"),
        );
      })
      .map((pkg) => ({
        name: pkg.name,
        version: pkg.versionInfo,
        type: "rpm",
      }));
    console.log(
      `    extractPackageVersions: SPDX format (${sbom.spdxVersion}), ${artifacts.length} RPM packages`,
    );
  } else {
    artifacts = sbom?.artifacts;
  }

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
    pipewire: null,
    flatpak: null,
    nvidia: null,
    /** Flat name→version map of every RPM in the image */
    allPackages: /** @type {Record<string, string>} */ ({}),
  };

  // Collect all kernel versions to pick the lowest (booted kernel)
  const kernelVersions = [];

  for (const pkg of rpms) {
    const name = pkg?.name;
    const version = pkg?.version;
    if (!name || !version) continue;

    // Capture every RPM for diff computation, epoch+release-stripped.
    // kernel is handled specially below (multi-version dedup) — skip here.
    if (name !== "kernel") {
      result.allPackages[name] = stripRpmRelease(stripEpoch(String(version)));
    }

    switch (name) {
      case "kernel":
        kernelVersions.push(stripEpoch(String(version)));
        break;
      case "gnome-shell":
        if (!result.gnome) result.gnome = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "mesa-filesystem":
        if (!result.mesa) result.mesa = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "podman":
        if (!result.podman) result.podman = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "systemd":
        if (!result.systemd) result.systemd = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "bootc":
        if (!result.bootc) result.bootc = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "pipewire":
        if (!result.pipewire) result.pipewire = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "flatpak":
        if (!result.flatpak) result.flatpak = stripRpmRelease(stripEpoch(String(version)));
        break;
      case "nvidia-driver":
        if (!result.nvidia) result.nvidia = stripRpmRelease(stripEpoch(String(version)));
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
    // Write the correctly-picked (lowest/booted) kernel into allPackages so diff
    // comparisons use the same value as the displayed chip.
    result.allPackages["kernel"] = stripEpoch(kernelVersions[0]);
  }

  console.log(
    `    extractPackageVersions: captured ${Object.keys(result.allPackages).length} RPM packages`,
  );

  return result;
}

module.exports = {
  compareRpmVersions,
  stripEpoch,
  stripRpmRelease,
  extractDateFromTag,
  normaliseLtsTag,
  buildCacheKey,
  findRecentTagsForStream,
  extractPackageVersions,
};
