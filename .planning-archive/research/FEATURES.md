# Feature Research - Docusaurus Technical Cleanup

**Domain:** Docusaurus static site maintenance and technical debt remediation
**Researched:** January 26, 2026
**Confidence:** HIGH

## Feature Landscape

This document categorizes cleanup activities for a Docusaurus 3.8.1 documentation site with technical debt accumulated through prototyping. Activities are organized by criticality to maintainability and deployability.

### Table Stakes (Site Cannot Be Maintained Without These)

Features users expect. Missing = product feels incomplete.

| Feature                                         | Why Expected                                                                 | Complexity | Notes                                                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zero TypeScript compilation errors**          | TypeScript exists to catch bugs; tolerating errors defeats the purpose       | MEDIUM     | 14 errors across 3 files: type mismatches in FeedItems.tsx, PackageSummary.tsx, BlogPostItem/index.tsx. Requires proper type definitions for FeedData and JSX namespace |
| **All validation commands pass**                | CI/CD gates and developer workflow depend on clean validation                | LOW        | Currently `npm run typecheck` fails with type errors; `npm run prettier-lint` shows warnings on existing files (normal)                                                 |
| **No dead code or unused components**           | Unused code creates confusion, slows comprehension, hides bugs               | MEDIUM     | Need to audit 17 TypeScript files for unused exports, commented code, abandoned experiments from prototyping phase                                                      |
| **Dependencies match usage**                    | Unused deps bloat install time, create security surface, confuse maintenance | MEDIUM     | Need to audit 16 dependencies + 5 devDependencies against actual import statements in codebase                                                                          |
| **Configuration aligned with Docusaurus 3.8.1** | Framework best practices ensure long-term compatibility and support          | LOW        | Review docusaurus.config.ts against official docs (tsconfig.json setup confirmed correct per official TypeScript support guide)                                         |
| **SSR-safe component patterns**                 | Docusaurus uses server-side rendering; unsafe patterns cause build failures  | MEDIUM     | Document window/localStorage usage patterns; ensure all components check `typeof window !== 'undefined'` where needed                                                   |
| **Scripts are maintainable**                    | Complex unmaintainable scripts block future changes and accumulate debt      | HIGH       | 11 scripts totaling 2040 lines; update-driver-versions.js is 464 lines with brittle HTML scraping; needs documentation or simplification                                |

### Differentiators (Quality Improvements, Not Required for Function)

Features that set the product apart. Not required, but valuable.

| Feature                                   | Value Proposition                                                                  | Complexity | Notes                                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Testing framework**                     | Catch regressions, enable confident refactoring, document expected behavior        | MEDIUM     | No tests currently; Docusaurus supports Jest/Vitest; recommend Vitest for Vite-compatible testing of components and scripts |
| **Explicit type safety (no `any` types)** | Catch bugs at compile time, improve IDE experience, document contracts             | MEDIUM     | Audit all `any` usages; create proper type definitions for feed data, GitHub API responses, component props                 |
| **ESLint configuration**                  | Consistent code style beyond formatting, catch common mistakes, enforce patterns   | LOW        | Currently only Prettier; add @docusaurus/eslint-plugin for Docusaurus-specific rules                                        |
| **Script documentation**                  | Each script has header comment explaining purpose, inputs, outputs, error handling | LOW        | 11 scripts lack consistent documentation; especially critical for complex ones like fetch-feeds.js (166 lines)              |
| **React 19 peer dependency resolution**   | Clean installs without --legacy-peer-deps flag, future compatibility               | MEDIUM     | Current React 19 requires workaround; assess if Docusaurus 3.8.1 officially supports React 19 or if downgrade to 18 needed  |
| **Conventional commits**                  | Automated changelog generation, clear history, semantic versioning support         | LOW        | Establish commit message convention for cleanup work; conventional-commit.prompt.md already exists                          |
| **Component isolation tests**             | Validate components render without errors, test edge cases, document usage         | MEDIUM     | Test critical components: FeedItems, PackageSummary, GitHubProfileCard, ProjectCard                                         |
| **API rate limit handling**               | Prevent GitHub API rate limit failures in CI/CD, graceful degradation              | LOW        | Document GITHUB_TOKEN requirement; add retry logic or caching to fetch scripts                                              |

### Anti-Features (Things to Explicitly NOT Do During Cleanup)

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature                           | Why Avoid                                                                           | What to Do Instead                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Add end-to-end tests**               | E2E tests are slow, brittle, expensive to maintain for static site with no backend  | Unit test components, integration test data fetching scripts, validate build output |
| **Migrate to different framework**     | Not a cleanup activity; introduces new risks; Docusaurus is fine for static docs    | Stay on Docusaurus 3.8.1; focus on aligning with its best practices                 |
| **Refactor for performance**           | Performance not identified as problem; premature optimization adds risk             | Only optimize if blocking correctness or causing build failures                     |
| **Add complex CI/CD pipelines**        | Site already deploys successfully; cleanup shouldn't require infrastructure changes | Keep existing GitHub Actions workflow; only fix if validation gates needed          |
| **Rebuild components from scratch**    | Working code with type issues can be fixed incrementally; rewrites introduce bugs   | Fix type definitions; refactor only if code is unmaintainable                       |
| **Add database or backend services**   | Static site generation is core Docusaurus pattern; backend defeats purpose          | Keep build-time data fetching pattern with GitHub API and static JSON               |
| **Introduce breaking content changes** | Cleanup is technical only; content updates are separate concern                     | Preserve all .md/.mdx files unchanged; only touch .tsx/.ts/.js/.json                |
| **Over-engineer scripts**              | Simpler is better for maintenance; complex frameworks for scripts overkill          | Prefer straightforward Node.js; only abstract if 3+ scripts share identical pattern |

