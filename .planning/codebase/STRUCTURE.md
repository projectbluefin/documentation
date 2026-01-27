# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
bluefin-docs/
├── .devcontainer/       # VS Code devcontainer configuration
├── .github/             # GitHub workflows, prompts, agents, skills
│   ├── workflows/       # CI/CD pipelines
│   ├── prompts/         # AI prompts for development
│   ├── agents/          # AI agent configurations
│   └── skills/          # Reusable AI skills
├── blog/                # Blog posts (21 files)
│   └── authors.yaml     # Blog author metadata with socials
├── docs/                # Documentation markdown (28 files)
│   └── donations/       # Donations section (index, contributors, projects)
├── scripts/             # Build-time data fetching scripts
├── src/                 # React components and TypeScript source
│   ├── components/      # Reusable React components
│   ├── config/          # Shared configuration objects
│   ├── css/             # Global CSS customizations
│   ├── pages/           # Custom full-page React components
│   ├── theme/           # Docusaurus theme overrides (swizzled)
│   └── types/           # TypeScript type definitions
├── static/              # Static assets served as-is
│   ├── data/            # Auto-generated JSON data (DO NOT COMMIT)
│   ├── feeds/           # Auto-generated release feeds (DO NOT COMMIT)
│   └── img/             # Images, icons, graphics
├── docusaurus.config.ts # Main Docusaurus configuration
├── sidebars.ts          # Documentation navigation structure
├── package.json         # Dependencies and npm scripts
├── tsconfig.json        # TypeScript configuration
└── Justfile             # Just command runner recipes
```

## Directory Purposes

**`.github/`:**

- Purpose: GitHub-specific configurations and automation
- Contains: CI/CD workflows, AI prompts, agent configs, skill definitions
- Key files: `.github/workflows/*.yml`, `.github/prompts/conventional-commit.prompt.md`

**`blog/`:**

- Purpose: Blog posts with chronological organization
- Contains: Markdown files with date-prefixed filenames (e.g., `2025-10-28-bluefin-autumn.md`)
- Key files: `authors.yaml` (author metadata with socials)

**`docs/`:**

- Purpose: Documentation pages organized by topic
- Contains: Markdown/MDX files for user-facing documentation
- Key files: `index.md` (landing page), `installation.md`, `FAQ.md`, `donations/` subdirectory

**`scripts/`:**

- Purpose: Build automation and data fetching
- Contains: Node.js scripts for external API integration
- Key files: `fetch-feeds.js`, `fetch-playlists.js`, `fetch-github-profiles.js`, `fetch-github-repos.js`, `fetch-contributors.js`, `fetch-board-data.js`

**`src/components/`:**

- Purpose: Reusable React UI components
- Contains: TSX components with co-located CSS modules
- Key files: `FeedItems.tsx`, `PackageSummary.tsx`, `MusicPlaylist.tsx`, `GitHubProfileCard.tsx`, `ProjectCard.tsx`, `PageContributors.tsx`, `BoardChangelog.tsx`, `CommunityFeeds.tsx`, `GnomeExtensions.tsx`, `GiscusComments/`

**`src/config/`:**

- Purpose: Centralized configuration objects
- Contains: TypeScript configuration modules
- Key files: `packageConfig.ts` (package tracking patterns)

**`src/pages/`:**

- Purpose: Custom full-page React components
- Contains: Page-level TSX files that become routes
- Key files: `changelogs.tsx` (renders `/changelogs`), `board.tsx` (renders `/board`)

**`src/theme/`:**

- Purpose: Docusaurus theme customizations via swizzling
- Contains: Wrapper components extending default Docusaurus theme
- Key files: `BlogPostItem/Footer/index.tsx`, `DocItem/Footer/index.tsx`

**`static/data/`:**

- Purpose: Build-time generated JSON data files
- Contains: **Auto-generated files - DO NOT COMMIT**
- Key files: `playlist-metadata.json`, `github-profiles.json`, `github-repos.json`, `file-contributors.json`, `board-changelog.json`, `gnome-extensions.json`

**`static/feeds/`:**

- Purpose: Build-time fetched GitHub release feeds
- Contains: **Auto-generated files - DO NOT COMMIT**
- Key files: `bluefin-releases.json`, `bluefin-lts-releases.json`

**`static/img/`:**

- Purpose: Images and graphics served as static assets
- Contains: Logos, blog post images, screenshots, playlist thumbnails
- Key subdirectories: `blog/`, `playlists/`, `extensions/`, `user-attachments/`

## Key File Locations

**Entry Points:**

- `docusaurus.config.ts`: Main site configuration
- `package.json`: Build scripts and dependencies
- `docs/index.md`: Documentation landing page (mapped to `/`)
- `src/pages/changelogs.tsx`: Changelogs page
- `src/pages/board.tsx`: Board changelog page

**Configuration:**

- `docusaurus.config.ts`: Site metadata, plugins, theme config, navbar, footer
- `sidebars.ts`: Documentation sidebar navigation structure
- `tsconfig.json`: TypeScript compiler options
- `src/config/packageConfig.ts`: Centralized package version tracking patterns

**Core Logic:**

- `src/components/FeedItems.tsx`: GitHub release feed display with version extraction
- `src/components/PackageSummary.tsx`: Package version summary cards
- `src/components/CommunityFeeds.tsx`: Combined changelogs page layout
- `scripts/fetch-feeds.js`: GitHub release feed fetching
- `scripts/fetch-playlists.js`: YouTube playlist metadata fetching
- `scripts/fetch-github-profiles.js`: GitHub user profile fetching

**Testing:**

- No dedicated test directory - validation via `npm run typecheck`, `npm run build`

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `FeedItems.tsx`, `GitHubProfileCard.tsx`)
- CSS modules: Component name + `.module.css` (e.g., `FeedItems.module.css`)
- Scripts: kebab-case (e.g., `fetch-feeds.js`, `fetch-github-profiles.js`)
- Documentation: kebab-case (e.g., `installation.md`, `code-of-conduct.md`)
- Blog posts: `YYYY-MM-DD-slug.md` (e.g., `2025-10-28-bluefin-autumn.md`)

**Directories:**

- React structure: camelCase (e.g., `components/`, `pages/`)
- Content: kebab-case (e.g., `docs/`, `blog/`)
- Static assets: lowercase (e.g., `static/`, `img/`)

**Variables/Functions:**

- camelCase for functions and variables
- PascalCase for React components and TypeScript types/interfaces
- SCREAMING_SNAKE_CASE for constants (e.g., `PACKAGE_PATTERNS`)

**Types:**

- PascalCase with descriptive names (e.g., `FeedItemsProps`, `PackagePattern`, `GitHubUser`)
- Interface preferred over type alias for object shapes

## Where to Add New Code

**New Documentation Page:**

- Primary code: `docs/new-page.md` or `docs/new-page.mdx`
- Update navigation: Add to `sidebars.ts` in appropriate category
- Images: Place in `static/img/`

**New Blog Post:**

- Implementation: `blog/YYYY-MM-DD-title.md`
- Author info: Update `blog/authors.yaml` if new author
- Images: Place in `static/img/blog/YYYY-MM-DD-title/`

**New React Component:**

- Implementation: `src/components/ComponentName.tsx`
- Styling: `src/components/ComponentName.module.css`
- Types: Define inline or in component file
- Usage: Import in MDX pages or other components

**New Custom Page:**

- Implementation: `src/pages/pagename.tsx` (becomes route `/pagename`)
- Complex pages: Create component in `src/components/`, wrap in simple page file

**New Data Fetching Script:**

- Implementation: `scripts/fetch-new-data.js`
- Update: Add to `fetch-data` compound script in `package.json`
- Output: Write JSON to `static/data/` or `static/feeds/`
- Gitignore: Ensure output files are in `.gitignore`

**New Theme Customization:**

- Implementation: `src/theme/ComponentName/index.tsx`
- Pattern: Import from `@theme-original/ComponentName`, wrap with custom behavior
- Use Docusaurus swizzle CLI: `npm run swizzle @docusaurus/theme-classic ComponentName`

**Utilities:**

- Shared helpers: Add to `src/config/` or create `src/utils/`
- Build utilities: Add to `scripts/`

## Special Directories

**`node_modules/`:**

- Purpose: Installed npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in `.gitignore`)

**`build/`:**

- Purpose: Compiled static site output
- Generated: Yes (via `npm run build`)
- Committed: No (in `.gitignore`)

**`.docusaurus/`:**

- Purpose: Docusaurus build cache and generated files
- Generated: Yes (during build/dev server)
- Committed: No (in `.gitignore`)

**`static/data/` and `static/feeds/`:**

- Purpose: Build-time fetched external data
- Generated: Yes (via `npm run fetch-data`)
- Committed: **NO** - These files are regenerated on every build and should never be committed

**`.planning/`:**

- Purpose: Project planning and codebase documentation
- Generated: By GSD commands and manual planning
- Committed: Yes

---

_Structure analysis: 2026-01-26_
