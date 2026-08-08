const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadModule(tsPath) {
  const { outputText } = ts.transpileModule(fs.readFileSync(tsPath, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.startsWith("@docusaurus/"))
        return { __esModule: true, default: () => "/" };
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsPath), id);
        for (const ext of [".ts", ".tsx"]) {
          if (fs.existsSync(base + ext)) return loadModule(base + ext);
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const base = path.join(__dirname, "..", "src", "components", "factory");
const ctx = loadModule(path.join(base, "FactoryDataContext.tsx"));
const routes = loadModule(path.join(base, "routes.ts"));

test("every dataset key has a URL", () => {
  for (const k of routes.DATASET_KEYS) {
    assert.equal(typeof ctx.DATASET_URLS[k], "string", k);
  }
});

test("no dataset URL points at lab", () => {
  // ADR 0003: zero lab resources. This test is the enforcement.
  for (const [k, url] of Object.entries(ctx.DATASET_URLS)) {
    assert.ok(!url.includes("lab.projectbluefin.io"), k);
    assert.ok(!url.includes("factory.projectbluefin.io"), k);
  }
});

test("every dataset is served from this origin", () => {
  // Build-time data is written to static/data and served from /data/*.json.
  // Anything absolute would also need a CSP connect-src entry.
  for (const [k, url] of Object.entries(ctx.DATASET_URLS)) {
    assert.ok(url.startsWith("/data/"), `${k}: ${url}`);
  }
});

test("DATASET_URLS declares no key the route table does not know", () => {
  const known = new Set(routes.DATASET_KEYS);
  for (const k of Object.keys(ctx.DATASET_URLS)) assert.ok(known.has(k), k);
});

test("every dataset URL is unique", () => {
  const urls = Object.values(ctx.DATASET_URLS);
  assert.equal(new Set(urls).size, urls.length);
});
