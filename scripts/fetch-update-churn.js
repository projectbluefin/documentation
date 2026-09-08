#!/usr/bin/env node
/**
 * scripts/fetch-update-churn.js
 *
 * Automated data pipeline tracking release-over-release update churn,
 * layer reuse efficiency, chunk counts, and zstd compression statistics
 * for Project Bluefin stable release images (Bluefin, Bluefin LTS, Dakota, Utah).
 *
 * Produces static/data/update-churn.json consumed by /analytics.
 *
 * Conforms to the Project Bluefin Agent Operating Contract:
 * - Pure functions exported for offline testing in scripts/fetch-update-churn.test.js
 * - Never fails the build: catches all errors, writes explicit unavailable payloads, exits 0
 * - Stamped with generatedAt ISO timestamp for freshness detection via seed-cache
 * - Preserves historical entries incrementally across runs
 */

const fs = require("fs");
const path = require("path");
const { seedIsFresh } = require("./lib/seed-cache.js");

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "update-churn.json",
);
const SBOM_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "sbom-attestations.json",
);

const CACHE_MAX_AGE_HOURS = Number(process.env.UPDATE_CHURN_CACHE_HOURS || 24);
const FORCE_REFRESH = process.argv.includes("--force");

const IMAGE_CONFIGS = [
  {
    id: "bluefin",
    name: "Bluefin",
    edition: "Flagship Workstation",
    repo: "projectbluefin/bluefin",
    package: "bluefin",
    stream: "stable",
    sbomStreamId: "bluefin-stable-daily",
    defaultTags: [
      "stable-daily-20260530",
      "stable-daily-20260531",
      "stable-daily-20260604",
      "stable-daily-20260606",
      "stable",
    ],
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    edition: "Enterprise Workstation",
    repo: "projectbluefin/bluefin-lts",
    package: "bluefin-lts",
    stream: "stable",
    sbomStreamId: "bluefin-lts",
    defaultTags: [
      "lts.20260530",
      "lts.20260531",
      "lts.20260602",
      "10-20260606",
      "stable",
    ],
  },
  {
    id: "dakota",
    name: "Project Bluefin Dakota",
    edition: "Next-Gen Workstation",
    repo: "projectbluefin/dakota",
    package: "dakota",
    stream: "stable",
    sbomStreamId: "dakota-latest",
    defaultTags: [
      "latest.20260114",
      "latest.20260115",
      "latest-20260503",
      "latest-20260608",
      "latest-20260620",
      "latest-20260621",
      "stable",
    ],
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Workstation",
    repo: "projectbluefin/utah",
    package: "utah",
    stream: "testing",
    sbomStreamId: "utah-testing",
    defaultTags: [],
  },
];

/**
 * Pure function: Analyzes layer descriptors of an OCI manifest.
 * @param {Array<{ digest: string, size: number, mediaType?: string, annotations?: Record<string, string> }>} layers
 */
function analyzeManifestLayers(layers = []) {
  const safeLayers = Array.isArray(layers) ? layers : [];
  let totalBytes = 0;
  let zstdLayers = 0;
  let zstdBytes = 0;
  let gzipLayers = 0;
  let gzipBytes = 0;

  for (const l of safeLayers) {
    const size = typeof l.size === "number" ? l.size : 0;
    totalBytes += size;

    const mediaType = String(l.mediaType || "");
    const annotations = l.annotations || {};
    const isZstdChunked =
      mediaType.includes("zstd") ||
      Boolean(
        annotations["io.github.containers.zstd-chunked.manifest-checksum"],
      );

    if (isZstdChunked) {
      zstdLayers++;
      zstdBytes += size;
    } else if (mediaType.includes("gzip")) {
      gzipLayers++;
      gzipBytes += size;
    }
  }

  const totalLayers = safeLayers.length;
  let compressionFormat = "uncompressed";
  if (zstdLayers === totalLayers && totalLayers > 0) {
    compressionFormat = "zstd-chunked";
  } else if (zstdLayers > 0) {
    compressionFormat = "mixed";
  } else if (gzipLayers > 0) {
    compressionFormat = "gzip";
  }

  return {
    totalBytes,
    totalLayers,
    zstdLayers,
    zstdBytes,
    gzipLayers,
    gzipBytes,
    compressionFormat,
  };
}

/**
 * Pure function: Computes delta churn and layer reuse between consecutive releases.
 * @param {Array<{ digest: string, size: number }>} prevLayers
 * @param {Array<{ digest: string, size: number, mediaType?: string, annotations?: Record<string, string> }>} currLayers
 */
