const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");
const portalDir = path.join(root, "src", "components", "portal");

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

test("PortalPageLoading statically renders overlay, spinner loader, and initial dot", () => {
  const componentPath = path.join(portalDir, "PortalPageLoading.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalPageLoading.tsx must exist");

  const PortalPageLoading = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalPageLoading));

  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.match(html, /<span[^>]*aria-hidden="true"[^>]*><\/span>/);
  assert.match(html, /<span[^>]*aria-hidden="true"[^>]*>\.<\/span>/);
});

test("PortalPageLoading CSS defines 56px spinner, rotation keyframes, and full-screen overlay", () => {
  const cssPath = path.join(portalDir, "PortalPageLoading.module.css");
  assert.ok(fs.existsSync(cssPath), "PortalPageLoading.module.css must exist");

  const css = fs.readFileSync(cssPath, "utf8");

  // Fixed full-screen overlay
  assert.match(css, /\.pageLoading\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.pageLoading\s*\{[^}]*inset:\s*0/s);
  assert.match(css, /\.pageLoading\s*\{[^}]*display:\s*flex/s);

  // 56px blue rotating spinner
  assert.match(css, /\.loader\s*\{[^}]*width:\s*56px/s);
  assert.match(css, /\.loader\s*\{[^}]*height:\s*56px/s);
  assert.match(css, /\.loader\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(
    css,
    /\.loader\s*\{[^}]*animation:\s*rotation\s+1s\s+linear\s+infinite/s,
  );
  assert.match(
    css,
    /@keyframes\s+rotation\s*\{[^}]*0%\s*\{[^}]*transform:\s*rotate\(0deg\)/s,
  );
  assert.match(css, /100%\s*\{[^}]*transform:\s*rotate\(360deg\)/s);

  // Animated dots styling
  assert.match(css, /\.dots\s*\{[^}]*font-size:\s*1\.8rem/s);

  // Reduced motion support
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("above-the-fold character asset constants match parity expectations", () => {
  const modelPath = path.join(portalDir, "portalModel.ts");
  const model = loadModule(modelPath);

  const expectedImages = [
    "/img/characters/bluefin-small.webp",
    "/img/portal/characters/bluefin.webp",
    "/img/portal/characters/karl.webp",
    "/img/portal/characters/nest.webp",
  ];

  assert.deepEqual(Array.from(model.CHARACTER_IMAGES), expectedImages);
  assert.deepEqual(Array.from(model.PORTAL_CHARACTER_IMAGES), expectedImages);

  for (const imgPath of expectedImages) {
    const diskPath = path.join(root, "static", imgPath);
    assert.ok(fs.existsSync(diskPath), `Asset must exist on disk: ${imgPath}`);
  }
});

test("PortalPrototype integrates PortalPageLoading overlay barrier with image preloader", () => {
  const componentPath = path.join(portalDir, "PortalPrototype.tsx");
  const prototypeModule = loadModule(componentPath);

  assert.equal(typeof prototypeModule.useImagePreloader, "function");
  assert.deepEqual(Array.from(prototypeModule.CHARACTER_IMAGES), [
    "/img/characters/bluefin-small.webp",
    "/img/portal/characters/bluefin.webp",
    "/img/portal/characters/karl.webp",
    "/img/portal/characters/nest.webp",
  ]);

  const html = renderToStaticMarkup(
    React.createElement(prototypeModule.default),
  );

  // Loading overlay is rendered as an initial barrier
  assert.ok(html.includes('role="status"'));
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(html.includes('aria-label="Loading page"'));
  assert.ok(html.includes('id="portal-scenes"'));
});

test("image preloader hook utilizes Promise.all for character assets", () => {
  const componentPath = path.join(portalDir, "PortalPrototype.tsx");
  const source = fs.readFileSync(componentPath, "utf8");

  assert.ok(
    source.includes("Promise.all("),
    "useImagePreloader must utilize Promise.all",
  );
  assert.ok(
    source.includes("img.onload ="),
    "preloader must hook into img.onload",
  );
  assert.ok(
    source.includes("img.onerror ="),
    "preloader must hook into img.onerror to prevent blocking",
  );
  assert.ok(
    source.includes("PortalPageLoading"),
    "PortalPrototype must mount PortalPageLoading",
  );
});
