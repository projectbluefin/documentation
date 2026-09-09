const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadModule(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(file), id);
        for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
          if (fs.existsSync(base + suffix)) return loadModule(base + suffix);
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const portalDir = path.join(__dirname, "..", "src", "components", "portal");
const componentPath = path.join(portalDir, "PortalNews.tsx");
const cssPath = path.join(portalDir, "PortalNews.module.css");

test("PortalNews.tsx and PortalNews.module.css exist", () => {
  assert.ok(fs.existsSync(componentPath), "PortalNews.tsx must exist");
  assert.ok(fs.existsSync(cssPath), "PortalNews.module.css must exist");
});

test("PortalNews statically renders section header, cards, and view-all link", () => {
  const PortalNews = loadModule(componentPath).default;
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

  // Fallback / default cards rendered
  assert.ok(html.includes("Introducing Project Bluefin"));
  assert.ok(
    html.includes(
      "https://docs.projectbluefin.io/blog/introducing-project-bluefin",
    ),
  );
  assert.ok(html.includes("January 15, 2024"));
  assert.ok(
    html.includes(
      "Welcome to Project Bluefin, the next generation Linux workstation designed for reliability, performance, and sustainability.",
    ),
  );

  assert.ok(html.includes("Developer Mode: Cloud-Native Workflows"));
  assert.ok(html.includes("Understanding Image-Based Updates"));

  // View all posts link
  assert.ok(html.includes('href="/blog"'), 'must link to "/blog"');
  assert.ok(
    html.includes("View all posts"),
    'must include "View all posts" text',
  );
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test("PortalNews renders custom initialPosts and perPage correctly", () => {
  const PortalNews = loadModule(componentPath).default;
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
  assert.ok(!html.includes("Introducing Project Bluefin"));
});

test("PortalNews renders loading and no-posts states when requested", () => {
  const PortalNews = loadModule(componentPath).default;

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

test("formatFeedDate formats ISO dates to readable en-US dates", () => {
  const { formatFeedDate } = loadModule(componentPath);

  assert.equal(formatFeedDate("2024-01-15T10:00:00Z"), "January 15, 2024");
  assert.equal(formatFeedDate("2026-09-08T02:11:44.000Z"), "September 8, 2026");
  assert.equal(formatFeedDate(""), "");
  assert.equal(formatFeedDate("not-a-date"), "not-a-date");
});

test("cleanDescription strips HTML, CDATA, and entities", () => {
  const { cleanDescription } = loadModule(componentPath);

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
  const { parseAtomFeedRegex } = loadModule(componentPath);

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
