/**
 * Parser for OS release feed HTML content.
 *
 * Each item in static/feeds/bluefin-releases.json and
 * static/feeds/bluefin-lts-releases.json contains a `content` field with
 * machine-generated HTML. This module parses that HTML into structured data
 * using regex, avoiding a full DOM parser (no new dependencies).
 *
 * GTS (Good Till September) is a retired stream. Items with gts- prefixed
 * titles are skipped (return null). Cleanup tracked in castrojo/documentation
 * issue 68.
 */

import type {
  OsFeedItem,
  OsStream,
  ParsedMajorPackage,
  ParsedCommit,
  ParsedDiffEntry,
  ParsedOsRelease,
} from "../types/os-feed";

// ── HTML utilities ────────────────────────────────────────────────────────────

/** Strip HTML tags and decode basic entities to plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Stream detection ──────────────────────────────────────────────────────────

/** Returns true for retired GTS release entries. */
function isGtsItem(title: string): boolean {
  return /^gts-/i.test(title.trim());
}

/**
 * Detect the release stream from the item title.
 * Returns null for retired GTS items or unrecognized title formats.
 *
 * Bluefin publishes weekly builds tagged "stable-YYYYMMDD" (GitHub Releases).
 * These map to the "stable" stream.
 * "stable-daily" is reserved for if/when a separate daily-tagged release
 * series is published.
 */
function detectStream(title: string): OsStream | null {
  if (isGtsItem(title)) return null;
  if (/^lts[.-]/i.test(title) || /\bLTS:/i.test(title)) return "lts";
  if (/^stable-daily-/i.test(title)) return "stable-daily";
  if (/^(stable|beta)-/i.test(title)) return "stable";
  if (/^latest-/i.test(title)) return "stable-daily";
  return null;
}

// ── Metadata extraction ───────────────────────────────────────────────────────

/** Extract Fedora base version from title, e.g. "(F43.20260331, ...)" → "43". */
function extractFedoraVersion(title: string): string | null {
  const m = title.match(/\(F(\d+)\./);
  return m ? m[1] : null;
}

/**
 * Extract CentOS base version from title, e.g. "(c10s, #...)" → "c10s".
 * Present in LTS releases (CentOS Stream base).
 */
function extractCentosVersion(title: string): string | null {
  const m = title.match(/\(([a-z0-9]+s),\s*#/i);
  return m ? m[1] : null;
}

/**
 * Extract the release tag from the title.
 * Examples:
 *   "stable-20260331: Stable (...)"   → "stable-20260331"
 *   "bluefin-lts LTS: 20251223 (...)" → "lts-20251223"
 *   "lts.20251223: ..."               → "lts-20251223"
 */
function extractTag(title: string, stream: OsStream): string {
  // Compound prefix format: "stable-daily-YYYYMMDD" (two word segments before the date)
  const compoundMatch = title.match(/^([a-z]+-[a-z]+-\d{8})/i);
  if (compoundMatch) return compoundMatch[1].toLowerCase();

  // Standard prefix format: "stable-YYYYMMDD", "lts-YYYYMMDD", "lts.YYYYMMDD", "latest-YYYYMMDD"
  const prefixMatch = title.match(/^([a-z]+-[\d.]+)/i);
  if (prefixMatch) {
    let tag = prefixMatch[1].toLowerCase();
    // Normalize legacy dot format
    tag = tag.replace(/^lts\.(\d{8})$/, "lts-$1");
    // Normalize latest- prefix → stable-daily-YYYYMMDD
    tag = tag.replace(/^latest-(\d{8})$/, "stable-daily-$1");
    return tag;
  }
  // LTS alternative format: "bluefin-lts LTS: YYYYMMDD (...)"
  const ltsAltMatch = title.match(/LTS:\s*(\d{8})/i);
  if (ltsAltMatch) return `lts-${ltsAltMatch[1]}`;
  return stream;
}

// ── Section extraction (HTML) ─────────────────────────────────────────────────

/**
 * Extract named sections from the release HTML.
 * The feed HTML is structured as: <h3>Heading</h3><table>...</table> blocks.
 * Returns a Map of section heading text → table HTML string.
 *
 * Table count per item varies (5–6 tables). This approach identifies each
 * table by its preceding heading rather than by position index.
 */
function extractSections(html: string): Map<string, string> {
  const sections = new Map<string, string>();
  const sectionRe = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(<table[\s\S]*?<\/table>)/gi;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(html)) !== null) {
    const heading = stripHtml(m[1]);
    sections.set(heading, m[2]);
  }
  return sections;
}

// ── Markdown parsers ──────────────────────────────────────────────────────────

/** Strip Markdown inline formatting: bold, links, inline code. */
function stripMd(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
    .replace(/\*\*([^*]*)\*\*/g, "$1")        // **bold** → text
    .replace(/`([^`]+)`/g, "$1")              // `code` → text
    .trim();
}

/** Split a Markdown table row into trimmed cell strings. */
function splitMdRow(line: string): string[] {
  return line.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
}

/** Returns true if a row is a separator line (| --- | --- |). */
function isMdSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-+:?$/.test(c));
}

/**
 * Extract named sections from Markdown release body.
 * Returns a Map of section heading text → array of cell-arrays (one per data row).
 * Heading links are stripped: "### [Dev Experience Images](url)" → "Dev Experience Images".
 */
function extractSectionsMd(content: string): Map<string, string[][]> {
  const sections = new Map<string, string[][]>();
  const lines = content.split(/\r?\n/);
  let currentHeading: string | null = null;
  let currentRows: string[][] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(.*)/);
    if (headingMatch) {
      if (currentHeading !== null && currentRows.length > 0) {
        sections.set(currentHeading, currentRows);
      }
      currentHeading = stripMd(headingMatch[1]);
      currentRows = [];
      continue;
    }
    if (currentHeading !== null && line.startsWith("|")) {
      const cells = splitMdRow(line);
      if (isMdSeparatorRow(cells)) continue; // skip | --- | rows
      currentRows.push(cells);
    }
  }
  if (currentHeading !== null && currentRows.length > 0) {
    sections.set(currentHeading, currentRows);
  }
  return sections;
}

/** Parse Markdown 2-column [Name, Version] rows. */
function parseTwoColTableMd(rows: string[][]): ParsedMajorPackage[] {
  const results: ParsedMajorPackage[] = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const name = stripMd(cells[0]);
    if (!name || name === "Name") continue;
    const versionRaw = stripMd(cells[1]);
    const parts = versionRaw.split(/\s*➡️?\s*/u).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      results.push({ name, version: parts[parts.length - 1], prevVersion: parts[0] });
    } else {
      results.push({ name, version: versionRaw, prevVersion: null });
    }
  }
  return results;
}

/** Parse Markdown commits rows: [Hash, Subject] or [Hash, Subject, Author]. */
function parseCommitsTableMd(rows: string[][]): ParsedCommit[] {
  const results: ParsedCommit[] = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const hashCell = cells[0];
    // Extract URL from [text](url) in hash cell
    const urlMatch = hashCell.match(/\(https:\/\/github\.com\/([^)]+)\)/);
    const url = urlMatch ? `https://github.com/${urlMatch[1]}` : null;
    const hash = stripMd(hashCell);
    if (!hash || hash === "Hash") continue;
    const subject = stripMd(cells[1]);
    if (!subject) continue;
    const author = cells[2] ? stripMd(cells[2]) || null : null;
    results.push({ hash, url, subject, author });
  }
  return results;
}

