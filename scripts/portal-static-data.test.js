const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadTsModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    require,
    mod,
    mod.exports,
  );
  return mod.exports;
}

const docsRoot = path.join(__dirname, "..");
const websiteRoot = "/home/jorge/src/website";
const staticDataPath = path.join(
  docsRoot,
  "src",
  "components",
  "portal",
  "portalStaticData.ts",
);

test("static assets exist and are byte-identical to website source", () => {
  const copiedAssets = [
    "img/bazaar.svg",
    "icons/docs.svg",
    "brands/alumni/anchore.svg",
    "brands/alumni/aws.svg",
    "brands/alumni/canonical.svg",
    "brands/alumni/chainguard.webp",
    "brands/alumni/cncf.svg",
    "brands/alumni/intel.svg",
    "brands/alumni/microsoft.svg",
    "brands/alumni/redhat.svg",
    "brands/alumni/vmware.svg",
    "brands/sponsors/cloudflare.svg",
    "brands/bootc.svg",
    "brands/podman.svg",
    "brands/docker.svg",
    "brands/universal-blue.svg",
  ];

  for (const relativePath of copiedAssets) {
    const targetFile = path.join(docsRoot, "static", relativePath);

    assert.ok(
      fs.existsSync(targetFile),
      `Target file must exist: ${targetFile}`,
    );

    if (fs.existsSync(websiteRoot)) {
      const sourceFile = path.join(websiteRoot, "public", relativePath);
      assert.ok(
        fs.existsSync(sourceFile),
        `Source file must exist: ${sourceFile}`,
      );

      const targetBytes = fs.readFileSync(targetFile);
      const sourceBytes = fs.readFileSync(sourceFile);
      assert.deepEqual(
        targetBytes,
        sourceBytes,
        `Target file ${relativePath} must be byte-identical to source`,
      );
    }
  }

  // Verify documentation bazaar screenshot is preserved
  const bazaarPng = path.join(docsRoot, "static", "img", "bazaar.png");
  assert.ok(fs.existsSync(bazaarPng), "static/img/bazaar.png must be present");
});

test("portal static data exposes exact metadata contracts", () => {
  assert.ok(fs.existsSync(staticDataPath), "portalStaticData.ts must exist");
  const data = loadTsModule(staticDataPath);

  // Video
  assert.equal(data.VIDEO_METADATA.title, "Bluefin Introduction");
  assert.equal(
    data.VIDEO_METADATA.embedUrl,
    "https://www.youtube.com/embed/Nz-yyDwTfRM?autoplay=1",
  );
  assert.equal(
    data.VIDEO_METADATA.posterUrl,
    "https://img.youtube.com/vi/Nz-yyDwTfRM/hqdefault.jpg",
  );
  assert.equal(data.VIDEO_METADATA.posterAlt, "Bluefin Linux introduction");

  // Bazaar
  assert.equal(data.BAZAAR_METADATA.tag, "Run your favorite");
  assert.equal(data.BAZAAR_METADATA.title, "Applications");
  assert.equal(data.BAZAAR_METADATA.flathubUrl, "https://flathub.org/");
  assert.equal(data.BAZAAR_METADATA.flathubLabel, "View apps on Flathub");
  assert.equal(data.BAZAAR_METADATA.screenshotSrc, "/img/bazaar.png");
  assert.equal(data.BAZAAR_METADATA.iconSrc, "/img/bazaar.svg");

  // Community
  assert.equal(data.COMMUNITY_METADATA.tag, "Our");
  assert.equal(data.COMMUNITY_METADATA.title, "Community");
  assert.equal(data.COMMUNITY_METADATA.docsCard.title, "Documentation");
  assert.equal(data.COMMUNITY_METADATA.docsCard.iconSrc, "/icons/docs.svg");
  assert.equal(
    data.COMMUNITY_METADATA.docsCard.docsUrl,
    "https://docs.projectbluefin.io",
  );
  assert.equal(
    data.COMMUNITY_METADATA.docsCard.discordUrl,
    "https://discord.gg/WYCpGEM4sM",
  );
  assert.equal(
    data.COMMUNITY_METADATA.docsCard.discussionsUrl,
    "https://github.com/ublue-os/bluefin/discussions",
  );

  // Alumni
  assert.equal(data.ALUMNI_COMPANIES.length, 9);
  assert.deepEqual(
    data.ALUMNI_COMPANIES.map((b) => b.altText),
    [
      "Anchore",
      "Amazon Web Services (AWS)",
      "Canonical",
      "Chainguard",
      "Cloud Native Computing Foundation (CNCF)",
      "Intel",
      "Microsoft",
      "Red Hat",
      "VMware",
    ],
  );

  // Sponsors
  assert.equal(data.SPONSORS.length, 1);
  assert.equal(data.SPONSORS[0].altText, "Cloudflare");
  assert.equal(data.SPONSORS[0].imageUrl, "/brands/sponsors/cloudflare.svg");

  // Powered By
  assert.equal(data.POWERED_BY_BRANDS.length, 3);
  assert.deepEqual(
    data.POWERED_BY_BRANDS.map((b) => b.altText),
    ["bootc", "Podman", "Docker"],
  );

  // Universal Blue
  assert.equal(data.UNIVERSAL_BLUE_BRAND.altText, "Universal Blue Logo");
  assert.equal(
    data.UNIVERSAL_BLUE_BRAND.imageUrl,
    "/brands/universal-blue.svg",
  );

  // Copyright
  assert.equal(
    data.getCopyrightText(2026),
    "Copyright 2026 © Project Bluefin and Universal Blue",
  );
});
