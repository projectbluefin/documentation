const test = require("node:test");
const assert = require("node:assert/strict");

const { seedAgeMs, seedIsFresh } = require("./lib/seed-cache.js");

/**
 * The bug this guards against, observed live in CI run 31261238667:
 *
 *   fetch-countme:   cache fresh (1m old), skipping
 *   fetch-scorecard: cache fresh (1m old), skipping
 *
 * Both files are tracked seeds. `git checkout` writes them with the current
 * time, so an mtime-based TTL reports "1m old" on every run and the seed never
 * refreshes — which silently freezes the accumulating history those seeds exist
 * to build.
 */

const NOW = Date.parse("2026-08-08T12:00:00Z");
const fileWith = (generatedAt) => () => JSON.stringify({ generatedAt });

test("a freshly checked-out seed is judged by its contents, not its mtime", () => {
  // The scenario that broke CI: mtime is seconds old, the data is a week old.
  const weekOld = fileWith("2026-08-01T12:00:00Z");
  assert.equal(seedIsFresh("/any/path", 24, NOW, weekOld), false);
});

test("a genuinely recent seed is still skipped", () => {
  const anHourAgo = fileWith("2026-08-08T11:00:00Z");
  assert.equal(seedIsFresh("/any/path", 24, NOW, anHourAgo), true);
});

test("a seed exactly at the TTL boundary is stale, not fresh", () => {
  const exactly24h = fileWith("2026-08-07T12:00:00Z");
  assert.equal(seedIsFresh("/any/path", 24, NOW, exactly24h), false);
});

test("an undated payload is treated as stale", () => {
  // Not refetching costs the whole feature; refetching costs one request.
  assert.equal(
    seedIsFresh("/any/path", 24, NOW, () => "{}"),
    false,
  );
  assert.equal(
    seedAgeMs("/any/path", NOW, () => "{}"),
    null,
  );
});

test("an unparseable payload is treated as stale rather than throwing", () => {
  const broken = () => "not json{";
  assert.equal(seedIsFresh("/any/path", 24, NOW, broken), false);
  assert.equal(seedAgeMs("/any/path", NOW, broken), null);
});

test("a missing file is never fresh", () => {
  assert.equal(seedIsFresh("/definitely/not/here.json", 24, NOW), false);
  assert.equal(seedAgeMs("/definitely/not/here.json", NOW), null);
});

test("a zero or negative TTL always refetches", () => {
  // This is how pages.yml forces a refresh for other feeds.
  const recent = fileWith("2026-08-08T11:59:00Z");
  assert.equal(seedIsFresh("/any/path", 0, NOW, recent), false);
});

test("seedAgeMs reports the age of the data, not of the file", () => {
  assert.equal(
    seedAgeMs("/any/path", NOW, fileWith("2026-08-08T11:00:00Z")),
    3_600_000,
  );
});
