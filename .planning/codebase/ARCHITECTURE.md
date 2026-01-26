# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Static Site Generator with Build-Time Data Fetching

**Key Characteristics:**

- Docusaurus 3.8.1-based static documentation site
- Build-time data fetching from external APIs (GitHub, YouTube)
- React components for dynamic presentation of static data
- Plugin-based architecture with theme swizzling for customization
- Markdown/MDX content with React component integration

## Layers

**Content Layer:**

- Purpose: Raw documentation and blog content
- Location: `docs/`, `blog/`
- Contains: Markdown/MDX files with frontmatter metadata
- Depends on: Docusaurus markdown parser, React components via MDX
- Used by: Docusaurus build system, page generation

**Data Fetching Layer:**

- Purpose: Fetch and cache external data at build time
- Location: `scripts/`
- Contains: Node.js scripts for fetching GitHub releases, YouTube metadata, GitHub profiles
- Depends on: node-fetch, xml2js, GitHub/YouTube APIs
- Used by: Build process (`npm run fetch-data`), generates JSON files in `static/data/` and `static/feeds/`

**Component Layer:**

- Purpose: React UI components for presenting data
- Location: `src/components/`
- Contains: Presentational components with CSS modules
- Depends on: React, Docusaurus theme components, build-time JSON data
- Used by: MDX pages, custom pages, theme overrides

**Page Layer:**

- Purpose: Custom full-page React components
- Location: `src/pages/`
- Contains: Complete page implementations (changelogs, board)
- Depends on: Component layer, Layout components
- Used by: Docusaurus routing system

**Theme Layer:**

- Purpose: Docusaurus theme customizations (swizzled components)
- Location: `src/theme/`
- Contains: Wrapper components extending default Docusaurus behavior
- Depends on: Docusaurus theme-original components
- Used by: Docusaurus rendering system

**Configuration Layer:**

- Purpose: Central configuration for application behavior
- Location: `docusaurus.config.ts`, `sidebars.ts`, `src/config/`
- Contains: Site config, navigation structure, shared configuration objects
- Depends on: Docusaurus types
- Used by: All layers

## Data Flow

**Build-Time Data Fetching:**

1. Developer runs `npm run build` or `npm start`
2. Pre-build scripts execute (`npm run fetch-data`)
3. Scripts fetch data from external APIs (GitHub, YouTube)
4. Data is parsed and stored as JSON in `static/data/` and `static/feeds/`
5. Docusaurus builds site with data available as static assets
6. Components load JSON at runtime via fetch or direct imports

**Content Rendering Flow:**

1. Docusaurus parses markdown/MDX files from `docs/` and `blog/`
2. Frontmatter extracted for metadata (title, date, authors)
3. MDX content compiled with React components embedded
4. Theme components wrap content (headers, footers, navigation)
5. Static HTML generated with embedded React hydration code
6. Browser loads page, React hydrates interactive components

**Component Data Flow:**

1. Component mounts in browser
2. Component loads build-time JSON data (fetch or import)
3. Component renders data with styling from CSS modules
4. Optional: Component falls back to runtime API calls if build data missing
5. Optional: Component caches runtime-fetched data in localStorage

**State Management:**

- Primarily stateless - data flows from JSON → component props → render
- Local component state for UI concerns (loading, errors, image fallbacks)
- No global state management (Redux, Context) - Docusaurus provides routing/theme context

## Key Abstractions

**FeedItems Component:**

- Purpose: Displays GitHub release feeds with version extraction
- Examples: `src/components/FeedItems.tsx`
- Pattern: Loads feed from `@theme/useStoredFeed` hook, extracts package versions using centralized patterns

**PackageSummary Component:**

- Purpose: Extracts and displays current package versions from recent releases
- Examples: `src/components/PackageSummary.tsx`
- Pattern: Scans up to 10 recent releases, uses shared package patterns from `packageConfig.ts`

**Data Fetching Scripts:**

- Purpose: Reusable pattern for fetching external data at build time
- Examples: `scripts/fetch-feeds.js`, `scripts/fetch-playlists.js`, `scripts/fetch-github-profiles.js`
- Pattern: Async fetch → parse → write JSON to static directory

**CSS Modules:**

- Purpose: Component-scoped styling
- Examples: `src/components/FeedItems.module.css`, `src/components/GitHubProfileCard.module.css`
- Pattern: Import styles object, apply via className={styles.className}

**Theme Swizzling:**

- Purpose: Extend Docusaurus default components without forking
- Examples: `src/theme/DocItem/Footer/index.tsx`, `src/theme/BlogPostItem/Footer/index.tsx`
- Pattern: Import original component, wrap with additional functionality

## Entry Points

**Main Configuration:**

- Location: `docusaurus.config.ts`
- Triggers: Build process
- Responsibilities: Site metadata, plugin configuration, theme settings, navbar/footer structure

**Package Scripts:**

- Location: `package.json` scripts section
- Triggers: Developer commands (`npm start`, `npm run build`)
- Responsibilities: Coordinate data fetching → Docusaurus build/serve

**Build-Time Data Fetchers:**

- Location: `scripts/fetch-*.js`
- Triggers: Pre-build hook (`npm run fetch-data`)
- Responsibilities: Populate `static/data/` and `static/feeds/` with fresh external data

**Custom Pages:**

- Location: `src/pages/changelogs.tsx`, `src/pages/board.tsx`
- Triggers: User navigation to `/changelogs` or `/board`
- Responsibilities: Render full-page React components with custom layout

**Documentation Index:**

- Location: `docs/index.md` (mapped to `/` via routeBasePath)
- Triggers: User visits root URL
- Responsibilities: Landing page content

## Error Handling

**Strategy:** Graceful degradation with fallbacks

**Patterns:**

- Build-time fetch failures: Log error, continue build without data
- Component data loading: Try-catch with error state rendering
- Missing JSON files: Component displays "loading" or "no data available"
- API rate limits: Request queuing (1s delays), localStorage caching (30 days)
- Image loading failures: onError handlers show placeholder SVGs

## Cross-Cutting Concerns

**Logging:** Console.log/console.error in Node scripts and browser components

**Validation:** TypeScript type checking via `npm run typecheck`, Docusaurus link checking via onBrokenLinks config

**Authentication:** GitHub API token via GITHUB_TOKEN or GH_TOKEN env var (optional, increases rate limits)

---

_Architecture analysis: 2026-01-26_
