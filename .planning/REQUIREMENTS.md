# Requirements: Bluefin Documentation Technical Cleanup

**Defined:** 2026-01-26
**Core Value:** The documentation site must be technically sound and maintainable - all validation passing, no dead code, configuration aligned with Docusaurus standards.

## v1 Requirements

Requirements for technical cleanup completion. Each maps to roadmap phases.

### Configuration & Dependencies

- [ ] **CONFIG-01**: React 19 peer dependencies resolved using npm overrides (no --legacy-peer-deps flag required)
- [ ] **CONFIG-02**: docusaurus.config.ts validated against Docusaurus 3.8.1 official best practices
- [ ] **CONFIG-03**: Unused dependencies removed from package.json (audit all 21 dependencies)

### Type System

- [ ] **TYPE-01**: src/types/theme.d.ts FeedData interface fixed to match actual useStoredFeed hook structure
- [ ] **TYPE-02**: Proper TypeScript interfaces created for auto-generated JSON data (feeds, playlists, GitHub profiles/repos)
- [ ] **TYPE-03**: TypeScript strict mode flags enabled incrementally without breaking build
- [ ] **TYPE-04**: All `any` types replaced with proper interfaces or type annotations

### Components

- [ ] **COMP-01**: TypeScript errors in FeedItems.tsx resolved (after type system fixes)
- [ ] **COMP-02**: TypeScript errors in PackageSummary.tsx resolved (after type system fixes)
- [ ] **COMP-03**: TypeScript errors in BlogPostItem/index.tsx resolved (JSX namespace error)
- [ ] **COMP-04**: All components audited for SSR safety (window/localStorage usage properly guarded)
- [ ] **COMP-05**: Three swizzled theme components audited for necessity and documented
- [ ] **COMP-06**: Component isolation tests written for critical components (FeedItems, PackageSummary, GitHubProfileCard, ProjectCard)

### Code Quality

- [ ] **QUALITY-01**: Dead code removed from 17 TypeScript files identified in audit
- [ ] **QUALITY-02**: All validation commands pass without errors (npm run typecheck, npm run prettier-lint, npm run build)
- [ ] **QUALITY-03**: ESLint configuration added with @docusaurus/eslint-plugin

## v2 Requirements

Deferred to future work. Tracked but not in current roadmap.

### Configuration & Dependencies

- **CONFIG-04**: Deployment configuration documented as immutable with warnings
- **CONFIG-05**: Build-time data fetching scripts protected with documentation and warnings

### Scripts

- **SCRIPTS-01**: All 11 scripts documented with header comments (purpose, inputs, outputs, error handling)
- **SCRIPTS-02**: Complex scripts simplified (update-driver-versions.js: 464 lines with brittle HTML scraping)

### Testing

- **TEST-01**: Testing framework installed (Vitest recommended for Docusaurus)
- **TEST-02**: Script unit tests for data fetching logic

### Operational

- **OPS-01**: API rate limit handling improved with retry logic and caching

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                       | Reason                                                   |
| ----------------------------- | -------------------------------------------------------- |
| Content updates (docs/blog)   | Preserving all existing content - technical cleanup only |
| New features or functionality | Pure cleanup project, not feature development            |
| Performance optimization      | Unless blocking correctness, defer to future work        |
| Accessibility improvements    | Not part of technical debt remediation                   |
| Design or styling changes     | Keep visual presentation unchanged                       |
| Framework migration           | Staying with Docusaurus 3.8.1, not switching frameworks  |
| E2E testing                   | Wrong tool for static site - component tests sufficient  |
| Component rewrites            | Fix-in-place safer and faster than rewrites              |
| Backend services              | Static site pattern, no server-side needed               |
| MDX v3 content syntax fixes   | 49 files may have issues but functional, defer to v2     |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| CONFIG-01   | Phase 1 | Pending  |
| CONFIG-02   | Phase 1 | Pending  |
| CONFIG-03   | Phase 1 | Pending  |
| TYPE-01     | Phase 2 | Pending  |
| TYPE-02     | Phase 2 | Pending  |
| TYPE-03     | Phase 2 | Pending  |
| TYPE-04     | Phase 2 | Pending  |
| COMP-01     | Phase 3 | Pending  |
| COMP-02     | Phase 3 | Pending  |
| COMP-03     | Phase 3 | Pending  |
| COMP-04     | Phase 3 | Pending  |
| COMP-05     | Phase 3 | Pending  |
| COMP-06     | Phase 3 | Pending  |
| QUALITY-01  | Phase 4 | Complete |
| QUALITY-02  | Phase 4 | Complete |
| QUALITY-03  | Phase 4 | Complete |

**Coverage:**

- v1 requirements: 16 total
- Mapped to phases: 16/16 ✓
- Unmapped: 0 ✓

---

_Requirements defined: 2026-01-26_
_Last updated: 2026-01-26 after roadmap creation (traceability mappings added)_
