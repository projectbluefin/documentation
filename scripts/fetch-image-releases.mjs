#!/usr/bin/env node
/**
 * Public image releases and installer downloads; generated data is never a seed.
 * ISO publication channels are not the streams embedded in their payloads.
 * An installer URL is floating: its versions must never come from an OS release.
 */
import { mkdir, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ghFetch } from "./lib/gh.js";
import { mapWithConcurrency } from "./lib/request-queue.js";
import { splitMdRow, parseTwoColTableMd } from "./lib/card-feed-parser.mjs";
import { extractBstPackageVersions } from "./lib/sbom/bst.js";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../static/data/image-releases.json",
);
const RECENT_LIMIT = 30;
const PER_STREAM = 4;
const ISO_REPOSITORY = "projectbluefin/iso";
const TESTING_HOST = "https://projectbluefin.dev";
const STABLE_HOST = "https://download.projectbluefin.io";
const ISO_WORKFLOW = `https://github.com/${ISO_REPOSITORY}/blob/main/.github/workflows/reusable-build-iso-anaconda.yml`;
const PROMOTION_WORKFLOW = `https://github.com/${ISO_REPOSITORY}/blob/main/.github/workflows/promote-iso.yml`;

export const PRODUCT_SOURCES = {
  server: { repository: "projectbluefin/server", kind: "image" },
  classic: { repository: "ublue-os/bluefin", kind: "image" },
  dakota: { repository: "projectbluefin/dakota", kind: "image" },
  utah: { repository: "projectbluefin/utah", kind: "image" },
  lts: { repository: "projectbluefin/bluefin-lts", kind: "image" },
};

export function releaseStream(release, source) {
  if (source.repository === PRODUCT_SOURCES.server.repository) return null;
  if (source.kind === "iso") {
    // These markers are emitted by the ISO build/promotion workflows. GitHub's
    // generic prerelease flag alone does not establish a Bluefin image stream.
    if (
      release.prerelease &&
      /uploaded to the \*\*testing\*\* bucket/.test(release.body ?? "")
    )
      return "testing";
    if (
      !release.prerelease &&
      /Promoted from source prerelease:/.test(release.body ?? "")
    )
      return "stable";
    return null;
  }
  return /^(stable|testing)[.-]\d/.exec(release.tag_name ?? "")?.[1] ?? null;
}

const COMPONENT_FIELDS = {
  kernel: "kernel",
  "kernel (lts)": "kernel",
  gnome: "gnome",
  "gnome shell": "gnome",
  mesa: "mesa",
  nvidia: "nvidia",
  systemd: "systemd",
  fsdk: "fsdk",
  "freedesktop sdk": "fsdk",
  "freedesktop-sdk": "fsdk",
  podman: "podman",
  flatpak: "flatpak",
  bootc: "bootc",
  pipewire: "pipewire",
  zfs: "zfs",
  k0s: "k0s",
};

export function parseReleaseVersions(body = "") {
  const rows = [];
  let inComponents = false;
  for (const line of (body ?? "").split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) {
      inComponents = /^#{2,3}\s+(Key components|Major packages)\s*$/.test(line);
    } else if (inComponents && line.startsWith("|")) {
      rows.push(splitMdRow(line));
    }
  }
  const versions = {};
  for (const { name, version } of parseTwoColTableMd(rows)) {
    const key = COMPONENT_FIELDS[name.toLowerCase()];
    if (key && /^\d/.test(version)) versions[key] = version;
  }
  return Object.keys(versions).length ? versions : null;
}

export function normalizeRelease(
  release,
  source,
  {
    assets = release.assets ?? [],
    versions = parseReleaseVersions(release.body),
    versionsSource = versions ? "release-notes" : null,
  } = {},
) {
  return {
    tag: release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at ?? null,
    stream: releaseStream(release, source),
    source,
    assets: assets.map((asset) => ({
      name: asset.name,
      url: asset.browser_download_url,
      size: asset.size ?? null,
    })),
    // No date joins or floating stream cache: only this release's own metadata.
    versions: source.kind === "iso" ? null : versions,
    versionsSource: source.kind === "iso" ? null : versionsSource,
  };
}

