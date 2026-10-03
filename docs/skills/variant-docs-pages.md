---
name: variant-docs-pages
title: Variant docs pages
version: "1.1"
last_updated: "2026-09-06"
id: variant-docs-pages
one_line_purpose: Author and maintain top-level docs pages for image variants.
entry_point: docs/skills/variant-docs-pages.md
category: meta
status: active
tags: [variants, pages, dakota, server, utah]
description: >-
  Author and maintain top-level docs pages for Bluefin image families under
  docs/. Use when adding or updating landing pages for variants like dakota,
  server, or utah, including sidebar placement and component embedding.
metadata:
  type: procedure
---

# Variant docs pages

A "variant page" is the single landing page for one OS image family:
`/server`, `/dakota`. The reader arrived from the repo README or a
blog announcement and wants: what is this, how do I get it, what can break.

## When to Use

- Adding or updating a top-level docs page for an image variant or sibling project.
- Embedding download sections or driver version tables on variant pages.
- Adding a new variant entry into `sidebars.ts`.

## When NOT to Use

- Blog announcements for new releases — see [`blog-posts.md`](blog-posts.md).
- Dashboard panels under `/factory` — see [`factory-dashboard-content.md`](factory-dashboard-content.md).

## Core Process

Model on `docs/server.mdx` (imports its upstream README) or `docs/dakota.mdx` (embeds components):

1. **Frontmatter**: Set `title` and explicit `slug: /<name>` so the page lives at
   the site root, not under a category path.
2. **One-paragraph identity**: State what it is, what it's built on, and status
   callout (`:::info` for alpha/pre-alpha).
3. **Download/install**: Embed `<DakotaSection />` from
   `src/components/DownloadSectionTesting.tsx` when ISOs exist instead of
   hand-writing ISO links — the component is the single source for URLs and
   checksums.
4. **Image streams table**: Provide exact `bootc switch` commands.
5. **Known gaps**: Link to relevant upstream/downstream issue trackers.
6. **Live versions**: Use `<DriverVersionsCatalog streamId="…" />` when the
   stream has a catalog (see `docs/driver-versions.mdx` for valid streamIds).
7. **Further reading**: Link out to repo `docs/` — deep technical content lives
   in the variant's repo, never copied here.

Facts only, read from repo and blog sources. Do not invent narrative or
motivation prose — see _Never write in a maintainer's voice_ in `AGENTS.md`.

### README-backed pages

`docs/server.mdx` renders `projectbluefin/server/README.md` through
`src/content/server-readme.md`. The seed lives outside `docs/` so it creates
no second route and needs no sidebar or global Markdown configuration changes.
Its `mdx.format: md` frontmatter preserves ordinary Markdown and raw HTML;
the wrapper retains native headings, TOC, search, and the upstream edit link.
Keep `title` metadata for navigation; set `hide_title: true` when the README's
wordmark already supplies the visible page title.

`scripts/fetch-readmes.mjs` rewrites parsed links/images, not code examples.
Add another source to its `readmes` list to reuse it for another image.
The `prestart`, `prebuild`, and `prebuild:ci` npm hooks refresh each build
checkout, including CI shards; the separate data job cannot transfer files
outside its static JSON artifact. A failed fetch preserves the committed seed.

## Image Streams Policy

Images pages and catalog pipelines track only **`stable`** and **`testing`**
streams. Never track `:latest`. Use `sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/<family>:stable`
for stable switch instructions.

## Sidebar

Add the doc id to the `Images` category in `sidebars.ts`. The doc id
is the filename without extension.

## Gotchas

- **`.md` vs `.mdx`**: any JSX component import requires `.mdx`; the sidebar
  id is identical either way.
- **Every change ships via PR.** `main` enforces the merge queue; there is no
  direct-push path, including for pages under `docs/` or the `sidebars.ts`
  entry that adds them.
- **Prettier whole-file hazard**: `npx prettier --write sidebars.ts`
  reformats unrelated lines. Make the one-line sidebar edit by hand and leave
  the rest byte-identical; only `--write` the new page file.

## Common Rationalizations

| Rationalization                                                   | Reality                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| "I will write an introductory story for why this variant exists." | Agents format facts; maintainers author narrative. Ask or omit. |
| "I can push directly to main because I touched docs/."            | `main` enforces the merge queue; every change ships via a PR.   |
| "I'll hardcode the ISO links."                                    | Reusable download components keep hashes and links in sync.     |

## Red Flags

- Invented paragraphs about project history or maintainer intentions.
- Direct push to `main` when `sidebars.ts` was modified.
- Hardcoded download links that duplicate component data.

## Verification

- [ ] Page uses `.mdx` if it embeds components, explicit `slug` set.
- [ ] Download section reuses existing DownloadCard component, not raw links.
- [ ] Sidebar diff is exactly one line.
- [ ] `npm run build:ci` succeeds; `build/<slug>/index.html` verified.
- [ ] PR (not direct push) opened when `sidebars.ts` changed.

## Sources

- `docs/dakota.mdx`, `docs/server.mdx`, `docs/utah.mdx`
- `sidebars.ts`
- `scripts/fetch-readmes.mjs`, `src/content/server-readme.md`, `package.json`
- Docusaurus docs via Context7: `/websites/docusaurus_io`
- [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md)
