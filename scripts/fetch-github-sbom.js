/**
 * fetch-github-sbom.js
 *
 * Fetches SBOM / attestation metadata for Bluefin image streams from GHCR
 * and writes the result to static/data/sbom-attestations.json.
 *
 * Runs only from .github/workflows/update-sbom-cache.yml — not part of the
 * shared fetch-data chain (pages.yml doesn't install cosign/oras).
 *
 * Key design decisions:
 *  - Tag pattern: GHCR uses <stream>-<YYYYMMDD> (e.g. stable-20260331).
 *    We match with /[.-](\d{8})$/ and normalise lts.YYYYMMDD → lts-YYYYMMDD.
 *  - Auth: no PAT required. Tag enumeration uses the GitHub Releases API with
 *    the standard github.token (no cross-org scope needed). Digest resolution
 *    uses an anonymous GHCR bearer token — public images are accessible without
 *    credentials. The oras discover/pull path also works anonymously for public
 *    GHCR images without a prior `oras login`.
 *  - Digest: resolveAmd64Digest() fetches the OCI image index and returns the
 *    amd64 child manifest digest (not the index digest). SBOM attestations are
 *    attached to the platform-specific digest, not the multi-arch index.
 *  - NDJSON: cosign verify-attestation outputs one JSON object per line.
 *    We parse each line individually.
 *  - Pagination: GitHub Releases API is paginated; we fetch all pages.
 *  - Failure modes: present:false = no attestation published;
 *                   verified:false = attestation exists but verification failed.
 *  - lts/gdx streams: no SBOMs yet. keyless:false, cosignKeyUrl set.
 *    present:false is the correct result — pipeline handles gracefully.
 *    When lts SBOMs are published they will be picked up automatically.
 *  - SBOM download: uses `oras discover` to find the vnd.spdx+json referrer
 *    digest, then `oras pull` to download sbom.json into a temp directory.
 *    The Syft JSON is parsed for RPM artifacts to extract packageVersions.
 *  - SBOM cache: keyed by image digest — if the digest hasn't changed AND
 *    packageVersions is non-null, the existing cache entry is reused.
 *  - NVIDIA: intentionally absent from SBOM (akmod, built outside the image).
 *    Consumers fall back to releases/feeds for NVIDIA versions.
 *  - Atomic write: output is written to a temp file then renamed to avoid
 *    leaving a truncated JSON file if the process is interrupted.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "sbom-attestations.json",
);

// How many calendar days of releases to scan per stream.
const LOOKBACK_DAYS = Number(process.env.SBOM_LOOKBACK_DAYS || 90);

// Max releases per stream to record in output (most recent first).
const MAX_RELEASES = Number(process.env.SBOM_MAX_RELEASES || 10);

const FORCE_REFRESH = process.argv.includes("--force");

const SLSA_TYPE = "https://slsa.dev/provenance/v1";
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";

/**
 * Streams to scan.  keyRepo drives the OIDC identity regexp used by cosign.
 * package is the GHCR container package name under the org.
 * releasesRepo is the GitHub repo used for tag enumeration via Releases API.
 *
 * keyless:true  → OIDC keyless signing (stable/latest/beta mainline streams)
 * keyless:false → key-based signing; cosignKeyUrl required (lts/gdx streams).
 *                 These streams have no SBOMs yet — present:false is expected.
 *                 When lts SBOMs are published, no code changes are needed.
 *
 * GTS is retired and absent from this list.
 */
const COSIGN_KEY_LTS =
  "https://raw.githubusercontent.com/ublue-os/bluefin-lts/main/cosign.pub";

