# Milestone v1.1: Weekly Reports Feature

## Overview

**Version:** v1.1  
**Name:** Weekly Reports Feature  
**Status:** Planning  
**Created:** 2026-01-26

### Goal

Add a weekly reports section to the Bluefin documentation site that aggregates and displays project activity, updates, and metrics in a user-friendly weekly format. This feature will provide users with a digestible weekly summary of Bluefin project activities, releases, community discussions, and development progress.

### Context

- **Previous Milestone:** v1.0 technical cleanup (completed)
- **Documentation Platform:** Docusaurus 3.9.2
- **Current Features:**
  - Documentation pages (28 files)
  - Blog posts (21 files with author attribution)
  - Changelogs (auto-generated release feeds from GitHub)
  - Music playlists (YouTube metadata fetched at build time)
  - Donations pages (GitHub profiles and project stats)
- **Architecture:**
  - TypeScript + React 19
  - Build-time data fetching via npm scripts
  - CI/CD validation gates (typecheck, lint, prettier)
  - Static site generation with GitHub Pages deployment

### Success Criteria

1. ✅ Weekly reports accessible from main navigation
2. ✅ Reports display in chronological order (newest first)
3. ✅ Each report shows: week date range, title, content, metadata
4. ✅ Build process includes report generation/validation
5. ✅ Mobile-responsive design matching existing site aesthetics
6. ✅ No TypeScript errors, passes all validation gates
7. ✅ RSS/Atom feed available for weekly reports
8. ✅ Integration with existing content (changelogs, blog posts, discussions)

---

## Domain Research

### Existing Patterns Analysis

#### 1. Blog Posts Pattern

- **Location:** `blog/` directory
- **Format:** Markdown files with frontmatter
- **Features:**
  - Author attribution via `blog/authors.yaml`
  - Tags/categories support
  - RSS feed generation
  - Slug customization
  - Built-in Docusaurus blog plugin
- **Frontmatter Example:**
  ```yaml
  ---
  title: "Post Title"
  slug: 2025-10-28-slug
  authors: castrojo
  tags: [announcements, homebrew, lts]
  ---
  ```

#### 2. Changelog Feeds Pattern

- **Location:** `src/pages/changelogs.tsx` + `src/components/CommunityFeeds.tsx`
- **Data Source:** GitHub release feeds (Atom format)
- **Build Script:** `scripts/fetch-feeds.js`
- **Features:**
  - Auto-fetches external data at build time
  - Stores as JSON in `static/feeds/`
  - Custom React components for display
  - Package version tracking (via `PackageSummary.tsx`)
  - Version change detection (old → new)
- **Data Flow:**
  1. `npm run fetch-feeds` → fetches GitHub Atom feeds
  2. Parses XML to JSON
  3. Stores in `static/feeds/*.json`
  4. React component loads data via `useStoredFeed` hook

#### 3. Music Playlists Pattern

- **Location:** `docs/music.md` + `src/components/MusicPlaylist.tsx`
- **Data Source:** YouTube playlist metadata
- **Build Script:** `scripts/fetch-playlists.js`
- **Features:**
  - Fetches playlist metadata at build time
  - Stores as JSON in `static/data/playlist-metadata.json`
  - Custom component displays playlists with thumbnails
  - 1:1 aspect ratio thumbnails

#### 4. GitHub Profiles Pattern

- **Location:** `docs/donations/contributors.mdx` + `src/components/GitHubProfileCard.tsx`
- **Data Source:** GitHub API (user profiles)
- **Build Script:** `scripts/fetch-github-profiles.js`
- **Features:**
  - Fetches profile data at build time
  - Stores as JSON in `static/data/github-profiles.json`
  - Displays name, bio, avatar, company, location, social links

### Content Aggregation Sources

**Available data sources for weekly reports:**

1. **GitHub Releases** (already fetched)
   - Source: `https://github.com/ublue-os/bluefin/releases.atom`
   - Source: `https://github.com/ublue-os/bluefin-lts/releases.atom`
   - Data: Release titles, dates, changelogs, package versions

2. **GitHub Discussions** (already configured in `docusaurus.config.ts`)
   - Source: `https://github.com/ublue-os/bluefin/discussions.atom`
   - Data: Community discussions, questions, feedback

3. **Blog Posts** (already available)
   - Source: Built-in Docusaurus blog data
   - Data: Announcements, feature updates, community news

4. **GitHub Issues/PRs** (new data source)
   - Potential Source: `https://github.com/ublue-os/bluefin/issues.atom`
   - Potential Source: GitHub GraphQL API for closed issues/merged PRs
   - Data: Development activity, bug fixes, feature additions

