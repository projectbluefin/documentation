const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("node:fs");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const {
  getAllMarkdownFiles,
  isBotAccount,
  buildPayload,
} = require("./fetch-contributors.js");

function loadPageContributors() {
  const tsxPath = path.join(
    __dirname,
    "..",
    "src",
    "components",
    "PageContributors.tsx",
  );
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
      if (id === "@site/static/data/file-contributors.json") {
        return { unavailable: true, files: {} };
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

test("isBotAccount detects exact bot names bot suffixes and bot substrings", () => {
  assert.equal(isBotAccount("Copilot"), true);
  assert.equal(isBotAccount("renovate[bot]"), true);
  assert.equal(isBotAccount("friendly-bot-helper"), true);
  assert.equal(isBotAccount("realperson"), false);
});

test("getAllMarkdownFiles returns repo-relative markdown paths", () => {
  const files = getAllMarkdownFiles(path.join(__dirname, "..", "docs"));

  assert.ok(files.includes("docs/index.md"));
  assert.ok(files.includes("docs/installation.md"));
  assert.ok(files.every((file) => file.startsWith("docs/")));
  assert.ok(files.every((file) => /\.mdx?$/.test(file)));
});

test("buildPayload constructs available payload when files map is populated", () => {
  const mockContributors = [
    {
      login: "testuser",
      html_url: "https://github.com/testuser",
      avatar_url: "https://example.com/avatar.png",
    },
  ];
  const payload = buildPayload({ "docs/index.md": mockContributors });

  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.ok(payload.generatedAt);
  assert.deepEqual(payload.files["docs/index.md"], mockContributors);
});

test("buildPayload accepts a Map instance and converts to files object", () => {
  const mockContributors = [
    {
      login: "testuser",
      html_url: "https://github.com/testuser",
      avatar_url: "https://example.com/avatar.png",
    },
  ];
  const map = new Map([["docs/index.md", mockContributors]]);
  const payload = buildPayload(map);

  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.deepEqual(payload.files["docs/index.md"], mockContributors);
});

test("buildPayload emits standard unavailable payload when files map is empty", () => {
  const payload = buildPayload({});

  assert.equal(payload.unavailable, true);
  assert.ok(payload.stateReason);
  assert.deepEqual(payload.files, {});
  assert.ok(payload.generatedAt);
});

test("buildPayload preserves explicit unavailable flag and stateReason", () => {
  const payload = buildPayload(
    {},
    {
      unavailable: true,
      stateReason: "Rate limited by GitHub API",
    },
  );

  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "Rate limited by GitHub API");
  assert.deepEqual(payload.files, {});
});

test("isDatasetUnavailable identifies unavailable datasets and empty maps", () => {
  const { isDatasetUnavailable } = loadPageContributors();

  assert.equal(
    isDatasetUnavailable({ unavailable: true, files: {} }),
    true,
    "payload with unavailable: true is unavailable",
  );
  assert.equal(isDatasetUnavailable({}), true, "empty object is unavailable");
  assert.equal(isDatasetUnavailable(null), true, "null is unavailable");
  assert.equal(
    isDatasetUnavailable(undefined),
    true,
    "undefined is unavailable",
  );
  assert.equal(
    isDatasetUnavailable({
      unavailable: false,
      files: { "docs/index.md": [] },
    }),
    false,
    "payload with unavailable: false is available",
  );
  assert.equal(
    isDatasetUnavailable({ "docs/index.md": [] }),
    false,
    "legacy populated map is available",
  );
});

test("getFileContributors retrieves contributors from payload or legacy map", () => {
  const { getFileContributors } = loadPageContributors();
  const sampleContributors = [
    {
      login: "alice",
      html_url: "https://github.com/alice",
      avatar_url: "https://example.com/alice.png",
    },
  ];

  const payload = {
    unavailable: false,
    files: { "docs/install.md": sampleContributors },
  };
  assert.deepEqual(
    getFileContributors(payload, "docs/install.md"),
    sampleContributors,
  );
  assert.equal(getFileContributors(payload, "docs/missing.md"), undefined);

  const legacyMap = { "docs/install.md": sampleContributors };
  assert.deepEqual(
    getFileContributors(legacyMap, "docs/install.md"),
    sampleContributors,
  );
  assert.equal(getFileContributors(legacyMap, "docs/missing.md"), undefined);
});

test("PageContributors component renders empty (null) and suppresses fallback when dataset is unavailable", () => {
  const { default: PageContributors } = loadPageContributors();

  // Test with standard unavailable payload
  const htmlUnavailable = renderToStaticMarkup(
    React.createElement(PageContributors, {
      filePath: "docs/installation.md",
      data: { unavailable: true, files: {} },
    }),
  );
  assert.equal(htmlUnavailable, "");

  // Test with empty map (legacy failure output)
  const htmlEmpty = renderToStaticMarkup(
    React.createElement(PageContributors, {
      filePath: "docs/installation.md",
      data: {},
    }),
  );
  assert.equal(htmlEmpty, "");
});

test("PageContributors component renders contributors when available in build data", () => {
  const { default: PageContributors } = loadPageContributors();
  const sampleContributors = [
    {
      login: "contributor1",
      html_url: "https://github.com/contributor1",
      avatar_url: "https://avatars.githubusercontent.com/u/12345?v=4",
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(PageContributors, {
      filePath: "docs/installation.md",
      data: {
        unavailable: false,
        files: { "docs/installation.md": sampleContributors },
      },
    }),
  );

  assert.ok(html.includes("Contributors to this page"));
  assert.ok(html.includes("contributor1"));
  assert.ok(html.includes("https://github.com/contributor1"));
  assert.ok(html.includes("https://avatars.githubusercontent.com/u/12345?v=4"));
});
