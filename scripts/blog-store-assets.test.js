const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");

test("blog/2026-07-22-seven-days-to-the-wolves.mdx does not hotlink Printful CDN", () => {
  const blogPath = path.join(
    repoRoot,
    "blog/2026-07-22-seven-days-to-the-wolves.mdx",
  );
  assert.ok(fs.existsSync(blogPath), "seven-days-to-the-wolves.mdx must exist");

  const content = fs.readFileSync(blogPath, "utf8");
  assert.ok(
    !content.includes("cdn.printful.me"),
    "seven-days-to-the-wolves.mdx must not contain hotlinks to cdn.printful.me",
  );
});

test("blog/2026-07-22-seven-days-to-the-wolves.mdx merch images exist in static/img/store/", () => {
  const blogPath = path.join(
    repoRoot,
    "blog/2026-07-22-seven-days-to-the-wolves.mdx",
  );
  const content = fs.readFileSync(blogPath, "utf8");

  const storeImgMatches = [...content.matchAll(/src="(\/img\/store\/[^"]+)"/g)];
  assert.ok(
    storeImgMatches.length >= 3,
    "seven-days-to-the-wolves.mdx should have at least 3 local store images",
  );

  for (const match of storeImgMatches) {
    const relativeWebPath = match[1];
    const localFsPath = path.join(
      repoRoot,
      "static",
      relativeWebPath.replace(/^\//, ""),
    );
    assert.ok(
      fs.existsSync(localFsPath),
      `Referenced store image ${relativeWebPath} must exist at ${localFsPath}`,
    );
  }
});
