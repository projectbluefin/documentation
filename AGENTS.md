# Bluefin Documentation — Agent Instructions

**Repository:** `castrojo/documentation` (fork of `projectbluefin/documentation`)  
**Deployed at:** <https://docs.projectbluefin.io/>  
**Local path:** `/var/home/jorge/src/documentation`  
**Framework:** Docusaurus 3.10.x (TypeScript), React 19, Node 24

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (fetches data automatically, hot-reload)
npm run start

# Full production build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

Dev server: <http://localhost:3000/>

---

## Git Workflow

**Never push directly to main.** Always work on a topic branch:

```bash
git checkout -b <type>/<short-description>
git add <files>
git commit -m "type(scope): description"
git push -u origin <type>/<short-description>
# Then open a PR — do not merge
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `ci`, `chore`

AI agent attribution (required in every commit footer):

```
Assisted-by: Claude Sonnet 4.6 via GitHub Copilot
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Fork sync:** This is a fork of `projectbluefin/documentation`. Keep in sync:

```bash
git fetch upstream
git checkout main
git reset --hard upstream/main
git push origin main --force-with-lease
```

---

## Validation Gates (all required before committing)

| Check | Command | Blocking? |
|---|---|---|
| TypeScript | `npm run typecheck` | YES |
| ESLint | `npm run lint` | YES |
| Prettier | `npm run prettier-lint` | No (warnings only in CI) |
| Build | `npm run build` | YES |

CI enforces TypeScript and ESLint as hard failures. Prettier is warnings-only.

---

## Repository Structure

```
docs/                   # User documentation (Markdown/MDX)
blog/                   # Blog posts with frontmatter + authors.yaml
reports/                # Monthly auto-generated report MDX posts
src/
  components/           # React components (see Components section)
  config/               # packageConfig.ts — centralized package tracking
  pages/                # Custom Docusaurus pages
    changelogs.tsx       # /changelogs page
    board.tsx            # /board page
  types/                # TypeScript type definitions
    sbom.ts              # SBOM attestation types
    sbom-attestations.d.ts  # Ambient module declaration (allows missing file at tsc time)
    data.d.ts            # General data types
    theme.d.ts           # Docusaurus theme type augmentations
  css/                  # custom.css
  theme/                # Swizzled Docusaurus components
    DocItem/Footer/      # Adds PageContributors to every doc page
scripts/                # Data-fetch and utility scripts (see Data Pipeline section)
  lib/                  # Shared library modules for generate-report
static/
  data/                 # Auto-generated JSON (gitignored — except sbom-attestations.json seed)
  feeds/                # Auto-generated release feeds (gitignored)
  img/                  # Static images
.github/
  workflows/            # CI/CD workflows (see CI/CD section)
  agents/               # GitHub Copilot agent definitions
  prompts/              # Copilot prompt files
docusaurus.config.ts    # Main Docusaurus configuration
sidebars.ts             # Sidebar navigation
Justfile                # build, serve recipes
```

---

## Data Pipeline

### How data reaches the site

The site fetches all data at **build time** via npm scripts. No runtime API calls from the browser (except `GnomeExtensions.tsx` which fetches live from extensions.gnome.org, and the `ProjectCard.tsx` runtime fallback for missing repo stats).

#### Standard data pipeline (`npm run fetch-data`)

Runs automatically during `npm run start` and `npm run build`.

| Script | Output | What it fetches |
|---|---|---|
| `fetch-feeds.js` | `static/feeds/bluefin-releases.json`, `static/feeds/bluefin-lts-releases.json` | GitHub Atom release feeds from ublue-os/bluefin and ublue-os/bluefin-lts |
| `fetch-playlist-metadata.js` | `static/data/playlist-metadata.json` | YouTube playlist thumbnails/descriptions |
| `fetch-github-profiles.js` | `static/data/github-profiles.json` | GitHub user profiles (~80 users for donations page) |
| `fetch-github-repos.js` | `static/data/github-repos.json` | GitHub repo stars/forks for projects page |
| `fetch-contributors.js` | `static/data/file-contributors.json` | Per-file git contributors (used by DocItem/Footer) |
| `fetch-pin-state.js` | `static/data/stream-pins.json` | Current pinned stream versions |
| `fetch-github-driver-versions.js` | `static/data/driver-versions.json` | Kernel/Mesa/NVIDIA/GNOME version history per stream from GitHub releases |
| `fetch-github-images.js` | `static/data/images.json` | OCI image catalog — streams, versions, bootc switch commands, download counts. Reads `sbom-attestations.json` and overlays package versions from SBOM data |
| `fetch-firehose.js` | `static/data/firehose-apps.json` | Flatpak/app release data from castrojo/bluefin-releases; enriched with SBOM OS release entries |

