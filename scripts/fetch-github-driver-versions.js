const fs = require("fs");
const path = require("path");
const {
  readSbomCache,
  lookupVersionsForRelease,
} = require("./lib/sbom-versions");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "driver-versions.json");
const FEED_BLUEFIN = path.join(
  __dirname,
  "..",
  "static",
  "feeds",
  "bluefin-releases.json",
);
const FEED_LTS = path.join(
  __dirname,
  "..",
  "static",
  "feeds",
  "bluefin-lts-releases.json",
);
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
};

const RELEASE_REPO_BY_STREAM = {
  "bluefin-stable": "ublue-os/bluefin",
  "bluefin-lts": "ublue-os/bluefin-lts",
};

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

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
  "bluefin-dx-stable": "stable",
  "bluefin-dx-latest": "latest",
  "bluefin-dx-lts":    "lts",
  "bluefin-gdx-lts":   "lts",
  "bluefin-gdx-latest":"latest",
};

/**
 * Apply SBOM overlay to a history row in-place.
 * Overlays kernel and mesa from the SBOM cache if available.
 * NVIDIA is intentionally excluded — it is not in the SBOM.
 */
function applySbomOverlay(row, sbomCache, sbomStreamId) {
  if (!sbomCache || !sbomStreamId || !row?.versions) return;

  // Extract YYYYMMDD from tag name (e.g. "stable-20260331" or "lts.20260331")
  const tagStr = String(row.tag || "");
  const dateMatch = tagStr.match(/(\d{8})/);
  if (!dateMatch) return;

  const streamPrefix = SBOM_STREAM_PREFIX[sbomStreamId];
  if (!streamPrefix) {
    console.warn(`    applySbomOverlay: unknown sbomStreamId "${sbomStreamId}" — skipping`);
    return;
  }
  const cacheKey = `${streamPrefix}-${dateMatch[1]}`;

  const sbomV = lookupSbomVersionsForTag(sbomCache, sbomStreamId, cacheKey);
  if (!sbomV) return;

  if (sbomV.kernel) row.versions.kernel = sbomV.kernel;
  if (sbomV.mesa) row.versions.mesa = sbomV.mesa;
  if (sbomV.gnome) row.versions.gnome = sbomV.gnome;
  // NEVER touch row.versions.nvidia or row.versions.hweKernel
}

function cacheAgeHours() {
  if (!fs.existsSync(OUTPUT_FILE)) return Number.POSITIVE_INFINITY;
  const stats = fs.statSync(OUTPUT_FILE);
  return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
}

function splitVersion(raw) {
  if (!raw) return null;
  const parts = String(raw)
    .split("➡️")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(raw).trim();
}

function extractVersionFromMarkdown(content, labels) {
  if (!content) return null;

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `\\|\\s*\\*\\*${escaped}\\*\\*\\s*\\|\\s*([^|]+)\\|`,
      "i",
    );
    const match = content.match(regex);
    if (!match || !match[1]) continue;
    return splitVersion(match[1]);
  }

  return null;
}

function parseDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function tagFromItem(item, fallbackPrefix) {
  const link = item?.link || "";
  const parts = link.split("/");
  const maybeTag = parts[parts.length - 1] || "";
  if (maybeTag) return maybeTag;

  const title = item?.title || "";
  if (title.includes(":")) {
    return title.split(":")[0].trim();
  }

  return `${fallbackPrefix}-unknown`;
}

function buildRow(item, streamId) {
  const content = item?.content || "";
  return {
    stream: streamId,
    tag: tagFromItem(item, streamId),
    title: item?.title || null,
    releaseUrl: item?.link || null,
    publishedAt: parseDate(item?.pubDate || item?.updated || null),
    versions: {
      kernel: extractVersionFromMarkdown(content, ["Kernel"]),
      hweKernel: extractVersionFromMarkdown(content, ["HWE Kernel"]),
      mesa: extractVersionFromMarkdown(content, ["Mesa"]),
      nvidia: extractVersionFromMarkdown(content, ["Nvidia", "NVIDIA"]),
      gnome: extractVersionFromMarkdown(content, ["Gnome", "GNOME"]),
    },
  };
}

