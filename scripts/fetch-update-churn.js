#!/usr/bin/env node
/**
 * scripts/fetch-update-churn.js
 *
 * Automated data pipeline tracking release-over-release update churn,
 * layer reuse efficiency, chunk counts, and zstd compression statistics
 * for Project Bluefin stable release images (Bluefin, Dakota, Utah).
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
const { fetchGhcrTags } = require("./lib/sbom/api.js");

/**
 * A GitHub token for the packages API, if this environment has one. The
 * packages API is the only source of a per-tag build time, and it is
 * authenticated; the OCI `tags/list` endpoint carries no timestamps at all.
 */
function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

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

/** Per-page request size to the GitHub packages versions API. */
const GHCR_TAG_CREATED_AT_PER_PAGE = 100;

/** Hard upper limit on pages fetched for `created_at` lookup.
 *
 * The packages API returns 100 versions per page. An image that ships many
 * builds per day (Utah publishes 5-7) accumulates versions faster than the
 * default 2-page cap covers, so older same-day tags fall off the window and
 * `compareTagsByDate` reverts to tag-text ordering — which reverses the
 * directional diff that drives the churn chart. When a caller hands us the
 * matched tag set, we paginate until every requested tag has a timestamp or
 * we hit this ceiling; either way the caller sees exactly how many timestamps
 * we could not recover.
 */
const GHCR_TAG_CREATED_AT_MAX_PAGES = 10;

/**
 * Utah publishes one dated tag per build: `testing-YYYYMMDD-<short-sha>`.
 * Those tags are the only second point Utah has — the floating `testing` tag
 * names a different manifest after every build, so it can never produce a delta.
 */
const UTAH_DATED_TAG = /^testing-\d{8}-[0-9a-f]{7,40}$/;

/** How many dated Utah builds the churn series follows. */
const UTAH_TAG_LIMIT = 14;

