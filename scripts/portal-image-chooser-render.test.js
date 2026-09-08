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

const chooserPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalImageChooser.tsx",
);
const adapterPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "portalStreamAdapter.ts",
);
const cssPath = path.join(
  root,
  "src",
  "components",
  "portal",
  "PortalSectionPicker.module.css",
);

const imagesData = JSON.parse(
  fs.readFileSync(path.join(root, "static", "data", "images.json"), "utf8"),
);
const driverVersionsData = JSON.parse(
  fs.readFileSync(
    path.join(root, "static", "data", "driver-versions.json"),
    "utf8",
  ),
);

test("image chooser renders initial release step with recommended badge, Flatpak, and Podman chips", () => {
  const { adaptStreams } = loadModule(adapterPath);
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = adaptStreams(imagesData, driverVersionsData);

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog }),
  );

  assert.ok(html.includes("RECOMMENDED"));
  assert.ok(html.includes("Bluefin"));
  assert.ok(html.includes("Bluefin LTS"));
  assert.ok(html.includes("Fedora 44"));
  assert.ok(html.includes("7.0.8-200.fc44"));
  assert.ok(html.includes("6.12.0-233.el10"));

  // Flatpak and Podman chips verification
  assert.ok(html.includes("Flatpak:"));
  assert.ok(html.includes("1.17.7"));
  assert.ok(html.includes("Podman:"));
  assert.ok(html.includes("5.8.2"));
});

test("image chooser omits Flatpak and Podman chips when missing from version details", () => {
  const PortalImageChooser = loadModule(chooserPath).default;
  const minimalCatalog = {
    streams: {
      stable: {
        id: "stable",
        title: "Bluefin",
        subtitle: "For Everyone",
        description: "Leading edge.",
        image: "/img/portal/characters/leaping.webp",
        supportedArch: ["x86"],
        recommended: true,
        available: true,
        versions: {
          gnome: "50.1",
        },
      },
      lts: {
        id: "lts",
        title: "Bluefin LTS",
        subtitle: "LTS",
        description: "Enterprise foundation.",
        image: "/img/portal/characters/achillobator.webp",
        supportedArch: ["x86"],
        recommended: false,
        available: true,
        versions: {},
      },
    },
    ecosystem: [],
    wolvesCampaign: { title: "Wolves", href: "#", image: "#" },
  };

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog: minimalCatalog }),
  );

  assert.ok(!html.includes("Flatpak:"));
  assert.ok(!html.includes("Podman:"));
});

test("image chooser renders disabled release with unavailable badge and aria-disabled", () => {
  const PortalImageChooser = loadModule(chooserPath).default;
  const unavailableCatalog = {
    streams: {
      stable: {
        id: "stable",
        title: "Bluefin",
        subtitle: "For Everyone",
        description: "Leading edge.",
        image: "/img/portal/characters/leaping.webp",
        supportedArch: ["x86"],
        recommended: true,
        available: false,
        unavailableReason: "Maintenance mode",
        versions: {},
      },
      lts: {
        id: "lts",
        title: "Bluefin LTS",
        subtitle: "LTS",
        description: "Enterprise foundation.",
        image: "/img/portal/characters/achillobator.webp",
        supportedArch: ["x86"],
        recommended: false,
        available: true,
        versions: {},
      },
    },
    ecosystem: [],
    wolvesCampaign: { title: "Wolves", href: "#", image: "#" },
  };

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog: unavailableCatalog }),
  );

  assert.ok(html.includes("Maintenance mode"));
  assert.match(html, /aria-disabled="true"/);
});

test("image chooser renders architecture step with back button and options", () => {
  const { adaptStreams } = loadModule(adapterPath);
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = adaptStreams(imagesData, driverVersionsData);

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, {
      catalog,
      initialState: {
        step: "architecture",
        selection: { stream: "stable" },
      },
    }),
  );

  assert.ok(html.includes("Back to releases"));
  assert.ok(html.includes("Which architecture will you install Bluefin on?"));
  assert.ok(html.includes("x86_64 (Standard for most computers)"));
  assert.ok(html.includes("ARM64"));
});

test("image chooser renders download step with exact ISO and checksum URLs and doc links", () => {
  const { adaptStreams } = loadModule(adapterPath);
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = adaptStreams(imagesData, driverVersionsData);

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, {
      catalog,
      initialState: {
        step: "download",
        selection: {
          stream: "stable",
          arch: "x86",
          gpu: "amd",
          kernel: "regular",
        },
      },
    }),
  );

  assert.ok(html.includes("Ready to Download!"));
  assert.ok(html.includes("bluefin-stable-x86_64.iso"));
  assert.ok(
    html.includes(
      "https://download.projectbluefin.io/bluefin-stable-x86_64.iso",
    ),
  );
  assert.ok(
    html.includes(
      "https://download.projectbluefin.io/bluefin-stable-x86_64.iso-CHECKSUM",
    ),
  );
  assert.ok(
    html.includes(
      "https://github.com/orgs/ublue-os/packages?repo_name=bluefin",
    ),
  );
  assert.ok(html.includes("https://docs.projectbluefin.io/"));
  assert.ok(html.includes("https://docs.projectbluefin.io/downloads/"));
  assert.ok(
    html.includes("https://docs.projectbluefin.io/installation#secure-boot"),
  );
  assert.ok(html.includes("universalblue"));
  assert.ok(html.includes("Choose a different release"));
});

test("scoped CSS provides reduced-motion and resilient container rules", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  assert.match(css, /\.releaseBox\s*\{[^}]*min-height/s);
});