function buildRowFromApiRelease(release, streamId) {
  const body = release?.body || "";
  return {
    stream: streamId,
    tag: release?.tag_name || `${streamId}-unknown`,
    title: release?.name || null,
    releaseUrl: release?.html_url || null,
    publishedAt: parseDate(
      release?.published_at || release?.created_at || null,
    ),
    versions: {
      kernel: null,
      hweKernel: null,
      mesa: null,
      nvidia: extractVersionFromMarkdown(body, ["Nvidia", "NVIDIA"]),
      gnome: extractVersionFromMarkdown(body, ["Gnome", "GNOME"]),
    },
  };
}

function rowFromSbomRelease(streamId, cacheKey, releaseEntry, nvidiaVersion) {
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
      hweKernel: null,
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
) {
  const stream = sbomCache?.streams?.[streamId];
  const releases = stream?.releases || {};
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;

  const history = Object.entries(releases)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([cacheKey, entry]) =>
      rowFromSbomRelease(
        streamId,
        cacheKey,
        entry,
        nvidiaByTag?.[entry?.tag || cacheKey] || null,
      ),
    )
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

function normalizeReleaseTag(tag) {
  // GitHub LTS release tags use dots (lts.YYYYMMDD) but SBOM cache keys use
  // hyphens (lts-YYYYMMDD). Normalize so NVIDIA lookups match SBOM entries.
  return typeof tag === "string" ? tag.replace(/^lts\./, "lts-") : tag;
}

function buildNvidiaMap(releases) {
  const map = {};
  for (const release of releases || []) {
    const tag = release?.tag_name;
    if (!tag) continue;
    const normalizedTag = normalizeReleaseTag(tag);
    const version = extractVersionFromMarkdown(release?.body || "", [
      "Nvidia",
      "NVIDIA",
    ]);
    map[normalizedTag] = version;
    // Also key by raw tag so stable-YYYYMMDD lookups (no normalization needed)
    // still resolve correctly without a second pass.
    if (normalizedTag !== tag) map[tag] = version;
  }
  return map;
}

function buildStream(
  streamId,
  name,
  subtitle,
  command,
  feedItems,
  sbomCache,
  historyDays = HISTORY_DAYS,
) {
  const sbomStreamId = streamId; // e.g. "bluefin-stable" or "bluefin-lts"
  const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
  const recentItems = feedItems.filter((item) => {
    const parsed = Date.parse(item?.pubDate || item?.updated || "");
    if (Number.isNaN(parsed)) return false;
    return parsed >= cutoff;
  });

  const history = recentItems.map((item) => {
    const row = buildRow(item, streamId);
    applySbomOverlay(row, sbomCache, sbomStreamId);
    return row;
  });
  return {
    id: streamId,
    name,
    subtitle,
    command,
    source: "release-fallback",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

async function fetchReleases(owner, repo) {
  const releases = [];
  let url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "bluefin-docs-driver-versions",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };

  while (url) {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `GitHub releases API failed for ${owner}/${repo}: ${response.status}`,
      );
    }

    const page = await response.json();
    releases.push(...page);

    const link = response.headers.get("link");
    const next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return releases;
}

