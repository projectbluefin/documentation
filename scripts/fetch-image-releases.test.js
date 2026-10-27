import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_SOURCES,
  fetchImageReleases,
  normalizeRelease,
  parseReleaseVersions,
  releaseStream,
} from "./fetch-image-releases.mjs";

const ISO = { repository: "projectbluefin/iso", kind: "iso" };

// ── releaseStream ───────────────────────────────────────────────────────

test("releaseStream: image tags name their stream", () => {
  assert.equal(
    releaseStream({ tag_name: "stable-20261010" }, PRODUCT_SOURCES.classic),
    "stable",
  );
  assert.equal(
    releaseStream({ tag_name: "testing.20261010" }, PRODUCT_SOURCES.dakota),
    "testing",
  );
  assert.equal(
    releaseStream({ tag_name: "latest-20261010" }, PRODUCT_SOURCES.utah),
    null,
  );
  assert.equal(releaseStream({}, PRODUCT_SOURCES.lts), null);
});

test("releaseStream: server releases never map to a bootc stream", () => {
  assert.equal(
    releaseStream({ tag_name: "stable-20261010" }, PRODUCT_SOURCES.server),
    null,
  );
});

test("releaseStream: ISO streams come from workflow markers, not the prerelease flag alone", () => {
  assert.equal(
    releaseStream(
      { prerelease: true, body: "uploaded to the **testing** bucket" },
      ISO,
    ),
    "testing",
  );
  assert.equal(
    releaseStream(
      { prerelease: false, body: "Promoted from source prerelease: 26.10" },
      ISO,
    ),
    "stable",
  );
  assert.equal(releaseStream({ prerelease: true, body: "" }, ISO), null);
  assert.equal(
    releaseStream(
      { prerelease: true, body: "Promoted from source prerelease: 26.10" },
      ISO,
    ),
    null,
  );
  assert.equal(
    releaseStream(
      { prerelease: false, body: "uploaded to the **testing** bucket" },
      ISO,
    ),
    null,
  );
  assert.equal(releaseStream({ prerelease: false }, ISO), null);
});

// ── parseReleaseVersions ────────────────────────────────────────────────

test("parseReleaseVersions: reads only the components table and the new side of a bump", () => {
  assert.deepEqual(
    parseReleaseVersions(
      "### Major packages\n| **Kernel** | 7.1 ➡️ 7.2 |\n| **Gnome** | 51.0 |\n### All Images\n| **Mesa** | 99.0 |",
    ),
    { kernel: "7.2", gnome: "51.0" },
  );
  assert.deepEqual(
    parseReleaseVersions(
      "## Key components\n| **Kernel (LTS)** | `7.1.8-200` | unchanged |\n| **bootc** | `1.16.13` | |",
    ),
    { kernel: "7.1.8-200", bootc: "1.16.13" },
  );
});

test("parseReleaseVersions: ignores unknown components and non-numeric versions", () => {
  assert.deepEqual(
    parseReleaseVersions(
      "## Key components\n| **Freedesktop SDK** | 25.08.4 |\n| **Banana** | 1.0 |\n| **Podman** | n/a |",
    ),
    { fsdk: "25.08.4" },
  );
});

test("parseReleaseVersions: no components heading, empty or null body yields null", () => {
  assert.equal(parseReleaseVersions("| **Kernel** | 7.2 |"), null);
  assert.equal(parseReleaseVersions(""), null);
  assert.equal(parseReleaseVersions(null), null);
  assert.equal(parseReleaseVersions(), null);
});

// ── normalizeRelease ────────────────────────────────────────────────────

test("normalizeRelease: image row keeps release-notes versions and asset sizes", () => {
  const row = normalizeRelease(
    {
      tag_name: "stable-20261010",
      html_url: "https://example.test/r",
      published_at: "2026-10-10T00:00:00Z",
      body: "## Key components\n| **Kernel** | 6.17.1 |",
      assets: [
        { name: "a.txt", browser_download_url: "https://example.test/a" },
        {
          name: "b.txt",
          browser_download_url: "https://example.test/b",
          size: 0,
        },
      ],
    },
    PRODUCT_SOURCES.classic,
  );
  assert.equal(row.tag, "stable-20261010");
  assert.equal(row.url, "https://example.test/r");
  assert.equal(row.stream, "stable");
  assert.deepEqual(row.versions, { kernel: "6.17.1" });
  assert.equal(row.versionsSource, "release-notes");
  assert.deepEqual(row.assets, [
    { name: "a.txt", url: "https://example.test/a", size: null },
    { name: "b.txt", url: "https://example.test/b", size: 0 },
  ]);
});

