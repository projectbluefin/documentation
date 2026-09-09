const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.join(__dirname, "..");

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
  assert.ok(html.includes('width="1270"'));
  assert.ok(html.includes('height="950"'));
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
  assert.ok(html.includes('title="View Documentation"'));
  assert.ok(html.includes(">Documentation<"));
  assert.ok(
    html.includes(
      "Looking for support? View our documentation site for up-to-date guides on installation, general use, and troubleshooting.",
    ),
  );
  assert.ok(html.includes('href="https://docs.projectbluefin.io"'));
  assert.ok(html.includes("View Documentation"));
  assert.ok(html.includes('href="https://discord.gg/XUC8cANVHy"'));
  assert.ok(html.includes("Join our Discord"));
  assert.ok(
    html.includes(
      'href="https://github.com/projectbluefin/bluefin/discussions"',
    ),
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

test("PortalContributors statically renders contributor cards, CTA buttons, and activity links", () => {
  const componentPath = path.join(portalDir, "PortalContributors.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalContributors.tsx must exist");

  const PortalContributors = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalContributors));

  assert.ok(html.includes('id="contributors"'));
  assert.ok(html.includes(">Our Contributors<"));
  assert.ok(html.includes(">Contribute<"));
  assert.ok(html.includes('href="https://github.com/ublue-os/bluefin"'));
  assert.ok(html.includes("Visit our GitHub"));
  assert.ok(html.includes('href="/donations"'));
  assert.ok(html.includes(">Donate<"));
  assert.ok(html.includes("Contributors active since"));
  assert.ok(html.includes('href="https://github.com/ublue-os/bluefin/pulse"'));
  assert.ok(html.includes("View full repository activity on GitHub →"));

  // Check no browser globals
  const source = fs.readFileSync(componentPath, "utf8");
  assert.ok(!source.includes("window."));
  assert.ok(!source.includes("document."));
  assert.ok(!source.includes("useEffect"));
});

test("PortalContributors renders graceful unavailable fallback when data is unavailable or empty", () => {
  const componentPath = path.join(portalDir, "PortalContributors.tsx");
  const PortalContributors = loadModule(componentPath).default;

  const htmlUnavailable = renderToStaticMarkup(
    React.createElement(PortalContributors, {
      data: { unavailable: true, contributors: [] },
    }),
  );
  assert.ok(
    htmlUnavailable.includes("GitHub activity is unavailable right now."),
  );
  assert.ok(htmlUnavailable.includes("View activity on GitHub"));
  assert.ok(
    htmlUnavailable.includes(
      'href="https://github.com/ublue-os/bluefin/pulse"',
    ),
  );

  const htmlEmpty = renderToStaticMarkup(
    React.createElement(PortalContributors, {
      data: { unavailable: false, contributors: [] },
    }),
  );
  assert.ok(htmlEmpty.includes("GitHub activity is unavailable right now."));
});

