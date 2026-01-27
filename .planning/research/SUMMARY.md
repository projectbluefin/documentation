# Project Research Summary

**Project:** Docusaurus Technical Cleanup
**Domain:** Static site generator maintenance and technical debt remediation
**Researched:** January 26, 2026
**Confidence:** HIGH

## Executive Summary

The bluefin-docs project is a Docusaurus 3.8.1 TypeScript documentation site that has accumulated technical debt through prototyping. The site functions correctly but has 14 TypeScript compilation errors across 3 files, unused code from experimentation, and potential dependency conflicts with React 19. This cleanup project aims to achieve zero TypeScript errors, remove dead code, validate configuration alignment with Docusaurus best practices, and establish maintainable patterns for future development.

The recommended approach is **incremental fix-in-place** rather than component rewrites. Research shows the codebase architecture is sound—components follow proper separation of concerns with centralized configuration, build-time data fetching, and appropriate use of Docusaurus patterns. The primary issues are type definition mismatches (particularly for the `useStoredFeed` hook), missing type safety in auto-generated data structures, and remnants of prototyping that cloud the codebase. All identified problems can be fixed with proper type definitions and selective code removal without architectural changes.

The key risks are: (1) **breaking GitHub Pages deployment** through configuration changes, (2) **breaking build-time data fetching** that pulls GitHub releases and API data, and (3) **swizzled component maintenance hell** during future Docusaurus upgrades. These risks are mitigated by treating deployment configuration as immutable during cleanup, documenting fetch scripts as critical infrastructure, and auditing swizzled components for necessity. The cleanup sequence must follow strict dependency order: configuration → type system → shared config → build scripts → components, as errors cascade from upstream layers to downstream consumers.

## Key Findings

### Recommended Stack

**Current stack is appropriate—no framework changes needed.** The site uses Docusaurus 3.8.1 with React 19, TypeScript 5.9.2, and Node.js 20+. Research recommends upgrading to Docusaurus 3.9.2 (latest stable with React 19 improvements) and resolving React 19 peer dependency conflicts using npm overrides rather than the `--legacy-peer-deps` workaround currently documented.

**Core technologies:**

- **Docusaurus 3.9.2**: Static site generator — latest stable brings AskAI support, i18n improvements, and Node.js 20+ official support (18 EOL)
- **React 19.2**: UI framework — stable release (Dec 2024) with Actions, improved hydration, stricter SSR validation
- **TypeScript 5.9+**: Type safety — minimum for Docusaurus 3.9, enables strict mode for cleanup goals
- **Prettier 3.6.2**: Code formatting — pin exact version to prevent formatting churn across team
- **npm overrides**: Peer dependency resolution — forces React 19 across all transitive dependencies without disabling peer checks

**Critical version requirements:**

- Node.js 18 dropped in Docusaurus 3.9 (EOL), use 20.x LTS or 22.x
- TypeScript must extend `@docusaurus/tsconfig` base configuration
- React 19 requires npm overrides to resolve peer dependency warnings from Docusaurus packages built for React 18

**Validation tooling:**

- TypeScript compiler for type checking (goal: zero errors)
- Prettier for formatting (warnings on existing files acceptable)
- ESLint 9 optional but recommended for catching logic errors TypeScript can't detect

### Expected Features

This is a **cleanup project, not feature development**. All "features" are quality improvements to existing functionality.

**Must have (table stakes for cleanup completion):**

- **Zero TypeScript compilation errors** — currently 14 errors across FeedItems.tsx, PackageSummary.tsx, BlogPostItem/index.tsx
- **All validation commands pass** — `npm run typecheck`, `npm run prettier-lint`, `npm run build` succeed without errors
- **No dead code or unused components** — audit 17 TypeScript files for commented code, unused exports, abandoned experiments
- **Dependencies match usage** — remove unused dependencies from package.json (currently 16 deps + 5 devDeps to audit)
- **Configuration aligned with Docusaurus 3.8.1** — validate docusaurus.config.ts, tsconfig.json against official docs
- **SSR-safe component patterns** — document window/localStorage usage, ensure `typeof window !== 'undefined'` checks
- **Scripts are maintainable** — 11 scripts totaling 2040 lines need documentation, especially complex ones like update-driver-versions.js (464 lines)

