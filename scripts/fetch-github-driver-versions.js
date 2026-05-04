const fs = require("fs");
const path = require("path");
const {
  readSbomCache,
  lookupVersionsForRelease,
} = require("./lib/sbom-versions");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "driver-versions.json");
const SBOM_FILE = path.join(OUTPUT_DIR, "sbom-attestations.json");

const CACHE_MAX_AGE_HOURS = Number(
  process.env.DRIVER_VERSIONS_CACHE_HOURS || 168,
);
const HISTORY_DAYS = Number(process.env.DRIVER_VERSIONS_HISTORY_DAYS || 90);
const LTS_HISTORY_DAYS = Number(
  process.env.DRIVER_VERSIONS_LTS_HISTORY_DAYS || 365,
);
const FORCE_REFRESH = process.argv.includes("--force");

const RELEASE_URL_BY_STREAM = {
  "bluefin-stable": "https://github.com/ublue-os/bluefin/releases",
  "bluefin-lts": "https://github.com/ublue-os/bluefin-lts/releases",
  "dakota-latest": "https://github.com/projectbluefin/dakota/releases",
};

const RELEASE_REPO_BY_STREAM = {
  "bluefin-stable": "ublue-os/bluefin",
  "bluefin-lts": "ublue-os/bluefin-lts",
};

/**
 * Look up packageVersions from the SBOM cache for a specific stream + cacheKey.
 * cacheKey format matches fetch-github-sbom.js: e.g. "stable-20260331", "lts-20260331".
 * Returns null if not found.
 */
function lookupSbomVersionsForTag(sbomCache, sbomStreamId, cacheKey) {
  return lookupVersionsForRelease(sbomCache, sbomStreamId, cacheKey);
}

/**
 * Derive the SBOM cache key prefix from a stream ID.
 * The SBOM cache key format is "<streamPrefix>-YYYYMMDD" (e.g. "stable-20260331").
 * sbomStreamId format is "<product>-<streamPrefix>" (e.g. "bluefin-stable",
 * "bluefin-dx-latest", "bluefin-gdx-lts").
 * Strip everything up to and including the last product segment.
 *
 * Explicit map is used instead of string manipulation to be unambiguous:
 */
const SBOM_STREAM_PREFIX = {
  "bluefin-stable":    "stable",
  "bluefin-latest":    "latest",
  "bluefin-lts":       "lts",
  "bluefin-lts-hwe":   "lts-hwe",
  "bluefin-dx-stable": "stable",
  "bluefin-dx-latest": "latest",
  "bluefin-dx-lts":    "lts",
  "bluefin-gdx-lts":   "lts",
  "bluefin-gdx-latest":"latest",
  "dakota-latest":     "latest",
};

function cacheAgeHours() {
  if (!fs.existsSync(OUTPUT_FILE)) return Number.POSITIVE_INFINITY;
  const stats = fs.statSync(OUTPUT_FILE);
  return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
}

function rowFromSbomRelease(streamId, cacheKey, releaseEntry, nvidiaVersion, hweKernel = null) {
  const pkg = releaseEntry?.packageVersions || {};
  const datePart = String(cacheKey || "").match(/(\d{8})$/)?.[1] || null;
  let publishedAt = null;
  if (datePart) {
    publishedAt = datePart.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3T00:00:00.000Z");
  }

  return {
    stream: streamId,
    tag: releaseEntry?.tag || cacheKey,
    title: releaseEntry?.tag || cacheKey,
    releaseUrl: (() => {
      const tag = releaseEntry?.tag || cacheKey;
      const repo = RELEASE_REPO_BY_STREAM[streamId];
      return repo && tag
        ? `https://github.com/${repo}/releases/tag/${tag}`
        : RELEASE_URL_BY_STREAM[streamId] || null;
    })(),
    publishedAt,
    versions: {
      kernel: pkg.kernel || null,
      hweKernel: hweKernel || null,
      mesa: pkg.mesa || null,
      nvidia: nvidiaVersion || null,
      gnome: pkg.gnome || null,
    },
  };
}