const STREAM_SPECS = [
  {
    id: "bluefin-stable",
    label: "Bluefin Stable",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-latest",
    label: "Bluefin Latest",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-lts",
    label: "Bluefin LTS",
    org: "ublue-os",
    package: "bluefin",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-dx-stable",
    label: "Bluefin DX Stable",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "stable",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-dx-latest",
    label: "Bluefin DX Latest",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
  {
    id: "bluefin-dx-lts",
    label: "Bluefin DX LTS",
    org: "ublue-os",
    package: "bluefin-dx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-gdx-lts",
    label: "Bluefin GDX LTS",
    org: "ublue-os",
    package: "bluefin-gdx",
    releasesRepo: "ublue-os/bluefin-lts",
    streamPrefix: "lts",
    keyRepo: "ublue-os/bluefin-lts",
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
  },
  {
    id: "bluefin-gdx-latest",
    label: "Bluefin GDX Latest",
    org: "ublue-os",
    package: "bluefin-gdx",
    releasesRepo: "ublue-os/bluefin",
    streamPrefix: "latest",
    keyRepo: "ublue-os/bluefin",
    keyless: true,
  },
];

// ---------------------------------------------------------------------------
// HTTP helpers (same pattern as fetch-github-images.js)
// ---------------------------------------------------------------------------

async function fetchText(url, extraHeaders = {}) {
  const headers = {
    "User-Agent": "BluefinDocsSBOM/1.0",
    ...extraHeaders,
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  // Only attach the GitHub token for api.github.com requests — not for ghcr.io
  if (token && url.includes("api.github.com")) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
  }
  return response.text();
}

async function fetchJson(url, extraHeaders = {}) {
  const text = await fetchText(url, extraHeaders);
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// GitHub Releases API — paginated tag listing (no PAT needed)
// ---------------------------------------------------------------------------

/**
 * Fetch all release tag names for a given owner/repo using the Releases API.
 * Uses standard github.token — no cross-org packages:read scope required.
 * Returns an array of { tagName, publishedAt } objects.
 */
async function fetchReleaseTags(owner, repo) {
  const tags = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`;
    let batch;
    try {
      batch = await fetchJson(url);
    } catch (err) {
      throw new Error(
        `Releases API page ${page} for ${owner}/${repo} failed: ${err.message}`,
      );
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const release of batch) {
      if (release.tag_name) {
        tags.push({
          tagName: release.tag_name,
          publishedAt: release.published_at || release.created_at || null,
        });
      }
    }
    if (batch.length < 100) break;
    page++;
  }
  return tags;
}

// ---------------------------------------------------------------------------
// GHCR anonymous bearer token + amd64 digest resolution
// ---------------------------------------------------------------------------

/** Cache tokens keyed by "org/image" to avoid one request per release tag */
const ghcrTokenCache = new Map();

/**
 * Get an anonymous GHCR bearer token for the given org/image.
 * Tokens are scoped per-repository and cached for the process lifetime
 * Tokens are short-lived; we cache with expiry and refresh as needed.
 */
async function getGhcrToken(org, image) {
  const key = `${org}/${image}`;
  const cached = ghcrTokenCache.get(key);
  const nowMs = Date.now();
  if (cached && cached.expiresAtMs > nowMs + 30 * 1000) {
    return cached.token;
  }

  const url = `https://ghcr.io/token?scope=repository:${org}/${image}:pull&service=ghcr.io`;
  let data;
  try {
    data = await fetchJson(url);
  } catch (err) {
    throw new Error(
      `GHCR token request failed for ${key}: ${err.message}`,
    );
  }
  const token = data?.token;
  if (!token) throw new Error(`No token in GHCR response for ${key}`);
  const expiresInSec = Number(data?.expires_in || 300);
  ghcrTokenCache.set(key, {
    token,
    expiresAtMs: nowMs + expiresInSec * 1000,
  });
  return token;
}

function invalidateGhcrToken(org, image) {
  ghcrTokenCache.delete(`${org}/${image}`);
}

function selectAmd64DigestFromManifest(manifest, contentDigestHeader) {
  const manifests = manifest?.manifests;
  if (Array.isArray(manifests)) {
    const amd64 = manifests.find(
      (m) =>
        m?.platform?.os === "linux" && m?.platform?.architecture === "amd64",
    );
    return amd64?.digest || null;
  }

  if (manifest?.schemaVersion === 2) {
    return contentDigestHeader || null;
  }

  return null;
}

/**
 * Resolve the amd64 platform manifest digest for an image tag.
 *
 * Fetches the OCI image index, parses the manifests[] array, and returns
 * the digest of the linux/amd64 child manifest. This is the digest that
 * SBOM attestations are attached to — NOT the image index digest.
 *
 * Returns null if the amd64 entry cannot be found or the fetch fails.
 */
async function resolveAmd64Digest(org, image, tag) {
  const url = `https://ghcr.io/v2/${org}/${image}/manifests/${tag}`;

  const tryFetchManifest = async (token) => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: [
          "application/vnd.oci.image.index.v1+json",
          "application/vnd.docker.distribution.manifest.list.v2+json",
          "application/vnd.docker.distribution.manifest.v2+json",
        ].join(", "),
      },
    });
    return response;
  };

  let response;
  try {
    let token = await getGhcrToken(org, image);
    response = await tryFetchManifest(token);

    if (response.status === 401) {
      invalidateGhcrToken(org, image);
      token = await getGhcrToken(org, image);
      response = await tryFetchManifest(token);
    }
  } catch (err) {
    console.warn(
      `    resolveAmd64Digest: manifest fetch failed for ${org}/${image}:${tag} — ${err.message}`,
    );
    return null;
  }

  if (!response.ok) {
    console.warn(
      `    resolveAmd64Digest: manifest fetch failed for ${org}/${image}:${tag} — HTTP ${response.status}`,
    );
    return null;
  }

  let manifest;
  try {
    manifest = await response.json();
  } catch (err) {
    console.warn(
      `    resolveAmd64Digest: invalid manifest JSON for ${org}/${image}:${tag} — ${err.message}`,
    );
    return null;
  }

  const contentDigest = response.headers.get("docker-content-digest");
  const digest = selectAmd64DigestFromManifest(manifest, contentDigest);
  if (digest) return digest;

  console.warn(
    `    resolveAmd64Digest: cannot determine amd64 digest for ${org}/${image}:${tag}`,
  );
  return null;
}

