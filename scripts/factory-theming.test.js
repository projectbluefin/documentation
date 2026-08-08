const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/**
 * The dashboard must follow the documentation site's theme.
 *
 * projectbluefin/documentation#1003: "No light theming for light mode, not
 * blending with Docusaurus structure." The fix was to derive every token in
 * src/components/factory/tokens.css from Infima's own variables. A hardcoded
 * hex reintroduces the slab of GitHub dark that issue is about, and it does so
 * invisibly to anyone testing in dark mode only.
 */

const repo = path.join(__dirname, "..");

const themed = [
  "src/components/factory/tokens.css",
  "src/components/factory/FactoryNav.module.css",
  "src/components/factory/FactoryShell.module.css",
  "src/components/HiveFactoryDashboard.module.css",
  "src/components/HiveFactoryDashboard.tsx",
];

/** Severity is deliberately hue-fixed, so hsl() is allowed; raw hex is not. */
const HEX = /#[0-9a-fA-F]{6}\b/g;

test("no themed file hardcodes a hex colour", () => {
  const offenders = [];
  for (const rel of themed) {
    const src = fs.readFileSync(path.join(repo, rel), "utf8");
    src.split("\n").forEach((line, i) => {
      // A comment may name a retired colour to explain why it is retired.
      const isComment =
        line.trimStart().startsWith("*") ||
        line.trimStart().startsWith("//") ||
        line.trimStart().startsWith("/*");
      if (isComment) return;
      // The categorical series palette is a palette by definition: chart
      // series need distinguishable hues that no Infima variable supplies.
      // It is declared once, in tokens.css, and consumed as --fx-cat-*.
      if (/^\s*--fx-cat-\d:/.test(line)) return;
      const found = line.match(HEX);
      if (found) offenders.push(`${rel}:${i + 1} ${found.join(" ")}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `use a --fx-* token so the dashboard follows the site theme:\n${offenders.join("\n")}`,
  );
});

test("tokens derive from Infima rather than redefining a palette", () => {
  const src = fs.readFileSync(
    path.join(repo, "src/components/factory/tokens.css"),
    "utf8",
  );
  for (const token of [
    "--fx-bg",
    "--fx-surface",
    "--fx-border",
    "--fx-text",
    "--fx-text-muted",
    "--fx-accent",
    "--fx-font",
  ]) {
    const line = src.split("\n").find((l) => l.trim().startsWith(`${token}:`));
    assert.ok(line, `${token} is missing`);
    assert.ok(
      line.includes("var(--ifm-"),
      `${token} must derive from an Infima variable, got: ${line.trim()}`,
    );
  }
});

test("the tab bar sticks under the site navbar", () => {
  // The bar is documentation chrome, not a widget inside the page.
  const css = fs.readFileSync(
    path.join(repo, "src/components/factory/FactoryNav.module.css"),
    "utf8",
  );
  assert.ok(css.includes("position: sticky"));
  assert.ok(
    css.includes("top: var(--ifm-navbar-height)"),
    "the bar must sit directly beneath the navbar",
  );
});

test("Sparkline paints with currentColor so tokens resolve", () => {
  // var() does not resolve in an SVG presentation attribute; it does resolve
  // in the CSS `color` property, which currentColor then picks up.
  const src = fs.readFileSync(
    path.join(repo, "src/components/Sparkline.tsx"),
    "utf8",
  );
  assert.ok(!/(?:fill|stroke)=\{color\}/.test(src));
  assert.ok(src.includes('fill="currentColor"'));
  assert.ok(src.includes('stroke="currentColor"'));
});
