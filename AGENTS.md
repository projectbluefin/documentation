# Bluefin Documentation Agent Guide

**Repository:** `projectbluefin/documentation`

**Production site:** <https://docs.projectbluefin.io/>

**Framework:** Docusaurus 3.10.x, TypeScript, React 19, Node 24

This guide governs what an agent may change in this repository and how that change
gets authorized, validated, and shipped. Read the boundary first — it decides
whether you may act at all.

## The boundary

This repository has two modes of work. Every task is in exactly one of them.

### Default mode: content only

Unless a task carries an approved design decision (below), you edit **content
only**.

**Content** is prose, frontmatter, links, alt text and captions, blog metadata,
authors, report text, static asset files placed in an existing asset slot, and
registered content items added to an existing component in that component's
existing format.

**Design** is layout, CSS, component behavior, animation, page structure, JSX or
HTML structure, routes, navigation, data shapes, fetch timing, API endpoints, and
fallback behavior.

In default mode, do not change design to satisfy a content request. If the request
cannot be completed without a design change, **stop and escalate** — do not
approximate it with markup, inline styles, or a parallel component.

### Authorized mode: design changes with a written decision

A design change is permitted when — and only when — it traces to an **approved
design decision** recorded in `adr/`. That record is the authorization. Without
it, you are in default mode.

When implementing an approved decision:

- Implement what the decision specifies, and nothing beyond it.
- Cite the decision file in the commit body and the pull request description.
- If implementation reveals that the decision is wrong, incomplete, or impossible,
  **stop and report back**. Do not amend the decision yourself and do not
  improvise around it.

This mode exists so that approved design work can be delegated. It is not a
loophole: an agent may not author its own authorization, and "the maintainer said
so in chat" is not a design decision. The record must exist in `adr/` before code
is written.

### Escalating

To escalate, state plainly: what was requested, which specific design element it
requires, why it cannot be done as content, and the options you can see. Do not
pick one and build it. A maintainer turns that into an `adr/` record, or declines
it.

See `adr/README.md` for the format and `adr/0001-agent-design-authorization.md`
for the decision that established this model.

## Repository map

Source of truth is the repository, not the built site. `build/` is generated
output and is gitignored — never read it as a reference for what exists, and never
edit it. Routes come from `docusaurus.config.ts`, `sidebars.ts`, and the files in
`docs/` and `src/pages/`.

The docs plugin is mounted at `routeBasePath: "/"`. **Every file under `docs/`
becomes a published page.** Never put internal notes, planning documents, or
design records in `docs/` — that is why `adr/` sits at the repository root.

| Area                             | Location                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Getting Started                  | `docs/index.md`, `introduction.md`, `downloads.mdx`, `installation.md`, `FAQ.md`                     |
| Using Bluefin                    | `docs/administration.md`, `tips.mdx`, `ai.md`, `command-line.md`, `images.md`, `troubleshooting.mdx` |
| Developer Experience             | `docs/bluefin-dx.md`, `bluefin-gdx.mdx`                                                              |
| Specialized editions             | `docs/lts.mdx`, `t2-mac.md`, `knuckle.md`                                                            |
| Community                        | contribution, testing, donations, artwork, music, and related pages listed in `sidebars.ts`          |
| Blog                             | `blog/`                                                                                              |
| Monthly reports                  | `reports/` (mounted at `/reports`)                                                                   |
| Agent skill guides               | `docs/skills/` — note these publish, like everything under `docs/`                                   |
| Custom pages                     | `src/pages/` (`changelogs.tsx`, `hive.tsx`)                                                          |
| Design decisions (not published) | `adr/`                                                                                               |

The production navbar also exposes Ask Bluefin, Blog, Changelogs, Reports, Hive,
Discussions, Feedback, and Store. Confirm a route in `docusaurus.config.ts` or
`sidebars.ts` before documenting it. Do not add a route or navigation item for a
feature that is not present in the source.

## Editing content pages

Edit Markdown or MDX in `docs/`. Preserve existing frontmatter and page structure
unless the task is specifically about content metadata. Keep existing components
and their props. Do not replace an existing component with handwritten markup.

Writing conventions:

- One H1, with H2 sections below it.
- Imperative instructions for procedures.
- Fenced code blocks with a language tag.
- Link to upstream documentation instead of copying generic Linux, GNOME, Flatpak,
  Podman, Distrobox, or Fedora reference material.
