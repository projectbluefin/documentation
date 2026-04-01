const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "firehose-apps.json");
const SOURCE_URL =
  "https://castrojo.github.io/bluefin-releases/apps.json";

// Cache configuration — match the 6h pipeline schedule of bluefin-releases.
// Set FIREHOSE_CACHE_HOURS=0 to always fetch (used in CI via pages.yml).
const CACHE_MAX_AGE_HOURS = Number(process.env.FIREHOSE_CACHE_HOURS ?? 6);

async function fetchFirehoseData() {
  // Check if existing cache is fresh enough.
  // Always fetch if: cache is expired, --force is set, CACHE_MAX_AGE_HOURS=0,
  // or the file contains an empty apps array (committed seed).
  if (fs.existsSync(OUTPUT_FILE)) {
    const stats = fs.statSync(OUTPUT_FILE);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    // Check whether file is the empty seed (0 apps) — always fetch in that case
    let isEmpty = false;
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      isEmpty = !Array.isArray(existing.apps) || existing.apps.length === 0;
    } catch {
      isEmpty = true;
    }

    const isForced = process.argv.includes("--force") || CACHE_MAX_AGE_HOURS === 0;

    if (!isEmpty && !isForced && ageHours < CACHE_MAX_AGE_HOURS) {
      console.log(
        `✓ Firehose cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
      );
      console.log(`  Use --force flag or FIREHOSE_CACHE_HOURS=0 to bypass.`);
      return;
    } else if (isEmpty) {
      console.log("Firehose seed file is empty — fetching fresh data...");
    } else if (isForced) {
      console.log("Forced fetch — fetching fresh firehose data...");
    } else {
      console.log(
        `Firehose cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Fetching fresh data...`,
      );
    }
  } else {
    console.log("Fetching firehose data for the first time...");
  }

  try {
    console.log(`Fetching ${SOURCE_URL}...`);
    const response = await fetch(SOURCE_URL);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} from ${SOURCE_URL}`,
      );
    }

    const data = await response.json();

    // Basic shape validation
    if (!data || !Array.isArray(data.apps)) {
      throw new Error(
        `Unexpected response shape — expected {apps: [...], metadata: {...}}`,
      );
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");

    console.log(
      `✓ Firehose data saved: ${data.apps.length} apps to ${OUTPUT_FILE}`,
    );
  } catch (error) {
    console.warn(`\n⚠️  Failed to fetch firehose data: ${error.message}`);
    console.warn(
      "   The changelogs page will use the committed seed file (empty app list).",
    );
    console.warn(
      "   This is expected on first run before the bluefin-releases pipeline has deployed.\n",
    );

    // Graceful degradation — keep the existing file (seed or last successful fetch).
    // Do NOT write an empty file here; the committed seed is the fallback.
    if (!fs.existsSync(OUTPUT_FILE)) {
      // Safety net: write a valid empty structure if the seed is somehow missing
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify({ apps: [], metadata: {} }, null, 2),
        "utf-8",
      );
    }
  }
}

fetchFirehoseData().catch((error) => {
  console.error("Fatal error in fetch-firehose:", error);
  // Never fail the build — keep existing file
});