function diffReleaseLayers(prevLayers, currLayers) {
  const currentAnalysis = analyzeManifestLayers(currLayers);
  const { totalBytes, totalLayers, zstdLayers, zstdBytes, compressionFormat } =
    currentAnalysis;

  if (!prevLayers || prevLayers.length === 0) {
    return {
      sharedBytes: 0,
      sharedMB: 0,
      downloadChurnBytes: totalBytes,
      downloadChurnMB: Number((totalBytes / (1024 * 1024)).toFixed(1)),
      totalBytes,
      totalMB: Number((totalBytes / (1024 * 1024)).toFixed(1)),
      sharedLayers: 0,
      newLayers: totalLayers,
      totalLayers,
      zstdLayers,
      zstdBytes,
      compressionFormat,
      reuseEfficiencyPct: 0,
      isBaseline: true,
    };
  }

  const prevDigests = new Set(
    (Array.isArray(prevLayers) ? prevLayers : [])
      .map((l) => l.digest)
      .filter(Boolean),
  );

  let sharedBytes = 0;
  let sharedLayers = 0;
  let newBytes = 0;
  let newLayers = 0;

  for (const l of currLayers || []) {
    const size = typeof l.size === "number" ? l.size : 0;
    if (l.digest && prevDigests.has(l.digest)) {
      sharedBytes += size;
      sharedLayers++;
    } else {
      newBytes += size;
      newLayers++;
    }
  }

  const reuseEfficiencyPct =
    totalBytes > 0 ? Number(((sharedBytes / totalBytes) * 100).toFixed(1)) : 0;

  return {
    sharedBytes,
    sharedMB: Number((sharedBytes / (1024 * 1024)).toFixed(1)),
    downloadChurnBytes: newBytes,
    downloadChurnMB: Number((newBytes / (1024 * 1024)).toFixed(1)),
    totalBytes,
    totalMB: Number((totalBytes / (1024 * 1024)).toFixed(1)),
    sharedLayers,
    newLayers,
    totalLayers,
    zstdLayers,
    zstdBytes,
    compressionFormat,
    reuseEfficiencyPct,
    isBaseline: false,
  };
}

/**
 * Pure function: Calculates churn history given an ordered list of release manifests.
 * @param {Array<{ tag: string, date?: string, layers: Array<{ digest: string, size: number }> }>} releases
 */
function calculateReleaseChurn(releases = []) {
  if (!Array.isArray(releases) || releases.length === 0) {
    return [];
  }

  const results = [];
  let prevLayers = null;
  let prevTag = null;

  for (const rel of releases) {
    const diff = diffReleaseLayers(prevLayers, rel.layers);
    results.push({
      tag: rel.tag,
      date: rel.date || extractDateFromTag(rel.tag),
      previousTag: prevTag,
      downloadChurnMB: diff.downloadChurnMB,
      sharedMB: diff.sharedMB,
      totalMB: diff.totalMB,
      reuseEfficiencyPct: diff.reuseEfficiencyPct,
      totalLayers: diff.totalLayers,
      sharedLayers: diff.sharedLayers,
      newLayers: diff.newLayers,
      zstdLayers: diff.zstdLayers,
      compressionFormat: diff.compressionFormat,
      isBaseline: diff.isBaseline,
    });
    prevLayers = rel.layers;
    prevTag = rel.tag;
  }

  return results;
}

/**
 * Extract an ISO date substring (YYYY-MM-DD) from a tag if available.
 */
