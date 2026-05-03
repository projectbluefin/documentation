#!/usr/bin/env node
// Warn (non-blocking) if SBOM attestation data is stale (>48h) or missing.
const fs = require("fs");
const path = require("path");

const SBOM_PATH = path.join(__dirname, "..", "static", "data", "sbom-attestations.json");
const STALE_HOURS = 48;

if (!fs.existsSync(SBOM_PATH)) {
  console.warn("⚠️  SBOM attestation data is missing — site will lack version info.");
  process.exit(0);
}

try {
  const data = JSON.parse(fs.readFileSync(SBOM_PATH, "utf8"));
  const generatedAt = new Date(data.generatedAt);
  const ageMs = Date.now() - generatedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (Number.isNaN(ageHours)) {
    console.warn("⚠️  SBOM data has no valid generatedAt timestamp.");
  } else if (ageHours > STALE_HOURS) {
    console.warn(
      `⚠️  SBOM data is ${ageHours.toFixed(1)}h old (threshold: ${STALE_HOURS}h). Cache may be stale.`
    );
  } else {
    console.log(`✅ SBOM data is ${ageHours.toFixed(1)}h old — fresh.`);
  }
} catch (err) {
  console.warn(`⚠️  Could not read SBOM data: ${err.message}`);
}

process.exit(0);
