const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(file), id);
        for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + suffix)) return loadModule(base + suffix);
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const root = path.join(__dirname, "..");
const componentPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalPrototype.tsx",
);
const pagePath = path.join(root, "src", "pages", "portal-prototype.tsx");
const cssPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalPrototype.module.css",
);

test("prototype renders source-authored scenes in order", () => {
  const PortalPrototype = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  const ids = [
    'id="scene-landing"',
    'id="scene-users"',
    'id="scene-developers"',
    'id="scene-mission"',
  ];
  ids.reduce((previous, id) => {
    const current = html.indexOf(id);
    assert.ok(current > previous, `${id} must follow the previous scene`);
    return current;
  }, -1);

  assert.ok(html.includes('id="portal-scenes"'));
  assert.match(html, /<h1[^>]*>\s*<img[^>]*alt="Bluefin"[^>]*\/>\s*<\/h1>/);
  assert.match(
    html,
    /<h1[^>]*>\s*<img[^>]*src="\/img\/bluefin-wordmark-light\.svg"[^>]*\/>\s*<\/h1>/,
  );
  assert.ok(
    html.includes(
      "The next generation Linux workstation, designed for reliability, performance, and sustainability.",
    ),
  );
  assert.ok(html.includes(">For<"));
  assert.ok(html.includes(">You<"));
  assert.ok(html.includes(">Developers<"));
  assert.ok(html.includes(">Mission<"));
  assert.ok(html.includes('href="#scene-users"'));
  assert.match(html, /id="scene-users"[^>]*tabindex="-1"/);
  assert.ok(html.includes('src="/img/portal/layer-transition.webp"'));
});

test("route stays temporary and does not replace the documentation root", () => {
  const page = fs.readFileSync(pagePath, "utf8");
  const index = fs.readFileSync(path.join(root, "docs", "index.md"), "utf8");

  assert.ok(page.includes("PortalPrototype"));
  assert.ok(page.includes("<Layout"));
  assert.ok(page.includes("noFooter"));
  assert.ok(index.includes("slug: /"));
  assert.ok(index.includes("# Welcome to Bluefin"));
});

test("scoped CSS clips artwork and defines mobile and reduced-motion paths", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /\.parallaxViewport\s*\{[^}]*overflow:\s*clip/s);
  assert.match(css, /\.parallaxLayer\s*\{[^}]*position:\s*absolute/s);
  assert.match(
    css,
    /\.contentScene\s*\{[^}]*scroll-margin-top:\s*var\(--ifm-navbar-height/s,
  );
  assert.match(css, /@media \(max-width:\s*956px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  const sharedGridMatches = css.match(/\.landingGrid,\s*\.twoColumn/g);
  assert.equal(sharedGridMatches?.length, 2);
  assert.ok(!css.includes("scroll-behavior"));
  assert.ok(!css.includes("html {"));
  assert.ok(!css.includes(":root {"));
});
