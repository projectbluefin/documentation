# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**GitHub API:**

- Purpose: Fetch repository data, user profiles, contributor lists, release feeds
- SDK/Client: `node-fetch` 3.3.2
- Auth: `GITHUB_TOKEN` or `GH_TOKEN` environment variable (optional, increases rate limits)
- Endpoints used:
  - `https://api.github.com/users/{username}` - User profile data
  - `https://api.github.com/repos/{owner}/{repo}` - Repository stats (stars, forks)
  - `https://github.com/{owner}/{repo}/releases.atom` - Release feeds (Atom XML)
  - `https://github.com/{owner}/{repo}/discussions.atom` - Discussions feeds (Atom XML)
- Scripts:
  - `scripts/fetch-github-profiles.js` - Fetches 60+ GitHub user profiles for donations page
  - `scripts/fetch-github-repos.js` - Fetches 50+ repository stats (stars/forks) for projects page
  - `scripts/fetch-contributors.js` - Fetches contributor data
  - `scripts/fetch-feeds.js` - Parses release Atom feeds from ublue-os/bluefin and ublue-os/bluefin-lts
- Rate limiting: 100ms delay between requests, 24h cache on fetched data

**YouTube (Web Scraping):**

- Purpose: Fetch playlist metadata (thumbnails, descriptions) for music page
- SDK/Client: `node-fetch` 3.3.2 (no official API used - scrapes HTML)
- Auth: None (public data)
- Method: Scrapes `ytInitialData` JSON from playlist page HTML
- Script: `scripts/fetch-playlist-metadata.js`
- Endpoints: `https://www.youtube.com/playlist?list={playlistId}`
- Rate limiting: 1500ms delay between requests
- Data fetched: 7 playlists, thumbnails cached locally to `static/img/playlists/`

**Giscus (GitHub Discussions Comments):**

- Purpose: Blog post and changelog comments powered by GitHub Discussions
- SDK/Client: `@giscus/react` 3.1.0
- Repository: `ublue-os/bluefin`
- Repository ID: `R_kgDOJHEu4g`
- Category: "Discussions"
- Category ID: `DIC_kwDOJHEu4s4CtFFL`
- Configuration: `src/components/GiscusComments/index.tsx`

**Algolia Search:**

- Purpose: Site-wide search functionality
- App ID: `H1LI1VATRI`
- API Key: `201fbeeb537ae90f533bedcb5a73230b` (public, safe to commit)
- Index: `projectbluefin`
- Configuration: `docusaurus.config.ts` themeConfig.algolia

**1Password Docusaurus Plugin:**

- Purpose: Fetches and caches external data feeds at build time
- Package: `@1password/docusaurus-plugin-stored-data` 1.0.0
- Data sources configured:
  - `bluefinReleases`: https://github.com/ublue-os/bluefin/releases.atom
  - `bluefinLtsReleases`: https://github.com/ublue-os/bluefin-lts/releases.atom
  - `bluefinDiscussions`: https://github.com/ublue-os/bluefin/discussions.atom
  - `bluefinAnnouncements`: https://github.com/ublue-os/bluefin/discussions.atom (filtered by announcements label)

## Data Storage

**Databases:**

- None - Static site with no database

**File Storage:**

- Local filesystem only
- Static assets in `static/` directory
- Auto-generated JSON data in `static/data/` and `static/feeds/`:
  - `static/data/playlist-metadata.json` - YouTube playlist metadata
  - `static/data/github-profiles.json` - GitHub user profiles
  - `static/data/github-repos.json` - GitHub repository stats
  - `static/feeds/bluefin-releases.json` - Parsed release feed from ublue-os/bluefin
  - `static/feeds/bluefin-lts-releases.json` - Parsed release feed from ublue-os/bluefin-lts
- Cached thumbnails in `static/img/playlists/` (from YouTube)

**Caching:**

- Build-time caching: GitHub Actions cache for `static/data/` directory
- Local caching: 24-hour TTL on GitHub profile/repo data (checked via file mtime)
- Component-level caching: Browser localStorage for runtime GitHub API fallbacks

## Authentication & Identity

**Auth Provider:**

- None - Static site with no user authentication
- Giscus comments use GitHub OAuth (handled by Giscus service, not this site)

## Monitoring & Observability

**Error Tracking:**

- None - No error tracking service integrated

**Logs:**

- Build logs via GitHub Actions
- Console logs during development server
- No production logging (static site)

## CI/CD & Deployment

**Hosting:**

- GitHub Pages
- Deployment URL: https://docs.projectbluefin.io
- Static files served from `build/` directory

**CI Pipeline:**

- GitHub Actions (`.github/workflows/pages.yml`)
- Triggers:
  - Push to main branch
  - Pull requests to main
  - Merge group
  - Manual dispatch
  - Scheduled cron: `50 6 * * 0,2` (6:50 UTC Sundays and Tuesdays, after upstream builds)
- Build process:
  1. Checkout repository
  2. Setup bun runtime
  3. Restore GitHub data cache
  4. Install dependencies (`bun install --frozen-lockfile --production`)
  5. Build site (`bun run build`) with `GITHUB_TOKEN` from secrets
  6. Upload build artifact
  7. Deploy to GitHub Pages (main branch only)
- Security: step-security/harden-runner for egress policy auditing

**Other Workflows:**

- `.github/workflows/pdf.yml` - PDF generation (purpose unknown from filename)
- `.github/workflows/renovate-validate.yml` - Dependency update automation validation
- `.github/workflows/update-driver-versions.yml` - Automated driver version updates

## Environment Configuration

**Required env vars:**

- None for local development (all optional)

**Optional env vars:**

- `GITHUB_TOKEN` or `GH_TOKEN` - Increases GitHub API rate limits for data fetching scripts
  - Used by: `fetch-github-profiles.js`, `fetch-github-repos.js`, `fetch-contributors.js`, `update-driver-versions.js`
  - Get token at: https://github.com/settings/tokens
  - Without token: 60 requests/hour rate limit, may fail during builds

**Secrets location:**

- GitHub repository secrets (for CI/CD):
  - `PROJECT_READ_TOKEN` - GitHub token with read access to repositories

## Webhooks & Callbacks

**Incoming:**

- None - No webhook endpoints

**Outgoing:**

- None - No webhooks sent from this application
- Data fetching is one-way (pull model) during build time only

## External Links & References

**Main Project Repositories:**

- Bluefin images: https://github.com/ublue-os/bluefin
- Bluefin LTS images: https://github.com/ublue-os/bluefin-lts
- Documentation (this repo): https://github.com/ublue-os/bluefin-docs (linked in config as projectbluefin/documentation)

**Community Resources:**

- Discord: https://discord.gg/XUC8cANVHy
- Discussions: https://github.com/ublue-os/bluefin/discussions
- Ask Bluefin: https://ask.projectbluefin.io
- Feedback: https://feedback.projectbluefin.io
- Store: https://store.projectbluefin.io
- Issue Tracker: https://issues.projectbluefin.io
- Pull Requests: https://pullrequests.projectbluefin.io
- Contributor Guide: https://contribute.projectbluefin.io

**Related Projects:**

- Universal Blue: https://universal-blue.org
- Aurora: https://getaurora.dev
- Bazzite: https://bazzite.gg
- uCore: https://github.com/ublue-os/ucore

---

_Integration audit: 2026-01-26_
