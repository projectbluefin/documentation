const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");

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
      if (id.startsWith("@site/")) {
        const rel = id.slice("@site/".length);
        const target = path.resolve(root, rel);
        if (target.endsWith(".json"))
          return fs.existsSync(target)
            ? JSON.parse(fs.readFileSync(target, "utf8"))
            : { unavailable: true };
        for (const suffix of [
          ".ts",
          ".tsx",
          "/index.ts",
          "/index.tsx",
          ".json",
        ]) {
          if (fs.existsSync(target + suffix)) {
            if (suffix === ".json")
              return JSON.parse(fs.readFileSync(target + suffix, "utf8"));
            return loadModule(target + suffix);
          }
        }
      }
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(file), id);
        if (base.endsWith(".json"))
          return JSON.parse(fs.readFileSync(base, "utf8"));
        for (const suffix of [
          ".ts",
          ".tsx",
          "/index.ts",
          "/index.tsx",
          ".json",
        ]) {
          if (fs.existsSync(base + suffix)) {
            if (suffix === ".json")
              return JSON.parse(fs.readFileSync(base + suffix, "utf8"));
            return loadModule(base + suffix);
          }
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

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

test("prototype renders source-authored scenes in order through footer including picker", () => {
  const PortalPrototype = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  const ids = [
    'id="scene-landing"',
    'id="scene-users"',
    'id="scene-developers"',
    'id="scene-mission"',
    'id="scene-video"',
    'id="bazaar"',
    'id="scene-picker"',
    'id="scene-community"',
    'id="flock"',
    'id="contributors"',
    'id="scene-news"',
    'id="alumni"',
    'id="sponsors"',
    'id="navigation"',
  ];
  ids.reduce((previous, id) => {
    const current = html.indexOf(id);
    assert.ok(
      current > previous,
      `${id} must follow the previous scene in order`,
    );
    return current;
  }, -1);

  assert.ok(html.includes('id="portal-scenes"'));
  assert.ok(html.includes('id="navigation"'));
  assert.ok(html.includes('role="navigation"'));
  assert.ok(html.includes('href="#scene-users"'));
  assert.ok(html.includes('href="#scene-developers"'));
  assert.ok(html.includes('href="#scene-mission"'));
  assert.ok(html.includes('href="#scene-picker"'));
  assert.ok(html.includes('href="#scene-community"'));
  assert.ok(html.includes(">For Devs<"));
  assert.ok(html.includes(">Our Mission<"));
  assert.ok(html.includes(">Try Out<"));
  assert.match(html, /<h1[^>]*>\s*<img[^>]*alt="Bluefin"[^>]*\/>\s*<\/h1>/);
  assert.match(
    html,
    /<h1[^>]*>\s*<img[^>]*src="\/img\/bluefin-wordmark-light\.svg"[^>]*\/>\s*<\/h1>/,
  );
  assert.ok(html.includes(">For<"));
  assert.ok(html.includes(">You<"));
  assert.ok(html.includes(">Developers<"));
  assert.ok(html.includes(">Our<"));
  assert.ok(html.includes(">Mission<"));
  assert.ok(
    html.includes("Bluefin is not just software, she is a new breed of animal"),
  );
  assert.ok(html.includes("Technology begins with the local computer"));
  assert.ok(
    html.includes(
      "By introducing cloud-native patterns to the desktop we hope to ignite interest",
    ),
  );
  assert.ok(
    html.includes(
      "Bluefin is about sustainability, encompassing the software, the hardware, and the people.",
    ),
  );
  assert.ok(
    html.includes(
      "There are two ways of spreading light: to be the candle or the mirror that reflects it.",
    ),
  );
  assert.ok(html.includes("Edith Wharton"));
  assert.ok(
    html.includes('href="https://en.wikipedia.org/wiki/Edith_Wharton"'),
  );
  assert.ok(html.includes("Or she may disembowel us on the way. Clever Girl."));
  assert.ok(html.includes('href="#scene-users"'));
  assert.match(html, /id="scene-users"[^>]*tabindex="-1"/);
  assert.ok(html.includes('src="/img/portal/layer-transition.webp"'));
  assert.ok(html.includes('title="Bluefin Introduction"'));
  assert.ok(html.includes(">Applications<"));
  assert.ok(html.includes('id="scene-picker"'));
  assert.ok(html.includes(">Try<"));
  assert.ok(html.includes(">Bluefin<"));
  assert.ok(html.includes('href="#scene-picker"'));
  assert.ok(html.includes(">Try Out<"));
  assert.ok(html.includes(">Community<"));
  assert.ok(html.includes(">Our Contributors<"));
  assert.ok(html.includes('id="scene-news"'));
  assert.ok(html.includes(">Latest<"));
  assert.ok(html.includes(">News<"));
  assert.ok(html.includes("View all posts"));
  assert.ok(html.includes('href="/blog"'));
  assert.ok(html.includes("Featuring alumni from companies like"));
  assert.ok(html.includes("Our sponsors"));
  assert.ok(html.includes("Project Bluefin is Built With"));
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
  assert.match(
    css,
    /\.missionCharacter\s*\{[^}]*background:\s*radial-gradient/s,
  );
  assert.match(css, /\.missionQuote\s*\{[^}]*border-top:/s);
  assert.match(css, /\.landingActions\s*\{[^}]*display:\s*flex/s);
  assert.match(
    css,
    /\.secondaryAction\s*\{[^}]*background:\s*var\(--portal-bg\)/s,
  );
  const sharedGridMatches = css.match(/\.landingGrid,\s*\.twoColumn/g);
  assert.equal(sharedGridMatches?.length, 2);
  assert.ok(!css.includes("scroll-behavior"));
  assert.ok(!css.includes("html {"));
  assert.ok(!css.includes(":root {"));
});

test("portal prototype preserves downstream live-section insertion seam comment", () => {
  const componentSource = fs.readFileSync(componentPath, "utf8");
  assert.ok(
    componentSource.includes(
      "Downstream insertion seam: Subproject 3 (PortalFlock, PortalContributors, PortalNews) mounts here between Community and Footer",
    ),
    "insertion seam comment between Community and Footer must be preserved",
  );
});

test("parallax viewport accounts for announcement bar height dynamically", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(
    css,
    /\.parallaxViewport\s*\{[^}]*inset:\s*calc\(\s*var\(--ifm-navbar-height\)\s*\+\s*var\(--docusaurus-announcement-bar-height,\s*0px\)\s*\)\s*0\s*0/s,
    "parallaxViewport must account for active announcement bar height",
  );
});

