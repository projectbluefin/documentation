# Bluefin Documentation

Bluefin documentation is a Docusaurus 3.8.1 TypeScript website that provides comprehensive documentation for the Bluefin operating system. The site generates documentation pages from markdown files and auto-fetches release feeds for changelogs.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Git Workflow - CRITICAL RULES

**NEVER push directly to main/trunk unless EXPLICITLY instructed by the user.**

### Required Workflow

1. **ALWAYS work in a feature branch**

   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Commit your changes to the branch**

   ```bash
   git add <files>
   git commit -m "conventional commit message"
   ```

3. **Push the branch to remote** (only when ready)

   ```bash
   git push -u origin feature/descriptive-name
   ```

4. **Create a pull request** (do not merge)

   ```bash
   gh pr create --title "Title" --body "Description"
   ```

5. **WAIT for user approval** - Do not merge or push to main

### What NOT to Do

- ❌ NEVER `git push origin main` or `git push origin HEAD:main`
- ❌ NEVER commit directly to main branch
- ❌ NEVER merge PRs without explicit user instruction
- ❌ NEVER use `--force` or `--force-with-lease` on main branch

### Exception Cases

The ONLY time you push to main is when the user explicitly says:

- "push this to main"
- "merge this to trunk"
- "deploy this now"
- Similar explicit direct instructions

### Why This Matters

This repository has branch protection rules that require:

- Pull requests for all changes
- Merge queue for integration
- Review/approval workflows

Bypassing these (even though technically possible with certain permissions) violates the project's governance and CI/CD processes.

## Working Effectively

Bootstrap, build, and test the repository:

- `npm install` -- takes 50-60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
  - **Note**: If installation fails with React peer dependency conflicts, use `npm install --legacy-peer-deps`
- `npm run build` -- takes 7-15 seconds (includes fetch-data step: feeds, playlists, GitHub profiles). NEVER CANCEL. Set timeout to 60+ seconds.

Run the development server:

- **ALWAYS run the bootstrapping steps first.**
- Local development: `npm run start` (includes automatic data fetching: feeds, playlists, GitHub profiles)
- Docker development: `docker compose up`

**CRITICAL: Development Server Reliability**

To ensure the development server runs reliably and stays running:

1. **The ONLY reliable method - Use detached mode with background process redirection:**

   ```bash
   cd /var/home/jorge/src/bluefin-docs && npm start 2>&1 | tee /tmp/docusaurus-server.log &
   ```

   **CRITICAL REQUIREMENTS:**
   - Use `mode: "detached"` when running via bash tool
   - Redirect output to log file with `2>&1 | tee /tmp/docusaurus-server.log`
   - Add `&` at the end to background the process
   - Use `initial_wait: 30` or higher for initial startup
   - Process persists after shell exits and survives indefinitely

2. **Verify server started successfully:**

   ```bash
   sleep 40 && tail -50 /tmp/docusaurus-server.log
   curl -I http://localhost:3000/
   ps aux | grep -E "node|npm|docusaurus" | grep -v grep
   ```

   Expected output:
   - Log should show: `[SUCCESS] Docusaurus website is running at: http://localhost:3000/`
   - curl should return: `HTTP/1.1 200 OK`
   - ps should show node/npm processes running

3. **Monitor server logs in real-time:**

   ```bash
   tail -f /tmp/docusaurus-server.log
   ```

4. **Stop the server:**

   ```bash
   pkill -f "npm start"
   pkill -f docusaurus
   # Verify it stopped:
   ps aux | grep -E "node.*docusaurus" | grep -v grep
   ```

5. **Why this method is reliable:**
   - `npm start` handles all data fetching (feeds, playlists, profiles) automatically
   - Detached mode survives shell session termination
   - Log redirection allows monitoring without blocking
   - Background process (`&`) returns immediately while server starts
   - Cannot be stopped with `stop_bash` - must use `pkill`
   - Works consistently across all environments

6. **DO NOT use these methods (they are unreliable):**
   - ❌ `npm start` alone without detached mode - terminates with session
   - ❌ `npx docusaurus start` directly - doesn't run data fetching scripts
   - ❌ `mode: "async"` - can disconnect unexpectedly
   - ❌ `mode: "sync"` - blocks and may timeout

7. **Best practices from Docusaurus documentation:**
   - Development: Use `npm start` for live preview with hot-reload
   - Production testing: Use `npm run build && npm run serve` for static files
   - Never use dev server in production - always serve static build
   - For CI/CD: Build static files and deploy to CDN/static hosting

Run production build locally:

- `npm run serve` -- serves the built site locally

## Validation

**CRITICAL TIMING REQUIREMENTS:**

- **NEVER CANCEL build commands** - Set explicit timeouts of 60+ minutes for all builds
- npm install: 60 seconds (set 120+ second timeout, use --legacy-peer-deps if needed)
- npm run build: 7-15 seconds (set 60+ second timeout, includes feed fetching)
- npm run typecheck: 2 seconds (set 30+ second timeout, some errors may be tolerated by build)
- npm run prettier-lint: 3 seconds (set 30+ second timeout)

