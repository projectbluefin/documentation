const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  getAllMarkdownFiles,
  isBotAccount,
} = require("./fetch-contributors.js");

test("isBotAccount detects exact bot names bot suffixes and bot substrings", () => {
  assert.equal(isBotAccount("Copilot"), true);
  assert.equal(isBotAccount("renovate[bot]"), true);
  assert.equal(isBotAccount("friendly-bot-helper"), true);
  assert.equal(isBotAccount("realperson"), false);
});

test("getAllMarkdownFiles returns repo-relative markdown paths", () => {
  const files = getAllMarkdownFiles(path.join(__dirname, "..", "docs"));

  assert.ok(files.includes("docs/introduction.md"));
  assert.ok(files.includes("docs/tips.mdx"));
  assert.ok(files.every((file) => file.startsWith("docs/")));
  assert.ok(files.every((file) => /\.mdx?$/.test(file)));
});
