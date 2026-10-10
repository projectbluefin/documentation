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
const FORCE_REFRESH = process.argv.includes("--force");
const SBOM_UNAVAILABLE_REASON =
  "SBOM attestation cache not found or empty — run fetch-github-sbom.js first";

const RELEASE_URL_BY_STREAM = {
  "bluefin-stable": "https://github.com/ublue-os/bluefin/releases",
  "dakota-stable": "https://github.com/projectbluefin/dakota/releases",
  "utah-testing": "https://github.com/projectbluefin/utah/releases",
  "bluefin-server": "https://github.com/projectbluefin/server/releases",
};

const RELEASE_REPO_BY_STREAM = {
  "bluefin-stable": "ublue-os/bluefin",
  "dakota-stable": "projectbluefin/dakota",
  "utah-testing": "projectbluefin/utah",
  "bluefin-server": "projectbluefin/server",
};

/**
 * Look up packageVersions from the SBOM cache for a specific stream + cacheKey.
 * cacheKey format matches fetch-github-sbom.js: e.g. "stable-20260331".
 * Returns null if not found.
 */
function lookupSbomVersionsForTag(sbomCache, sbomStreamId, cacheKey) {
  return lookupVersionsForRelease(sbomCache, sbomStreamId, cacheKey);
}

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
  const required = ["bluefin-stable", "utah-testing"];
  for (const streamId of ["dakota-stable"]) {
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
  return (
    output.streams.every((stream) => {
      if (stream.id === "bluefin-server") {
        return (
          RELEASE_URL_BY_STREAM[stream.id] &&
          stream.command === null &&
          stream.imageRef === null
        );
      }
      const expectedRef = `ghcr.io/${RELEASE_REPO_BY_STREAM[stream.id]}:${stream.id === "utah-testing" ? "testing" : "stable"}`;
      const unavailableUtah =
        stream.id === "utah-testing" &&
        stream.imageRef === null &&
        (!sbomCache ||
          !Object.keys(sbomCache.streams?.["utah-testing"]?.releases || {})
            .length);
      return (
        RELEASE_URL_BY_STREAM[stream.id] &&
        (stream.imageRef === expectedRef || unavailableUtah)
      );
    }) &&
    requiredStreamIds(sbomCache).every((streamId) =>
      cachedStreamIds.has(streamId),
    )
  );
}

