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
const SBOM_UNAVAILABLE_REASON =
  "SBOM attestation cache not found or empty — run fetch-github-sbom.js first";

const RELEASE_URL_BY_STREAM = {
  "bluefin-stable": "https://github.com/projectbluefin/bluefin/releases",
  "bluefin-lts": "https://github.com/projectbluefin/bluefin-lts/releases",
  "dakota-latest": "https://github.com/projectbluefin/dakota/releases",
  "utah-testing": "https://github.com/projectbluefin/utah/releases",
};

const RELEASE_REPO_BY_STREAM = {
  "bluefin-stable": "projectbluefin/bluefin",
  "bluefin-lts": "projectbluefin/bluefin-lts",
  "dakota-latest": "projectbluefin/dakota",
  "utah-testing": "projectbluefin/utah",
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
  "bluefin-stable": "stable",
  "bluefin-latest": "latest",
  "bluefin-lts": "lts",
  "bluefin-lts-hwe": "lts-hwe",
  "bluefin-dx-stable": "stable",
  "bluefin-dx-latest": "latest",
  "bluefin-dx-lts": "lts",
  "bluefin-gdx-lts": "lts",
  "bluefin-gdx-latest": "latest",
  "dakota-latest": "latest",
};

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function cacheAgeHours(output = readJsonIfExists(OUTPUT_FILE)) {
  const generatedAt = Date.parse(output?.generatedAt || "");
  if (Number.isNaN(generatedAt)) return Number.POSITIVE_INFINITY;
  return (Date.now() - generatedAt) / (1000 * 60 * 60);
}

function writeOutput(output, outputFile = OUTPUT_FILE) {
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf-8");
}

function buildUnavailableOutput(reason = SBOM_UNAVAILABLE_REASON) {
  return {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    historyDays: HISTORY_DAYS,
    streams: [],
    unavailable: true,
    stateReason: reason,
  };
}

function isSbomOutput(output) {
  return (
    !output?.unavailable &&
    Array.isArray(output?.streams) &&
    output.streams.length > 0 &&
    output.streams.every((stream) => stream?.source === "sbom")
  );
}

function requiredStreamIds(sbomCache) {
  const required = ["bluefin-stable", "bluefin-lts"];
  for (const streamId of ["dakota-latest", "utah-testing"]) {
    if (
      Object.keys(sbomCache?.streams?.[streamId]?.releases || {}).length > 0
    ) {
      required.push(streamId);
    }
  }
  return required;
}

function isValidCachedOutput(output, sbomCache) {
  if (!isSbomOutput(output)) return false;

  const cachedStreamIds = new Set(output.streams.map((stream) => stream?.id));
  return requiredStreamIds(sbomCache).every((streamId) =>
    cachedStreamIds.has(streamId),
  );
}

function handleUnavailableCache(
  reason = SBOM_UNAVAILABLE_REASON,
  outputFile = OUTPUT_FILE,
) {
  const existing = readJsonIfExists(outputFile);
  if (isSbomOutput(existing)) {
    console.warn(
      "SBOM attestation cache unavailable. Preserving existing SBOM-derived driver versions.",
    );
    return existing;
  }

  const output = buildUnavailableOutput(reason);
  writeOutput(output, outputFile);
  console.warn(`Driver versions unavailable: ${reason}`);
  return output;
}