// ---------------------------------------------------------------------------
// Tag filtering helpers
// ---------------------------------------------------------------------------

/**
 * Extract the YYYYMMDD date from a GHCR tag.
 * Handles patterns:
 *   stable-20260331    → 20260331
 *   lts-20260331       → 20260331
 *   lts.20260331       → 20260331
 *   lts-hwe-testing-20260331 → 20260331
 */
function extractDateFromTag(tag) {
  const match = tag.match(/[.-](\d{8})$/);
  return match ? match[1] : null;
}

/**
 * Normalise an lts.YYYYMMDD tag (and any suffix) to lts-YYYYMMDD format.
 * Handles: lts.20260331 → lts-20260331
 *          lts.20260331-hwe → lts-20260331-hwe
 */
function normaliseLtsTag(tag) {
  return tag.replace(/^lts\.(\d{8})(.*)?$/, "lts-$1$2");
}

/**
 * Build the stream-prefixed cache key used in FeedItems.tsx.
 * extractReleaseTag() in FeedItems produces: stable-YYYYMMDD, gts-YYYYMMDD,
 * lts-YYYYMMDD, etc.
 */
function buildCacheKey(streamPrefix, dateStr) {
  return `${streamPrefix}-${dateStr}`;
}

// ---------------------------------------------------------------------------
// cosign verification
// ---------------------------------------------------------------------------

/**
 * Attempt cosign verify-attestation for an image digest.
 * Returns { present, verified, predicateType, error }.
 *
 * present:false  → no attestation found for this image
 * verified:false → attestation found but signature check failed
 */
