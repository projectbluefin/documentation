# Bluefin Documentation

Bluefin documentation is a Docusaurus 3.8.1 TypeScript website that provides comprehensive documentation for the Bluefin operating system. The site generates documentation pages from markdown files and auto-fetches release feeds for changelogs.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

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

**Note**: The CI/CD pipeline uses `bun` as the package manager, but `npm` is fully supported for local development.

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
  - `static/data/activity-items.json` - Project board items from projectbluefin/projects/2
- **Static Assets**: Images and files in `static/` directory

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

### Auto-Generated Files and Git Hygiene

**CRITICAL: Do NOT commit auto-generated files to the repository.**

The following files are auto-generated at build time and should NEVER be committed:

1. **Compiled JavaScript from TypeScript**: 
   - `src/**/*.js` files (except config files and scripts)
   - These are generated from `.ts`/`.tsx` files during build
   - Check `.gitignore` excludes: `/src/**/*.js`

2. **Auto-generated data files**:
   - `static/data/activity-items.json` - Generated by `npm run fetch-activity-data`
   - `static/data/playlist-metadata.json` - Generated by `npm run fetch-playlists`
   - `static/data/github-repos.json` - Generated by `npm run fetch-github-repos`
   - `static/feeds/*.json` - Generated by `npm run fetch-feeds`
   - Check `.gitignore` excludes these patterns

3. **Before committing, ALWAYS verify**:
   ```bash
   git status
   # Review the list of changed files
   # Ensure no auto-generated files are staged
   ```

4. **If auto-generated files are accidentally committed**:
   ```bash
   # Remove from git (keeps local copy)
   git rm --cached path/to/file.js
   
   # Update .gitignore to prevent recurrence
   echo "/path/to/pattern" >> .gitignore
   
   # Commit the removal
   git add .gitignore
   git commit -m "chore: remove auto-generated files and update gitignore"
   ```

5. **Current .gitignore patterns for auto-generated files**:
   ```gitignore
   # Auto-generated documentation
   /docs/contributing.md
   /static/feeds/*.json
   /static/data/activity-items.json
   /static/data/playlist-metadata.json
   /static/data/github-repos.json
   .nvidia-drivers-cache.json

   # Compiled JavaScript from TypeScript
   /src/**/*.js
   !**/*.config.js
   !**/scripts/**/*.js
   ```

**Why this matters**: Auto-generated files create unnecessary merge conflicts, bloat the repository history, and can become stale if not regenerated. The CI/CD pipeline regenerates these files on every build.

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

## Dependencies

- **Node.js**: Version 18+ required (see package.json engines field)
- **Package Managers**: npm supported for local development, bun used in CI/CD
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
- Community information (`docs/communication.md`, `docs/code-of-conduct.md`, `docs/values.md`, `docs/mission.md`, `docs/donations/`)
  - Donations section split into: `docs/donations/index.mdx`, `docs/donations/contributors.mdx`, `docs/donations/projects.mdx`
- Gaming support (`docs/gaming.md`)
- LTS information (`docs/lts.md`)
- Tips and command-line usage (`docs/tips.md`, `docs/command-line.md`)
- Music playlists (`docs/music.md`)
- AI information (`docs/ai.md`)
- Activity timeline (`docs/activity.mdx`)
- Local development (`docs/local.md`)
- Lore and dinosaurs (`docs/lore.md`, `docs/dinosaurs.md`)
- Press kit (`docs/press-kit.md`)

Other Rules:

- **Remember**: Documentation should be consumable in one sitting and link to upstream docs rather than duplicating content.
- **Never** create new pages unless explicitly told to do so.
- **Images page removed**: The automated images page was recently removed (commit 52e6fee). Do not recreate it.
- For `docs/music.md` - always ensure the thumbnail aspect ratio is 1:1 and ensure that the album sizes remain consistent across the page. Playlists use the MusicPlaylist component which fetches metadata at build time.
- For `docs/donations.mdx` - uses GitHubProfileCard component which displays profiles fetched at build time from `static/data/github-profiles.json`. Profile data includes name, bio, avatar, company, location, and social links.
- For `docs/activity.mdx` - displays weekly timeline of project board items from projectbluefin/projects/2, using ActivityCard component with data fetched at build time from `static/data/activity-items.json` via GitHub Projects V2 GraphQL API.

## ProjectCard Component (Projects Donations Page)

The `ProjectCard` component (`src/components/ProjectCard.tsx`) displays open source projects on the `/donations/projects` page with icons, descriptions, GitHub stats (stars/forks), and donate buttons.

### Component Props

