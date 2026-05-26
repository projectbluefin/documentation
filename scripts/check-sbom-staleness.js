#!/usr/bin/env node
// Warn (non-blocking) if SBOM attestation data is stale (>48h) or missing.
const fs = require("fs");
const path = require("path");

const SBOM_PATH = path.join(__dirname, "..", "static", "data", "sbom-attestations.json");
const STALE_HOURS = 48;

function buildSbomStatus(data, nowMs = Date.now(), staleHours = STALE_HOURS) {
  const generatedAt = new Date(data.generatedAt);
  const ageMs = nowMs - generatedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (Number.isNaN(ageHours)) {
    return {
      level: "warn",
      state: "invalid",
      ageHours: null,
      message: "⚠️  SBOM data has no valid generatedAt timestamp.",
    };
  }

  if (ageHours > staleHours) {
    return {
      level: "warn",
      state: "stale",
      ageHours,
      message: `⚠️  SBOM data is ${ageHours.toFixed(1)}h old (threshold: ${staleHours}h). Cache may be stale.`,
    };
  }

  return {
    level: "log",
    state: "fresh",
    ageHours,
    message: `✅ SBOM data is ${ageHours.toFixed(1)}h old — fresh.`,
  };
}

function parseSbomStatus(raw, nowMs = Date.now(), staleHours = STALE_HOURS) {
  try {
    return buildSbomStatus(JSON.parse(raw), nowMs, staleHours);
  } catch (err) {
    return {
      level: "warn",
      state: "error",
      ageHours: null,
      message: `⚠️  Could not read SBOM data: ${err.message}`,
    };
  }
}

function main() {
  if (!fs.existsSync(SBOM_PATH)) {
    console.warn("⚠️  SBOM attestation data is missing — site will lack version info.");
    process.exit(0);
  }

  const status = parseSbomStatus(fs.readFileSync(SBOM_PATH, "utf8"));
  console[status.level](status.message);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  STALE_HOURS,
  buildSbomStatus,
  parseSbomStatus,
};