test("portal prototype hero raptor artwork integrates seasonal selection and random variants", () => {
  const componentSource = fs.readFileSync(componentPath, "utf8");
  assert.ok(
    componentSource.includes("useHeroRaptor"),
    "PortalPrototype must use useHeroRaptor hook",
  );
  assert.ok(
    componentSource.includes("handleTryOutClick"),
    "PortalPrototype must define handleTryOutClick",
  );
  assert.ok(
    componentSource.includes('href="#scene-picker"'),
    "PortalPrototype must contain Try Out link pointing to #scene-picker",
  );
});

test("portal prototype avoids nested landmark and suppresses no outlines", () => {
  const componentSource = fs.readFileSync(componentPath, "utf8");
  assert.match(
    componentSource,
    /<div className=\{styles\.portal\}(?:\s+aria-busy=\{[^}]+\})?>/,
    "PortalPrototype must use div with styles.portal as root",
  );
  assert.ok(
    !componentSource.includes("<main"),
    "PortalPrototype must not contain <main> tag",
  );
  assert.ok(
    !componentSource.includes("</main>"),
    "PortalPrototype must not contain </main> tag",
  );

  const PortalPrototype = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));
  assert.ok(
    !html.includes("<main"),
    "Rendered HTML must not include <main> landmark",
  );
  assert.ok(
    !html.includes("</main>"),
    "Rendered HTML must not include </main> closing tag",
  );

  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(
    !css.includes("outline: none"),
    "PortalPrototype.module.css must not use outline: none",
  );
  assert.match(
    css,
    /\.contentScene:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--portal-blue-light\)/,
    "contentScene must have explicit 2px solid var(--portal-blue-light) focus-visible ring",
  );
});
