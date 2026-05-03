/**
 * Frontend-facing slim copy builder.
 *
 * Strips `allPackages` from every release's packageVersions so the JS bundle
 * only includes the named versions (kernel, gnome, mesa, etc.) — not the full
 * RPM inventory (~60 KB per release).
 */

"use strict";

/**
 * Build slim frontend streams by stripping allPackages from each release.
 *
 * CRITICAL: The destructuring below is the correct slim logic.
 * `allPackages` is dropped; the remaining fields (kernel, gnome, mesa, …)
 * are kept as `slimPkgVersions`.
 *
 * @param {Record<string, object>} streams  Full streams object from SBOM cache.
 * @returns {Record<string, object>}  Streams with allPackages removed.
 */
function buildSlimFrontendStreams(streams) {
  const frontendStreams = {};
  for (const [streamId, stream] of Object.entries(streams)) {
    const slimReleases = {};
    for (const [key, entry] of Object.entries(stream.releases || {})) {
      // Strip allPackages from packageVersions — it's ~60KB per release and
      // the frontend only needs the named versions (kernel, gnome, mesa, etc.)
      const { allPackages: _dropped, ...slimPkgVersions } = entry.packageVersions || {};
      slimReleases[key] = { ...entry, packageVersions: slimPkgVersions };
    }
    frontendStreams[streamId] = { ...stream, releases: slimReleases };
  }
  return frontendStreams;
}

module.exports = { buildSlimFrontendStreams };