test("normalizeRelease: missing metadata defaults to nulls and empty assets", () => {
  const row = normalizeRelease({ tag_name: "x" }, PRODUCT_SOURCES.utah);
  assert.equal(row.publishedAt, null);
  assert.deepEqual(row.assets, []);
  assert.equal(row.versions, null);
  assert.equal(row.versionsSource, null);
});

test("normalizeRelease: ISO rows never carry OS versions", () => {
  const row = normalizeRelease({ tag_name: "v1", assets: [] }, ISO, {
    versions: { kernel: "7.2" },
    versionsSource: "release-notes",
  });
  assert.equal(row.versions, null);
  assert.equal(row.versionsSource, null);
});

// ── fetchImageReleases (offline, fetch stubbed) ─────────────────────────

const STABLE = "https://download.projectbluefin.io";
const TESTING = "https://projectbluefin.dev";
const SERVER_SBOM = "https://example.test/server.spdx.json";
const CLASSIC_SBOM = "https://example.test/classic.spdx.json";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  };
}

function headResponse(status, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => {
      throw new Error("HEAD has no body");
    },
  };
}

function imageRelease(tag, publishedAt, extra = {}) {
  return {
    id: tag.length,
    tag_name: tag,
    html_url: `https://example.test/${tag}`,
    published_at: publishedAt,
    draft: false,
    prerelease: false,
    assets: [],
    body: "",
    ...extra,
  };
}

const serverRelease = imageRelease("v26.10.1200", "2026-10-10T00:00:00Z", {
  body: "## Key components\n| **bootc** | `1.16.13` | |",
  assets: [
    {
      name: "bluefin-server.spdx.json",
      size: 1024,
      browser_download_url: SERVER_SBOM,
    },
  ],
});

// Older server releases, newest first, so the seven-release cap has to drop some.
const olderServerReleases = [9, 8, 7, 6, 5, 4, 3, 2].map((day) =>
  imageRelease(`v26.10.0${day}00`, `2026-10-0${day}T00:00:00Z`),
);

// Newest first, as the GitHub releases API returns them.
const classicReleases = [
  imageRelease("stable-20261009", "2026-10-09T00:00:00Z", { draft: true }),
  imageRelease("stable-20261006", "2026-10-06T00:00:00Z", {
    body: "### Major packages\n| **Kernel** | 6.17.1 |",
    assets: [
      {
        name: "bluefin.spdx.json",
        size: 1024,
        browser_download_url: CLASSIC_SBOM,
      },
    ],
  }),
  ...[5, 4, 3, 2, 1].map((day) =>
    imageRelease(`stable-2026100${day}`, `2026-10-0${day}T00:00:00Z`),
  ),
];

const isoRelease = {
  id: 77,
  tag_name: "iso-20261020",
  html_url: "https://example.test/iso-20261020",
  published_at: "2026-10-20T00:00:00Z",
  draft: false,
  prerelease: true,
  body: "ISO uploaded to the **testing** bucket.",
  assets: [
    {
      name: "bluefin-stable-x86_64-20261020.iso.torrent",
      browser_download_url: "https://example.test/classic.torrent",
      size: 10,
    },
    {
      name: "bluefin-lts-hwe-x86_64-20261020.iso.torrent",
      browser_download_url: "https://example.test/lts.torrent",
      size: 11,
    },
    {
      name: "SHA256SUMS",
      browser_download_url: "https://example.test/sums",
      size: 12,
    },
  ],
};

