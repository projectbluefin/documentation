/**
 * Unit tests for scripts/lib/contributor-tracker.mjs
 *
 * Tests: isBot, loadKnownContributors, saveKnownContributors,
 * identifyNewContributors.
 */

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { writeFile, rm, mkdir } = require("fs/promises");
const path = require("path");
const os = require("os");

describe("contributor-tracker", async () => {
  const {
    isBot,
    loadKnownContributors,
    saveKnownContributors,
    identifyNewContributors,
  } = await import("./contributor-tracker.mjs");

  describe("isBot", () => {
    it("detects dependabot[bot]", () => {
      assert.equal(isBot("dependabot[bot]"), true);
    });

    it("detects renovate[bot]", () => {
      assert.equal(isBot("renovate[bot]"), true);
    });

    it("detects github-actions[bot]", () => {
      assert.equal(isBot("github-actions[bot]"), true);
    });

    it("detects copilot-swe-agent", () => {
      assert.equal(isBot("copilot-swe-agent"), true);
    });

    it("detects mergeraptor[bot]", () => {
      assert.equal(isBot("mergeraptor[bot]"), true);
    });

    it("detects app/ prefixed bots", () => {
      assert.equal(isBot("app/renovate"), true);
    });

    it("detects Copilot (case-insensitive)", () => {
      assert.equal(isBot("Copilot"), true);
      assert.equal(isBot("copilot"), true);
    });

    it("detects any [bot] suffix", () => {
      assert.equal(isBot("some-app[bot]"), true);
    });

    it("returns false for regular users", () => {
      assert.equal(isBot("clubanderson"), false);
      assert.equal(isBot("castrojo"), false);
      assert.equal(isBot("j-roper"), false);
    });

    it("returns false for names containing bot without brackets", () => {
      assert.equal(isBot("robotuser"), false);
      assert.equal(isBot("bottleman"), false);
    });
  });

  describe("loadKnownContributors", () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `contrib-test-${Date.now()}`);
      await mkdir(tmpDir, { recursive: true });
    });

    it("loads contributors from cache file", async () => {
      const cachePath = path.join(tmpDir, "cache.json");
      await writeFile(cachePath, JSON.stringify(["alice", "bob"]));

      const result = await loadKnownContributors(cachePath, "/nonexistent");
      assert.ok(result instanceof Set);
      assert.equal(result.size, 2);
      assert.ok(result.has("alice"));
      assert.ok(result.has("bob"));
    });

    it("falls back to seed file when cache is missing", async () => {
      const seedPath = path.join(tmpDir, "seed.json");
      await writeFile(seedPath, JSON.stringify(["seed-user"]));

      const result = await loadKnownContributors("/nonexistent", seedPath);
      assert.equal(result.size, 1);
      assert.ok(result.has("seed-user"));
    });

    it("returns empty set when both files are missing", async () => {
      const result = await loadKnownContributors("/no/cache", "/no/seed");
      assert.equal(result.size, 0);
    });

    it("returns empty set for malformed JSON", async () => {
      const cachePath = path.join(tmpDir, "bad.json");
      await writeFile(cachePath, "not valid json{{{");

      const result = await loadKnownContributors(cachePath, "/nonexistent");
      assert.equal(result.size, 0);
    });

    it("returns empty set for non-array JSON", async () => {
      const cachePath = path.join(tmpDir, "obj.json");
      await writeFile(cachePath, JSON.stringify({ users: ["a"] }));

      const result = await loadKnownContributors(cachePath, "/nonexistent");
      assert.equal(result.size, 0);
    });
  });

  describe("saveKnownContributors", () => {
    let tmpDir;

    beforeEach(async () => {
      tmpDir = path.join(os.tmpdir(), `contrib-save-${Date.now()}`);
      await mkdir(tmpDir, { recursive: true });
    });

    it("saves sorted contributor list to file", async () => {
      const outPath = path.join(tmpDir, "output.json");
      const knownSet = new Set(["zara", "alice", "bob"]);

      await saveKnownContributors(knownSet, outPath);

      const { readFile } = require("fs/promises");
      const content = JSON.parse(await readFile(outPath, "utf8"));
      assert.deepEqual(content, ["alice", "bob", "zara"]);
    });

    it("creates parent directories if missing", async () => {
      const outPath = path.join(tmpDir, "nested", "deep", "output.json");
      const knownSet = new Set(["user1"]);

      await saveKnownContributors(knownSet, outPath);

      const { readFile } = require("fs/promises");
      const content = JSON.parse(await readFile(outPath, "utf8"));
      assert.deepEqual(content, ["user1"]);
    });
  });

  describe("identifyNewContributors", () => {
    it("identifies contributors not in known set", () => {
      const contributors = ["alice", "bob", "charlie"];
      const knownSet = new Set(["alice"]);

      const newOnes = identifyNewContributors(contributors, knownSet);
      assert.deepEqual(newOnes, ["bob", "charlie"]);
    });

    it("returns empty array when all are known", () => {
      const contributors = ["alice", "bob"];
      const knownSet = new Set(["alice", "bob"]);

      const newOnes = identifyNewContributors(contributors, knownSet);
      assert.deepEqual(newOnes, []);
    });

    it("returns all when none are known", () => {
      const contributors = ["x", "y"];
      const knownSet = new Set();

      const newOnes = identifyNewContributors(contributors, knownSet);
      assert.deepEqual(newOnes, ["x", "y"]);
    });

    it("handles empty contributor list", () => {
      const newOnes = identifyNewContributors([], new Set(["alice"]));
      assert.deepEqual(newOnes, []);
    });
  });
});
