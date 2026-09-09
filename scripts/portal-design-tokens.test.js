const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const portalDir = path.join(root, "src", "components", "portal");
const cssDir = path.join(root, "src", "css");

test("portal-tokens.css defines brand blues, dark surfaces, and typography stacks", () => {
  const tokensPath = path.join(cssDir, "portal-tokens.css");
  assert.ok(fs.existsSync(tokensPath), "src/css/portal-tokens.css must exist");

  const css = fs.readFileSync(tokensPath, "utf8");

  // Brand blues
  assert.match(css, /--portal-blue:\s*#4285f4;/);
  assert.match(css, /--portal-blue-light:\s*#8a97f7;/);

  // Dark surfaces
  assert.match(css, /--portal-bg:\s*#0c1016;/);
  assert.match(css, /--portal-bg-light:\s*#10151f;/);

  // Typography stacks
  assert.match(css, /--portal-font-family:[^;]*["']?Inter["']?/);
  assert.match(css, /--portal-font-mono:[^;]*["']?JetBrains Mono["']?/);
});

test("custom.css bundles self-hosted Inter, JetBrains Mono, and portal design tokens", () => {
  const customCssPath = path.join(cssDir, "custom.css");
  const css = fs.readFileSync(customCssPath, "utf8");

  // Self-hosted Inter font stack (300, 400, 700)
  assert.match(css, /@import\s+["']@fontsource\/inter\/300\.css["'];/);
  assert.match(css, /@import\s+["']@fontsource\/inter\/400\.css["'];/);
  assert.match(css, /@import\s+["']@fontsource\/inter\/700\.css["'];/);

  // Self-hosted JetBrains Mono font stack
  assert.match(css, /@import\s+["']@fontsource\/jetbrains-mono\/400\.css["'];/);
  assert.match(css, /@import\s+["']@fontsource\/jetbrains-mono\/500\.css["'];/);
  assert.match(css, /@import\s+["']@fontsource\/jetbrains-mono\/600\.css["'];/);
  assert.match(css, /@import\s+["']@fontsource\/jetbrains-mono\/700\.css["'];/);

  // Portal design tokens import
  assert.match(css, /@import\s+["']\.\/portal-tokens\.css["'];/);
});

test("portal CSS modules align all media queries to 956px without 768px oscillation", () => {
  const moduleFiles = [
    "PortalPrototype.module.css",
    "PortalSectionPicker.module.css",
    "PortalVideo.module.css",
    "PortalBazaar.module.css",
    "PortalCommunity.module.css",
    "PortalFooter.module.css",
  ];

  for (const file of moduleFiles) {
    const filePath = path.join(portalDir, file);
    assert.ok(fs.existsSync(filePath), `${file} must exist`);
    const css = fs.readFileSync(filePath, "utf8");

    // Must not have split 768px media queries
    assert.ok(
      !/@media[^{]*max-width:\s*768px/.test(css),
      `${file} must not contain 768px media queries`,
    );

    // Must collapse at 956px
    assert.match(
      css,
      /@media[^{]*max-width:\s*956px/,
      `${file} must contain 956px collapse media query`,
    );

    // Must have 512px phone optimization rules
    assert.match(
      css,
      /@media[^{]*max-width:\s*512px/,
      `${file} must contain 512px phone optimization media query`,
    );
  }
});

test("portal 512px phone breakpoint constraints scale character artwork and set 16px card padding", () => {
  const protoCss = fs.readFileSync(
    path.join(portalDir, "PortalPrototype.module.css"),
    "utf8",
  );
  const pickerCss = fs.readFileSync(
    path.join(portalDir, "PortalSectionPicker.module.css"),
    "utf8",
  );
  const communityCss = fs.readFileSync(
    path.join(portalDir, "PortalCommunity.module.css"),
    "utf8",
  );

  // Artwork scaled down to 216px in PortalPrototype
  const proto512 = protoCss.match(
    /@media \(max-width:\s*512px\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(proto512, "512px media query must exist in PortalPrototype");
  assert.match(
    proto512[1],
    /216px/,
    "characters must scale down to 216px at 512px",
  );
  assert.match(
    proto512[1],
    /padding:\s*16px;/,
    "grid padding must be 16px at 512px in PortalPrototype",
  );

  // Community card padding 16px at 512px
  const comm512 = communityCss.match(
    /@media \(max-width:\s*512px\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(comm512, "512px media query must exist in PortalCommunity");
  assert.match(
    comm512[1],
    /\.card\s*\{[^}]*padding:\s*16px;/,
    "card padding must be 16px at 512px in PortalCommunity",
  );

  // Picker cards / overlays / summaries padded 16px at 512px
  const picker512 = pickerCss.match(
    /@media \(max-width:\s*512px\)\s*\{([\s\S]*?)\n\}/,
  );
  assert.ok(picker512, "512px media query must exist in PortalSectionPicker");
  assert.match(
    picker512[1],
    /\.pickerCard\s*\{[^}]*padding:\s*16px;/,
    "pickerCard padding must be 16px at 512px in PortalSectionPicker",
  );
  assert.match(
    picker512[1],
    /\.downloadSummary\s*\{[^}]*padding:\s*16px;/,
    "downloadSummary padding must be 16px at 512px in PortalSectionPicker",
  );
});

test("portal modules consume design tokens and avoid off-palette Tailwind/Bootstrap values", () => {
  const pickerCss = fs.readFileSync(
    path.join(portalDir, "PortalSectionPicker.module.css"),
    "utf8",
  );
  const videoCss = fs.readFileSync(
    path.join(portalDir, "PortalVideo.module.css"),
    "utf8",
  );

  // No hardcoded Tailwind dark background #1f2937 or borders #374151
  assert.ok(
    !pickerCss.includes("#1f2937"),
    "picker must not contain Tailwind #1f2937",
  );
  assert.ok(
    !pickerCss.includes("#374151"),
    "picker must not contain Tailwind #374151",
  );

  // No hardcoded Tailwind blues
  assert.ok(
    !pickerCss.includes("#3b82f6"),
    "picker must not contain Tailwind #3b82f6",
  );
  assert.ok(
    !pickerCss.includes("#2563eb"),
    "picker must not contain Tailwind #2563eb",
  );
  assert.ok(!pickerCss.includes("#4f9cf9"), "picker must not contain #4f9cf9");
  assert.ok(!pickerCss.includes("#93c5fd"), "picker must not contain #93c5fd");
  assert.ok(!pickerCss.includes("#60a5fa"), "picker must not contain #60a5fa");

  // Video uses token for background
  assert.match(videoCss, /var\(--portal-bg-light/);

  // Monospace elements consume --portal-font-mono
  assert.match(
    pickerCss,
    /\.versionValue\s*\{[^}]*var\(--portal-font-mono/s,
    ".versionValue must consume --portal-font-mono",
  );
  assert.match(
    pickerCss,
    /\.versionItemValue\s*\{[^}]*var\(--portal-font-mono/s,
    ".versionItemValue must consume --portal-font-mono",
  );
  assert.match(
    pickerCss,
    /\.filenameValue\s*\{[^}]*var\(--portal-font-mono/s,
    ".filenameValue must consume --portal-font-mono",
  );
  assert.match(
    pickerCss,
    /\.commandValue\s*\{[^}]*var\(--portal-font-mono/s,
    ".commandValue must consume --portal-font-mono",
  );
});
