const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

const mockImports = (id) => {
  if (id === "react") return React;
  if (id.endsWith(".css")) return {};
  return undefined;
};
const { DakotaSection } = loadTsxModule(
  path.join(__dirname, "..", "src", "components", "DownloadSectionTesting.tsx"),
  mockImports,
);
const DownloadSection = loadTsxModule(
  path.join(__dirname, "..", "src", "components", "DownloadSection.tsx"),
  mockImports,
).default;

test("Downloads separates Dakota from unsupported Bluefin variants", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "..", "docs", "downloads.mdx"),
    "utf8",
  );
  const html = renderToStaticMarkup(React.createElement(DakotaSection));
  const bluefinHtml = renderToStaticMarkup(React.createElement(DownloadSection));

  const dakotaIndex = page.indexOf("<DakotaSection />");
  const warningIndex = page.indexOf(":::warning");
  const bluefinIndex = page.indexOf("<DownloadSection />");
  const ltsIndex = page.indexOf("<LtsDownloadCard />");
  const gdxIndex = page.indexOf("<GdxDownloadCard />");
  assert.ok(dakotaIndex < warningIndex);
  assert.ok(warningIndex < bluefinIndex);
  assert.ok(bluefinIndex < ltsIndex);
  assert.ok(ltsIndex < gdxIndex);
  assert.match(page, /Use these images at your own risk they are unsupported!/);
  assert.match(html, /Recommended/);
  assert.doesNotMatch(bluefinHtml, /Recommended/);

  assert.match(html, /AMD64 \(x86_64\)/);
  assert.match(html, /AArch64 \(ARM64\)/);
  assert.match(html, /dakota-live-latest\.iso/);
  assert.match(html, /dakota-live-aarch64-latest\.iso/);
  assert.match(html, /Not yet published/);
  assert.match(
    html,
    /href="https:\/\/projectbluefin\.dev\/dakota-live-latest\.iso"/,
  );
  assert.doesNotMatch(html, /href="[^"]*dakota-live-aarch64-latest\.iso/);
  assert.match(html, /dakota-live-alpha5\.iso/);
  assert.equal((html.match(/📥 Download ISO/g) ?? []).length, 2);
  assert.equal((html.match(/🧲 Torrent/g) ?? []).length, 3);
  assert.equal((html.match(/🔐 Verify/g) ?? []).length, 3);
});