function extractDateFromTag(tag = "") {
  const match = /(\d{4})(\d{2})(\d{2})/.exec(tag);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch raw OCI manifest or index from GHCR via HTTPS.
 */
async function fetchGhcrManifest(repo, tagOrDigest) {
  try {
    const tokenRes = await fetch(
      `https://ghcr.io/token?service=ghcr.io&scope=repository:${repo}:pull`,
    );
    if (!tokenRes.ok) return null;
    const { token } = await tokenRes.json();
    if (!token) return null;

    const res = await fetch(
      `https://ghcr.io/v2/${repo}/manifests/${tagOrDigest}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json",
        },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Resolves platform layers (amd64/linux by default) for an image tag.
 */
async function getPlatformLayers(repo, tag) {
  const manifest = await fetchGhcrManifest(repo, tag);
  if (!manifest) return null;

  if (manifest.manifests && Array.isArray(manifest.manifests)) {
    const amd =
      manifest.manifests.find(
        (m) =>
          m.platform?.architecture === "amd64" && m.platform?.os === "linux",
      ) || manifest.manifests[0];
    if (amd?.digest) {
      const platformManifest = await fetchGhcrManifest(repo, amd.digest);
      if (platformManifest?.layers) {
        return platformManifest.layers;
      }
    }
  }

  return manifest.layers || [];
}

/**
 * Main execution function.
 */
async function main() {
  if (!FORCE_REFRESH && seedIsFresh(OUTPUT_FILE, CACHE_MAX_AGE_HOURS)) {
    console.log(
      `fetch-update-churn: cache is fresh (<${CACHE_MAX_AGE_HOURS}h), skipping.`,
    );
    return;
  }

  console.log(
    "fetch-update-churn: computing release update churn across Project Bluefin images...",
  );

  // Load existing cached data to avoid re-fetching unchanged tags
  let existingData = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    } catch {
      existingData = null;
    }
  }

  // Load SBOM cache if present to discover any newly tracked releases
  let sbomCache = null;
  if (fs.existsSync(SBOM_FILE)) {
    try {
      sbomCache = JSON.parse(fs.readFileSync(SBOM_FILE, "utf8"));
    } catch {
      sbomCache = null;
    }
  }

  const imagesOutput = {};

  for (const config of IMAGE_CONFIGS) {
    const { id, name, edition, repo, stream, sbomStreamId, defaultTags } =
      config;

    // Collect tags from config + SBOM cache
    const tagsToInspect = [...defaultTags];
    if (sbomCache?.streams?.[sbomStreamId]?.releases) {
      const sbomReleases = Object.keys(
        sbomCache.streams[sbomStreamId].releases,
      );
      for (const t of sbomReleases) {
        if (!tagsToInspect.includes(t)) {
          tagsToInspect.push(t);
        }
      }
    }

    if (tagsToInspect.length === 0) {
      imagesOutput[id] = {
        id,
        name,
        edition,
        package: repo,
        stream,
        unavailable: true,
        stateReason: `No stable releases available yet — ${name} is under active development`,
        releases: [],
      };
      continue;
    }

    const releaseManifests = [];
    for (const tag of tagsToInspect) {
      const layers = await getPlatformLayers(repo, tag);
      if (layers && layers.length > 0) {
        releaseManifests.push({
          tag,
          date: extractDateFromTag(tag),
          layers,
        });
      }
    }

    if (releaseManifests.length === 0) {
      // Check if we have existing cached release data for this image
      if (existingData?.images?.[id] && !existingData.images[id].unavailable) {
        imagesOutput[id] = existingData.images[id];
      } else {
        imagesOutput[id] = {
          id,
          name,
          edition,
          package: repo,
          stream,
          unavailable: true,
          stateReason: `Manifests temporarily unavailable for ${name} from registry`,
          releases: [],
        };
      }
      continue;
    }

    const releasesChurn = calculateReleaseChurn(releaseManifests);

    imagesOutput[id] = {
      id,
      name,
      edition,
      package: repo,
      stream,
      unavailable: false,
      releases: releasesChurn,
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "GHCR OCI Manifests & Attestations",
    method: "oci-layer-diff-v1",
    unit: "MB",
    images: imagesOutput,
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
  console.log(`fetch-update-churn: wrote ${OUTPUT_FILE}`);
}

module.exports = {
  OUTPUT_FILE,
  SBOM_FILE,
  CACHE_MAX_AGE_HOURS,
  IMAGE_CONFIGS,
  analyzeManifestLayers,
  diffReleaseLayers,
  calculateReleaseChurn,
  extractDateFromTag,
  fetchGhcrManifest,
  getPlatformLayers,
  main,
};

// Only execute when invoked directly
if (require.main === module) {
  main().catch((err) => {
    console.error("fetch-update-churn error:", err.message);
    const fallback = {
      generatedAt: new Date().toISOString(),
      source: "GHCR OCI Manifests",
      method: "oci-layer-diff-v1",
      unit: "MB",
      unavailable: true,
      stateReason: err.message,
      images: {
        bluefin: { unavailable: true, stateReason: err.message, releases: [] },
        "bluefin-lts": {
          unavailable: true,
          stateReason: err.message,
          releases: [],
        },
        dakota: { unavailable: true, stateReason: err.message, releases: [] },
        utah: { unavailable: true, stateReason: err.message, releases: [] },
      },
    };
    try {
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(fallback, null, 2) + "\n",
        "utf8",
      );
    } catch {
      // ignore
    }
    process.exit(0);
  });
}