function buildStreamFromApi(
  streamId,
  name,
  subtitle,
  command,
  releases,
  tagPrefix,
  sbomCache,
  historyDays = HISTORY_DAYS,
) {
  const sbomStreamId = streamId; // e.g. "bluefin-stable" or "bluefin-lts"
  const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;

  const filtered = releases
    .filter((release) => String(release?.tag_name || "").startsWith(tagPrefix))
    .filter((release) => {
      const parsed = Date.parse(
        release?.published_at || release?.created_at || "",
      );
      if (Number.isNaN(parsed)) return false;
      return parsed >= cutoff;
    })
    .sort(
      (a, b) =>
        Date.parse(b?.published_at || b?.created_at || 0) -
        Date.parse(a?.published_at || a?.created_at || 0),
    );

  const history = filtered.map((release) => {
    const row = buildRowFromApiRelease(release, streamId);
    applySbomOverlay(row, sbomCache, sbomStreamId);
    return row;
  });

  return {
    id: streamId,
    name,
    subtitle,
    command,
    source: "release-fallback",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

async function main() {
  const ageHours = cacheAgeHours();
  if (ageHours < CACHE_MAX_AGE_HOURS && !FORCE_REFRESH) {
    console.log(
      `Driver versions cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
    );
    return;
  }

  // Load SBOM cache if available — used as an overlay on release-based rows.
  // The Releases API is always the primary source of row data so the page is
  // never empty when the SBOM cache is absent, empty, or stale.
  const sbomCache = readSbomCache(SBOM_FILE);
  const sbomLoaded =
    Boolean(sbomCache?.generatedAt) && Boolean(sbomCache?.streams);
  if (sbomLoaded) {
    const populated = Object.values(sbomCache.streams).filter(
      (s) => Object.keys(s?.releases || {}).length > 0,
    ).length;
    console.log(
      `SBOM attestation cache loaded (${populated}/${Object.keys(sbomCache.streams).length} streams have release data).`,
    );
  } else {
    console.warn(
      "SBOM attestation cache not found or empty — kernel/mesa/GNOME versions will be unavailable; NVIDIA from release bodies only.",
    );
  }

  return Promise.all([
    fetchReleases("ublue-os", "bluefin"),
    fetchReleases("ublue-os", "bluefin-lts"),
  ])
    .then(([bluefinReleases, ltsReleases]) => {
      const streams = [
        buildStreamFromApi(
          "bluefin-stable",
          "Bluefin",
          "Current stable stream from ublue-os/bluefin.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
          bluefinReleases,
          "stable-",
          sbomCache,
        ),
        buildStreamFromApi(
          "bluefin-lts",
          "Bluefin LTS",
          "Long-term support stream from ublue-os/bluefin-lts.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:lts --enforce-container-sigpolicy",
          ltsReleases,
          "lts.",
          sbomCache,
          LTS_HISTORY_DAYS,
        ),
      ];

      const output = {
        generatedAt: new Date().toISOString(),
        cacheHours: CACHE_MAX_AGE_HOURS,
        historyDays: HISTORY_DAYS,
        streams,
      };

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
      const sbomNote = sbomLoaded ? " (SBOM overlay applied)" : "";
      console.log(`Driver versions data saved to ${OUTPUT_FILE}${sbomNote}`);
    })
    .catch((error) => {
      console.warn(
        `GitHub releases API failed, falling back to feeds: ${error?.message || "unknown error"}`,
      );
      const bluefinFeed = readJsonIfExists(FEED_BLUEFIN, { items: [] });
      const ltsFeed = readJsonIfExists(FEED_LTS, { items: [] });

      const streams = [
        buildStream(
          "bluefin-stable",
          "Bluefin",
          "Current stable stream from ublue-os/bluefin.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
          bluefinFeed.items || [],
          sbomCache,
        ),
        buildStream(
          "bluefin-lts",
          "Bluefin LTS",
          "Long-term support stream from ublue-os/bluefin-lts.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:lts --enforce-container-sigpolicy",
          ltsFeed.items || [],
          sbomCache,
          LTS_HISTORY_DAYS,
        ),
      ];

      const output = {
        generatedAt: new Date().toISOString(),
        cacheHours: CACHE_MAX_AGE_HOURS,
        historyDays: HISTORY_DAYS,
        streams,
      };

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
      console.log(
        `Driver versions data saved to ${OUTPUT_FILE} (feed fallback)`,
      );
    });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  rowFromSbomRelease,
  buildStreamFromSbom,
};
