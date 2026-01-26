# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**

- React components: PascalCase with `.tsx` extension - `FeedItems.tsx`, `ProjectCard.tsx`, `GitHubProfileCard.tsx`
- Component modules: Component name + `.module.css` - `FeedItems.module.css`, `ProjectCard.module.css`
- Configuration files: camelCase with `.ts` extension - `packageConfig.ts`, `docusaurus.config.ts`, `sidebars.ts`
- Build scripts: kebab-case with `.js` extension - `fetch-feeds.js`, `fetch-github-repos.js`, `fetch-playlist-metadata.js`
- Type definitions: `theme.d.ts` in `src/types/` directory

**Functions:**

- Exported components: PascalCase - `FeedItems`, `ProjectCard`, `MusicPlaylist`, `GitHubProfileCard`
- Helper functions: camelCase - `formatLongDate`, `extractVersionSummary`, `formatReleaseTitle`, `extractPlaylistId`
- Utility functions: camelCase with descriptive names - `extractPackageVersion`, `extractVersionChange`, `fetchGitHubProfile`
- Async functions: camelCase with async/await pattern - `fetchRepo`, `fetchAllRepos`, `fetchAndParseFeed`

**Variables:**

- Component props: camelCase - `feedId`, `title`, `maxItems`, `showDescription`, `githubRepo`, `sponsorUrl`
- Constants: SCREAMING_SNAKE_CASE - `PACKAGE_PATTERNS`, `CACHE_KEY_PREFIX`, `CACHE_DURATION`, `GITHUB_REPOS`
- State variables: camelCase - `stats`, `loading`, `user`, `metadata`, `imageError`
- Interface names: PascalCase - `FeedItemsProps`, `ProjectCardProps`, `GitHubUser`, `PackagePattern`

**Types:**

- Interface definitions: PascalCase with descriptive names - `FeedItemsProps`, `PackageSummaryProps`, `PlaylistMetadata`, `GitHubRepoStats`
- Type definitions in dedicated `src/types/` directory
- Module declarations for Docusaurus themes in `theme.d.ts`

## Code Style

**Formatting:**

- Tool: Prettier 3.6.2
- Command: `npm run prettier` (auto-fix), `npm run prettier-lint` (check only)
- Note: Many existing files show warnings when checked - this is normal and expected
- No explicit `.prettierrc` config file - uses Prettier defaults

**Linting:**

- No ESLint configuration detected
- Type checking via TypeScript compiler: `npm run typecheck`
- Some TypeScript errors may be tolerated by build process (Docusaurus handles gracefully)

**TypeScript:**

- Version: 5.9.2
- Configuration: Extends `@docusaurus/tsconfig` in `tsconfig.json`
- Base URL: `.` (root directory)
- Exclude: `.docusaurus`, `build` directories

## Import Organization

**Order:**

1. React imports - `import React from "react"`
2. Third-party packages - `import useStoredFeed from "@theme/useStoredFeed"`, `import { parseString } from "xml2js"`
3. Local imports from `@site/` alias - `import profilesData from "@site/static/data/github-profiles.json"`
4. Component modules - `import styles from "./ComponentName.module.css"`
5. Config/utils from relative paths - `import { PACKAGE_PATTERNS } from "../config/packageConfig"`

**Path Aliases:**

- `@site/` - Root directory alias for static assets: `@site/static/data/github-profiles.json`
- `@theme/` - Docusaurus theme modules: `@theme/useStoredFeed`, `@theme/Heading`, `@theme/BlogPostItem`
- No other custom path aliases detected

**Import Style:**

- Named imports preferred: `import { themes as prismThemes } from "prism-react-renderer"`
- Default exports for components: `export default FeedItems`
- Destructured imports for utilities: `import { PACKAGE_PATTERNS, extractVersionChange } from "../config/packageConfig"`

## Error Handling

**Patterns:**

- Try-catch blocks for external data fetching with console.error logging
- Graceful degradation: Return null/empty state rather than throwing errors
- Error states in React components: Display error message UI instead of crashing
- Optional chaining for potentially undefined values: `item.content?.value`, `item.link?.href`

**Examples from codebase:**

