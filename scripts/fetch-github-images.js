const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const {
  readSbomCache,
  lookupVersionsForStream,
} = require("./lib/sbom-versions");
const { trustForRepo } = require("./lib/signing-trust");

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "images.json");
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

const CACHE_MAX_AGE_HOURS = Number(process.env.IMAGES_CACHE_HOURS || 168);
const REFRESH_HOURS = Number(process.env.IMAGES_REFRESH_HOURS || 336);
const STALE_DAYS = Number(process.env.IMAGES_STALE_DAYS || 30);
const FORCE_REFRESH = process.argv.includes("--force");
const SBOM_VERSION_SOURCE = "sbom";
const SBOM_UNAVAILABLE_REASON = "SBOM cache not available";
const SBOM_NO_RELEASE_DATA_REASON = "SBOM cache contains no release data";

const PRODUCT_SPECS = [
  {
    id: "projectbluefin-bluefin",
    name: "Bluefin",
    org: "projectbluefin",
    package: "bluefin",
    artwork: "bluefin",
    summary: "Primary Bluefin desktop image for most systems.",
    streamOrder: ["stable", "testing"],
    versionSource: SBOM_VERSION_SOURCE,
    releaseSource: { feed: "bluefin", stream: "stable" },
    sbomStreamId: "bluefin-stable",
    nvidiaSbomStreamId: "bluefin-nvidia-open-stable",
    keyRepo: "projectbluefin/bluefin",
    nvidiaPackage: "bluefin-nvidia",
    allowTestingStreams: false,
    isoSectionLink: "/downloads",
    supportedArches: ["amd", "intel"],
    keepEvenIfStale: true,
  },
  {
    id: "projectbluefin-bluefin-lts",
    name: "Bluefin LTS",
    org: "projectbluefin",
    package: "bluefin-lts",
    artwork: "achillobator",
    summary: "Long-term support Bluefin stream.",
    streamOrder: ["stable", "testing"],
    versionSource: SBOM_VERSION_SOURCE,
    releaseSource: { feed: "lts", stream: "lts" },
    sbomStreamId: "bluefin-lts",
    nvidiaSbomStreamId: "bluefin-lts-nvidia",
    nvidiaSbomFallbackStreamId: "bluefin-gdx-lts",
    keyRepo: "projectbluefin/bluefin-lts",
    nvidiaPackage: "bluefin-lts-nvidia",
    allowTestingStreams: true,
    keepEvenIfStale: true,
    isoSectionLink: "/downloads",
    supportedArches: ["amd", "intel"],
  },
  {
    id: "projectbluefin-dakota",
    name: "Project Bluefin Dakota",
    org: "projectbluefin",
    package: "dakota",
    artwork: "dakotaraptor",
    summary: "Project Bluefin Dakota image stream built with BuildStream.",
    streamOrder: ["stable", "testing"],
    versionSource: SBOM_VERSION_SOURCE,
    releaseSource: {
      url: "https://github.com/projectbluefin/dakota/releases",
    },
    sbomStreamId: "dakota-latest",
    nvidiaSbomStreamId: "dakota-nvidia-latest",
    keyRepo: "projectbluefin/dakota",
    nvidiaPackage: "dakota-nvidia",
    allowTestingStreams: false,
    // No versionOverrides: versions come from the SBOM (BST SPDX format).
    // fedora will be null — Dakota is GNOME OS based, not Fedora.
    supportedArches: ["amd", "intel"],
    isoSectionLink: "/downloads-testing#dakotaraptor",
    keepEvenIfStale: true,
  },
  {
    id: "projectbluefin-utah",
    name: "Project Bluefin Utah",
    org: "projectbluefin",
    package: "utah",
    artwork: "bluefin",
    summary:
      "Project Bluefin Utah image stream built with Fedora Hummingbird technology.",
    streamOrder: ["testing"],
    versionSource: SBOM_VERSION_SOURCE,
    releaseSource: {
      url: "https://github.com/projectbluefin/utah/releases",
    },
    sbomStreamId: "utah-testing",
    nvidiaSbomStreamId: "utah-nvidia-testing",
    keyRepo: "projectbluefin/utah",
    nvidiaPackage: "utah-nvidia",
    allowTestingStreams: false,
    supportedArches: ["amd", "intel"],
    isoSectionLink: null,
    keepEvenIfStale: true,
  },
];

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function hasUsableSbomData(sbomCache) {
  const streams = sbomCache?.streams;
  if (!streams || typeof streams !== "object" || Array.isArray(streams)) {
    return false;
  }

  return Object.values(streams).some(
    (stream) =>
      stream?.releases &&
      typeof stream.releases === "object" &&
      !Array.isArray(stream.releases) &&
      Object.keys(stream.releases).length > 0,
  );
}

