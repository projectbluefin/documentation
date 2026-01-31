# Requirements: Weekly Reports Feature (v1.1)

**Milestone:** v1.1  
**Status:** Planning  
**Last Updated:** 2026-01-26

---

## Requirement Categories

- **FOUND** - Foundation & data infrastructure (Phase 1)
- **DISP** - Display components & UI (Phase 2)
- **CONT** - Content management & authoring (Phase 3)
- **NAV** - Navigation & discovery (Phase 4)
- **DOC** - Documentation & polish (Phase 5)

---

## Phase 1: Foundation & Data Collection

### FOUND-01: Weekly Reports Directory Structure

**Must have:**

- Directory `weekly-reports/` created at repository root
- `weekly-reports/authors.yaml` exists with structure matching `blog/authors.yaml`
- Directory is tracked in git (not empty)

**Success:**

```bash
ls -la weekly-reports/
# Expected: authors.yaml and/or .gitkeep
```

### FOUND-02: Data Aggregation Script

**Must have:**

- Script `scripts/fetch-weekly-data.js` exists
- Aggregates GitHub releases from past 7 days (ublue-os/bluefin, ublue-os/bluefin-lts)
- Aggregates GitHub discussions from past 7 days
- Aggregates blog posts from past 7 days
- Calculates contributor stats for the week
- Outputs valid JSON to `static/data/weekly-activity.json`
- Includes error handling and logging
- Uses existing patterns from `fetch-feeds.js`, `fetch-playlists.js`

**Success:**

```bash
node scripts/fetch-weekly-data.js
# Expected: No errors, weekly-activity.json created with valid structure
cat static/data/weekly-activity.json | jq .
# Expected: Valid JSON with keys: releases, discussions, blogPosts, contributors
```

### FOUND-03: Build Pipeline Integration

**Must have:**

- `package.json` has `fetch-weekly-data` script
- `fetch-data` script includes `fetch-weekly-data`
- `static/data/weekly-activity.json` added to `.gitignore`
- Build process (`npm run build`) includes weekly data fetching
- No build errors or warnings related to weekly data

**Success:**

```bash
npm run fetch-weekly-data  # Runs successfully
npm run fetch-data          # Includes weekly data
npm run build               # Completes without errors
```

### FOUND-04: TypeScript Type Definitions

**Must have:**

- File `src/types/weekly-reports.d.ts` exists
- `WeeklyReport` interface defined (title, slug, authors, weekStart, weekEnd, tags, content)
- `WeeklyActivity` interface defined (releases, discussions, blogPosts, contributors)
- `WeeklyMetrics` interface defined (releaseCount, discussionCount, etc.)
- Types match JSON structure from `fetch-weekly-data.js`
- No TypeScript compilation errors

**Success:**

```bash
npm run typecheck
# Expected: No errors related to weekly-reports types
```

---

## Phase 2: Display Components

### DISP-01: WeeklyActivity Component

**Must have:**

- Component `src/components/WeeklyActivity.tsx` exists
- Loads data from `static/data/weekly-activity.json`
- Displays: release count, discussion count, blog post count
- Shows top contributors for the week (with avatars)
- SSR-safe (checks `typeof window !== 'undefined'` if needed)
- Module CSS file `WeeklyActivity.module.css` exists
- Matches existing site aesthetics (similar to `PackageSummary.tsx`)

**Success:**

```tsx
<WeeklyActivity />
// Expected: Renders metrics widget without errors
```

### DISP-02: WeeklyReportCard Component

**Must have:**

- Component `src/components/WeeklyReportCard.tsx` exists
- Props: `{ report: WeeklyReport }`
- Displays: week date range, title, summary excerpt
- Links to full report page
- Shows metadata: author(s), date, tags
- Module CSS file `WeeklyReportCard.module.css` exists
- Mobile-responsive design (min-width 320px)
- Hover state styling

**Success:**

```tsx
<WeeklyReportCard report={sampleReport} />
// Expected: Renders card with all metadata, clickable link
```

### DISP-03: WeeklySummary Component

**Must have:**

- Component `src/components/WeeklySummary.tsx` exists
- Week-over-week metrics comparison
- Visual indicator (up/down arrow or CSS) for changes
- Highlights significant changes (>20% delta)
- Module CSS file `WeeklySummary.module.css` exists
- Optional: Simple CSS-based sparklines

