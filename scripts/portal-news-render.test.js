const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

const portalDir = path.join(__dirname, "..", "src", "components", "portal");
const componentPath = path.join(portalDir, "PortalNews.tsx");
const cssPath = path.join(portalDir, "PortalNews.module.css");
const indexModuleId = "@site/static/data/blog-posts.json";

// Stands in for scripts/build-blog-index.js output. The real file is generated
// during `npm run fetch-data`, so a test that read it would pass or fail on
// whether someone had run a build.
const SAMPLE_INDEX = {
  generatedAt: "2026-09-10T00:00:00.000Z",
  posts: [
    {
      title: "Bluefin Server Alpha 2",
      link: "/blog/bluefin-server/",
      description: "Alright, here it is, Bluefin Server, this one boots.",
      pubDate: "2026-09-08T02:11:44.000Z",
      formattedDate: "September 8, 2026",
    },
    {
      title: "Announcing mcp.projectbluefin.io",
      link: "/blog/mcp-projectbluefin-io/",
      description: "Model Context Protocol is an open protocol.",
      pubDate: "2026-09-07T19:00:00.000Z",
      formattedDate: "September 7, 2026",
    },
    {
      title: "Bluefin: Welcome to the Jungle",
      link: "/blog/welcome-to-the-jungle/",
      description: "A follow up to The Future of Bluefin.",
      pubDate: "2026-08-27T22:45:00.000Z",
      formattedDate: "August 27, 2026",
    },
    {
      title: "Reaffirming our Commitment to Upstream Kernel Development",
      link: "/blog/killing-the-gamer-kernel/",
      description: "Earlier this month the Dakota team worked upstream.",
      pubDate: "2026-08-21T02:21:50.000Z",
      formattedDate: "August 21, 2026",
    },
    {
      title: "The Wolves Are Coming",
      link: "/blog/the-wolves-are-coming/",
      description: "",
      pubDate: "2026-08-17T03:23:14.000Z",
      formattedDate: "August 17, 2026",
    },
    {
      title: "Sixth Post Beyond perPage",
      link: "/blog/sixth-post-beyond-per-page/",
      description: "Should not reach the section at the default perPage.",
      pubDate: "2026-08-02T00:00:00.000Z",
      formattedDate: "August 2, 2026",
    },
  ],
};

function loadPortalNews(index = SAMPLE_INDEX) {
  return loadTsxModule(componentPath, (id) => {
    if (id.endsWith(".css")) return {};
    if (id === indexModuleId) return index;
    return undefined;
  });
}

