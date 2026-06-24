# Bluefin Documentation — Agent Instructions

**Repository:** `projectbluefin/documentation`  
**Deployed at:** <https://docs.projectbluefin.io/>  
**Local setup:** Clone locally with `gh repo clone projectbluefin/documentation`  
**Framework:** Docusaurus 3.10.x (TypeScript), React 19, Node 24

---

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

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

AI agent attribution (required in every commit footer — exactly ONE trailer, no Co-authored-by):

```
Assisted-by: Claude Sonnet 4.6 via GitHub Copilot
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
    changelogs.tsx       # /changelogs page — only custom page, all others are docs/ MDX
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
  data/                 # Auto-generated JSON (gitignored — except sbom-attestations.json and sbom-attestations-frontend.json)
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
| `fetch-gnome-extensions.js` | `static/data/gnome-extensions.json`, `static/img/extensions/` | GNOME extension metadata + screenshots for `/tips/` page |
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
npm run fetch-gnome-extensions
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

**NVIDIA sources:** GDX stream (`bluefin-gdx-lts`) includes nvidia-driver in its SBOM. Bluefin stable and LTS nvidia variants use release feed fallback — akmod packages are built outside the OCI image. Dakota nvidia uses `dakota-nvidia-latest` SBOM stream.

#### Seed file note

Both `static/data/sbom-attestations.json` and `static/data/sbom-attestations-frontend.json` are **committed with populated SBOM data** and tracked by gitignore exceptions:

```gitignore
!/static/data/sbom-attestations.json
!/static/data/sbom-attestations-frontend.json
```

These files are updated by the nightly `update-sbom-cache.yml` workflow and committed when needed. Do NOT commit stale or locally-fetched versions — only CI-generated data should land here.

All other `static/data/*.json` and `static/feeds/*.json` files are gitignored and must never be committed.

---

## CI/CD Workflows

### `pages.yml` — Build and deploy

Triggers: PR to main, push to main, merge_group, workflow_dispatch, schedule (daily 07:00 UTC)

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

### `e2e-tests.yml` — Standalone E2E CI

Triggers: PR to main, **push to main** (separate from pages.yml E2E step)

Runs a full build + Playwright test on every push to main and every PR. Uploads `playwright-report/` artifact on failure. Uses `github.token` only. Does NOT deploy.

### `update-hive-cache.yml` — Hive history pipeline

Triggers: schedule (every 2h), workflow_dispatch

Steps: checkout → setup-node → restore hive cache (incremental, key: `github-data-hive-`) → `npm run fetch-hive-history` → save cache → commit updated `static/data/hive-history.json`

Permissions: `contents:write` — commits history file back to main.

Fetches: Hive snapshot HTML, org contributor counts (all-time), contributor weekly stats (GitHub `/stats/contributors`, daily TTL), per-repo contributor breakdown. Appends snapshot entry every 2h (max 2016 entries / ~6 months rolling).

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
| `ImagesCatalog.tsx` | `docs/images.md` (`/images` route) | `static/data/images.json` (includes SBOM version overlays) |
| `DriverVersionsCatalog.tsx` | `docs/driver-versions.mdx` | `static/data/driver-versions.json` — shows per-stream Kernel/HWE/Mesa/GNOME version trend sparklines |
| `Sparkline.tsx` | Reusable utility — used in DriverVersionsCatalog, available anywhere | `number[]` prop — zero-dep inline SVG, SSR-safe. Props: `data`, `width`, `height`, `color`, `areaColor` |
| `ArtworkGallery.tsx` | `docs/artwork.mdx` | `fetch("/data/artwork.json")` — client-side fetch after hydration |
| `GitHubProfileCard.tsx` | `docs/donations/*.mdx` | `static/data/github-profiles.json` |
| `ProjectCard.tsx` | `docs/donations/projects.mdx` | `static/data/github-repos.json` (build-time) + GitHub API (runtime fallback) |
| `GnomeExtensions.tsx` | `docs/extensions.mdx` | Live fetch from extensions.gnome.org at runtime |
| `MusicPlaylist.tsx` | `docs/music.md` | `static/data/playlist-metadata.json` |
| `PageContributors.tsx` | DocItem/Footer (all doc pages) | `static/data/file-contributors.json` |
| `GiscusComments/` | Blog posts | GitHub Discussions via Giscus |
| `HiveFactoryDashboard.tsx` | `src/pages/hive.tsx` (`/hive/`) | Client-side: snapshot HTML, queue API, GitHub API, `hive-history.json` |

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

## Hive Factory Dashboard

The Bluefin OS Factory live dashboard lives at `docs.projectbluefin.io/hive/`.

- Source: `src/components/HiveFactoryDashboard.tsx` (~3200 lines) + `HiveFactoryDashboard.module.css`
- Page wrapper: `src/pages/hive.tsx`
- Title: **Bluefin Operating System Factory** (no "The") — subtitle unchanged
- Tagline at page bottom: "Enslaving the Oppressors since 2026" (Destiny lore)

### Data sources

All data is fetched **client-side at runtime** — no build-time fetch for the hive snapshot.

| Source | What it provides |
|---|---|
| Snapshot HTML at `raw.githubusercontent.com/kubestellar/docs/main/public/live/hive/bluefin/index.html` | Live hive state — governor mode, ACMM level, agent status, victories, advisories |
| `queue.projectbluefin.io/data.json` | Guardians/Ghosts PR queue (regenerates every 10 min) |
| GitHub API (`api.github.com`) | PR search (merged/open), org stats, commit activity |
| `static/data/hive-history.json` | Historical snapshot entries, org-wide contributor stats |

**`hive-history.json`** is a committed file (gitignore exception) updated every 2h by `.github/workflows/update-hive-cache.yml`. Script: `scripts/fetch-hive-history.js`.

### Snapshot parsing

The snapshot HTML contains multiple `render(` calls. To find the real JSON payload:
- Scan all `render(` occurrences; pick the one where the next non-whitespace char is `{`
- Top-level `acmmLevel` field is at the root — NOT `agentMetrics.outreach.acmm`

### Panels

| Panel | Data source | Notes |
|---|---|---|
| Hero / ACMM level | snapshot root `acmmLevel` | Mission timer, velocity sparkline |
| Governor panel | snapshot `governor` | Mode, queue depth, thresholds |
| Governor Timeline | snapshot `timeline[]` | 24h colored mode strip (surge/busy/quiet/idle) |
| Token Budget | snapshot `governor.budgetPct` etc. | Progress bar, green/amber/red thresholds |
| Nous / Strategy Lab | snapshot `nous` | Active experiment, snapshot progress, principle count |
| Frame Formation | snapshot `agents[]` | Per-Frame status, ACMM level, sparklines; each Frame shows 5 summary lines or top 3 advisory work items + a Destiny lore quote |
| Frame of the Day | snapshot `agents[]` (most active) | 10 summary lines + 5 advisory work items + Frame quote |
| What Frames Are Doing | snapshot `agents[]` (working only) | 5 full summary lines per active Frame |
| What Frames Are Working On | `advisoryItems[]` | Advisory digest grouped by Frame |
| Victory Log | snapshot `victories[]` | Recent hive wins |
| Velocity Panel | GitHub PR search | 7/30-day merge rate sparklines |
| Issue Queue | GitHub issues API | P0/P1/agent-ready bucketed |
| Recently Merged | GitHub PR search (30 PRs) | Guardian/Ghost split, conventional commit badges |
| Contributor Wall | `hive-history.json` contributors | Human contributors only (bots filtered via `isBotLogin()`); metric = repos active in, sorted by repo count desc |
| Factory Trends | `hive-history.json` entries (last 72) | 6 sparklines: ACMM, budget, queue, advisories, merged/cycle, merge time |
| Contributor Leaderboard | `hive-history.json` contributorStats | Tabs: All Time / This Month / This Week; top 25; bots filtered; milestone badges |

### Destiny lore two-column layout

| Column | Title | Color | Contents |
|---|---|---|---|
| Left | Guardians | Warm gold `#d97706` | Human contributor PRs — the Light we carry |
| Right | Ghosts | Sapphire `#2563eb` / `#93c5fd` | Agent-driven issues — the machines at work |

### Contributor Leaderboard

Tabs: All Time / This Month / This Week. Top 25 per tab. Shows rank, avatar, repos active in, top repos, milestone badges. Bots excluded via `isBotLogin()`.

Milestone badge tiers (highest earned shown):

| Badge | Threshold | Color |
|---|---|---|
| Mythic | 5000+ lifetime commits | `#ff7b72` |
| Legend | 1000+ lifetime commits | `#f0883e` |
| Elite | 500+ lifetime commits | `#bc8cff` |
| Veteran | 100+ lifetime commits | `#58a6ff` |
| Contributor | 10+ lifetime commits | `#3fb950` |
| Sprint | 10+ commits this week | `#d29922` |
| Rising | This week > 1.5x 4-week avg | `#3fb950` |
| Multi-repo | Active in 3+ repos | `#a371f7` |

Weekly/monthly data (from GitHub `/stats/contributors`) accumulates after CI warms the stats cache. Falls back to all-time view during warmup.

### hive-history.json schema

```json
{
  "entries": [{ "t": ms, "acmmLevel": 3, "govMode": "busy", "queue": 175, "agents": 6,
                "runningAgents": 5, "advisories": 0, "budgetPct": null,
                "mergedToday": null, "mergedThisWeek": null, "medianMergeMins": 801 }],
  "contributors": { "login": totalCommits },
  "contributorsByRepo": { "repo": { "login": commits } },
  "lastContributorFetch": "ISO",
  "contributorStats": {
    "login": { "total": N, "lastWeek": N, "lastMonth": N, "last3Months": N, "byRepo": {"repo": commits} }
  },
  "lastWeeklyStatsFetch": "ISO"
}
```

`contributorStats` is populated by `fetchContributorWeeklyStats()` in `fetch-hive-history.js` (daily TTL). GitHub's `/stats/contributors` returns HTTP 202 on cold cache — script retries with backoff.

### Factory repos tracked (15)

`bluefin`, `common`, `documentation`, `actions`, `bluefin-lts`, `dakota`, `bonedigger`, `bootc-installer`, `knuckle`, `testsuite`, `website`, `brew`, `iso`, `wolfictl`, `fisherman`

### Theme constants

- Background: `#0d1117`
- Guardians accent: `#d97706` (amber)
- Ghosts accent: `#2563eb` / `#93c5fd` (sapphire)
- Governor modes: surge=`#f85149` busy=`#d97706` quiet=`#3b82f6` idle=`#21262d`

### Frame quotes (Destiny lore)

Frames (the dashboard's agents) display verbatim in-game Destiny dialogue from Destinypedia:

- **Working Frames** get calm Benedict-99 lines: "Strength in Light.", "Traveler keep you safe.", etc.
- **Idle Frames** get Sweeperbot existential lines: "Woe is me.", "All is lost....All. is. lost!", etc.

Quote selection is hash-stable per Frame ID (`pickFrameQuote(id, working)`). Quotes appear at the bottom of each FrameCard, FrameOfDay, and FormationLog panel.



1. Add interface fields to `HiveSnapshot` (types block ~L36-100)
2. Extract in `parseSnapshotJson` (~L260-380)
3. Write the component (follow `GovernorTimeline` or `TokenBudgetPanel` as template)
4. Add CSS to `HiveFactoryDashboard.module.css`
5. Wire into JSX render (conditionally on data presence)
6. `npm run typecheck && npm run lint` — both must pass

**Never** add `fetch-sbom` or `fetch-data` to the hive pipeline — the snapshot is fetched client-side at runtime.

**CSP:** `connect-src` in `docusaurus.config.ts` must include `raw.githubusercontent.com`, `queue.projectbluefin.io`, `api.github.com`.

---

## ProjectCard component

`src/components/ProjectCard.tsx` — used on `docs/donations/projects.mdx`.

Props: `name`, `description`, `sponsorUrl?`, `packageName?`, `icon?`, `githubRepo?`

To add a new project:
1. Add `<ProjectCard>` to `docs/donations/projects.mdx`
2. Add the repo to `GITHUB_REPOS` in `scripts/fetch-github-repos.js`
3. Test: `npm run fetch-github-repos && npm run start`

Icon URLs: use `https://github.com/org-name.png` or `https://github.com/username.png`.

**CNCF section policy:** `docs/donations/projects.mdx` has a "Built With Cloud Native" section at the top. It lists only projects used **to build, sign, test, and ship** Bluefin (KubeStellar, k3s, KubeVirt, cosign, ORAS, containerd, Scorecard, SLSA, Syft). Do NOT add Brewfile user tools here — those are things Bluefin ships for users, not what makes Bluefin.

---

## Sparkline component

`src/components/Sparkline.tsx` — reusable zero-dependency inline SVG sparkline. SSR-safe, no new deps.

```tsx
import Sparkline from '@site/src/components/Sparkline';
<Sparkline data={[10, 20, 15, 30, 25, 40]} width={120} height={28} color="#3fb950" areaColor="rgba(63,185,80,0.10)" />
```

Props: `data: number[]`, `width?` (default 120), `height?` (default 28), `color?` (default `#58a6ff`), `areaColor?` (default transparent — pass explicit `rgba(...)` for fill).

Returns `null` if `data.length < 2`. Normalizes data to min/max range with 2px padding.

---

## Active Worktrees

No active worktrees. The blog-spring worktree (`.worktrees/blog-spring`) has all posts merged to main as of May 2026 and can be removed with `git worktree remove .worktrees/blog-spring`.

---

## Known Issues

### SBOM committed files (load-bearing tracked JSON)

Both `static/data/sbom-attestations.json` and `static/data/sbom-attestations-frontend.json` are committed to git and tracked via gitignore exceptions. These are populated files (not empty seeds). They are required at build time because `FeedItems.tsx` uses a static TypeScript import — the bundler needs the file to exist. The TypeScript ambient declaration in `src/types/sbom-attestations.d.ts` satisfies `tsc`. Do not remove or rename either file from git until a build-time fallback is implemented.

### cosign/oras not in standard build environment

Do not add `fetch-sbom` to the `fetch-data` chain. `pages.yml` installs cosign/oras **only** in the nightly `update-sbom-cache.yml`. The `pages.yml` build handles cache miss with a direct `fetch-github-sbom.js` call but cosign+oras must still be present — this is handled by the workflow step, not by developers locally.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` fails with peer conflicts | React 19 peer dep | Use `npm install --legacy-peer-deps` |
| Build fails on missing `sbom-attestations.json` | Gitignore misconfigured or file accidentally deleted | Verify `!/static/data/sbom-attestations.json` and `!/static/data/sbom-attestations-frontend.json` in `.gitignore`; restore from git if deleted (`git checkout HEAD -- static/data/sbom-attestations.json static/data/sbom-attestations-frontend.json`) |
| `images.json` missing SBOM package versions | SBOM cache not yet populated | Run `update-sbom-cache.yml` via workflow_dispatch on upstream |
| TypeScript deprecation error on `baseUrl` | TypeScript 6 change | `tsconfig.json` has `"ignoreDeprecations": "6.0"` — already handled |
| Prettier warnings on existing files | Pre-existing style drift | Non-blocking in CI; run `npm run prettier` to fix all at once |
| `contributors-history.json` corrupt | File corruption | Delete and re-run `npm run generate-report` to rebuild |
| Build fails on missing component after blog PR | Blog post published without its supporting `src/` files | Run `git diff upstream/main --name-only` on the worktree branch and copy ALL changed `src/`, `scripts/`, and `static/` files — not just the MDX. Never include `.github/workflows/*.yml` in the same PR. |
| Post not visible after merge | `draft: true` still in frontmatter | `grep -r "draft: true" blog/` — remove the line and push a fix PR |