**Manual Validation Requirements:**

- ALWAYS manually validate documentation changes by running the development server
- Test at least one complete end-to-end scenario: start dev server, navigate to changed pages, verify content renders correctly
- Take screenshots of any UI changes to verify they display properly
- ALWAYS run through the complete build process after making changes
- Verify changelogs render correctly if you modify changelog files
- Verify that release feeds are fetched correctly (stable and gts tags from ublue-os/bluefin and lts tag from ublue-os/bluefin-lts)

**Always run these validation steps before committing:**

- `npm run typecheck` -- validates TypeScript compilation
- `npm run prettier-lint` -- checks code formatting (will show warnings for existing files, this is normal)
- `npm run build` -- ensures site builds successfully
- Manual testing via `npm run start` -- verify your changes work in the browser

## Common Tasks

### Development Commands

All commands must be run from repository root:

```bash
# Install dependencies (NEVER CANCEL - 60s runtime)
npm install
# If above fails with React peer dependency conflicts, use:
# npm install --legacy-peer-deps

# Start development server (auto-reloads on changes, includes data fetching)
npm run start

# Build production site (NEVER CANCEL - 7-15s runtime, includes data fetching)
npm run build

# Serve built site locally
npm run serve

# Validate TypeScript (some errors may be tolerated by build process)
npm run typecheck

# Check formatting (many warnings expected on existing files)
npm run prettier-lint

# Fix formatting issues
npm run prettier

# Fetch all data manually (auto-runs during start/build)
npm run fetch-data
# Or fetch individual data sources:
npm run fetch-feeds              # Release feeds from GitHub
npm run fetch-playlists          # YouTube playlist metadata
npm run fetch-github-profiles    # GitHub user profiles for donations page
npm run fetch-github-repos       # GitHub repo stats for projects page

# Clear build cache if needed
npm run clear
```

### Docker Development

Alternative to npm for development:

```bash
# Start containerized development (NEVER CANCEL - pulls image first time)
docker compose up

# Stop containerized development
docker compose down
```

**Note**: The repository uses `npm` as the package manager for both local development and CI/CD, following standard Docusaurus practices.

### Repository Structure

```
docs/                    # Documentation markdown files (28 files)
blog/                   # Blog posts (21 files)
  authors.yaml          # Blog author information with socials
changelogs/             # Changelog welcome content (manually created)
  authors.yaml          # Changelog author information
src/                    # React components and pages
  components/           # React components (FeedItems, PackageSummary, CommunityFeeds, MusicPlaylist, GitHubProfileCard, ProjectCard)
  config/               # Configuration (packageConfig.ts)
  pages/                # Custom pages (changelogs.tsx)
  types/                # TypeScript type definitions
  css/                  # Custom styling
static/                 # Static assets (images, data, feeds, etc.)
  data/                 # Auto-generated data files (playlist-metadata.json, github-profiles.json)
  feeds/                # Auto-generated release feeds (bluefin-releases.json, bluefin-lts-releases.json)
  img/                  # Images and graphics
scripts/                # Build scripts (fetch-feeds.js, fetch-playlists.js, fetch-github-profiles.js, fetch-github-repos.js)
sidebars.ts             # Navigation structure (TypeScript)
docusaurus.config.ts    # Main Docusaurus configuration
package.json            # Dependencies and scripts
Justfile                # Just command runner recipes (build, serve)
```

### Content Types

- **Documentation**: 28 files in `docs/` directory, written in Markdown/MDX
- **Blog Posts**: 21 files in `blog/` directory, with frontmatter metadata and author attribution from `blog/authors.yaml`
- **Changelogs**: Manually created welcome content in `changelogs/` directory, displayed alongside auto-generated release feeds
- **Auto-Generated Data**: JSON files generated at build time via `npm run fetch-data`
  - `static/feeds/bluefin-releases.json` - Release feed from ublue-os/bluefin
  - `static/feeds/bluefin-lts-releases.json` - Release feed from ublue-os/bluefin-lts
  - `static/data/playlist-metadata.json` - YouTube playlist metadata for music page
  - `static/data/github-profiles.json` - GitHub user profiles for donations page
  - `static/data/github-repos.json` - GitHub repo stats for projects donations page
- **Static Assets**: Images and files in `static/` directory

### Auto-Generated Files - DO NOT COMMIT

**CRITICAL**: The following files are auto-generated at build time and should **NEVER** be committed to git:

- `static/data/playlist-metadata.json` - Generated by `npm run fetch-playlists`
- `static/data/github-profiles.json` - Generated by `npm run fetch-github-profiles`
- `static/data/github-repos.json` - Generated by `npm run fetch-github-repos`
- `static/feeds/bluefin-releases.json` - Generated by `npm run fetch-feeds`
- `static/feeds/bluefin-lts-releases.json` - Generated by `npm run fetch-feeds`

**Why**: These files are fetched fresh on every build and deployment. Committing them:

- Creates unnecessary merge conflicts
- Adds bloat to git history
- May contain stale/outdated data
- The CI/CD pipeline regenerates them anyway