/** Parse Markdown 4-column [emoji, Name, Previous, New] diff rows. */
function parseFourColDiffTableMd(rows: string[][]): ParsedDiffEntry[] {
  const results: ParsedDiffEntry[] = [];
  for (const cells of rows) {
    if (cells.length < 4) continue;
    const emojiText = cells[0].trim();
    const name = stripMd(cells[1]);
    if (!name || name === "Name") continue;
    const prevVersion = stripMd(cells[2]) || null;
    const newVersion = stripMd(cells[3]) || null;
    let indicator: ParsedDiffEntry["indicator"] = "changed";
    if (emojiText.includes("✨") || (!prevVersion && newVersion)) indicator = "added";
    else if (emojiText.includes("❌") || (prevVersion && !newVersion)) indicator = "removed";
    results.push({ indicator, name, prevVersion, newVersion });
  }
  return results;
}

// ── Table parsers ─────────────────────────────────────────────────────────────

/**
 * Parse a 2-column [Name, Version] table into major package entries.
 * Version cells may contain "old ➡️ new" for changed packages.
 * The ➡️ split uses a tolerant regex to handle Unicode/spacing variants.
 */
function parseTwoColTable(tableHtml: string): ParsedMajorPackage[] {
  const results: ParsedMajorPackage[] = [];
  const rowRe = /<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const name = stripHtml(m[1]);
    if (!name || name === "Name") continue;
    const versionRaw = stripHtml(m[2]);
    // Tolerant split on ➡️ with optional surrounding whitespace
    const parts = versionRaw.split(/\s*➡️?\s*/u).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      results.push({
        name,
        version: parts[parts.length - 1],
        prevVersion: parts[0],
      });
    } else {
      results.push({ name, version: versionRaw, prevVersion: null });
    }
  }
  return results;
}

/**
 * Parse the Commits table.
 * Stable feed: 3 columns [Hash, Subject, Author].
 * LTS feed: 2 columns [Hash, Subject] — author is optional.
 *
 * Commit href URLs are allow-listed to https://github.com/ only.
 */
function parseCommitsTable(tableHtml: string): ParsedCommit[] {
  const results: ParsedCommit[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const rowInner = m[1];
    const cells: string[] = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowInner)) !== null) {
      cells.push(cm[1]);
    }
    if (cells.length < 2) continue;

    // Hash cell: extract short hash text and GitHub commit URL (allow-listed)
    const hashHtml = cells[0];
    const urlMatch = hashHtml.match(/href="(https:\/\/github\.com\/[^"]+)"/i);
    const url = urlMatch ? urlMatch[1] : null;
    const hash = stripHtml(hashHtml).trim();
    if (!hash || hash === "Hash") continue;

    const subject = stripHtml(cells[1]).trim();
    if (!subject) continue;

    const author = cells[2] ? stripHtml(cells[2]).trim() || null : null;

    results.push({ hash, url, subject, author });
  }
  return results;
}

