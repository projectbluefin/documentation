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

const deterministicCatalog = {
  streams: {
    stable: {
      id: "stable",
      title: "Bluefin",
      subtitle: "For Everyone",
      description:
        "A modern desktop at the leading edge. Pick this if you're not sure.",
      image: "/img/portal/characters/leaping.webp",
      supportedArch: ["x86"],
      recommended: true,
      available: true,
      versions: {
        base: "Fedora 44",
        gnome: "50.1",
        kernel: "7.0.8-200.fc44",
        mesa: "26.0.8",
        nvidia: "595.71.05",
        flatpak: "1.17.7",
        podman: "5.8.2",
      },
    },
    lts: {
      id: "lts",
      title: "Bluefin LTS",
      subtitle: "For professionals and AI/ML engineers",
      description:
        "A long term support experience on an enterprise-grade foundation.",
      image: "/img/portal/characters/achillobator.webp",
      supportedArch: ["x86", "arm"],
      recommended: false,
      available: true,
      versions: {
        gnome: "49.5",
        kernel: "6.12.0-233.el10",
        hweKernel: "7.0.8-100.fc43",
        flatpak: "1.16.0",
        podman: "5.8.2",
      },
    },
  },
  ecosystem: [
    {
      id: "dakota",
      title: "Dakota",
      description: "The Final Form. Bluefin Perfected.",
      href: "/dakota",
      image: "/img/portal/characters/dakota.webp",
      versionRows: [
        { label: "Kernel", value: "7.0.7" },
        { label: "GNOME", value: "50.2" },
      ],
    },
  ],
  wolvesCampaign: {
    title: "Seven Days to the Wolves",
    href: "https://projectbluefin.io/wolves/",
    image: "/img/portal/wolves/Always%20There.webp",
  },
};

test("image chooser renders initial release step with recommended badge, Flatpak, and Podman chips", () => {
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = deterministicCatalog;

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
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = deterministicCatalog;

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
  const PortalImageChooser = loadModule(chooserPath).default;
  const catalog = deterministicCatalog;

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

test("scoped CSS provides reduced-motion, resilient container rules, and accessible srOnly utility", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  assert.match(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  assert.match(css, /\.releaseBox\s*\{[^}]*min-height/s);
  assert.match(css, /\.srOnly\s*\{[^}]*position:\s*absolute/s);
});

test("image chooser exposes polite live-region step announcement and tabindex=-1 on headings across all steps", () => {
  const chooserModule = loadModule(chooserPath);
  const PortalImageChooser = chooserModule.default;
  const catalog = deterministicCatalog;

  // Release step
  const htmlRelease = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog }),
  );
  assert.match(
    htmlRelease,
    /<div[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*role="status"[^>]*>/,
    "live-region must be present with aria-live=polite and aria-atomic=true",
  );
  assert.ok(
    htmlRelease.includes("Step 1: Choose a Bluefin release."),
    "live-region must announce release step",
  );
  assert.match(
    htmlRelease,
    /<h3[^>]*tabindex="-1"[^>]*class="[^"]*releaseTitle[^"]*"[^>]*>Bluefin<\/h3>/,
    "release title heading must have tabindex=-1 for accessible programmatic focus",
  );

  // Architecture step
  const htmlArch = renderToStaticMarkup(
    React.createElement(PortalImageChooser, {
      catalog,
      initialState: { step: "architecture", selection: { stream: "stable" } },
    }),
  );
  assert.ok(
    htmlArch.includes("Step 2: Choose architecture for Bluefin."),
    "live-region must announce architecture step",
  );
  assert.match(
    htmlArch,
    /<h3[^>]*tabindex="-1"[^>]*>Which architecture/,
    "architecture step heading must have tabindex=-1",
  );

  // GPU step
  const htmlGpu = renderToStaticMarkup(
    React.createElement(PortalImageChooser, {
      catalog,
      initialState: {
        step: "gpu",
        selection: { stream: "stable", arch: "x86" },
      },
    }),
  );
  assert.ok(
    htmlGpu.includes("Step 3: Choose graphics card vendor."),
    "live-region must announce GPU step",
  );
  assert.match(
    htmlGpu,
    /<h3[^>]*tabindex="-1"[^>]*>Who is the vendor/,
    "GPU step heading must have tabindex=-1",
  );

  // Kernel step
  const htmlKernel = renderToStaticMarkup(
    React.createElement(PortalImageChooser, {
      catalog,
      initialState: {
        step: "kernel",
        selection: { stream: "lts", arch: "x86", gpu: "amd" },
      },
    }),
  );
  assert.ok(
    htmlKernel.includes("Step 4: Choose kernel preference for Bluefin LTS."),
    "live-region must announce kernel step",
  );
  assert.match(
    htmlKernel,
    /<h3[^>]*tabindex="-1"[^>]*>What is your priority/,
    "kernel step heading must have tabindex=-1",
  );

  // Download step
  const htmlDownload = renderToStaticMarkup(
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
  assert.ok(
    htmlDownload.includes("Ready to download Bluefin."),
    "live-region must announce download ready",
  );
  assert.match(
    htmlDownload,
    /<h3[^>]*tabindex="-1"[^>]*>Ready to Download!<\/h3>/,
    "download step heading must have tabindex=-1",
  );
  assert.match(
    htmlDownload,
    /<a[^>]*href="https:\/\/github\.com\/orgs\/ublue-os\/packages\?repo_name=bluefin"[^>]*rel="noopener noreferrer"/,
    "registry link must use explicit noopener noreferrer",
  );
});

test("getStepAnnouncement pure helper covers forward, ARM direct-download, and Nvidia bypass states", () => {
  const { getStepAnnouncement } = loadModule(chooserPath);
  const catalog = deterministicCatalog;

  // Step 1: Release
  assert.equal(
    getStepAnnouncement({ step: "release", selection: {} }, catalog),
    "Step 1: Choose a Bluefin release.",
  );

  // Step 2: Architecture
  assert.equal(
    getStepAnnouncement(
      { step: "architecture", selection: { stream: "stable" } },
      catalog,
    ),
    "Step 2: Choose architecture for Bluefin.",
  );

  // Step 3: GPU
  assert.equal(
    getStepAnnouncement(
      { step: "gpu", selection: { stream: "stable", arch: "x86" } },
      catalog,
    ),
    "Step 3: Choose graphics card vendor.",
  );

  // Step 4: Kernel
  assert.equal(
    getStepAnnouncement(
      {
        step: "kernel",
        selection: { stream: "lts", arch: "x86", gpu: "amd" },
      },
      catalog,
    ),
    "Step 4: Choose kernel preference for Bluefin LTS.",
  );

  // Download: regular forward
  assert.equal(
    getStepAnnouncement(
      {
        step: "download",
        selection: {
          stream: "stable",
          arch: "x86",
          gpu: "amd",
          kernel: "regular",
        },
      },
      catalog,
    ),
    "Ready to download Bluefin.",
  );

  // Download: ARM direct-download
  assert.equal(
    getStepAnnouncement(
      {
        step: "download",
        selection: { stream: "lts", arch: "arm", kernel: "regular" },
      },
      catalog,
    ),
    "Ready to download Bluefin LTS.",
  );

  // Download: Nvidia bypass
  assert.equal(
    getStepAnnouncement(
      {
        step: "download",
        selection: {
          stream: "lts",
          arch: "x86",
          gpu: "nvidia",
          kernel: "regular",
        },
      },
      catalog,
    ),
    "Ready to download Bluefin GDX.",
  );
});

test("client-only ref and transition focus effect skips initial mount and avoids browser globals during SSR", () => {
  const source = fs.readFileSync(chooserPath, "utf8");

  // SSR safety: effect and ref imports
  assert.match(source, /useRef,\s*useEffect/);
  assert.match(source, /const\s+isInitialMount\s*=\s*useRef\(true\);/);
  assert.match(source, /const\s+containerRef\s*=\s*useRef/);

  // Mount skipping
  assert.match(
    source,
    /if\s*\(\s*isInitialMount\.current\s*\)\s*\{\s*isInitialMount\.current\s*=\s*false;\s*return;\s*\}/,
    "effect must skip initial mount to avoid stealing page focus on load",
  );

  // Focus management in transition effect
  assert.match(
    source,
    /containerRef\.current\.querySelector<HTMLElement>\(\s*"h3,\s*\[role='heading'\]"/,
    "effect must query step heading in container",
  );
  assert.match(
    source,
    /heading\.focus\(\)/,
    "effect must focus heading on step transition",
  );
  assert.match(
    source,
    /firstControl\?\.focus\(\)/,
    "effect must fall back to first control if no heading exists",
  );
  assert.match(source, /\},\s*\[step\]\);/, "effect must trigger on [step]");
});