test("PortalNews.tsx and PortalNews.module.css exist", () => {
  assert.ok(fs.existsSync(componentPath), "PortalNews.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "PortalNews.module.css must exist");
});

test("PortalNews statically renders the build-time blog index", () => {
  const PortalNews = loadPortalNews().default;
  const html = renderToStaticMarkup(React.createElement(PortalNews));

  // Section id and accessibility label
  assert.ok(html.includes('id="scene-news"'), 'must include id="scene-news"');
  assert.ok(
    html.includes('aria-label="Latest News"'),
    'must include aria-label="Latest News"',
  );

  // Section header
  assert.ok(html.includes(">Latest<"), "must include Latest tag");
  assert.ok(html.includes(">News<"), "must include News title");

  // Cards come from the local blog index, so every link is a post that exists.
  assert.ok(html.includes("Bluefin Server Alpha 2"));
  assert.ok(html.includes('href="/blog/bluefin-server/"'));
  assert.ok(html.includes("September 8, 2026"));
  assert.ok(
    html.includes("Alright, here it is, Bluefin Server, this one boots."),
  );
  assert.ok(html.includes("Announcing mcp.projectbluefin.io"));

  // View all posts link
  assert.ok(html.includes('href="/blog"'), 'must link to "/blog"');
  assert.ok(
    html.includes("View all posts"),
    'must include "View all posts" text',
  );
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test("PortalNews renders at most perPage cards", () => {
  const PortalNews = loadPortalNews().default;

  const html = renderToStaticMarkup(React.createElement(PortalNews));
  assert.ok(
    !html.includes("Sixth Post Beyond perPage"),
    "the sixth post must not render at the default perPage of 5",
  );

  const twoUp = renderToStaticMarkup(
    React.createElement(PortalNews, { perPage: 2 }),
  );
  assert.ok(twoUp.includes("Bluefin Server Alpha 2"));
  assert.ok(!twoUp.includes("Bluefin: Welcome to the Jungle"));
});

test("PortalNews never ships placeholder posts", () => {
  const source = fs.readFileSync(componentPath, "utf8");
  const staticData = fs.readFileSync(
    path.join(portalDir, "portalStaticData.ts"),
    "utf8",
  );

  // Hand-written stand-in posts linked to /blog URLs that were never written.
  for (const text of [source, staticData]) {
    assert.ok(
      !text.includes("Introducing Project Bluefin"),
      "no invented post titles may be committed as fallback data",
    );
    assert.ok(!text.includes("FALLBACK_NEWS_POSTS"));
  }
});

test("PortalNews renders custom initialPosts and perPage correctly", () => {
  const PortalNews = loadPortalNews().default;
  const customPosts = [
    {
      title: "Test Announcement Alpha",
      link: "/blog/test-announcement-alpha",
      description: "Description of alpha announcement.",
      pubDate: "2026-09-01T00:00:00Z",
      formattedDate: "September 1, 2026",
    },
    {
      title: "Test Announcement Beta",
      link: "/blog/test-announcement-beta",
      description: "Description of beta announcement.",
      pubDate: "2026-09-02T00:00:00Z",
      formattedDate: "September 2, 2026",
    },
  ];

  const html = renderToStaticMarkup(
    React.createElement(PortalNews, { initialPosts: customPosts }),
  );

  assert.ok(html.includes("Test Announcement Alpha"));
  assert.ok(html.includes("/blog/test-announcement-alpha"));
  assert.ok(html.includes("September 1, 2026"));
  assert.ok(html.includes("Description of alpha announcement."));
  assert.ok(html.includes("Test Announcement Beta"));
  assert.ok(!html.includes("Bluefin Server Alpha 2"));
});

test("PortalNews renders loading and no-posts states when requested", () => {
  const PortalNews = loadPortalNews().default;

  // Loading state
  const loadingHtml = renderToStaticMarkup(
    React.createElement(PortalNews, { initialLoading: true }),
  );
  assert.ok(loadingHtml.includes("loading"));
  assert.ok(loadingHtml.includes("Loading blog posts..."));

  // No posts state
  const noPostsHtml = renderToStaticMarkup(
    React.createElement(PortalNews, { initialPosts: [] }),
  );
  assert.ok(noPostsHtml.includes("no-posts"));
  assert.ok(noPostsHtml.includes("No blog posts found."));
});

test("PortalNews keeps the blog link in every state", () => {
  const PortalNews = loadPortalNews({ unavailable: true, posts: [] }).default;

  // An unavailable index must still leave the reader a way to the blog.
  for (const props of [{}, { initialLoading: true }, { initialPosts: [] }]) {
    const html = renderToStaticMarkup(React.createElement(PortalNews, props));
    assert.ok(
      html.includes("View all posts") && html.includes('href="/blog"'),
      `view-all link missing for props ${JSON.stringify(props)}`,
    );
  }
});

test("normalizeBlogIndex tolerates an unavailable or partial index", () => {
  const { normalizeBlogIndex } = loadPortalNews();

  assert.deepEqual(normalizeBlogIndex({ unavailable: true, posts: [] }), []);
  assert.deepEqual(normalizeBlogIndex({}), []);
  assert.deepEqual(
    normalizeBlogIndex({
      posts: [
        { title: "Kept", link: "/blog/kept/" },
        { title: "No link" },
        { link: "/blog/no-title/" },
      ],
    }),
    [
      {
        title: "Kept",
        link: "/blog/kept/",
        description: "",
        pubDate: "",
        formattedDate: "",
      },
    ],
  );
});

test("formatFeedDate formats ISO dates to readable en-US dates", () => {
  const { formatFeedDate } = loadPortalNews();

  assert.equal(formatFeedDate("2024-01-15T10:00:00Z"), "January 15, 2024");
  assert.equal(formatFeedDate("2026-09-08T02:11:44.000Z"), "September 8, 2026");
  assert.equal(formatFeedDate(""), "");
  assert.equal(formatFeedDate("not-a-date"), "not-a-date");
});

test("cleanDescription strips HTML, CDATA, and entities", () => {
  const { cleanDescription } = loadPortalNews();

  assert.equal(
    cleanDescription(
      "<![CDATA[<p>Hello &amp; welcome to <strong>Bluefin</strong>!</p>]]>",
    ),
    "Hello & welcome to Bluefin!",
  );
  assert.equal(cleanDescription("Plain text"), "Plain text");
  assert.equal(cleanDescription(""), "");
});

test("parseAtomFeedRegex correctly parses Atom XML feed", () => {
  const { parseAtomFeedRegex } = loadPortalNews();

  const sampleXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title type="html"><![CDATA[Test Post 1]]></title>
    <link href="https://docs.projectbluefin.io/blog/test-1/"/>
    <updated>2026-09-05T12:00:00.000Z</updated>
    <summary type="html"><![CDATA[Summary of post 1.]]></summary>
  </entry>
  <entry>
    <title>Test Post 2</title>
    <link href="https://docs.projectbluefin.io/blog/test-2/"/>
    <published>2026-09-04T08:00:00.000Z</published>
    <content type="html"><![CDATA[<p>Full content of post 2.</p>]]></content>
  </entry>
</feed>`;

  const posts = parseAtomFeedRegex(sampleXml);
  assert.equal(posts.length, 2);
  assert.equal(posts[0].title, "Test Post 1");
  assert.equal(posts[0].link, "https://docs.projectbluefin.io/blog/test-1/");
  assert.equal(posts[0].formattedDate, "September 5, 2026");
  assert.equal(posts[0].description, "Summary of post 1.");

  assert.equal(posts[1].title, "Test Post 2");
  assert.equal(posts[1].link, "https://docs.projectbluefin.io/blog/test-2/");
  assert.equal(posts[1].formattedDate, "September 4, 2026");
  assert.equal(posts[1].description, "Full content of post 2.");
});

test("PortalNews CSS has 3-line clamp, dark/light mode support, focus rings, and no inaccessible #4285f4", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  // Inaccessible #4285f4 must not be used
  assert.ok(
    !css.includes("#4285f4"),
    "CSS must not contain inaccessible #4285f4",
  );

  // 3-line clamped description
  assert.match(
    css,
    /-webkit-line-clamp:\s*3/,
    "Description must be 3-line clamped",
  );

  // Dark mode / default styling
  assert.match(css, /\.newsSection\s*\{[^}]*var\(--portal-bg/);

  // Light theme support
  assert.match(
    css,
    /\[data-theme="light"\]/,
    "Must support light theme overrides",
  );

  // Focus visible rings
  assert.match(
    css,
    /:focus-visible\s*\{[^}]*outline:/,
    "Interactive links must have visible focus rings",
  );

  // Responsive styling
  assert.match(
    css,
    /@media \(max-width:\s*768px\)/,
    "Must include responsive styles",
  );
});
