const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapApiRelease,
  parseAtomEntry,
  parseLinkNext,
} = require("./fetch-feeds.js");

test("parseLinkNext returns the next page URL from a GitHub Link header", () => {
  const header = '<https://api.github.com/repos/org/repo/releases?page=2>; rel="next", <https://api.github.com/repos/org/repo/releases?page=5>; rel="last"';
  assert.equal(
    parseLinkNext(header),
    "https://api.github.com/repos/org/repo/releases?page=2",
  );
  assert.equal(parseLinkNext(null), null);
});

test("mapApiRelease normalizes GitHub release payloads", () => {
  assert.deepEqual(
    mapApiRelease({
      tag_name: "v1.2.3",
      html_url: "https://github.com/org/repo/releases/tag/v1.2.3",
      published_at: "2026-01-02T03:04:05Z",
      body: "Release body",
    }),
    {
      title: "v1.2.3",
      link: "https://github.com/org/repo/releases/tag/v1.2.3",
      pubDate: "2026-01-02T03:04:05Z",
      contentSnippet: "Release body...",
      content: "Release body",
    },
  );
});

test("parseAtomEntry prefers HTML links and string content", () => {
  const entry = {
    title: ["stable-20260401"],
    updated: ["2026-04-01T00:00:00Z"],
    link: [
      { $: { href: "https://example.com/alt", type: "application/atom+xml" } },
      { $: { href: "https://example.com/html", type: "text/html" } },
    ],
    content: [{ _: "Atom release notes" }],
  };

  assert.deepEqual(parseAtomEntry(entry), {
    title: "stable-20260401",
    link: "https://example.com/html",
    pubDate: "2026-04-01T00:00:00Z",
    contentSnippet: "Atom release notes...",
    content: "Atom release notes",
  });
});
