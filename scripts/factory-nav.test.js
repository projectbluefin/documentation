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
  // One unified row. The hive is not split out; every view is a peer.
  assert.deepEqual(
    routes.FACTORY_ROUTES.map((r) => r.path),
    [
      "/factory",
      "/factory/images",
      "/factory/builds",
      "/factory/tests",
      "/factory/applications",
      "/factory/metrics",
      "/factory/userspace",
      "/factory/community",
    ],
  );
});

test("the navigation has exactly one level", () => {
  // A two-level split reappearing would mean the hive was separated again.
  assert.equal(routes.PRIMARIES, undefined);
  assert.equal(routes.secondaryFor, undefined);
  for (const r of routes.FACTORY_ROUTES) {
    assert.equal(r.primary, undefined, r.path);
  }
});

test("landingPath is the first tab", () => {
  assert.equal(routes.landingPath(), "/factory");
});

test("routeFor tolerates a trailing slash and an unknown path", () => {
  assert.equal(routes.routeFor("/factory/builds/").id, "builds");
  assert.equal(routes.routeFor("/factory/").id, "hive");
  assert.equal(routes.routeFor("/somewhere-else"), undefined);
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
