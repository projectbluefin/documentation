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

test("both primaries always render", () => {
  const html = render("/factory");
  assert.ok(html.includes(">Live<"));
  assert.ok(html.includes(">Factory<"));
});

test("only the active primary's secondary row renders", () => {
  const live = render("/factory");
  assert.ok(live.includes(">Community<"));
  assert.ok(!live.includes(">Userspace<"));

  const factory = render("/factory/builds");
  assert.ok(factory.includes(">Userspace<"));
  assert.ok(!factory.includes(">Community<"));
});

test("exactly one tab in each row is aria-selected", () => {
  const html = render("/factory/metrics");
  assert.equal(count(html, 'aria-selected="true"'), 2);
});

test("only the selected tab is in the tab order", () => {
  // WAI-ARIA roving tabindex: one tabindex="0" per tablist.
  const html = render("/factory/tests");
  assert.equal(count(html, 'tabindex="0"'), 2);
  assert.ok(count(html, 'tabindex="-1"') >= 5);
});

test("an inactive primary links to its own landing route", () => {
  const html = render("/factory");
  assert.ok(html.includes('href="/factory/images"'));
});

test("every tab is a real link, so it works without JavaScript", () => {
  // 2 primaries + 2 live secondaries
  assert.equal(count(render("/factory"), "<a "), 4);
});

test("both rows are labelled tablists", () => {
  const html = render("/factory");
  assert.equal(count(html, 'role="tablist"'), 2);
  assert.ok(html.includes('aria-label="Factory sections"'));
  assert.ok(html.includes('aria-label="Live views"'));
});

test("an unknown pathname still renders a usable nav", () => {
  // Never throw and never render a nav with nothing selected.
  const html = render("/factory/does-not-exist");
  assert.equal(count(html, 'aria-selected="true"'), 2);
  assert.equal(count(html, 'tabindex="0"'), 2);
});

test("rendering is deterministic", () => {
  assert.equal(render("/factory/images"), render("/factory/images"));
});
