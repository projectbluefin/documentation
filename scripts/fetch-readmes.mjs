import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import identities from "../src/components/image-identities.json" with { type: "json" };

// The imported README is rendered with `mdx.format: md`, where Docusaurus
// passes raw HTML straight through (rehype-raw), and the seed is refreshed on
// every scheduled build without review in this repository. Only this allowlist
// reaches the page; keep it in sync with scripts/fetch-feeds.js, plus the
// <picture>/<source> pair README artwork relies on.
const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "ol",
  "p",
  "picture",
  "pre",
  "q",
  "s",
  "samp",
  "source",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "tt",
  "ul",
  "var",
]);
const VOID_TAGS = new Set(["br", "hr", "img", "source"]);
const ALLOWED_ATTRIBUTES = new Set([
  "align",
  "alt",
  "class",
  "colspan",
  "height",
  "href",
  "id",
  "media",
  "open",
  "rel",
  "rowspan",
  "scope",
  "src",
  "srcset",
  "target",
  "title",
  "type",
  "width",
]);
const URL_ATTRIBUTES = new Set(["href", "src", "srcset"]);
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto"]);
// Elements whose body is raw text or active content; body and tags both go.
const RAW_TEXT_ELEMENT =
  /<(script|style|iframe|object|embed|noscript|template|textarea|title|xmp|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const HTML_TOKEN =
  /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTRIBUTE =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  colon: ":",
  tab: "\t",
  newline: "\n",
  sol: "/",
  nbsp: "\u00a0",
};

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Text keeps entities the README already wrote (&nbsp;, &copy;) and loses
// every bare `<` that could open a tag.
const escapeText = (value) =>
  value
    .replace(/&(?!(?:#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);)/gi, "&amp;")
    .replace(/</g, "&lt;");

// Decodes the entity forms a scheme could hide behind. Returns null when an
// entity is left that this decoder does not know, so the value is dropped
// rather than guessed at.
const decodeEntities = (value) => {
  let unknown = false;
  const codePoint = (number) =>
    number > 0x10ffff ? "\ufffd" : String.fromCodePoint(number);
  // Numeric references decode with or without `;`; named ones need it, as in
  // attribute values a bare `&b=` is a query string, not an entity.
  const decoded = value.replace(
    /&(?:#x([0-9a-f]+);?|#(\d+);?|([a-z][a-z0-9]*);)/gi,
    (match, hex, dec, name) => {
      if (hex) return codePoint(parseInt(hex, 16));
      if (dec) return codePoint(parseInt(dec, 10));
      const named = NAMED_ENTITIES[name.toLowerCase()];
      if (named === undefined) unknown = true;
      return named ?? match;
    },
  );
  return unknown ? null : decoded;
};

export function isSafeUrl(value) {
  const decoded = decodeEntities(value);
  if (decoded === null) return false;
  const compact = decoded.replace(/[\u0000-\u0020\u007f]+/g, "");
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(compact);
  return !scheme || ALLOWED_SCHEMES.has(scheme[1].toLowerCase());
}

// srcset is "url descriptor, url descriptor"; checking every token keeps a
// scheme from hiding in any candidate without parsing the comma grammar.
const isSafeUrlList = (value) =>
  value.split(/[\s,]+/).every((token) => !token || isSafeUrl(token));

const serializeAttributes = (attributes) => {
  let output = "";
  for (const match of attributes.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name)) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (URL_ATTRIBUTES.has(name)) {
      const safe = name === "srcset" ? isSafeUrlList(value) : isSafeUrl(value);
      if (!safe) continue;
    }
    output += ` ${name}="${escapeHtml(decodeEntities(value) ?? "")}"`;
  }
  return output;
};

// Rebuilds the fragment from allowlisted tags only. Markdown splits inline
// HTML into unbalanced pieces (`<a href>` and `</a>` arrive as separate
// nodes), so this works tag by tag instead of parsing a document, and every
// `<` that is not part of an emitted tag is escaped so nothing else can be
// read as markup downstream.
export function sanitizeHtmlFragment(value) {
  const stripped = value.replace(RAW_TEXT_ELEMENT, "");
  let output = "";
  let last = 0;
  for (const match of stripped.matchAll(HTML_TOKEN)) {
    output += escapeText(stripped.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[0].startsWith("<!--")) continue;
    const [, closing, rawName, attributes] = match;
    const name = rawName.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue;
    if (closing) {
      if (!VOID_TAGS.has(name)) output += `</${name}>`;
    } else {
      output += `<${name}${serializeAttributes(attributes)}>`;
    }
  }
  return output + escapeText(stripped.slice(last));
}

const readmes = Object.entries(identities).map(([product, identity]) => ({
  product,
  repo: identity.repo,
  ref: identity.ref,
  readmePath: "README.md",
  output: fileURLToPath(
    new URL(`../src/content/${product}-readme.md`, import.meta.url),
  ),
}));

// Parse Markdown so links inside code examples are never rewritten.
export async function prepareReadme(
  markdown,
  { repo, ref, readmePath, product },
) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify);
  const tree = processor.parse(markdown);
  const imageReferences = new Set();
  const walk = (node, visit) => {
    visit(node);
    node.children?.forEach((child) => walk(child, visit));
  };
  walk(tree, (node) => {
    if (node.type === "imageReference") imageReferences.add(node.identifier);
  });
  const definitions = new Map();
  walk(tree, (node) => {
    if (node.type === "definition") definitions.set(node.identifier, node.url);
  });
  const resolve = (value, image) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
    const base = image
      ? `https://raw.githubusercontent.com/${repo}/${ref}/`
      : `https://github.com/${repo}/blob/${ref}/`;
    return new URL(
      value.replace(/^\//, ""),
      value.startsWith("/") ? base : base + readmePath,
    ).href;
  };
  const identity = product
    ? identities[product]
    : Object.values(identities).find((entry) => entry.repo === repo);
  if (identity) {
    const artwork = new Set(
      [
        identity.logoLight,
        identity.logoDark,
        ...identity.images.map((image) => image.src),
      ].filter(Boolean),
    );
    const matchesArtwork = (url) => artwork.has(resolve(url, true));
    const plainText = (node) => {
      if (node.type === "text") return node.value;
      if (
        ["paragraph", "emphasis", "strong", "blockquote"].includes(node.type)
      ) {
        const parts = node.children.map(plainText);
        return parts.every((part) => part !== null) ? parts.join("") : null;
      }
      return null;
    };
    const stripHtmlArtwork = (value) =>
      value.replace(
        /<picture\b[^>]*>[\s\S]*?<\/picture>|<img\b[^>]*>/gi,
        (image) => {
          const sources = [
            ...image.matchAll(/\s(?:src|srcset)=(['"])(.*?)\1/g),
          ];
          const text = image.replace(/<[^>]*>/g, "").trim();
          return sources.length &&
            !text &&
            sources.every((match) => matchesArtwork(match[2]))
            ? ""
            : image;
        },
      );
    const stripIdentity = (node) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (
          ["paragraph", "blockquote"].includes(child.type) &&
          plainText(child) === identity.species
        )
          return false;
        if (child.type === "image" && matchesArtwork(child.url)) return false;
        if (child.type === "imageReference") {
          const url = definitions.get(child.identifier);
          if (url && matchesArtwork(url)) return false;
        }
        if (child.type === "html") {
          child.value = stripHtmlArtwork(child.value);
          return Boolean(child.value.trim());
        }
        stripIdentity(child);
        return !child.children || child.children.length > 0;
      });
    };
    stripIdentity(tree);
    // When preparing a product's embedded README, strip the leading h1 so Docusaurus's
    // page title owns the single top-level h1 on the page.
    if (
      product &&
      tree.children.length > 0 &&
      tree.children[0].type === "heading" &&
      tree.children[0].depth === 1
    ) {
      tree.children.shift();
    }
  }
  walk(tree, (node) => {
    if (node.url) {
      node.url = isSafeUrl(node.url)
        ? resolve(
            node.url,
            node.type === "image" || imageReferences.has(node.identifier),
          )
        : "#";
    }
    if (node.type === "html") {
      node.value = sanitizeHtmlFragment(
        node.value.replace(
          /\s(href|src|srcset)=(['"])(.*?)\2/g,
          (_match, name, quote, value) =>
            ` ${name}=${quote}${resolve(value, name !== "href")}${quote}`,
        ),
      );
    }
  });
  walk(tree, (node) => {
    if (node.children) {
      node.children = node.children.filter(
        (child) => child.type !== "html" || child.value.trim(),
      );
    }
  });
  // Outside docs/, Docusaurus's partial loader accepts this per-file format.
  return `---\nmdx:\n  format: md\n---\n\n${processor.stringify(tree)}`;
}

export async function fetchReadme(source, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${source.readmePath}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    if (!markdown.trim()) throw new Error("empty README");
    const content = await prepareReadme(markdown, source);
    await mkdir(dirname(source.output), { recursive: true });
    await writeFile(source.output, content);
    console.log(`README refreshed: ${source.repo}@${source.ref}`);
  } catch (error) {
    console.warn(
      `README unavailable: ${source.repo}: ${error.message}; preserving the existing seed`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await Promise.all(readmes.map((source) => fetchReadme(source)));
}
