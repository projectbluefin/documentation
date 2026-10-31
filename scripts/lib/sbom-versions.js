"use strict";

const fs = require("fs");

/**
 * Load and parse the SBOM attestation cache from disk.
 * Returns null if the file is missing or unparseable.
 */
function readSbomCache(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Return the most recent packageVersions for a stream.
 * Keys are <stream>-YYYYMMDD; sort descending so newest release wins
 * regardless of insertion order.
 * Used by the Images page to show current versions per product.
 */
function lookupVersionsForStream(cache, streamId) {
  const stream = cache?.streams?.[streamId];
  if (!stream?.releases) return null;
  const keys = Object.keys(stream.releases).sort().reverse();
  for (const key of keys) {
    const entry = stream.releases[key];
    if (entry?.packageVersions) return entry.packageVersions;
  }
  return null;
}

/**
 * Return packageVersions for a specific release tag within a stream.
 * cacheKey format: "stable-20260331", "latest-20260331", etc.
 * Used by the Driver Versions page for per-release historical data.
 */
function lookupVersionsForRelease(cache, streamId, cacheKey) {
  return (
    cache?.streams?.[streamId]?.releases?.[cacheKey]?.packageVersions ?? null
  );
}
/**
 * Cache keys under which the companion (NVIDIA) image of the same release is
 * stored. A base and companion image of one release can be cached under
 * different dates (dakota-stable "stable-20261022" links to release
 * stable-20261023, cached for dakota-nvidia as "stable-20261023"), so the
 * release tag's date is tried after the cache key. Never a neighbouring date.
 */
function companionReleaseKeys(cacheKey, releaseUrl = null) {
  const keys = cacheKey ? [cacheKey] : [];
  const releaseDate = String(releaseUrl || "").match(
    /\/releases\/tag\/[^/]*?(\d{8})$/,
  )?.[1];
  if (cacheKey && releaseDate && /\d{8}$/.test(cacheKey)) {
    const releaseKey = cacheKey.replace(/\d{8}$/, releaseDate);
    if (releaseKey !== cacheKey) keys.push(releaseKey);
  }
  return keys;
}

module.exports = {
  readSbomCache,
  lookupVersionsForStream,
  lookupVersionsForRelease,
  companionReleaseKeys,
};
