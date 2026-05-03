/**
 * GitHub API, GHCR registry, cosign, and oras helpers.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLSA_TYPE = "https://slsa.dev/provenance/v1";
const OIDC_ISSUER = "https://token.actions.githubusercontent.com";

// ---------------------------------------------------------------------------
// HTTP helpers
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
// GitHub Releases API — paginated tag listing
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
// GHCR OCI distribution API — tag listing
// ---------------------------------------------------------------------------

/**
 * Get a GHCR bearer token for the given org/package.
 * Uses GITHUB_TOKEN/GH_TOKEN if available; falls back to anonymous (public images).
 */
async function getGhcrToken(org, pkg) {
  const headers = { "User-Agent": "BluefinDocsSBOM/1.0" };
  const ghToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (ghToken) {
    const b64 = Buffer.from(`x-access-token:${ghToken}`).toString("base64");
    headers.Authorization = `Basic ${b64}`;
  }
  const url = `https://ghcr.io/token?scope=repository:${org}/${pkg}:pull&service=ghcr.io`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GHCR token exchange failed: HTTP ${res.status} — ${url}`);
  }
  const body = await res.json();
  return body.token;
}

/**
 * Fetch ALL tags for a GHCR package using the OCI distribution spec.
 * Handles pagination via Link header.
 *
 * @param {string} org   GitHub org (e.g. "ublue-os")
 * @param {string} pkg   Package name (e.g. "bluefin")
 * @returns {Promise<string[]>} Full list of tag strings
 */
async function fetchGhcrTags(org, pkg) {
  const token = await getGhcrToken(org, pkg);
  const allTags = [];
  let url = `https://ghcr.io/v2/${org}/${pkg}/tags/list?n=1000`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "BluefinDocsSBOM/1.0",
      },
    });
    if (!res.ok) {
      throw new Error(`GHCR tags/list failed: HTTP ${res.status} — ${url}`);
    }
    const body = await res.json();
    if (Array.isArray(body.tags)) allTags.push(...body.tags);

    // Follow pagination Link header per RFC 5988 / OCI distribution spec.
    const linkHeader = res.headers.get("link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/i)
      ?? linkHeader.match(/<([^>]+)>;\s*rel=next(?:[^a-z]|$)/i);
    url = nextMatch ? new URL(nextMatch[1], res.url).href : null;
  }

  return allTags;
}

// ---------------------------------------------------------------------------
// ORAS login
// ---------------------------------------------------------------------------

/**
 * Best-effort GHCR login for ORAS.
 * Uses GITHUB_TOKEN/GH_TOKEN if available; otherwise no-op (anonymous mode).
 */
async function orasLogin() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return;

  // x-access-token works for GITHUB_TOKEN in Actions.
  // For local dev with a PAT, set ORAS_USERNAME to your GitHub username.
  const username = process.env.ORAS_USERNAME || "x-access-token";

  try {
    await execFileAsync(
      "oras",
      ["login", "ghcr.io", "-u", username, "--password-stdin"],
      {
        input: token,
        env: { ...process.env },
        timeout: 15000,
      },
    );
    console.log("oras: logged in to ghcr.io");
  } catch (err) {
    // Login failure is non-fatal — oras may still work for public images
    console.warn(`oras: login failed (continuing anonymously) — ${err.message}`);
  }
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
 *
 * For streams with signingType: "cosign-sign", the image is signed with
 * `cosign sign` (not an SLSA attestation). Use `cosign verify` instead of
 * `cosign verify-attestation` — a verified signature is equivalent to
 * present:true / verified:true in the UI.
 */
