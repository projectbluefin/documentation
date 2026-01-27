# Roadmap: Weekly Reports Feature (v1.1)

**Milestone:** v1.1  
**Goal:** Add weekly reports section to aggregate and display project activity  
**Status:** Planning  
**Created:** 2026-01-26

---

## Milestone Overview

**What:** Weekly reports feature for Bluefin documentation site

**Why:** Provide users with digestible weekly summaries of project activities, releases, community discussions, and development progress.

**How:** Hybrid model combining auto-generated metrics with manual narrative content (similar to changelog + blog patterns).

**Success:** Reports accessible from navigation, chronologically sorted, mobile-responsive, passing all validation gates, with RSS feed support.

---

## Phase Breakdown

### Phase 1: Foundation & Data Collection (2 days)

**Goal:** Establish infrastructure for aggregating weekly activity data

**Delivers:**

- Weekly reports directory structure
- Data aggregation script (`fetch-weekly-data.js`)
- TypeScript type definitions
- Build pipeline integration

**Key Files:**

- `weekly-reports/` (new directory)
- `scripts/fetch-weekly-data.js` (new)
- `src/types/weekly-reports.d.ts` (new)
- `package.json` (updated scripts)
- `static/data/weekly-activity.json` (auto-generated, gitignored)

**Dependencies:** None (first phase)

**Success Criteria:**

- `npm run fetch-weekly-data` executes without errors
- `weekly-activity.json` generates with valid structure
- TypeScript compilation passes
- Build completes successfully

---

### Phase 2: Display Components (2 days)

**Goal:** Create React components for displaying weekly reports

**Delivers:**

- WeeklyActivity component (metrics widget)
- WeeklyReportCard component (report preview)
- WeeklySummary component (week-over-week comparison)
- Weekly reports listing page

**Key Files:**

- `src/components/WeeklyActivity.tsx` (new)
- `src/components/WeeklyActivity.module.css` (new)
- `src/components/WeeklyReportCard.tsx` (new)
- `src/components/WeeklyReportCard.module.css` (new)
- `src/components/WeeklySummary.tsx` (new)
- `src/components/WeeklySummary.module.css` (new)
- `src/pages/weekly-reports.tsx` (new)
- `src/pages/weekly-reports.module.css` (new)

**Dependencies:** Phase 1 (types and data structure)

**Success Criteria:**

- Components render without errors
- TypeScript validation passes
- Mobile-responsive design verified
- Matches existing site aesthetics

---

### Phase 3: Content Management (2 days)

**Goal:** Enable manual report creation and content authoring

**Delivers:**

- Report template with frontmatter structure
- Sample weekly reports (2-3 initial reports)
- Report parser/loader utility
- Integration of manual + auto-generated content

**Key Files:**

- `weekly-reports/_TEMPLATE.md` (new)
- `weekly-reports/authors.yaml` (new)
- `weekly-reports/2026-week-04.md` (new, sample)
- `weekly-reports/2026-week-03.md` (new, sample)
- Report loader utility (location TBD during planning)

**Dependencies:** Phase 2 (display components)

**Success Criteria:**

- Template report renders correctly
- Sample reports display properly
- Frontmatter parsed without errors
- Reports sorted chronologically
- Build succeeds with reports

---

### Phase 4: Navigation & Discovery (1 day)

**Goal:** Integrate weekly reports into site navigation and improve discoverability

**Delivers:**

- Main navigation link
- RSS/Atom feed configuration
- Cross-links with existing content
- Search integration verification

**Key Files:**

- `docusaurus.config.ts` (navbar, feed config)
- `sidebars.ts` (optional, if adding to sidebar)
- Changelog pages (cross-link updates)
- Footer (optional feed link)

**Dependencies:** Phase 3 (content must exist)

**Success Criteria:**

- Navigation links work on desktop and mobile
- RSS feed validates successfully
- Cross-links function properly
- Search returns weekly report results

---

### Phase 5: Polish & Documentation (1 day)

**Goal:** Finalize feature with documentation, testing, and quality improvements

**Delivers:**

- User-facing documentation
- Developer documentation
- Automated report generation script (cron helper)
- Performance optimization
- Accessibility audit

**Key Files:**

- `docs/weekly-reports.md` (new, user documentation)
- `AGENTS.md` (updated with weekly reports section)
- `.github/workflows/generate-weekly-report.yml` (optional, automation)
- Component JSDoc comments

**Dependencies:** Phase 4 (full feature deployed)

**Success Criteria:**

- Documentation complete and accurate
- Performance metrics acceptable (<2min build increase)
- Accessibility: keyboard navigation, ARIA labels
- All validation gates pass (typecheck, lint, prettier, build)

---

## Phase Dependencies

```
Phase 1 (Foundation)
    ↓
Phase 2 (Display Components)
    ↓
Phase 3 (Content Management)
    ↓
Phase 4 (Navigation & Discovery)
    ↓
Phase 5 (Polish & Documentation)
```

**Execution:** Sequential (each phase depends on previous)

---

## Timeline Estimate

| Phase | Duration | Cumulative |
| ----- | -------- | ---------- |
| 1     | 2 days   | Day 2      |
| 2     | 2 days   | Day 4      |
| 3     | 2 days   | Day 6      |
| 4     | 1 day    | Day 7      |
| 5     | 1 day    | Day 8      |

**Total:** 8 working days (~2 weeks with normal pace)

---

## Risks & Mitigations

**Technical Risks:**

- GitHub API rate limits → Use GITHUB_TOKEN env var
- Build time increase → Cache weekly-activity.json, implement delta fetching
- TypeScript errors in components → Follow existing component patterns strictly

**Content Risks:**

- Report staleness → Document clear authoring cadence (Friday generation)
- Quality inconsistency → Provide detailed template with examples

**UX Risks:**

- Discoverability → Add to prominent navigation position
- Mobile experience → Mobile-first design approach

---

## Success Metrics

**Launch Metrics (Week 1):**

- Weekly reports page receives >500 visitors
- RSS feed has >50 subscribers
- Zero TypeScript/build errors

**Operational Metrics (Ongoing):**

- Build time increase <2 minutes
- Script success rate >95%
- Mobile bounce rate <40%

**Content Metrics (Month 1):**

- 1 report published per week (4 total)
- Average report length >500 words
- Cross-link engagement >100 clicks/week

---

## Out of Scope (Future Enhancements)

- Email newsletter integration
- Interactive charts/visualizations (beyond simple CSS)
- Report comments/discussion threads
- Automated report generation from AI (manual curation only for v1.1)
- Historical data backfill (only forward-looking reports)

---

_Ready for phase planning with `/gsd-plan-phase 1`_
