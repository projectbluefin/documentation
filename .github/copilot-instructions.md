# Bluefin Documentation

Bluefin documentation is a Docusaurus 3.8.1 TypeScript website that provides comprehensive documentation for the Bluefin operating system. The site generates both documentation pages and changelogs from markdown files.

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
docs/                    # Documentation markdown files
blog/                   # Blog posts
changelogs/             # Changelog content (manually created and auto-generated)
src/                    # React components and pages
static/                 # Static assets (images, feeds, etc.)
scripts/                # Build scripts (fetch-feeds.js)
sidebars.ts             # Navigation structure (TypeScript)
sidebars.js             # Navigation structure (JavaScript, legacy)
docusaurus.config.ts    # Main configuration
package.json            # Dependencies and scripts
```

### Content Types

- **Documentation**: Files in `docs/` directory, written in Markdown/MDX
- **Blog Posts**: Files in `blog/` directory, with frontmatter metadata
- **Changelogs**: Files in `changelogs/` directory, manually created content
- **Release Feeds**: Auto-fetched JSON files in `static/feeds/` via `fetch-feeds` script
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

## Repository Context

This repository contains documentation for Bluefin OS. The main Bluefin OS images are built in the [ublue-os/bluefin](https://github.com/ublue-os/bluefin) repository and [ublue-os/bluefin-lts](https://github.com/ublue-os/bluefin-lts) repositories. This docs repository:

- Provides user-facing documentation
- Generates release changelogs automatically
- Deploys to https://docs.projectbluefin.io/ via GitHub Pages
- Uses conventional commits for changelog generation, follow the conventional commits spec when submitting pull requests: conventional-commits/conventionalcommits.org
- Integrates with main repository via automated workflows

Common documentation areas include:

- Installation guides (`docs/installation.md`)
- Developer experience (`docs/bluefin-dx.md`)
- FAQ and troubleshooting (`docs/FAQ.md`)
- Hardware-specific guides (`docs/framework*.md`)
- Administrative information (`docs/administration.md`)

Other Rules:

- **Remember**: Documentation should be consumable in one sitting and link to upstream docs rather than duplicating content.
- **Never** create new pages unless explicitly told to do so. 
