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
      if (id === "@docusaurus/Link") {
        return {
          __esModule: true,
          default: ({ to, children, ...rest }) =>
            React.createElement("a", { href: to, ...rest }, children),
        };
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const snapshotTsx = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "factory",
  "panels",
  "HiveSnapshot.tsx",
);

test("HiveSnapshot CTA points to valid hivecommons.dev TLS endpoint", () => {
  const src = fs.readFileSync(snapshotTsx, "utf8");
  assert.ok(
    src.includes(
      "https://hosted-projectbluefin-common-nmq5.hive.hivecommons.dev/snapshot",
    ),
    "must point to hosted-projectbluefin-common-nmq5.hive.hivecommons.dev/snapshot",
  );
  assert.ok(
    !src.includes("kubestellar.io/snapshot"),
    "must not point to invalid kubestellar.io snapshot URL",
  );
});

test("HiveSnapshot renders snapshot link in markup", () => {
  const HiveSnapshot = loadComponent(snapshotTsx).default;
  const html = renderToStaticMarkup(React.createElement(HiveSnapshot));
  assert.match(
    html,
    /href="https:\/\/hosted-projectbluefin-common-nmq5\.hive\.hivecommons\.dev\/snapshot"/,
  );
  assert.match(html, /Open the live snapshot/);
});

test("HiveSnapshot CTA button uses readable high-contrast text color token", () => {
  const css = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "src",
      "components",
      "factory",
      "panels",
      "HiveSnapshot.module.css",
    ),
    "utf8",
  );
  // Must not use var(--fx-bg) for text color (transparent in light mode)
  assert.ok(!css.includes("color: var(--fx-bg)"), "CTA must not use --fx-bg for text color");
  assert.match(
    css,
    /\.cta\s*\{[^}]*color:\s*var\(--fx-text-on-accent\)/s,
    "CTA button must use --fx-text-on-accent for high-contrast text in light mode",
  );
});