/**
 * Look up the most recent packageVersions for a given SBOM stream ID.
 * Iterates releases in descending date order and returns the first entry
 * that has a non-null packageVersions object.
 * Returns null if no populated entry is found.
 */
function lookupSbomVersions(sbomCache, streamId) {
  return lookupVersionsForStream(sbomCache, streamId);
}

/**
 * Return the most recent checkedAt timestamp for a given SBOM stream.
 *
 * Prefers the precise checkedAt field stored on each release entry (set by
 * the SBOM scraper at attestation-verification time).  Falls back to parsing
 * the date suffix encoded in the release key (e.g. "stable-20260501") when
 * checkedAt is unavailable.
 */
function sbomLatestCheckedAt(sbomCache, streamId) {
  const stream = sbomCache?.streams?.[streamId];
  if (!stream?.releases) return null;

  // Primary: use the checkedAt field from the most recent release entry.
  const checkedDates = Object.values(stream.releases)
    .map((rel) => rel?.checkedAt)
    .filter((ts) => typeof ts === "string" && ts.length > 0)
    .sort()
    .reverse();
  if (checkedDates.length > 0) return checkedDates[0];

  // Fallback: derive a midnight-UTC date from the release-key suffix.
  const dateKeys = Object.keys(stream.releases)
    .map((key) => {
      const m = /(\d{4})(\d{2})(\d{2})$/.exec(key);
      return m ? `${m[1]}-${m[2]}-${m[3]}T00:00:00Z` : null;
    })
    .filter(Boolean)
    .sort()
    .reverse();
  return dateKeys[0] || null;
}

function normalizeSbomStreamTag(streamTag) {
  if (!streamTag) return null;
  if (streamTag === "stable-daily") return "stable";
  // Normalize dot-separated tags (e.g. "lts.hwe") to dash-separated ("lts-hwe")
  // so they map correctly to SBOM stream IDs like "bluefin-lts-hwe".
  return streamTag.replace(/\./g, "-");
}

function buildSbomStreamId(spec, streamTag) {
  const normalizedTag = normalizeSbomStreamTag(streamTag);
  if (!spec?.sbomStreamId || !normalizedTag) return null;
  if (
    spec.id === "projectbluefin-bluefin-lts" &&
    (normalizedTag === "stable" || normalizedTag === "testing")
  ) {
    return spec.sbomStreamId;
  }
  if (spec.id === "projectbluefin-dakota") {
    return spec.sbomStreamId;
  }
  return spec.sbomStreamId.replace(
    /-(stable|latest|lts|beta)$/,
    `-${normalizedTag}`,
  );
}

function fallbackSbomVersionsByPackage(sbomCache, spec) {
  if (!sbomCache?.streams || !spec?.org || !spec?.package) return null;
  const streamEntries = Object.values(sbomCache.streams).filter(
    (stream) => stream?.org === spec.org && stream?.package === spec.package,
  );
  for (const stream of streamEntries) {
    const versions = lookupSbomVersions(sbomCache, stream.id);
    if (versions) return versions;
  }
  return null;
}