async function verifyAttestation(imageRef, spec) {
  const oidcIdentityRegexp = `^https://github.com/${spec.keyRepo}/.github/workflows/`;

  // Dakota (and any stream with signingType: "cosign-sign") uses `cosign sign`
  // which produces a keyless OIDC signature, not an SLSA attestation. Verify
  // with `cosign verify` rather than `cosign verify-attestation`.
  if (spec.signingType === "cosign-sign") {
    const verifyArgs = [
      "verify",
      "--certificate-oidc-issuer",
      OIDC_ISSUER,
      "--certificate-identity-regexp",
      oidcIdentityRegexp,
      imageRef,
    ];
    try {
      await execFileAsync("cosign", verifyArgs, {
        env: { ...process.env },
        maxBuffer: 1 * 1024 * 1024,
      });
      return { present: true, verified: true, predicateType: "cosign-sign", error: null };
    } catch (err) {
      const msg = (err.stderr || err.message || "").toLowerCase();
      if (msg.includes("no matching signatures") || msg.includes("not found")) {
        return { present: false, verified: false, predicateType: null, error: "no signature" };
      }
      return {
        present: null,
        verified: false,
        predicateType: null,
        errorKind: "tooling",
        error: String(err.stderr || err.message),
      };
    }
  }

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
// OCI manifest helpers
// ---------------------------------------------------------------------------

/**
 * Given a parsed OCI manifest (which may be a multi-arch index or a
 * single-arch manifest) and the content digest of that manifest, return
 * the digest of the linux/amd64 platform-specific image.
 *
 * @param {object} manifest  – parsed manifest JSON
 * @param {string} contentDigest  – sha256 digest of the manifest bytes
 * @returns {string} amd64-specific digest, or contentDigest for single-arch
 */
function selectAmd64DigestFromManifest(manifest, contentDigest) {
  if (Array.isArray(manifest?.manifests)) {
    const amd64 = manifest.manifests.find(
      (m) =>
        m?.platform?.os === "linux" && m?.platform?.architecture === "amd64",
    );
    if (amd64?.digest) return amd64.digest;
  }
  return contentDigest;
}

// ---------------------------------------------------------------------------
// SBOM download via oras
// ---------------------------------------------------------------------------

/**
 * Download the Syft SBOM for an image from GHCR via oras.
 *
 * Steps:
 *   0. Resolve the linux/amd64 platform-specific digest from the manifest
 *      index (multi-arch images only) so that oras discover operates on the
 *      correct platform-specific manifest where SBOM referrers are attached.
 *   1. oras discover --format json <imageRef>
 *      → find referrer with artifactType == "application/vnd.spdx+json"
 *   2. oras pull <repo>@<sbomDigest> --output <tmpdir>
 *   3. Return path to the pulled sbom.json
 *
 * Returns null on any error (caller treats packageVersions as null).
 */
async function downloadSbom(imageRef) {
  const repoRef = imageRef.replace(/:[^/]+$/, "");
  let tmpDir = null;

  // Step 0: resolve the amd64-specific digest.
  let resolvedRef = imageRef;
  try {
    const [rawResult, digestResult] = await Promise.all([
      execFileAsync("oras", ["manifest", "fetch", imageRef], {
        env: { ...process.env },
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }),
      execFileAsync(
        "oras",
        [
          "manifest", "fetch",
          "--format", "go-template",
          "--template", "{{ .digest }}",
          "--platform", "linux/amd64",
          imageRef,
        ],
        { env: { ...process.env }, maxBuffer: 64 * 1024, timeout: 30000 },
      ),
    ]);
    const manifest = JSON.parse(rawResult.stdout);
    const amd64Digest = selectAmd64DigestFromManifest(
      manifest,
      digestResult.stdout.trim(),
    );
    if (amd64Digest && amd64Digest.startsWith("sha256:")) {
      resolvedRef = `${repoRef}@${amd64Digest}`;
      if (resolvedRef !== imageRef) {
        console.log(
          `    downloadSbom: resolved to amd64 digest ${amd64Digest.slice(0, 19)}...`,
        );
      }
    }
  } catch {
    // Non-fatal: fall back to tag-based ref
  }

  try {
    // Step 1: discover referrers
    const discoverResult = await execFileAsync(
      "oras",
      ["discover", "--format", "json", resolvedRef],
      {
        env: { ...process.env },
        maxBuffer: 4 * 1024 * 1024,
        timeout: 60000,
      },
    );

    let referrers = [];
    try {
      const discovered = JSON.parse(discoverResult.stdout);
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
      console.warn(`    downloadSbom: no SPDX referrer found for ${resolvedRef}`);
      return null;
    }

    const sbomDigest = sbomReferrer.digest;
    if (!sbomDigest) {
      console.warn("    downloadSbom: referrer has no digest");
      return null;
    }

    // Step 2: pull SBOM into temp directory
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bluefin-sbom-"));
    const sbomRef = `${repoRef}@${sbomDigest}`;

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

// ---------------------------------------------------------------------------
// OCI image date extraction
// ---------------------------------------------------------------------------

/**
 * Derive a YYYYMMDD date string from an OCI image's creation timestamp.
 *
 * Strategy (in order):
 *  1. Manifest-level `annotations["org.opencontainers.image.created"]`
 *  2. Image config blob `.created` field (bootc images store it here, not
 *     in manifest annotations)
 *
 * @param {string} imageRef  Full image reference (e.g. ghcr.io/org/pkg:latest)
 * @returns {Promise<string|null>}  "YYYYMMDD" or null
 */
async function getImageCreatedDate(imageRef) {
  try {
    const manifestResult = await execFileAsync(
      "oras",
      ["manifest", "fetch", imageRef],
      { env: { ...process.env }, maxBuffer: 256 * 1024, timeout: 30000 },
    );
    const manifest = JSON.parse(manifestResult.stdout);

    // Strategy 1: manifest-level annotation (common in Syft-attested images).
    const annotationDate = manifest?.annotations?.["org.opencontainers.image.created"];
    if (annotationDate) {
      return annotationDate.slice(0, 10).replace(/-/g, "");
    }

    // Strategy 2: image config blob `.created` (bootc/BuildStream images).
    const configDigest = manifest?.config?.digest;
    if (!configDigest) return null;
    const imageRepo = imageRef.split(":")[0];
    const configResult = await execFileAsync(
      "oras",
      ["blob", "fetch", "--output", "-", `${imageRepo}@${configDigest}`],
      { env: { ...process.env }, maxBuffer: 1024 * 1024, timeout: 30000 },
    );
    const config = JSON.parse(configResult.stdout);
    const configDate = config?.created;
    if (configDate) {
      return configDate.slice(0, 10).replace(/-/g, "");
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = {
  SLSA_TYPE,
  OIDC_ISSUER,
  fetchText,
  fetchJson,
  fetchReleaseTags,
  getGhcrToken,
  fetchGhcrTags,
  orasLogin,
  verifyAttestation,
  selectAmd64DigestFromManifest,
  downloadSbom,
  getImageCreatedDate,
};