function stubFetch(t) {
  const seen = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    seen.push({ url, method: init.method ?? "GET" });
    if (init.method === "HEAD") {
      if (url.startsWith(STABLE))
        return headResponse(200, {
          "content-length": "123456",
          "last-modified": "Tue, 20 Oct 2026 00:00:00 GMT",
        });
      if (url === `${TESTING}/dakota-live-latest.iso`)
        return headResponse(200, { "content-length": "chunked" });
      return headResponse(404);
    }
    if (url === SERVER_SBOM)
      return jsonResponse({
        spdxVersion: "SPDX-2.3",
        packages: [
          {
            name: "linux",
            versionInfo: "6.12.1",
            SPDXID: "SPDXRef-freedesktop-sdk-components-linux-0",
          },
          {
            name: "openzfs",
            versionInfo: "2.3.4",
            SPDXID: "SPDXRef-bluefin-server-zfs-openzfs-0",
          },
        ],
      });
    if (url === CLASSIC_SBOM) return jsonResponse({}, 404);
    const path = url.replace("https://api.github.com", "");
    if (path.startsWith("/repos/projectbluefin/server/releases?"))
      return jsonResponse([serverRelease, ...olderServerReleases]);
    if (path.startsWith("/repos/projectbluefin/server/contents/"))
      return jsonResponse({
        content: Buffer.from(
          "kind: junction\nsources:\n- kind: git_repo\n  ref: freedesktop-sdk-25.08.4-0-gabc\n",
        ).toString("base64"),
      });
    if (path.startsWith("/repos/ublue-os/bluefin/releases?"))
      return jsonResponse(classicReleases);
    if (path.startsWith("/repos/projectbluefin/dakota/releases?"))
      return jsonResponse({ message: "boom" }, 500);
    if (path.startsWith("/repos/projectbluefin/utah/releases?"))
      return jsonResponse([]);
    if (path.startsWith("/repos/projectbluefin/bluefin-lts/releases?"))
      return jsonResponse({ message: "not a list" });
    if (path.startsWith("/repos/projectbluefin/iso/releases?"))
      return jsonResponse([isoRelease]);
    throw new Error(`unexpected fetch ${url}`);
  });
  return seen;
}

test("fetchImageReleases: server merges SBOM, release-notes and SDK junction versions", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  const [row] = products.server.releases;
  assert.deepEqual(row.versions, {
    kernel: "6.12.1",
    zfs: "2.3.4",
    bootc: "1.16.13",
    fsdk: "25.08.4",
  });
  assert.equal(row.versionsSource, SERVER_SBOM);
  assert.equal(
    row.fsdkSource,
    "https://github.com/projectbluefin/server/blob/v26.10.1200/elements/freedesktop-sdk.bst",
  );
  assert.equal(row.versionsStateReason, undefined);
  assert.equal(products.server.unavailable, false);
  for (const stream of ["stable", "testing"]) {
    assert.equal(products.server.streams[stream].unavailable, true);
    assert.match(
      products.server.streams[stream].stateReason,
      /^Server publishes versioned DDI\/UKI artifacts/,
    );
  }
});

test("fetchImageReleases: an unreachable SBOM keeps release-notes versions and records why", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  const row = products.classic.releases.find(
    (r) => r.tag === "stable-20261006",
  );
  assert.deepEqual(row.versions, { kernel: "6.17.1" });
  assert.equal(row.versionsSource, "release-notes");
  assert.equal(
    row.versionsStateReason,
    "Release SBOM unavailable: SBOM HTTP 404",
  );
});

test("fetchImageReleases: drafts are dropped and each image stream keeps at most four releases, newest first", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  const imageRows = products.classic.releases.filter(
    (r) => r.stream !== "testing",
  );
  const tags = imageRows.map((r) => r.tag);
  assert.ok(!tags.includes("stable-20261009"), "draft release must be dropped");
  assert.deepEqual(
    tags.filter((tag) => tag.startsWith("stable-")),
    [
      "stable-20261006",
      "stable-20261005",
      "stable-20261004",
      "stable-20261003",
    ],
  );
  const published = products.classic.releases.map((r) => r.publishedAt);
  assert.deepEqual(published, [...published].sort().reverse());
});

test("fetchImageReleases: server keeps its seven newest releases", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  assert.equal(products.server.releases.length, 7);
  assert.deepEqual(
    products.server.releases.map((r) => r.tag),
    [serverRelease, ...olderServerReleases].slice(0, 7).map((r) => r.tag_name),
  );
});

