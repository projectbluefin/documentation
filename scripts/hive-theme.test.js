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

test("the theme does NOT try to drive the --me-* contract", () => {
  // The hive's built-in styles are palette variations over --me-accent, but a
  // *custom* theme cannot use that mechanism: the sanitizer drops any rule
  // declaring a custom property, so setting --me-accent silently does nothing.
  // Verified live 2026-08-08. Reported upstream as a documentation gap.
  assert.ok(!/--me-accent/.test(code), "setting --me-accent is a no-op here");
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

test("no custom property is declared — the sanitizer drops the whole rule", () => {
  // Verified live: the rule defining --bf-* was discarded, leaving every other
  // rule referencing variables that no longer existed. The theme rendered as a
  // no-op while looking correct in the repository.
  assert.ok(!/^\s*--[a-z-]+\s*:/im.test(code), "declare no custom properties");
});

test("no var() is referenced, since nothing can define one", () => {
  assert.ok(!/var\(/.test(code), "use literal values");
});

test("no gradient — it does not survive sanitization either", () => {
  assert.ok(!/gradient\(/i.test(code));
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

  // Every literal hex in the file has to survive both surfaces, except the
  // white that sits on the one filled button.
  const hexes = [...new Set(code.match(/#[0-9a-f]{6}/gi) || [])].map((h) =>
    h.toLowerCase(),
  );
  const BUTTON_BG = "#364d8d";
  for (const hex of hexes) {
    if (hex === "#ffffff" || hex === BUTTON_BG) continue;
    for (const surface of ["#161b22", "#f6f8fa"]) {
      const r = ratio(hex, surface);
      assert.ok(r >= 3, `${hex} on ${surface} is ${r.toFixed(2)}:1, needs 3`);
    }
  }

  const white = ratio("#ffffff", BUTTON_BG);
  assert.ok(white >= 4.5, `white on ${BUTTON_BG} is ${white.toFixed(2)}:1`);
});

test("every brace is balanced, so the sanitizer sees valid CSS", () => {
  const open = (code.match(/\{/g) || []).length;
  const close = (code.match(/\}/g) || []).length;
  assert.equal(open, close);
});
