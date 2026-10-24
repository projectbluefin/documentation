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
Keep `title` in frontmatter for navigation and metadata. When an image logo already contains the product wordmark, set `hide_title: true` so the visual page header avoids duplicate title text while `<ImageIdentity>` preserves an accessible screen-reader `<h1>`.
`scripts/fetch-readmes.mjs` strips leading `# Title` headings and scale comparison silhouettes from imported product READMEs so the landing page retains a clean single-character identity and flow.
`scripts/fetch-readmes.mjs` rewrites parsed links/images, not code examples.
It reads its source list from `src/components/image-identities.json`.
Because `format: md` passes raw HTML through to the page and the seeds are
refreshed by every scheduled build with no review here, the importer keeps
only the tag/attribute allowlist in `ALLOWED_TAGS`/`ALLOWED_ATTRIBUTES`
(the `scripts/fetch-feeds.js` list plus `<picture>`/`<source>`), drops
`style`, `on*` handlers, comments and `<script>`-class elements, and limits
link/image destinations to `http`, `https`, `mailto` or relative paths. If an
upstream README needs another tag, extend the allowlist with a test rather
than bypassing it.
The `prestart`, `prebuild`, and `prebuild:ci` npm hooks refresh README seeds in
each build checkout, including CI shards; a failed fetch preserves the
committed seed. Set `custom_edit_url` to the upstream README on pages whose
prose is that README; otherwise the global `editUrl` opens an imports-only MDX
file.

`static/data/image-releases.json` is different: it is gitignored with no seed.
`fetch-image-releases` runs once in `fetch-data:independent` (authenticated)
and reaches build shards through the `site-data` artifact, before `Typecheck`.
Never generate it from a `pre*` hook: `Typecheck` runs before `build:ci`, and
shards lack `GITHUB_TOKEN`, so each would hit the anonymous API rate limit.

### Composite Image Pages (5-Section Template)

Product image pages (`/server`, `/classic`, `/dakota`, `/utah`, `/lts`) follow
a unified 5-part composition:

1. `<ImageIdentity product="..." />`: Template owns species identity, Wikipedia
   silhouettes, theme-adaptive artwork, and QA evidence. Per product,
   `image-identities.json` holds `image` (bootc ref, `""` when none),
   `headless`, `testsuiteScreenshot` (`""` when testsuite publishes no
   `-latest` capture), and `testsuiteRun`. Keep every key on every product:
   `ImageProduct` is a union of the entries, so a missing key fails typecheck.
   Caption captures as what they are; no pass/fail claim without status data.
2. Upstream README import (`src/content/*-readme.md`): Stripped of duplicate
   identity headers and leading `# Title` by `scripts/fetch-readmes.mjs`.
3. `## Downloads & Image Versions`: `<ProductDownloadsAndVersions />` displays
   major component cards with bump badges, plus available ISO cards (Stable
   and/or Testing depending on image type) or versioned installer/DDI/netboot cards
   for Bluefin Server.
   Installer publication channel differs from embedded payload channel (e.g.
   Dakota stable payload served from the testing CDN).
4. `## Usage`: `<PerImageUsage />` embeds first-party daily active systems with
   per-family filtering and explicit unavailable fallbacks.
5. `## Release Assets & Attestations`: `<ProductReleaseAssets />` renders
   downloadable release artifacts, bootc/DDI switches, and provenance verification,
   with a left-rail timeline of the latest releases for Server.

Keep headings as Markdown `##` in the `.mdx` file so Docusaurus's build-time AST
populates the right-hand Table of Contents.

## Image Streams Policy

Images pages and catalog pipelines track only **`stable`** and **`testing`**
streams. Never track `:latest`. Use `sudo bootc switch --enforce-container-sigpolicy ghcr.io/projectbluefin/<family>:stable`
for stable switch instructions.

## Sidebar

Add the doc id to the `Images` category in `sidebars.ts`. The doc id
is the filename without extension. For variants broken out into their own
top-level collapsible section (such as Bluefin Server), configure a dedicated
top-level category object in `sidebars.ts` with `collapsed: true`, `link: { type: "doc", id: "<landing>" }`,
and child guide pages nested under `items`. Unlisting a variant from navigation removes
only its sidebar ID entry; its page file under `docs/` and root slug route
remain accessible.

## Image Cards Catalog

The `/images` catalog displays active image families via `<ImageCards />`
(`src/components/ImageCards.tsx`) grouped into `preferred` and `other`.
When retiring or unlisting a variant from the images page catalog, remove its
card entry from `IMAGES` in `ImageCards.tsx`.

## Gotchas

- **`.md` vs `.mdx`**: any JSX component import requires `.mdx`; the sidebar
  id is identical either way.
- **Every change ships via PR.** `main` enforces the merge queue; there is no
  direct-push path, including for pages under `docs/` or the `sidebars.ts`
  entry that adds them.
- Prettier whole-file hazard: `npx prettier --write sidebars.ts`
  reformats unrelated lines. Make the one-line sidebar edit by hand and leave
  the rest byte-identical; only `--write` the new page file.
- **`mdx.format: md` for imported Markdown**: Upstream `.md` pages imported under
  `docs/` containing CLI placeholders (`<ver>`), paths (`</usr>`), or URL brackets
  (`<https://...>`) must specify `mdx:\n  format: md` in frontmatter. Without it,
  Docusaurus compiles `.md` as MDX and JSX tag parsing fails the build.
- **Intra-repository link resolution**: When importing documentation guides from a
  sibling repository, intra-repo links split two ways:
  1. Links targeting imported siblings resolve to local documentation routes (e.g., `/server/<name>`).
  2. Links targeting non-imported assets, element files, or un-imported documentation
     must resolve to upstream GitHub URLs pinned to the commit or branch.
- **Sysadmin runbook tone over agent scaffolding**: Server and variant operator
  guides must be written for working Linux sysadmins. Strip agent scaffolding
  ("When to Use", meta checklists, build-element inventories, and verbose rationales).
  Lead with the command or architecture state, keep command and rollback safety
  explicit, and link build-time recipes to upstream repositories. When headings
  are simplified, place explicit HTML anchors (`<a id="..."></a>`) so legacy links
  do not 404.
- **Container execution context**: Label host and guest command blocks. Check
  the launcher's own command resolution as well as the target program: a
  package-installed launcher may enter a container before its recipe starts.
  Keep public operator procedures here and link from upstream agent skills
  instead of mirroring their internal implementation notes.

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
