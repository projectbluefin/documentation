const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "firehose-apps.json");
const SBOM_FILE = path.join(OUTPUT_DIR, "sbom-attestations.json");
const SOURCE_URL = "https://castrojo.github.io/bluefin-releases/apps.json";

// Cache configuration — match the 6h pipeline schedule of bluefin-releases.
// Set FIREHOSE_CACHE_HOURS=0 to always fetch (used in CI via pages.yml).
const CACHE_MAX_AGE_HOURS = Number(process.env.FIREHOSE_CACHE_HOURS ?? 6);

/**
 * SBOM stream ID → OS entry metadata mapping.
 * Only stable and lts are surfaced as OS release cards.
 * "latest" is a rolling edge stream — not shown as a discrete release.
 */
const OS_STREAM_SPECS = [
  {
    streamId: "bluefin-stable",
    appId: "bluefin-os-stable",
    name: "Bluefin OS (Stable)",
    summary: "The stable Bluefin release track.",
    imageRef: "ghcr.io/ublue-os/bluefin",
    ghReleasesUrl: "https://github.com/ublue-os/bluefin/releases",
  },
  {
    streamId: "bluefin-lts",
    appId: "bluefin-os-lts",
    name: "Bluefin OS (LTS)",
    summary: "Long-term support Bluefin track.",
    imageRef: "ghcr.io/ublue-os/bluefin",
    ghReleasesUrl: "https://github.com/ublue-os/bluefin-lts/releases",
    // LTS does not publish SBOM attestations — OS chip data will be absent.
    noSbom: true,
  },
];

/**
 * Read sbom-attestations.json from disk.
 * Returns null if the file is absent, empty (seed), or unparseable.
 */
