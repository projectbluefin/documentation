# Bluefin Documentation

Bluefin documentation is a Docusaurus 3.8.1 TypeScript website that provides comprehensive documentation for the Bluefin operating system. The site generates documentation pages from markdown files and auto-fetches release feeds for changelogs.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

Bootstrap, build, and test the repository:

- `npm install` -- takes 50-60 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
  - **Note**: If installation fails with React peer dependency conflicts, use `npm install --legacy-peer-deps`
- `npm run build` -- takes 7-15 seconds (includes fetch-feeds step). NEVER CANCEL. Set timeout to 60+ seconds.

Run the development server:

- **ALWAYS run the bootstrapping steps first.**
- Local development: `npm run start` (includes automatic feed fetching)
- Docker development: `docker compose up`

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

# Start development server (auto-reloads on changes, includes feed fetching)
npm run start

# Build production site (NEVER CANCEL - 7-15s runtime, includes feed fetching)
npm run build

# Serve built site locally
npm run serve

# Validate TypeScript (some errors may be tolerated by build process)
npm run typecheck

# Check formatting (many warnings expected on existing files)
npm run prettier-lint

# Fix formatting issues
npm run prettier

# Fetch release feeds manually (auto-runs during start/build)
npm run fetch-feeds

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
docs/                    # Documentation markdown files (26 files)
blog/                   # Blog posts (16 files)
  authors.yaml          # Blog author information with socials
changelogs/             # Changelog welcome content (manually created)
  authors.yaml          # Changelog author information
src/                    # React components and pages
  components/           # React components (FeedItems, PackageSummary, CommunityFeeds)
  config/               # Configuration (packageConfig.ts)
  pages/                # Custom pages (changelogs.tsx)
  types/                # TypeScript type definitions
  css/                  # Custom styling
static/                 # Static assets (images, feeds, etc.)
  feeds/                # Auto-generated release feeds (JSON)
  img/                  # Images and graphics
scripts/                # Build scripts (fetch-feeds.js)
sidebars.ts             # Navigation structure (TypeScript)
docusaurus.config.ts    # Main Docusaurus configuration
package.json            # Dependencies and scripts
Justfile                # Just command runner recipes (build, serve)
```

### Content Types

- **Documentation**: 26 files in `docs/` directory, written in Markdown/MDX
- **Blog Posts**: 16 files in `blog/` directory, with frontmatter metadata and author attribution from `blog/authors.yaml`
- **Changelogs**: Manually created welcome content in `changelogs/` directory, displayed alongside auto-generated release feeds
- **Release Feeds**: Auto-fetched JSON files in `static/feeds/` via `fetch-feeds.js` script
  - `bluefin-releases.json` - fetched from ublue-os/bluefin releases
  - `bluefin-lts-releases.json` - fetched from ublue-os/bluefin-lts releases
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

## Troubleshooting

### Common Issues

- **Build timeouts**: Builds can take 7-15+ seconds due to feed fetching. Always set generous timeouts and never cancel
- **Dependency conflicts**: If `npm install` fails, try `npm install --legacy-peer-deps` for React version conflicts
- **Formatting warnings**: `npm run prettier-lint` shows many warnings for existing files - this is normal
- **TypeScript errors**: Some TypeScript errors in components may be tolerated by the build process
- **Missing dependencies**: If build fails, try `npm install` (with --legacy-peer-deps if needed) first
- **Port conflicts**: Development server uses port 3000 by default
- **Feed fetching**: If builds hang, check network connectivity to GitHub releases API

### Recovery Steps

1. Clear build cache: `npm run clear`
2. Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
3. Check for TypeScript errors: `npm run typecheck` (some errors may be tolerated)
4. Verify formatting: `npm run prettier-lint` (warnings expected)
5. Test feed fetching: `npm run fetch-feeds`

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
- Generates release changelogs automatically
- Deploys to https://docs.projectbluefin.io/ via GitHub Pages
- Uses conventional commits for changelog generation, follow the conventional commits spec when submitting pull requests: conventional-commits/conventionalcommits.org
- Integrates with main repository via automated workflows

Common documentation areas include:

- Installation guides (`docs/installation.md`, `docs/downloads.md`)
- Developer experience (`docs/bluefin-gdx.md`, `docs/devcontainers.md`)
- FAQ and troubleshooting (`docs/FAQ.md`)
- Hardware-specific guides (`docs/t2-mac.md`)
- Community information (`docs/communication.md`, `docs/code-of-conduct.md`, `docs/values.md`, `docs/mission.md`)
- Gaming support (`docs/gaming.md`)
- LTS information (`docs/lts.md`)
- Tips and command-line usage (`docs/tips.md`, `docs/command-line.md`)

Other Rules:

- **Remember**: Documentation should be consumable in one sitting and link to upstream docs rather than duplicating content.
- **Never** create new pages unless explicitly told to do so.
- **Images page removed**: The automated images page was recently removed (commit 52e6fee). Do not recreate it.
- For [music.md](docs/music.md) - always ensure the thumbnail aspect ratio is 1:1 and ensure that the album sizes remain consistent across the page.

### Attribution Requirements

AI agents must disclose what tool and model they are using in the "Assisted-by" commit footer:

```text
Assisted-by: [Model Name] via [Tool Name]
```

Example:

```text
Assisted-by: GLM 4.6 via Claude Code
```
