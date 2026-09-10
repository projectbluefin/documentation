import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  identifyNewContributors,
  isBot,
  loadKnownContributors,
  saveKnownContributors,
} from "./lib/contributor-tracker.mjs";

const workdir = () => mkdtemp(join(tmpdir(), "contributor-tracker-"));

test("isBot matches the bot identities that open PRs in this org", () => {
  for (const bot of [
    "dependabot[bot]",
    "dependabot",
    "renovate[bot]",
    "renovate",
    "app/renovate",
    "github-actions[bot]",
    "github-actions",
    "copilot-swe-agent",
    "ubot-123",
    "pull",
    "testpullapp",
    "app/anything",
    "mergeraptor",
    "mergeraptor[bot]",
    "Copilot",
    "some-hive-app[bot]",
  ]) {
    assert.equal(isBot(bot), true, `${bot} should be classified as a bot`);
  }
});

test("isBot does not misclassify humans whose names embed bot substrings", () => {
  for (const human of [
    "castrojo",
    "hanthor",
    "robotnik",
    "botanist",
    "dependabot-fan",
    "ubot-",
    "pullman",
  ]) {
    assert.equal(isBot(human), false, `${human} should be treated as human`);
  }
});

test("isBot is case-insensitive only where the pattern says so", () => {
  // The [bot] suffix pattern carries the `i` flag.
  assert.equal(isBot("Mergeraptor[BOT]"), true);
  assert.equal(isBot("COPILOT"), true);
  // github-actions (no suffix) is anchored case-sensitively.
  assert.equal(isBot("GitHub-Actions"), false);
});

test("loadKnownContributors reads the GHA cache when it is present", async () => {
  const dir = await workdir();
  const cache = join(dir, "known.json");
  const seed = join(dir, "seed.json");
  await writeFile(cache, JSON.stringify(["castrojo", "hanthor"]));
  await writeFile(seed, JSON.stringify(["ignored"]));

  const known = await loadKnownContributors(cache, seed);

  assert.deepEqual([...known].sort(), ["castrojo", "hanthor"]);
});

test("loadKnownContributors falls back to the committed seed when the cache is absent", async () => {
  const dir = await workdir();
  const seed = join(dir, "seed.json");
  await writeFile(seed, JSON.stringify(["castrojo"]));

  const known = await loadKnownContributors(join(dir, "missing.json"), seed);

  assert.deepEqual([...known], ["castrojo"]);
});

test("loadKnownContributors falls through malformed JSON instead of throwing", async () => {
  const dir = await workdir();
  const cache = join(dir, "known.json");
  const seed = join(dir, "seed.json");
  await writeFile(cache, "{ not json");
  await writeFile(seed, JSON.stringify(["hanthor"]));

  const known = await loadKnownContributors(cache, seed);

  assert.deepEqual([...known], ["hanthor"]);
});

test("loadKnownContributors rejects a non-array payload and keeps looking", async () => {
  const dir = await workdir();
  const cache = join(dir, "known.json");
  const seed = join(dir, "seed.json");
  // A object-shaped cache would otherwise become `new Set({})` — an empty set
  // that silently reports every contributor as first-time.
  await writeFile(cache, JSON.stringify({ contributors: ["castrojo"] }));
  await writeFile(seed, JSON.stringify(["hanthor"]));

  const known = await loadKnownContributors(cache, seed);

  assert.deepEqual([...known], ["hanthor"]);
});

test("loadKnownContributors returns an empty set on a cold start", async () => {
  const dir = await workdir();

  const known = await loadKnownContributors(
    join(dir, "missing.json"),
    join(dir, "also-missing.json"),
  );

  assert.equal(known.size, 0);
});

test("saveKnownContributors writes a sorted array and creates the parent directory", async () => {
  const dir = await workdir();
  const cache = join(dir, "nested", "deeper", "known.json");

  await saveKnownContributors(new Set(["hanthor", "castrojo", "inffy"]), cache);

  const written = JSON.parse(await readFile(cache, "utf8"));
  assert.deepEqual(written, ["castrojo", "hanthor", "inffy"]);
});

test("saveKnownContributors terminates the file with a newline", async () => {
  const dir = await workdir();
  const cache = join(dir, "known.json");

  await saveKnownContributors(new Set(["castrojo"]), cache);

  assert.equal((await readFile(cache, "utf8")).endsWith("\n"), true);
});

test("a save round-trips through a load", async () => {
  const dir = await workdir();
  const cache = join(dir, "known.json");
  const original = new Set(["castrojo", "hanthor"]);

  await saveKnownContributors(original, cache);
  const reloaded = await loadKnownContributors(cache, join(dir, "seed.json"));

  assert.deepEqual([...reloaded].sort(), [...original].sort());
});

test("identifyNewContributors returns only the unseen contributors", () => {
  const known = new Set(["castrojo", "hanthor"]);

  assert.deepEqual(
    identifyNewContributors(["castrojo", "newcomer", "hanthor"], known),
    ["newcomer"],
  );
});

test("identifyNewContributors preserves input order and duplicates", () => {
  assert.deepEqual(
    identifyNewContributors(["b", "a", "b"], new Set()),
    ["b", "a", "b"],
  );
});

test("identifyNewContributors returns an empty list when everyone is known", () => {
  assert.deepEqual(
    identifyNewContributors(["castrojo"], new Set(["castrojo"])),
    [],
  );
});

test("identifyNewContributors does not mutate the known set", () => {
  const known = new Set(["castrojo"]);
  identifyNewContributors(["newcomer"], known);
  assert.deepEqual([...known], ["castrojo"]);
});
