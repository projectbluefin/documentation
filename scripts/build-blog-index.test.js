const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  BLOG_DIR,
  SUMMARY_MAX_CHARS,
  buildBlogIndex,
  buildPostEntry,
  extractSummary,
  formatDate,
  parseFrontmatter,
  postDate,
  postSlug,
} = require("./build-blog-index");

function writePosts(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-index-"));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), contents);
  }
  return dir;
}

test("parseFrontmatter splits scalars from the body", () => {
  const { data, body } = parseFrontmatter(
    [
      "---",
      'title: "Bluefin Server Alpha 2"',
      "slug: bluefin-server",
      "tags: [announcements, server]",
      "date: 2026-09-07T22:11:44-04:00",
      "---",
      "",
      "Body text.",
    ].join("\n"),
  );

  assert.equal(data.title, "Bluefin Server Alpha 2");
  assert.equal(data.slug, "bluefin-server");
  assert.equal(data.date, "2026-09-07T22:11:44-04:00");
  assert.equal(body.trim(), "Body text.");
});

test("parseFrontmatter passes through a file with no front matter", () => {
  const { data, body } = parseFrontmatter("Just prose.\n");
  assert.deepEqual(data, {});
  assert.equal(body, "Just prose.\n");
});

test("postSlug prefers front matter and otherwise drops the date prefix", () => {
  assert.equal(
    postSlug("2026-09-07-bluefin-server.mdx", { slug: "bluefin-server" }),
    "bluefin-server",
  );
  assert.equal(postSlug("2026-08-02-dakota-alpha-5.md", {}), "dakota-alpha-5");
  assert.equal(postSlug("no-date-here.md", {}), "no-date-here");
});

test("postDate falls back to the file name and reports a gap as null", () => {
  assert.equal(
    postDate("2026-09-07-bluefin-server.mdx", {
      date: "2026-09-07T22:11:44-04:00",
    }),
    "2026-09-08T02:11:44.000Z",
  );
  assert.equal(
    postDate("2026-08-02-dakota-alpha-5.md", {}),
    "2026-08-02T00:00:00.000Z",
  );
  assert.equal(postDate("undated.md", { date: "not-a-date" }), null);
  assert.equal(formatDate(null), "");
});

test("extractSummary quotes the post's lead paragraph", () => {
  const summary = extractSummary(
    [
      "# Bluefin Server",
      "",
      "Alright, here it is, [Bluefin Server](https://projectbluefin.io/server/), this one actually boots.",
      "",
      "A second paragraph that must not be included.",
    ].join("\n"),
  );

  assert.equal(
    summary,
    "Alright, here it is, Bluefin Server, this one actually boots.",
  );
});

test("extractSummary skips MDX imports, multi-line embeds, and link-only lines", () => {
  const summary = extractSummary(
    [
      'import BlueskyPost from "@site/src/components/blog/BlueskyPost";',
      "",
      "<iframe",
      '  width="560"',
      '  src="https://www.youtube.com/embed/abc"',
      "></iframe>",
      "",
      "[Original post](https://bsherman.dev/field-notes/post)",
      "",
      "A belated happy five years to Universal Blue, and how wanting laptops my family could live with turned me into a maintainer.",
    ].join("\n"),
  );

  assert.equal(
    summary,
    "A belated happy five years to Universal Blue, and how wanting laptops my family could live with turned me into a maintainer.",
  );
});

test("extractSummary drops the metrics JSON a monthly report exports", () => {
  const summary = extractSummary(
    [
      "export const snapshot = {",
      '  "schemaVersion": 2,',
      '  "sources": [',
      '    { "id": "github-activity", "status": "available" }',
      "  ]",
      "};",
      "",
      "Release details remain on the canonical /changelogs surface.",
    ].join("\n"),
  );

  assert.equal(
    summary,
    "Release details remain on the canonical /changelogs surface.",
  );
});

test("extractSummary truncates on a word boundary", () => {
  const long = `${"word ".repeat(120).trim()}.`;
  const summary = extractSummary(long);

  assert.ok(summary.length <= SUMMARY_MAX_CHARS + 1, "must respect the cap");
  assert.ok(summary.endsWith("…"), "a cut summary must say it was cut");
  assert.ok(!summary.includes(" …"), "must not leave a dangling space");
});

test("extractSummary returns an empty string for a post with no prose", () => {
  assert.equal(
    extractSummary(
      [
        'import BlueskyPost from "@site/src/components/blog/BlueskyPost";',
        "",
        "<BlueskyPost",
        '  url="https://bsky.app/profile/example/post/1"',
        "/>",
      ].join("\n"),
    ),
    "",
  );
});

test("buildPostEntry produces the BlogPost shape PortalNews renders", () => {
  const entry = buildPostEntry(
    "2026-09-07-bluefin-server.mdx",
    [
      "---",
      'title: "Bluefin Server Alpha 2"',
      "slug: bluefin-server",
      "date: 2026-09-07T22:11:44-04:00",
      "---",
      "",
      "Alright, here it is, this one actually boots and it is the base of the factory.",
    ].join("\n"),
  );

  assert.deepEqual(entry, {
    title: "Bluefin Server Alpha 2",
    link: "/blog/bluefin-server/",
    description:
      "Alright, here it is, this one actually boots and it is the base of the factory.",
    pubDate: "2026-09-08T02:11:44.000Z",
    formattedDate: "September 8, 2026",
  });
});

test("buildPostEntry prefers an author-supplied description", () => {
  const entry = buildPostEntry(
    "2026-09-07-described.md",
    [
      "---",
      'title: "Described"',
      'description: "The author wrote this summary."',
      "---",
      "",
      "A lead paragraph that is long enough to be picked otherwise.",
    ].join("\n"),
  );

  assert.equal(entry.description, "The author wrote this summary.");
});

test("buildPostEntry skips a file with no title", () => {
  assert.equal(buildPostEntry("2026-09-07-untitled.md", "Just prose."), null);
});

test("buildBlogIndex returns the newest posts first, capped at the limit", () => {
  const dir = writePosts({
    "2026-09-07-newest.md": '---\ntitle: "Newest"\n---\n\nNewest post body.\n',
    "2026-08-02-middle.md": '---\ntitle: "Middle"\n---\n\nMiddle post body.\n',
    "2026-07-02-oldest.md": '---\ntitle: "Oldest"\n---\n\nOldest post body.\n',
    "authors.yaml": "bluefin:\n  name: Bluefin\n",
  });

  const all = buildBlogIndex(dir);
  assert.deepEqual(
    all.map((post) => post.title),
    ["Newest", "Middle", "Oldest"],
  );

  const capped = buildBlogIndex(dir, 2);
  assert.deepEqual(
    capped.map((post) => post.title),
    ["Newest", "Middle"],
  );
});

test("every post in blog/ yields a title, a link, and a date", () => {
  const posts = buildBlogIndex(BLOG_DIR);

  assert.ok(posts.length > 0, "the repository blog must produce posts");
  for (const post of posts) {
    assert.ok(post.title, "a post card without a title is not shippable");
    assert.match(post.link, /^\/blog\/[a-z0-9-.]+\/$/);
    assert.match(post.pubDate, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(post.formattedDate, "a post must render a readable date");
    assert.ok(
      !post.description.includes("<"),
      `description for ${post.title} still contains markup`,
    );
  }
});
