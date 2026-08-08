const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadComponent(tsxPath) {
  const { outputText } = ts.transpileModule(fs.readFileSync(tsxPath, "utf8"), {
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
      // Docusaurus Link is a router component; a plain anchor is enough to
      // assert structure and is what it renders to anyway.
      if (id === "@docusaurus/Link") {
        return {
          __esModule: true,
          default: ({ to, children, ...rest }) =>
            React.createElement("a", { href: to, ...rest }, children),
        };
      }
      // A relative import is a sibling TypeScript module; transpile it too,
      // resolving from the importer rather than from this test file.
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsxPath), id);
        for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + ext)) return loadModule(base + ext);
        }
        if (fs.existsSync(base)) return loadModule(base);
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

/** Same machinery, for a module whose default export is not the subject. */
function loadModule(p) {
  return loadComponent(p);
}

const FactoryNav = loadComponent(
  path.join(__dirname, "..", "src", "components", "factory", "FactoryNav.tsx"),
).default;
const render = (pathname) =>
  renderToStaticMarkup(React.createElement(FactoryNav, { pathname }));

const count = (haystack, needle) => haystack.split(needle).length - 1;

test("every view renders as a peer in one row", () => {
  // Unified factory: the hive is not split from builds, tests or adoption.
  const html = render("/factory");
  for (const label of [
    "Hive",
    "Images",
    "Builds",
    "Tests",
    "Applications",
    "Metrics",
    "Userspace",
    "Community",
  ]) {
    assert.ok(html.includes(`>${label}<`), label);
  }
});

test("there is exactly one tablist, not a two-level split", () => {
  const html = render("/factory/builds");
  assert.equal(count(html, 'role="tablist"'), 1);
  assert.ok(html.includes('aria-label="Factory views"'));
});

test("exactly one tab is aria-selected", () => {
  assert.equal(count(render("/factory/metrics"), 'aria-selected="true"'), 1);
});

test("only the selected tab is in the tab order", () => {
  // WAI-ARIA roving tabindex: one stop for the whole bar.
  const html = render("/factory/tests");
  assert.equal(count(html, 'tabindex="0"'), 1);
  assert.equal(count(html, 'tabindex="-1"'), 7);
});

test("every tab is a real link, so it works without JavaScript", () => {
  assert.equal(count(render("/factory"), "<a "), 8);
});

test("an unknown pathname still renders a usable bar", () => {
  const html = render("/factory/does-not-exist");
  assert.equal(count(html, 'aria-selected="true"'), 1);
  assert.equal(count(html, 'tabindex="0"'), 1);
});

test("rendering is deterministic", () => {
  assert.equal(render("/factory/images"), render("/factory/images"));
});
