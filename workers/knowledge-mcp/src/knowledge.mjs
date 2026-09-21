// Parser for the Hive knowledge export.
//
// Structure, verified against the live 468 KB export:
//   # Agent Knowledge          <- preamble
//   ## Patterns                <- the one real category heading
//   ### <title>                <- entry delimiter (1706 of them)
//   ...body...                 <- MAY CONTAIN its own `## Summary`/`## Problem`
//   - File: path               <- optional, repeatable
//   Tags: a, b, 283)           <- optional, and carries parser junk from upstream
//
// `##` is NOT a usable category axis: imported documents bring their own
// `## Summary` / `## Problem` headings inside an entry body. `### ` is the only
// reliable boundary.

/** Entries carrying this tag are never published. */
export const BLOCKED_TAG = "security";

/** Every repository cited by the corpus lives under this org. */
export const ORG = "projectbluefin";

/** Tags that mark an entry as a curated per-repository convention record. */
export const CONVENTION_TAGS = ["conventions", "convention"];

// Repo slugs are lowercase words joined by single hyphens: `utah-packages`,
// `bluefin-lts`, `actions`.
const REPO_SLUG = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";

// The export carries no structured citation fields. What it does carry, on most
// entries, is a title that opens with `<repo>#<number>` — `utah-packages#46: …`,
// `bluefin-lts#511: …`. That prefix is the only reliable citation in the corpus,
// so it is what `number` is derived from. Anchored on purpose: a bare `#123`
// deeper in a title usually refers to something other than the entry's subject.
const LEADING_CITATION = new RegExp(`^(?:${ORG}/)?(${REPO_SLUG})#(\\d+)\\b`, "i");

// For *filtering* a weaker signal is enough: any `projectbluefin/<repo>` or
// `<repo>#<n>` mention anywhere in the title or body associates the entry with
// that repo.
const REPO_MENTION = new RegExp(`${ORG}/(${REPO_SLUG})|\\b(${REPO_SLUG})#\\d+`, "gi");

/** `projectbluefin/actions`, `Actions` and `actions` all mean the same repo. */
export function normalizeRepo(repo) {
  if (!repo) return null;
  const trimmed = String(repo).trim().toLowerCase();
  const slug = trimmed.startsWith(`${ORG}/`) ? trimmed.slice(ORG.length + 1) : trimmed;
  return new RegExp(`^${REPO_SLUG}$`).test(slug) ? slug : null;
}

/**
 * GitHub resolves `/issues/<n>` for a pull request by redirecting to the PR, so
 * one URL shape is correct without the export telling us which kind it is.
 */
export function citationUrl(repo, number) {
  return `https://github.com/${ORG}/${repo}/issues/${number}`;
}

/** `{repo, number, url}` from a `<repo>#<number>` title prefix, else null. */
export function parseCitation(title) {
  const m = LEADING_CITATION.exec(title ?? "");
  if (!m) return null;
  const repo = m[1].toLowerCase();
  const number = Number(m[2]);
  return { repo, number, url: citationUrl(repo, number) };
}

/** Every repo the entry mentions, citation first. Used by the `repo` filter. */
export function mentionedRepos(text, citation) {
  const found = new Set();
  if (citation) found.add(citation.repo);
  for (const m of String(text ?? "").matchAll(REPO_MENTION)) {
    const slug = (m[1] ?? m[2] ?? "").toLowerCase();
    // Two characters is a false-positive magnet (`a#1`), and no org repo is
    // that short.
    if (slug.length >= 3) found.add(slug);
  }
  return [...found];
}

/**
 * Vulnerability language that must never reach a public index untagged.
 * The corpus already contains a live security-gate bypass, so an entry that
 * reads like a vuln but escaped the `security` tag is treated as a build
 * failure rather than published.
 */
export const VULN_PATTERN =
  /CVE-\d{4}|unpatched|0-day|zero-day|exploit|evades|bypass(?:es|ed)?\b/i;

const TAG_SHAPE = /^[a-z][a-z0-9._-]*$/i;

/** Upstream leaks issue numbers and code fragments into `Tags:`. Drop them. */
function cleanTags(raw) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && TAG_SHAPE.test(t))
    .map((t) => t.toLowerCase());
}

/**
 * @param {string} markdown Raw export.
 * @returns {{entries: object[], dropped: number, violations: object[], total: number}}
 */
export function parseKnowledge(markdown) {
  const lines = markdown.split("\n");
  const firstEntry = lines.findIndex((l) => l.startsWith("### "));
  if (firstEntry === -1) throw new Error("no `### ` entries found — export shape changed");

  // The only meaningful category heading precedes the first entry.
  const category =
    lines
      .slice(0, firstEntry)
      .filter((l) => l.startsWith("## "))
      .pop()
      ?.slice(3)
      .trim() ?? "Knowledge";

  const entries = [];
  const violations = [];
  let dropped = 0;
  let current = null;

  const flush = () => {
    if (!current) return;
    const tagLine = current.body.find((l) => l.startsWith("Tags: "));
    const tags = tagLine ? cleanTags(tagLine.slice(6)) : [];
    const files = current.body
      .filter((l) => l.startsWith("- File: "))
      .map((l) => l.slice(8).trim());
    const body = current.body
      .filter((l) => !l.startsWith("Tags: "))
      .join("\n")
      .trim();

    const entry = { title: current.title, body, tags, files, category };
    const searchable = `${entry.title}\n${entry.body}`;

    // Citation fields are derived once, here, so the request path never pays
    // for them — the Worker has a 10 ms CPU budget and ~1700 entries to read.
    const citation = parseCitation(entry.title);
    if (citation) {
      entry.repo = citation.repo;
      entry.number = citation.number;
      entry.url = citation.url;
    }
    entry.repos = mentionedRepos(searchable, citation);

    if (tags.includes(BLOCKED_TAG)) {
      dropped++;
    } else if (VULN_PATTERN.test(searchable)) {
      violations.push({ title: entry.title, tags });
    } else {
      entries.push(entry);
    }
    current = null;
  };

  for (let i = firstEntry; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      flush();
      current = { title: line.slice(4).trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  flush();

  return { entries, dropped, violations, total: entries.length + dropped + violations.length };
}

/**
 * Rank entries against a query. Title hits and tag hits outweigh body hits.
 *
 * @param {object[]} entries
 * @param {string} query
 * @param {number} limit
 * @param {{repo?: string}} [options] `repo` narrows to entries mentioning that
 *   repository, so a per-repo agent does not page through other repos' findings.
 */
export function searchEntries(entries, query, limit, options = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const repo = normalizeRepo(options.repo);
  const pool = repo ? entries.filter((e) => (e.repos ?? []).includes(repo)) : entries;

  return pool
    .map((e) => {
      const title = e.title.toLowerCase();
      const body = e.body.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 10;
        if (e.tags.some((tag) => tag.includes(t))) score += 5;
        if (body.includes(t)) score += 1;
      }
      return { entry: e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}

/**
 * Curated convention records for one repository.
 *
 * Sourced from the knowledge base, not from GitHub, so the Worker still needs
 * no token. An entry qualifies when it mentions the repo and is tagged
 * `conventions`. A missing or wrong record is therefore a knowledge-base fix
 * upstream in Hive, not a change to this Worker.
 */
export function conventionsFor(entries, repo, limit) {
  const slug = normalizeRepo(repo);
  if (!slug) return [];
  return entries
    .filter(
      (e) =>
        (e.repos ?? []).includes(slug) &&
        e.tags.some((tag) => CONVENTION_TAGS.includes(tag)),
    )
    .slice(0, limit);
}