function recentReleases(releases, source) {
  const counts = new Map();
  return releases.filter((release) => {
    if (release.draft) return false;
    const stream = releaseStream(release, source);
    const families =
      source.kind === "iso"
        ? [
            ...new Set(
              (release.assets ?? [])
                .map((asset) => isoFamily(asset.name))
                .filter(Boolean),
            ),
          ]
        : ["image"];
    const buckets = (families.length ? families : ["unknown"]).map(
      (family) => `${family}:${stream}`,
    );
    const limit =
      source.repository === PRODUCT_SOURCES.server.repository ? 7 : PER_STREAM;
    const keep = buckets.some((bucket) => (counts.get(bucket) ?? 0) < limit);
    for (const bucket of buckets)
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    return keep;
  });
}

async function releaseAssets(release, repository) {
  if ((release.assets?.length ?? 0) < 100) return release.assets ?? [];
  const assets = [];
  // Bound asset pagination independently from the recent-release window.
  for (let page = 1; page <= 10; page++) {
    const batch = await ghFetch(
      `/repos/${repository}/releases/${release.id}/assets?per_page=100&page=${page}`,
      { signal: AbortSignal.timeout(30000) },
    );
    assets.push(...batch);
    if (batch.length < 100) break;
  }
  return assets;
}

async function fetchSource(source) {
  try {
    const releases = await ghFetch(
      `/repos/${source.repository}/releases?per_page=${RECENT_LIMIT}`,
      { signal: AbortSignal.timeout(30000) },
    );
    if (!Array.isArray(releases))
      throw new Error("Unexpected releases response");
    const selected = recentReleases(releases, source);
    const rows = [];
    for (const release of selected) {
      const assets = await releaseAssets(release, source.repository);
      let versions =
        source.kind === "image" ? parseReleaseVersions(release.body) : null;
      let versionsSource = versions ? "release-notes" : null;
      let versionsStateReason = null;
      // Reuse the BST parser on small, release-attached SPDX documents. Large
      // RPM SBOMs remain downloadable; their release's component table is used.
      const sbom = assets.find(
        (asset) =>
          /\.spdx\.json$/.test(asset.name) && asset.size <= 16 * 1024 * 1024,
      );
      if (source.kind === "image" && sbom) {
        try {
          const response = await fetch(sbom.browser_download_url, {
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok) throw new Error(`SBOM HTTP ${response.status}`);
          const document = await response.json();
          const isBst = document.packages?.some(
            (pkg) =>
              pkg.SPDXID?.startsWith("SPDXRef-bluefin-server-") ||
              pkg.externalRefs?.some(
                (ref) => ref.referenceType === "bst-element",
              ),
          );
          if (isBst) {
            const { allPackages: _allPackages, ...parsed } =
              extractBstPackageVersions(document);
            const populated = Object.fromEntries(
              Object.entries(parsed).filter(([, value]) => value !== null),
            );
            versions = { ...populated, ...versions };
            if (Object.keys(populated).length)
              versionsSource = sbom.browser_download_url;
          }
        } catch (error) {
          versionsStateReason = `Release SBOM unavailable: ${error.message}`;
        }
      }
      if (source.repository === PRODUCT_SOURCES.server.repository) {
        try {
          const file = await ghFetch(
            `/repos/${source.repository}/contents/elements/freedesktop-sdk.bst?ref=${encodeURIComponent(release.tag_name)}`,
            { signal: AbortSignal.timeout(30000) },
          );
          const sdk = Buffer.from(file.content, "base64")
            .toString("utf8")
            .match(/^\s*ref:\s*freedesktop-sdk-(\d+\.\d+\.\d+)-/m)?.[1];
          if (sdk) {
            versions = { ...versions, fsdk: sdk };
            versionsSource ??= `https://github.com/${source.repository}/blob/${encodeURIComponent(release.tag_name)}/elements/freedesktop-sdk.bst`;
          }
        } catch (error) {
          versionsStateReason = [
            versionsStateReason,
            `Release SDK metadata unavailable: ${error.message}`,
          ]
            .filter(Boolean)
            .join(" ");
        }
      }
      if (versions && !Object.keys(versions).length) versions = null;
      const row = normalizeRelease(release, source, {
        assets,
        versions,
        versionsSource,
      });
      if (versions?.fsdk)
        row.fsdkSource = `https://github.com/${source.repository}/blob/${encodeURIComponent(release.tag_name)}/elements/freedesktop-sdk.bst`;
      if (versionsStateReason) row.versionsStateReason = versionsStateReason;
      rows.push(row);
    }
    return {
      releases: rows,
      unavailable: !rows.length,
      stateReason: rows.length
        ? null
        : `No published releases in ${source.repository}.`,
    };
  } catch (error) {
    return {
      releases: [],
      unavailable: true,
      stateReason: `Releases unavailable for ${source.repository}: ${error.message}`,
    };
  }
}

function isoFamily(name) {
  if (!name.startsWith("bluefin-")) return null;
  if (name.includes("-lts-")) return "lts";
  if (/^bluefin-(?:nvidia-open-)?stable-/.test(name)) return "classic";
  return null;
}

function downloadCandidate(name, stream, sourceUrl, payloadStream = null) {
  return {
    name,
    url: `${stream === "stable" ? STABLE_HOST : TESTING_HOST}/${name}`,
    stream,
    payloadStream,
    sourceUrl,
  };
}

async function inspectDownload(candidate) {
  try {
    const response = await fetch(candidate.url, {
      method: "HEAD",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const length = response.headers.get("content-length");
    return {
      ...candidate,
      size: length !== null && /^\d+$/.test(length) ? Number(length) : null,
      lastModified: response.headers.get("last-modified"),
      versions: null,
      unavailable: false,
    };
  } catch (error) {
    return {
      ...candidate,
      size: null,
      lastModified: null,
      versions: null,
      unavailable: true,
      stateReason: `Download unavailable: ${error.message}`,
    };
  }
}

function streamAvailability(product, key) {
  return Object.fromEntries(
    ["stable", "testing"].map((stream) => {
      const available =
        product.releases.some((row) => row.stream === stream) ||
        product.downloads.some(
          (download) => download.stream === stream && !download.unavailable,
        );
      return [
        stream,
        {
          unavailable: !available,
          stateReason: available
            ? null
            : key === "server"
              ? "Server publishes versioned DDI/UKI artifacts, not stable/testing bootc streams or ISOs."
              : `No ${stream} release or downloadable installer found in the bounded public sources.`,
        },
      ];
    }),
  );
}

export async function fetchImageReleases() {
  const keys = Object.keys(PRODUCT_SOURCES);
  const sources = [
    ...Object.values(PRODUCT_SOURCES),
    { repository: ISO_REPOSITORY, kind: "iso" },
  ];
  const fetched = await mapWithConcurrency(sources, fetchSource, {
    concurrency: 3,
  });
  const products = Object.fromEntries(
    keys.map((key, index) => [key, { ...fetched[index], downloads: [] }]),
  );
  const iso = fetched[fetched.length - 1];
  for (const key of ["classic", "lts"]) {
    for (const row of iso.releases) {
      const assets = row.assets.filter(
        (asset) =>
          isoFamily(asset.name) === key || isoFamily(asset.name) === null,
      );
      if (assets.some((asset) => isoFamily(asset.name) === key))
        products[key].releases.push({ ...row, assets });
    }
    if (iso.unavailable)
      products[key].stateReason = [products[key].stateReason, iso.stateReason]
        .filter(Boolean)
        .join(" ");
  }

  const candidates = [];
  for (const stream of ["stable", "testing"]) {
    for (const name of [
      "bluefin-stable-x86_64.iso",
      "bluefin-nvidia-open-stable-x86_64.iso",
    ]) {
      candidates.push({
        key: "classic",
        ...downloadCandidate(
          name,
          stream,
          stream === "stable" ? PROMOTION_WORKFLOW : ISO_WORKFLOW,
          "stable",
        ),
      });
    }
  }
  // These legacy production installers are explicitly retained upstream while
  // the non-HWE Anaconda build is disabled (projectbluefin/iso README).
  for (const name of ["bluefin-lts-x86_64.iso", "bluefin-gdx-lts-x86_64.iso"]) {
    candidates.push({
      key: "lts",
      ...downloadCandidate(
        name,
        "stable",
        `https://github.com/${ISO_REPOSITORY}/blob/main/README.md`,
      ),
    });
  }
  for (const row of iso.releases) {
    for (const asset of row.assets) {
      if (!asset.name.endsWith(".iso.torrent")) continue;
      const key = isoFamily(asset.name);
      if (!key || row.stream !== "testing") continue;
      candidates.push({
        key,
        ...downloadCandidate(
          asset.name.replace(/\.torrent$/, ""),
          "testing",
          row.url,
        ),
      });
    }
  }
  for (const [key, payloadStream] of [
    ["dakota", "stable"],
    ["utah", "testing"],
  ]) {
    candidates.push({
      key,
      ...downloadCandidate(
        `${key}-live-latest.iso`,
        "testing",
        `https://github.com/projectbluefin/dakota-iso/blob/main/.github/workflows/${key === "dakota" ? "build-iso" : "build-iso-utah"}.yml`,
        payloadStream,
      ),
    });
  }
  const unique = [
    ...new Map(
      candidates.map((candidate) => [candidate.url, candidate]),
    ).values(),
  ];
  const artifacts = unique.flatMap(({ key, ...candidate }) => [
    { key, ...candidate },
    {
      key,
      ...candidate,
      name: `${candidate.name}-CHECKSUM`,
      url: `${candidate.url}-CHECKSUM`,
    },
    ...(key === "classic" || key === "lts"
      ? [
          {
            key,
            ...candidate,
            name: `${candidate.name}.torrent`,
            url: `${candidate.url}.torrent`,
          },
        ]
      : []),
    ...(key === "classic" || key === "lts"
      ? [
          {
            key,
            ...candidate,
            name: `${candidate.name}.torrent-CHECKSUM`,
            url: `${candidate.url}.torrent-CHECKSUM`,
          },
        ]
      : []),
    ...(key === "classic" || key === "lts"
      ? [
          {
            key,
            ...candidate,
            name: candidate.name.replace(/\.iso$/, ".manifest.json"),
            url: candidate.url.replace(/\.iso$/, ".manifest.json"),
          },
        ]
      : []),
  ]);
  const downloads = await mapWithConcurrency(artifacts, inspectDownload, {
    concurrency: 4,
  });
  for (const { key, ...download } of downloads)
    products[key].downloads.push(download);
  for (const key of keys) {
    const product = products[key];
    product.releases.sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
    product.unavailable =
      !product.releases.length &&
      !product.downloads.some((download) => !download.unavailable);
    product.streams = streamAvailability(product, key);
    if (key === "lts")
      product.downloadsStateReason =
        "Non-HWE Anaconda ISO builds are disabled upstream; retained production installers are older and are not matched to current image releases.";
  }
  return { generatedAt: new Date().toISOString(), products };
}

export async function main() {
  const payload = await fetchImageReleases();
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(`${OUT}.tmp`, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(`${OUT}.tmp`, OUT);
  console.log(`fetch-image-releases: wrote ${OUT}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (error) {
    const payload = {
      generatedAt: new Date().toISOString(),
      products: Object.fromEntries(
        Object.keys(PRODUCT_SOURCES).map((key) => [
          key,
          {
            releases: [],
            downloads: [],
            unavailable: true,
            stateReason: `Image release data could not be generated: ${error.message}`,
          },
        ]),
      ),
    };
    console.warn("fetch-image-releases: generation unavailable");
    try {
      await mkdir(dirname(OUT), { recursive: true });
      await writeFile(`${OUT}.tmp`, `${JSON.stringify(payload, null, 2)}\n`);
      await rename(`${OUT}.tmp`, OUT);
    } catch {
      console.warn("fetch-image-releases: could not write unavailable payload");
    }
  }
}