function handleUnavailableCache(
  reason = SBOM_UNAVAILABLE_REASON,
  outputFile = OUTPUT_FILE,
) {
  const existing = readJsonIfExists(outputFile);
  if (isValidCachedOutput(existing, null)) {
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

function rowFromSbomRelease(streamId, cacheKey, releaseEntry, nvidiaVersion) {
  const pkg = releaseEntry?.packageVersions || {};
  const datePart =
    String(cacheKey || releaseEntry?.tag || "").match(/(\d{8})/)?.[1] || null;
  let publishedAt = null;
  if (datePart) {
    publishedAt = datePart.replace(
      /(\d{4})(\d{2})(\d{2})/,
      "$1-$2-$3T00:00:00.000Z",
    );
  } else if (releaseEntry?.checkedAt) {
    publishedAt = releaseEntry.checkedAt;
  }

  return {
    stream: streamId,
    tag: releaseEntry?.tag || cacheKey,
    title: releaseEntry?.tag || cacheKey,
    releaseUrl: (() => {
      if (releaseEntry?.releaseUrl) return releaseEntry.releaseUrl;
      const tag = releaseEntry?.tag;
      const repo = RELEASE_REPO_BY_STREAM[streamId];
      return repo && typeof tag === "string" && /[.-]\d{8}$/.test(tag)
        ? `https://github.com/${repo}/releases/tag/${tag}`
        : RELEASE_URL_BY_STREAM[streamId] || null;
    })(),
    imageRef: /[.-]\d{8}$/.test(releaseEntry?.tag || "")
      ? releaseEntry?.imageRef || null
      : null,
    publishedAt,
    versions: {
      kernel: pkg.kernel || null,
      mesa: pkg.mesa || null,
      nvidia: nvidiaVersion || null,
      gnome: pkg.gnome || null,
      systemd: pkg.systemd || null,
      bootc: pkg.bootc || null,
      pipewire: pkg.pipewire || null,
      zfs: pkg.zfs || null,
      k0s: pkg.k0s || null,
      containerToolkit: pkg.containerToolkit || null,
    },
  };
}

/** A companion version is valid only for the same stream release key. */
function resolveCompanionNvidia(nvidiaByTag, cacheKey) {
  return nvidiaByTag?.[cacheKey] || null;
}

function buildStreamFromSbom(
  streamId,
  name,
  subtitle,
  command,
  sbomCache,
  nvidiaByTag,
  historyDays = HISTORY_DAYS,
) {
  const stream = sbomCache?.streams?.[streamId];
  const releases = stream?.releases || {};
  const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;

  const allRows = Object.entries(releases)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cacheKey, entry]) => {
      const pkg = entry?.packageVersions || {};
      const hasPackageVersions = Boolean(
        pkg.kernel || pkg.mesa || pkg.gnome || pkg.nvidia,
      );
      const companionNvidia = hasPackageVersions
        ? resolveCompanionNvidia(nvidiaByTag, cacheKey)
        : null;
      const nvidiaVersion = pkg.nvidia || companionNvidia;
      return rowFromSbomRelease(streamId, cacheKey, entry, nvidiaVersion);
    })
    .filter((row) => {
      const parsed = Date.parse(row.publishedAt || "");
      return !Number.isNaN(parsed);
    });

  const validRows = allRows.filter((row) => {
    const v = row.versions || {};
    return Boolean(
      v.kernel || v.mesa || v.nvidia || v.gnome || v.systemd || v.zfs || v.k0s,
    );
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
    imageRef: command
      ? streamId === "bluefin-stable"
        ? "ghcr.io/ublue-os/bluefin:stable"
        : streamId === "dakota-stable"
          ? "ghcr.io/projectbluefin/dakota:stable"
          : "ghcr.io/projectbluefin/utah:testing"
      : null,
    source: "sbom",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

/** NVIDIA companion releases are indexed only by their own cache key. */
function buildNvidiaMapFromSbomStream(sbomCache, streamId) {
  const stream = sbomCache?.streams?.[streamId];
  const expectedPackage = {
    "bluefin-nvidia-open-stable": "ublue-os/bluefin-nvidia-open",
    "dakota-nvidia-stable": "projectbluefin/dakota-nvidia",
    "utah-nvidia-testing": "projectbluefin/utah-nvidia",
  }[streamId];
  if (
    !expectedPackage ||
    `${stream?.org}/${stream?.package}` !== expectedPackage
  )
    return {};
  const releases = stream.releases || {};
  const map = {};
  for (const [cacheKey, entry] of Object.entries(releases)) {
    if (entry?.packageVersions?.nvidia)
      map[cacheKey] = entry.packageVersions.nvidia;
  }
  return map;
}

async function main() {
  const sbomCache = readSbomCache(SBOM_FILE);
  const hasSbomStreams =
    sbomCache?.streams &&
    typeof sbomCache.streams === "object" &&
    !Array.isArray(sbomCache.streams);
  const sbomLoaded =
    Boolean(sbomCache?.generatedAt) &&
    Boolean(hasSbomStreams) &&
    sbomCache.streams?.["bluefin-stable"]?.org === "ublue-os" &&
    sbomCache.streams["bluefin-stable"].package === "bluefin";
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
    "Current stable stream from ublue-os/bluefin.",
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
    sbomCache,
    nvidiaOpenStableByTag,
  );

  const hasSbomDakota =
    Object.keys(sbomCache.streams?.["dakota-stable"]?.releases || {}).length >
    0;
  const dakotaNvidiaByTag = buildNvidiaMapFromSbomStream(
    sbomCache,
    "dakota-nvidia-stable",
  );
  console.log(
    `Dakota nvidia map: ${Object.keys(dakotaNvidiaByTag).length} entries`,
  );
  const dakotaStream = hasSbomDakota
    ? buildStreamFromSbom(
        "dakota-stable",
        "Dakota",
        "GNOME OS-based image from projectbluefin/dakota.",
        "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/dakota:stable",
        sbomCache,
        dakotaNvidiaByTag,
      )
    : null;

  const hasSbomUtah =
    Object.keys(sbomCache.streams?.["utah-testing"]?.releases || {}).length > 0;
  const utahNvidiaByTag = buildNvidiaMapFromSbomStream(
    sbomCache,
    "utah-nvidia-testing",
  );
  console.log(
    `Utah nvidia map: ${Object.keys(utahNvidiaByTag).length} entries`,
  );
  const utahStream = buildStreamFromSbom(
    "utah-testing",
    "Utah",
    "Project Hummingbird-based image from projectbluefin/utah.",
    hasSbomUtah
      ? "sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/utah:testing"
      : null,
    sbomCache,
    utahNvidiaByTag,
  );
  const hasSbomServer =
    Object.keys(sbomCache.streams?.["bluefin-server"]?.releases || {}).length >
    0;
  const serverStream = hasSbomServer
    ? buildStreamFromSbom(
        "bluefin-server",
        "Bluefin Server",
        "FSDK-based DDI server image from projectbluefin/server.",
        null,
        sbomCache,
        {},
      )
    : null;

  const output = {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    historyDays: HISTORY_DAYS,
    streams: [
      ...(dakotaStream ? [dakotaStream] : []),
      ...(serverStream ? [serverStream] : []),
      stableStream,
      utahStream,
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
  resolveCompanionNvidia,
  cacheAgeHours,
  isValidCachedOutput,
  handleUnavailableCache,
};