```typescript
interface ProjectCardProps {
  name: string;           // Display name of the project
  description: string;    // Short description
  sponsorUrl?: string;    // URL to donation/sponsor page
  packageName?: string;   // Optional package name to display
  icon?: string;          // URL to project icon (typically GitHub avatar)
  githubRepo?: string;    // GitHub repo path (e.g., "owner/repo") for stats
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

## Activity Timeline Page (docs/activity.mdx)

The activity timeline page (`/activity`) displays a weekly chronological view of project board items from [projectbluefin/projects/2](https://github.com/orgs/projectbluefin/projects/2) using the GitHub Projects V2 GraphQL API.

### How It Works

1. **Build-time data**: Activity items are fetched via `scripts/fetch-activity-data.js` using GitHub's GraphQL API and stored in `static/data/activity-items.json`
2. **Runtime display**: The page groups items by ISO week (Monday start), renders week headers with item counts, and displays cards in reverse chronological order (newest first)
3. **Status visualization**: Cards have color-coded left borders (green=Done, blue=In Progress, gray=Todo, red=Blocked) matching Proposal C (Hybrid Activity Stream)

### ActivityCard Component

**Component**: `src/components/ActivityCard.tsx`  
**Styling**: `src/components/ActivityCard.module.css`

**Props interface:**
```typescript
{
  title: string;              // Item title
  body?: string;              // Description (first line shown)
  status: string;             // Todo/In Progress/Done/Blocked
  isDraft: boolean;           // Whether it's a draft issue
  isPR: boolean;              // Whether it's a pull request
  updatedAt: string;          // Last updated timestamp (ISO 8601)
  url?: string;               // Link to issue/PR (null for drafts)
  repository?: string;        // Repo name (e.g., "projectbluefin/common")
  repositoryUrl?: string;     // Link to repository
  number?: number;            // Issue/PR number
  assignees?: Assignee[];     // Array of assigned users
  labels?: Label[];           // Array of GitHub labels
}
```

**Key Features:**
- 4px left border color-coded by status
- Status badge, draft indicator, and PR indicator
- Relative time display (e.g., "2 days ago")
- Repository link with issue/PR number
- Overlapping assignee avatars (28px, -8px margin)
- GitHub labels with background colors and contrast-adjusted text
- Hover effects matching ProjectCard/GitHubProfileCard patterns

### Data Fetching Script

**Script**: `scripts/fetch-activity-data.js`

**GraphQL API Usage:**
- Queries GitHub Projects V2 API at `https://api.github.com/graphql`
- Two-phase approach: (1) Fetch project fields for Status metadata, (2) Paginate items with cursor-based pagination
- Pagination: 50 items per request (~8-10 API points per page)
- Rate limiting: 1-second delay between requests, ~80-100 points total for 400-500 items

**Authentication:**
- Checks `GITHUB_TOKEN` or `GH_TOKEN` environment variables
- Public projects can be queried without authentication
- For private/internal projects or higher rate limits, set token with `read:project` and `read:org` scopes

**Output:**
- Filters out archived items
- Processes draft issues, issues, and pull requests
- Extracts status from project field values
- Includes assignee avatars, labels, repository info
- Sorts by `updatedAt` descending (newest first)
- Writes to `static/data/activity-items.json`

**Running manually:**
```bash
npm run fetch-activity-data
```

**Expected API costs:**
- ~8-10 points per 50 items (pagination query)
- ~2 points for field metadata query (one-time)
- Total: ~80-100 points for typical project board size
- Well within GitHub's 5,000 points/hour limit

### Adding/Modifying Activity Timeline

**To update data source:**
1. Edit `scripts/fetch-activity-data.js` to change `ORG` or `PROJECT_NUMBER` constants
2. Test with `npm run fetch-activity-data` to verify GraphQL query works
3. Check output in `static/data/activity-items.json`

**To customize card display:**
1. Edit `src/components/ActivityCard.tsx` for layout/content changes
2. Edit `src/components/ActivityCard.module.css` for styling changes
3. Status colors defined in `.statusDone`, `.statusInProgress`, `.statusTodo`, `.statusBlocked` classes

**To change grouping/sorting:**
1. Edit the `ActivityTimeline` component in `docs/activity.mdx`
2. Modify `getWeekStart()` for different week boundaries
3. Adjust sorting logic in `sortedWeeks` calculation

### Troubleshooting

**GraphQL authentication errors:**
- Set `GITHUB_TOKEN` environment variable with `read:project` scope
- For organization projects, also needs `read:org` scope
- Verify token: `gh auth status` or `echo $GITHUB_TOKEN`

**Rate limiting:**
- GraphQL uses points system (5,000 points/hour)
- Complex nested queries cost more points
- Check rate limit status in response headers: `x-ratelimit-remaining`
- Increase delay between requests if hitting limits

**Empty data:**
- Verify project number: [https://github.com/orgs/projectbluefin/projects/2](https://github.com/orgs/projectbluefin/projects/2)
- Check if project is private (requires authentication)
- Look for errors in script output during `npm run fetch-activity-data`

**Items not showing:**
- Archived items are filtered out automatically
- Items without content (null) are excluded
- Check `item.isArchived` and `item.content` in raw API response

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
