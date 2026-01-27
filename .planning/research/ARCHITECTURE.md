# Architecture Research

**Domain:** Docusaurus Technical Cleanup
**Researched:** January 26, 2026
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Layer                       │
│  docusaurus.config.ts, package.json, tsconfig.json          │
│  (Defines build behavior, dependencies, type checking)       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐    │
│  │ Type System   │  │ Shared Config │  │ Build Scripts│    │
│  │ (.d.ts files) │  │ (packageCfg)  │  │ (fetch-*.js) │    │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘    │
│          │                  │                  │             │
│          ├──────────────────┴──────────────────┘             │
│          │                                                    │
├──────────┴──────────────────────────────────────────────────┤
│                      Component Layer                          │
│  React components (.tsx) consume types & shared config       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ FeedItems  │  │ PackageSumm│  │ ProjectCard│            │
│  │   .tsx     │  │   ary.tsx  │  │   .tsx     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                      Content Layer                           │
│  MDX files, blog posts, documentation (excluded from        │
│  cleanup scope but consume components)                       │
└─────────────────────────────────────────────────────────────┘

Build Order:
1. npm install → Dependencies available
2. npm run fetch-data → Auto-generated JSON files created
3. TypeScript compilation (tsc) → Type checking validates
4. Webpack bundling → Components bundled with data
```

### Component Responsibilities

| Component               | Responsibility                                                                   | Dependencies                                     |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Configuration Layer** | Define build settings, dependencies, TypeScript config                           | None (top-level)                                 |
| **Type System**         | Provide TypeScript definitions for Docusaurus hooks and data structures          | Configuration layer                              |
| **Shared Config**       | Centralize package tracking patterns, reusable logic                             | Type system                                      |
| **Build Scripts**       | Generate JSON data files at build time (feeds, playlists, GitHub profiles/repos) | Configuration layer, npm dependencies            |
| **Component Layer**     | React components that consume types, shared config, and build-time data          | Type system, shared config, build scripts output |
| **Content Layer**       | Markdown/MDX documentation that embeds components                                | Component layer                                  |

## Recommended Project Structure

Current structure is well-organized for Docusaurus:

```
src/
├── components/           # React components (.tsx)
│   ├── FeedItems.tsx      # Consumes packageConfig, feed data
│   ├── PackageSummary.tsx # Consumes packageConfig, feed data
│   ├── ProjectCard.tsx    # Consumes github-repos.json
│   ├── GitHubProfileCard.tsx # Consumes github-profiles.json
│   ├── MusicPlaylist.tsx  # Consumes playlist-metadata.json
│   └── *.module.css       # Component styles
├── config/               # Shared configuration
│   └── packageConfig.ts   # Central package tracking config
├── types/                # TypeScript definitions
│   └── theme.d.ts         # Theme hook type declarations
├── theme/                # Swizzled Docusaurus theme overrides
│   ├── BlogPostItem/      # Blog post customizations
│   └── DocItem/           # Doc page customizations
├── pages/                # Custom pages
│   ├── changelogs.tsx     # Custom changelog page
│   └── board.tsx          # Project board page
└── css/                  # Global styles

scripts/                  # Build-time data fetching
├── fetch-feeds.js         # Generates static/feeds/*.json
├── fetch-playlists.js     # Generates static/data/playlist-metadata.json
├── fetch-github-profiles.js # Generates static/data/github-profiles.json
└── fetch-github-repos.js  # Generates static/data/github-repos.json

static/                   # Static assets
├── data/                 # Auto-generated JSON files (gitignored)
│   ├── github-profiles.json
│   ├── github-repos.json
│   └── playlist-metadata.json
└── feeds/                # Auto-generated feed files (gitignored)
    ├── bluefin-releases.json
    └── bluefin-lts-releases.json