All scripts use a **24-hour file-mtime cache**: if the output JSON is younger than 24 hours, the fetch is skipped. Pass `--force` to bypass.

Requires `GITHUB_TOKEN` (or `GH_TOKEN`) env var for authenticated GitHub API requests:

```bash
export GITHUB_TOKEN=$(gh auth token)
npm run fetch-data
```

The fetch-data chain runs in three phases (see `package.json`):

```bash
# Phase 1 (parallel): feeds, playlists, profiles, repos, contributors
# Phase 2: pin-state (depends on feeds)
# Phase 3 (parallel): driver-versions, images, firehose
npm run fetch-data
```

Run individual scripts:

```bash
npm run fetch-feeds
npm run fetch-playlists
npm run fetch-github-profiles
npm run fetch-github-repos
npm run fetch-contributors
npm run fetch-pin-state
npm run fetch-github-driver-versions
npm run fetch-github-images
npm run fetch-firehose
```

#### SBOM attestation pipeline (separate nightly workflow)

The SBOM pipeline runs **only in `.github/workflows/update-sbom-cache.yml`**. It is NOT part of `fetch-data` — it requires `cosign` and `oras` which are not installed in the standard build environment.

| Script | Output | What it does |
|---|---|---|
| `fetch-github-sbom.js` | `static/data/sbom-attestations.json` | Uses cosign to verify SLSA attestations and oras to download Syft SBOMs. Extracts RPM package versions (kernel, gnome, mesa, podman, systemd, bootc, fedora) per stream/release. |

Run with `npm run fetch-sbom` — requires cosign and oras on PATH. Uses `github.token` only — no PAT required.

**Data flow:**

```
update-sbom-cache.yml (nightly 04:00 UTC)
  cosign verify-attestation → GHCR OCI images
  oras discover/pull → Syft SPDX JSON
  → static/data/sbom-attestations.json
  → saved to GHA cache (key: github-data-sbom-RUN_ID)

pages.yml (every build)
  restore-keys: github-data-sbom-   ← picks up SBOM data from nightly cache
  npm run fetch-github-images       ← reads sbom-attestations.json, overlays versions
  → static/data/images.json
```

**NVIDIA is intentionally absent from SBOM** — NVIDIA drivers are akmod packages built outside the OCI image. The site falls back to release feeds for NVIDIA versions.

#### Seed file note

`static/data/sbom-attestations.json` is committed as an empty seed `{ "generatedAt": null, "streams": {} }` to allow the build to succeed before the first SBOM cache run. `FeedItems.tsx` imports it via a static TypeScript import, so the file must exist at build time.

The `.gitignore` has `!/static/data/sbom-attestations.json` to keep the seed tracked.

**Do not commit a populated version of this file** — it is managed entirely by the GHA cache.

All other `static/data/*.json` and `static/feeds/*.json` files are gitignored and must never be committed.

---

## CI/CD Workflows

### `pages.yml` — Build and deploy

Triggers: PR to main, push to main, merge_group, workflow_dispatch, schedule (Sundays 6:50 UTC)