async function verifyAttestation(imageRef, spec) {
  const oidcIdentityRegexp = `^https://github.com/${spec.keyRepo}/.github/workflows/`;

  const args = [
    "verify-attestation",
    "--type",
    SLSA_TYPE,
    "--certificate-oidc-issuer",
    OIDC_ISSUER,
    "--certificate-identity-regexp",
    oidcIdentityRegexp,
    imageRef,
  ];

  let stdout = "";
  try {
    const result = await execFileAsync("cosign", args, {
      env: { ...process.env },
      maxBuffer: 4 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err) {
    const msg = (err.stderr || err.message || "").toLowerCase();
    // cosign exits non-zero when no attestation exists
    if (
      msg.includes("no matching attestations") ||
      msg.includes("no attestations") ||
      msg.includes("not found")
    ) {
      return {
        present: false,
        verified: false,
        predicateType: null,
        error: "no attestation",
      };
    }
    // Unexpected tooling/registry/auth failure — do NOT claim present: true.
    // Callers use present: false (no attestation) vs present: null (error/unknown)
    // to distinguish absence from verification failure.
    return {
      present: null,
      verified: false,
      predicateType: null,
      errorKind: "tooling",
      error: String(err.stderr || err.message),
    };
  }

  // cosign outputs NDJSON (one JSON object per line) on stdout only;
  // stderr carries status messages ("Verification OK") that must not be parsed.
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"));

  let predicateType = null;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      // Each NDJSON object has a payload field (base64-encoded)
      if (obj.payload) {
        const decoded = Buffer.from(obj.payload, "base64").toString("utf-8");
        const inner = JSON.parse(decoded);
        predicateType = inner?.predicateType || inner?.predicate_type || null;
        break;
      }
    } catch {
      // skip malformed lines
    }
  }

  return { present: true, verified: true, predicateType, error: null };
}

// ---------------------------------------------------------------------------
// SBOM download via oras
// ---------------------------------------------------------------------------

/**
 * Download the Syft SBOM for an image from GHCR via oras.
 *
 * Steps:
 *   1. oras discover --format json <imageRef>@<digest>
 *      → find referrer with artifactType == "application/vnd.spdx+json"
 *   2. oras pull <imageRef>@<sbomDigest> --output <tmpdir>
 *   3. Return path to the pulled sbom.json
 *
 * Returns null on any error (caller treats packageVersions as null).
 */
async function downloadSbom(imageRef, digest) {
  if (!digest) {
    console.warn("    downloadSbom: no digest available, skipping");
    return null;
  }

  const ref = `${imageRef.replace(/:.*$/, "")}@${digest}`;
  let tmpDir = null;

  try {
    // Step 1: discover referrers
    const discoverResult = await execFileAsync(
      "oras",
      ["discover", "--format", "json", ref],
      {
        env: { ...process.env },
        maxBuffer: 4 * 1024 * 1024,
        timeout: 60000,
      },
    );

    let referrers = [];
    try {
      const discovered = JSON.parse(discoverResult.stdout);
      // oras discover --format json returns { manifests: [...] }
      referrers = discovered?.manifests || discovered?.referrers || [];
    } catch {
      console.warn("    downloadSbom: failed to parse oras discover output");
      return null;
    }

    const sbomReferrer = referrers.find(
      (r) =>
        r?.artifactType === "application/vnd.spdx+json" ||
        r?.mediaType === "application/vnd.spdx+json",
    );

    if (!sbomReferrer) {
      console.warn(`    downloadSbom: no SPDX referrer found for ${digest}`);
      return null;
    }

    const sbomDigest = sbomReferrer.digest;
    if (!sbomDigest) {
      console.warn("    downloadSbom: referrer has no digest");
      return null;
    }

    // Step 2: pull SBOM into temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bluefin-sbom-"));
    const sbomRef = `${imageRef.replace(/:.*$/, "")}@${sbomDigest}`;

    await execFileAsync("oras", ["pull", sbomRef, "--output", tmpDir], {
      env: { ...process.env },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 120000,
    });

    // SBOM file may be named sbom.json or spdx.json
    const candidates = ["sbom.json", "spdx.json"];
    for (const candidate of candidates) {
      const candidate_path = path.join(tmpDir, candidate);
      if (fs.existsSync(candidate_path)) {
        return candidate_path;
      }
    }

    // Fallback: find first .json file in tmpdir
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".json"));
    if (files.length > 0) {
      return path.join(tmpDir, files[0]);
    }

    console.warn("    downloadSbom: no JSON file found after oras pull");
    return null;
  } catch (err) {
    console.warn(`    downloadSbom: error — ${err.message}`);
    return null;
  }
  // Note: tmpDir cleanup happens in the caller (extractPackageVersions wrapper)
}

