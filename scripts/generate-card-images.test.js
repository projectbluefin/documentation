const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("parseFeedItem extracts markdown package, diff, and commit data", async () => {
  const { parseFeedItem } = await import("./lib/card-feed-parser.mjs");

  const item = {
    title: "stable-20260401 (F43.20260401, #123)",
    pubDate: "2026-04-01T00:00:00Z",
    link: "https://example.com/release",
    content: [
      "### Major packages",
      "| Name | Version |",
      "| --- | --- |",
      "| Kernel | `6.14.0` ➡️ `6.15.0` |",
      "| Mesa | 25.0 |",
      "",
      "### Major DX packages",
      "| Name | Version |",
      "| --- | --- |",
      "| Devpod | 0.5 ➡️ 0.6 |",
      "",
      "### All Images",
      "| Type | Image |",
      "| --- | --- |",
      "| ✨ | ghcr.io/example/new |",
      "| 🔄 | ghcr.io/example/changed |",
      "| ❌ | ghcr.io/example/removed |",
      "",
      "### Commits",
      "| Hash | Message |",
      "| --- | --- |",
      "| abc123 | Update kernel |",
      "| def456 | Update mesa |",
    ].join("\n"),
  };

  assert.deepEqual(parseFeedItem(item, "stable"), {
    stream: "stable",
    tag: "stable-20260401",
    fedoraVersion: "43",
    centosVersion: null,
    majorPackages: [
      { name: "Kernel", version: "6.15.0", prevVersion: "6.14.0" },
      { name: "Mesa", version: "25.0", prevVersion: null },
    ],
    dxPackages: [{ name: "Devpod", version: "0.6", prevVersion: "0.5" }],
    gdxPackages: [],
    diffStats: { added: 1, changed: 1, removed: 1 },
    commitCount: 2,
    dateMs: Date.parse("2026-04-01T00:00:00Z"),
    link: "https://example.com/release",
  });
});

test("parseFeedItem returns null when markdown tables are missing major packages", async () => {
  const { parseFeedItem } = await import("./lib/card-feed-parser.mjs");

  assert.equal(
    parseFeedItem(
      {
        title: "stable-20260401",
        pubDate: "2026-04-01T00:00:00Z",
        link: "#",
        content: "plain text",
      },
      "stable",
    ),
    null,
  );
});

test("enrichFromSbom prefers SBOM versions for tracked packages and keeps others", async () => {
  const { enrichFromSbom } = await import("./lib/card-feed-parser.mjs");

  const release = {
    tag: "stable-20260401",
    majorPackages: [
      { name: "Kernel", version: "6.14.0", prevVersion: "6.13.0" },
      { name: "Mesa", version: "25.0.0", prevVersion: "24.9.0" },
      { name: "Nvidia", version: "575.1", prevVersion: "570.0" },
    ],
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260401": {
            packageVersions: {
              kernel: "6.15.1",
              mesa: "25.1.0",
            },
          },
        },
      },
    },
  };

  assert.deepEqual(enrichFromSbom(release, "stable", sbomCache).majorPackages, [
    { name: "Kernel", version: "6.15.1", prevVersion: "6.13.0" },
    { name: "Mesa", version: "25.1.0", prevVersion: "24.9.0" },
    { name: "Nvidia", version: "575.1", prevVersion: "570.0" },
  ]);
});

test("buildDakotaRelease picks the newest SBOM entry and overlays Nvidia", async () => {
  const { buildDakotaRelease } = await import("./lib/card-feed-parser.mjs");

  const sbomCache = {
    streams: {
      "dakota-latest": {
        releases: {
          "latest-20260601": { packageVersions: { kernel: "6.0.0" } },
          "latest-20260613": {
            packageVersions: { kernel: "7.0.7", gnome: "50.2", fedora: "F44" },
          },
          // Newer, but no package versions — must not win.
          "latest-20260808": { packageVersions: {} },
        },
      },
      "dakota-nvidia-latest": {
        releases: {
          "latest-20260613": { packageVersions: { nvidia: "610.43.02" } },
        },
      },
    },
  };

  const release = buildDakotaRelease(sbomCache);
  assert.equal(release.tag, "latest-20260613");
  assert.equal(release.fedoraVersion, "44");
  assert.equal(release.dateMs, Date.parse("2026-06-13T00:00:00Z"));
  assert.deepEqual(release.majorPackages, [
    { name: "Kernel", version: "7.0.7", prevVersion: null },
    { name: "Gnome", version: "50.2", prevVersion: null },
    { name: "Nvidia", version: "610.43.02", prevVersion: null },
  ]);
});