function rowFromSbomRelease(
  streamId,
  cacheKey,
  releaseEntry,
  nvidiaVersion,
  hweKernel = null,
) {
  const pkg = releaseEntry?.packageVersions || {};
  const datePart =
    String(cacheKey || releaseEntry?.tag || "").match(/(\d{8})/)?.[1] || null;
  let publishedAt = null;
  if (datePart) {
    publishedAt = datePart.replace(
      /(\d{4})(\d{2})(\d{2})/,
      "$1-$2-$3T00:00:00.000Z",
    );
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

/**
 * Resolves the NVIDIA driver version for a release from a companion stream lookup map.
 * Lookup order:
 * 1. Exact match by release tag or cacheKey
 * 2. Exact match by release date (YYYYMMDD)
 * 3. Most recent companion release whose date is <= this release's date
 * 4. Latest companion release if within reasonable proximity (e.g. 30 days)
 *
 * @param {Record<string, string>} nvidiaByTag - Map of companion release tags/keys to NVIDIA versions
 * @param {object} [entry] - Release entry object
 * @param {string} [cacheKey] - Cache key of the release
 * @param {number} [proximityDays=30] - Proximity threshold in days for fallback
 * @returns {string|null} - Resolved NVIDIA version or null
 */
function resolveCompanionNvidia(
  nvidiaByTag,
  entry,
  cacheKey,
  proximityDays = 30,
) {
  if (!nvidiaByTag || typeof nvidiaByTag !== "object") return null;

  const tag = entry?.tag || cacheKey;

  // 1. Exact string match by tag or cacheKey
  if (tag && nvidiaByTag[tag]) {
    return nvidiaByTag[tag];
  }
  if (cacheKey && nvidiaByTag[cacheKey]) {
    return nvidiaByTag[cacheKey];
  }

  // Extract 8-digit date from tag or cacheKey
  const releaseDateMatch = String(tag || cacheKey || "").match(
    /(\d{4})(\d{2})(\d{2})/,
  );
  if (!releaseDateMatch) {
    return null;
  }

  const [, rYear, rMonth, rDay] = releaseDateMatch;
  const releaseDateStr = `${rYear}${rMonth}${rDay}`;
  const releaseTimestamp = Date.UTC(
    Number(rYear),
    Number(rMonth) - 1,
    Number(rDay),
  );

  // 2. Exact match by date
  if (nvidiaByTag[releaseDateStr]) {
    return nvidiaByTag[releaseDateStr];
  }

  // Gather companion entries with valid dates
  const companionEntries = [];
  for (const [key, version] of Object.entries(nvidiaByTag)) {
    if (!version) continue;
    if (key.includes(releaseDateStr)) {
      return version;
    }
    const match = key.match(/(\d{4})(\d{2})(\d{2})/);
    if (!match) continue;
    const [, cYear, cMonth, cDay] = match;
    const timestamp = Date.UTC(Number(cYear), Number(cMonth) - 1, Number(cDay));
    companionEntries.push({
      key,
      version,
      timestamp,
    });
  }

  if (companionEntries.length === 0) {
    return null;
  }

  // Sort newest companion first
  companionEntries.sort((a, b) => b.timestamp - a.timestamp);

  // 3. Most recent companion release whose date is <= this release's date
  const priorOrSame = companionEntries.filter(
    (c) => c.timestamp <= releaseTimestamp,
  );
  if (priorOrSame.length > 0) {
    return priorOrSame[0].version;
  }

  // 4. Latest companion release if within reasonable proximity
  const latestCompanion = companionEntries[0];
  const proximityMs = proximityDays * 24 * 60 * 60 * 1000;
  if (Math.abs(latestCompanion.timestamp - releaseTimestamp) <= proximityMs) {
    return latestCompanion.version;
  }

  return null;
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

  const allRows = Object.entries(releases)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cacheKey, entry]) => {
      const dateMatch = cacheKey.match(/(\d{8})$/);
      const hweKey =
        dateMatch && hweStreamId
          ? `${SBOM_STREAM_PREFIX[hweStreamId]}-${dateMatch[1]}`
          : null;
      const hweEntry = hweKey ? hweReleases[hweKey] : null;
      const hweKernel = hweEntry?.packageVersions?.kernel || null;
      const pkg = entry?.packageVersions || {};
      const hasPackageVersions = Boolean(
        pkg.kernel || hweKernel || pkg.mesa || pkg.gnome || pkg.nvidia,
      );
      const companionNvidia = hasPackageVersions
        ? resolveCompanionNvidia(nvidiaByTag, entry, cacheKey)
        : null;
      const nvidiaVersion = pkg.nvidia || companionNvidia;
      return rowFromSbomRelease(
        streamId,
        cacheKey,
        entry,
        nvidiaVersion,
        hweKernel,
      );
    })
    .filter((row) => {
      const parsed = Date.parse(row.publishedAt || "");
      return !Number.isNaN(parsed);
    });

  const validRows = allRows.filter((row) => {
    const v = row.versions || {};
    return Boolean(v.kernel || v.hweKernel || v.mesa || v.nvidia || v.gnome);
  });

  validRows.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  const withinCutoff = validRows.filter(
    (row) => Date.parse(row.publishedAt) >= cutoff,
  );
  const history =
    withinCutoff.length < 5 ? validRows.slice(0, 5) : withinCutoff;

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
 * Build an nvidia version lookup map keyed by date tag from a named SBOM stream.
 * @param {object} sbomCache
 * @param {string} streamId  e.g. "bluefin-gdx-lts" or "bluefin-nvidia-open-stable"
 * @returns {Record<string, string>}
 */
function buildNvidiaMapFromSbomStream(sbomCache, streamId) {
  const releases = sbomCache?.streams?.[streamId]?.releases || {};
  const map = {};
  for (const [cacheKey, entry] of Object.entries(releases)) {
    const version = entry?.packageVersions?.nvidia;
    if (!version) continue;
    map[cacheKey] = version;
    const tag = entry?.tag;
    if (tag && tag !== cacheKey) map[tag] = version;
    const dateMatch = String(tag || cacheKey).match(/(\d{8})/);
    if (dateMatch && !map[dateMatch[1]]) {
      map[dateMatch[1]] = version;
    }
  }
  return map;
}

/**
 * Build the NVIDIA lookup map used by the LTS stream.
 * Prefer the dedicated LTS NVIDIA stream and fall back to the legacy stream
 * while older SBOM caches are still in circulation.
 * If neither has entries, fall back to bluefin-nvidia-open-stable.
 * @param {object} sbomCache
 * @returns {Record<string, string>}
 */
