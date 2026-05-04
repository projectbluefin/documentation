/**
 * BST SPDX extraction — Dakota / BuildStream images.
 *
 * BuildStream SBOMs use `bst-element` externalRefs instead of pkg:rpm/ PURLs.
 * Packages represent BST elements, not RPM packages.
 */

"use strict";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a version string looks like a semantic version
 * (starts with digits.digits, not a bare git SHA or empty).
 * Used to filter BST SPDX packages: many packages have SHA or empty versionInfo.
 *
 * Examples that pass:  "50.0", "6.19.11", "26.0.5", "1.6.1", "5.8.2"
 * Examples that fail:  "c9372e733d75cf...", "", undefined, "abc123"
 */
function isSemverLike(version) {
  if (!version || typeof version !== "string") return false;
  if (version.length > 40) return false; // likely a full git SHA
  return /^\d+\.\d+/.test(version);
}

// ---------------------------------------------------------------------------
// BST package mapping
// ---------------------------------------------------------------------------

/**
 * Maps a BST package name + BST element path suffix to a PackageVersions field.
 * The suffix match uses endsWith() so it works across both freedesktop-sdk.bst:
 * and gnome-build-meta.bst: junction prefixes.
 *
 * Order matters: the first matching entry wins.
 */
const BST_PACKAGE_MAP = [
  { name: "gnome-shell", bstSuffix: "core/gnome-shell.bst", field: "gnome" },
  // components/linux.bst is the actual running kernel; linux-headers.bst is build-only.
  { name: "linux", bstSuffix: "components/linux.bst", field: "kernel" },
  { name: "mesa", bstSuffix: "extensions/mesa/mesa.bst", field: "mesa" },
  { name: "pipewire", bstSuffix: "components/pipewire-base.bst", field: "pipewire" },
  { name: "podman", bstSuffix: "components/podman.bst", field: "podman" },
  { name: "flatpak", bstSuffix: "components/flatpak.bst", field: "flatpak" },
  {
    name: "systemd",
    bstSuffix: "core-deps/systemd-base.bst",
    field: "systemd",
  },
  // Dakota nvidia variant: upstream tarball is named NVIDIA-Linux-x86
  {
    name: "NVIDIA-Linux-x86",
    bstSuffix: "bluefin-nvidia/nvidia-drivers.bst",
    field: "nvidia",
  },
];

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Extract package versions from a BuildStream SPDX (BST SPDX) object.
 *
 * BST SPDX differences from RPM SPDX:
 *  - externalRefs use referenceType="bst-element" instead of pkg:rpm/ PURLs
 *  - Multiple SPDX packages may share the same name (one per BST element that
 *    produces that component, plus Rust crates with identical names)
 *  - Disambiguation uses the bst-element referenceLocator path suffix
 *  - No fedora-release package: fedora stays null (GNOME OS base, not Fedora)
 *  - No epoch prefixes to strip
 *
 * @param {object} sbom  Parsed SPDX JSON object
 * @returns {object}     PackageVersions with the same shape as RPM extraction
 */
function extractBstPackageVersions(sbom) {
  const pkgs = sbom.packages || [];

  const result = {
    kernel: null,
    gnome: null,
    mesa: null,
    podman: null,
    systemd: null,
    bootc: null,
    fedora: null, // always null — Dakota is GNOME OS based, not Fedora
    pipewire: null,
    flatpak: null,
    nvidia: null,
    /** Flat name→version map for all BST components with semver versions. */
    allPackages: /** @type {Record<string, string>} */ ({}),
  };

  for (const pkg of pkgs) {
    const name = pkg?.name;
    const ver = pkg?.versionInfo;
    if (!name || !isSemverLike(ver)) continue;

    const bstRefs = (pkg?.externalRefs || []).filter(
      (r) => r?.referenceType === "bst-element",
    );
    if (bstRefs.length === 0) continue;

    // Populate allPackages for every BST component with a semver version.
    // Use the first semver version found per name (later entries may be aliases).
    if (!result.allPackages[name]) {
      result.allPackages[name] = ver;
    }

    // Map to named version fields using BST element path suffix.
    for (const { name: mapName, bstSuffix, field } of BST_PACKAGE_MAP) {
      if (name !== mapName) continue;
      if (result[field]) continue; // already populated
      const matchingRef = bstRefs.find((r) =>
        r?.referenceLocator?.endsWith(bstSuffix),
      );
      if (matchingRef) {
        result[field] = ver;
      }
    }
  }

  const populated = Object.keys(result.allPackages).length;
  console.log(
    `    extractPackageVersions: BST SPDX format (${sbom.spdxVersion}), ` +
      `${populated} BST components with semver versions. ` +
      `gnome=${result.gnome} kernel=${result.kernel} mesa=${result.mesa}`,
  );

  return result;
}

module.exports = {
  isSemverLike,
  BST_PACKAGE_MAP,
  extractBstPackageVersions,
};