Key steps:
1. Restore `node_modules` cache (key: `npm` cache from setup-node)
2. **Restore GitHub data cache** — key `github-data-{scripts-hash}`: artwork-versions, driver-versions, file-contributors, firehose-apps, github-repos, images, playlist-metadata, stream-pins
3. **Restore GitHub profiles cache** — key `github-profiles-v1-` (populated by separate weekly workflow)
4. **Restore SBOM attestation cache** — key `github-data-sbom-` (populated by nightly 04:00 UTC workflow)
5. **Fetch SBOM on cache miss** — runs `fetch-github-sbom.js` directly if SBOM cache didn't hit (uses `github.token` only)
6. `npm ci` (install)
7. `npm run fetch-data` (uses `github.token` — no PAT required)
8. **Restore card image cache** — key `card-images-{template-hash}`
9. `npm run generate-card-images`
10. `npm test` (unit tests)
11. TypeScript + ESLint + Prettier validation (TS and ESLint are BLOCKING)
12. Build (`npm run build:ci`)
13. E2E Playwright tests — **only on `pull_request` and `merge_group`** (not on push to main)
14. Upload pages artifact → deploy to GitHub Pages (main only)

### `update-sbom-cache.yml` — Nightly SBOM fetch

Triggers: schedule (04:00 UTC nightly), workflow_dispatch

Steps: checkout → setup-node → restore existing SBOM cache (incremental) → install cosign → install oras → `npm run fetch-sbom` → save cache

Permissions: `contents:read` only — no file commits, cache-only data flow.

Required secret: none — `github.token` is sufficient (`fetch-github-sbom.js` uses the public Releases API and anonymous GHCR bearer tokens).

### `monthly-reports.yml` — Monthly report generation

Triggers: first Monday of each month 10:00 UTC, workflow_dispatch

Permissions: `contents:write`, `pull-requests:write`

Generates a report MDX in `reports/`, commits to a branch, creates a PR with auto-merge.

### `pdf.yml` — Weekly PDF export

Triggers: Sundays 5:50 UTC, workflow_dispatch

Generates `pdf/bluefin.pdf` via Prince XML from the live site, uploads to GitHub Release `0.1`.

### `renovate-validate.yml` — Renovate config validation

Triggers: PRs touching `renovate.json`

Runs `renovate-config-validator --strict`.

---

## Components

| Component | Page/Location | Data source |
|---|---|---|
| `FeedItems.tsx` + `CommunityFeeds.tsx` | `changelogs.tsx` | `static/feeds/*.json` + `sbom-attestations.json` |
| `PackageSummary.tsx` | `changelogs.tsx` | Derived from feeds via `src/config/packageConfig.ts` |
| `FirehoseFeed.tsx` + `OsReleaseCard.tsx` | `changelogs.tsx` | `firehose-apps.json` (static import) + `sbom-attestations-frontend.json` (lazy) + `bluefin-releases.json`/`bluefin-lts-releases.json` (lazy) |
| `ImagesCatalog.tsx` | `src/pages/images.tsx` | `static/data/images.json` (includes SBOM version overlays) |
| `DriverVersionsCatalog.tsx` | `docs/driver-versions.mdx` | `static/data/driver-versions.json` |
| `ArtworkGallery.tsx` | `docs/artwork.mdx` | `fetch("/data/artwork.json")` — client-side fetch after hydration |
| `GitHubProfileCard.tsx` | `docs/donations/*.mdx` | `static/data/github-profiles.json` |
| `ProjectCard.tsx` | `docs/donations/projects.mdx` | `static/data/github-repos.json` (build-time) + GitHub API (runtime fallback) |
| `GnomeExtensions.tsx` | `docs/extensions.mdx` | Live fetch from extensions.gnome.org at runtime |
| `MusicPlaylist.tsx` | `docs/music.md` | `static/data/playlist-metadata.json` |
| `PageContributors.tsx` | DocItem/Footer (all doc pages) | `static/data/file-contributors.json` |
| `GiscusComments/` | Blog posts | GitHub Discussions via Giscus |

### Changelog package tracking

Package versions shown in changelog cards are centrally managed in `src/config/packageConfig.ts`. The `PACKAGE_PATTERNS` array defines regex patterns matched against release body HTML.

To add a tracked package: add an entry to `PACKAGE_PATTERNS`, run `npm run build`, verify on `/changelogs`.

Currently tracked: Kernel, HWE Kernel, GNOME, Mesa, Podman, NVIDIA, Docker, systemd, bootc.

---

## Content Guidelines

