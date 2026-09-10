const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");

function makeCssMock() {
  const handler = {
    get(target, prop) {
      if (prop === "__esModule") return true;
      if (prop === "default") return proxy;
      return String(prop);
    },
  };
  const proxy = new Proxy({}, handler);
  return proxy;
}

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
      if (id.endsWith(".css")) return makeCssMock();
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

const componentPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalSectionPicker.tsx",
);
const cssPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalSectionPicker.module.css",
);

test("section picker renders id=scene-picker with header, intro, chooser, ecosystem, and wolves card", () => {
  const PortalSectionPicker = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalSectionPicker));

  assert.ok(html.includes('id="scene-picker"'));
  assert.ok(html.includes(">Try<"));
  assert.ok(html.includes(">Bluefin<"));
  assert.ok(html.includes("Fedora Media Writer"));
  assert.ok(html.includes('id="wolves-downloads-title"'));
  assert.ok(html.includes("For the Wolves"));
  assert.ok(html.includes("No compromises."));

  // Verify external campaign and tool links use explicit noopener noreferrer
  assert.match(
    html,
    /<a[^>]*href="https:\/\/flathub\.org\/apps\/org\.fedoraproject\.MediaWriter"[^>]*rel="noopener noreferrer"/,
    "Fedora Media Writer link must use noopener noreferrer",
  );
  assert.match(
    html,
    /<a[^>]*href="https:\/\/hive\.kubestellar\.io"[^>]*rel="noopener noreferrer"/,
    "Hive link must use noopener noreferrer",
  );

  const dakotaIdx = html.indexOf('href="/dakota"');
  const serverIdx = html.indexOf('href="/server"');
  const utahIdx = html.indexOf('href="https://devconf.us"');
  const wolvesIdx = html.indexOf('href="https://projectbluefin.io/wolves/"');

  assert.ok(dakotaIdx > 0, "Dakota card must link /dakota");
  assert.ok(serverIdx > dakotaIdx, "Server card must follow Dakota");
  assert.ok(utahIdx > serverIdx, "Utah card must follow Server");
  assert.ok(
    wolvesIdx > utahIdx,
    "Wolves card must follow Utah in campaign grid",
  );
  assert.match(
    html,
    /<a[^>]*href="https:\/\/devconf\.us"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    "Utah card link must use target=_blank and rel=noopener noreferrer",
  );

  assert.match(html, /<div[^>]*aria-hidden="true"[^>]*>/);
});

test("section picker supports decoupled custom catalog prop", () => {
  const PortalSectionPicker = loadModule(componentPath).default;
  const customCatalog = {
    streams: {
      stable: {
        id: "stable",
        title: "Bluefin Custom",
        subtitle: "Custom Sub",
        description: "Custom Desc",
        image: "/img/portal/characters/leaping.webp",
        supportedArch: ["x86"],
        recommended: true,
        available: true,
      },
      lts: {
        id: "lts",
        title: "Bluefin LTS Custom",
        subtitle: "LTS Sub",
        description: "LTS Desc",
        image: "/img/portal/characters/achillobator.webp",
        supportedArch: ["x86"],
        recommended: false,
        available: false,
        unavailableReason: "Custom unavailable",
      },
    },
    ecosystem: [
      {
        id: "dakota",
        title: "Dakota Custom",
        description: "Dakota Desc",
        href: "/dakota",
        image: "/img/portal/characters/dakota.webp",
        versionRows: [{ label: "CustomPkg", value: "1.0.0" }],
      },
    ],
    wolvesCampaign: {
      title: "Wolves Custom",
      href: "https://projectbluefin.io/wolves/",
      image: "/img/portal/wolves/Always%20There.webp",
    },
  };

  const html = renderToStaticMarkup(
    React.createElement(PortalSectionPicker, { catalog: customCatalog }),
  );

  assert.ok(html.includes("Bluefin Custom"));
  assert.ok(html.includes("Custom unavailable"));
  assert.ok(html.includes("Dakota Custom"));
  assert.ok(html.includes("CustomPkg"));
  assert.ok(html.includes("1.0.0"));
});

test("section picker supports injectable imagesData and driverVersionsData props", () => {
  const PortalSectionPicker = loadModule(componentPath).default;
  const customImages = {
    products: [
      {
        id: "projectbluefin-bluefin",
        streams: [
          {
            tag: "stable",
            versions: { fedora: "42", gnome: "48.0", kernel: "6.14.0" },
          },
        ],
      },
    ],
  };
  const customDrivers = {
    streams: [
      {
        id: "bluefin-stable",
        latest: { versions: { mesa: "25.0.0", flatpak: "1.16.0" } },
      },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(PortalSectionPicker, {
      imagesData: customImages,
      driverVersionsData: customDrivers,
    }),
  );

  assert.ok(html.includes("Fedora 42"));
  assert.ok(html.includes("6.14.0"));
  assert.ok(html.includes("25.0.0"));
});

test("section picker CSS enforces pointer-events none on connector, single glow, and centered connectors", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(
    css,
    /\.productEcosystemConnector\s*\{[^}]*pointer-events:\s*none/s,
  );
  // Retaining one clear central emphasis on container, no duplicate glow on cardCenter
  assert.match(css, /\.productEcosystemCardServer\s*\{[^}]*drop-shadow/s);
  assert.ok(
    !/\.cardCenter\s*\{[^}]*drop-shadow/s.test(css),
    "duplicate drop-shadow glow must be removed from cardCenter",
  );

  // Desktop and mobile centered connectors
  assert.match(
    css,
    /\.productEcosystemConnector\s*\{[^}]*transform:\s*translateY\(-50%\)/s,
    "desktop connector must be vertically centered",
  );

  const mobileMediaMatch = css.match(
    /@media \(max-width:\s*956px\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(mobileMediaMatch, "mobile media query must exist");
  assert.match(
    mobileMediaMatch[1],
    /\.productEcosystemConnector\s*\{[^}]*transform:\s*translateX\(-50%\)/s,
    "mobile connector must be horizontally centered with transform",
  );
  assert.match(css, /@media \(max-width:\s*956px\)/);
});