function cacheAgeHours(output = readJsonIfExists(OUTPUT_FILE, null)) {
  const generatedAt = Date.parse(output?.generatedAt || "");
  if (Number.isNaN(generatedAt)) return Number.POSITIVE_INFINITY;
  return (Date.now() - generatedAt) / (1000 * 60 * 60);
}

function isSbomSourcedProduct(product) {
  return (
    product?.versionSource === SBOM_VERSION_SOURCE ||
    product?.versions?.source === SBOM_VERSION_SOURCE ||
    product?.metadata?.versionSource === SBOM_VERSION_SOURCE
  );
}

function isCurrentImageCatalog(output) {
  if (output?.unavailable || !Array.isArray(output?.products)) return false;
  if (output.products.length !== PRODUCT_SPECS.length) return false;

  const productsById = new Map(
    output.products.map((product) => [product?.id, product]),
  );
  return PRODUCT_SPECS.every((spec) => {
    const product = productsById.get(spec.id);
    return product?.org === "projectbluefin" && isSbomSourcedProduct(product);
  });
}

function normalizeTestingTag(raw) {
  return raw
    .replace(/-(amd64|arm64)$/i, "")
    .replace(/([.-])\d{8}(?=-|$)/g, "")
    .replace(/-(\d{8})$/, "")
    .replace(/\.+/g, ".")
    .replace(/-+/g, "-")
    .replace(/\.-/g, "-")
    .replace(/-\./g, "-")
    .replace(/(^[.-]+|[.-]+$)/g, "");
}

function sbomVersionsForStream(sbomCache, spec, streamTag) {
  if (!sbomCache || !spec) return null;

  // First pass: try exact stream ID (dots → dashes, -testing preserved).
  // Hits dedicated streams like bluefin-lts-hwe-testing, bluefin-lts-testing-50.
  const exactStreamId = buildSbomStreamId(spec, streamTag);
  if (exactStreamId) {
    const exact = lookupSbomVersions(sbomCache, exactStreamId);
    if (exact) return exact;
  }

  // Second pass: strip -testing(-N)? suffix and retry.
  // Fallback for testing streams without a dedicated SBOM entry:
  //   lts-hwe-testing → lts-hwe → bluefin-lts-hwe
  //   lts-testing     → lts     → bluefin-lts
  const normalizedTag = normalizeSbomStreamTag(streamTag);
  if (!normalizedTag) {
    return fallbackSbomVersionsByPackage(sbomCache, spec);
  }
  const baseTag = normalizedTag.replace(/-testing(-\d+)?$/, "");
  if (baseTag !== normalizedTag) {
    const baseStreamId = buildSbomStreamId(spec, baseTag);
    if (baseStreamId && baseStreamId !== exactStreamId) {
      const base = lookupSbomVersions(sbomCache, baseStreamId);
      if (base) return base;
    }
  }

  return fallbackSbomVersionsByPackage(sbomCache, spec);
}

function latestFeedItem(feeds, source) {
  if (!source) return null;
  // stable-daily has no dedicated release feed — returning stable metadata would
  // misrepresent daily-only images as stable releases. Return null so callers
  // render unknown values instead.
  if (source.stream === "stable-daily") return null;
  const items =
    source.feed === "lts" ? feeds?.lts?.items : feeds?.bluefin?.items;
  if (!Array.isArray(items)) return null;
  const stream = source.stream;

  const match = items.find((item) => {
    const title = (item.title || "").toLowerCase();
    if (stream === "lts") {
      // Old format: "bluefin-lts lts: 20251223 ..."
      // New format: "lts.20260501: lts.20260501 release"
      // Current format: "stable-20260807: LTS"
      return (
        title.includes(" lts:") ||
        /^lts\.\d{8}/.test(title) ||
        /^stable-\d{8}/.test(title)
      );
    }
    return title.startsWith(`${stream}-`);
  });

  return match || null;
}

