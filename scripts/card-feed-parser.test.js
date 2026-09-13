import { test } from "node:test";
import assert from "node:assert/strict";

import {
  stripMd,
  splitMdRow,
  isMdSeparatorRow,
  extractSectionsMd,
  parseTwoColTableMd,
  parseDiffRows,
  parseCommitRows,
  parseFeedItem,
  sbomKeyForRelease,
  buildDakotaRelease,
  enrichFromSbom,
} from "./lib/card-feed-parser.mjs";

test("stripMd flattens links, bold and code spans", () => {
  assert.equal(
    stripMd("[Kernel](http://x) **6.10** and `podman`"),
    "Kernel 6.10 and podman",
  );
});

test("splitMdRow trims the leading/trailing bars and each cell", () => {
  assert.deepEqual(splitMdRow("| kernel | 6.10 |"), ["kernel", "6.10"]);
});

test("isMdSeparatorRow recognises a divider row only", () => {
  assert.ok(isMdSeparatorRow(["---", ":--:"]));
  assert.ok(!isMdSeparatorRow(["kernel", "6.10"]));
  assert.ok(!isMdSeparatorRow(["---", "not a divider"]));
});

test("extractSectionsMd groups rows under each ### heading", () => {
  const content = [
    "### Major packages",
    "| --- | --- |",
    "| kernel | 6.10.9 |",
    "| gnome | 47.2 |",
    "### Commits",
    "| --- |",
    "| abc123 |",
    "| def456 |",
  ].join("\n");
  const sections = extractSectionsMd(content);
  assert.deepEqual(sections.get("Major packages"), [
    ["kernel", "6.10.9"],
    ["gnome", "47.2"],
  ]);
  assert.deepEqual(sections.get("Commits"), [["abc123"], ["def456"]]);
  assert.ok(!sections.has("leftover"));
});

test("extractSectionsMd skips the divider rows between heading and data", () => {
  const content = [
    "### Major packages",
    "|------|------|",
    "| kernel | 6.10 |",
  ].join("\n");
  const sections = extractSectionsMd(content);
  assert.deepEqual(sections.get("Major packages"), [["kernel", "6.10"]]);
});

test("parseTwoColTableMd reads name + version across the ➡️ arrow", () => {
  const rows = [
    ["kernel", "6.10.9 ➡️ 6.9.5"],
    ["gnome", "47.2"],
  ];
  const out = parseTwoColTableMd(rows);
  assert.deepEqual(out[0], {
    name: "kernel",
    version: "6.9.5",
    prevVersion: "6.10.9",
  });
  // A bare value with no arrow becomes the version, prevVersion null.
  assert.deepEqual(out[1], {
    name: "gnome",
    version: "47.2",
    prevVersion: null,
  });
});