const IMAGE_CONFIGS = [
  {
    id: "bluefin",
    name: "Bluefin",
    edition: "Flagship Workstation",
    repo: "ublue-os/bluefin",
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
    id: "dakota",
    name: "Project Bluefin Dakota",
    edition: "Next-Gen Workstation",
    repo: "projectbluefin/dakota",
    package: "dakota",
    stream: "stable",
    sbomStreamId: "dakota-stable",
    defaultTags: ["stable"],
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Workstation",
    repo: "projectbluefin/utah",
    package: "utah",
    stream: "testing",
    sbomStreamId: "utah-testing",
    // Seed series, so Utah still renders a delta if tag listing is unavailable
    // on a given run. `tagSeries` keeps extending it from the registry below.
    defaultTags: [
      "testing-20260926-be64d10",
      "testing-20260926-34c0f13",
      "testing-20260926-e54be2e",
      "testing-20260927-08286da",
      "testing-20260927-56e4e2d",
      "testing-20260927-f5f4053",
      "testing-20260928-ce09ef7",
      "testing-20260929-815ea44",
    ],
    // A hand-maintained tag list goes stale the day after it is written, and a
    // stale list is indistinguishable from an image that stopped shipping. The
    // registry is the source of truth, so read the series from it.
    tagSeries: { pattern: UTAH_DATED_TAG, limit: UTAH_TAG_LIMIT },
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
 * Pure function: The YYYYMMDD stamp a tag carries, or "" when it carries none.
 */
function datedTagKey(tag = "") {
  const match = /(\d{4})(\d{2})(\d{2})/.exec(String(tag));
  return match ? `${match[1]}${match[2]}${match[3]}` : "";
}

/**
 * Pure function: Sorts tags oldest-first by the date they carry, then by the
 * registry's build time, and only then by tag text.
 *
 * A tag that carries no date at all is a floating name (`stable`, `testing`)
 * that always points at the newest manifest, so it sorts *after* every dated
 * tag. Sorting it first would make it the series baseline and turn the first
 * delta into a backwards diff against an older dated build.
 *
 * The tie-break matters: an image that ships several builds a day carries the
 * same YYYYMMDD on each of them, and `diffReleaseLayers` is directional (churn
 * is the layers in N absent from N-1, reuse % is relative to N), so a
 * same-day pair compared in the wrong direction reports different numbers than
 * the one a user actually performs. Tag text is not a build time — `362ea44`
 * sorts before `815ea44` while being the newer build — so it is the last
 * resort, used only for tags the packages API had no `created_at` for.
 *
 * @param {string} a
 * @param {string} b
 * @param {Record<string, string>} [createdAt] tag -> ISO build timestamp
 */
function compareTagsByDate(a, b, createdAt = {}) {
  const keyA = datedTagKey(a);
  const keyB = datedTagKey(b);
  if (!keyA !== !keyB) return keyA ? -1 : 1;
  const dateDelta = keyA.localeCompare(keyB);
  if (dateDelta !== 0) return dateDelta;
  const builtA = createdAt?.[a];
  const builtB = createdAt?.[b];
  if (builtA && builtB && builtA !== builtB) {
    return String(builtA).localeCompare(String(builtB));
  }
  return String(a).localeCompare(String(b));
}

/**
 * Pure function: Picks the most recent `limit` tags matching `pattern`, in
 * chronological order. A tag set that grows daily must be trimmed from the
 * front, or the series is the registry's entire history rather than the churn
 * the dashboard charts.
 *
 * @param {string[]} tags  Every tag the registry lists for the package.
 * @param {{ pattern?: RegExp, limit?: number }} series
 * @param {Record<string, string>} [createdAt] tag -> ISO build timestamp
 * @returns {string[]}
 */
function selectDatedTags(tags = [], series = {}, createdAt = {}) {
  const { pattern, limit } = series || {};
  if (
    !Array.isArray(tags) ||
    !pattern ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return [];
  }
  const matched = [
    ...new Set(tags.filter((t) => typeof t === "string" && pattern.test(t))),
  ];
  if (matched.length === 0) return [];
  return matched
    .sort((a, b) => compareTagsByDate(a, b, createdAt))
    .slice(-limit);
}

/**
 * Pure function: Narrows matched tags to the ones that can land in the charted
 * window, so the build-time lookup only has to cover those.
 *
 * The YYYYMMDD component orders tags reliably across days; only same-day ties
 * need a registry timestamp. Taking whole date groups, newest first, until at
 * least `limit` tags are collected yields a superset of whatever
 * `selectDatedTags` keeps once build times break the ties. Undated tags sort
 * after every dated one, so they are always candidates.
 *
 * @param {string[]} matches tags already filtered by the series pattern
 * @param {number} limit size of the charted window
 * @returns {string[]}
 */
function selectWindowCandidates(matches = [], limit) {
  if (!Array.isArray(matches)) return [];
  const unique = [...new Set(matches.filter((t) => typeof t === "string"))];
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const byDate = new Map();
  const undated = [];
  for (const tag of unique) {
    const key = datedTagKey(tag);
    if (!key) {
      undated.push(tag);
      continue;
    }
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(tag);
  }
  const candidates = [...undated];
  const dates = [...byDate.keys()].sort().reverse();
  for (const date of dates) {
    if (candidates.length >= limit) break;
    candidates.push(...byDate.get(date));
  }
  return candidates;
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
 * Fetch a per-tag build time for a GHCR package from the GitHub packages API.
 *
 * The OCI `tags/list` endpoint returns names only, so the registry cannot
 * break a same-day tie on its own. Each package version carries `created_at`
 * and the tags pointing at it, which is exactly the ordering signal the churn
 * series needs.
 *
 * Returns `{}` — never throws — when the API is unreachable, unauthenticated or
 * rate-limited. `compareTagsByDate` then falls back to tag text, which is a
 * documented approximation, not a crash.
 *
 * When `requiredTags` is provided, pagination continues past the default
 * two-page window until every requested tag has a timestamp, or until
 * `GHCR_TAG_CREATED_AT_MAX_PAGES` is hit. An image that ships many builds per
 * day accumulates package versions faster than the default cap covers, so
 * older same-day tags fall off the window and `compareTagsByDate` reverts to
 * tag-text ordering — which reverses the directional diff that drives the
 * churn chart. The default cap is a safety ceiling on tokens consumed per
 * run, not the work the function intends to do.
 *
 * @param {string} org
 * @param {string} pkg
 * @param {number} [maxPages=2] page ceiling when `requiredTags` is empty.
 *   With `requiredTags`, the ceiling is raised to at least
 *   GHCR_TAG_CREATED_AT_MAX_PAGES so the lookup can reach every requested tag.
 * @param {string[]} [requiredTags] tags the caller will sort on; pagination
 *   continues until every entry has a timestamp or the ceiling is hit.
 * @returns {Promise<Record<string, string>>} tag -> ISO 8601 build timestamp
 */
async function fetchGhcrTagCreatedAt(
  org,
  pkg,
  maxPages = 2,
  requiredTags = null,
) {
  const token = githubToken();
  const createdAt = {};
  if (!token) {
    // #1434 asks for a warning on the no-token path (not just the 403 catch),
    // so a run without GITHUB_TOKEN surfaces the gap instead of silently
    // degrading. The early return keeps the "never throws" contract.
    console.warn(
      "fetch-update-churn: no GITHUB_TOKEN configured for this repo — build " +
        "timestamps unavailable; falling back to tag-text ordering within a day. " +
        "Set GITHUB_TOKEN (with packages read access) to read per-tag build times.",
    );
    return createdAt;
  }
  if (!org || !pkg) return createdAt;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "BluefinDocsChurn/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const requested = Array.isArray(requiredTags)
    ? new Set(requiredTags.filter((t) => typeof t === "string"))
    : null;
  const pageBudget =
    requested && requested.size > 0
      ? Math.max(maxPages, GHCR_TAG_CREATED_AT_MAX_PAGES)
      : maxPages;

  try {
    let url =
      `https://api.github.com/orgs/${org}/packages/container/` +
      `${encodeURIComponent(pkg)}/versions?per_page=${GHCR_TAG_CREATED_AT_PER_PAGE}`;
    for (let page = 0; url && page < pageBudget; page += 1) {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        // 404 = package unknown to the API, 403 = scope or rate limit. Either
        // way the caller keeps working with the text tie-break.
        throw new Error(`HTTP ${res.status}`);
      }
      const versions = await res.json();
      if (!Array.isArray(versions)) break;
      for (const version of versions) {
        const built = version?.created_at;
        const tags = version?.metadata?.container?.tags;
        if (!built || !Array.isArray(tags)) continue;
        for (const tag of tags) {
          // The API lists versions newest-first and a tag can survive more
          // than one version, so the first hit is the newest build carrying
          // the name — which is the manifest the tag resolves to today.
          if (typeof tag === "string" && !createdAt[tag])
            createdAt[tag] = built;
        }
      }
      // Once every tag the caller asked about has a timestamp, additional
      // pages would only widen the data window without changing the order of
      // the series the caller is going to chart.
      if (
        requested &&
        requested.size > 0 &&
        allRequestedCovered(requested, createdAt)
      ) {
        break;
      }
      url =
        res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/i)?.[1] || null;
      if (url) url = new URL(url, res.url).href;
    }
    if (requested && requested.size > 0) {
      const missing = [...requested].filter((t) => !createdAt[t]);
      if (missing.length > 0) {
        console.warn(
          `fetch-update-churn: ${org}/${pkg} build timestamps incomplete — ` +
            `${missing.length} requested tag(s) had no created_at within ` +
            `${pageBudget} page(s): ${missing.slice(0, 5).join(", ")}` +
            (missing.length > 5 ? ", …" : "") +
            "; falling back to tag-text ordering for those tags",
        );
      }
    }
  } catch (err) {
    console.warn(
      `fetch-update-churn: build timestamps unavailable for ${org}/${pkg} — ` +
        `${err.message}; falling back to tag-text ordering within a day`,
    );
    return {};
  }

  return createdAt;
}

/**
 * Pure helper: did we collect a `created_at` for every requested tag?
 *
 * @param {Set<string>} requested
 * @param {Record<string, string>} createdAt
 * @returns {boolean}
 */
function allRequestedCovered(requested, createdAt) {
  for (const tag of requested) {
    if (!createdAt[tag]) return false;
  }
  return true;
}

/**
 * Resolve an image's published tag series from GHCR.
 *
 * Never throws and never exits non-zero: an unreachable or unauthorized tag
 * listing degrades to the config's seed tags, which is the same shape of gap
 * the rest of this pipeline already represents with `unavailable`.
 *
 * @returns {Promise<{ tags: string[], createdAt: Record<string, string>, listed: boolean }>}
 */
async function discoverSeriesTags(repo, series) {
  const [org, pkg] = String(repo || "").split("/");
  if (!org || !pkg) return { tags: [], createdAt: {}, listed: false };
  try {
    const allTags = await fetchGhcrTags(org, pkg);
    // The window has to be picked with the same ordering the chart uses, so
    // the build times come first: trimming by tag text and then charting by
    // build time can drop the wrong half of a same-day pair at the edge.
    const matches = (Array.isArray(allTags) ? allTags : []).filter(
      (t) => typeof t === "string" && series?.pattern?.test(t),
    );
    if (matches.length === 0) return { tags: [], createdAt: {}, listed: false };
    // Only tags that can land in the charted window need a `created_at`; the
    // registry's full dated history reaches far past the pagination ceiling.
    // The default two-page window only sees the newest ~200 versions, which
    // is enough for daily builders and not for Utah's cadence, so pagination
    // continues until the window candidates are covered. The function warns
    // on partial coverage and the sort falls back to tag text for the gaps.
    const required = selectWindowCandidates(matches, series?.limit);
    const createdAt = await fetchGhcrTagCreatedAt(org, pkg, 2, required);
    const tags = selectDatedTags(allTags, series, createdAt);
    if (tags.length === 0) return { tags: [], createdAt: {}, listed: false };
    return { tags, createdAt, listed: true };
  } catch (err) {
    console.warn(
      `fetch-update-churn: tag listing failed for ${repo} — ${err.message}`,
    );
    return { tags: [], createdAt: {}, listed: false };
  }
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
    const {
      id,
      name,
      edition,
      repo,
      stream,
      sbomStreamId,
      defaultTags,
      tagSeries,
    } = config;

    // Collect tags from the registry + config + SBOM cache.
    // For streams that publish dated tags (e.g. Bluefin Classic), SBOM releases
    // are actual registry tags (stable-YYYYMMDD). For streams whose releases
    // use floating tags (Dakota), use the entry's actual image tag or floating stream.
    const seedTags = [...defaultTags];
    let seriesTags = [];
    let seriesCreatedAt = {};
    let seriesListed = false;
    if (tagSeries) {
      const discovered = await discoverSeriesTags(repo, tagSeries);
      seriesTags = discovered.tags;
      seriesCreatedAt = discovered.createdAt;
      seriesListed = discovered.listed;
    }

    // The series is the measurement, so nothing that is not part of it may
    // join: a floating tag pulled in from the SBOM cache (`testing`) names a
    // manifest some dated tag already covers, so adding it appends a duplicate
    // point that is either 0 MB or a backwards measurement.
    const candidateTags = [...new Set([...seedTags, ...seriesTags])];
    if (sbomCache?.streams?.[sbomStreamId]?.releases) {
      const releases = sbomCache.streams[sbomStreamId].releases;
      for (const [key, entry] of Object.entries(releases)) {
        const candidateTag = entry?.tag || key;
        // Skip synthetic floating cache keys like "stable-20260922" or "testing-20260922"
        // that are not actual published tags on the container registry
        if (entry?.imageRef && entry.imageRef.includes(":")) {
          const refTag = entry.imageRef.split(":").pop();
          if (refTag && !candidateTags.includes(refTag)) {
            candidateTags.push(refTag);
          }
        } else if (!candidateTags.includes(candidateTag)) {
          candidateTags.push(candidateTag);
        }
      }
    }

    const inSeries = (tag) => !tagSeries || tagSeries.pattern.test(tag);
    const tagsToInspect = candidateTags
      .filter(inSeries)
      // One sort, over everything, after every source has contributed. Churn
      // is a diff between consecutive entries, so an order that depends on
      // which source introduced a tag is a measurement that changes when an
      // unrelated cache does.
      .sort((a, b) => compareTagsByDate(a, b, seriesCreatedAt))
      // `limit` describes the charted series, so it applies to the final list:
      // a seed older than the discovered window would otherwise push the
      // series past the limit. Seeds only survive a successful listing, which
      // is exactly when they are not needed as a fallback.
      .slice(tagSeries && seriesListed ? -tagSeries.limit : undefined);

    if (tagsToInspect.length === 0) {
      imagesOutput[id] = {
        id,
        name,
        edition,
        package: repo,
        stream,
        unavailable: true,
        stateReason: tagSeries
          ? `Could not list a published tag series for ${name} from the registry`
          : `No stable releases available yet — ${name} is under active development`,
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
  GHCR_TAG_CREATED_AT_MAX_PAGES,
  IMAGE_CONFIGS,
  analyzeManifestLayers,
  diffReleaseLayers,
  calculateReleaseChurn,
  datedTagKey,
  compareTagsByDate,
  selectDatedTags,
  selectWindowCandidates,
  discoverSeriesTags,
  fetchGhcrTagCreatedAt,
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
