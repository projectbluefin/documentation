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
        "sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy",
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

test("ImagesCatalog renders awaiting initial release for unpublished streams and hides commands", () => {
  const html = render(imagesModule.default, {
    initialCatalog: {
      products: [
        {
          id: "projectbluefin-utah",
          name: "Project Bluefin Utah",
          org: "projectbluefin",
          package: "utah",
          artwork: "bluefin",
          streams: [
            {
              label: "TESTING",
              tag: "testing",
              command: null,
            },
          ],
          testingStreams: [],
          security: {
            cosignKeyUrl: null,
            verifyCommand: null,
            attestCommand: null,
            hasAttestation: false,
            sbomCommand: null,
          },
        },
      ],
      unavailable: false,
    },
  });

  assert.ok(
    html.includes(
      "Awaiting initial release: <code>testing</code> image is not yet published.",
    ),
  );
  assert.ok(
    html.includes(
      "Awaiting initial release: verification commands will be available once the image is published.",
    ),
  );
  assert.ok(
    html.includes(
      "Awaiting initial release: attestation verification will be available once the image is published.",
    ),
  );
  assert.ok(!html.includes("sudo bootc switch ghcr.io/projectbluefin/utah"));
  assert.ok(!html.includes("cosign verify"));
});

test("ImagesCatalog does not call published images unreleased when security data is missing", () => {
  const html = render(imagesModule.default, {
    initialCatalog: {
      products: [
        {
          id: "ublue-bluefin",
          name: "Bluefin",
          org: "ublue-os",
          summary: "Bluefin Classic",
          artwork: "bluefin",
          packagePageUrl:
            "https://github.com/orgs/ublue-os/packages/container/package/bluefin",
          streams: [
            {
              label: "Stable",
              tag: "stable",
              command: "sudo bootc switch ghcr.io/ublue-os/bluefin:stable",
              versions: null,
            },
          ],
          testingStreams: [],
          metadata: null,
          metadataSource: "unavailable",
          security: null,
        },
      ],
    },
  });
  assert.ok(html.includes("Verification command unavailable"));
  assert.ok(html.includes("GNOME</strong> Unavailable"));
  assert.ok(html.includes("Linux</strong> Unavailable"));
  assert.ok(!html.includes("Awaiting initial release"));
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

test("ImagesCatalog NVIDIA mode shows companion SBOM versions, not base-image versions", () => {
  const product = {
    id: "ublue-bluefin",
    name: "Bluefin",
    org: "ublue-os",
    summary: "Bluefin Classic",
    artwork: "bluefin",
    packagePageUrl:
      "https://github.com/orgs/ublue-os/packages/container/package/bluefin",
    streams: [
      {
        label: "Stable",
        tag: "stable",
        command: "sudo bootc switch ghcr.io/ublue-os/bluefin:stable",
        nvidiaCommand:
          "sudo bootc switch ghcr.io/ublue-os/bluefin-nvidia-open:stable",
        versions: { kernel: "6.18.1", nvidia: "BASE-DRIVER" },
        nvidiaVersions: { kernel: "6.18.2", nvidia: "COMPANION-DRIVER" },
      },
    ],
    testingStreams: [],
    metadata: null,
    metadataSource: "unavailable",
  };
  let stateCall = 0;
  const nvidiaImages = loadComponent(
    path.join(COMPONENTS_DIR, "ImagesCatalog.tsx"),
    {
      react: {
        ...React,
        useState(initial) {
          stateCall += 1;
          return [
            stateCall === 2 ? { "ublue-bluefin": true } : initial,
            () => {},
          ];
        },
      },
    },
  ).default;
  const html = render(nvidiaImages, {
    initialCatalog: { products: [product] },
  });
  assert.ok(html.includes("COMPANION-DRIVER"));
  assert.ok(!html.includes("BASE-DRIVER"));
  assert.ok(html.includes("ghcr.io/ublue-os/bluefin-nvidia-open:stable"));

  stateCall = 0;
  const withoutCompanion = render(nvidiaImages, {
    initialCatalog: {
      products: [
        {
          ...product,
          streams: [{ ...product.streams[0], nvidiaVersions: null }],
        },
      ],
    },
  });
  assert.ok(withoutCompanion.includes("NVIDIA</strong> Unavailable"));
  assert.ok(!withoutCompanion.includes("BASE-DRIVER"));
});

test("DriverVersionsCatalog guards against empty releases and selects newest valid row", () => {
  const nullLatestCatalog = {
    generatedAt: "2026-09-06T00:00:00.000Z",
    streams: [
      {
        id: "bluefin-stable",
        name: "Bluefin",
        subtitle: "Current stable stream",
        command: "sudo bootc switch ghcr.io/ublue-os/bluefin:stable",
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
        id: "dakota-stable",
        name: "Dakota",
        subtitle: "GNOME OS stream",
        command: "sudo bootc switch ghcr.io/projectbluefin/dakota:stable",
        source: "sbom",
        rowCount: 0,
        latest: null,
        history: [],
      },
    ],
  };

  const html = render(DriverVersionsCatalog, {
    streamId: "dakota-stable",
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

test("DriverVersionsCatalog uses published image refs and never invents archival tags", () => {
  const catalog = {
    streams: [
      {
        id: "bluefin-stable",
        name: "Bluefin Classic",
        source: "sbom",
        rowCount: 1,
        imageRef: "ghcr.io/ublue-os/bluefin:stable",
        latest: {
          stream: "bluefin-stable",
          tag: "stable-20260906",
          imageRef: "ghcr.io/ublue-os/bluefin:stable-20260906",
          versions: { kernel: "6.18.13-200.fc43" },
        },
        history: [],
      },
      {
        id: "bluefin-lts",
        name: "Bluefin LTS",
        source: "sbom",
        rowCount: 1,
        imageRef: "ghcr.io/projectbluefin/bluefin-lts:stable",
        latest: {
          stream: "bluefin-lts",
          tag: "lts-20260906",
          imageRef: "ghcr.io/projectbluefin/bluefin-lts:lts-20260906",
          versions: { kernel: "6.18.13-200.fc43" },
        },
        history: [],
      },
      {
        id: "dakota-stable",
        name: "Dakota Stable",
        source: "sbom",
        rowCount: 2,
        imageRef: "ghcr.io/projectbluefin/dakota:stable",
        latest: {
          stream: "dakota-stable",
          tag: "dakota-stable-20260906",
          imageRef: null,
          versions: { kernel: "6.18.13" },
        },
        history: [
          {
            stream: "dakota-stable",
            tag: "dakota-stable-20260906",
            imageRef: null,
            versions: { kernel: "6.18.13" },
          },
          {
            stream: "dakota-stable",
            tag: "dakota-stable-20260905",
            imageRef: null,
            versions: { kernel: "6.18.12" },
          },
        ],
      },
    ],
  };
  const classic = render(DriverVersionsCatalog, {
    streamId: "bluefin-stable",
    catalogOverride: catalog,
  });
  assert.ok(classic.includes("ghcr.io/ublue-os/bluefin:stable-20260906"));
  assert.ok(
    !classic.includes("ghcr.io/projectbluefin/bluefin:stable-20260906"),
  );

  const lts = render(DriverVersionsCatalog, {
    streamId: "bluefin-lts",
    catalogOverride: catalog,
  });
  assert.ok(lts.includes("ghcr.io/projectbluefin/bluefin-lts:lts-20260906"));

  const dakota = render(DriverVersionsCatalog, {
    streamId: "dakota-stable",
    catalogOverride: catalog,
  });
  assert.ok(dakota.includes("ghcr.io/projectbluefin/dakota:stable"));
  assert.ok(
    !dakota.includes("ghcr.io/projectbluefin/dakota:dakota-stable-20260905"),
  );
  assert.ok(
    !dakota.includes("ghcr.io/projectbluefin/dakota:dakota-stable-20260906"),
  );
  assert.ok(
    dakota.includes("No published image for this historical SBOM snapshot"),
  );

  catalog.streams[2].latest = {
    stream: "dakota-stable",
    tag: "dakota-stable-20260907",
    imageRef: null,
    versions: { kernel: null },
  };
  const stale = render(DriverVersionsCatalog, {
    streamId: "dakota-stable",
    catalogOverride: catalog,
  });
  assert.ok(!stale.includes("ghcr.io/projectbluefin/dakota:stable"));
});