**Should have (quality improvements beyond MVP):**

- **ESLint configuration** — add @docusaurus/eslint-plugin for Docusaurus-specific rules
- **Explicit type safety** — eliminate `any` types, create proper interfaces for feed data and GitHub API responses
- **Script documentation** — header comments explaining purpose, inputs, outputs, error handling
- **React 19 peer dependency resolution** — clean installs without `--legacy-peer-deps` flag via npm overrides
- **Component isolation tests** — test critical components (FeedItems, PackageSummary, GitHubProfileCard, ProjectCard)

**Defer (v2+, beyond cleanup scope):**

- **Testing framework** — Vitest for component and script tests (enhancement, not prerequisite for cleanup)
- **API rate limit handling** — retry logic and caching for GitHub API (operational improvement, doesn't block cleanup)
- **Script simplification** — refactoring 464-line update-driver-versions.js (risky, working code doesn't block cleanup)

### Architecture Approach

**Current architecture is well-organized and follows Docusaurus best practices.** The project uses a layered approach with clear separation: configuration layer (docusaurus.config.ts, tsconfig.json) → type system (src/types/) → shared config (packageConfig.ts) → build scripts (scripts/fetch-\*.js) → components (src/components/) → content (docs/, blog/). Components correctly consume centralized configuration and build-time generated data.

**Major components:**

1. **Configuration layer** — Defines build settings, dependencies, TypeScript config; top-level foundation for all other layers
2. **Type system** — Provides TypeScript definitions for Docusaurus hooks and data structures; **critical issue: theme.d.ts declares wrong type for useStoredFeed**
3. **Shared config** — Centralized package tracking patterns in packageConfig.ts consumed by FeedItems and PackageSummary; prevents duplication
4. **Build scripts** — Generate JSON data files at build time (feeds, playlists, GitHub profiles/repos); run during `npm run fetch-data` called by `npm start` and `npm run build`
5. **Component layer** — React components consume types, shared config, and build-time data; currently have TypeScript errors due to upstream type mismatches
6. **Content layer** — Markdown/MDX documentation embeds components; excluded from cleanup scope

**Critical architectural patterns:**

- **Build-time data fetching**: External data (GitHub API, YouTube) fetched during build and stored as static JSON, avoiding runtime API calls and rate limits
- **Centralized configuration**: packageConfig.ts provides single source of truth for package tracking patterns used across components
- **Type declarations for theme hooks**: Manual type definitions for Docusaurus plugins that don't export TypeScript types (current issue: declarations don't match runtime behavior)

**Key data flows:**

1. **Package tracking**: packageConfig.ts → FeedItems.tsx + PackageSummary.tsx → Changelog page displays package versions
2. **GitHub stats**: fetch-github-repos.js → static/data/github-repos.json → ProjectCard.tsx → Donations page shows stars/forks
3. **Feed data**: fetch-feeds.js → static/feeds/\*.json → Docusaurus plugin → useStoredFeed() → FeedItems.tsx → Changelogs page

### Critical Pitfalls

Research identified 13 pitfalls; top 5 most critical for cleanup:

1. **Breaking GitHub Pages deployment pipeline** — Incorrect baseUrl/url config, deleted .nojekyll file, modified trailingSlash settings cause silent deployment failures or 404s. **Mitigation**: Treat deployment config as immutable, document as "DO NOT MODIFY WITHOUT TESTING", test full deployment cycle before merging.

2. **Breaking build-time data fetching** — Removing `npm run fetch-data` from build pipeline or breaking fetch scripts causes site to build with stale/missing data. **Mitigation**: Document fetch scripts as critical infrastructure, validate JSON files exist after build, add GITHUB_TOKEN to CI/CD for rate limits.

3. **Swizzled component maintenance hell** — Three ejected components (BlogPostItem/index.tsx, BlogPostItem/Footer/index.tsx, DocItem/Footer/index.tsx) are frozen snapshots that break on Docusaurus upgrades. **Mitigation**: Audit all swizzles with `npm run swizzle -- --list`, document why each exists, consider unwrapping if possible.

4. **React 19 ecosystem incompatibilities** — React 19 is bleeding edge (stable Dec 2024); custom components and third-party libraries may have compatibility issues. **Mitigation**: Test all components in strict mode, watch for hydration errors, document React 19 as edge dependency.

5. **TypeScript strict mode shock** — Enabling `strict: true` all at once surfaces hundreds of errors and stalls cleanup. **Mitigation**: Enable individual strict flags incrementally (start with `noImplicitAny`), use `@ts-expect-error` strategically for third-party issues, fix one component at a time.

**Additional notable pitfalls:**

- **Committing auto-generated files** (static/feeds/, static/data/) creates merge conflicts and git bloat—already in .gitignore but must verify
- **Breaking MDX v3 content at scale** — Small changes can break 28 docs + 21 blog posts; use `npx docusaurus-mdx-checker` before starting
- **Development server reliability** — Use detached mode with log redirection (`npm start 2>&1 | tee /tmp/docusaurus-server.log &`), never use async mode

## Implications for Roadmap

Based on architectural dependency analysis, cleanup **must** follow this sequence—errors cascade from upstream layers to downstream consumers. Out-of-order fixes result in "whack-a-mole" pattern where fixing one error creates another.

### Phase 1: Configuration Foundation & Critical Infrastructure

**Rationale:** Nothing can build without correct dependencies and deployment config. This phase establishes stability for all subsequent work.

**Delivers:**

- Clean dependency installation without `--legacy-peer-deps` workaround
- Validated TypeScript configuration extending `@docusaurus/tsconfig`
- Documented deployment configuration as immutable infrastructure
- Verified build-time data fetching scripts are documented and protected

**Addresses:**

- Dependencies match usage (FEATURES.md: table stakes)
- Configuration aligned with Docusaurus 3.8.1 (FEATURES.md: table stakes)
- React 19 peer dependency resolution (FEATURES.md: quality improvement)

**Avoids:**

- Breaking GitHub Pages deployment (PITFALLS.md: critical #1)
- Breaking build-time data fetching (PITFALLS.md: critical #2)
- Committing auto-generated files (PITFALLS.md: critical #7)

**Key tasks:**

- Add npm overrides to package.json for React 19 peer dependencies
- Audit dependencies against actual imports, remove unused
- Validate tsconfig.json against Docusaurus TypeScript support docs
- Document deployment config sections in docusaurus.config.ts as critical
- Document all 11 build scripts with purpose, inputs, outputs
- Verify .gitignore contains auto-generated data files
- Test development server reliability workflow

**Research flag:** No additional research needed—standard configuration validation following official Docusaurus docs.

### Phase 2: Type System Repair

**Rationale:** Components depend on correct type definitions. Must fix types before components can be properly type-checked. This is the root cause of the 14 TypeScript errors.

**Delivers:**

- Corrected type definition for `useStoredFeed` hook in src/types/theme.d.ts
- Proper TypeScript interfaces for feed data structures (RSS/Atom with rss.channel.item or feed.entry paths)
- Type definitions for auto-generated JSON files (github-profiles.json, github-repos.json, playlist-metadata.json)
- Validated type definitions match actual runtime data structures

**Addresses:**

- Zero TypeScript compilation errors (FEATURES.md: table stakes) — root cause
- Explicit type safety (FEATURES.md: quality improvement)

**Avoids:**

- TypeScript strict mode shock (PITFALLS.md: critical #5)
- React 19 incompatibilities (PITFALLS.md: critical #4)

**Uses:**

- TypeScript 5.9+ (STACK.md: type safety)
- Docusaurus type packages (@docusaurus/types, @docusaurus/module-type-aliases)

**Key tasks:**

- Fix src/types/theme.d.ts FeedData interface to match actual plugin output structure
- Create proper interfaces for ParsedFeed, FeedItem with optional chaining for RSS/Atom variations
- Add type definitions for GitHub API response structures
- Validate types by testing components import correctly
- Test with `npm run typecheck` after each type definition change

**Critical issue identified:** Current theme.d.ts declares `FeedData { items: FeedItem[] }` but actual structure is `FeedData { rss?: { channel?: { item?: FeedItem[] } }, feed?: { entry?: FeedItem[] } }`.

**Research flag:** No additional research needed—type mismatches are known, solution is to match TypeScript definitions to actual plugin data structure.

### Phase 3: Component Layer Cleanup

**Rationale:** With type system corrected, component TypeScript errors can be fixed efficiently. Follows dependency order: shared config → components.

**Delivers:**

- All TypeScript errors in components resolved
- Dead code and unused exports removed from 17 TypeScript files
- Swizzled components audited and documented or removed
- SSR-safe patterns documented for window/localStorage usage

**Addresses:**

- Zero TypeScript compilation errors (FEATURES.md: table stakes) — component layer
- No dead code or unused components (FEATURES.md: table stakes)
- SSR-safe component patterns (FEATURES.md: table stakes)

**Avoids:**

- Swizzled component maintenance hell (PITFALLS.md: critical #3)
- Fixing components before type system (ARCHITECTURE.md: anti-pattern)

**Implements:**

- Component layer from architecture (ARCHITECTURE.md: level 4)
- Proper consumption of centralized configuration pattern

**Key tasks:**

- Fix FeedItems.tsx type mismatches (now that FeedData is correct)
- Fix PackageSummary.tsx property access errors
- Fix BlogPostItem JSX namespace issue
- Audit all 17 .tsx/.ts files for unused exports, commented code, abandoned experiments
- Run `npm run swizzle -- --list` to audit swizzled components
- Document rationale for each swizzled component or remove if unnecessary
- Test components render correctly in development server

**Component priority order:**

1. FeedItems.tsx and PackageSummary.tsx (share packageConfig dependency)
2. ProjectCard.tsx (depends on build script output)
3. Theme overrides in src/theme/
4. Remaining components

**Research flag:** No additional research needed—fixing type errors and removing dead code, not adding functionality.

### Phase 4: Validation & Polish

**Rationale:** Final integration testing and optional quality improvements. All blocking issues resolved in previous phases.

**Delivers:**

- All validation commands pass (npm run typecheck, npm run prettier-lint, npm run build)
- ESLint configured with @docusaurus/eslint-plugin (optional)
- Prettier configuration finalized
- Full build and deployment tested

**Addresses:**

- All validation commands pass (FEATURES.md: table stakes)
- ESLint configuration (FEATURES.md: quality improvement)

**Avoids:**

- Prettier configuration wars (PITFALLS.md: minor #12)
- Theme CSS customization overreach (PITFALLS.md: moderate #8)

**Key tasks:**

- Run full validation workflow: typecheck → build → prettier-lint
- Optional: Install and configure ESLint 9 with flat config
- Add `.prettierignore` for `*.mdx` files if MDX formatting causes issues
- Test production build with `npm run serve`
- Create test PR to verify GitHub Pages deployment
- Document validation workflow in AGENTS.md

**Research flag:** No additional research needed—validation against existing tooling.

### Phase Ordering Rationale

- **Configuration must come first** because nothing builds without correct dependencies and TypeScript config affects all type checking
- **Type system must come second** because components depend on type definitions; fixing components before types results in wasted work when types change
- **Components come third** because they depend on both configuration and type system; errors are now isolated to specific components
- **Validation comes last** as final integration test after all components fixed

This sequence follows the dependency graph from ARCHITECTURE.md (Level 0 → Level 1 → Level 3 → Level 4) and avoids all three anti-patterns identified: fixing components before types, ignoring build script dependencies, treating all errors equally.

### Research Flags

**Phases with standard patterns (skip research-phase):**

- **Phase 1**: Configuration validation — well-documented in Docusaurus official docs, npm overrides documented in npm docs
- **Phase 2**: Type definitions — TypeScript patterns for Docusaurus plugins, specific interfaces needed are identified
- **Phase 3**: Component cleanup — removing dead code and fixing type errors, no new patterns needed
- **Phase 4**: Validation — running existing tooling, no new research needed

**No phases need deeper research.** All required knowledge is captured in research files. This is a cleanup project with clear technical debt to resolve, not a greenfield project exploring new patterns.

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                  |
| ------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | Official Docusaurus docs, React 19 stable release blog, TypeScript handbook; all recommended versions are well-documented              |
| Features     | HIGH       | Codebase analysis identified specific errors and files; cleanup scope is concrete and measurable (14 TypeScript errors across 3 files) |
| Architecture | HIGH       | Direct codebase inspection reveals clear layered architecture; dependency analysis shows exact sequence needed                         |
| Pitfalls     | HIGH       | Docusaurus v3 migration guide, MDX v2/v3 migration docs, project git history shows deployment and data fetching issues                 |

**Overall confidence:** HIGH

Research is based on official documentation (Docusaurus, React, TypeScript, MDX), direct codebase analysis showing specific files and error counts, and git history revealing common failure patterns. The cleanup scope is well-defined with measurable success criteria (zero TypeScript errors, all validation passing).

### Gaps to Address

**No significant gaps requiring additional research.** Minor validation points to confirm during implementation:

- **Docusaurus 3.9.2 upgrade**: Verify changelog for breaking changes between 3.8.1 and 3.9.2 before upgrading—research assumes backward compatibility based on semantic versioning
- **npm overrides testing**: Validate overrides approach works for all Docusaurus peer dependencies, not just documented examples—should be straightforward but needs verification
- **Swizzled component necessity**: Research identified 3 swizzled components but didn't analyze what customizations they provide—audit during Phase 3 to determine if truly necessary

All gaps are validation tasks during normal implementation flow, not research blockers.

## Sources

### Primary (HIGH confidence)

**Official Docusaurus Documentation:**

- [Docusaurus TypeScript Support](https://docusaurus.io/docs/typescript-support) - TypeScript setup, tsconfig, module type aliases
- [Docusaurus v3 Migration Guide](https://docusaurus.io/docs/migration/v3) - Breaking changes, deprecations
- [Docusaurus 3.9 Release Notes](https://docusaurus.io/blog/releases/3.9) - Latest version features, Node.js 18 EOL
- [Docusaurus Static Site Generation](https://docusaurus.io/docs/advanced/ssg) - SSR patterns, BrowserOnly component
- [Docusaurus Architecture](https://docusaurus.io/docs/advanced/architecture) - Plugin lifecycle, theme communication
- [Docusaurus Swizzling](https://docusaurus.io/docs/swizzling) - Safety guidelines for component ejection
- [Docusaurus Deployment](https://docusaurus.io/docs/deployment) - GitHub Pages setup

**Official React Documentation:**

- [React 19 Release Blog](https://react.dev/blog/2024/12/05/react-19) - Stable release features, breaking changes

**Official TypeScript Documentation:**

- [TypeScript Handbook: tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) - Compiler configuration
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict) - Strict flag options

**Official MDX Documentation:**

- [MDX v2 Migration](https://mdxjs.com/migrating/v2/) - Breaking changes from v1
- [MDX v3 Release](https://mdxjs.com/blog/v3/) - Additional breaking changes

**Official Tooling Documentation:**

- [Prettier Install Guide](https://prettier.io/docs/en/install) - Setup and configuration
- [ESLint Getting Started](https://eslint.org/docs/latest/use/getting-started) - ESLint 9 flat config

**Project-Specific Documentation:**

- bluefin-docs AGENTS.md - Current build configuration, validation workflow, known issues
- bluefin-docs package.json - Dependency versions: Docusaurus 3.8.1, React 19.0.0, TypeScript 5.9.2
- bluefin-docs git history - Recent fixes showing deployment issues, data fetching patterns, MDX syntax problems

### Secondary (MEDIUM confidence)

- npm overrides for React 19 peer dependency resolution - npm 8.3+ feature documented but specific application to Docusaurus is recent (React 19 stable only Dec 2024)

### Codebase Analysis (HIGH confidence)

Direct inspection of bluefin-docs repository:

- 17 TypeScript files in src/components/, src/config/, src/types/, src/theme/
- 14 TypeScript compilation errors: FeedItems.tsx (type mismatch), PackageSummary.tsx (property access), BlogPostItem/index.tsx (JSX namespace)
- 11 build scripts totaling 2040 lines: fetch-feeds.js, fetch-playlists.js, fetch-github-profiles.js, fetch-github-repos.js, update-driver-versions.js (464 lines, complex HTML scraping)
- 3 swizzled components: BlogPostItem/index.tsx, BlogPostItem/Footer/index.tsx, DocItem/Footer/index.tsx
- 5 auto-generated JSON files: bluefin-releases.json, bluefin-lts-releases.json, playlist-metadata.json, github-profiles.json, github-repos.json

---

_Research completed: January 26, 2026_
_Ready for roadmap: yes_