test("PortalFooter statically renders alumni, sponsors, powered-by, credits, and copyright", () => {
  const componentPath = path.join(portalDir, "PortalFooter.tsx");
  assert.ok(fs.existsSync(componentPath), "PortalFooter.tsx must exist");

  const PortalFooter = loadModule(componentPath).default;
  const html = renderToStaticMarkup(React.createElement(PortalFooter));

  // Footer and Sections
  assert.ok(html.includes('id="footer"'));
  assert.ok(html.includes('id="alumni"'));
  assert.ok(html.includes("Featuring alumni from companies like"));
  assert.ok(html.includes('id="sponsors"'));
  assert.ok(html.includes("Our sponsors"));

  // Alumni logos (9 companies)
  assert.ok(html.includes('src="/brands/alumni/anchore.svg"'));
  assert.ok(html.includes('alt="Anchore"'));
  assert.ok(html.includes('src="/brands/alumni/aws.svg"'));
  assert.ok(html.includes('src="/brands/alumni/canonical.svg"'));
  assert.ok(html.includes('src="/brands/alumni/chainguard.webp"'));
  assert.ok(html.includes('src="/brands/alumni/cncf.svg"'));
  assert.ok(html.includes('src="/brands/alumni/intel.svg"'));
  assert.ok(html.includes('src="/brands/alumni/microsoft.svg"'));
  assert.ok(html.includes('src="/brands/alumni/redhat.svg"'));
  assert.ok(html.includes('src="/brands/alumni/vmware.svg"'));

  // Sponsor logo
  assert.ok(html.includes('src="/brands/sponsors/cloudflare.svg"'));
  assert.ok(html.includes('alt="Cloudflare"'));

  // Powered By
  assert.ok(html.includes(">Powered By<"));
  assert.ok(html.includes('src="/brands/bootc.svg"'));
  assert.ok(html.includes('src="/brands/podman.svg"'));
  assert.ok(html.includes('src="/brands/docker.svg"'));

  // Built With / Universal Blue
  assert.ok(html.includes("Project Bluefin is Built With"));
  assert.ok(html.includes('href="https://universal-blue.org"'));
  assert.ok(html.includes('src="/brands/universal-blue.svg"'));
  assert.match(
    html,
    /<img[^>]*src="\/brands\/universal-blue\.svg"[^>]*loading="lazy"/,
  );
  assert.ok(html.includes("Welcome to indie Cloud Native."));

  // Social
  assert.ok(html.includes('href="https://github.com/projectbluefin/bluefin"'));
  assert.ok(html.includes("GitHub"));

  // Credits
  assert.ok(html.includes("All artwork built by humans."));
  assert.ok(html.includes('href="https://dolansky.dev/"'));
  assert.ok(html.includes("Jan Dolanský"));
  assert.ok(html.includes('href="https://kylegospodneti.ch/"'));
  assert.ok(html.includes("Kyle Gospodnetich"));
  assert.ok(html.includes("Jacob Schnurr"));
  assert.ok(html.includes("Delphic Melody"));
  assert.ok(html.includes("DragonsofWales"));
  assert.ok(html.includes("Tulip Blossom"));
  assert.ok(html.includes("Dustin Kirkland"));
  assert.ok(html.includes("Wayne Witzel"));
  assert.ok(html.includes("Marco Ceppi"));

  // Copyright with deterministic year
  const currentYear = new Date().getUTCFullYear();
  assert.ok(
    html.includes(
      `Copyright ${currentYear} © Project Bluefin and Universal Blue`,
    ),
  );

  // Check no browser globals
  const source = fs.readFileSync(componentPath, "utf8");
  assert.ok(!source.includes("window."));
  assert.ok(!source.includes("document."));
  assert.ok(!source.includes("useEffect"));
});

test("Bazaar, Community CTAs, and Footer links maintain accessible contrast and visible focus rings", () => {
  const bazaarCss = fs.readFileSync(
    path.join(portalDir, "PortalBazaar.module.css"),
    "utf8",
  );
  const communityCss = fs.readFileSync(
    path.join(portalDir, "PortalCommunity.module.css"),
    "utf8",
  );
  const footerCss = fs.readFileSync(
    path.join(portalDir, "PortalFooter.module.css"),
    "utf8",
  );
  const contributorsCss = fs.readFileSync(
    path.join(portalDir, "PortalContributors.module.css"),
    "utf8",
  );

  // Inaccessible #4285f4 must not be used as button background or footer links
  assert.ok(!bazaarCss.includes("#4285f4"));
  assert.ok(!communityCss.includes("#4285f4"));
  assert.ok(!footerCss.includes("#4285f4"));
  assert.ok(!contributorsCss.includes("#4285f4"));

  // Accessible normal background fallback (#0056b3 has > 7:1 contrast on white)
  assert.match(bazaarCss, /\.flathubButton\s*\{[^}]*#0056b3/);
  assert.match(communityCss, /\.communityButton\s*\{[^}]*#0056b3/);
  assert.match(contributorsCss, /\.contributorsButton\s*\{[^}]*#0056b3/);

  // Explicit visible focus rings
  assert.match(
    bazaarCss,
    /\.flathubButton:focus-visible\s*\{[^}]*outline:\s*3px solid/,
  );
  assert.match(
    communityCss,
    /\.communityButton:focus-visible\s*\{[^}]*outline:\s*3px solid/,
  );
  assert.match(
    contributorsCss,
    /\.contributorsButton:focus-visible\s*\{[^}]*outline:\s*3px solid/,
  );

  // Accessible hover and focus state background
  assert.match(bazaarCss, /\.flathubButton:hover[^}]*#004494/);
  assert.match(communityCss, /\.communityButton:hover[^}]*#004494/);
  assert.match(contributorsCss, /\.contributorsButton:hover[^}]*#004494/);

  // Footer links use scoped token variable with fallback
  assert.match(
    footerCss,
    /\.rightCol a\s*\{[^}]*var\(--portal-blue-light,\s*#8a97f7\)/,
  );
  assert.match(
    footerCss,
    /\.socialLinks li a:hover\s*\{[^}]*var\(--portal-blue-light,\s*#8a97f7\)/,
  );
});
