const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");

test("brand asset files exist and meet SVG requirements", () => {
  const assets = [
    "static/img/bluefin-wordmark.svg",
    "static/img/bluefin-wordmark-dark.svg",
    "static/img/bluefin-wordmark-light.svg",
    "static/img/favicon.svg",
  ];

  for (const relPath of assets) {
    const fullPath = path.join(repoRoot, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    const content = fs.readFileSync(fullPath, "utf8");
    assert.ok(content.length > 50, `${relPath} must not be empty`);
    if (relPath.includes("wordmark")) {
      assert.ok(
        content.includes('viewBox="0 0 105.658 43.183"'),
        `${relPath} must have correct viewBox`,
      );
      assert.ok(
        !content.match(/<rect\s+width="105\.658"/),
        `${relPath} must not contain opaque background rect`,
      );
      assert.ok(
        content.includes("#4285f4"),
        `${relPath} must include brand accent color #4285f4`,
      );
    }
  }
});

test("static/img/logo.svg does not contain legacy ublue 'u' path", () => {
  const logoPath = path.join(repoRoot, "static/img/logo.svg");
  assert.ok(fs.existsSync(logoPath), "logo.svg must exist");
  const content = fs.readFileSync(logoPath, "utf8");
  assert.ok(
    !content.includes("M86.3349 156.792V70.6279"),
    "logo.svg must not contain legacy ublue 'u' path",
  );
});

test("docusaurus.config.ts uses new wordmark in navbar and raptor favicon", () => {
  const configPath = path.join(repoRoot, "docusaurus.config.ts");
  const content = fs.readFileSync(configPath, "utf8");

  assert.ok(
    content.includes('favicon: "img/favicon.svg"'),
    "favicon must point to img/favicon.svg",
  );
  assert.ok(
    content.includes('src: "img/bluefin-wordmark-light.svg"'),
    "navbar logo src must be light wordmark",
  );
  assert.ok(
    content.includes('srcDark: "img/bluefin-wordmark-dark.svg"'),
    "navbar logo srcDark must be dark wordmark",
  );
  assert.ok(
    content.includes('title: ""'),
    "navbar title must be empty string so wordmark is not duplicated",
  );
});

test("docs/press-kit.md documents Bluefin wordmark and color rules", () => {
  const pressKitPath = path.join(repoRoot, "docs/press-kit.md");
  const content = fs.readFileSync(pressKitPath, "utf8");

  assert.ok(
    content.includes("bluefin-wordmark"),
    "press-kit must reference bluefin-wordmark",
  );
  assert.ok(
    content.includes("#4285f4"),
    "press-kit must specify brand accent color #4285f4",
  );
  assert.ok(
    content.includes("Audiowide"),
    "press-kit must document Audiowide typography",
  );
  assert.ok(
    content.includes("Science Gothic"),
    "press-kit must document Science Gothic typography",
  );
});
