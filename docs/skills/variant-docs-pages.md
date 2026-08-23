---
title: Variant docs pages
description: Use when adding or updating a top-level docs page for a Bluefin variant or sibling project (bluefin-lts, dakota, knuckle, and future editions) — page structure, component embedding, sidebar placement, and the shipping constraints that differ from ordinary docs edits.
---

# Variant docs pages

A "variant page" is the single landing page for one OS image family:
`/lts`, `/knuckle`, `/dakota`. The reader arrived from the repo README or a
blog announcement and wants: what is this, how do I get it, what can break.

## Structure

Model on `docs/knuckle.md` (static) or `docs/dakota.mdx` (embeds components):

1. Frontmatter `title` and explicit `slug: /<name>` — the page lives at the
   site root, not under a category path.
2. One-paragraph identity: what it is, what it's built on, status callout
   (`:::info` for alpha/pre-alpha).
3. Download/install. Embed `<DakotaSection />` from
   `src/components/DownloadSectionTesting.tsx` when ISOs exist instead of
   hand-writing ISO links — the component is the single source for URLs and
   checksums.
4. Image streams table with `bootc switch` commands.
5. Known gaps + issue tracker links.
6. Live versions via `<DriverVersionsCatalog streamId="…" />` when the stream
   has a catalog (see `docs/driver-versions.mdx` for valid streamIds).
7. "Further reading" links out to repo `docs/` — deep technical content lives
   in the variant's repo, never copied here (it would rot).

Facts only, read from the repo and blog sources. Do not invent narrative or
motivation prose — see _Never write in a maintainer's voice_ in AGENTS.md.

## Sidebar

Add the doc id to the "Specialized Editions & Hardware" category in
`sidebars.ts`. The doc id is the filename without extension.

## Gotchas

- **`.md` vs `.mdx`**: any JSX component import requires `.mdx`; the sidebar
  id is identical either way.
- **`sidebars.ts` voids the doc-only push exception.** The exception covers
  `docs/**`, `blog/**`, `reports/**`, `adr/**` only — a page that adds itself
  to the sidebar always ships via PR.
- **Prettier whole-file hazard**: `npx prettier --write sidebars.ts`
  reformats unrelated lines (prettier config drift vs. the committed file).
  Make the one-line sidebar edit by hand and leave the rest of the file
  byte-identical; only `--write` the new page file.
- Verify with `npm run build:ci` and check `build/<slug>/index.html` exists
  and contains the expected strings — the minifier warnings on other pages
  are pre-existing noise.

## Checklist

- [ ] Page uses `.mdx` if it embeds components, explicit `slug` set
- [ ] Download section reuses the existing DownloadCard component, not raw links
- [ ] Sidebar diff is exactly one line
- [ ] `npm run build:ci` succeeds; `build/<slug>/index.html` spot-checked
- [ ] PR (not direct push) because `sidebars.ts` changed
