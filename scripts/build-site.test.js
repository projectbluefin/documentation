import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMatrix,
  hasLocalizedBaseUrl,
  localesForPart,
  planShards,
} from "./build-site.mjs";

const TWENTY =
  "ar cs de es fr hi id it ja ko nl pl pt-BR ru sv tr uk vi zh-Hans zh-Hant".split(
    " ",
  );

// A locale absent from every shard builds nowhere and silently never deploys.
test("every translated locale lands in exactly one shard", () => {
  for (let n = 0; n <= TWENTY.length; n++) {
    const locales = TWENTY.slice(0, n);
    const assigned = planShards(locales).flat();
    assert.deepEqual([...assigned].sort(), [...locales].sort(), `n=${n}`);
    assert.equal(new Set(assigned).size, assigned.length, `n=${n} duplicate`);
  }
});

test("shards hold at most 4 locales and differ in size by at most 1", () => {
  for (let n = 1; n <= TWENTY.length; n++) {
    const sizes = planShards(TWENTY.slice(0, n)).map((s) => s.length);
    assert.ok(Math.max(...sizes) <= 4, `n=${n}: ${sizes}`);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `n=${n}: ${sizes}`);
  }
});

test("the matrix always builds English, and no translated shard with none live", () => {
  assert.deepEqual(buildMatrix([]), { include: [{ part: "en" }] });
  assert.deepEqual(
    buildMatrix(TWENTY.slice(0, 6)).include.map((j) => j.part),
    ["en", "1/2", "2/2"],
  );
});

test("each matrix part resolves back to its own shard", () => {
  const locales = TWENTY.slice(0, 14);
  const parts = buildMatrix(locales)
    .include.slice(1)
    .map((j) => j.part);
  assert.deepEqual(
    parts.map((p) => localesForPart(p, locales)),
    planShards(locales),
  );
});

// The matrix is computed in one job and resolved in another; if the live set
// changed in between, fail rather than build the wrong locales.
test("a part from a stale plan is rejected", () => {
  assert.throws(() => localesForPart("1/2", TWENTY.slice(0, 12)), /3 shard/);
  assert.throws(() => localesForPart("3/2", TWENTY.slice(0, 6)), /no shard/);
  assert.throws(() => localesForPart("en", TWENTY.slice(0, 6)));
});

// The guard that stops a translated build rendered against the English root
// from shipping. The HTML minifier strips attribute quotes, so both forms occur.
test("a page linking its own locale passes, quoted or not", () => {
  assert.equal(
    hasLocalizedBaseUrl("<script src=/pl/assets/js/main.1.js defer>", "pl"),
    true,
  );
  assert.equal(
    hasLocalizedBaseUrl('<a href="/zh-Hans/installation/">', "zh-Hans"),
    true,
  );
});

test("a translated page built against the English root fails", () => {
  const englishRooted =
    "<link rel=stylesheet href=/assets/css/styles.css /><a href=/installation/>";
  assert.equal(hasLocalizedBaseUrl(englishRooted, "pl"), false);
});

test("another locale's prefix does not satisfy the check", () => {
  assert.equal(hasLocalizedBaseUrl('<a href="/pl/x/">', "pt-BR"), false);
  assert.equal(hasLocalizedBaseUrl("<a href=/zh-Hant/x/>", "zh-Hans"), false);
});

// CI captures `--matrix` stdout straight into a GitHub Actions output. Any
// log line before the JSON (e.g. the feed generator) makes the whole job fail.
test("the --matrix CLI emits JSON only, without build-log noise", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const stdout = execFileSync(
    process.execPath,
    [join(root, "scripts", "build-site.mjs"), "--matrix"],
    { cwd: root, encoding: "utf8", timeout: 30000 },
  );
  assert.doesNotMatch(stdout, /leaderboard-feed/);
  const matrix = JSON.parse(stdout);
  assert.deepEqual(matrix.include[0], { part: "en" });
});