**Success:**

```tsx
<WeeklySummary currentWeek={week1} previousWeek={week2} />
// Expected: Shows comparison metrics with visual indicators
```

### DISP-04: Weekly Reports Listing Page

**Must have:**

- Page `src/pages/weekly-reports.tsx` exists
- Lists all weekly reports in chronological order (newest first)
- Uses `WeeklyReportCard` for each report
- Includes page title and description
- Pagination or "load more" if >20 reports
- Module CSS file `weekly-reports.module.css` exists
- SEO metadata configured

**Success:**

```bash
npm run start
# Navigate to http://localhost:3000/weekly-reports
# Expected: Page renders with report cards, sorted newest first
```

---

## Phase 3: Content Management

### CONT-01: Report Template

**Must have:**

- Template file `weekly-reports/_TEMPLATE.md` exists
- Frontmatter structure defined:
  - `title`: Week N YYYY format
  - `slug`: YYYY-week-NN format
  - `authors`: Array of author IDs
  - `week_start`: YYYY-MM-DD date
  - `week_end`: YYYY-MM-DD date
  - `tags`: Array of strings
- Includes placeholder sections:
  - Summary
  - Releases & Updates
  - Community Highlights
  - Development Activity
  - Looking Ahead
- Inline instructions for authors

**Success:**

```bash
cat weekly-reports/_TEMPLATE.md
# Expected: Valid markdown with frontmatter and sections
```

### CONT-02: Sample Weekly Reports

**Must have:**

- At least 2 sample reports created using real data:
  - `weekly-reports/2026-week-04.md`
  - `weekly-reports/2026-week-03.md`
- Frontmatter correctly formatted
- Date ranges valid (7-day spans)
- Authors exist in `authors.yaml`
- Content sections populated (not just placeholders)
- Tags are relevant

**Success:**

```bash
npm run build
# Navigate to /weekly-reports
# Expected: Both sample reports display correctly
```

### CONT-03: Report Parser/Loader

**Must have:**

- Utility function to load weekly report markdown files
- Parses frontmatter metadata (using existing Docusaurus APIs)
- Sorts reports by `week_start` date (descending)
- Handles missing or malformed reports gracefully (console warning, not crash)
- Returns array of `WeeklyReport` objects

**Success:**

```typescript
const reports = loadWeeklyReports();
// Expected: Array sorted by date, newest first
// Expected: No errors if a report has bad frontmatter
```

### CONT-04: Manual + Auto-Generated Content Integration

**Must have:**

- Weekly report page combines manual markdown content with `WeeklyActivity` widget
- Auto-generated metrics display alongside manual narrative
- Manual content can optionally override auto-generated data
- Clear visual separation between auto and manual sections

**Success:**

```bash
# View a weekly report page
# Expected: Markdown content rendered + WeeklyActivity widget visible
# Expected: No layout conflicts or overlaps
```

---

## Phase 4: Navigation & Discovery

### NAV-01: Main Navigation Link

**Must have:**

- `docusaurus.config.ts` navbar updated
- "Weekly Reports" link added to navbar
- Position: Between "Changelogs" and "Discussions" (or similar prominent position)
- Link points to `/weekly-reports`
- Works on desktop (full navbar) and mobile (hamburger menu)

**Success:**

```bash
npm run start
# Desktop: Click "Weekly Reports" in navbar → navigates to /weekly-reports
# Mobile: Open hamburger menu → "Weekly Reports" visible and clickable
```

### NAV-02: RSS/Atom Feed

**Must have:**

- `docusaurus.config.ts` feed plugin configured for weekly reports
- Feed validates at https://validator.w3.org/feed/
- Feed includes: title, description, link, pubDate for each report
- Feed accessible at `/weekly-reports/rss.xml` or similar
- Feed link added to footer or page

**Success:**

```bash
curl http://localhost:3000/weekly-reports/rss.xml
# Expected: Valid XML feed with report entries
```

### NAV-03: Cross-Links with Existing Content

**Must have:**

- Changelogs page includes "See this week's report" link (when applicable)
- Weekly reports link to relevant changelogs
- Blog posts referenced in weekly reports (if published that week)
- Footer updated with "Weekly Reports" link

**Success:**

```bash
# Navigate to /changelogs → see link to latest weekly report
# Navigate to /weekly-reports/2026-week-04 → see links to changelogs from that week
```