test("regression: chooser render tests remain stable when rendered with different version numbers and canonical streams", () => {
  const PortalImageChooser = loadModule(chooserPath).default;
  const driftedCatalog = {
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
          base: "Fedora 99",
          gnome: "99.0",
          kernel: "99.0.0",
          mesa: "99.0.0",
          nvidia: "999.99.99",
          flatpak: "9.9.9",
          podman: "9.9.9",
        },
      },
      lts: {
        id: "lts",
        title: "Bluefin LTS",
        subtitle: "LTS",
        description: "Enterprise foundation.",
        image: "/img/portal/characters/achillobator.webp",
        supportedArch: ["x86", "arm"],
        recommended: false,
        available: true,
        versions: {
          gnome: "88.0",
          kernel: "88.0.0",
          hweKernel: "99.0.0",
          flatpak: "8.8.8",
          podman: "8.8.8",
        },
      },
    },
    ecosystem: [],
    wolvesCampaign: {
      title: "Wolves",
      href: "https://projectbluefin.io/wolves/",
      image: "#",
    },
  };

  const html = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog: driftedCatalog }),
  );

  assert.ok(html.includes("RECOMMENDED"));
  assert.ok(html.includes("Fedora 99"));
  assert.ok(html.includes("99.0.0"));
  assert.ok(html.includes("Flatpak:"));
  assert.ok(html.includes("9.9.9"));
  assert.ok(html.includes("Podman:"));
  assert.ok(html.includes("9.9.9"));

  const primaryHtml = renderToStaticMarkup(
    React.createElement(PortalImageChooser, { catalog: deterministicCatalog }),
  );
  assert.ok(primaryHtml.includes("Fedora 44"));
  assert.ok(primaryHtml.includes("1.17.7"));
  assert.ok(primaryHtml.includes("5.8.2"));
});