- Documentation should be consumable in one sitting. Link upstream docs; don't duplicate.
- Avoid "simply", "easy", "just" — see <https://justsimply.dev/>
- Imperative tone: "Run this command"
- Never create new pages unless explicitly instructed.
- Blog posts: use MDX with frontmatter tags; add author to `blog/authors.yaml` (fields: name, page, title, url, image_url, optional socials: bluesky, mastodon, github, linkedin, youtube, blog).
- Images: place in `static/img/`, reference as `/img/filename.ext`
- Music page: `MusicPlaylist` component requires 1:1 thumbnail aspect ratio and consistent album sizes.
- Donations/contributors page: uses `GitHubProfileCard` — distinguished contributors get foil effects via the `highlight` prop.

---

## Monthly Reports System

Auto-generated by `.github/workflows/monthly-reports.yml` on the first Monday of each month.

### Library modules (in `scripts/lib/`)

| Module | Purpose |
|---|---|
| `graphql-queries.mjs` | GitHub GraphQL client, fetches PRs from monitored repos |
| `monitored-repos.mjs` | List of repos to include in report |
| `contributor-tracker.mjs` | New vs repeat contributor tracking, bot filtering |
| `markdown-generator.mjs` | MDX formatting and templates |
| `build-metrics.mjs` | CI success rates from tracked workflow IDs |
| `label-mapping.mjs` | Static label color/category map |
| `github-sponsors.mjs` | Sponsor data |
| `tap-promotions.mjs` | Homebrew tap promotion data |

**Planned work source:** Merged PRs from `projectbluefin/common`  
**Opportunistic work source:** Merged PRs from all other monitored repos

### Contributor tracking

- `static/data/contributors-history.json` — gitignored, managed by the workflow
- First-time contributors get `highlight={true}` on their `GitHubProfileCard` (gold foil)
- Bots are excluded from human contributor counts

### Manual generation

```bash
export GITHUB_TOKEN=$(gh auth token)
npm run generate-report
npm run start   # preview at http://localhost:3000/reports
```

---

## ProjectCard component

`src/components/ProjectCard.tsx` — used on `docs/donations/projects.mdx`.

Props: `name`, `description`, `sponsorUrl?`, `packageName?`, `icon?`, `githubRepo?`

To add a new project:
1. Add `<ProjectCard>` to `docs/donations/projects.mdx`
2. Add the repo to `GITHUB_REPOS` in `scripts/fetch-github-repos.js`
3. Test: `npm run fetch-github-repos && npm run start`

Icon URLs: use `https://github.com/org-name.png` or `https://github.com/username.png`.

---

## Known Issues

### SBOM seed file (load-bearing committed JSON)

`static/data/sbom-attestations.json` is committed as an empty seed. This is required because `FeedItems.tsx` uses a static import — the Docusaurus build will fail if the file does not exist. The TypeScript ambient declaration in `src/types/sbom-attestations.d.ts` satisfies `tsc`, but the bundler still needs the file. Do not remove or rename it from git until a build-time fallback is implemented.

### cosign/oras not in standard build environment

Do not add `fetch-sbom` to the `fetch-data` chain. `pages.yml` installs cosign/oras **only** in the nightly `update-sbom-cache.yml`. The `pages.yml` build handles cache miss with a direct `fetch-github-sbom.js` call but cosign+oras must still be present — this is handled by the workflow step, not by developers locally.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` fails with peer conflicts | React 19 peer dep | Use `npm install --legacy-peer-deps` |
| Build fails on missing `sbom-attestations.json` | Gitignore misconfigured | Verify `!/static/data/sbom-attestations.json` in `.gitignore` |
| `images.json` missing SBOM package versions | SBOM cache not yet populated | Run `update-sbom-cache.yml` via workflow_dispatch on upstream |
| TypeScript deprecation error on `baseUrl` | TypeScript 6 change | `tsconfig.json` has `"ignoreDeprecations": "6.0"` — already handled |
| Prettier warnings on existing files | Pre-existing style drift | Non-blocking in CI; run `npm run prettier` to fix all at once |
| `contributors-history.json` corrupt | File corruption | Delete and re-run `npm run generate-report` to rebuild |