5. **Contributors** (already fetched)
   - Source: `scripts/fetch-contributors.js`
   - Data: Weekly contributor activity

### Technical Architecture

**Recommended approach:** Hybrid model combining auto-generated and manual content

```
weekly-reports/
├── 2026-week-04.md          # Manual/template report for week 4
├── 2026-week-03.md          # Manual/template report for week 3
└── authors.yaml             # Author attribution

scripts/
└── fetch-weekly-data.js     # Aggregates data for the current week

static/data/
└── weekly-activity.json     # Auto-generated weekly activity data

src/
├── pages/
│   └── weekly-reports.tsx   # Weekly reports listing page
├── components/
│   ├── WeeklyReportCard.tsx # Individual report display
│   ├── WeeklyActivity.tsx   # Auto-generated activity widget
│   └── WeeklySummary.tsx    # Week-over-week comparison
```

---

## Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish basic infrastructure and data collection

#### Requirements

1. **Create weekly reports directory structure**
   - [ ] Create `weekly-reports/` directory
   - [ ] Create `weekly-reports/authors.yaml` (copy structure from `blog/authors.yaml`)
   - [ ] Add `.gitkeep` or initial report to establish directory

2. **Implement data aggregation script**
   - [ ] Create `scripts/fetch-weekly-data.js`
   - [ ] Aggregate GitHub releases from the past 7 days
   - [ ] Aggregate discussions activity from the past 7 days
   - [ ] Aggregate blog posts from the past 7 days
   - [ ] Calculate contributor stats for the week
   - [ ] Output JSON to `static/data/weekly-activity.json`
   - [ ] Add error handling and logging

3. **Update build pipeline**
   - [ ] Add `fetch-weekly-data` script to `package.json`
   - [ ] Update `fetch-data` script to include `fetch-weekly-data`
   - [ ] Add `weekly-activity.json` to `.gitignore` (build-time generated)
   - [ ] Test build process with new script

4. **TypeScript type definitions**
   - [ ] Create types in `src/types/weekly-reports.d.ts`
   - [ ] Define `WeeklyReport` interface
   - [ ] Define `WeeklyActivity` interface
   - [ ] Define `WeeklyMetrics` interface
   - [ ] Add to TypeScript validation

#### Validation

- [ ] `npm run fetch-weekly-data` executes without errors
- [ ] `weekly-activity.json` generates with valid data
- [ ] `npm run typecheck` passes with new types
- [ ] `npm run build` completes successfully

---

### Phase 2: Display Components (Week 2-3)

**Goal:** Create React components for displaying weekly reports

#### Requirements

1. **Create WeeklyActivity component**
   - [ ] Create `src/components/WeeklyActivity.tsx`
   - [ ] Load data from `static/data/weekly-activity.json`
   - [ ] Display release count, discussion count, blog posts
   - [ ] Show top contributors for the week
   - [ ] Create `src/components/WeeklyActivity.module.css`
   - [ ] Match existing site aesthetics (similar to `PackageSummary.tsx`)

2. **Create WeeklyReportCard component**
   - [ ] Create `src/components/WeeklyReportCard.tsx`
   - [ ] Display week date range
   - [ ] Show report title and summary
   - [ ] Link to full report
   - [ ] Display metadata (author, date, tags)
   - [ ] Create `src/components/WeeklyReportCard.module.css`
   - [ ] Mobile-responsive design

3. **Create WeeklySummary component**
   - [ ] Create `src/components/WeeklySummary.tsx`
   - [ ] Week-over-week metrics comparison
   - [ ] Sparkline charts (optional, using simple CSS)
   - [ ] Highlight significant changes
   - [ ] Create `src/components/WeeklySummary.module.css`

4. **Create weekly reports listing page**
   - [ ] Create `src/pages/weekly-reports.tsx`
   - [ ] List all weekly reports in chronological order
   - [ ] Integrate `WeeklyReportCard` for each report
   - [ ] Add pagination or "load more" if needed
   - [ ] Create `src/pages/weekly-reports.module.css`

#### Validation