Configuration files (root):
├── docusaurus.config.ts   # Main Docusaurus configuration
├── sidebars.ts            # Documentation navigation
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and build scripts
```

### Structure Rationale

- **src/config/**: Centralized configuration prevents duplication. `packageConfig.ts` is consumed by both `FeedItems` and `PackageSummary`, ensuring consistency.
- **src/types/**: Type definitions for Docusaurus theme hooks that aren't provided by official types.
- **scripts/**: Build-time data fetching separates concerns. These run during `npm run fetch-data` (called by `npm start` and `npm run build`).
- **static/data/ and static/feeds/**: Auto-generated files are gitignored to avoid merge conflicts and stale data. They're regenerated on every build.

## Architectural Patterns

### Pattern 1: Build-Time Data Fetching

**What:** Fetch external data (GitHub API, YouTube API, RSS feeds) at build time and store as static JSON files.

**When to use:** When data changes infrequently (daily/weekly) and you want to avoid runtime API calls and rate limits.

**Trade-offs:**

- **Pro:** No runtime API calls, no rate limiting for users, faster page loads
- **Pro:** Data is available immediately at render time
- **Con:** Data can be stale until next build
- **Con:** Requires build-time network access

**Example:**

```javascript
// scripts/fetch-feeds.js
async function fetchAndParseFeed(url, filename) {
  const response = await fetch(url);
  const xmlText = await response.text();
  // Parse and save to static/feeds/
  fs.writeFileSync(jsonPath, JSON.stringify(data));
}
```

**Implementation in bluefin-docs:**

- `npm run fetch-data` runs all fetch scripts
- `npm start` and `npm run build` automatically call `fetch-data`
- Components import pre-generated JSON using Docusaurus hooks

### Pattern 2: Centralized Configuration

**What:** Shared configuration files (like `packageConfig.ts`) that are imported by multiple components.

**When to use:** When multiple components need the same configuration data (e.g., regex patterns, package lists).

**Trade-offs:**

- **Pro:** Single source of truth prevents drift
- **Pro:** Easy to add/remove items in one place
- **Con:** Creates dependency between components and config

**Example:**

```typescript
// src/config/packageConfig.ts
export const PACKAGE_PATTERNS: PackagePattern[] = [
  {
    name: "Kernel",
    pattern: /<td><strong>Kernel<\/strong><\/td>\s*<td>([^<]+)/,
  },
];

// src/components/FeedItems.tsx
import { PACKAGE_PATTERNS } from "../config/packageConfig";
```

### Pattern 3: Type Declaration for Theme Hooks

**What:** Manual type declarations for Docusaurus theme hooks that aren't officially typed.

**When to use:** When using Docusaurus plugins that provide custom hooks but don't export TypeScript types.

**Trade-offs:**

- **Pro:** Enables TypeScript in components
- **Pro:** Provides IDE autocomplete
- **Con:** Must be manually maintained if plugin API changes
- **Con:** Types may drift from actual runtime behavior

**Example:**

```typescript
// src/types/theme.d.ts
declare module "@theme/useStoredFeed" {
  interface FeedData {
    items: FeedItem[];
  }
  function useStoredFeed(key: string): FeedData | null;
  export default useStoredFeed;
}
```

**Current issue:** Type declaration in `theme.d.ts` doesn't match actual data structure from `@1password/docusaurus-plugin-stored-data`.

## Data Flow

### Build-Time Data Flow

```
External APIs (GitHub, YouTube)
    ↓ (fetch at build time)
scripts/fetch-*.js
    ↓ (write JSON)