## Feature Dependencies

```
[TypeScript errors fixed]
    └──requires──> [Proper type definitions created]
                       └──requires──> [FeedData interface defined]
                       └──requires──> [JSX namespace imported]

[Testing framework] ──enhances──> [TypeScript type safety]
                   ──enhances──> [Dead code removal] (tests document what's used)

[ESLint configuration] ──enhances──> [Code consistency]
                       ──requires──> [TypeScript errors fixed] (can't lint broken code)

[Unused deps removed] ──requires──> [Dead code removed] (ensure code isn't using dep)

[React 19 resolution] ──conflicts──> [Docusaurus 3.8.1 official support]
                      (may require downgrade to React 18)

[Script simplification] ──requires──> [Script documentation] (understand before changing)
```

### Dependency Notes

- **TypeScript errors require type definitions:** Cannot pass typecheck without defining proper interfaces for feed data structures and resolving JSX namespace issues in swizzled components
- **Testing enhances multiple areas:** Tests serve as living documentation, making it safe to remove dead code and validate type safety assumptions
- **ESLint depends on working TypeScript:** Linting broken code produces noise; must fix compilation first
- **Dependency removal requires code audit:** Can't safely remove deps without confirming no imports reference them
- **React 19 may conflict with Docusaurus:** Need to verify official React 19 support in Docusaurus 3.8.1; may need to downgrade to React 18 for stable peer dependencies
- **Script work should document first:** Understanding scripts before simplifying prevents breaking data fetching critical to build

## MVP Definition

### Launch With (Phase 1: Critical Path)

Minimum viable cleanup — what's needed to claim "validation passes, no technical debt."

- [x] **TypeScript compilation errors resolved** — Cannot claim type safety with 14 errors
  - Fix FeedItems.tsx type mismatches (FeedData vs ParsedFeed)
  - Fix PackageSummary.tsx property access errors on FeedData
  - Fix BlogPostItem JSX namespace issue
  - Create proper TypeScript interfaces in src/types/

- [x] **Dead code and unused components removed** — Audit 17 .tsx/.ts files
  - Remove unused exports
  - Delete commented-out code from prototyping
  - Remove abandoned experiment files

- [x] **Unused dependencies removed** — Clean package.json
  - Cross-reference 21 total dependencies against actual imports
  - Remove deps not imported anywhere in src/ or scripts/
  - Document why remaining deps are needed

- [x] **Configuration validation** — Ensure aligned with Docusaurus 3.8.1 best practices
  - Review docusaurus.config.ts against official API reference
  - Validate tsconfig.json setup
  - Check babel.config.js if present

- [x] **All validation commands pass** — Green CI/CD gates
  - `npm run typecheck` succeeds
  - `npm run prettier-lint` passes (warnings on existing files acceptable)
  - `npm run build` succeeds without TypeScript errors

### Add After Validation (Phase 2: Quality Improvements)

Features to add once core cleanup is complete.

- [ ] **ESLint configuration** — Trigger: After TypeScript errors fixed
  - Install @docusaurus/eslint-plugin
  - Configure rules for React, TypeScript, Docusaurus patterns
  - Fix lint errors, add suppressions only where justified

- [ ] **Script documentation** — Trigger: During dead code audit
  - Add header comments to all 11 scripts
  - Document inputs (environment variables, files), outputs (JSON files), error cases
  - Explain complex logic in fetch-feeds.js, update-driver-versions.js

- [ ] **React 19 peer dependency resolution** — Trigger: After researching Docusaurus support
  - Check Docusaurus 3.8.1 changelog for React 19 official support
  - If unsupported, downgrade to React 18.x
  - Remove --legacy-peer-deps requirement from AGENTS.md

- [ ] **Explicit type safety audit** — Trigger: After TypeScript errors fixed
  - Search codebase for `any` types
  - Replace with proper interfaces or explicit `unknown` with type guards
  - Document why `any` is needed if unavoidable (e.g., xml2js output)

### Future Consideration (Phase 3+: Beyond Initial Cleanup)

Features to defer until cleanup validated and site stabilized.

- [ ] **Testing framework (Vitest)** — Why defer: Tests for correctness, not cleanup prerequisite
  - Install vitest, @testing-library/react
  - Test critical components: FeedItems, PackageSummary, GitHubProfileCard
  - Test data fetching scripts: fetch-feeds.js, fetch-github-profiles.js