- State Bluefin-specific defaults and exceptions here.
- Short paragraphs. Remove claims the source does not support.

Do not add a new page when an existing page owns the topic. An approved new page
needs the source file, frontmatter, and a `sidebars.ts` entry — added without
changing sidebar styling or component behavior.

## Blog posts and reports

Blog posts live in `blog/`. Edits change prose and metadata only; do not change
blog layout, post components, or CSS to present new content. Keep frontmatter
valid, and register new authors in `blog/authors.yaml`.

Do not use future dates as a publishing mechanism. Keep an unfinished post
`draft: true` or `unlisted: true`, and remove the flag when it should ship.

Monthly reports in `reports/` are generated by the report workflow. Edit one only
when the task explicitly concerns generated report content, and never rewrite the
generator to reword a single report.

## Dinosaurs and artwork

The dinosaur character page is `docs/dinosaurs.md`. To add a character, edit only
that file, following the existing section format:

1. Add the heading.
2. Add `Name`, `Role`, and `Species` fields.
3. Add the supplied image with Markdown image syntax.
4. Add the species link when one exists.
5. Preserve the page's existing order and wording style.

Do not edit `src/components/ArtworkGallery.tsx`, its CSS, or any other component
to add a character, and do not invent a new card, grid, animation, image
placement, or metadata field. A supplied asset that needs new visual treatment is
a design change — escalate it.

The artwork gallery is `docs/artwork.mdx`, backed by generated
`static/data/artwork.json`. Do not hand-edit that data unless the task explicitly
changes the generator or the registered artwork source.

## Data-backed pages

These pages render fetched or generated data. Edit the source and pipeline, never
generated output. Content edits must not alter components, CSS, fetch timing, API
endpoints, or fallback behavior. If the content does not fit the existing data
shape, that is a design decision — escalate it.

| Page or feature | Source or component                                                    | Data                                 |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| Changelogs      | `src/pages/changelogs.tsx`                                             | release feeds and SBOM data          |
| Images          | `docs/images.md`, `src/components/ImagesCatalog.tsx`                   | `static/data/images.json`            |
| Driver versions | `docs/driver-versions.mdx`, `src/components/DriverVersionsCatalog.tsx` | `static/data/driver-versions.json`   |
| Artwork         | `docs/artwork.mdx`, `src/components/ArtworkGallery.tsx`                | `static/data/artwork.json`           |
| Music           | `docs/music.md`, `src/components/MusicPlaylist.tsx`                    | `static/data/playlist-metadata.json` |
| Donations       | `docs/donations/*.mdx`, profile and project components                 | GitHub profile and repo data         |
| Hive            | `src/pages/hive.tsx` → `src/components/HiveFactoryDashboard.tsx`       | see below                            |

### Hive specifics

`src/pages/hive.tsx` renders `HiveFactoryDashboard` only.
`src/components/HiveDashboard.tsx` is **not imported anywhere** and does not ship;
do not treat it as live code or update it to match a change elsewhere.

`HiveFactoryDashboard` reads three build-time files and one runtime source:

| Source                            | Produced by                                                          | Tracked in git |
| --------------------------------- | -------------------------------------------------------------------- | -------------- |
| `static/data/hive-history.json`   | `scripts/fetch-hive-history.js` (needs `HIVE_API_TOKEN`)             | yes, CI seed   |
| `static/data/registry-data.json`  | `scripts/fetch-registry-data.js`                                     | no             |
| `static/data/hive-live-data.json` | `scripts/fetch-hive-live-data.js` (needs `GITHUB_TOKEN`)             | no             |
| Queue data                        | hosted instance, falling back to `queue.projectbluefin.io/data.json` | n/a            |

Every one of these degrades silently to an unavailable state by design. Because
two of the three files are untracked, **local builds and production fail
differently** — verify a data-related change in both rather than assuming a clean
local render means production is fine.

## Static assets

Put site assets in `static/img/` and reference them with root-relative paths such
as `/img/example.webp`. Use an existing asset slot and existing component. Do not
change image dimensions, layout rules, responsive behavior, or asset presentation
to accommodate a new file.

