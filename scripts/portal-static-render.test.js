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

const portalDir = path.join(__dirname, "..", "src", "components", "portal");

test("PortalVideo statically renders video iframe and semantic copy", () => {
  const componentPath = path.join(portalDir, "PortalVideo.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalVideo.tsx must exist");

  const PortalVideo = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalVideo));

  assert.ok(html.includes('id="scene-video"'));
  assert.ok(html.includes('title="Bluefin Introduction"'));
  assert.ok(
    html.includes('src="https://www.youtube.com/embed/Nz-yyDwTfRM?autoplay=1"'),
  );
  assert.ok(
    html.includes(
      "href=&quot;https://www.youtube.com/embed/Nz-yyDwTfRM?autoplay=1&quot;",
    ),
  );
  assert.ok(
    html.includes(
      "src=&quot;https://img.youtube.com/vi/Nz-yyDwTfRM/hqdefault.jpg&quot;",
    ),
  );
  assert.ok(html.includes("alt=&quot;Bluefin Linux introduction&quot;"));
  assert.ok(
    html.includes(
      'href="https://github.com/ublue-os/bluefin/graphs/contributors"',
    ),
  );
  assert.ok(html.includes('href="https://github.com/ublue-os/bluefin/issues"'));
  assert.ok(html.includes("cloud-native enthusiasts"));
  assert.ok(html.includes("She represents the state of the art"));
  assert.ok(html.includes("<strong>together</strong>"));

  // Check no browser globals
  const source = fs.readFileSync(componentPath, "utf8");
  assert.ok(!source.includes("window."));
  assert.ok(!source.includes("document."));
  assert.ok(!source.includes("useEffect"));
});

test("PortalBazaar statically renders app store copy, screenshot, and Flathub action", () => {
  const componentPath = path.join(portalDir, "PortalBazaar.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalBazaar.tsx must exist");

  const PortalBazaar = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalBazaar));

  assert.ok(html.includes('id="bazaar"'));
  assert.ok(html.includes(">Run your favorite<"));
  assert.ok(html.includes(">Applications<"));
  assert.ok(html.includes('href="https://usebazaar.org"'));
  assert.ok(html.includes('href="https://flathub.org"'));
  assert.ok(html.includes('href="https://docs.brew.sh/Homebrew-on-Linux"'));
  assert.ok(html.includes('src="/img/bazaar.png"'));
  assert.ok(
    html.includes('alt="Screenshot of Bluefin&#x27;s Flatpak Store, Bazaar"'),
  );
  assert.ok(html.includes('src="/img/bazaar.svg"'));
  assert.ok(html.includes('alt="Bazaar&#x27;s Icon"'));
  assert.ok(html.includes("Bluefin is developed on Bluefin."));
  assert.ok(html.includes('href="https://flathub.org/"'));
  assert.ok(html.includes("View apps on Flathub"));

  // Check no browser globals
  const source = fs.readFileSync(componentPath, "utf8");
  assert.ok(!source.includes("window."));
  assert.ok(!source.includes("document."));
  assert.ok(!source.includes("useEffect"));
});

test("PortalCommunity statically renders documentation card, icons, and action links", () => {
  const componentPath = path.join(portalDir, "PortalCommunity.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalCommunity.tsx must exist");

  const PortalCommunity = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalCommunity));

  assert.ok(html.includes('id="scene-community"'));
  assert.ok(html.includes(">Our<"));
  assert.ok(html.includes(">Community<"));
  assert.ok(html.includes('src="/icons/docs.svg"'));
  assert.ok(html.includes('alt="Bluefin Documentation"'));
  assert.ok(html.includes(">Documentation<"));
  assert.ok(
    html.includes(
      "Looking for support? View our documentation site for up-to-date guides on installation, general use, and troubleshooting.",
    ),
  );
  assert.ok(html.includes('href="https://docs.projectbluefin.io"'));
  assert.ok(html.includes("View Documentation"));
  assert.ok(html.includes('href="https://discord.gg/WYCpGEM4sM"'));
  assert.ok(html.includes("Join our Discord"));
  assert.ok(
    html.includes('href="https://github.com/ublue-os/bluefin/discussions"'),
  );
  assert.ok(html.includes("Discussions"));
  // Verify SVG icons rendered
  assert.equal(html.split("<svg").length - 1, 3);

  // Check no browser globals
  const source = fs.readFileSync(componentPath, "utf8");
  assert.ok(!source.includes("window."));
  assert.ok(!source.includes("document."));
  assert.ok(!source.includes("useEffect"));
});
