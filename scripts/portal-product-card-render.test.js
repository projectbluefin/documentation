const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");

function makeCssMock() {
  const handler = {
    get(target, prop) {
      if (prop === "__esModule") return true;
      if (prop === "default") return proxy;
      return String(prop);
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

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
      if (id.endsWith(".css")) return makeCssMock();
      if (id.startsWith("@site/")) {
        const rel = id.slice("@site/".length);
        const target = path.resolve(root, rel);
        if (target.endsWith(".json"))
          return JSON.parse(fs.readFileSync(target, "utf8"));
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
  "PortalProductCard.tsx",
);

test("product card renders link, title, image, and version rows", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const html = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Dakota",
      description: "The Final Form.",
      image: "/img/portal/characters/dakota.webp",
      href: "/dakota",
      versionRows: [
        { label: "Kernel", value: "7.0.7" },
        { label: "GNOME", value: "50.2" },
      ],
    }),
  );

  assert.match(html, /<a[^>]*href="\/dakota"/);
  assert.ok(html.includes("Dakota"));
  assert.ok(html.includes("The Final Form."));
  assert.ok(html.includes("/img/portal/characters/dakota.webp"));
  assert.ok(html.includes("Kernel"));
  assert.ok(html.includes("7.0.7"));
  assert.ok(html.includes("GNOME"));
  assert.ok(html.includes("50.2"));
});

test("product card renders external wolves link safely with explicit noopener noreferrer", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const html = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Seven Days to the Wolves",
      image: "/img/portal/wolves/Always%20There.webp",
      href: "https://projectbluefin.io/wolves/",
    }),
  );

  assert.match(html, /<a[^>]*href="https:\/\/projectbluefin\.io\/wolves\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.ok(html.includes("Seven Days to the Wolves"));
});

test("product card renders external destination link safely with explicit noopener noreferrer", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const html = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Utah",
      image: "/img/portal/characters/utah.webp",
      href: "https://devconf.us",
    }),
  );

  assert.match(html, /<a[^>]*href="https:\/\/devconf\.us"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.ok(html.includes("Utah"));
});

test("product card renders badge title and subtitle when provided", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const html = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Bluefin Experimental",
      image: "/img/portal/characters/dakota.webp",
      badgeTitle: "ALPHA",
      badgeSub: "v0.9.0",
    }),
  );

  assert.ok(html.includes("ALPHA"));
  assert.ok(html.includes("v0.9.0"));
  assert.ok(html.includes("alphaBadge"));
});

test("product card applies central emphasis styling when isCenter is true", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const htmlCenter = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Bluefin Server",
      image: "/img/portal/characters/alamosaurus.webp",
      href: "/server",
      isCenter: true,
    }),
  );
  const htmlRegular = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Utah",
      image: "/img/portal/characters/utah.webp",
      href: "/utah",
      isCenter: false,
    }),
  );

  assert.ok(
    htmlCenter.includes("cardCenter"),
    "card with isCenter=true must include cardCenter class",
  );
  assert.ok(
    !htmlRegular.includes("cardCenter"),
    "card with isCenter=false must not include cardCenter class",
  );
});

test("product card renders non-link container when href is omitted", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const html = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Preview Card",
      image: "/img/portal/characters/dakota.webp",
    }),
  );

  assert.ok(
    html.startsWith("<div"),
    "card without href must render a div root",
  );
  assert.ok(!html.includes("<a"), "card without href must not render an a tag");
  assert.ok(html.includes("Preview Card"));
});

test("product card omits versionInfo block when versionRows is empty or undefined", () => {
  const PortalProductCard = loadModule(componentPath).default;
  const htmlEmpty = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Server",
      image: "/img/portal/characters/alamosaurus.webp",
      versionRows: [],
    }),
  );
  const htmlUndefined = renderToStaticMarkup(
    React.createElement(PortalProductCard, {
      title: "Utah",
      image: "/img/portal/characters/utah.webp",
    }),
  );

  assert.ok(
    !htmlEmpty.includes("versionInfo"),
    "empty versionRows must not render versionInfo",
  );
  assert.ok(
    !htmlUndefined.includes("versionInfo"),
    "undefined versionRows must not render versionInfo",
  );
});

test("product card scoped CSS implements resilient min-height/auto and reduced-motion suppression", () => {
  const cssPath = path.join(
    root,
    "src",
    "components",
    "portal",
    "PortalSectionPicker.module.css",
  );
  const css = fs.readFileSync(cssPath, "utf8");

  // Resilient height under text zoom
  assert.match(
    css,
    /\.cardBox\s*\{[^}]*min-height:\s*400px;[^}]*height:\s*auto;/s,
    "cardBox must use min-height and height:auto for resilience under text zoom",
  );
  assert.match(
    css,
    /\.cardOverlay\s*\{[^}]*position:\s*relative;[^}]*min-height:\s*400px;/s,
    "cardOverlay must be relative with min-height so content expands without clipping",
  );

  // Reduced-motion suppression
  assert.match(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.cardBox[^}]*transition:\s*none\s*!important/s,
    "reduced-motion must suppress card transitions",
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.cardBox:hover[^}]*transform:\s*none\s*!important/s,
    "reduced-motion must suppress card hover transform",
  );
});
