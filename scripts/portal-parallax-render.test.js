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

const componentPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "portal",
  "PortalParallax.tsx",
);

test("parallax statically renders fifteen decorative desktop planes", () => {
  const PortalParallax = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalParallax));

  assert.ok(html.includes('data-portal-parallax="true"'));
  assert.equal(html.split('data-portal-mode="desktop"').length - 1, 15);
  assert.equal(html.split('data-portal-mode="mobile"').length - 1, 1);
  assert.equal(html.split('data-layer="').length - 1, 15);
  assert.ok(html.includes('data-layer="sun"'));
  assert.ok(html.includes('data-rate="0.05"'));
  assert.ok(html.includes('data-rate="-0.13"'));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.equal(html.split('alt=""').length - 1, 16);
});

test("browser globals are deferred to the effect", () => {
  const source = fs.readFileSync(componentPath, "utf8");
  const effect = source.indexOf("React.useEffect");

  assert.notEqual(effect, -1);
  for (const browserGlobal of [
    "window.scrollY",
    "window.innerHeight",
    "window.matchMedia",
    "document.getElementById",
  ]) {
    assert.ok(
      source.indexOf(browserGlobal) > effect,
      `${browserGlobal} must only appear inside useEffect`,
    );
  }
});