```typescript
// FeedItems.tsx - Graceful error handling with error UI
try {
  const feedData = useStoredFeed(feedId);
  // ... render logic
} catch (error) {
  console.error(`Error loading feed ${feedId}:`, error);
  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>{title}</h3>
      <p className={styles.error}>Error loading feed data</p>
    </div>
  );
}

// ProjectCard.tsx - Silent failures with empty catch blocks
.catch(() => {}); // Silently fail for GitHub API requests

// GitHubProfileCard.tsx - Detailed error logging with state management
.catch((error) => {
  console.error(`Failed to load profile for ${username}:`, error.message);
  setLoading(false);
});

// fetch-github-repos.js - Build-time error handling with non-zero exit
.catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

## Logging

**Framework:** Native `console` API

**Patterns:**

- Build scripts: Verbose console.log for progress tracking
- Components: console.error for error conditions only
- No logging in production component renders
- Build-time scripts use emoji indicators: `✓`, `⚠️`, `🔄`, `⏱️`

**Build script logging:**

```javascript
console.log(`Fetching ${GITHUB_REPOS.length} GitHub repos...`);
console.log(`✓ Repos saved to ${OUTPUT_FILE}`);
console.warn("⚠️  No GitHub token found.");
```

**Component logging:**

```typescript
console.error("Error loading playlist metadata:", error);
console.error(`Error loading feed ${feedId}:`, error);
console.warn(`Failed to cache profile for ${username}`);
```

## Comments

**When to Comment:**

- Complex regex patterns: Explain what the pattern matches
- Non-obvious logic: Explain why, not what
- Configuration sections: Document purpose and usage
- Public API functions: JSDoc-style documentation blocks
- Build caching logic: Explain cache invalidation strategy

**JSDoc/TSDoc:**

- Used in configuration files: `src/config/packageConfig.ts` has full JSDoc blocks
- Function documentation includes description and parameter types
- Examples:

```typescript
/**
 * Extracts package version from content using the provided pattern.
 * Handles both upgrade arrows (old ➡️ new) and static versions.
 *
 * @param content - HTML content from changelog
 * @param pattern - Regex pattern to match package version
 * @returns Latest version string or null if not found
 */
export function extractPackageVersion(
  content: string,
  pattern: RegExp,
): string | null {
  // ...
}
```

**Inline Comments:**

- Explain complex data structures: `// Handle different RSS/Atom feed structures`
- Document fallback behavior: `// Second, check localStorage cache`
- Clarify intent: `// Small delay to be nice to GitHub's API`

## Function Design

**Size:**

- Component functions: 100-300 lines typical (`FeedItems.tsx` is 312 lines, `ProjectCard.tsx` is 195 lines)
- Helper functions: 10-50 lines (`formatLongDate`, `extractVersionSummary`, `formatReleaseTitle`)
- Build scripts: 100-500 lines for complete fetch operations

**Parameters:**

- Use interface types for component props: `interface FeedItemsProps { ... }`
- Destructure props in function signature: `({ feedId, title, maxItems = 5 })`
- Default parameter values in destructuring: `maxItems = 5`, `showDescription = false`
- Optional parameters marked with `?`: `filter?: (item: FeedItem) => boolean`

**Return Values:**

- Components return JSX.Element or null: `React.FC<Props>` pattern
- Utility functions return specific types: `string | null`, `VersionChange[]`, `PackageInfo[]`
- Async functions return Promises: `Promise<GitHubUser>`, `Promise<void>`
- Build scripts use void return with process.exit for errors

## Module Design

**Exports:**

- Default exports for React components: `export default FeedItems`
- Named exports for utilities: `export function extractPackageVersion(...)`
- Named exports for constants: `export const PACKAGE_PATTERNS: PackagePattern[]`
- Module.exports for Node.js scripts: `module.exports = { fetchAndParseFeed }`

**Barrel Files:**

- Not used - no `index.ts` re-export files detected
- Components imported directly by path: `import FeedItems from "../components/FeedItems"`

**Module Organization:**

- Components: `src/components/` - One component per file with co-located CSS module
- Configuration: `src/config/` - Centralized config objects (`packageConfig.ts`)
- Types: `src/types/` - Module declarations for third-party types (`theme.d.ts`)
- Pages: `src/pages/` - Custom Docusaurus pages (`changelogs.tsx`, `board.tsx`)
- Scripts: `scripts/` - Build-time data fetching scripts

## React Patterns

**Component Structure:**

- Functional components with hooks (useState, useEffect)
- Props defined via TypeScript interfaces
- CSS Modules for styling: `styles.className`
- Early returns for loading/error states

**State Management:**

- Local component state via useState
- No global state management (no Redux, Context, etc.)
- Data fetching in useEffect with cleanup
- Pre-fetched build-time data preferred over runtime fetching

**Data Fetching Strategy:**

1. First: Pre-fetched build-time data from JSON files
2. Second: localStorage cache (24h for repos, 30 days for profiles)
3. Third: Runtime GitHub API fetch with rate limiting queue
4. Graceful degradation if all methods fail

**Request Queue Pattern:**

- Shared RequestQueue class for rate limiting API calls
- 1 second minimum delay between requests
- Used in `ProjectCard.tsx` and `GitHubProfileCard.tsx`
- Prevents GitHub API rate limit issues

## Configuration Management

**Environment Variables:**

- `GITHUB_TOKEN` or `GH_TOKEN` - Used in build scripts for GitHub API authentication
- No runtime environment variables in components
- Build-time only, not exposed to client

**Static Configuration:**

- Docusaurus config: `docusaurus.config.ts` (298 lines)
- Package tracking: `src/config/packageConfig.ts` (138 lines)
- Sidebar navigation: `sidebars.ts` (83 lines)
- All configuration in TypeScript with type safety

---

_Convention analysis: 2026-01-26_