function buildStreamFromSbom(
  streamId,
  name,
  subtitle,
  command,
  sbomCache,
  nvidiaByTag,
  historyDays = HISTORY_DAYS,
  hweStreamId = null,
) {
  const stream = sbomCache?.streams?.[streamId];
  const releases = stream?.releases || {};
  const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;

  const hweReleases = hweStreamId
    ? sbomCache?.streams?.[hweStreamId]?.releases || {}
    : {};

  const history = Object.entries(releases)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cacheKey, entry]) => {
      const dateMatch = cacheKey.match(/(\d{8})$/);
      const hweKey = dateMatch && hweStreamId
        ? `${SBOM_STREAM_PREFIX[hweStreamId]}-${dateMatch[1]}`
        : null;
      const hweEntry = hweKey ? hweReleases[hweKey] : null;
      const hweKernel = hweEntry?.packageVersions?.kernel || null;
      return rowFromSbomRelease(
        streamId,
        cacheKey,
        entry,
        nvidiaByTag?.[entry?.tag || cacheKey] || null,
        hweKernel,
      );
    })
    .filter((row) => {
      const parsed = Date.parse(row.publishedAt || "");
      if (Number.isNaN(parsed)) return false;
      return parsed >= cutoff;
    });

  return {
    id: streamId,
    name,
    subtitle,
    command,
    source: "sbom",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

/**
 * Build an nvidia version lookup map from bluefin-gdx-lts SBOM data.
 * After parser.js extracts nvidia-driver, packageVersions.nvidia is populated
 * for each GDX release. Returns a {cacheKey: version} map keyed by the same
 * date keys used in the LTS stream (e.g. "lts-20260502"), so buildStreamFromSbom
 * for the LTS stream can use it as nvidiaByTag.
 * @param {object} sbomCache
 * @returns {Record<string, string>}
 */
function buildGdxNvidiaByTagFromSbom(sbomCache) {
  const releases = sbomCache?.streams?.["bluefin-gdx-lts"]?.releases || {};
  const map = {};
  for (const [cacheKey, entry] of Object.entries(releases)) {
    const version = entry?.packageVersions?.nvidia;
    if (!version) continue;
    map[cacheKey] = version;
    const tag = entry?.tag;
    if (tag && tag !== cacheKey) map[tag] = version;
  }
  return map;
}

async function main() {
  const ageHours = cacheAgeHours();
  if (ageHours < CACHE_MAX_AGE_HOURS && !FORCE_REFRESH) {
    console.log(
      `Driver versions cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
    );
    return;
  }

  const sbomCache = readSbomCache(SBOM_FILE);
  const sbomLoaded =
    Boolean(sbomCache?.generatedAt) && Boolean(sbomCache?.streams);
  if (!sbomLoaded) {
    throw new Error(
      "SBOM attestation cache not found or empty — run fetch-github-sbom.js first",
    );
  }

  const populated = Object.values(sbomCache.streams).filter(
    (s) => Object.keys(s?.releases || {}).length > 0,
  ).length;
  console.log(
    `SBOM attestation cache loaded (${populated}/${Object.keys(sbomCache.streams).length} streams have release data).`,
  );

  const gdxNvidiaByTag = buildGdxNvidiaByTagFromSbom(sbomCache);
  console.log(`GDX nvidia map: ${Object.keys(gdxNvidiaByTag).length} entries`);

  const stableStream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream from ublue-os/bluefin.",
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
    sbomCache,
    {},
  );

  const ltsStream = buildStreamFromSbom(
    "bluefin-lts",
    "Bluefin LTS and GDX",
    "Long-term support stream from ublue-os/bluefin-lts.",
    "sudo bootc switch ghcr.io/ublue-os/bluefin:lts --enforce-container-sigpolicy",
    sbomCache,
    gdxNvidiaByTag,
    LTS_HISTORY_DAYS,
    "bluefin-lts-hwe",
  );

  const hasSbomDakota =
    Object.keys(sbomCache.streams?.["dakota-latest"]?.releases || {}).length > 0;
  const dakotaStream = hasSbomDakota
    ? buildStreamFromSbom(
        "dakota-latest",
        "Dakotaraptor",
        "GNOME OS-based image from projectbluefin/dakota.",
        "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/dakota:latest",
        sbomCache,
        {},
      )
    : null;

  const output = {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    historyDays: HISTORY_DAYS,
    streams: [stableStream, ltsStream, ...(dakotaStream ? [dakotaStream] : [])],
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Driver versions data saved to ${OUTPUT_FILE} (SBOM-only)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  lookupSbomVersionsForTag,
  rowFromSbomRelease,
  buildStreamFromSbom,
  buildGdxNvidiaByTagFromSbom,
};
