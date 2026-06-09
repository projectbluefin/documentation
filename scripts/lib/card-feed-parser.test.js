/**
 * Unit tests for scripts/lib/card-feed-parser.mjs
 *
 * Tests all exported pure functions: stripMd, splitMdRow, isMdSeparatorRow,
 * extractSectionsMd, parseTwoColTableMd, parseDiffRows, parseCommitRows,
 * parseFeedItem, sbomKeyForRelease, enrichFromSbom.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("card-feed-parser", async () => {
  const {
    stripMd,
    splitMdRow,
    isMdSeparatorRow,
    extractSectionsMd,
    parseTwoColTableMd,
    parseDiffRows,
    parseCommitRows,
    parseFeedItem,
    sbomKeyForRelease,
    enrichFromSbom,
    CHIP_TO_SBOM,
  } = await import("./card-feed-parser.mjs");

  describe("stripMd", () => {
    it("removes markdown links, keeping link text", () => {
      assert.equal(stripMd("[hello](https://example.com)"), "hello");
    });

    it("removes bold markers", () => {
      assert.equal(stripMd("**bold text**"), "bold text");
    });

    it("removes inline code backticks", () => {
      assert.equal(stripMd("`code`"), "code");
    });

    it("trims whitespace", () => {
      assert.equal(stripMd("  hello  "), "hello");
    });

    it("handles combined markdown", () => {
      assert.equal(
        stripMd("**[Link](http://x.com)** and `code`"),
        "Link and code",
      );
    });

    it("returns empty string for whitespace-only input", () => {
      assert.equal(stripMd("   "), "");
    });
  });

  describe("splitMdRow", () => {
    it("splits a markdown table row into cells", () => {
      const cells = splitMdRow("| foo | bar | baz |");
      assert.deepEqual(cells, ["foo", "bar", "baz"]);
    });

    it("handles rows without leading/trailing pipe", () => {
      const cells = splitMdRow("foo | bar | baz");
      assert.deepEqual(cells, ["foo", "bar", "baz"]);
    });

    it("trims cell whitespace", () => {
      const cells = splitMdRow("|  padded  |  cells  |");
      assert.deepEqual(cells, ["padded", "cells"]);
    });
  });

  describe("isMdSeparatorRow", () => {
    it("detects standard separator row", () => {
      assert.equal(isMdSeparatorRow(["---", "---", "---"]), true);
    });

    it("detects aligned separator row", () => {
      assert.equal(isMdSeparatorRow([":---", "---:", ":---:"]), true);
    });

    it("rejects non-separator content", () => {
      assert.equal(isMdSeparatorRow(["hello", "---"]), false);
    });

    it("rejects empty cells", () => {
      assert.equal(isMdSeparatorRow(["", "---"]), false);
    });
  });

  describe("extractSectionsMd", () => {
    it("extracts sections keyed by ### heading", () => {
      const content = [
        "### Section A",
        "| Name | Value |",
        "| --- | --- |",
        "| foo | bar |",
        "### Section B",
        "| X | Y |",
        "| --- | --- |",
        "| a | b |",
      ].join("\n");

      const sections = extractSectionsMd(content);
      assert.equal(sections.size, 2);
      assert.ok(sections.has("Section A"));
      assert.ok(sections.has("Section B"));
      // Separator rows should be excluded
      assert.deepEqual(sections.get("Section A"), [["Name", "Value"], ["foo", "bar"]]);
    });

    it("strips markdown from heading text", () => {
      const content = "### **Bold Heading**\n| a | b |\n";
      const sections = extractSectionsMd(content);
      assert.ok(sections.has("Bold Heading"));
    });

    it("ignores non-table lines under headings", () => {
      const content = "### Heading\nSome text\n| a | b |\n";
      const sections = extractSectionsMd(content);
      assert.deepEqual(sections.get("Heading"), [["a", "b"]]);
    });

    it("returns empty map for content without ### headings", () => {
      const sections = extractSectionsMd("No headings here\n| a | b |");
      assert.equal(sections.size, 0);
    });
  });

  describe("parseTwoColTableMd", () => {
    it("parses name and version with arrow separator", () => {
      const rows = [
        ["Name", "Version"],
        ["Kernel", "6.12.1 ➡️ 6.13.0"],
      ];
      const result = parseTwoColTableMd(rows);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "Kernel");
      assert.equal(result[0].version, "6.13.0");
      assert.equal(result[0].prevVersion, "6.12.1");
    });

    it("parses single version without arrow", () => {
      const rows = [["Mesa", "24.3.1"]];
      const result = parseTwoColTableMd(rows);
      assert.equal(result[0].version, "24.3.1");
      assert.equal(result[0].prevVersion, null);
    });

    it("skips header row with 'Name'", () => {
      const rows = [["Name", "Version"], ["Podman", "5.0"]];
      const result = parseTwoColTableMd(rows);
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "Podman");
    });

    it("skips rows with fewer than 2 columns", () => {
      const rows = [["only-one"]];
      const result = parseTwoColTableMd(rows);
      assert.equal(result.length, 0);
    });

    it("skips rows with empty name", () => {
      const rows = [["", "value"]];
      const result = parseTwoColTableMd(rows);
      assert.equal(result.length, 0);
    });
  });

  describe("parseDiffRows", () => {
    it("counts emoji-based diff indicators", () => {
      const rows = [
        ["✨ New", "image-a"],
        ["🔄 Changed", "image-b"],
        ["❌ Removed", "image-c"],
        ["✨ New", "image-d"],
      ];
      const result = parseDiffRows(rows);
      assert.equal(result.added, 2);
      assert.equal(result.changed, 1);
      assert.equal(result.removed, 1);
    });

    it("counts symbol-based diff indicators", () => {
      const rows = [
        ["+", "new-image"],
        ["~", "changed-image"],
        ["-", "removed-image"],
      ];
      const result = parseDiffRows(rows);
      assert.equal(result.added, 1);
      assert.equal(result.changed, 1);
      assert.equal(result.removed, 1);
    });

    it("returns zeros for empty rows", () => {
      const result = parseDiffRows([]);
      assert.deepEqual(result, { added: 0, changed: 0, removed: 0 });
    });
  });

  describe("parseCommitRows", () => {
    it("counts commit rows excluding header", () => {
      const rows = [
        ["Hash", "Message"],
        ["abc123", "fix: something"],
        ["def456", "feat: another"],
      ];
      assert.equal(parseCommitRows(rows), 2);
    });

    it("returns 0 for empty rows", () => {
      assert.equal(parseCommitRows([]), 0);
    });

    it("skips rows with fewer than 2 columns", () => {
      const rows = [["only-one"], ["abc", "message"]];
      assert.equal(parseCommitRows(rows), 1);
    });
  });

  describe("parseFeedItem", () => {
    const makeFeedItem = (title, content) => ({
      title,
      content,
      pubDate: "2026-03-15T00:00:00Z",
      link: "https://example.com/release",
    });

    it("returns null for non-markdown content", () => {
      const item = makeFeedItem("release-1.0", "Just plain text");
      assert.equal(parseFeedItem(item, "stable"), null);
    });

    it("returns null when no major packages found", () => {
      const content = [
        "| --- | --- |",
        "### Empty Section",
        "| a | b |",
        "| --- | --- |",
      ].join("\n");
      const item = makeFeedItem("release-1.0", content);
      assert.equal(parseFeedItem(item, "stable"), null);
    });

    it("parses a valid feed item with packages and metadata", () => {
      const content = [
        "### Major packages",
        "| Name | Version |",
        "| --- | --- |",
        "| Kernel | 6.12 ➡️ 6.13 |",
        "| Mesa | 24.2 ➡️ 24.3 |",
        "### All Images",
        "| Status | Image |",
        "| --- | --- |",
        "| ✨ | new-image |",
        "| 🔄 | changed-image |",
        "### Commits",
        "| Hash | Message |",
        "| --- | --- |",
        "| abc123 | fix: thing |",
      ].join("\n");

      const item = makeFeedItem("stable-20260315 (F41.20260315)", content);
      const result = parseFeedItem(item, "stable");

      assert.ok(result);
      assert.equal(result.stream, "stable");
      assert.equal(result.majorPackages.length, 2);
      assert.equal(result.majorPackages[0].name, "Kernel");
      assert.equal(result.majorPackages[0].version, "6.13");
      assert.equal(result.diffStats.added, 1);
      assert.equal(result.diffStats.changed, 1);
      assert.equal(result.commitCount, 1);
      assert.equal(result.fedoraVersion, "41");
      assert.equal(result.link, "https://example.com/release");
    });

    it("extracts fedora version from title", () => {
      const content =
        "### Major packages\n| Name | Version |\n| --- | --- |\n| Kernel | 6.13 |";
      const item = makeFeedItem("stable-20260315 (F42.20260315)", content);
      const result = parseFeedItem(item, "stable");
      assert.equal(result.fedoraVersion, "42");
    });

    it("falls back to streamHint when title lacks prefix-date pattern", () => {
      const content =
        "### Major packages\n| Name | Version |\n| --- | --- |\n| Kernel | 6.13 |";
      const item = makeFeedItem("lts.20260315 (F41.20260315)", content);
      const result = parseFeedItem(item, "lts");
      // lts.YYYYMMDD doesn't match /^([a-z]+-[\d.]+)/i (no dash), falls back to streamHint
      assert.equal(result.tag, "lts");
    });

    it("normalizes lts-YYYYMMDD tags via replace rule", () => {
      const content =
        "### Major packages\n| Name | Version |\n| --- | --- |\n| Kernel | 6.13 |";
      // Title with dash: lts-20260315 matches the prefix regex
      const item = makeFeedItem("lts-20260315 (F41.20260315)", content);
      const result = parseFeedItem(item, "lts");
      assert.equal(result.tag, "lts-20260315");
    });

    it("handles invalid pubDate gracefully", () => {
      const content =
        "### Major packages\n| Name | Version |\n| --- | --- |\n| Kernel | 6.13 |";
      const item = {
        title: "stable-20260315",
        content,
        pubDate: "not-a-date",
        link: "https://x.com",
      };
      const result = parseFeedItem(item, "stable");
      assert.equal(result.dateMs, 0);
    });
  });

  describe("sbomKeyForRelease", () => {
    it("returns correct key for LTS release", () => {
      const result = sbomKeyForRelease("lts-20260315", "lts");
      assert.deepEqual(result, {
        streamId: "bluefin-lts",
        cacheKey: "lts-20260315",
      });
    });

    it("returns correct key for stable-daily release", () => {
      const result = sbomKeyForRelease("stable-daily-20260315", "stable-daily");
      assert.deepEqual(result, {
        streamId: "bluefin-stable-daily",
        cacheKey: "stable-daily-20260315",
      });
    });

    it("returns correct key for stable release", () => {
      const result = sbomKeyForRelease("stable-20260315", "stable");
      assert.deepEqual(result, {
        streamId: "bluefin-stable",
        cacheKey: "stable-20260315",
      });
    });

    it("returns null when no date in tag", () => {
      assert.equal(sbomKeyForRelease("no-date-here", "stable"), null);
    });

    it("returns null for unknown stream", () => {
      assert.equal(sbomKeyForRelease("beta-20260315", "beta"), null);
    });
  });

  describe("enrichFromSbom", () => {
    const baseRelease = {
      tag: "stable-20260315",
      majorPackages: [
        { name: "Kernel", version: "6.12", prevVersion: null },
        { name: "CustomPkg", version: "1.0", prevVersion: null },
      ],
    };

    it("returns release unchanged when sbomCache is null", () => {
      const result = enrichFromSbom(baseRelease, "stable", null);
      assert.deepEqual(result, baseRelease);
    });

    it("returns release unchanged when no matching stream in cache", () => {
      const cache = { streams: {} };
      const result = enrichFromSbom(baseRelease, "stable", cache);
      assert.deepEqual(result, baseRelease);
    });

    it("enriches release with SBOM package versions", () => {
      const cache = {
        streams: {
          "bluefin-stable": {
            releases: {
              "stable-20260315": {
                packageVersions: {
                  kernel: "6.13.0",
                  mesa: "24.3.1",
                  gnome: "47.1",
                },
              },
            },
          },
        },
      };

      const result = enrichFromSbom(baseRelease, "stable", cache);
      // Should have SBOM packages + non-SBOM packages
      const kernelPkg = result.majorPackages.find((p) => p.name === "Kernel");
      assert.ok(kernelPkg);
      assert.equal(kernelPkg.version, "6.13.0");
      // Custom non-SBOM package should be preserved
      const customPkg = result.majorPackages.find((p) => p.name === "CustomPkg");
      assert.ok(customPkg);
    });

    it("returns release unchanged when sbomKeyForRelease returns null", () => {
      const release = { ...baseRelease, tag: "no-date" };
      const cache = { streams: { "bluefin-stable": { releases: {} } } };
      const result = enrichFromSbom(release, "stable", cache);
      assert.deepEqual(result, release);
    });
  });

  describe("CHIP_TO_SBOM", () => {
    it("exports expected chip mappings", () => {
      assert.ok(Array.isArray(CHIP_TO_SBOM));
      assert.ok(CHIP_TO_SBOM.length >= 8);
      const kernelChip = CHIP_TO_SBOM.find((c) => c.chipName === "kernel");
      assert.ok(kernelChip);
      assert.equal(kernelChip.displayName, "Kernel");
      assert.equal(kernelChip.field, "kernel");
    });
  });
});