- [ ] **Component isolation tests** — Why defer: Enhancement after testing framework established
  - Snapshot tests for component rendering
  - Props validation tests
  - Edge case tests (empty data, missing fields)

- [ ] **API rate limit handling** — Why defer: Doesn't block cleanup; nice-to-have for CI/CD reliability
  - Add retry logic with exponential backoff
  - Cache API responses with TTL
  - Document GITHUB_TOKEN setup more prominently

- [ ] **Script simplification** — Why defer: Working scripts don't block cleanup; simplification is optimization
  - Assess if update-driver-versions.js (464 lines) can be simplified
  - Extract common patterns from fetch-\* scripts into shared utilities
  - Consider replacing brittle HTML scraping with stable APIs

## Feature Prioritization Matrix

| Feature                | User Value                      | Implementation Cost          | Priority |
| ---------------------- | ------------------------------- | ---------------------------- | -------- |
| Fix TypeScript errors  | HIGH (blocks type safety)       | MEDIUM (3 files, ~14 errors) | P1       |
| Remove dead code       | HIGH (clarity, maintainability) | MEDIUM (audit 17 files)      | P1       |
| Remove unused deps     | HIGH (security, install speed)  | LOW (automated detection)    | P1       |
| Validate configuration | HIGH (framework alignment)      | LOW (review against docs)    | P1       |
| All validation passes  | HIGH (CI/CD, workflow)          | LOW (follows from above)     | P1       |
| Add ESLint             | MEDIUM (code quality)           | LOW (install, configure)     | P2       |
| Document scripts       | MEDIUM (maintainability)        | LOW (write comments)         | P2       |
| Resolve React 19 deps  | MEDIUM (clean installs)         | MEDIUM (may need downgrade)  | P2       |
| Type safety audit      | MEDIUM (catch more bugs)        | MEDIUM (replace any types)   | P2       |
| Add testing framework  | MEDIUM (prevent regressions)    | MEDIUM (setup + write tests) | P3       |
| Component tests        | LOW (enhancement)               | MEDIUM (test all components) | P3       |
| Rate limit handling    | LOW (nice-to-have)              | MEDIUM (retry logic)         | P3       |
| Simplify scripts       | LOW (optimization)              | HIGH (risky, working code)   | P3       |

**Priority key:**

- P1: Must have for cleanup to be considered complete
- P2: Should have, add once P1 complete
- P3: Nice to have, future enhancement beyond cleanup scope

## Cleanup Approach Comparison

### Option A: Fix-in-Place (Recommended)

**What:** Incrementally fix type errors by adding proper type definitions; refactor only where code is truly unmaintainable.

**Strengths:**

- Lower risk (working code preserved)
- Faster (don't rewrite what works)
- Easier to validate (small changes)
- Maintains git history context

**Weaknesses:**

- May leave some suboptimal patterns
- Doesn't improve code structure

**Best for:** Technical debt cleanup where code functions but has type/quality issues

### Option B: Rewrite Components

**What:** Rebuild components from scratch with proper types and patterns.

**Strengths:**

- "Fresh start" eliminates accumulated cruft
- Can apply ideal patterns throughout

**Weaknesses:**

- High risk of introducing bugs
- Time-consuming
- Hard to validate equivalence
- Out of scope for "cleanup" project

**Best for:** When code is completely unmaintainable or wrong approach

**Recommendation:** Use Option A (fix-in-place) for all current issues. None of the identified problems require rewrites — all are fixable with type definitions, removing unused code, and documenting existing logic.

## Sources

**Official Docusaurus Documentation (HIGH confidence):**

- https://docusaurus.io/docs/typescript-support - TypeScript setup, tsconfig, typing config file
- https://docusaurus.io/docs/configuration - Configuration file structure, plugin/theme setup
- https://docusaurus.io/docs/advanced - Architecture patterns, SSR considerations
- https://docusaurus.io/docs/migration - Troubleshooting upgrades, clearing cache

**Codebase Analysis (HIGH confidence):**

- Project codebase analysis (2026-01-26): 17 TypeScript files, 11 scripts, 14 TypeScript errors
- package.json: Docusaurus 3.8.1, React 19.0.0, TypeScript 5.9.2
- Known issues: FeedData type mismatches, JSX namespace errors, React 19 peer dep conflicts
- Scripts complexity: 2040 total lines across 11 scripts

**Community Best Practices (MEDIUM confidence):**

- TypeScript strict mode recommended for Docusaurus projects
- Vitest preferred over Jest for Vite-based projects (Docusaurus uses Vite internally)
- ESLint with @docusaurus/eslint-plugin for framework-specific rules
- Avoid E2E tests for static sites; focus on component tests and build validation

**Patterns from PROJECT.md and AGENTS.md (HIGH confidence):**

- Existing build validation workflow: typecheck → build → prettier-lint
- SSR hazards documented: localStorage/window usage requires checks
- Known script complexity: update-driver-versions.js 464 lines with HTML scraping
- Testing gap: No test framework configured
- Commit convention: Conventional commits via conventional-commit.prompt.md

---

_Feature research for: Docusaurus Technical Cleanup_
_Researched: January 26, 2026_
