// Build-time index of the local Docusaurus blog for the portal news section.
//
// The portal renders `#scene-news` before any browser fetch resolves, so it
// needs the latest posts as data at build time. Everything here is read from
// `blog/` — the same files Docusaurus turns into `/blog/<slug>/` and the Atom
// feed — so the section never renders a post that does not exist.
//
// Nothing in this file may invent prose. The title comes from front matter and
// the summary is the post's own lead paragraph, quoted, never paraphrased.

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "blog");
const OUTPUT_PATH = path.join(REPO_ROOT, "static", "data", "blog-posts.json");

// The portal shows at most five cards; a couple of spares cost nothing and keep
// the file useful if the component's `perPage` grows.
const POST_LIMIT = 8;
const SUMMARY_MAX_CHARS = 280;
// A lead paragraph shorter than this is a link line or a one-word aside, not a
// description — "[Original post](…)" opens more than one post in this blog.
const SUMMARY_MIN_CHARS = 40;

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;

/** Split `---` front matter off a post, returning its scalars and the body. */
function parseFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    // Scalars only. Lists and nested maps (tags, authors) are indented or
    // start with "-", and nothing here needs them.
    const field = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!field) continue;
    const value = field[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (value) data[field[1]] = value;
  }
  return { data, body: match[2] };
}

/** The `/blog/<slug>/` segment Docusaurus derives for a post file. */
function postSlug(fileName, data) {
  if (data.slug) return String(data.slug).replace(/^\/+|\/+$/g, "");
  const base = fileName.replace(/\.mdx?$/, "");
  const dated = DATE_PREFIX.exec(base);
  return dated ? dated[4] : base;
}

/**
 * The post's publication date as an ISO string, from front matter when present
 * and otherwise from the `YYYY-MM-DD-` file name prefix. `null` when neither
 * yields a real date — a gap stays a gap.
 */
function postDate(fileName, data) {
  const candidates = [];
  if (data.date) candidates.push(String(data.date));
  const dated = DATE_PREFIX.exec(fileName.replace(/\.mdx?$/, ""));
  if (dated) candidates.push(`${dated[1]}-${dated[2]}-${dated[3]}T00:00:00Z`);

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

/** Match `formatFeedDate` in PortalNews so feed and index dates read alike. */
function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/(^|\W)[*_]([^*_]+)[*_](\W|$)/g, "$1$2$3")
    .replace(/\\([*_[\]()#])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drop MDX `import`/`export` statements, including the multi-line ones.
 *
 * A monthly report opens with `export const snapshot = { … }` holding several
 * hundred lines of metrics JSON. Matching only the first line of that leaves
 * the JSON behind, and the JSON then reads as the post's lead paragraph — so
 * the statement is followed by bracket depth until it closes.
 */
function stripEsStatements(lines) {
  const kept = [];
  let depth = 0;
  let inStatement = false;

  for (const line of lines) {
    if (!inStatement && /^(import|export)\s/.test(line)) {
      inStatement = true;
      depth = 0;
    }
    if (!inStatement) {
      kept.push(line);
      continue;
    }
    depth += (line.match(/[{[(]/g) ?? []).length;
    depth -= (line.match(/[}\])]/g) ?? []).length;
    if (depth <= 0) inStatement = false;
  }
  return kept;
}

/**
 * The post's own lead paragraph, as plain text.
 *
 * MDX bodies open with imports, hero images, and multi-line JSX embeds; all of
 * it is removed rather than summarised. What survives is the first paragraph
 * the author wrote, truncated on a word boundary.
 */
function extractSummary(body) {
  const lines = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim());

  const prose = stripEsStatements(lines)
    .join("\n")
    // `[^>]*` crosses newlines, so multi-line <iframe …> embeds go too.
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .filter(
      (line) =>
        !/^#{1,6}\s/.test(line) &&
        !/^(-{3,}|\*{3,}|:{3})/.test(line) &&
        !/^\|/.test(line),
    )
    .join("\n");

  const paragraphs = prose
    .split(/\n{2,}/)
    .map((paragraph) =>
      stripInlineMarkdown(paragraph.replace(/\n/g, " ").replace(/^>\s*/, "")),
    )
    .filter(Boolean);

  const lead =
    paragraphs.find((p) => p.length >= SUMMARY_MIN_CHARS) ?? paragraphs[0];
  if (!lead) return "";
  if (lead.length <= SUMMARY_MAX_CHARS) return lead;

  const cut = lead.slice(0, SUMMARY_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:—-]+$/, "")}…`;
}

/** One post file to the `BlogPost` shape PortalNews already renders. */
function buildPostEntry(fileName, source) {
  const { data, body } = parseFrontmatter(source);
  const title = data.title ? stripInlineMarkdown(data.title) : "";
  if (!title) return null;

  const pubDate = postDate(fileName, data);
  return {
    title,
    link: `/blog/${postSlug(fileName, data)}/`,
    description: data.description
      ? stripInlineMarkdown(data.description)
      : extractSummary(body),
    pubDate: pubDate ?? "",
    formattedDate: formatDate(pubDate),
  };
}

/** The newest `limit` posts in `blogDir`, newest first. */
function buildBlogIndex(blogDir, limit = POST_LIMIT) {
  const files = fs
    .readdirSync(blogDir)
    .filter((name) => /\.mdx?$/.test(name))
    .sort();

  const posts = [];
  for (const fileName of files) {
    const entry = buildPostEntry(
      fileName,
      fs.readFileSync(path.join(blogDir, fileName), "utf8"),
    );
    if (entry) posts.push(entry);
  }

  posts.sort((a, b) =>
    a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0,
  );
  return posts.slice(0, limit);
}

function main() {
  // Never fail the build: an unreadable blog directory writes an explicit
  // unavailable marker and the portal says so, rather than showing nothing.
  let payload;
  try {
    payload = {
      generatedAt: new Date().toISOString(),
      posts: buildBlogIndex(BLOG_DIR),
    };
  } catch (error) {
    payload = {
      generatedAt: new Date().toISOString(),
      unavailable: true,
      stateReason: `Could not read ${path.relative(REPO_ROOT, BLOG_DIR)}: ${error.message}`,
      posts: [],
    };
    console.warn(`build-blog-index: ${payload.stateReason}`);
  }

  try {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `build-blog-index: wrote ${payload.posts.length} posts to ${path.relative(REPO_ROOT, OUTPUT_PATH)}`,
    );
  } catch (error) {
    console.warn(`build-blog-index: could not write index: ${error.message}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  BLOG_DIR,
  OUTPUT_PATH,
  POST_LIMIT,
  SUMMARY_MAX_CHARS,
  buildBlogIndex,
  buildPostEntry,
  extractSummary,
  formatDate,
  parseFrontmatter,
  postDate,
  postSlug,
  stripEsStatements,
  stripInlineMarkdown,
};