static/data/*.json, static/feeds/*.json
    ↓ (bundled by Webpack)
React Components (import via Docusaurus hooks)
    ↓ (render)
HTML Pages
```

### Component Rendering Flow

```
User navigates to /changelogs
    ↓
Docusaurus routes to changelogs.tsx page
    ↓
Page renders FeedItems component
    ↓
FeedItems calls useStoredFeed("bluefinReleases")
    ↓ (Docusaurus hook fetches pre-bundled data)
FeedItems receives feed data from plugin
    ↓
FeedItems calls extractVersionSummary() (uses packageConfig)
    ↓
Component renders changelog cards with package versions
```

### Type Checking Flow

```
npm run typecheck
    ↓
TypeScript compiler (tsc) loads tsconfig.json
    ↓
Reads type definitions from:
    - @docusaurus/types (official)
    - src/types/theme.d.ts (custom)
    ↓
Type-checks all .ts and .tsx files
    ↓
Reports type mismatches
```

**Current issue:** `theme.d.ts` declares `FeedData` with simple structure, but `useStoredFeed` actually returns complex RSS/Atom feed structure with `rss.channel.item` or `feed.entry` paths.

### Key Data Flows

1. **Package tracking flow:** `packageConfig.ts` → `FeedItems.tsx` + `PackageSummary.tsx` → Changelog page displays package versions
2. **GitHub stats flow:** `scripts/fetch-github-repos.js` → `static/data/github-repos.json` → `ProjectCard.tsx` → Donations page shows stars/forks
3. **Feed data flow:** `scripts/fetch-feeds.js` → `static/feeds/*.json` → Docusaurus plugin → `useStoredFeed()` hook → `FeedItems.tsx` → Changelogs page

## Dependency Order (Critical for Cleanup)

### Level 0: Configuration Foundation

- `package.json` - Defines all dependencies
- `tsconfig.json` - TypeScript compilation settings
- `docusaurus.config.ts` - Docusaurus build configuration

**Cleanup priority:** Fix dependency declarations first (peer dependencies, versions)

### Level 1: Type System Foundation

- `src/types/theme.d.ts` - Type declarations for theme hooks
- Official Docusaurus types from `@docusaurus/types`

**Cleanup priority:** Fix type declarations to match actual plugin data structures

**Critical issue:** `theme.d.ts` declares incorrect type for `useStoredFeed` return value

### Level 2: Shared Configuration

- `src/config/packageConfig.ts` - Shared package patterns

**Cleanup priority:** Ensure exported types match usage in components

### Level 3: Build Scripts

- `scripts/fetch-*.js` - Generate JSON data files
- Must run before components can access data

**Cleanup priority:** Validate scripts run successfully, handle errors gracefully

### Level 4: Component Layer

- React components in `src/components/`
- Theme overrides in `src/theme/`
- Custom pages in `src/pages/`

**Cleanup priority:** Fix TypeScript errors after type system is corrected

### Level 5: Content Layer (Out of Scope)

- Markdown/MDX files
- Excluded from technical cleanup

## Cleanup Sequence Recommendation

Based on dependency analysis, the cleanup sequence must follow this order:

### Phase 1: Configuration Layer Cleanup

**What to fix:**

- Resolve peer dependency conflicts in `package.json`
- Validate `tsconfig.json` settings
- Ensure `docusaurus.config.ts` is properly typed

**Why first:**

- Nothing can build without correct dependencies
- TypeScript config affects all subsequent type checking
- Docusaurus config affects plugin behavior

**Validation:**

- `npm install` succeeds without warnings
- `npm run typecheck` loads configuration correctly

### Phase 2: Type System Repair

**What to fix:**

- Fix `src/types/theme.d.ts` to match actual `useStoredFeed` data structure
- Add missing type definitions for other theme hooks if needed
- Validate types match runtime behavior

**Why second:**

- Components depend on correct type definitions
- Must fix before components can be properly type-checked
- Incorrect types cascade errors to all components

**Validation:**

- Import statements in components resolve correctly
- TypeScript can find all module declarations

**Known issue:**

```typescript
// Current (WRONG):
interface FeedData {
  items: FeedItem[];
}

// Should be:
interface FeedData {
  rss?: { channel?: { item?: FeedItem[] } };
  channel?: { item?: FeedItem[] };
  feed?: { entry?: FeedItem[] };
}
```

### Phase 3: Shared Configuration Validation

**What to fix:**

- Ensure `packageConfig.ts` exports are correctly typed
- Validate helper functions are type-safe
- Check for unused exports

**Why third:**

- Depends on type system being correct
- Multiple components depend on this config
- Errors here multiply across component layer

**Validation:**

- `packageConfig.ts` compiles without errors
- Exported functions have correct signatures

### Phase 4: Build Script Validation

**What to fix:**

- Ensure all fetch scripts handle errors gracefully
- Validate JSON file structure matches component expectations
- Add TypeScript types for script output if beneficial

**Why fourth:**

- Depends on configuration layer being correct
- Scripts must run before components can consume data
- Failure here blocks entire build

**Validation:**

- `npm run fetch-data` succeeds
- All JSON files are generated in `static/data/` and `static/feeds/`
- JSON structure matches type definitions

### Phase 5: Component Layer Cleanup

**What to fix:**

- Resolve TypeScript errors in components
- Fix type mismatches (e.g., `FeedItems.tsx` line 125)
- Ensure components correctly consume shared config

**Why fifth:**

- Depends on all previous layers being correct
- Largest number of files to touch
- Errors are now isolated to specific components

**Validation:**

- `npm run typecheck` passes for all components
- Components render correctly in development

**Component priority order:**

1. Fix `FeedItems.tsx` and `PackageSummary.tsx` first (share packageConfig dependency)
2. Fix `ProjectCard.tsx` (depends on build script output)
3. Fix theme overrides in `src/theme/`
4. Fix remaining components

### Phase 6: Build Validation

**What to fix:**

- Run full build process
- Test development server
- Validate production build

**Why last:**

- All components must be fixed first
- Final integration test
- Catches any remaining issues

**Validation:**

- `npm run build` succeeds
- `npm run serve` works correctly
- All pages render without errors

## Scaling Considerations

| Scale              | Architecture Adjustments                                                               |
| ------------------ | -------------------------------------------------------------------------------------- |
| Single contributor | Current architecture is ideal - simple, clear dependencies                             |
| Small team (2-5)   | No changes needed - clear layer boundaries make parallel work safe                     |
| Large team (5+)    | Consider splitting `src/components/` into feature directories, add automated E2E tests |

### Scaling Priorities

1. **First bottleneck:** Too many TypeScript errors block parallel work
   - **Fix:** Prioritize Phase 2 (type system) before starting other work
   - **Mitigation:** Use `// @ts-expect-error` temporarily with TODO comments
2. **Second bottleneck:** Build script failures block local development
   - **Fix:** Add error handling and fallback data in build scripts
   - **Mitigation:** Commit last-known-good JSON files as fallback

## Anti-Patterns

### Anti-Pattern 1: Fixing Components Before Type System

**What people do:** Start fixing TypeScript errors in components without fixing `theme.d.ts` first.

**Why it's wrong:**

- Type errors cascade from incorrect type definitions
- Fixing components is wasted work if types change later
- Creates "whack-a-mole" pattern of fixing one error only to create another

**Do this instead:**

- Fix `src/types/theme.d.ts` first
- Validate type definitions match runtime data structure
- Then fix component errors in dependency order

### Anti-Pattern 2: Ignoring Build Script Dependencies

**What people do:** Try to fix component type errors when the real issue is missing build script output.

**Why it's wrong:**

- Components import JSON files that don't exist yet
- TypeScript errors are symptom, not cause
- Wastes time on wrong problem

**Do this instead:**

- Run `npm run fetch-data` first
- Ensure all JSON files are generated
- Then address component type errors

### Anti-Pattern 3: Treating All Type Errors Equally

**What people do:** Fix type errors in alphabetical order or as they appear in `tsc` output.

**Why it's wrong:**

- Some errors are caused by other errors (cascading)
- Fixing downstream errors first may be wasted if upstream changes
- Inefficient use of time

**Do this instead:**

- Follow dependency order: configuration → types → config → scripts → components
- Fix one layer completely before moving to next
- Validate each layer before proceeding

### Anti-Pattern 4: Committing Auto-Generated Files

**What people do:** Commit files in `static/data/` and `static/feeds/` to git.

**Why it's wrong:**

- These files are regenerated on every build
- Creates merge conflicts
- Bloats git history with generated content
- Data becomes stale between builds

**Do this instead:**

- Keep these files in `.gitignore`
- Build scripts regenerate on every `npm start` / `npm run build`
- CI/CD generates fresh data for deployments

## Integration Points

### External Services

| Service                                  | Integration Pattern                                                                        | Notes                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| GitHub API                               | Build-time fetch via `fetch-feeds.js`, `fetch-github-profiles.js`, `fetch-github-repos.js` | Rate limiting: set `GITHUB_TOKEN` env var for higher limits |
| YouTube API                              | Build-time fetch via `fetch-playlists.js`                                                  | May require API key for production use                      |
| @1password/docusaurus-plugin-stored-data | Runtime hook `useStoredFeed()`                                                             | Type definitions in `theme.d.ts` need correction            |

### Internal Boundaries

| Boundary                        | Communication                                                    | Notes                                              |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| packageConfig ↔ FeedItems      | Direct import of exported arrays/functions                       | Type-safe at compile time                          |
| packageConfig ↔ PackageSummary | Direct import of exported arrays/functions                       | Type-safe at compile time                          |
| Build scripts ↔ Components     | JSON files in `static/` directory, accessed via Docusaurus hooks | Type checking via TypeScript interfaces            |
| Components ↔ MDX content       | MDX imports components directly                                  | Components must be exported from `src/components/` |

### Plugin Architecture (Docusaurus-Specific)

**Key insight:** Plugins run in Node.js at build time, themes run in browser at runtime. They communicate via:

1. **JSON temp files** - Data from plugins to theme components
2. **Route registration** - Plugins tell Docusaurus what pages to create
3. **Config serialization** - `docusaurus.config.ts` is serialized and available in browser via `useDocusaurusContext()`

**For cleanup:**

- Type definitions must match this architecture
- `theme.d.ts` provides types for the plugin→theme bridge
- Build scripts are effectively "custom plugins" that generate JSON

## Sources

- **HIGH confidence:** Docusaurus official documentation
  - TypeScript support: https://docusaurus.io/docs/typescript-support
  - Architecture overview: https://docusaurus.io/docs/advanced/architecture
  - Plugin lifecycle: https://docusaurus.io/docs/api/plugin-methods
- **HIGH confidence:** Project codebase inspection
  - Analyzed `docusaurus.config.ts`, `package.json`, `tsconfig.json`
  - Examined component dependencies (`FeedItems.tsx`, `PackageSummary.tsx`, `ProjectCard.tsx`)
  - Reviewed type definitions (`src/types/theme.d.ts`)
  - Inspected build scripts (`scripts/fetch-*.js`)
- **HIGH confidence:** TypeScript error output
  - Ran `npm run typecheck` to identify actual type mismatches
  - Error: `Type 'FeedData' has no properties in common with type 'ParsedFeed'` confirms type definition mismatch

---

_Architecture research for: Docusaurus Technical Cleanup (Bluefin Documentation)_
_Researched: January 26, 2026_
_Purpose: Inform cleanup phase sequencing for subsequent milestone_
