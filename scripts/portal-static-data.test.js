const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

const EXPECTED_ASSET_SHA256 = {
  "img/bazaar.svg":
    "185aee876fc16e749a7dd0b9b435d0cd9146c0426133312f3aa92ecd15d106cb",
  "icons/docs.svg":
    "fb3024904bcc938699a752caa0da94e847e307412147c78d2e40a17c7c0f2b1b",
  "brands/alumni/anchore.svg":
    "44ec2abc16967362abae6a0835f2ae5822906671909ea4ebff0fd94df6ce8925",
  "brands/alumni/aws.svg":
    "29933679fc1b15efd8817893d6346ea14ca1cc93580b2b274c6a2e6d2b42b815",
  "brands/alumni/canonical.svg":
    "f65021d4f0636ce917aef90f6105338322a765df34fd3419eb988e756aa95874",
  "brands/alumni/chainguard.webp":
    "07a38e3762687175568afc2890396e10ab89be8a0c9a2b1d0867ea42da35819e",
  "brands/alumni/cncf.svg":
    "967cee2327f2262a56d69f9f686745c6480b82cfd4ca7189e2c268d5e83ac9f8",
  "brands/alumni/intel.svg":
    "f756cc635cbf3a15ed80adc6d9e4bba114d7993e3d1fd536e7043b0bbc71f81e",
  "brands/alumni/microsoft.svg":
    "39c37b022a810fd604425a253459f43a235a636a3dd6a002115df717b41b02db",
  "brands/alumni/redhat.svg":
    "abf2eda6f61b26159e3bb9ae735015627e2ebb9fcf6a2c6f64cf4aa1535819a8",
  "brands/alumni/vmware.svg":
    "e3a1648aa53dfe69304ca7bbf4aa54910377106dc7eb7cd0e9e188d57acca37b",
  "brands/sponsors/cloudflare.svg":
    "7f352bc63cd2cba3ea4ed4e04ce55dae7d57538888a71ce509458aef31244dc3",
  "brands/bootc.svg":
    "6e7356932402a670bb0a52ae5429000393e5bc4d9c5c7f790d9d841e63456580",
  "brands/podman.svg":
    "0888833ae50088a1c18ba938a71087721e26e513ac823d94be25364075f64c51",
  "brands/docker.svg":
    "9a3dc62404129d731a24ead52df09042a01cb8d3ad2745790329e73347421186",
  "brands/universal-blue.svg":
    "da97ad81b874d9f977a074ab883752132323c618b14da6987a76f847d71de6b9",
};

test("static assets exist and match checked-in SHA-256 hashes", () => {
  for (const [relativePath, expectedHash] of Object.entries(
    EXPECTED_ASSET_SHA256,
  )) {
    const targetFile = path.join(docsRoot, "static", relativePath);

    assert.ok(
      fs.existsSync(targetFile),
      `Target file must exist: ${targetFile}`,
    );

    const targetBytes = fs.readFileSync(targetFile);
    const targetHash = crypto
      .createHash("sha256")
      .update(targetBytes)
      .digest("hex");
    assert.equal(
      targetHash,
      expectedHash,
      `Target file ${relativePath} must match expected SHA-256 hash`,
    );

    if (fs.existsSync(websiteRoot)) {
      const sourceFile = path.join(websiteRoot, "public", relativePath);
      if (fs.existsSync(sourceFile)) {
        const sourceBytes = fs.readFileSync(sourceFile);
        assert.deepEqual(
          targetBytes,
          sourceBytes,
          `Target file ${relativePath} must be byte-identical to source`,
        );
      }
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

  // News
  assert.equal(data.NEWS_METADATA.tag, "Latest");
  assert.equal(data.NEWS_METADATA.title, "News");
  assert.equal(data.NEWS_METADATA.feedUrl, "/blog/atom.xml");
  assert.equal(data.NEWS_METADATA.viewAllUrl, "/blog");
  assert.equal(
    data.NEWS_METADATA.viewAllLabel,
    "View all posts on the official blog",
  );
  assert.equal(data.FALLBACK_NEWS_POSTS.length, 3);
  assert.equal(
    data.FALLBACK_NEWS_POSTS[0].title,
    "Introducing Project Bluefin",
  );

  // Copyright
  assert.equal(
    data.getCopyrightText(2026),
    "Copyright 2026 © Project Bluefin and Universal Blue",
  );
});
