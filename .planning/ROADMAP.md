# Roadmap: Bluefin Documentation Technical Cleanup

**Created:** 2026-01-26
**Depth:** Quick (4 phases)
**Coverage:** 16/16 v1 requirements mapped

## Overview

Transform the Bluefin documentation site from functional-but-flawed to technically sound and maintainable. Eliminate all 14 TypeScript compilation errors, remove dead code, resolve React 19 peer dependency conflicts, and align configuration with Docusaurus 3.8.1 best practices. Phases follow strict architectural dependency order: configuration foundation → type system repair → component cleanup → validation.

## Phases

### Phase 1: Configuration Foundation

**Goal:** Clean dependency installation and validated TypeScript configuration establish stable foundation for all subsequent work.

**Dependencies:** None (foundation phase)

**Plans:** 1 plan

Plans:

- [ ] 01-01-PLAN.md — Configure dependencies with npm overrides and validate foundation

**Requirements:**

- CONFIG-01: React 19 peer dependencies resolved using npm overrides
- CONFIG-02: docusaurus.config.ts validated against Docusaurus 3.8.1 best practices
- CONFIG-03: Unused dependencies removed from package.json

**Success Criteria:**

1. User can run `npm install` without `--legacy-peer-deps` flag and installation completes successfully
2. User can run `npm run build` and build completes without peer dependency warnings
3. All dependencies in package.json have corresponding import statements in codebase (zero unused dependencies)
4. TypeScript configuration extends `@docusaurus/tsconfig` and compiles without configuration errors
5. Development server starts reliably using documented detached mode workflow

**Research Notes:** Standard configuration validation following official Docusaurus docs. No additional research needed.

---

### Phase 2: Type System Repair

**Goal:** Correct type definitions for Docusaurus hooks and auto-generated data structures eliminate root cause of component TypeScript errors.

**Dependencies:** Phase 1 (requires correct TypeScript configuration)

**Plans:** 1 plan

Plans:

- [ ] 02-01-PLAN.md — Fix FeedData type interface and create data structure types

**Requirements:**

- TYPE-01: src/types/theme.d.ts FeedData interface fixed to match useStoredFeed hook structure
- TYPE-02: Proper TypeScript interfaces created for auto-generated JSON data
- TYPE-03: TypeScript strict mode flags enabled incrementally
- TYPE-04: All `any` types replaced with proper interfaces

**Success Criteria:**

1. FeedData interface in theme.d.ts matches actual plugin output structure (RSS/Atom feed variations)
2. TypeScript interfaces exist for all auto-generated JSON files (feeds, playlists, github-profiles, github-repos)
3. User can import type definitions in components without type errors
4. `npm run typecheck` shows reduced error count (components still broken, but type system itself valid)
5. At least one strict mode flag enabled (e.g., `noImplicitAny`) without breaking build

**Research Notes:** Type mismatches are known. Solution is matching TypeScript definitions to actual plugin data structure.

---

### Phase 3: Component Cleanup

**Goal:** All components compile cleanly and dead code is removed, leveraging corrected type system.

**Dependencies:** Phase 2 (requires correct type definitions)

**Plans:** 1 plan

Plans:

- [ ] 03-01-PLAN.md — Audit swizzled components, verify SSR safety, and remove dead code

**Requirements:**

- COMP-01: TypeScript errors in FeedItems.tsx resolved
- COMP-02: TypeScript errors in PackageSummary.tsx resolved
- COMP-03: TypeScript errors in BlogPostItem/index.tsx resolved
- COMP-04: All components audited for SSR safety
- COMP-05: Three swizzled theme components audited for necessity
- COMP-06: Component isolation tests written for critical components

**Success Criteria:**

1. User can run `npm run typecheck` and FeedItems.tsx, PackageSummary.tsx, BlogPostItem/index.tsx show zero TypeScript errors
2. All 17 TypeScript files audited with commented code, unused exports, and abandoned experiments removed
3. User can navigate to /changelogs/ in development server and package summary cards render correctly
4. All window/localStorage usage is guarded with `typeof window !== 'undefined'` checks
5. Each of the 3 swizzled components (BlogPostItem, DocItem/Footer) has documented rationale or is removed

**Research Notes:** Phase 2 already fixed COMP-01, COMP-02, COMP-03 (type errors resolved). Phase 3 focuses on SSR safety audit, swizzled component cleanup (2 to remove, 1 to document), and dead code removal.

---

### Phase 4: Validation & Quality Gates

**Goal:** All validation commands pass and code quality standards are enforced going forward.

**Dependencies:** Phase 3 (requires all components fixed)

**Plans:** 1 plan

Plans:

- [ ] 04-01-PLAN.md — Configure ESLint, formalize Prettier config, validate all quality gates

**Requirements:**

- QUALITY-01: Dead code removed from 17 TypeScript files
- QUALITY-02: All validation commands pass without errors
- QUALITY-03: ESLint configuration added with @docusaurus/eslint-plugin

**Success Criteria:**

1. User can run `npm run typecheck` and see zero TypeScript compilation errors (down from 14)
2. User can run `npm run prettier-lint` and see only expected warnings on existing files (no new formatting violations)
3. User can run `npm run build` and build completes successfully with all data fetching working
4. User can run `npm run serve` and production site works correctly with all features
5. ESLint configuration exists and runs without blocking errors

**Research Notes:** Validation against existing tooling. No new patterns needed.

---

## Progress Tracking

| Phase                          | Status   | Requirements | Success Criteria |
| ------------------------------ | -------- | ------------ | ---------------- |
| 1 - Configuration Foundation   | Pending  | 3/3          | 0/5              |
| 2 - Type System Repair         | Pending  | 4/4          | 0/5              |
| 3 - Component Cleanup          | Pending  | 6/6          | 0/5              |
| 4 - Validation & Quality Gates | Complete | 3/3          | 5/5              |

**Total:** 16/16 requirements mapped across 4 phases

---

## Architectural Rationale

Phases follow strict dependency order from research analysis:

1. **Configuration first** - Nothing builds without correct dependencies and TypeScript config
2. **Type system second** - Components depend on type definitions; fixing components before types wastes effort
3. **Components third** - With types correct, component errors are isolated and fixable
4. **Validation last** - Final integration testing after all blocking issues resolved

This sequence avoids "whack-a-mole" anti-pattern where fixing one error creates another upstream.

---

## Key Risks & Mitigations

| Risk                                | Mitigation                                                            | Phase   |
| ----------------------------------- | --------------------------------------------------------------------- | ------- |
| Breaking GitHub Pages deployment    | Treat deployment config as immutable, document critical sections      | Phase 1 |
| Breaking build-time data fetching   | Document fetch scripts as critical infrastructure, verify JSON output | Phase 1 |
| TypeScript strict mode shock        | Enable flags incrementally, use @ts-expect-error strategically        | Phase 2 |
| Swizzled component maintenance hell | Audit all 3 swizzled components, document rationale or remove         | Phase 3 |
| Committing auto-generated files     | Verify .gitignore, validate files not in git status                   | Phase 1 |

---

_Roadmap created: 2026-01-26_
_Next: `/gsd-plan-phase 1`_