Blog images live under `static/img/blog/<post-slug>/`. When a post ships the wrong
screenshot, overwrite the file in place and keep the filename so the `BlogFigure`
`src`, `alt`, and `caption` stay valid. Edit the MDX only when `alt` or `caption`
no longer describes the new image. Never add a second figure to work around a
wrong one.

`/static/data/*.json` is gitignored except for explicitly listed CI seeds. Do not
commit generated data or `static/feeds/` output. The SBOM seeds are load-bearing
and must remain present:

- `static/data/sbom-attestations.json`
- `static/data/sbom-attestations-frontend.json`

## Automation

`.github/workflows/open-discussion.yml` creates the matching Giscus Discussion in
`ublue-os/bluefin` — the same repository `src/components/GiscusComments` points
at. It uses the existing repository secret `BLUEFIN_DISCUSSIONS_TOKEN`; do not
introduce a new token, GitHub App, or cross-repository credential scheme. The
secret needs Discussion write access in `ublue-os/bluefin`. If it is unavailable,
the workflow must fail explicitly rather than report success without creating a
discussion.

Follow [`docs/skills/giscus-discussions.md`](docs/skills/giscus-discussions.md)
when verifying, recovering, or archiving a blog discussion. Restore the existing
secret and rerun the workflow first; a maintainer may use the documented GraphQL
recovery only when the post is live and the normal workflow cannot create the
discussion.

`workers/countme-proxy/` is a separate public Cloudflare Worker service, not site
content. Do not touch it during a documentation or artwork task. If a worker task
is explicit, follow its tests and deployment instructions in `README.md`, and do
not change site design as part of that work.

## Build and validation

Validation confirms content renders in the existing production design. It is not a
license to change layout, styling, components, or behavior.

Install dependencies once:

```bash
npm install --legacy-peer-deps
```

Run the lightest checks that cover the edit. For most content changes:

```bash
npx prettier --check <paths you changed>   # see the note below
npm run typecheck                          # tsc
npm run lint                               # eslint .
npm test                                   # node --test scripts/*.test.js
npm run build                              # fetches data, then docusaurus build
```

**Formatting:** `npm run prettier-lint` runs `prettier --check .` across the whole
repository, where roughly 150 files already fail. It cannot pass, and it is not a
usable gate. Check only the paths you changed, and format them with
`npx prettier --write <paths>`. Do not reformat files your task did not touch — a
repo-wide `npm run prettier` would bury your change in an unreviewable diff.

**Components:** `npm test` covers `scripts/*.test.js` only, but presentational
components can be tested there too without adding tooling. See
[`docs/skills/component-testing.md`](docs/skills/component-testing.md).

`npm run build` fetches remote data first. Set `GITHUB_TOKEN` or `GH_TOKEN` when
the fetch scripts need authenticated GitHub API access. For a fast local preview
once data exists, use `just dev` from the `Justfile`.

Review the rendered page after building and confirm the requested prose, link,
image, or registered item appears. Do not fix a rendering problem by changing
design code during a content task — that is an escalation.

## Git, remotes, and production

Work on a topic branch. Do not push directly to `main` on your own initiative.
Keep the change limited to content files and the required metadata or data source,
and never sweep in unrelated working-tree changes. Inspect the exact staged paths
before committing, and use a Conventional Commit such as
`docs: update dinosaur character list`.

`upstream` is `projectbluefin/documentation` — production. `origin` may be a
personal fork, and a fork branch never reaches production. Confirm with
`git remote -v` before pushing, and target `upstream` for anything that must ship.

`.github/workflows/pages.yml` deploys <https://docs.projectbluefin.io/> on every
push to `upstream/main`; there is no separate publish step. When a maintainer
explicitly asks for a production update, land it on `upstream/main`. Otherwise
open a pull request.

The CDN serves the old copy for a while after a successful deploy, so verify a
live asset with a cache-busted request:

```bash
curl -s -o /dev/null -w "%{http_code} %{size_download}\n" \
  "https://docs.projectbluefin.io/img/blog/<post>/<file>.png?cb=$RANDOM"
```

## Before changing anything

1. Read the target file and its nearby component or configuration.
2. Confirm the route exists in `docusaurus.config.ts` or `sidebars.ts`.
3. Search git history when an existing content pattern has unclear ownership.
4. Decide which mode you are in. If the task needs design and no `adr/` record
   authorizes it, escalate instead of guessing.

Do not create a parallel design, and do not widen a data shape to make content
fit.