/**
 * Compare two RPM-style version strings numerically by segment.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Example: "6.18.2-200.fc43" vs "6.18.13-200.fc43" → "6.18.2" < "6.18.13"
 */
function compareRpmVersions(a, b) {
  // Split on non-alphanumeric boundaries, compare each segment numerically if possible
  const segA = a.split(/[.\-~]/).filter(Boolean);
  const segB = b.split(/[.\-~]/).filter(Boolean);
  const len = Math.max(segA.length, segB.length);
  for (let i = 0; i < len; i++) {
    const sa = segA[i] || "0";
    const sb = segB[i] || "0";
    const na = parseInt(sa, 10);
    const nb = parseInt(sb, 10);
    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb;
    } else {
      const cmp = sa.localeCompare(sb);
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

/**
 * Strip RPM epoch prefix ("1:") from a version string.
 * "1:25.3.6-6.fc43" → "25.3.6-6.fc43"
 */
function stripEpoch(version) {
  if (!version) return version;
  return version.replace(/^\d+:/, "");
}

/**
 * Extract package versions from a Syft SBOM JSON file.
 * Returns a PackageVersions object or null on parse failure.
 *
 * Package mapping:
 *   kernel   → name == "kernel", pick lowest semver (booted kernel, not the newer alongside)
 *   gnome    → name == "gnome-shell"
 *   mesa     → name == "mesa-filesystem", strip epoch prefix
 *   podman   → name == "podman"
 *   systemd  → name == "systemd"
 *   bootc    → name == "bootc"
 *   fedora   → name == "fedora-release-common", extract leading digits → "F" + digits
 *
 * Also collects allPackages: a flat {name: version} map of every RPM artifact.
 * This enables per-release diff computation in fetch-firehose.js without
 * additional network calls at build time.
 */
function extractPackageVersions(sbomPath) {
  if (!sbomPath) return null;

  let sbom;
  try {
    const raw = fs.readFileSync(sbomPath, "utf-8");
    sbom = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `    extractPackageVersions: failed to parse SBOM — ${err.message}`,
    );
    return null;
  }

  const artifacts = sbom?.artifacts;
  if (!Array.isArray(artifacts)) {
    console.warn("    extractPackageVersions: no artifacts array in SBOM");
    return null;
  }

  // Only RPM artifacts
  const rpms = artifacts.filter((a) => a?.type === "rpm");

  const result = {
    kernel: null,
    gnome: null,
    mesa: null,
    podman: null,
    systemd: null,
    bootc: null,
    fedora: null,
    /** Flat name→version map of every RPM in the image */
    allPackages: /** @type {Record<string, string>} */ ({}),
  };

  // Collect all kernel versions to pick the lowest (booted kernel)
  const kernelVersions = [];

  for (const pkg of rpms) {
    const name = pkg?.name;
    const version = pkg?.version;
    if (!name || !version) continue;

    // Capture every RPM for diff computation, epoch-stripped.
    // kernel is handled specially below (multi-version dedup) — skip here.
    if (name !== "kernel") {
      result.allPackages[name] = stripEpoch(String(version));
    }

    switch (name) {
      case "kernel":
        kernelVersions.push(stripEpoch(String(version)));
        break;
      case "gnome-shell":
        if (!result.gnome) result.gnome = stripEpoch(String(version));
        break;
      case "mesa-filesystem":
        if (!result.mesa) result.mesa = stripEpoch(String(version));
        break;
      case "podman":
        if (!result.podman) result.podman = stripEpoch(String(version));
        break;
      case "systemd":
        if (!result.systemd) result.systemd = stripEpoch(String(version));
        break;
      case "bootc":
        if (!result.bootc) result.bootc = stripEpoch(String(version));
        break;
      case "fedora-release-common": {
        if (!result.fedora) {
          // Strip any epoch prefix, then extract leading integer
          const stripped = stripEpoch(String(version));
          const fedoraMatch = stripped.match(/^(\d+)/);
          if (fedoraMatch) {
            result.fedora = `F${fedoraMatch[1]}`;
          }
        }
        break;
      }
    }
  }

  // Pick the lowest kernel version (the booted kernel, not a newer pending update)
  if (kernelVersions.length === 0) {
    console.warn("    extractPackageVersions: no kernel RPM found in SBOM");
  } else {
    if (kernelVersions.length > 1) {
      console.log(
        `    extractPackageVersions: found ${kernelVersions.length} kernel versions, picking lowest`,
      );
    }
    kernelVersions.sort(compareRpmVersions);
    result.kernel = kernelVersions[0];
    // Write the correctly-picked (lowest/booted) kernel into allPackages so diff
    // comparisons use the same value as the displayed chip.
    result.allPackages["kernel"] = stripEpoch(kernelVersions[0]);
  }

  console.log(
    `    extractPackageVersions: captured ${Object.keys(result.allPackages).length} RPM packages`,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Per-stream scanning
// ---------------------------------------------------------------------------

/**
 * Find recent dated tags for a given stream prefix.
 *
 * @param {Array<{tagName: string, publishedAt: string|null}>} releaseTags
 *   Release tags from the GitHub Releases API (fetchReleaseTags output).
 * @param {object} spec  Stream spec from STREAM_SPECS.
 * @returns {Array<{tag: string, cacheKey: string, dateStr: string, imageRef: string, publishedAt: string|null}>}
 *   Most-recent first, limited to MAX_RELEASES within LOOKBACK_DAYS.
 *   digest is NOT included here — resolveAmd64Digest() is called in processStream().
 */
function findRecentTagsForStream(releaseTags, spec) {
  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const found = [];

  for (const { tagName, publishedAt } of releaseTags) {
    const publishedMs = publishedAt ? Date.parse(publishedAt) : null;
    if (publishedMs !== null && publishedMs < cutoff) continue;

    const normalised = normaliseLtsTag(tagName.toLowerCase());
    if (!normalised.startsWith(`${spec.streamPrefix}-`)) continue;
    const dateStr = extractDateFromTag(normalised);
    if (!dateStr) continue;

    // Enforce canonical tag: only exact `<streamPrefix>-YYYYMMDD` is accepted.
    // Non-canonical variants like lts-hwe-testing-20260331 would normalise to
    // lts-20260331 and silently overwrite valid canonical entries.
    const expectedCanonical = `${spec.streamPrefix}-${dateStr}`;
    if (normalised !== expectedCanonical) continue;

    found.push({
      tag: normalised,
      cacheKey: buildCacheKey(spec.streamPrefix, dateStr),
      dateStr,
      // Use the original tag name (not lowercased normalised) for the image ref
      // so the GHCR manifest lookup uses the exact published tag.
      imageRef: `ghcr.io/${spec.org}/${spec.package}:${tagName}`,
      publishedAt: publishedAt || null,
    });
  }

  // Deduplicate by cacheKey (keep first/most-recent encounter)
  const seen = new Set();
  const unique = [];
  for (const entry of found) {
    if (!seen.has(entry.cacheKey)) {
      seen.add(entry.cacheKey);
      unique.push(entry);
    }
  }

  // Sort descending by date string (YYYYMMDD sorts lexicographically)
  unique.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return unique.slice(0, MAX_RELEASES);
}

/**
 * Build the result object for a single stream.
 *
 * @param {object} spec  Stream spec from STREAM_SPECS.
 * @param {Map<string, Array<{tagName: string, publishedAt: string|null}>>} releaseTagsByRepo
 *   Pre-fetched release tags keyed by "owner/repo" (spec.releasesRepo).
 * @param {object|null} existing  Existing cache for incremental updates.
 */
async function processStream(spec, releaseTagsByRepo, existing) {
  // If the releases repo fetch failed — preserve existing cache.
  if (!releaseTagsByRepo.has(spec.releasesRepo)) {
    if (existing?.streams?.[spec.id]) {
      console.log(
        `  ${spec.id}: Releases API unavailable — keeping existing cache`,
      );
      return existing.streams[spec.id];
    }
    // No existing cache to fall back to; return empty stream.
    return { id: spec.id, label: spec.label, org: spec.org, package: spec.package, streamPrefix: spec.streamPrefix, keyRepo: spec.keyRepo, keyless: spec.keyless, releases: {} };
  }
  const releaseTags = releaseTagsByRepo.get(spec.releasesRepo);
  const recentTags = findRecentTagsForStream(releaseTags, spec);

  console.log(
    `  ${spec.id}: found ${recentTags.length} recent tagged releases`,
  );

  const releases = {};
  for (const { tag, cacheKey, imageRef } of recentTags) {
    // Resolve the amd64 platform digest for this tag.
    // SBOM attestations are attached to the platform-specific digest,
    // not the multi-arch image index digest.
    const [org, image] = [spec.org, spec.package];
    const tagName = imageRef.split(":").pop();
    const digest = await resolveAmd64Digest(org, image, tagName);

    // Cache hit: reuse if digest matches AND packageVersions is already populated.
    // If packageVersions is null (e.g. SBOM download previously failed), retry.
    const existingEntry = existing?.streams?.[spec.id]?.releases?.[cacheKey];
    const digestMatches = digest && existingEntry?.digest === digest;
    const hasVersions = existingEntry?.packageVersions != null;
    // allPackages may be absent from entries cached before this feature was added —
    // treat missing allPackages as a cache miss so the SBOM is re-downloaded.
    const hasAllPackages =
      existingEntry?.packageVersions?.allPackages != null &&
      Object.keys(existingEntry.packageVersions.allPackages).length > 0;
    const isVerified = existingEntry?.attestation?.verified === true;

    if (!FORCE_REFRESH && digestMatches && isVerified && hasVersions && hasAllPackages) {
      console.log(
        `    ${cacheKey}: cache hit (digest match, verified, versions populated)`,
      );
      releases[cacheKey] = existingEntry;
      continue;
    }

    // Partial cache hit: attestation already verified but SBOM not yet downloaded
    // (or allPackages was missing from an older cache entry — re-download SBOM only)
    let attestation;
    if (!FORCE_REFRESH && digestMatches && isVerified && (!hasVersions || (hasVersions && !hasAllPackages))) {
      console.log(
        `    ${cacheKey}: attestation cached, fetching SBOM packageVersions`,
      );
      attestation = existingEntry.attestation;
    } else {
      console.log(`    ${cacheKey}: verifying attestation for ${imageRef}`);
      attestation = await verifyAttestation(imageRef, spec);
      attestation = {
        present: attestation.present,
        verified: attestation.verified,
        predicateType: attestation.predicateType,
        slsaType: SLSA_TYPE,
        ...(attestation.errorKind !== undefined && {
          errorKind: attestation.errorKind,
        }),
        error: attestation.error,
      };
    }

    // Download and parse SBOM to extract packageVersions
    let packageVersions = null;
    let sbomPath = null;
    let tmpDir = null;
    try {
      sbomPath = await downloadSbom(imageRef, digest);
      if (sbomPath) {
        tmpDir = path.dirname(sbomPath);
        packageVersions = extractPackageVersions(sbomPath);
        if (packageVersions) {
          console.log(
            `    ${cacheKey}: extracted packageVersions (kernel: ${packageVersions.kernel})`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `    ${cacheKey}: SBOM download/parse error — ${err.message}`,
      );
    } finally {
      // Clean up temp directory
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }

    releases[cacheKey] = {
      tag,
      imageRef,
      digest,
      attestation,
      packageVersions,
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    id: spec.id,
    label: spec.label,
    org: spec.org,
    package: spec.package,
    streamPrefix: spec.streamPrefix,
    keyRepo: spec.keyRepo,
    keyless: spec.keyless,
    releases,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    console.warn(
      "Warning: GITHUB_TOKEN / GH_TOKEN not set. GitHub API calls may be rate-limited.",
    );
  }

  // Load existing cache for incremental updates
  let existing = null;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    } catch {
      console.warn("Existing cache unreadable; starting fresh.");
    }
  }

  // Deduplicate releasesRepo values — multiple streams share the same repo
  // (e.g. bluefin-stable and bluefin-dx-stable both use ublue-os/bluefin).
  const uniqueRepos = new Set(STREAM_SPECS.map((s) => s.releasesRepo));

  console.log(
    `Fetching release tags for ${uniqueRepos.size} repo(s)...`,
  );
  const releaseTagsByRepo = new Map();
  for (const repoPath of uniqueRepos) {
    const [owner, repo] = repoPath.split("/");
    console.log(`  ${repoPath}`);
    try {
      const tags = await fetchReleaseTags(owner, repo);
      releaseTagsByRepo.set(repoPath, tags);
      console.log(`    ${tags.length} release tags fetched`);
    } catch (err) {
      console.error(`  Failed to fetch releases for ${repoPath}: ${err.message}`);
      // Leave the key absent so processStream detects the fetch failure
      // and preserves the existing cache instead of producing an empty stream.
    }
  }

  // Process each stream
  const streams = {};
  for (const spec of STREAM_SPECS) {
    console.log(`\nProcessing stream: ${spec.id}`);
    try {
      const result = await processStream(spec, releaseTagsByRepo, existing);
      streams[spec.id] = result;
    } catch (err) {
      console.error(`  Error processing ${spec.id}: ${err.message}`);
      // Preserve existing data for this stream on error
      if (existing?.streams?.[spec.id]) {
        streams[spec.id] = existing.streams[spec.id];
        console.log(`  Kept existing cache for ${spec.id}`);
      }
    }
  }

  // Empty-cache guard: if every stream produced zero releases, something is
  // wrong (likely all Releases API fetches failed). Exit non-zero so the GHA
  // workflow marks the step as failed instead of silently overwriting with an
  // empty cache.
  const totalReleases = Object.values(streams).reduce(
    (sum, s) => sum + Object.keys(s?.releases || {}).length,
    0,
  );
  if (totalReleases === 0) {
    console.error(
      "Error: all streams produced zero releases. " +
      "This indicates a Releases API failure. " +
      "Refusing to overwrite cache with empty data.",
    );
    process.exit(1);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    maxReleasesPerStream: MAX_RELEASES,
    streams,
  };

  // Atomic write: write to temp file then rename to avoid truncated JSON on interrupt
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const tmpFile = OUTPUT_FILE + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(output, null, 2), "utf-8");
  fs.renameSync(tmpFile, OUTPUT_FILE);
  console.log(`\nSBOM attestation cache written to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = {
  stripEpoch,
  compareRpmVersions,
  extractPackageVersions,
  selectAmd64DigestFromManifest,
};
