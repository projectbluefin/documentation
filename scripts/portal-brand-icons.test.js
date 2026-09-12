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

test("PortalPrototype renders developer benefits with brand icons and dual glowing layers", () => {
  const PortalPrototype = loadModule(path.join(portalDir, "PortalPrototype.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  assert.ok(html.includes("/brands/vscode.svg"), "VS Code icon must be rendered");
  assert.ok(html.includes("/brands/kubernetes.svg"), "Kubernetes icon must be rendered");
  assert.ok(html.includes("/brands/homebrew.svg"), "Homebrew icon must be rendered");
  assert.ok(html.includes("/brands/podman-desktop.svg"), "Podman Desktop icon must be rendered");
  assert.ok(html.includes("/brands/ptyxis.svg"), "Ptyxis icon must be rendered");
  assert.ok(html.includes("/brands/jetbrains-icon.png"), "JetBrains icon must be rendered");
  assert.ok(html.includes('aria-hidden="true"'), "icon blur layer must be aria-hidden");
});

test("PortalPrototype renders Karl backlog joke annotation with arrow", () => {
  const PortalPrototype = loadModule(path.join(portalDir, "PortalPrototype.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  assert.ok(html.includes("/icons/arrow.svg"), "Arrow icon must be rendered");
  assert.ok(html.includes("Tower"), "Tower must be present in joke");
  assert.ok(html.includes("over your Backlog!"), "over your Backlog! must be present");
});

test("PortalPrototype renders Stephen Jay Gould and Commander Zavala quotes", () => {
  const PortalPrototype = loadModule(path.join(portalDir, "PortalPrototype.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  assert.ok(
    html.includes("Evolution is a process of constant branching and expansion."),
    "Stephen Jay Gould quote must be rendered in Users scene",
  );
  assert.ok(html.includes("Stephen Jay Gould"), "Stephen Jay Gould author must be cited");
  assert.ok(
    html.includes("Be the one who moves, not the one who is moved."),
    "Commander Zavala quote must be rendered in Developers scene",
  );
  assert.ok(html.includes("Commander Zavala (Destiny)"), "Commander Zavala author must be cited");
});

test("PortalPrototype restores complete CNCF copy with links", () => {
  const PortalPrototype = loadModule(path.join(portalDir, "PortalPrototype.tsx")).default;
  const html = renderToStaticMarkup(React.createElement(PortalPrototype));

  assert.ok(
    html.includes("15.6 million cloud native developers"),
    "15.6 million cloud native developers text must be rendered",
  );
  assert.ok(
    html.includes("https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/"),
    "CNCF announcement link must be present",
  );
  assert.ok(
    html.includes("https://landscape.cncf.io/"),
    "CNCF landscape link must be present",
  );
});
