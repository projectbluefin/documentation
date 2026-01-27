# Roadmap: Biweekly Reports Feature (v1.1)

**Milestone:** v1.1  
**Goal:** Add automated biweekly reports from GitHub Project Board  
**Status:** In Progress - Phase 1 Complete  
**Created:** 2026-01-26  
**Updated:** 2026-01-27

---

## Milestone Overview

**What:** Automated biweekly status reports from GitHub Project Board #2

**Why:** Provide community with transparent, data-driven summaries of completed work, contributors, and project momentum.

**How:** 100% automated system that fetches project board data, categorizes by labels, formats as blog posts, and publishes every other Monday.

**Success:** Reports published biweekly at `/reports`, properly categorized, mobile-responsive, with RSS feed support. Zero manual intervention required.

---

## Phase Breakdown

### Phase 1: Automated Report System ✅ COMPLETE

**Goal:** Build complete end-to-end automated report generation and publishing system  
**Status:** Complete (2026-01-27)  
**Verified:** 15/15 must-haves passed

**Delivers:**

- GitHub Project Board data fetching (GraphQL API integration)
- Label categorization and badge formatting
- Report markdown generation (matching issue #166 format)
- Separate Docusaurus blog instance at `/reports`
- Biweekly automation (GitHub Actions workflow)
- Historical contributor tracking
- Bot filtering and aggregation

**Key Files:**

- `scripts/generate-biweekly-report.js` (new) - Main report generator
- `scripts/fetch-board-data.js` (new) - Project board API integration
- `scripts/utils/label-mapping.js` (new) - Static label color mapping
- `scripts/utils/contributor-history.js` (new) - Track new contributors
- `reports/` (new directory) - Report blog posts
- `docusaurus.config.ts` (modified) - Add second blog instance
- `.github/workflows/biweekly-report.yml` (new) - Automation workflow
- `static/data/contributor-history.json` (auto-generated, gitignored)

**Dependencies:** None (first phase)

**Success Criteria:**

- Script fetches project board data successfully
- Report markdown matches issue #166 format exactly
- Labels categorized correctly with colored badges
- Bots separated into aggregate section
- New contributors identified and highlighted
- `/reports` blog instance renders correctly
- TypeScript compilation passes
- Build completes successfully
- Manual test: generate one report and verify all sections

---

### Phase 2: Navigation & Discovery (1 day)

**Goal:** Integrate reports into site navigation and enable discoverability  
**Status:** Planned  
**Plans:** 2 plans (1 wave)

**Delivers:**

- Main navigation link to `/reports` ✅ (done in Phase 1)
- RSS feed configuration (automatic from Docusaurus) ✅ (done in Phase 1)
- Cross-links with changelogs and blog
- Search integration verification
- Mobile navigation testing

**Key Files:**

- `src/pages/changelogs.tsx` (cross-link intro)
- `scripts/lib/markdown-generator.js` (footer template)
- `docusaurus.config.ts` (navbar order verification)
- `reports/` (test report generation)

**Dependencies:** Phase 1 (reports must exist) ✅ COMPLETE

Plans:

- [ ] 02-01-PLAN.md — Cross-links & content integration (Wave 1)
- [ ] 02-02-PLAN.md — Validation & testing (Wave 2)

**Success Criteria:**

- "Reports" link visible in desktop and mobile navigation ✅ (done in Phase 1)
- RSS feed validates at `/reports/rss.xml` ✅ (done in Phase 1)
- Cross-links function correctly
- Search returns report results
- Mobile navigation works correctly

---

### Phase 3: Documentation & Refinement (1 day)

**Goal:** Document the system for maintainers and refine automation  
**Status:** Planned  
**Plans:** 2 plans (2 waves)

**Delivers:**

- Developer documentation in AGENTS.md
- User-facing documentation explaining reports
- Troubleshooting guide for automation failures
- Performance validation
- Error handling improvements

**Key Files:**

- `AGENTS.md` (updated with reports section)
- `docs/reports.md` (new, user documentation)
- `.github/workflows/biweekly-reports.yml` (refined error handling)
- `scripts/generate-report.js` (improved logging)
- `scripts/lib/graphql-queries.js` (retry logic, rate limit detection)

**Dependencies:** Phase 2 (full feature deployed)

Plans:

- [ ] 03-01-PLAN.md — Developer docs & error handling (Wave 1)
- [ ] 03-02-PLAN.md — User docs & performance validation (Wave 2)

**Success Criteria:**

- AGENTS.md has complete automation documentation
- User docs explain what reports show and where to find them
- Error handling tested (API failures, rate limits, missing data)
- Build time increase measured and acceptable
- All validation gates pass (typecheck, lint, prettier, build)

---

## Phase Dependencies

```
Phase 1 (Automated Report System)
    ↓
Phase 2 (Navigation & Discovery)
    ↓
Phase 3 (Documentation & Refinement)
```

**Execution:** Sequential (each phase depends on previous)

---

## Timeline Estimate

| Phase | Duration | Cumulative |
| ----- | -------- | ---------- |
| 1     | 3-4 days | Day 4      |
| 2     | 1 day    | Day 5      |
| 3     | 1 day    | Day 6      |

**Total:** 5-6 working days (~1 week with normal pace)

---

## Technical Details

### Data Source

- **GitHub Project Board:** `https://github.com/orgs/projectbluefin/projects/2`
- **Tracked Repositories:** projectbluefin/common, projectbluefin/dakota, ublue-os/bluefin, ublue-os/bluefin-lts
- **Filtering:** Items moved to "Done" + large "In Progress" items (size:M+)
- **Time Window:** 2-week periods ending Sunday before publication Monday

### Report Format

- **Reference:** https://github.com/projectbluefin/common/issues/166
- **Sections:** Summary, Categorized Work, Bot Activity, Contributors
- **Categories:** Based on projectbluefin/common label conventions (area/_, kind/_)
- **Badges:** Shields.io format with static color mapping
- **Bot Handling:** Aggregate table + collapsible details
- **New Contributors:** Tracked across all 4 repos

### Automation

- **Schedule:** Every other Monday (biweekly)
- **Trigger:** GitHub Actions cron schedule
- **Process:** Fetch → Categorize → Generate → Commit → Auto-merge
- **Error Handling:** Graceful failures with maintainer alerts

---

## Risks & Mitigations

**Technical Risks:**

- GitHub GraphQL API rate limits → Use GITHUB_TOKEN, implement request throttling
- Project board API changes → Pin GraphQL schema version, add validation
- Build time increase → Monitor performance, optimize if needed
- Label mapping drift → Document update process, validate against common repo

**Operational Risks:**

- Report generation failures → Comprehensive error handling, alert on failures
- Incomplete data → Fallback to partial reports with warning
- Timezone issues → Use consistent UTC calculation for biweekly periods

**UX Risks:**

- Discoverability → Prominent navigation link, cross-links from blog/changelogs
- Mobile experience → Test on mobile devices, ensure responsive layout
- Empty reports → Handle quiet periods gracefully (show "quiet week" message)

---

## Success Metrics

**Launch Metrics (Week 1):**

- First automated report publishes successfully
- All sections render correctly (summary, categories, bots, contributors)
- RSS feed validates
- Zero TypeScript/build errors

**Operational Metrics (First Month):**

- 2 biweekly reports published automatically (100% success rate)
- Build time increase <1 minute
- Zero manual interventions required
- New contributors correctly identified

**Content Metrics (Month 1):**

- Reports page receives >100 visitors
- RSS feed has >10 subscribers
- Cross-link engagement from changelogs/blog

---

## Out of Scope (Future Enhancements)

- Manual narrative additions (reports are 100% automated)
- Interactive charts/visualizations
- Report comments/discussion threads
- Email newsletter integration
- Historical data backfill (forward-looking only)
- Per-contributor statistics page
- Trend analysis across reports

---

## Changes from Original Plan

**Original (v1.0 of planning):**

- 5 phases with hybrid manual+automated approach
- Custom React components for display
- Manual narrative writing
- Weekly cadence

**Updated (v1.1 actual):**

- 3 phases with 100% automation
- Standard Docusaurus blog (no custom components needed)
- Zero manual intervention
- Biweekly cadence
- Focus on project board data (not raw repo activity)

The scope simplified significantly because reports are fully automated from a single data source (project board), not a hybrid system requiring manual curation.

---

_Ready for phase planning with `/gsd-plan-phase 1`_
