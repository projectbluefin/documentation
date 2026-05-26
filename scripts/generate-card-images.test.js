const test = require("node:test");
const assert = require("node:assert/strict");

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
    parseFeedItem({ title: "stable-20260401", pubDate: "2026-04-01T00:00:00Z", link: "#", content: "plain text" }, "stable"),
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
