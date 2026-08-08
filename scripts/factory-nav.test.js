const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadModule(tsPath) {
  const { outputText } = ts.transpileModule(fs.readFileSync(tsPath, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => (id.endsWith(".css") ? {} : require(id)),
    mod,
    mod.exports,
  );
  return mod.exports;
}

const routes = loadModule(
  path.join(__dirname, "..", "src", "components", "factory", "routes.ts"),
);

test("every route path is unique", () => {
  const paths = routes.FACTORY_ROUTES.map((r) => r.path);
  assert.equal(new Set(paths).size, paths.length);
});

test("every route path starts with /factory and has no trailing slash", () => {
  for (const r of routes.FACTORY_ROUTES) {
    assert.ok(r.path === "/factory" || r.path.startsWith("/factory/"), r.path);
    assert.ok(!r.path.endsWith("/"), r.path);
  }
});

test("the eight agreed routes exist, in the agreed order", () => {
  assert.deepEqual(
    routes.FACTORY_ROUTES.map((r) => r.path),
    [
      "/factory",
      "/factory/community",
      "/factory/images",
      "/factory/builds",
      "/factory/tests",
      "/factory/applications",
      "/factory/metrics",
      "/factory/userspace",
    ],
  );
});

test("each primary owns at least one secondary", () => {
  assert.ok(routes.secondaryFor("live").length >= 1);
  assert.ok(routes.secondaryFor("factory").length >= 1);
});

test("a primary lands on its first secondary", () => {
  assert.equal(routes.landingFor("live"), "/factory");
  assert.equal(routes.landingFor("factory"), "/factory/images");
});

test("primaryOf tolerates a trailing slash and an unknown path", () => {
  assert.equal(routes.primaryOf("/factory/builds/"), "factory");
  assert.equal(routes.primaryOf("/factory/"), "live");
  assert.equal(routes.primaryOf("/somewhere-else"), "live");
});

test("no route declares a dataset the context does not know", () => {
  const known = new Set(routes.DATASET_KEYS);
  for (const r of routes.FACTORY_ROUTES) {
    for (const d of r.datasets) assert.ok(known.has(d), `${r.path}: ${d}`);
  }
});

test("every route has a non-empty label and hint", () => {
  for (const r of routes.FACTORY_ROUTES) {
    assert.ok(r.label.length > 0, r.path);
    assert.ok(r.hint.length > 0, r.path);
  }
});

test("every route declares at least one dataset", () => {
  // A route with no data is a route that can only ever render an empty page.
  for (const r of routes.FACTORY_ROUTES) {
    assert.ok(r.datasets.length > 0, r.path);
  }
});

test("route ids are unique, since they become element ids", () => {
  const ids = routes.FACTORY_ROUTES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});