test("buildDakotaRelease returns null when the SBOM cache has no Dakota data", async () => {
  const { buildDakotaRelease } = await import("./lib/card-feed-parser.mjs");

  assert.equal(buildDakotaRelease(null), null);
  assert.equal(buildDakotaRelease({ streams: {} }), null);
  assert.equal(
    buildDakotaRelease({
      streams: {
        "dakota-latest": {
          releases: { "latest-20260808": { packageVersions: {} } },
        },
      },
    }),
    null,
  );
});

test("stripHtml decodes entities and strips tags", async () => {
  const { stripHtml } = await import("./lib/card-feed-parser.mjs");

  assert.equal(
    stripHtml(
      "<strong>Kernel</strong> &amp; &lt;Mesa&gt; &quot;Podman&quot; &#39;test&#39;&nbsp;&#65;&#x42;",
    ),
    "Kernel & <Mesa> \"Podman\" 'test' AB",
  );
});

test("parseFeedItem extracts HTML package, diff, and commit data from real feed fixture", async () => {
  const { parseFeedItem } = await import("./lib/card-feed-parser.mjs");

  const fixture = JSON.parse(
    readFileSync(
      join(__dirname, "fixtures", "bluefin-releases.fixture.json"),
      "utf8",
    ),
  );

  assert.deepEqual(parseFeedItem(fixture.items[0], "stable"), {
    stream: "stable",
    tag: "stable-20250907",
    fedoraVersion: "42",
    centosVersion: null,
    majorPackages: [
      { name: "Kernel", version: "6.15.9-201", prevVersion: "6.14.11-300" },
      { name: "Gnome", version: "48.4-1.switcheroo", prevVersion: null },
      { name: "Mesa", version: "25.1.7-1", prevVersion: null },
      { name: "Podman", version: "5.6.0-1", prevVersion: null },
      {
        name: "Nvidia",
        version: "580.82.07-2",
        prevVersion: "580.76.05-2",
      },
    ],
    dxPackages: [
      { name: "Incus", version: "6.15-1", prevVersion: null },
      { name: "Docker", version: "28.4.0-1", prevVersion: "28.3.3-1" },
    ],
    gdxPackages: [],
    diffStats: { added: 18, changed: 30, removed: 3 },
    commitCount: 5,
    dateMs: Date.parse("2025-09-07T22:04:47Z"),
    link: "https://github.com/ublue-os/bluefin/releases/tag/stable-20250907",
  });
});

test("parseFeedItem extracts LTS HTML package and centos data from real LTS feed fixture", async () => {
  const { parseFeedItem } = await import("./lib/card-feed-parser.mjs");

  const fixture = JSON.parse(
    readFileSync(
      join(__dirname, "fixtures", "bluefin-lts-releases.fixture.json"),
      "utf8",
    ),
  );

  assert.deepEqual(parseFeedItem(fixture.items[0], "lts"), {
    stream: "lts",
    tag: "lts-20250908",
    fedoraVersion: null,
    centosVersion: "c10s",
    majorPackages: [
      { name: "Kernel", version: "6.12.0-126", prevVersion: null },
      { name: "HWE Kernel", version: "6.15.11-1", prevVersion: null },
      { name: "GNOME", version: "48.4-1", prevVersion: null },
      { name: "Mesa", version: "25.0.7-4", prevVersion: null },
      { name: "Podman", version: "5.6.0-2", prevVersion: null },
    ],
    dxPackages: [
      { name: "Docker", version: "28.4.0-1", prevVersion: null },
      {
        name: "VSCode",
        version: "1.103.2-1755709837.el8",
        prevVersion: null,
      },
      { name: "Ramalama", version: "N/A", prevVersion: null },
    ],
    gdxPackages: [
      { name: "Nvidia", version: "580.82.07-2", prevVersion: null },
      { name: "CUDA", version: "580.82.07-2", prevVersion: null },
    ],
    diffStats: { added: 0, changed: 0, removed: 0 },
    commitCount: 0,
    dateMs: Date.parse("2025-09-08T08:48:09Z"),
    link: "https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250908",
  });
});

test("parseFeedItem returns null when HTML tables are missing major packages", async () => {
  const { parseFeedItem } = await import("./lib/card-feed-parser.mjs");

  assert.equal(
    parseFeedItem(
      {
        title: "stable-20260401",
        pubDate: "2026-04-01T00:00:00Z",
        link: "#",
        content: "<h3>Other</h3><table><tr><td>foo</td></tr></table>",
      },
      "stable",
    ),
    null,
  );
});