### NAV-04: Search Integration

**Must have:**

- Weekly reports indexed by `@easyops-cn/docusaurus-search-local`
- Search for "week 4" or "weekly report" returns results
- Report metadata (title, tags) searchable
- No search configuration errors

**Success:**

```bash
npm run build
# Use search box: enter "weekly report"
# Expected: Weekly report pages appear in results
```

---

## Phase 5: Polish & Documentation

### DOC-01: User-Facing Documentation

**Must have:**

- Documentation page `docs/weekly-reports.md` exists
- Explains what weekly reports are
- How to access reports
- How to subscribe to RSS feed
- What content is included in reports
- Links to latest report

**Success:**

```bash
cat docs/weekly-reports.md
# Expected: Clear user documentation with examples
```

### DOC-02: Developer Documentation

**Must have:**

- `AGENTS.md` updated with weekly reports section
- Documents directory structure (`weekly-reports/`)
- Documents template usage
- Documents data fetching (`fetch-weekly-data.js`)
- Documents component patterns (WeeklyActivity, WeeklyReportCard)
- Includes validation steps
- Notes about auto-generated files (weekly-activity.json in .gitignore)

**Success:**

```bash
grep -A 20 "Weekly Reports" AGENTS.md
# Expected: Comprehensive developer documentation
```

### DOC-03: Automated Report Generation Helper

**Must have:**

- Optional: GitHub Actions workflow `.github/workflows/generate-weekly-report.yml`
- Runs on schedule (e.g., Friday 5pm UTC)
- Executes `fetch-weekly-data` script
- Creates draft weekly report markdown file
- Opens PR or creates issue with draft content
- Alternative: Shell script `scripts/create-weekly-report.sh` for manual use

**Success:**

```bash
# If workflow exists:
gh workflow run generate-weekly-report.yml
# Expected: Workflow runs successfully, creates artifact/PR

# If shell script exists:
bash scripts/create-weekly-report.sh
# Expected: New draft markdown file created in weekly-reports/
```

### DOC-04: Performance Optimization

**Must have:**

- Build time increase measured and documented
- Build time increase <2 minutes compared to baseline
- `fetch-weekly-data` script includes caching (if possible)
- Images optimized (if any added)
- Components use lazy loading (if heavy content)

**Success:**

```bash
time npm run build
# Before: ~10 seconds
# After: <12 seconds (< 2 minute increase)
```

### DOC-05: Accessibility Audit

**Must have:**

- Keyboard navigation works for all weekly report links
- ARIA labels added to interactive elements
- Color contrast ratio ≥4.5:1 for text
- Images have alt text
- Headings follow semantic hierarchy (h1 → h2 → h3)
- Focus indicators visible

**Success:**

```bash
# Manual test:
# - Tab through weekly reports page → all links reachable
# - Screen reader test → content announced correctly
# - Browser dev tools Lighthouse accessibility score ≥90
```

---

## Success Criteria Summary

**Phase 1 Complete When:**

- ✅ `npm run fetch-weekly-data` works
- ✅ `weekly-activity.json` generated
- ✅ TypeScript types defined
- ✅ Build completes successfully

**Phase 2 Complete When:**

- ✅ All 4 components render without errors
- ✅ TypeScript validation passes
- ✅ Mobile-responsive design verified
- ✅ Aesthetics match existing site

**Phase 3 Complete When:**

- ✅ Template and sample reports created
- ✅ Reports parse and display correctly
- ✅ Manual + auto content integrated
- ✅ Build succeeds with reports

**Phase 4 Complete When:**

- ✅ Navigation link works (desktop + mobile)
- ✅ RSS feed validates
- ✅ Cross-links functional
- ✅ Search returns report results

**Phase 5 Complete When:**

- ✅ User and developer docs complete
- ✅ Build time increase <2 minutes
- ✅ Accessibility audit passed (score ≥90)
- ✅ All validation gates pass

**Milestone Complete When:**

- ✅ All 19 requirements satisfied (FOUND-01 through DOC-05)
- ✅ Weekly reports accessible from navigation
- ✅ At least 2 sample reports published
- ✅ RSS feed operational
- ✅ No TypeScript, ESLint, or build errors
- ✅ Mobile-responsive and accessible

---

_Ready for phase planning with `/gsd-plan-phase 1`_