test("parseTwoColTableMd skips the header row and short rows", () => {
  const out = parseTwoColTableMd([
    ["Name", "Version"],
    ["kernel"],
    ["kernel", "6.10.9 ➡️ 6.9.5"],
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "kernel");
});

test("parseDiffRows counts the emoji and symbol indicators", () => {
  const rows = [
    ["✨", "a"],
    ["🔄", "b"],
    ["❌", "c"],
    ["+", "d"],
    ["~", "e"],
    ["-", "f"],
  ];
  assert.deepEqual(parseDiffRows(rows), { added: 2, changed: 2, removed: 2 });
});

test("parseCommitRows counts data rows but not the header", () => {
  const rows = [
    ["Hash", "msg"],
    ["abc", "x"],
    ["def", "y"],
  ];
  assert.equal(parseCommitRows(rows), 2);
});

test("parseFeedItem parses a markdown card into a normalized item", () => {
  const item = {
    title: "bluefin-41.20250808.0 (F41.20250808, #123)",
    pubDate: "2025-08-08T00:00:00Z",
    link: "https://example.com/1",
    content: [
      "### Major packages",
      "| Name | Version |",
      "| --- | --- |",
      "| Kernel | `6.10.9` ➡️ `6.9.5` |",
      "### All Images",
      "| ✨ | image-a |",
      "| ❌ | image-b |",
      "### Commits",
      "| Hash | Message |",
      "| abc123 | fix thing |",
    ].join("\n"),
  };
  const parsed = parseFeedItem(item, "bluefin");
  assert.equal(parsed.stream, "bluefin");
  assert.equal(parsed.tag, "bluefin-41.20250808.0");
  assert.equal(parsed.fedoraVersion, "41");
  assert.equal(parsed.centosVersion, null);
  assert.equal(parsed.majorPackages[0].name, "Kernel");
  assert.equal(parsed.majorPackages[0].version, "6.9.5");
  assert.equal(parsed.diffStats.added, 1);
  assert.equal(parsed.diffStats.removed, 1);
  assert.equal(parsed.commitCount, 1);
  assert.ok(Number.isFinite(parsed.dateMs));
  assert.equal(parsed.link, "https://example.com/1");
});

test("parseFeedItem returns null for non-card content", () => {
  assert.equal(parseFeedItem({ content: "just prose" }, "bluefin"), null);
  assert.equal(
    parseFeedItem(
      { content: "### Major packages\n| a | b |\n| c | d |" },
      "bluefin",
    ),
    null,
  );
});

test("sbomKeyForRelease maps a tag to its stream cache key", () => {
  assert.deepEqual(sbomKeyForRelease("41.20250808.0", "stable"), {
    streamId: "bluefin-stable",
    cacheKey: "stable-20250808",
  });
  assert.deepEqual(sbomKeyForRelease("41.20250808.0", "lts"), {
    streamId: "bluefin-lts",
    cacheKey: "lts-20250808",
  });
  assert.equal(sbomKeyForRelease("not-a-tag", "stable"), null);
});

test("buildDakotaRelease returns null when the cache has no dakota stream", () => {
  assert.equal(buildDakotaRelease({}), null);
  assert.equal(buildDakotaRelease({ streams: {} }), null);
});

test("buildDakotaRelease picks the newest dakota-latest release and overlays Nvidia", () => {
  const sbomCache = {
    streams: {
      "dakota-latest": {
        releases: {
          20250801: {
            packageVersions: { kernel: "6.9", gnome: "47", fedora: "40" },
          },
          20250808: {
            packageVersions: { kernel: "6.10", gnome: "47", fedora: "41" },
          },
        },
      },
      "dakota-nvidia-latest": {
        releases: {
          "latest-20250808": { packageVersions: { nvidia: "570.132.00" } },
        },
      },
    },
  };
  const release = buildDakotaRelease(sbomCache);
  assert.equal(release.stream, "dakota");
  assert.equal(release.tag, "20250808");
  assert.equal(release.fedoraVersion, "41");
  const nvidia = release.majorPackages.find((p) => p.name === "Nvidia");
  assert.equal(nvidia.version, "570.132.00");
  const kernel = release.majorPackages.find((p) => p.name === "Kernel");
  assert.equal(kernel.version, "6.10");
});

test("enrichFromSbom backfills chip versions from the SBOM cache", () => {
  const release = {
    tag: "41.20250808.0",
    majorPackages: [{ name: "Kernel", version: "6.10", prevVersion: "6.9" }],
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20250808": {
            packageVersions: { kernel: "6.10.9", gnome: "47.2" },
          },
        },
      },
    },
  };
  const enriched = enrichFromSbom(release, "stable", sbomCache);
  const kernel = enriched.majorPackages.find((p) => p.name === "Kernel");
  assert.equal(kernel.version, "6.10.9");
  assert.equal(kernel.prevVersion, "6.9");
});

test("enrichFromSbom returns the release untouched when there is no cache", () => {
  const release = { tag: "41.20250808.0", majorPackages: [] };
  assert.equal(enrichFromSbom(release, "stable", null), release);
});
