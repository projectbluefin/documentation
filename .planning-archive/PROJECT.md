# Bluefin Documentation Site - Technical Cleanup

## What This Is

A comprehensive technical cleanup and stabilization project for the Bluefin OS documentation site. The site has accumulated technical debt through live prototyping and needs to be cleaned, validated, and aligned with Docusaurus best practices before deciding on future direction. This is an audit-first approach focused on correctness and maintainability, not new features.

## Core Value

The documentation site must be technically sound and maintainable - all validation passing, no dead code, configuration aligned with Docusaurus standards.

## Requirements

### Validated

<!-- Existing capabilities confirmed by codebase analysis -->

- ✓ Docusaurus 3.8.1 static site generation with React 19.0 - existing
- ✓ Build-time data fetching from GitHub releases (Atom feeds) - existing
- ✓ Build-time data fetching from YouTube playlists - existing
- ✓ Build-time data fetching from GitHub user profiles - existing
- ✓ Custom React components for changelog display (FeedItems, PackageSummary) - existing
- ✓ Custom React components for music playlists (MusicPlaylist) - existing
- ✓ Custom React components for GitHub profiles (GitHubProfileCard) - existing
- ✓ Custom React components for project cards (ProjectCard) - existing
- ✓ Custom pages (changelogs, board) - existing
- ✓ Theme swizzling for extended functionality - existing
- ✓ MDX content with embedded React components - existing
- ✓ CSS modules for component styling - existing
- ✓ TypeScript for type safety - existing
- ✓ Prettier for code formatting - existing
- ✓ GitHub Pages deployment via CI/CD - existing

### Active

<!-- Cleanup and stabilization work to be done -->

- [ ] All TypeScript compilation errors resolved
- [ ] All type safety issues fixed (no `any` types without justification)
- [ ] All Prettier formatting checks passing
- [ ] Dead code and unused components removed
- [ ] Unused dependencies removed from package.json
- [ ] Configuration aligned with Docusaurus 3.8.1 best practices
- [ ] All scripts are maintainable and documented
- [ ] SSR hazards properly handled (localStorage, window checks)
- [ ] React 19 peer dependency conflicts resolved or documented
- [ ] Build validation passes without warnings
- [ ] Codebase follows consistent patterns and conventions

### Out of Scope

- Content updates (docs/blog) - preserving all existing content as-is
- New features or functionality - this is purely cleanup
- Performance optimization - unless blocking correctness
- Accessibility improvements - defer to future work
- Design or styling changes - keeping visual presentation unchanged
- Migration to different frameworks - staying with Docusaurus 3.8.1

## Context

**Technical Debt Sources:**

The site has accumulated technical debt through live prototyping and rapid iteration. Known issues from codebase analysis include:

- TypeScript type safety bypassed in multiple components (FeedItems, PackageSummary, BlogPostItem)
- Excessive use of `any` types disabling type checking
- React 19 peer dependency conflicts requiring `--legacy-peer-deps` flag
- Complex unmaintainable scripts (464-line driver update script with brittle HTML scraping)
- SSR hazards with localStorage/window usage requiring careful checks
- GitHub API rate limiting affecting builds
- Build process tolerates TypeScript errors that should be fixed

**Existing Codebase Map:**

Full codebase analysis completed via `/gsd-map-codebase` on 2026-01-26, documenting:

- Technology stack (Docusaurus 3.8.1, React 19, TypeScript 5.9.2)
- Architecture patterns (SSG with build-time data fetching)
- Known concerns and technical debt
- Directory structure and conventions
- Testing gaps (no test framework configured)

**Approach:**

Audit-first methodology:

1. Comprehensive investigation of all issues
2. Document findings with specific recommendations
3. Present full cleanup plan for approval
4. Execute cleanup in phases after approval

## Constraints

- **Preserve Content**: All documentation and blog content must remain unchanged
- **Zero Downtime**: Site must continue deploying successfully throughout cleanup
- **Docusaurus 3.8.1**: Stay on current version, align with its best practices
- **React 19**: Keep React 19 or explicitly decide to downgrade (document rationale)
- **No Visual Changes**: UI appearance must remain identical
- **Git History**: Maintain clean, atomic commits for each cleanup phase

## Key Decisions

| Decision                             | Rationale                                                       | Outcome   |
| ------------------------------------ | --------------------------------------------------------------- | --------- |
| Audit before execution               | Need full picture of technical debt before committing to fixes  | — Pending |
| Code/config only, preserve content   | Focus on technical foundation, content is user-facing and final | — Pending |
| Align with Docusaurus best practices | Ensures long-term maintainability and framework support         | — Pending |

---

_Last updated: 2026-01-26 after initialization_