- [ ] Components render without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run prettier-lint` passes
- [ ] Mobile-responsive design verified
- [ ] Matches existing site aesthetics

---

### Phase 3: Content Management (Week 3-4)

**Goal:** Enable manual report creation and content authoring

#### Requirements

1. **Create report template**
   - [ ] Create `weekly-reports/_TEMPLATE.md`
   - [ ] Define frontmatter structure:
     ```yaml
     ---
     title: "Week N YYYY: Report Title"
     slug: YYYY-week-NN
     authors: [author1, author2]
     week_start: YYYY-MM-DD
     week_end: YYYY-MM-DD
     tags: [releases, discussions, development]
     ---
     ```
   - [ ] Include placeholder sections:
     - Summary
     - Releases & Updates
     - Community Highlights
     - Development Activity
     - Looking Ahead

2. **Create initial weekly reports**
   - [ ] Generate 2-3 sample reports using real data
   - [ ] Test frontmatter parsing
   - [ ] Verify date range calculations
   - [ ] Test author attribution

3. **Implement report parser/loader**
   - [ ] Create utility to load weekly report markdown files
   - [ ] Parse frontmatter metadata
   - [ ] Sort reports by date (newest first)
   - [ ] Handle missing or malformed reports gracefully

4. **Integrate manual and auto-generated content**
   - [ ] Combine manual report content with `WeeklyActivity` widget
   - [ ] Show auto-generated metrics alongside manual narrative
   - [ ] Allow manual overrides of auto-generated data

#### Validation

- [ ] Template report renders correctly
- [ ] Sample reports display properly
- [ ] Frontmatter parsed without errors
- [ ] Reports sorted correctly by date
- [ ] `npm run build` succeeds

---

### Phase 4: Navigation & Discovery (Week 4-5)

**Goal:** Integrate weekly reports into site navigation and improve discoverability

#### Requirements

1. **Add to main navigation**
   - [ ] Update `docusaurus.config.ts` navbar configuration
   - [ ] Add "Weekly Reports" link to navbar
   - [ ] Position: between "Changelogs" and "Discussions"
   - [ ] Test navigation on desktop and mobile

2. **Update sidebar (if applicable)**
   - [ ] Update `sidebars.ts` if reports should appear in docs sidebar
   - [ ] Decide: standalone page or part of "Project Information"?
   - [ ] Create category/link structure

3. **Create RSS/Atom feed**
   - [ ] Configure Docusaurus to generate feed for weekly reports
   - [ ] Test feed validation (https://validator.w3.org/feed/)
   - [ ] Add feed link to footer
   - [ ] Update `docusaurus.config.ts` feed options

4. **Cross-link with existing content**
   - [ ] Add "See weekly report" links to changelogs
   - [ ] Link relevant blog posts from weekly reports
   - [ ] Add "Latest weekly report" widget to homepage (optional)
   - [ ] Update footer links section

5. **Add search integration**
   - [ ] Verify weekly reports are indexed by `@easyops-cn/docusaurus-search-local`
   - [ ] Test search functionality
   - [ ] Add appropriate metadata for search

#### Validation

- [ ] Navigation links work correctly
- [ ] RSS feed validates
- [ ] Cross-links function properly
- [ ] Search returns weekly report results
- [ ] Mobile navigation works

---

### Phase 5: Polish & Documentation (Week 5-6)

**Goal:** Finalize feature with documentation, testing, and quality improvements

#### Requirements

1. **Write contributor documentation**
   - [ ] Update `AGENTS.md` with weekly reports guidelines
   - [ ] Document report creation process
   - [ ] Document data fetching scripts
   - [ ] Include troubleshooting section
   - [ ] Add examples and best practices

2. **Create user documentation**
   - [ ] Add weekly reports section to main docs (if needed)
   - [ ] Explain what weekly reports contain
   - [ ] How to subscribe via RSS
   - [ ] Link to report archive

3. **Accessibility audit**
   - [ ] Test with screen readers
   - [ ] Verify semantic HTML structure
   - [ ] Check color contrast ratios
   - [ ] Add ARIA labels where needed
   - [ ] Test keyboard navigation

4. **Performance optimization**
   - [ ] Analyze bundle size impact
   - [ ] Optimize JSON data loading
   - [ ] Implement code splitting if needed
   - [ ] Test build time impact

5. **Final validation**
   - [ ] Run full validation suite:
     - `npm run typecheck`
     - `npm run prettier-lint`
     - `npm run build`
   - [ ] Manual testing on dev server
   - [ ] Cross-browser testing
   - [ ] Mobile device testing

6. **Create announcement blog post**
   - [ ] Write blog post announcing weekly reports feature
   - [ ] Include screenshots/examples
   - [ ] Explain benefits to community
   - [ ] Publish on release day

#### Validation

- [ ] All validation gates pass
- [ ] Documentation complete and accurate
- [ ] Accessibility standards met (WCAG 2.1 AA)
- [ ] Performance benchmarks acceptable
- [ ] Ready for production deployment

---

## Technical Specifications

### Data Structures

#### WeeklyActivity Interface

```typescript
interface WeeklyActivity {
  week_start: string; // ISO 8601 date
  week_end: string; // ISO 8601 date
  week_number: number; // Week of year
  year: number; // Year
  releases: {
    bluefin: number; // Count
    bluefin_lts: number; // Count
    items: FeedItem[]; // Release details
  };
  discussions: {
    new: number; // New discussions count
    active: number; // Active discussions count
    items: FeedItem[]; // Discussion details
  };
  blog_posts: {
    count: number;
    items: BlogPost[]; // Blog post details
  };
  contributors: {
    total: number; // Unique contributors
    new: number; // First-time contributors
    top: Contributor[]; // Top 5 contributors
  };
  metrics: {
    commits: number;
    prs_merged: number;
    issues_closed: number;
  };
}
```

#### WeeklyReport Interface

```typescript
interface WeeklyReport {
  title: string;
  slug: string;
  authors: string[];
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  tags: string[];
  content: string; // Markdown content
  summary?: string; // Optional short summary
  published_date: string;
}
```

### File Naming Convention

**Weekly report files:** `YYYY-week-NN.md`

- Example: `2026-week-04.md` (4th week of 2026)
- ISO week numbering (ISO 8601)
- Zero-padded week numbers (01-53)

### API/Data Fetching

**Build-time data fetching sequence:**

1. `fetch-feeds` → GitHub release feeds
2. `fetch-playlists` → YouTube metadata
3. `fetch-github-profiles` → Contributor profiles
4. `fetch-github-repos` → Repository stats
5. `fetch-contributors` → Contributor activity
6. `fetch-weekly-data` → **NEW** - Aggregate weekly activity

**Weekly data script responsibilities:**

- Query GitHub API for releases in date range
- Parse discussions feed for activity
- Scan blog directory for posts in date range
- Calculate contributor metrics
- Generate JSON output

### Component Architecture

```
WeeklyReportsPage
├── PageHeader (title, description)
├── WeeklySummary (current week metrics)
├── WeeklyReportList
│   └── WeeklyReportCard[] (sorted by date)
│       ├── Title & Date Range
│       ├── Author Attribution
│       ├── Tags
│       ├── Summary Excerpt
│       └── WeeklyActivity (inline metrics)
└── Pagination (if needed)
```

### Styling Guidelines

- **Follow existing patterns:**
  - Use CSS modules (`.module.css`)
  - Match color scheme and typography
  - Consistent spacing (Docusaurus variables)
  - Responsive breakpoints

- **Component-specific styles:**
  - `WeeklyReportCard.module.css` - card layout, hover effects
  - `WeeklyActivity.module.css` - metrics grid, badges
  - `WeeklySummary.module.css` - comparison charts, highlights

- **Mobile-first responsive design:**
  - Stack cards vertically on mobile
  - Hide non-essential metrics on small screens
  - Touch-friendly tap targets (minimum 44x44px)

---

## Dependencies

### New Dependencies

- **None required** (use existing dependencies)

### Modified Files (Estimated)

- `package.json` (add script)
- `docusaurus.config.ts` (navbar, feed config)
- `sidebars.ts` (optional, if adding to sidebar)
- `.gitignore` (add `weekly-activity.json`)
- `AGENTS.md` (contributor documentation)

### New Files (Estimated)

- `scripts/fetch-weekly-data.js` (1 file)
- `weekly-reports/` directory (1+ files)
  - `authors.yaml`
  - `_TEMPLATE.md`
  - `2026-week-04.md` (sample)
- `src/types/weekly-reports.d.ts` (1 file)
- `src/pages/weekly-reports.tsx` (1 file)
- `src/components/` (3-4 files)
  - `WeeklyReportCard.tsx`
  - `WeeklyActivity.tsx`
  - `WeeklySummary.tsx`
  - Corresponding `.module.css` files (3-4 files)

**Total new files:** ~15-20 files

---

## Testing Strategy

### Unit Testing

- Not required (Docusaurus doesn't have Jest configured)
- Manual testing sufficient for this milestone

### Integration Testing

1. **Build validation:**
   - Run full build with new scripts
   - Verify all data files generate
   - Check for TypeScript errors

2. **Component testing:**
   - Start dev server
   - Navigate to weekly reports page
   - Test all interactive elements
   - Verify data displays correctly

3. **Cross-browser testing:**
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

4. **Mobile testing:**
   - iOS Safari
   - Android Chrome
   - Responsive design tools

### Regression Testing

- [ ] Existing pages still render correctly
- [ ] Blog posts unaffected
- [ ] Changelogs work as before
- [ ] Navigation remains functional
- [ ] Build time acceptable (<5 min increase)

---

## Risk Assessment

### Technical Risks

| Risk                                | Impact | Likelihood | Mitigation                                          |
| ----------------------------------- | ------ | ---------- | --------------------------------------------------- |
| Data fetching scripts timeout       | High   | Medium     | Add retry logic, increase timeouts, cache responses |
| Build time increases significantly  | Medium | Low        | Optimize data aggregation, parallelize fetches      |
| TypeScript errors in new components | Medium | Low        | Incremental development, frequent validation        |
| GitHub API rate limits              | Medium | Medium     | Use `GITHUB_TOKEN`, implement caching               |
| RSS feed breaks                     | Low    | Low        | Validate feed before deployment                     |

### Content Risks

| Risk                         | Impact | Likelihood | Mitigation                                      |
| ---------------------------- | ------ | ---------- | ----------------------------------------------- |
| No one writes weekly reports | High   | Medium     | Auto-generate basic reports, make template easy |
| Reports become stale         | Medium | Medium     | Automate as much as possible, low maintenance   |
| Inconsistent report quality  | Low    | Medium     | Provide clear guidelines, review process        |

### User Experience Risks

| Risk                            | Impact | Likelihood | Mitigation                                  |
| ------------------------------- | ------ | ---------- | ------------------------------------------- |
| Users don't find weekly reports | Medium | Medium     | Prominent navigation, RSS feed, cross-links |
| Mobile experience poor          | Medium | Low        | Mobile-first design, thorough testing       |
| Information overload            | Low    | Medium     | Clear hierarchy, scannable content          |

---

## Success Metrics

### Launch Metrics (First Month)

- [ ] Weekly reports page receives >500 unique visitors
- [ ] RSS feed has >50 subscribers
- [ ] Average time on page >2 minutes
- [ ] Mobile bounce rate <60%

### Operational Metrics

- [ ] Build time increase <2 minutes
- [ ] Data fetching script success rate >95%
- [ ] Zero TypeScript errors
- [ ] Zero accessibility violations

### Content Metrics

- [ ] At least 1 weekly report published per week
- [ ] Reports include both auto-generated and manual content
- [ ] Average report length >500 words

---

## Future Enhancements (Post-v1.1)

### v1.2 Candidates

- **Interactive metrics dashboard:** Charts/graphs for weekly trends
- **Email digest:** Optional email subscription for weekly reports
- **Community contributions:** Allow community-submitted highlights
- **GitHub integration:** Direct links to PRs/issues mentioned in reports

### v1.3+ Ideas

- **Annual report generation:** Automatically compile yearly summary
- **Custom date range filtering:** View reports by date range
- **Tag-based filtering:** Filter reports by topic (releases, development, etc.)
- **Search within reports:** Dedicated search for weekly report content

---

## Sign-off

### Stakeholders

- **Product Owner:** [To be assigned]
- **Technical Lead:** [To be assigned]
- **Documentation Lead:** [To be assigned]

### Approval

- [ ] Requirements reviewed and approved
- [ ] Technical approach validated
- [ ] Resource allocation confirmed
- [ ] Timeline agreed upon

---

## Appendix

### Related Documentation

- [Docusaurus Blog Plugin Docs](https://docusaurus.io/docs/blog)
- [Docusaurus Pages Documentation](https://docusaurus.io/docs/creating-pages)
- [GitHub Atom Feeds](https://docs.github.com/en/rest/activity/feeds)
- [ISO 8601 Week Numbering](https://en.wikipedia.org/wiki/ISO_week_date)

### Existing Code References

- `blog/` - Blog post structure
- `src/pages/changelogs.tsx:1` - Changelog page implementation
- `src/components/CommunityFeeds.tsx:1` - Feed display component
- `src/components/FeedItems.tsx:1` - Feed item rendering
- `src/components/PackageSummary.tsx:1` - Summary card pattern
- `scripts/fetch-feeds.js:1` - Data fetching pattern
- `package.json:5-26` - Build script structure

### Questions & Decisions Log

**Q1:** Should weekly reports be a Docusaurus plugin or custom pages?  
**A1:** Custom pages - more flexibility, follows existing patterns (changelogs).

**Q2:** Auto-generate reports or require manual authoring?  
**A2:** Hybrid approach - auto-generate data, manual narrative.

**Q3:** Where to store weekly activity data?  
**A3:** `static/data/weekly-activity.json` (build-time generated, like other data).

**Q4:** How to handle weeks with no activity?  
**A4:** Auto-generate basic report, flag as "quiet week", option to skip/hide.

**Q5:** Should weekly reports replace changelogs?  
**A5:** No - complementary content. Changelogs = release details, Weekly = broader context.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Next Review:** Start of Phase 1
