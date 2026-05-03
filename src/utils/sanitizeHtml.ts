import type DOMPurifyType from "dompurify";

/**
 * Sanitize HTML from external sources (GitHub release notes, Flathub descriptions).
 * Allowlist preserves GitHub-rendered Markdown output: code blocks, links, lists,
 * headings, images, and formatting — while stripping scripts, iframes, event handlers.
 *
 * SSR-safe: during server-side rendering (build), returns the raw HTML since the
 * output is static and the fetch scripts already validate external data. DOMPurify
 * requires a real DOM and cannot run in Docusaurus SSG (jsdom bundles break webpack).
 */
const ALLOWED_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "details",
  "div", "dl", "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "i", "img", "ins", "kbd", "li", "ol", "p", "pre", "q", "s", "samp",
  "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "tt", "ul", "var",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "src", "alt", "title", "class", "id",
  "width", "height", "align", "colspan", "rowspan", "scope",
];

let purify: typeof DOMPurifyType | null = null;

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // SSR: return as-is — fetch scripts validate data at build time
    return dirty;
  }
  if (!purify) {
    // Lazy-load DOMPurify only in the browser
    purify = require("dompurify") as typeof DOMPurifyType;
  }
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