test("fetchImageReleases: failed, empty and malformed release lists mark the product unavailable", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  assert.deepEqual(products.dakota.releases, []);
  assert.match(
    products.dakota.stateReason,
    /^Releases unavailable for projectbluefin\/dakota: GET \/repos\/projectbluefin\/dakota\/releases\?per_page=30 -> 500$/,
  );
  assert.equal(
    products.utah.stateReason,
    "No published releases in projectbluefin/utah.",
  );
  assert.equal(
    products.lts.stateReason,
    "Releases unavailable for projectbluefin/bluefin-lts: Unexpected releases response",
  );
});

test("fetchImageReleases: ISO releases are split per installer family and keep no OS versions", async (t) => {
  stubFetch(t);
  const { products } = await fetchImageReleases();
  const classicIso = products.classic.releases.find(
    (r) => r.tag === "iso-20261020",
  );
  const ltsIso = products.lts.releases.find((r) => r.tag === "iso-20261020");
  assert.deepEqual(
    classicIso.assets.map((a) => a.name),
    ["bluefin-stable-x86_64-20261020.iso.torrent", "SHA256SUMS"],
  );
  assert.deepEqual(
    ltsIso.assets.map((a) => a.name),
    ["bluefin-lts-hwe-x86_64-20261020.iso.torrent", "SHA256SUMS"],
  );
  assert.equal(classicIso.stream, "testing");
  assert.equal(classicIso.versions, null);
  assert.equal(
    products.server.releases.some((r) => r.tag === "iso-20261020"),
    false,
  );
  assert.equal(products.lts.unavailable, false);
  assert.match(
    products.lts.downloadsStateReason,
    /^Non-HWE Anaconda ISO builds/,
  );
});

test("fetchImageReleases: download probes record size, companion files and unavailable installers", async (t) => {
  const seen = stubFetch(t);
  const { products } = await fetchImageReleases();

  const stableIso = products.classic.downloads.find(
    (d) => d.url === `${STABLE}/bluefin-stable-x86_64.iso`,
  );
  assert.equal(stableIso.size, 123456);
  assert.equal(stableIso.lastModified, "Tue, 20 Oct 2026 00:00:00 GMT");
  assert.equal(stableIso.unavailable, false);
  assert.equal(stableIso.payloadStream, "stable");
  const names = products.classic.downloads.map((d) => d.name);
  for (const suffix of ["-CHECKSUM", ".torrent", ".torrent-CHECKSUM"])
    assert.ok(names.includes(`bluefin-stable-x86_64.iso${suffix}`), suffix);
  assert.ok(names.includes("bluefin-stable-x86_64.manifest.json"));

  const testingTorrentIso = products.lts.downloads.find(
    (d) => d.url === `${TESTING}/bluefin-lts-hwe-x86_64-20261020.iso`,
  );
  assert.equal(testingTorrentIso.unavailable, true);
  assert.equal(testingTorrentIso.stateReason, "Download unavailable: HTTP 404");
  assert.equal(testingTorrentIso.sourceUrl, isoRelease.html_url);

  const dakotaLive = products.dakota.downloads.find(
    (d) => d.name === "dakota-live-latest.iso",
  );
  assert.equal(dakotaLive.unavailable, false);
  assert.equal(
    dakotaLive.size,
    null,
    "non-numeric content-length is not a size",
  );
  assert.equal(dakotaLive.payloadStream, "stable");
  assert.equal(
    products.dakota.downloads.some((d) => d.name.endsWith(".torrent")),
    false,
    "only classic/lts installers have torrents",
  );
  assert.equal(products.dakota.unavailable, false);
  assert.equal(products.dakota.streams.testing.unavailable, false);
  assert.equal(products.dakota.streams.stable.unavailable, true);

  assert.equal(products.utah.unavailable, true);
  assert.equal(products.utah.streams.testing.unavailable, true);
  assert.match(
    products.utah.streams.testing.stateReason,
    /^No testing release or downloadable installer found/,
  );

  const headUrls = seen.filter((s) => s.method === "HEAD").map((s) => s.url);
  assert.equal(
    new Set(headUrls).size,
    headUrls.length,
    "each artifact is probed once",
  );
});