async function listTags(imageRef) {
  const { stdout } = await execFileAsync(
    "skopeo",
    ["list-tags", `docker://${imageRef}`],
    {
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed.Tags) ? parsed.Tags : [];
}

async function inspectImage(imageRef, tag) {
  const { stdout } = await execFileAsync(
    "skopeo",
    ["inspect", "--no-tags", `docker://${imageRef}:${tag}`],
    { maxBuffer: 8 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

function buildTopStreams(spec, tagSet) {
  const top = [];
  for (const tag of spec.streamOrder) {
    if (tag === "gts") continue;
    if (tagSet.has(tag)) {
      top.push({
        label: tag.toUpperCase(),
        tag,
        command: `sudo bootc switch ghcr.io/${spec.org}/${spec.package}:${tag} --enforce-container-sigpolicy`,
        versions: null,
      });
    }
  }
  if (top.length === 0 && spec.streamOrder.length > 0) {
    const fallbackTag = spec.streamOrder[0];
    top.push({
      label: fallbackTag.toUpperCase(),
      tag: fallbackTag,
      command: tagSet.has(fallbackTag)
        ? `sudo bootc switch ghcr.io/${spec.org}/${spec.package}:${fallbackTag} --enforce-container-sigpolicy`
        : null,
      versions: null,
    });
  }
  return top;
}

function attachNvidiaCommands(
  streams,
  spec,
  nvidiaTagSet,
  existingStreams = [],
) {
  if (!spec.nvidiaPackage) return streams;

  return streams.map((entry) => {
    if (!entry.command) {
      return { ...entry, nvidiaCommand: null };
    }
    if (!nvidiaTagSet && Array.isArray(existingStreams)) {
      const existingEntry = existingStreams.find((s) => s.tag === entry.tag);
      if (existingEntry && "nvidiaCommand" in existingEntry) {
        return { ...entry, nvidiaCommand: existingEntry.nvidiaCommand };
      }
    }

    let nvidiaTag = null;

    if (nvidiaTagSet && nvidiaTagSet.has(entry.tag)) {
      nvidiaTag = entry.tag;
    } else if (
      spec.nvidiaTagFallback?.[entry.tag] &&
      nvidiaTagSet?.has(spec.nvidiaTagFallback[entry.tag])
    ) {
      nvidiaTag = spec.nvidiaTagFallback[entry.tag];
    } else if (nvidiaTagSet && nvidiaTagSet.size === 0) {
      // Package exists but has no release tag matching entry.tag
      nvidiaTag = entry.tag;
    }

    if (!nvidiaTag && nvidiaTagSet && !nvidiaTagSet.has(entry.tag)) {
      return { ...entry, nvidiaCommand: null };
    }

    return {
      ...entry,
      nvidiaCommand: `sudo bootc switch ghcr.io/${spec.org}/${spec.nvidiaPackage}:${nvidiaTag || entry.tag} --enforce-container-sigpolicy`,
    };
  });
}

function buildTestingStreams(spec, tags) {
  if (!spec.allowTestingStreams) {
    return [];
  }

  const normalized = new Set();
  for (const raw of tags) {
    const lower = raw.toLowerCase();

    // Global exclusions: deprecated lines or non-supported branches.
    if (lower.includes("gts")) continue;
    if (lower.includes("unstable")) continue;
    if (lower.includes("stream10")) continue;
    if (/(^|-)10(-|$)/.test(lower)) continue;

    // LTS-only testing families.
    const isLtsTestingFamily =
      /^lts-testing(?:-\d+)?$/.test(lower) ||
      /^lts-hwe-testing(?:-\d+)?$/.test(lower) ||
      /^lts-testing-hwe(?:-\d+)?$/.test(lower);

    if (!isLtsTestingFamily) {
      continue;
    }

    normalized.add(normalizeTestingTag(lower));
  }

  return [...normalized]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((tag) => ({
      label: tag,
      tag,
      command: `sudo bootc switch ghcr.io/${spec.org}/${spec.package}:${tag} --enforce-container-sigpolicy`,
      versions: null,
    }));
}

function lookupNvidiaVersionFromSbom(sbomCache, streamId) {
  if (!sbomCache || !streamId) return null;
  const stream = sbomCache.streams?.[streamId];
  if (!stream?.releases) return null;
  const keys = Object.keys(stream.releases).sort().reverse();
  for (const k of keys) {
    const v = stream.releases[k]?.packageVersions?.nvidia;
    if (v) return v;
  }
  return null;
}

function resolveNvidiaVersion(spec, sbomCache, baseNvidia) {
  if (baseNvidia) return baseNvidia;
  if (!sbomCache || !spec) return null;
  if (spec.nvidiaSbomStreamId) {
    const v = lookupNvidiaVersionFromSbom(sbomCache, spec.nvidiaSbomStreamId);
    if (v) return v;
  }
  if (spec.nvidiaSbomFallbackStreamId) {
    const v = lookupNvidiaVersionFromSbom(
      sbomCache,
      spec.nvidiaSbomFallbackStreamId,
    );
    if (v) return v;
  }
  return null;
}

async function buildStreamVersionInfo(
  spec,
  imageRef,
  streamTag,
  feeds,
  sbomCache,
) {
  const sbomVersions = sbomVersionsForStream(sbomCache, spec, streamTag);

  return {
    gnome: sbomVersions?.gnome || null,
    kernel: sbomVersions?.kernel || null,
    nvidia: resolveNvidiaVersion(spec, sbomCache, sbomVersions?.nvidia),
    fedora: sbomVersions?.fedora || null,
    flatpak: sbomVersions?.flatpak || null,
    mesa: sbomVersions?.mesa || null,
    podman: sbomVersions?.podman || null,
    systemd: sbomVersions?.systemd || null,
    bootc: sbomVersions?.bootc || null,
    pipewire: sbomVersions?.pipewire || null,
  };
}

function attachNvidiaTestingCommands(
  streams,
  spec,
  nvidiaTagSet,
  existingTestingStreams = [],
) {
  if (!spec.nvidiaPackage) return streams;

  return streams.map((entry) => {
    if (!nvidiaTagSet && Array.isArray(existingTestingStreams)) {
      const existingEntry = existingTestingStreams.find(
        (s) => s.tag === entry.tag,
      );
      if (existingEntry && "nvidiaCommand" in existingEntry) {
        return { ...entry, nvidiaCommand: existingEntry.nvidiaCommand };
      }
    }

    if (!nvidiaTagSet?.has(entry.tag)) {
      return { ...entry, nvidiaCommand: null };
    }

    return {
      ...entry,
      nvidiaCommand: `sudo bootc switch ghcr.io/${spec.org}/${spec.nvidiaPackage}:${entry.tag} --enforce-container-sigpolicy`,
    };
  });
}

function buildSecurityInfo(spec, inspectTag, isAvailable = true) {
  const imageRef = `ghcr.io/${spec.org}/${spec.package}:${inspectTag}`;

  // Signing policy per repo lives in scripts/lib/signing-trust.js — the single
  // source of truth shared with fetch-github-sbom.js. Keeping it out of this
  // function means a repo moving between keyless and key-based signing cannot
  // leave the site publishing a verify command that no longer verifies.
  const trust = trustForRepo(spec.keyRepo);

  const isKeyless = Boolean(trust?.keyless);
  const attestationLive = Boolean(trust?.keyless && trust?.attestationLive);
  const cosignKeyUrl = trust?.cosignKeyUrl || null;
  const hasNoPipeline = !isKeyless && !cosignKeyUrl;

  // Keyless: GitHub OIDC / Sigstore — certificate-based, no public key file.
  // The OIDC identity is derived from keyRepo so LTS variants resolve to their own
  // workflow repo automatically. We use --certificate-identity-regexp with a ^ anchor so
  // any workflow file under .github/workflows/ in the signing repo is accepted (the exact
  // workflow filename may differ across streams).
  const OIDC_ISSUER = "https://token.actions.githubusercontent.com";
  const OIDC_IDENTITY_PREFIX = `^https://github.com/${spec.keyRepo}/.github/workflows/`;
  const SLSA_TYPE = "https://slsa.dev/provenance/v1";

  if (hasNoPipeline || !isAvailable) {
    return {
      cosignKeyUrl: null,
      verifyCommand: null,
      attestCommand: null,
      hasAttestation: false,
      sbomCommand: null,
    };
  }

  if (isKeyless) {
    return {
      cosignKeyUrl: null,
      verifyCommand: `cosign verify --certificate-oidc-issuer ${OIDC_ISSUER} --certificate-identity-regexp '${OIDC_IDENTITY_PREFIX}' ${imageRef}`,
      attestCommand: `cosign verify-attestation --type ${SLSA_TYPE} --certificate-oidc-issuer ${OIDC_ISSUER} --certificate-identity-regexp '${OIDC_IDENTITY_PREFIX}' ${imageRef}`,
      hasAttestation: attestationLive,
      sbomCommand: `oras discover ${imageRef}`,
    };
  }

  // Key-based signing (LTS): signatures exist but SLSA attestations are not yet published.
  // The command is included so users can run it in the future when attestations are implemented.
  return {
    cosignKeyUrl,
    verifyCommand: `cosign verify --key ${cosignKeyUrl} ${imageRef}`,
    attestCommand: `cosign verify-attestation --type ${SLSA_TYPE} --key ${cosignKeyUrl} ${imageRef}`,
    hasAttestation: false,
    sbomCommand: `oras discover ${imageRef}`,
  };
}

function releaseInfoFromFeedItem(item) {
  if (!item) return null;
  return {
    title: item.title || null,
    url: item.link || null,
    assetsUrl: item.link ? `${item.link}#assets` : null,
  };
}

function releaseInfoFromSource(feeds, source) {
  if (!source) return null;
  if (source.url) {
    return {
      title: source.title || null,
      url: source.url,
      assetsUrl: source.assetsUrl || `${source.url}#assets`,
    };
  }
  return releaseInfoFromFeedItem(latestFeedItem(feeds, source));
}

async function buildProduct(spec, feeds, cachedById, ageHours, sbomCache) {
  const existing = cachedById.get(spec.id) || null;
  const shouldRefresh =
    FORCE_REFRESH ||
    !existing ||
    ageHours >= REFRESH_HOURS ||
    !isSbomSourcedProduct(existing);

  if (!shouldRefresh && existing) {
    return {
      ...existing,
      metadataSource: "cache",
    };
  }

  const imageRef = `ghcr.io/${spec.org}/${spec.package}`;

  let tags = [];
  try {
    tags = await listTags(imageRef);
  } catch {
    tags =
      existing?.allTags ||
      [
        ...(existing?.streams || []).filter((s) => s.command).map((s) => s.tag),
        ...(existing?.testingStreams || []).filter((s) => s.command).map((s) => s.tag),
      ].filter(Boolean);
  }
  const tagSet = new Set(tags);

  let nvidiaTagSet = null;
  if (spec.nvidiaPackage) {
    try {
      const nvidiaTags = await listTags(
        `ghcr.io/${spec.org}/${spec.nvidiaPackage}`,
      );
      nvidiaTagSet = new Set(nvidiaTags);
    } catch {
      nvidiaTagSet = existing?.nvidiaTags ? new Set(existing.nvidiaTags) : null;
    }
  }

  const streams = attachNvidiaCommands(
    buildTopStreams(spec, tagSet),
    spec,
    nvidiaTagSet,
    existing?.streams,
  );
  const testingStreams = attachNvidiaTestingCommands(
    buildTestingStreams(spec, tags),
    spec,
    nvidiaTagSet,
    existing?.testingStreams,
  );

  for (const stream of streams) {
    stream.versions = await buildStreamVersionInfo(
      spec,
      imageRef,
      stream.tag,
      feeds,
      sbomCache,
    );
  }

  for (const stream of testingStreams) {
    stream.versions = await buildStreamVersionInfo(
      spec,
      imageRef,
      stream.tag,
      feeds,
      sbomCache,
    );
  }
  const inspectTag = streams[0]?.tag || "stable";

  let metadata = null;
  let metadataSource = "unavailable";
  try {
    const inspected = await inspectImage(imageRef, inspectTag);
    const labels = inspected.Labels || {};
    const digest = inspected.Digest || null;
    metadata = {
      digest,
      digestShort: digest ? digest.replace(/^sha256:/, "").slice(0, 12) : null,
      digestLink: null,
      architecture: inspected.Architecture || null,
      os: inspected.Os || null,
      labels: {
        version: labels["org.opencontainers.image.version"] || null,
        revision: labels["org.opencontainers.image.revision"] || null,
        source: labels["org.opencontainers.image.source"] || null,
        ostreeCommit: labels["ostree.commit"] || null,
      },
    };
    metadataSource = "live";
  } catch {
    metadata = existing?.metadata || null;
    metadataSource = metadata ? "cache" : "unavailable";
  }

  const feedItem = latestFeedItem(feeds, spec.releaseSource);
  const sbomVersions = sbomVersionsForStream(
    sbomCache,
    spec,
    spec.streamOrder[0],
  );
  const versions = {
    source: SBOM_VERSION_SOURCE,
    gnome: sbomVersions?.gnome || null,
    kernel: sbomVersions?.kernel || null,
    nvidia: resolveNvidiaVersion(spec, sbomCache, sbomVersions?.nvidia),
    release: releaseInfoFromSource(feeds, spec.releaseSource),
  };

  if (metadata && !metadata.digestLink && versions.release?.assetsUrl) {
    metadata.digestLink = versions.release.assetsUrl;
  }

  // Precedence for lastPublishedAt:
  // 1. SBOM checkedAt timestamp (precise attestation-verification time)
  // 2. GitHub releases feed pubDate
  // 3. Existing cached value (last resort — can be stale from an old run)
  const sbomDate = spec.sbomStreamId
    ? sbomLatestCheckedAt(sbomCache, spec.sbomStreamId)
    : null;
  const lastPublishedAt =
    sbomDate || feedItem?.pubDate || existing?.lastPublishedAt || null;
  const staleCutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const bestDateForStale = sbomDate || feedItem?.pubDate || null;
  const stale = bestDateForStale
    ? Date.parse(bestDateForStale) < staleCutoff
    : false;

  return {
    id: spec.id,
    name: spec.name,
    org: spec.org,
    package: spec.package,
    versionSource: spec.versionSource,
    summary: spec.summary,
    artwork: spec.artwork,
    imageRef,
    packagePageUrl: `https://github.com/orgs/${spec.org}/packages/container/package/${spec.package}`,
    isoSectionLink: spec.isoSectionLink || null,
    supportedArches: spec.supportedArches || null,
    streams,
    testingStreams,
    metadata,
    metadataSource,
    versions,
    security: buildSecurityInfo(spec, inspectTag, tagSet.has(inspectTag)),
    inspectTag,
    lastPublishedAt: lastPublishedAt,
    stale,
    keepEvenIfStale: Boolean(spec.keepEvenIfStale),
  };
}

async function main({ outputFile = OUTPUT_FILE, sbomFile = SBOM_FILE } = {}) {
  const existing = readJsonIfExists(outputFile, null);
  const sbomCache = readSbomCache(sbomFile);
  if (!hasUsableSbomData(sbomCache)) {
    const hasStreams =
      sbomCache?.streams &&
      typeof sbomCache.streams === "object" &&
      !Array.isArray(sbomCache.streams);
    const reason = hasStreams
      ? SBOM_NO_RELEASE_DATA_REASON
      : SBOM_UNAVAILABLE_REASON;
    const output = handleUnavailableCache(existing, reason, outputFile);
    if (output.unavailable) {
      console.log(`Image data unavailable: ${reason}.`);
    }
    return;
  }

  const ageHours = cacheAgeHours(existing);
  if (
    isCurrentImageCatalog(existing) &&
    ageHours < CACHE_MAX_AGE_HOURS &&
    !FORCE_REFRESH
  ) {
    console.log(
      `Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
    );
    return;
  }

  const cachedById = new Map(
    (existing?.products || []).map((product) => [product.id, product]),
  );
  const feeds = {
    bluefin: readJsonIfExists(FEED_BLUEFIN, { items: [] }),
    lts: readJsonIfExists(FEED_LTS, { items: [] }),
  };
  console.log("SBOM attestation cache loaded.");

  const products = [];
  for (const spec of PRODUCT_SPECS) {
    console.log(`Fetching ${spec.org}/${spec.package}...`);
    const product = await buildProduct(
      spec,
      feeds,
      cachedById,
      ageHours,
      sbomCache,
    );
    if (product.stale && !product.keepEvenIfStale) {
      console.log(
        `Skipping stale image ${spec.org}/${spec.package} (older than ${STALE_DAYS} days).`,
      );
      continue;
    }
    products.push(product);
  }

  products.sort((a, b) => a.name.localeCompare(b.name));

  const output = {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    refreshHours: REFRESH_HOURS,
    staleDays: STALE_DAYS,
    products,
  };

  writeOutput(output, outputFile);
  console.log(`Image data saved to ${outputFile}`);
}

function writeOutput(output, outputFile = OUTPUT_FILE) {
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const temporaryFile = `${outputFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(output, null, 2), "utf-8");
  fs.renameSync(temporaryFile, outputFile);
}

function buildUnavailableOutput(reason = SBOM_UNAVAILABLE_REASON) {
  return {
    generatedAt: new Date().toISOString(),
    cacheHours: CACHE_MAX_AGE_HOURS,
    refreshHours: REFRESH_HOURS,
    staleDays: STALE_DAYS,
    products: [],
    unavailable: true,
    stateReason: reason,
  };
}

function handleUnavailableCache(
  existing,
  reason = SBOM_UNAVAILABLE_REASON,
  outputFile = OUTPUT_FILE,
) {
  if (isCurrentImageCatalog(existing)) {
    console.warn(
      "SBOM cache unavailable. Preserving existing SBOM-derived image catalog.",
    );
    return existing;
  }

  const output = buildUnavailableOutput(reason);
  writeOutput(output, outputFile);
  return output;
}

function reportMainError(error, outputFile = OUTPUT_FILE) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`fetch-github-images: ${message}`);
  try {
    handleUnavailableCache(
      readJsonIfExists(outputFile, null),
      `Image catalog fetch failed: ${message}`,
      outputFile,
    );
  } catch (writeError) {
    const writeMessage =
      writeError instanceof Error ? writeError.message : String(writeError);
    console.error(
      `fetch-github-images: failed to write unavailable output: ${writeMessage}`,
    );
  }
}

if (require.main === module) {
  main().catch((error) => reportMainError(error));
}

module.exports = {
  PRODUCT_SPECS,
  buildSecurityInfo,
  buildStreamVersionInfo,
  buildTestingStreams,
  buildTopStreams,
  buildUnavailableOutput,
  cacheAgeHours,
  handleUnavailableCache,
  hasUsableSbomData,
  isCurrentImageCatalog,
  main,
  normalizeTestingTag,
  reportMainError,
  releaseInfoFromSource,
  sbomVersionsForStream,
};
