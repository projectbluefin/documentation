const fs = require("fs");
const path = require("path");
const sanitizeHtml = require("sanitize-html");

// HTML allowlist — keep in sync with src/utils/sanitizeHtml.ts (ALLOWED_TAGS /
// ALLOWED_ATTR) and scripts/fetch-firehose.js. Release-note HTML (Atom feed
// content, or Markdown inline HTML in API bodies) must be stripped of scripts,
// iframes, event handlers, and unsafe URL protocols before it is baked into
// the static site: the SSR branch of sanitizeHtml() returns input raw, so
// fetch-time sanitization is the only thing standing between an upstream feed
// and stored XSS on the docs domain.
const SANITIZE_OPTIONS = {
  allowedTags: [
    "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "details",
    "div", "dl", "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
    "i", "img", "ins", "kbd", "li", "ol", "p", "pre", "q", "s", "samp",
    "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
    "tfoot", "th", "thead", "tr", "tt", "ul", "var",
  ],
  allowedAttributes: {
    "*": [
      "href", "target", "rel", "src", "alt", "title", "class", "id",
      "width", "height", "align", "colspan", "rowspan", "scope",
    ],
  },
  // sanitize-html defaults already restrict href/src to safe protocols
  // (http/https/mailto etc.) — javascript: URLs are dropped.
};

function cleanHtml(v, maxLen = 5000) {
  if (typeof v !== "string") {
    return "";
  }
  return sanitizeHtml(v.slice(0, maxLen), SANITIZE_OPTIONS);
}

// Only http(s) links may reach <a href> in the rendered feed — anything else
// (javascript:, data:, ...) is replaced with a no-op.
function safeLink(href) {
  if (typeof href === "string" && /^https?:\/\//i.test(href.trim())) {
    return href;
  }
  return "#";
}

/**
 * Parse the `Link` response header and return the URL for rel="next", or null.
 * Example header: <https://api.github.com/...?page=2>; rel="next", <...>; rel="last"
 */
function parseLinkNext(linkHeader) {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

/**
 * Fetch releases from the GitHub Releases API with full pagination.
 * Follows Link rel="next" headers until all pages are retrieved or the
 * MAX_RELEASES cap is reached. Falls back to the Atom feed if the API is
 * unavailable or token is missing.
 */
function mapApiRelease(release) {
  return {
    title: release.tag_name ?? "Unknown Release",
    link: safeLink(release.html_url),
    pubDate: release.published_at ?? "",
    contentSnippet: (release.body ?? "").substring(0, 200) + "...",
    content: cleanHtml(release.body ?? ""),
  };
}

function parseAtomEntry(entry) {
  let link = "#";
  if (entry.link && Array.isArray(entry.link)) {
    const htmlLink = entry.link.find(
      (l) => l.$ && l.$.type === "text/html",
    );
    link = htmlLink ? htmlLink.$.href : entry.link[0].$.href;
  }

  let content = "";
  let contentSnippet = "";
  if (
    entry.content &&
    Array.isArray(entry.content) &&
    entry.content[0]
  ) {
    if (typeof entry.content[0] === "string") {
      content = entry.content[0];
      contentSnippet = content.substring(0, 200) + "...";
    } else if (
      entry.content[0]._ &&
      typeof entry.content[0]._ === "string"
    ) {
      content = entry.content[0]._;
      contentSnippet = content.substring(0, 200) + "...";
    }
  }

  return {
    title: entry.title ? entry.title[0] : "Unknown Release",
    link: safeLink(link),
    pubDate: entry.updated ? entry.updated[0] : "",
    contentSnippet,
    content: cleanHtml(content),
  };
}

async function fetchReleasesFromApi(owner, repo) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.warn(`No GITHUB_TOKEN — falling back to Atom feed for ${owner}/${repo}`);
    return null;
  }

  const MAX_RELEASES = 500;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let allReleases = [];
  let nextUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;

  while (nextUrl && allReleases.length < MAX_RELEASES) {
    console.log(`Fetching releases API: ${nextUrl}`);
    const response = await fetch(nextUrl, { headers });

    if (!response.ok) {
      console.warn(`GitHub API returned ${response.status} for ${owner}/${repo} — falling back to Atom`);
      return null;
    }

    const page = await response.json();
    allReleases = allReleases.concat(page);
    nextUrl = parseLinkNext(response.headers.get("link"));
  }

  if (allReleases.length >= MAX_RELEASES) {
    console.warn(`${owner}/${repo}: reached ${MAX_RELEASES}-release cap — some older releases may be omitted`);
  }

  // Map GitHub API response to the same OsFeedItem shape used by the parsers
  return allReleases
    .filter((r) => !r.draft)
    .map((r) => mapApiRelease(r));
}

/**
 * Fallback: fetch and parse the GitHub Atom XML feed.
 * Limited to ~10 most recent releases.
 */
async function fetchReleasesFromAtom(owner, repo) {
  const { parseString } = require("xml2js");
  const url = `https://github.com/${owner}/${repo}/releases.atom`;

  console.log(`Fetching Atom feed: ${url}`);
  const response = await fetch(url);
  const xmlText = await response.text();

  return new Promise((resolve, reject) => {
    parseString(xmlText, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const feed = result.feed;
      const entries = feed.entry || [];

      const releases = entries.map((entry) => parseAtomEntry(entry));

      resolve(releases);
    });
  });
}

async function fetchAndSaveFeed(owner, repo, filename) {
  const feedsDir = path.join(__dirname, "..", "static", "feeds");
  const jsonPath = path.join(feedsDir, filename);

  // 24-hour file-mtime cache: skip if output is recent enough
  if (fs.existsSync(jsonPath)) {
    const stat = fs.statSync(jsonPath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 24 * 60 * 60 * 1000 && !process.argv.includes("--force")) {
      console.log(`Cache hit: ${filename} (${Math.round(ageMs / 3600000)}h old) — skipping fetch`);
      return;
    }
  }

  try {
    // Try GitHub API first; fall back to Atom feed
    let items = await fetchReleasesFromApi(owner, repo);
    if (!items) {
      items = await fetchReleasesFromAtom(owner, repo);
    }

    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
    }

    fs.writeFileSync(
      jsonPath + ".tmp",
      JSON.stringify(
        {
          title: `${owner}/${repo} Releases`,
          items,
        },
        null,
        2,
      ),
    );
    fs.renameSync(jsonPath + ".tmp", jsonPath);

    console.log(`Saved ${items.length} releases to ${jsonPath}`);
  } catch (error) {
    console.error(`Error fetching ${owner}/${repo}:`, error);
  }
}

async function main() {
  await fetchAndSaveFeed("projectbluefin", "bluefin", "bluefin-releases.json");
  await fetchAndSaveFeed("projectbluefin", "bluefin-lts", "bluefin-lts-releases.json");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error in fetch-feeds:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  fetchAndSaveFeed,
  mapApiRelease,
  parseAtomEntry,
  parseLinkNext,
};