/**
 * Parse a 4-column [emoji, Name, Previous, New] full package diff table.
 * Emoji indicators: ✨ = added, 🔄 = changed, ❌ = removed.
 * Indicator falls back to presence/absence of version fields.
 */
function parseFourColDiffTable(tableHtml: string): ParsedDiffEntry[] {
  const results: ParsedDiffEntry[] = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const rowInner = m[1];
    const cells: string[] = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowInner)) !== null) {
      cells.push(cm[1]);
    }
    if (cells.length < 4) continue;

    const emojiText = stripHtml(cells[0]).trim();
    const name = stripHtml(cells[1]).trim();
    if (!name || name === "Name") continue;

    const prevVersion = stripHtml(cells[2]).trim() || null;
    const newVersion = stripHtml(cells[3]).trim() || null;

    let indicator: ParsedDiffEntry["indicator"] = "changed";
    if (emojiText.includes("✨") || (!prevVersion && newVersion)) {
      indicator = "added";
    } else if (emojiText.includes("❌") || (prevVersion && !newVersion)) {
      indicator = "removed";
    }

    results.push({ indicator, name, prevVersion, newVersion });
  }
  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a single OS feed item into a structured ParsedOsRelease.
 *
 * Returns null if:
 *  - The item is a retired GTS release (title starts with "gts-").
 *  - The stream cannot be detected from the title.
 *  - The HTML contains no major packages AND no full diff entries
 *    (structural failure — the release is not useful to display).
 *
 * Missing sections produce empty arrays, not null.
 *
 * @param item       Raw feed item.
 * @param streamHint Override stream detection — pass when the source file
 *                   already identifies the stream (e.g. "lts" for items from
 *                   bluefin-lts-releases.json).
 */
export function parseOsRelease(
  item: OsFeedItem,
  streamHint?: OsStream,
): ParsedOsRelease | null {
  const stream = streamHint ?? detectStream(item.title);
  if (!stream) return null;

  // GitHub Releases API returns Markdown; Atom feed returns HTML.
  // Detect by presence of Markdown table separator rows.
  const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(item.content);

  let majorPackages: ParsedMajorPackage[];
  let dxPackages: ParsedMajorPackage[];
  let gdxPackages: ParsedMajorPackage[];
  let commits: ParsedCommit[];
  const fullDiff: ParsedDiffEntry[] = [];

  if (isMarkdown) {
    const mdSections = extractSectionsMd(item.content);
    majorPackages = parseTwoColTableMd(mdSections.get("Major packages") ?? []);
    dxPackages = parseTwoColTableMd(mdSections.get("Major DX packages") ?? []);
    gdxPackages = parseTwoColTableMd(mdSections.get("Major GDX packages") ?? []);
    commits = parseCommitsTableMd(mdSections.get("Commits") ?? []);
    for (const heading of ["All Images", "Base Images", "Dev Experience Images"]) {
      const rows = mdSections.get(heading);
      if (rows) fullDiff.push(...parseFourColDiffTableMd(rows));
    }
  } else {
    const sections = extractSections(item.content);
    majorPackages = parseTwoColTable(sections.get("Major packages") ?? "");
    dxPackages = parseTwoColTable(sections.get("Major DX packages") ?? "");
    gdxPackages = parseTwoColTable(sections.get("Major GDX packages") ?? "");
    const commitsHtml = sections.get("Commits") ?? "";
    commits = commitsHtml ? parseCommitsTable(commitsHtml) : [];
    for (const heading of ["All Images", "Base Images", "Dev Experience Images"]) {
      const tableHtml = sections.get(heading);
      if (tableHtml) fullDiff.push(...parseFourColDiffTable(tableHtml));
    }
  }

  if (majorPackages.length === 0 && fullDiff.length === 0) return null;

  // Backfill: any majorPackage or dxPackage that changed but is absent from fullDiff
  // gets a synthetic "changed" entry so the collapsible list shows the full upgrade path.
  const fullDiffNames = new Set(fullDiff.map((e) => e.name.toLowerCase()));
  for (const pkg of [...majorPackages, ...dxPackages, ...gdxPackages]) {
    if (pkg.prevVersion && !fullDiffNames.has(pkg.name.toLowerCase())) {
      fullDiff.unshift({
        indicator: "changed",
        name: pkg.name,
        prevVersion: pkg.prevVersion,
        newVersion: pkg.version,
      });
      fullDiffNames.add(pkg.name.toLowerCase());
    }
  }

  const tag = extractTag(item.title, stream);

  return {
    stream,
    tag,
    githubUrl: item.link,
    fedoraVersion: extractFedoraVersion(item.title),
    centosVersion: extractCentosVersion(item.title),
    majorPackages,
    dxPackages,
    gdxPackages,
    commits,
    fullDiff,
  };
}
