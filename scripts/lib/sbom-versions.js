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
 * cacheKey format: "stable-20260331", "lts-20260331", etc.
 * Used by the Driver Versions page for per-release historical data.
 */
function lookupVersionsForRelease(cache, streamId, cacheKey) {
  return cache?.streams?.[streamId]?.releases?.[cacheKey]?.packageVersions ?? null;
}

module.exports = {
  readSbomCache,
  lookupVersionsForStream,
  lookupVersionsForRelease,
};