function readSbomCache() {
  if (!fs.existsSync(SBOM_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(SBOM_FILE, "utf-8"));
    // Empty seed: { generatedAt: null, streams: {} }
    if (!data.generatedAt || !data.streams || Object.keys(data.streams).length === 0) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Get all releases for a stream, sorted descending (newest first).
 * Returns an array of { cacheKey, ...releaseEntry } objects.
 */
function sortedReleases(stream) {
  if (!stream?.releases) return [];
  return Object.entries(stream.releases)
    .map(([key, entry]) => ({ cacheKey: key, ...entry }))
    .sort((a, b) => b.cacheKey.localeCompare(a.cacheKey)); // YYYYMMDD desc
}

/**
 * Build a FirehoseOsInfo object from a SBOM packageVersions record.
 * Returns null if packageVersions is absent.
 */
function buildOsInfo(streamId, packageVersions) {
  if (!packageVersions) return null;

  const info = { stream: streamId };

  if (packageVersions.fedora) info.fedoraVersion = packageVersions.fedora;
  if (packageVersions.kernel) info.kernelVersion = packageVersions.kernel;
  if (packageVersions.gnome) info.gnomeVersion = packageVersions.gnome;
  if (packageVersions.mesa) info.mesaVersion = packageVersions.mesa;

  const majorPackages = {};
  if (packageVersions.podman) majorPackages["Podman"] = packageVersions.podman;
  if (packageVersions.systemd) majorPackages["systemd"] = packageVersions.systemd;
  if (packageVersions.bootc) majorPackages["bootc"] = packageVersions.bootc;

  if (Object.keys(majorPackages).length > 0) {
    info.majorPackages = majorPackages;
  }

  return info;
}

/**
 * Compute the diff between two allPackages maps.
 *
 * @param {Record<string,string>} current  - packages in the newer release
 * @param {Record<string,string>} previous - packages in the older release
 * @returns {{ added: object[], changed: object[], removed: object[] }}
 *
 * Packages with identical version strings are excluded from the diff.
 * Version strings are compared as-is (epoch already stripped by fetch-github-sbom.js).
 */
function computePackageDiff(current, previous) {
  if (!current || !previous) return { added: [], changed: [], removed: [] };

  const added = [];
  const changed = [];
  const removed = [];

  for (const [name, newVer] of Object.entries(current)) {
    if (!(name in previous)) {
      added.push({ name, newVersion: newVer, oldVersion: null });
    } else if (previous[name] !== newVer) {
      changed.push({ name, newVersion: newVer, oldVersion: previous[name] });
    }
  }

  for (const [name, oldVer] of Object.entries(previous)) {
    if (!(name in current)) {
      removed.push({ name, newVersion: null, oldVersion: oldVer });
    }
  }

  // Sort alphabetically for stable display
  added.sort((a, b) => a.name.localeCompare(b.name));
  changed.sort((a, b) => a.name.localeCompare(b.name));
  removed.sort((a, b) => a.name.localeCompare(b.name));

  return { added, changed, removed };
}

/**
 * Synthesise a FirehoseApp object for a single OS stream from SBOM data.
 *
 * The "latest release" is the most recent SBOM cache entry with packageVersions.
 * Older entries (up to 9 more) are collected as releases[] for the older-releases toggle.
 */
function buildOsApp(spec, sbomCache) {
  const stream = sbomCache?.streams?.[spec.streamId];
  const releases = sortedReleases(stream);

  // Find the most recent entry that has packageVersions populated
  const latestWithVersions = releases.find((r) => r.packageVersions != null);

  // Current version display: use the cache key date (e.g. "stable-20260401" → "2026-04-01")
  let currentReleaseVersion = null;
  let currentReleaseDate = null;
  let updatedAt = null;
  let osInfo = null;

  if (latestWithVersions) {
    // cacheKey is "<stream>-YYYYMMDD"
    const datePart = latestWithVersions.cacheKey.replace(/^.*?-(\d{8})$/, "$1");
    if (/^\d{8}$/.test(datePart)) {
      currentReleaseVersion = datePart.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      currentReleaseDate = `${currentReleaseVersion}T00:00:00Z`;
      updatedAt = currentReleaseDate;
    }
    osInfo = buildOsInfo(spec.streamId, latestWithVersions.packageVersions);
  } else if (releases.length > 0) {
    // Have releases but none with packageVersions yet (SBOM not populated for this entry)
    const first = releases[0];
    const datePart = first.cacheKey.replace(/^.*?-(\d{8})$/, "$1");
    if (/^\d{8}$/.test(datePart)) {
      currentReleaseVersion = datePart.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      currentReleaseDate = `${currentReleaseVersion}T00:00:00Z`;
      updatedAt = currentReleaseDate;
    }
  }

  // Build releases[] — one entry per SBOM cache key, most recent first
  // Limit to 10 total (1 shown + 9 in older-releases toggle)
  const appReleases = releases.slice(0, 10).map((r, idx) => {
    const datePart = r.cacheKey.replace(/^.*?-(\d{8})$/, "$1");
    const dateStr = /^\d{8}$/.test(datePart)
      ? datePart.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
      : r.checkedAt;

    // Compute diff vs the next-older release entry (idx+1 is older because sorted desc)
    let packageDiff = null;
    const currentAllPkgs = r.packageVersions?.allPackages;
    const prevRelease = releases[idx + 1];
    const prevAllPkgs = prevRelease?.packageVersions?.allPackages;

    if (
      currentAllPkgs &&
      Object.keys(currentAllPkgs).length > 0 &&
      prevAllPkgs &&
      Object.keys(prevAllPkgs).length > 0
    ) {
      packageDiff = computePackageDiff(currentAllPkgs, prevAllPkgs);
    }

    return {
      version: dateStr || r.cacheKey,
      date: (dateStr ? `${dateStr}T00:00:00Z` : null) || r.checkedAt,
      title: dateStr || r.cacheKey,
      description: null,
      url: spec.ghReleasesUrl || null,
      type: "os-sbom",
      // Carry packageVersions for OS chip rendering in older-releases toggle
      // Strip allPackages from the per-release entry — it's large and only used above
      packageVersions: r.packageVersions
        ? {
            kernel: r.packageVersions.kernel,
            gnome: r.packageVersions.gnome,
            mesa: r.packageVersions.mesa,
            podman: r.packageVersions.podman,
            systemd: r.packageVersions.systemd,
            bootc: r.packageVersions.bootc,
            fedora: r.packageVersions.fedora,
          }
        : null,
      packageDiff,
    };
  });

  return {
    id: spec.appId,
    name: spec.name,
    summary: spec.summary,
    description: null,
    icon: null,
    updatedAt,
    currentReleaseVersion,
    currentReleaseDate,
    osInfo,
    releases: appReleases,
    fetchedAt: new Date().toISOString(),
    isVerified: false,
    appSet: "core",
    packageType: "os",
  };
}

/**
 * Sanitize a remote app entry — only keep expected fields with expected types.
 * This prevents a compromised upstream feed from injecting unexpected data shapes
 * or oversized payloads into the site build.
 */
function sanitizeRemoteApp(app) {
  const str = (v, maxLen = 5000) =>
    typeof v === "string" ? v.slice(0, maxLen) : null;
  const arr = (v) => (Array.isArray(v) ? v : []);

  const sanitized = {
    id: str(app.id, 200),
    name: str(app.name, 200),
    summary: str(app.summary, 500),
    description: str(app.description),
    icon: str(app.icon, 2000),
    updatedAt: str(app.updatedAt, 30),
    currentReleaseVersion: str(app.currentReleaseVersion, 100),
    currentReleaseDate: str(app.currentReleaseDate, 30),
    fetchedAt: str(app.fetchedAt, 30),
    isVerified: typeof app.isVerified === "boolean" ? app.isVerified : false,
    appSet: str(app.appSet, 50),
    packageType: str(app.packageType, 50),
  };

  // Sanitize releases array — limit count and field sizes
  sanitized.releases = arr(app.releases)
    .slice(0, 50)
    .map((r) => ({
      version: str(r.version, 200),
      title: str(r.title, 500),
      date: str(r.date, 30),
      description: str(r.description),
      url: str(r.url, 2000),
      type: str(r.type, 50),
    }));

  return sanitized;
}

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

  // ── Step 1: Fetch non-OS apps from the remote feed ────────────────────────
  let remoteApps = [];
  let remoteMetadata = {};

  try {
    console.log(`Fetching ${SOURCE_URL}...`);
    const response = await fetch(SOURCE_URL);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText} from ${SOURCE_URL}`,
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.apps)) {
      throw new Error(
        `Unexpected response shape — expected {apps: [...], metadata: {...}}`,
      );
    }

    // Strip any os/os-release entries from the remote feed — we own those now
    remoteApps = data.apps
      .filter(
        (app) => app.packageType !== "os" && app.packageType !== "os-release",
      )
      .map((app) => sanitizeRemoteApp(app));
    remoteMetadata = data.metadata || {};

    console.log(
      `✓ Remote feed: ${data.apps.length} total, ${data.apps.length - remoteApps.length} OS entries stripped, ${remoteApps.length} non-OS apps kept`,
    );
  } catch (error) {
    console.warn(`\n⚠️  Failed to fetch firehose data: ${error.message}`);
    console.warn(
      "   The changelogs page will use the committed seed file (empty app list).",
    );
    console.warn(
      "   This is expected on first run before the bluefin-releases pipeline has deployed.\n",
    );

    if (!fs.existsSync(OUTPUT_FILE)) {
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify({ apps: [], metadata: {} }, null, 2),
        "utf-8",
      );
    }
    return;
  }

  // ── Step 2: Build OS entries from sbom-attestations.json ─────────────────
  const sbomCache = readSbomCache();

  if (sbomCache) {
    console.log(
      `✓ SBOM cache loaded (generatedAt: ${sbomCache.generatedAt})`,
    );
    console.log(`  Streams available: ${Object.keys(sbomCache.streams).join(", ")}`);
  } else {
    console.log(
      "  SBOM cache is empty seed or unavailable — OS entries will have no version data.",
    );
  }

  const osApps = OS_STREAM_SPECS.map((spec) => {
    const app = buildOsApp(spec, sbomCache);
    console.log(
      `  OS entry: ${spec.appId} — version: ${app.currentReleaseVersion || "(none)"}, ` +
        `kernel: ${app.osInfo?.kernelVersion || "(none)"}`,
    );
    return app;
  });

  // ── Step 3: Merge and write ───────────────────────────────────────────────
  const allApps = [...osApps, ...remoteApps];

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output = {
    ...remoteMetadata,
    generatedAt: new Date().toISOString(),
    apps: allApps,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log(
    `✓ Firehose data saved: ${allApps.length} apps (${osApps.length} OS + ${remoteApps.length} other) to ${OUTPUT_FILE}`,
  );
}

fetchFirehoseData().catch((error) => {
  console.error("Fatal error in fetch-firehose:", error);
  // Never fail the build — keep existing file
});