function buildLtsNvidiaByTagFromSbom(sbomCache) {
  const ltsNvidia = buildNvidiaMapFromSbomStream(
    sbomCache,
    "bluefin-lts-nvidia",
  );
  if (Object.keys(ltsNvidia).length > 0) {
    return ltsNvidia;
  }
  const gdxLts = buildNvidiaMapFromSbomStream(sbomCache, "bluefin-gdx-lts");
  if (Object.keys(gdxLts).length > 0) {
    return gdxLts;
  }
  return buildNvidiaMapFromSbomStream(sbomCache, "bluefin-nvidia-open-stable");
}

async function main() {
  const sbomCache = readSbomCache(SBOM_FILE);
  const hasSbomStreams =
    sbomCache?.streams &&
    typeof sbomCache.streams === "object" &&
    !Array.isArray(sbomCache.streams);
  const sbomLoaded = Boolean(sbomCache?.generatedAt) && Boolean(hasSbomStreams);
  if (!sbomLoaded) {
    handleUnavailableCache();
    return;
  }

  const populated = Object.values(sbomCache.streams).filter(
    (s) => Object.keys(s?.releases || {}).length > 0,
  ).length;
  if (populated === 0) {
    handleUnavailableCache(
      "SBOM attestation cache contains no release data — run fetch-github-sbom.js first",
    );
    return;
  }
  console.log(
    `SBOM attestation cache loaded (${populated}/${Object.keys(sbomCache.streams).length} streams have release data).`,
  );

  const cachedOutput = readJsonIfExists(OUTPUT_FILE);
  const ageHours = cacheAgeHours(cachedOutput);
  if (
    ageHours < CACHE_MAX_AGE_HOURS &&
    !FORCE_REFRESH &&
    isValidCachedOutput(cachedOutput, sbomCache)
  ) {
    console.log(
      `Driver versions cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
    );
    return;
  }

  const ltsNvidiaByTag = buildLtsNvidiaByTagFromSbom(sbomCache);
  console.log(`LTS nvidia map: ${Object.keys(ltsNvidiaByTag).length} entries`);

  const nvidiaOpenStableByTag = buildNvidiaMapFromSbomStream(
    sbomCache,
    "bluefin-nvidia-open-stable",
  );
  console.log(
    `Nvidia-open stable map: ${Object.keys(nvidiaOpenStableByTag).length} entries`,
  );

  const stableStream = buildStreamFromSbom(
    "bluefin-stable",
    "Bluefin",
    "Current stable stream from projectbluefin/bluefin.",
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy",
    sbomCache,
    nvidiaOpenStableByTag,
  );

  const ltsStream = buildStreamFromSbom(
    "bluefin-lts",
    "Bluefin LTS",
    "Long-term support stream from projectbluefin/bluefin-lts.",
    "sudo bootc switch ghcr.io/projectbluefin/bluefin:lts --enforce-container-sigpolicy",
    sbomCache,
    ltsNvidiaByTag,
    LTS_HISTORY_DAYS,
    "bluefin-lts-hwe",
  );

  const hasSbomDakota =
    Object.keys(sbomCache.streams?.["dakota-latest"]?.releases || {}).length >
    0;
  const dakotaNvidiaByTag = buildNvidiaMapFromSbomStream(
    sbomCache,
    "dakota-nvidia-latest",
  );
  console.log(
    `Dakota nvidia map: ${Object.keys(dakotaNvidiaByTag).length} entries`,
  );
  const dakotaStream = hasSbomDakota
    ? buildStreamFromSbom(
        "dakota-latest",
        "Dakota",
        "GNOME OS-based image from projectbluefin/dakota.",
        "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/dakota:stable",
        sbomCache,
        dakotaNvidiaByTag,
      )
    : null;

  const hasSbomUtah = Boolean(sbomCache.streams?.["utah-testing"]);
  const utahNvidiaByTag = buildNvidiaMapFromSbomStream(
    sbomCache,
    "utah-nvidia-testing",
  );
  console.log(
    `Utah nvidia map: ${Object.keys(utahNvidiaByTag).length} entries`,
  );
  const utahStream = hasSbomUtah
    ? buildStreamFromSbom(
        "utah-testing",
        "Utah",
        "Project Hummingbird-based image from projectbluefin/utah.",
        "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing",
        sbomCache,
        utahNvidiaByTag,
      )
    : null;

  const output = {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    historyDays: HISTORY_DAYS,
    streams: [
      stableStream,
      ltsStream,
      ...(dakotaStream ? [dakotaStream] : []),
      ...(utahStream ? [utahStream] : []),
    ],
  };

  writeOutput(output);
  console.log(`Driver versions data saved to ${OUTPUT_FILE} (SBOM-only)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    handleUnavailableCache(`Driver versions generation failed: ${err.message}`);
  });
}

module.exports = {
  buildUnavailableOutput,
  lookupSbomVersionsForTag,
  rowFromSbomRelease,
  buildStreamFromSbom,
  buildNvidiaMapFromSbomStream,
  buildLtsNvidiaByTagFromSbom,
  resolveCompanionNvidia,
  cacheAgeHours,
  isValidCachedOutput,
  handleUnavailableCache,
};
