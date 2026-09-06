const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const COMPONENTS_DIR = path.join(__dirname, "..", "src", "components");

function themeComponent(tag) {
  return ({ children, ...props }) => React.createElement(tag, props, children);
}

function loadComponent(tsxPath, overrides = {}) {
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
      if (id in overrides) return overrides[id];
      if (id === "@docusaurus/Link") {
        return {
          __esModule: true,
          default: ({ to, children, ...props }) =>
            React.createElement("a", { href: to, ...props }, children),
        };
      }
      if (id === "@theme/Heading") {
        return { __esModule: true, default: themeComponent("h2") };
      }
      if (id === "@theme/CodeBlock") {
        return { __esModule: true, default: themeComponent("pre") };
      }
      if (id === "@theme/Tabs" || id === "@theme/TabItem") {
        return { __esModule: true, default: themeComponent("div") };
      }
      if (id === "@site/src/components/Sparkline") {
        return { __esModule: true, default: () => null };
      }
      if (id.startsWith("@site/")) {
        return require(path.join(__dirname, "..", id.replace(/^@site\//, "")));
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

function render(component, props) {
  return renderToStaticMarkup(React.createElement(component, props));
}

const imagesModule = loadComponent(
  path.join(COMPONENTS_DIR, "ImagesCatalog.tsx"),
);
const driverVersions = {
  unavailable: true,
  stateReason: "SBOM cache unavailable",
  streams: [],
};
const DriverVersionsCatalog = loadComponent(
  path.join(COMPONENTS_DIR, "DriverVersionsCatalog.tsx"),
  {
    "@site/static/data/driver-versions.json": driverVersions,
    "@site/static/data/stream-pins.json": { streams: {} },
  },
).default;
const ltsCatalog = {
  generatedAt: "2026-09-06T00:00:00.000Z",
  streams: [
    {
      id: "bluefin-lts",
      name: "Bluefin LTS",
      subtitle: "Long-term support stream from projectbluefin/bluefin-lts.",
      command:
        "sudo bootc switch ghcr.io/projectbluefin/bluefin:lts --enforce-container-sigpolicy",
      source: "sbom",
      rowCount: 1,
      latest: {
        stream: "bluefin-lts",
        tag: "lts-20260906",
        title: "lts-20260906",
        releaseUrl: null,
        publishedAt: "2026-09-06T00:00:00.000Z",
        versions: {
          kernel: "6.18.13-200.fc43",
          hweKernel: null,
          mesa: "25.3.6",
          nvidia: "595.71.05",
          gnome: "50.0",
        },
      },
      history: [],
    },
  ],
};

test("ImagesCatalog renders the unavailable reason", () => {
  const html = render(imagesModule.default, {
    initialCatalog: {
      products: [],
      unavailable: true,
      stateReason: "SBOM cache contains no release data",
    },
  });

  assert.ok(html.includes("Image catalog unavailable"));
  assert.ok(html.includes("SBOM cache contains no release data"));
});

test("DriverVersionsCatalog renders the unavailable reason", () => {
  const html = render(DriverVersionsCatalog, {
    streamId: "bluefin-lts",
    catalogOverride: driverVersions,
  });

  assert.ok(html.includes("Driver versions unavailable"));
  assert.ok(html.includes("SBOM cache unavailable"));
});

test("DriverVersionsCatalog uses the Bluefin LTS NVIDIA label", () => {
  const html = render(DriverVersionsCatalog, {
    streamId: "bluefin-lts",
    catalogOverride: ltsCatalog,
  });

  assert.ok(html.includes("Bluefin LTS"));
  assert.ok(html.includes("NVIDIA"));
  assert.ok(!html.includes("NVIDIA (GDX)"));
});

test("StreamVersionPills centralizes optional NVIDIA and package pills", () => {
  const html = render(imagesModule.StreamVersionPills, {
    versions: {
      gnome: "50.0",
      kernel: "6.18.13",
      nvidia: "595.71.05",
      flatpak: "6.0",
      mesa: "25.3.6",
      podman: "5.8.2",
    },
    showNvidia: true,
  });

  assert.ok(html.includes("GNOME"));
  assert.ok(html.includes("Linux"));
  assert.ok(html.includes("595.71.05"));
  assert.ok(html.includes("Flatpak"));
  assert.ok(html.includes("Mesa"));
  assert.ok(html.includes("Podman"));

  const withoutNvidia = render(imagesModule.StreamVersionPills, {
    versions: { gnome: "50.0", kernel: "6.18.13" },
    showNvidia: false,
  });
  assert.ok(!withoutNvidia.includes("NVIDIA"));
});

test("DriverVersionsCatalog guards against empty releases and selects newest valid row", () => {
  const nullLatestCatalog = {
    generatedAt: "2026-09-06T00:00:00.000Z",
    streams: [
      {
        id: "bluefin-stable",
        name: "Bluefin",
        subtitle: "Current stable stream",
        command: "sudo bootc switch ghcr.io/projectbluefin/bluefin:stable",
        source: "sbom",
        rowCount: 2,
        latest: {
          stream: "bluefin-stable",
          tag: "stable-20260606",
          title: "stable-20260606",
          releaseUrl: null,
          publishedAt: "2026-06-06T00:00:00.000Z",
          versions: {
            kernel: null,
            hweKernel: null,
            mesa: null,
            nvidia: null,
            gnome: null,
          },
        },
        history: [
          {
            stream: "bluefin-stable",
            tag: "stable-20260606",
            title: "stable-20260606",
            releaseUrl: null,
            publishedAt: "2026-06-06T00:00:00.000Z",
            versions: {
              kernel: null,
              hweKernel: null,
              mesa: null,
              nvidia: null,
              gnome: null,
            },
          },
          {
            stream: "bluefin-stable",
            tag: "stable-20260531",
            title: "stable-20260531",
            releaseUrl: null,
            publishedAt: "2026-05-31T00:00:00.000Z",
            versions: {
              kernel: "7.0.8-200.fc44",
              hweKernel: null,
              mesa: "26.0.8",
              nvidia: null,
              gnome: "50.1",
            },
          },
        ],
      },
    ],
  };

  const html = render(DriverVersionsCatalog, {
    streamId: "bluefin-stable",
    catalogOverride: nullLatestCatalog,
  });

  assert.ok(html.includes("stable-20260531"));
  assert.ok(html.includes("7.0.8"));
  assert.ok(!html.includes("stable-20260606"));
});

test("DriverVersionsCatalog renders empty card without archiveRail for empty streams", () => {
  const emptyCatalog = {
    generatedAt: "2026-09-06T00:00:00.000Z",
    streams: [
      {
        id: "dakota-latest",
        name: "Dakota",
        subtitle: "GNOME OS stream",
        command: "sudo bootc switch ghcr.io/projectbluefin/dakota:latest",
        source: "sbom",
        rowCount: 0,
        latest: null,
        history: [],
      },
    ],
  };

  const html = render(DriverVersionsCatalog, {
    streamId: "dakota-latest",
    catalogOverride: emptyCatalog,
  });

  assert.ok(
    html.includes("No driver version data is published for this stream yet."),
  );
  assert.ok(!html.includes("archiveRail"));

  // Also test when streamId is completely missing from catalog
  const missingHtml = render(DriverVersionsCatalog, {
    streamId: "utah-testing",
    catalogOverride: emptyCatalog,
  });
  assert.ok(
    missingHtml.includes(
      "No driver version data is published for this stream yet.",
    ),
  );
  assert.ok(!missingHtml.includes("archiveRail"));
});

test("DriverVersionsCatalog showRebootStep prop controls reboot banner", () => {
  const withReboot = render(DriverVersionsCatalog, {
    streamId: "bluefin-lts",
    catalogOverride: ltsCatalog,
    showRebootStep: true,
  });
  assert.ok(withReboot.includes("Final Step: Reboot"));

  const withoutReboot = render(DriverVersionsCatalog, {
    streamId: "bluefin-lts",
    catalogOverride: ltsCatalog,
    showRebootStep: false,
  });
  assert.ok(!withoutReboot.includes("Final Step: Reboot"));
});