**If you accidentally committed these files**:

# Remove from last commit (if not pushed yet)

git rm --cached static/data/playlist-metadata.json
git commit --amend --no-edit

# After amending, if you have already pushed the commit:

git push --force-with-lease

**These files are already in `.gitignore`** but may appear if generated before gitignore was updated.

## Development Guidelines

### File Organization

- Documentation files use `.md` or `.mdx` extensions
- Place images in `static/img/` directory
- Reference images using `/img/filename.ext` paths
- Use descriptive filenames for documentation files

### Content Guidelines

- Avoid terms like "simply" or "easy" (see [justsimply.dev](https://justsimply.dev/))
- Use imperative tone for instructions: "Run this command", "Do not do this"
- Include clear, tested examples
- Link to upstream documentation when appropriate
- Issues labelled with `blog` should generate a docusaurus appropriate blog post with appropriate tags
- When implementing an issue with the `blog` label add the author's github information into the appropriate places in `blog/authors.yaml` to match the rest
- Authors YAML format includes: name, page, title, url, image_url, and optional socials (bluesky, mastodon, github, linkedin, youtube, blog)

### Formatting Requirements

- Run `npm run prettier` to automatically fix formatting issues
- `npm run prettier-lint` will show warnings for many existing files - this is normal and expected
- TypeScript compilation (`npm run typecheck`) may show some errors that are tolerated by the build process
- All builds must complete successfully even with minor TypeScript warnings

## Troubleshooting

### Common Issues

- **Build timeouts**: Builds can take 7-15+ seconds due to data fetching (feeds, playlists, GitHub profiles). Always set generous timeouts and never cancel
- **Dependency conflicts**: If `npm install` fails, try `npm install --legacy-peer-deps` for React version conflicts
- **Formatting warnings**: `npm run prettier-lint` shows many warnings for existing files - this is normal
- **TypeScript errors**: Some TypeScript errors in components may be tolerated by the build process
- **Missing dependencies**: If build fails, try `npm install` (with --legacy-peer-deps if needed) first
- **Port conflicts**: Development server uses port 3000 by default
- **Data fetching failures**: If builds hang, check network connectivity to GitHub API and YouTube
- **GitHub rate limits**: Set GITHUB_TOKEN or GH_TOKEN environment variable to increase API rate limits for profile fetching

### Recovery Steps

1. Clear build cache: `npm run clear`
2. Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
3. Check for TypeScript errors: `npm run typecheck` (some errors may be tolerated)
4. Verify formatting: `npm run prettier-lint` (warnings expected)
5. Test data fetching: `npm run fetch-data` (or individual scripts)

## Package Management

This repository uses **npm** as the standard package manager for both local development and CI/CD, following official Docusaurus recommendations.

### Adding Dependencies

```bash
npm install package-name
git add package.json package-lock.json
git commit -m "feat: add package-name"
git push
```

### Docusaurus Best Practices

1. **Always commit package-lock.json** - Ensures deterministic builds
2. **Use npm overrides for peer dependencies** - Already configured for React 19
3. **Use npm ci in CI** - Faster, stricter installs from lockfile
4. **Never manually edit package-lock.json** - Let npm manage it

### CI/CD Package Management

**GitHub Actions workflow uses:**

- `actions/setup-node@v4` with npm caching
- `npm ci` for fast, deterministic dependency installation
- Standard Docusaurus build commands

**Build steps:**

1. Install dependencies (`npm ci`)
2. Run validation (`npm run typecheck`, `npm run lint`)
3. Fetch build-time data (`npm run fetch-data`)
4. Build site (`npm run build`)

## Dependencies

- **Node.js**: Version 18+ required (see package.json engines field)
- **Package Manager**: npm (standard across development and CI/CD)
- **Docker**: Optional for containerized development
- **OS**: Works on Linux, macOS, Windows
- **Network**: Internet connection required for release feed fetching
- **Key Dependencies**:
  - Docusaurus 3.8.1 (core, preset-classic, faster)
  - React 19.x
  - TypeScript 5.9.2
  - Prettier 3.6.2
  - xml2js 0.6.2 (for feed parsing)
  - node-fetch 3.3.2 (for fetching feeds)

## Validation Scenarios

After making any changes, ALWAYS:

1. **Build Validation**: Run full build process

   ```bash
   npm run typecheck
   npm run build
   ```

2. **Content Validation**: Start development server and manually test

   ```bash
   npm run start
   # Navigate to changed pages in browser
   # Verify content renders correctly
   # Test navigation and links
   ```

3. **Production Validation**: Test built site
   ```bash
   npm run serve
   # Verify static site works correctly
   ```

## Changelog Package Tracking

The changelog cards automatically track important package versions from release feeds. Package tracking is centrally managed in `src/config/packageConfig.ts` to make maintenance simple and consistent.

### How Package Tracking Works

- **Package Summary Cards**: Display current versions of tracked packages in the top three cards on /changelogs/
- **Individual Changelog Entries**: Show version transitions (old → new) when packages are upgraded
- **Centralized Configuration**: All package patterns are defined once in `packageConfig.ts` and used by both `FeedItems.tsx` and `PackageSummary.tsx`

### Adding a New Package

To track a new package in changelog cards:

1. **Edit** `src/config/packageConfig.ts`
2. **Add** a new entry to the `PACKAGE_PATTERNS` array:

```typescript
{
  name: "PackageName",        // Display name (e.g., "Docker", "GNOME")
  pattern: /regex pattern/,    // Regex to extract version from changelog HTML
  changePattern?: /regex/,     // Optional: For "All Images" format packages
}
```

3. **Pattern Types**:
   - **Standard format**: `<td><strong>PackageName</strong></td><td>version</td>`
     ```typescript
     pattern: /<td><strong>Docker<\/strong><\/td>\s*<td>([^<]+)/;
     ```
   - **"All Images" format**: `<td>🔄</td><td>packagename</td><td>oldversion</td><td>newversion</td>`
     ```typescript
     pattern: /<td>🔄<\/td>\s*<td>packagename<\/td>\s*<td>[^<]*<\/td>\s*<td>([^<]+)/,
     changePattern: /<td>🔄<\/td>\s*<td>packagename<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)/,
     ```

### Removing a Package

To stop tracking a package:

1. **Edit** `src/config/packageConfig.ts`
2. **Remove** the entry from the `PACKAGE_PATTERNS` array
3. **Test** the changes with `npm run build` and `npm run start`

### Package Handling Rules

- **Missing packages** gracefully fill in over time as new releases include them
- **Failed pattern matches** are silently ignored - no errors thrown
- **Version arrows** (6.14.11-300 ➡️ 6.15.9-201) are automatically detected for upgrade transitions
- **Static versions** (no arrow) show current version in summary cards
- **Search scope**: Examines up to 10 recent releases to find the latest version of each package

### Current Tracked Packages

As of this documentation update, the following packages are tracked:

- **Kernel**: Main kernel version
- **HWE Kernel**: Hardware enablement kernel
- **GNOME**: Desktop environment version
- **Mesa**: Graphics drivers
- **Podman**: Container runtime
- **NVIDIA**: Proprietary GPU drivers
- **Docker**: Container platform
- **systemd**: System and service manager
- **bootc**: Bootable container tools

### Validation After Changes

Always validate package tracking changes:

```bash
# TypeScript validation
npm run typecheck

# Build test
npm run build

# Manual testing
npm run start
# Navigate to /changelogs/ and verify package versions display correctly
```

## Monthly Reports System

The monthly reports system automatically generates transparent, data-driven summaries of completed work, active contributors, and project momentum from monitored Bluefin repositories. Reports are published on the last day of each month covering the entire month's activity.

### Architecture Overview

**System Components:**

- **GitHub Actions Workflow** (`.github/workflows/monthly-reports.yml`) - Cron-scheduled automation
- **Data Collection** (`scripts/generate-report.js`) - Main orchestration script
- **GraphQL Client** (`scripts/lib/graphql-queries.js`) - GitHub REST API integration for repository data
- **Monitored Repos** (`scripts/lib/monitored-repos.js`) - List of repositories to track
- **Label Mapping** (`scripts/lib/label-mapping.js`) - Static label colors and categorization
- **Contributor Tracking** (`scripts/lib/contributor-tracker.js`) - Historical contributor tracking with bot filtering
- **Markdown Generator** (`scripts/lib/markdown-generator.js`) - Report formatting and template
- **Multi-blog Configuration** (`docusaurus.config.ts`) - Separate blog instance for reports at `/reports`

**Data Flow:**

```
GitHub Actions Cron (monthly on last day)
  ↓
Fetch closed PRs from projectbluefin/common (planned work)
  ↓
Fetch closed PRs from other monitored repos (opportunistic work)
  ↓
Filter to merged PRs only (exclude closed issues)
  ↓
Separate human contributions from bot activity
  ↓
Update contributor history (track first-time contributors)
  ↓
Categorize items by labels (Desktop, Dev, Ecosystem, Hardware, Infrastructure)
  ↓
Generate markdown (frontmatter + sections)
  ↓
Write to reports/YYYY-MM-DD-report.mdx
  ↓
Git commit and push
  ↓
Build and deploy via GitHub Pages
```

**Data Sources:**

- **Planned Work:** Merged PRs from `projectbluefin/common`
- **Opportunistic Work:** Merged PRs from other monitored repositories
- **Monitored Repos:** See `scripts/lib/monitored-repos.js` for full list
- **Labels:** Label colors and categories from static mapping
- **Contributors:** Author information from GitHub API
- **Historical Data:** `static/data/contributors-history.json` (persisted via Git checkout action)

### How It Works

**Cron Schedule:**

- Workflow runs on the last day of each month at 10:00 UTC
- Script calculates month date range (first day to last day)
- Reports cover entire month's completed items
- Single report generated per month

**Date Range Calculation:**

- Uses `date-fns` library for date manipulation
- Month boundaries: startOfMonth to endOfMonth
- Filters merged PRs with mergedAt/closedAt within month range
- Report filename: YYYY-MM-DD-report.mdx (last day of month)

**Repository Data Fetching:**

- GraphQL queries to fetch closed issues and merged PRs from monitored repositories
- Planned work: `projectbluefin/common` repository
- Opportunistic work: All other monitored repositories (see `scripts/lib/monitored-repos.js`)
- Filters to merged PRs only (excludes closed issues)
- Date filtering: mergedAt/closedAt within report month

**Label Categorization:**

- **Project Areas:** Desktop, Development, Ecosystem, Hardware, Infrastructure
- **Work Types:** Bug, Enhancement, Documentation, Tech Debt, Automation
- **Badge Generation:** Color-coded badges using static label mapping
- **Fallback:** Uncategorized items grouped separately
- **Planned vs Opportunistic:** Items are split into two subsections within each category

**Contributor Tracking:**

- **Bot Detection:** Regex patterns for common bot usernames (dependabot, renovate, github-actions, etc.)
- **Historical Tracking:** JSON file persists contributor list across report runs (`static/data/contributors-history.json`)
- **First-Time Recognition:** Compares current contributors against history
- **New Contributor Highlight:** First-time contributors are:
  - Listed in a separate "🌟 New Contributors" section above repeat contributors
  - Given a gold foil effect (`highlight={true}` prop) on their GitHubProfileCard
  - Also included in the main "👥 Contributors" section (without highlight)
- **Bot Separation:** Bot activity shown separately from human contributions
- **PR Authors Only:** Only merged PR authors are counted as contributors (closed issues excluded)

**Markdown Generation:**

- **Frontmatter:** Report metadata (date, tags, authors, slug)
- **Summary:** Key metrics (items completed, contributors, new contributors)
- **Project Areas:** Work grouped by area with status badges
- **Work Types:** Items categorized by enhancement/bug/docs/etc.
- **Bot Activity:** Aggregated by repository and bot username
- **Contributors:** List with links to GitHub profiles
- **Footer:** Cross-links to changelogs and blog

### File Locations and Purposes

| File Path                               | Purpose                                             |
| --------------------------------------- | --------------------------------------------------- |
| `.github/workflows/monthly-reports.yml` | GitHub Actions workflow (cron + manual trigger)     |
| `scripts/generate-report.js`            | Main orchestration script                           |
| `scripts/lib/graphql-queries.js`        | GraphQL client and Projects V2 queries              |
| `scripts/lib/label-mapping.js`          | Static label color and category mappings            |
| `scripts/lib/contributor-tracker.js`    | Historical contributor tracking with bot filtering  |
| `scripts/lib/markdown-generator.js`     | Report markdown formatting and templates            |
| `reports/`                              | Generated report blog posts (YYYY-MM-DD-report.mdx) |
| `static/data/contributors-history.json` | Auto-generated contributor history (gitignored)     |
| `docusaurus.config.ts`                  | Multi-blog configuration (`id: 'reports'`)          |

### Manual Report Generation

To generate a report locally for testing:

1. **Export GitHub token:**

   ```bash
   export GITHUB_TOKEN=your_personal_access_token
   # Token needs: repo read access, project read access
   ```

2. **Run generation script:**

   ```bash
   npm run generate-report
   # Script outputs progress logs
   # Report written to reports/YYYY-MM-DD-report.mdx
   ```

3. **Review generated report:**

   ```bash
   cat reports/YYYY-MM-DD-report.mdx
   # Check frontmatter and content sections
   ```

4. **Preview in browser:**

   ```bash
   npm run start
   # Navigate to http://localhost:3000/reports
   ```

### Testing Workflow Manually

To test the GitHub Actions workflow without waiting for cron:

1. **Navigate to Actions tab:**
   - Open repository in GitHub
   - Click "Actions" tab
   - Select "Generate Monthly Report" workflow

2. **Trigger workflow manually:**
   - Click "Run workflow" button (top right)
   - Select branch (usually `main` or test branch)
   - Click green "Run workflow" button

3. **Monitor execution:**
   - Workflow appears in run list immediately
   - Click run to see live logs
   - Check each step: checkout, setup, install, generate, commit

4. **Verify results:**
   - Check for new commit in repository history
   - Review generated report file in `reports/` directory
   - Verify report displays correctly on deployed site

**Workflow Dispatch Benefits:**

- Test automation without modifying cron schedule
- Validate changes to scripts before merge
- Generate ad-hoc reports for special periods
- Debug issues in clean CI environment

### Troubleshooting Guide

#### Issue: "GITHUB_TOKEN or GH_TOKEN environment variable required"

**Cause:** Missing authentication token for GitHub API

**Solution:** Export token with repo read access:

```bash
export GITHUB_TOKEN=ghp_your_token_here
# Or use GitHub CLI token:
export GH_TOKEN=$(gh auth token)
```

**In CI:** Token is automatically provided via `secrets.GITHUB_TOKEN` (no action needed).

**Token Permissions:** Requires `contents: read` and `project: read` (automatically granted to workflow token).

#### Issue: "GraphQL rate limit exceeded"

**Cause:** Hit GitHub API rate limits (5,000 requests/hour authenticated, 60/hour unauthenticated)

**Solution:** Script includes rate limit detection and logs reset time:

- Check error message for rate limit reset timestamp
- Wait for rate limit to reset (typically 1 hour)
- Ensure `GITHUB_TOKEN` is set (authenticated requests have higher limits)
- In CI, workflow token automatically provides authentication

**GraphQL Points:** Each query uses ~50 points. 5,000 point limit allows ~100 reports/hour (far exceeds monthly needs).

#### Issue: "Network timeout" or "ECONNRESET"

**Cause:** Network issues or GitHub API downtime

**Solution:** Script includes automatic retry with exponential backoff:

- Retries up to 3 times (delays: 2s, 4s, 8s)
- Check logs for retry attempts
- Verify GitHub API status: [githubstatus.com](https://www.githubstatus.com/)
- If persistent, re-run workflow manually after network recovery

**Error Log Example:**

```
Retry 1/3 after network error: ECONNRESET
Retry 2/3 after network error: ETIMEDOUT
```

#### Issue: Empty report sections

**Cause:** No items completed in report window (quiet period)

**Solution:** This is expected behavior during low-activity periods:

- Report still generated with summary section
- Message indicates "quiet period with no completed items"
- Bot activity may still be present
- Historical contributor tracking continues normally

**Verify on Project Board:**

- Check [todo.projectbluefin.io](https://todo.projectbluefin.io)
- Filter by Status="Done" and date range
- Confirm no items moved to Done in report window

#### Issue: "Failed to update contributor history"

**Cause:** `contributors-history.json` is corrupted or unreadable

**Solution:** Script includes automatic recovery:

- Detects invalid JSON format
- Logs warning: "Contributor history corrupted. Resetting history file."
- Initializes fresh history with current contributors
- Report generation continues normally

**Manual Reset (if needed):**

```bash
rm static/data/contributors-history.json
npm run generate-report
# History rebuilt from current report
```

**Note:** Resetting history means all current contributors treated as new (one-time occurrence).

#### Issue: Missing labels or incorrect categorization

**Cause:** Label mapping out of sync with project board labels

**Solution:** Update static label mapping:

1. Check current labels on [Project Board](https://todo.projectbluefin.io)
2. Edit `scripts/lib/label-mapping.js`
3. Update `LABEL_COLORS` object with new colors
4. Update `LABEL_CATEGORIES` if category structure changed
5. Test with: `npm run generate-report`

**See:** "Updating Label Mappings" section below for detailed process.

### Updating Label Mappings

Label mappings are static (not fetched at runtime) for performance. Update when label colors or categories change in the project board.

**Process:**

1. **Identify label changes:**
   - Navigate to [Project Board](https://todo.projectbluefin.io)
   - Click any item to see label list
   - Note new labels or color changes

2. **Edit label mapping file:**

   ```bash
   # Open mapping file
   vim scripts/lib/label-mapping.js
   ```

3. **Update LABEL_COLORS object:**

   ```javascript
   export const LABEL_COLORS = {
     // Format: "label-name": "hexcolor"
     desktop: "0e8a16",
     development: "1d76db",
     // Add new labels:
     "new-label": "ff6b6b",
   };
   ```

4. **Update LABEL_CATEGORIES (if needed):**

   ```javascript
   export const LABEL_CATEGORIES = {
     projectAreas: [
       "desktop",
       "development",
       "ecosystem",
       "hardware",
       "infrastructure",
     ],
     workTypes: [
       "bug",
       "enhancement",
       "documentation",
       "tech-debt",
       "automation",
     ],
   };
   ```

5. **Test changes:**

   ```bash
   npm run generate-report
   # Check that new labels appear with correct colors
   npm run start
   # Verify badges render correctly in browser
   ```

**Label Color Format:**

- Hex codes without `#` prefix (GitHub API format)
- 6 characters (e.g., `"ff6b6b"` for red)
- Case insensitive

**Automatic Refresh (Future Enhancement):**

- Currently manual update required
- Future: Script could fetch labels from projectbluefin/common `.github/labels.yml`
- See: `.planning/phases/03-documentation-refinement/03-CONTEXT.md` out-of-scope section

### Modifying Report Templates

Report markdown structure is defined in `scripts/lib/markdown-generator.js`. Customize sections, formatting, or content as needed.

**Key Functions:**

```javascript
// Generate frontmatter (metadata)
generateFrontmatter(startDate, endDate);
// Returns: YAML frontmatter string

// Generate summary section
generateSummary(items, contributors, newContributors, startDate, endDate);
// Returns: Markdown string with key metrics

// Generate project area sections
generateCategorySection(items, categoryName);
// Returns: Markdown with items grouped by area

// Generate bot activity tables
generateBotSection(botActivity);
// Returns: Markdown tables of bot PRs by repo

// Generate contributors list
generateContributorsSection(contributors, newContributors);
// Returns: Markdown list with profile links
```

**Customization Examples:**

**Change date format in frontmatter:**

```javascript
// Before:
date: ${format(endDate, "yyyy-MM-dd")}

// After (human-readable):
date: ${format(endDate, "MMMM d, yyyy")}
```

**Add new section (e.g., "Top Contributors"):**

```javascript
function generateTopContributorsSection(items) {
  const contributorCounts = {};
  items.forEach((item) => {
    const author = item.content?.author?.login;
    if (author)
      contributorCounts[author] = (contributorCounts[author] || 0) + 1;
  });

  const sorted = Object.entries(contributorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    `## Top Contributors\n\n` +
    sorted
      .map(
        ([author, count]) =>
          `- [@${author}](https://github.com/${author}): ${count} items`,
      )
      .join("\n")
  );
}
```

**Modify item display format:**

```javascript
// Before:
- [#${number}](${url}): ${title}

// After (add repository):
- [${repo}#${number}](${url}): ${title}
```

**Testing Template Changes:**

```bash
# Generate test report
npm run generate-report

# Check output
cat reports/YYYY-MM-DD-report.mdx

# Preview in browser
npm run start
# Navigate to http://localhost:3000/reports
```

**Validation:**

- Ensure valid Docusaurus frontmatter (YAML format)
- Test that markdown renders correctly
- Verify links work (GitHub profiles, issues, PRs)
- Check that badges display properly

### Performance Considerations

**Build Time Impact:**

- Report generation adds ~5-15 seconds to build process
- Data fetching is primary bottleneck (GraphQL API calls)
- Total build time: ~20-30 seconds (well within <2 minute target)

**GraphQL API Usage:**

- Each report uses ~50 GraphQL points (query complexity)
- Rate limit: 5,000 points/hour (authenticated)
- Capacity: ~100 reports/hour (far exceeds monthly needs)
- Pagination: 100 items per request (efficient for large projects)

**Optimization Strategies:**

- **Cursor Pagination:** Fetches only necessary pages (no over-fetching)
- **Field Selection:** GraphQL query requests only needed fields
- **Bot Filtering:** Happens in-memory after fetching (no extra API calls)
- **Static Labels:** No API calls for label colors (mapped statically)

**Caching (Not Implemented):**

- Current: Fresh data every run (preferred for accuracy)
- Future: Could cache project board data (5-10 minute TTL)
- Tradeoff: Caching reduces API usage but may show stale data

**Monitoring:**

- Check workflow execution time in GitHub Actions logs
- Monitor "Fetching project board data" step duration
- Flag if build exceeds 2 minute target (optimization needed)

### Auto-Generated Files - DO NOT COMMIT

The following file is auto-generated at build time and should **NEVER** be committed to git:

- `static/data/contributors-history.json` - Generated by contributor tracking

**Why:** This file is managed by the GitHub Actions workflow and persisted via Git checkout action. Committing it creates merge conflicts and git history bloat.

**Gitignore Status:** Already in `.gitignore` but may appear if generated locally.

**If Accidentally Committed:**

```bash
# Remove from last commit (if not pushed)
git rm --cached static/data/contributors-history.json
git commit --amend --no-edit

# After amending, if already pushed:
git push --force-with-lease
```

## Repository Context

This repository contains documentation for Bluefin OS. The main Bluefin OS images are built in the [ublue-os/bluefin](https://github.com/ublue-os/bluefin) repository and [ublue-os/bluefin-lts](https://github.com/ublue-os/bluefin-lts) repositories. This docs repository:

- Provides user-facing documentation
- Generates release changelogs automatically from GitHub releases
- Fetches YouTube playlist metadata for the music page
- Fetches GitHub user profiles for the donations/credits page
- Deploys to https://docs.projectbluefin.io/ via GitHub Pages
- Integrates with main repository via automated workflows

Common documentation areas include:

- Installation guides (`docs/installation.md`, `docs/downloads.md`)
- Developer experience (`docs/bluefin-dx.md`, `docs/bluefin-gdx.md`, `docs/devcontainers.md`)
- FAQ and troubleshooting (`docs/FAQ.md`)
- Hardware-specific guides (`docs/t2-mac.md`)
- Community information (`docs/code-of-conduct.md`, `docs/values.md`, `docs/mission.md`, `docs/donations/`)
  - Donations section split into: `docs/donations/index.mdx`, `docs/donations/contributors.mdx`, `docs/donations/projects.mdx`
- Gaming support (`docs/gaming.md`)
- LTS information (`docs/lts.md`)
- Tips and command-line usage (`docs/tips.md`, `docs/command-line.md`)
- Music playlists (`docs/music.md`)
- AI information (`docs/ai.md`)
- Local development (`docs/local.md`)
- Lore and dinosaurs (`docs/lore.md`, `docs/dinosaurs.md`)
- Press kit (`docs/press-kit.md`)

Other Rules:

- **Remember**: Documentation should be consumable in one sitting and link to upstream docs rather than duplicating content.
- **Never** create new pages unless explicitly told to do so.
- **Images page removed**: The automated images page was recently removed (commit 52e6fee). Do not recreate it.
- For `docs/music.md` - always ensure the thumbnail aspect ratio is 1:1 and ensure that the album sizes remain consistent across the page. Playlists use the MusicPlaylist component which fetches metadata at build time.
- For `docs/donations.mdx` - uses GitHubProfileCard component which displays profiles fetched at build time from `static/data/github-profiles.json`. Profile data includes name, bio, avatar, company, location, and social links.

## ProjectCard Component (Projects Donations Page)

The `ProjectCard` component (`src/components/ProjectCard.tsx`) displays open source projects on the `/donations/projects` page with icons, descriptions, GitHub stats (stars/forks), and donate buttons.

### Component Props

```typescript
interface ProjectCardProps {
  name: string; // Display name of the project
  description: string; // Short description
  sponsorUrl?: string; // URL to donation/sponsor page
  packageName?: string; // Optional package name to display
  icon?: string; // URL to project icon (typically GitHub avatar)
  githubRepo?: string; // GitHub repo path (e.g., "owner/repo") for stats
}
```

### How It Works

1. **Build-time data**: Stats are pre-fetched via `scripts/fetch-github-repos.js` and stored in `static/data/github-repos.json`
2. **Runtime fallback**: If build-time data is missing, fetches from GitHub API with request queue (1s delay) and localStorage caching (24h)
3. **Graceful degradation**: Projects without `githubRepo` prop (e.g., GitLab-hosted) simply don't show stats

### Adding a New Project

1. **Edit** `docs/donations/projects.mdx`
2. **Add** a ProjectCard in the appropriate section:

```jsx
<ProjectCard
  name="Project Name"
  description="What the project does"
  sponsorUrl="https://sponsor-url.com"
  icon="https://github.com/org-or-user.png"
  githubRepo="owner/repo"
/>
```

3. **Edit** `scripts/fetch-github-repos.js` to add the repo to `GITHUB_REPOS` array
4. **Test** with `npm run fetch-github-repos && npm run start`

### Upstream Package Sources

The projects page should reflect packages actually included in Bluefin. Reference these files:

- **Flatpak apps**: [ublue-os/bluefin/flatpaks/system-flatpaks.list](https://github.com/ublue-os/bluefin/blob/main/flatpaks/system-flatpaks.list)
- **GNOME extensions**: [ublue-os/bluefin/system_files/shared/usr/share/gnome-shell/extensions/](https://github.com/ublue-os/bluefin/tree/main/system_files/shared/usr/share/gnome-shell/extensions)
- **Homebrew CLI tools (bluefin-cli)**: [projectbluefin/common/system_files/shared/usr/share/ublue-os/homebrew/cli.Brewfile](https://github.com/projectbluefin/common/blob/main/system_files/shared/usr/share/ublue-os/homebrew/cli.Brewfile)

### Icon URLs

Use GitHub avatar URLs for icons:

- Organizations: `https://github.com/org-name.png`
- Users: `https://github.com/username.png`

For projects not on GitHub, you can still use the org's GitHub avatar if they have a mirror, or omit the icon prop.

### Projects Without GitHub Repos

Some projects are hosted on GitLab or elsewhere (e.g., GNOME apps, Firefox, Thunderbird). For these:

- Omit the `githubRepo` prop
- The card will display without stars/forks
- Still include `icon` and `sponsorUrl` if available

## Commit Guidelines

This repository uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for standardized commit messages that support automated changelog generation.

### Using the Conventional Commit Prompt

Use the [conventional-commit.prompt.md](.github/prompts/conventional-commit.prompt.md) prompt file to generate properly formatted commit messages. The prompt will:

1. Review your staged changes with `git status` and `git diff`
2. Guide you through the commit message structure
3. Validate your message against the specification
4. Automatically execute the commit command

### Commit Message Format

Commits must follow this structure:

```
type(scope): description

[optional body]

[optional footer(s)]
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Formatting, missing semi colons, etc.
- `refactor` - Code restructuring without behavior change
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system or dependency changes
- `ci` - CI configuration changes
- `chore` - Maintenance tasks
- `revert` - Reverting previous commits

**Scope:** Optional but recommended for clarity (e.g., `docs`, `prompts`, `build`, `components`)

**Description:** Short imperative summary (e.g., "add" not "added")

### AI Agent Attribution

AI agents must disclose the tool and model used in the commit footer with an "Assisted-by" trailer:

```
Assisted-by: [Model Name] via [Tool Name]
```

### Complete Example

Here's a complete commit combining conventional format with AI attribution:

```
feat(prompts): add conventional commit prompt file

Add the conventional-commit.prompt.md from awesome-copilot repository
to help contributors write standardized commit messages. This prompt
automates the commit message generation process and validates against
the Conventional Commits specification.

Assisted-by: Claude Sonnet 4.5 via GitHub Copilot
```

### Quick Examples

```
docs: update installation guide for F42
fix(changelog): resolve feed fetching timeout issue
chore(deps): update docusaurus to 3.8.1
feat(components)!: redesign ProjectCard with stats API
```

**Note:** Add `!` after the type/scope to indicate breaking changes, or use `BREAKING CHANGE:` in the footer.
