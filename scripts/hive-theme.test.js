const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * The Bluefin hive leaderboard theme.
 *
 * The hive fetches this file server-side from raw.githubusercontent.com,
 * sanitizes it, and caps it at 128 KiB — see projectbluefin/documentation#1024.
 * A theme that violates those constraints does not fail loudly; it is silently
 * stripped or rejected and the reader gets the default style with a small
 * notice. These tests are the loud failure.
 */

const THEME = path.join(__dirname, "..", "static", "hive", "leaderboard.css");

const css = fs.readFileSync(THEME, "utf8");
/** Declarations only — comments explain the constraints and would false-positive. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("the theme exists at the path the hive is pointed at", () => {
  // The ?style= parameter encodes this path. Moving the file breaks every
  // contributor's saved URL, so the location is part of the contract.
  assert.ok(fs.existsSync(THEME));
});

test("the theme is well under the 128 KiB server-side cap", () => {
  const bytes = Buffer.byteLength(css, "utf8");
  assert.ok(bytes < 128 * 1024, `${bytes} bytes`);
});

test("no @import — the sanitizer strips it", () => {
  assert.ok(!/@import/i.test(code));
});

test("no url() at all, so nothing can be stripped or beacon out", () => {
  // An external url() is a CSS exfiltration vector and is removed server-side;
  // a relative one would resolve against the hive, not against this repo.
  assert.ok(!/url\(/i.test(code));
});

test("no remote origin is referenced", () => {
  assert.ok(!/https?:\/\//i.test(code));
});

test("the theme drives the documented --me-* contract", () => {
  // The hive's built-in styles are palette variations over these two
  // variables. Following that contract is what keeps the theme working when
  // the hive changes its markup.
  assert.ok(/--me-accent\s*:/.test(code));
  assert.ok(/--me-accent-soft\s*:/.test(code));
});

test("the theme carries Bluefin's brand blue from the docs site", () => {
  // Same values as --ifm-color-primary in src/css/custom.css, so a
  // contributor's card matches the project.
  const custom = fs.readFileSync(
    path.join(__dirname, "..", "src", "css", "custom.css"),
    "utf8",
  );
  for (const brand of ["#4a69bd", "#8a97f7"]) {
    assert.ok(css.includes(brand), `theme is missing ${brand}`);
    assert.ok(custom.includes(brand), `custom.css no longer defines ${brand}`);
  }
});

test("the theme styles both light and dark", () => {
  // The hive ships light and dark via [data-theme="light"]. A dark-only theme
  // is the defect #1003 was filed about.
  assert.ok(code.includes('[data-theme="light"]'));
});

test("the theme honours prefers-reduced-motion", () => {
  assert.ok(code.includes("prefers-reduced-motion"));
});

test("every brace is balanced, so the sanitizer sees valid CSS", () => {
  const open = (code.match(/\{/g) || []).length;
  const close = (code.match(/\}/g) || []).length;
  assert.equal(open, close);
});
