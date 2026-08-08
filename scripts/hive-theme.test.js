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

test("the theme carries a Bluefin brand blue from the docs site", () => {
  // #5c7bd1 is --ifm-color-primary-light in src/css/custom.css, so a
  // contributor's card matches the project rather than an invented palette.
  const custom = fs.readFileSync(
    path.join(__dirname, "..", "src", "css", "custom.css"),
    "utf8",
  );
  assert.ok(css.includes("#5c7bd1"), "theme is missing the brand blue");
  assert.ok(custom.includes("#5c7bd1"), "custom.css no longer defines it");
});

test("no at-rule — the sanitizer drops every one", () => {
  // Verified live: the @media block in the first version of this theme did not
  // survive the round trip. A rule that is silently discarded is worse than no
  // rule, because it reads as handled.
  assert.ok(
    !/@[a-z-]+\s/i.test(code),
    "an at-rule cannot survive sanitization",
  );
});

test("no ancestor selector — scoping makes them unmatchable", () => {
  // The hive prepends `#tab-leaderboard ` to every selector, so
  // `[data-theme="light"] .me-card` becomes
  // `#tab-leaderboard [data-theme="light"] .me-card`. data-theme lives on
  // <html>, an ancestor of the scope, so that rule can never match. Light and
  // dark must therefore share one palette.
  assert.ok(!code.includes("[data-theme"), "data-theme cannot match here");
});

test("the palette clears WCAG on both hive surfaces", () => {
  // One palette has to work on #161b22 and #f6f8fa, because the theme cannot
  // branch. 3:1 is the bar: the brand colour is used for large numerals,
  // borders and non-text UI only.
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a) + 0.05, lum(b) + 0.05];
    return Math.max(x, y) / Math.min(x, y);
  };

  const brand = /--bf-brand:\s*(#[0-9a-f]{6})/i.exec(code)[1];
  for (const surface of ["#161b22", "#f6f8fa"]) {
    const r = ratio(brand, surface);
    assert.ok(r >= 3, `${brand} on ${surface} is ${r.toFixed(2)}:1, needs 3`);
  }

  // The one filled button carries white text.
  const deep = /--bf-brand-deep:\s*(#[0-9a-f]{6})/i.exec(code)[1];
  const white = ratio("#ffffff", deep);
  assert.ok(white >= 4.5, `white on ${deep} is ${white.toFixed(2)}:1`);
});

test("every brace is balanced, so the sanitizer sees valid CSS", () => {
  const open = (code.match(/\{/g) || []).length;
  const close = (code.match(/\}/g) || []).length;
  assert.equal(open, close);
});
