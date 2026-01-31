# Quick Task 006: Add Build Health Metrics to Monthly Reports

**Created:** 2026-01-29  
**Mode:** Quick Task  
**Complexity:** Medium (3 tasks)

## Goal

Add a "Build Health" section to monthly reports showing CI/CD success rates, statistics, and month-over-month trends for all Bluefin image build workflows.

## Context

Monthly reports currently show project activity (PRs, contributors, bot activity) but lack visibility into build system health. Adding build metrics provides operational transparency and helps identify reliability trends.

## Tasks

### Task 1: Implement Build Metrics Fetcher

**File:** `scripts/lib/build-metrics.mjs`

Create module to fetch and calculate build health metrics from GitHub Actions API.

**Requirements:**

- Query workflow runs for date range (current month + previous month)
- Track 10 build workflows:
  - ublue-os/bluefin: Stable (125772764), GTS (125772761), Beta (125772763), Latest (146755607)
  - ublue-os/bluefin-lts: LTS (141565346), LTS HWE (177905245), DX (141565344), GDX (141733516), LTS HWE DX (141567601), DX LTS HWE (141569417)
- **Count workflow runs, NOT individual jobs** (each run = 1 build event)
- Calculate: success rate, total builds, failures, MoM change
- Calculate statistics: total builds, most active, perfect streak, 100% club, avg duration
- Return structured data for markdown generation

**API Endpoints:**

```
GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs?created=>{start_date}&created=<{end_date}&per_page=100
```

**Data Structure:**

```javascript
{
  images: [
    {
      name: "Bluefin Stable",
      repo: "ublue-os/bluefin",
      workflowId: 125772764,
      successRate: 98.5,
      totalBuilds: 67,
      failures: 1,
      momChange: +2.3,
      avgDuration: 1845
    },
    // ... more workflows
  ],
  stats: {
    totalBuilds: 423,
    mostActive: "Bluefin Stable",
    perfectStreak: 12,
    perfectImages: ["Bluefin GTS", "Bluefin LTS"],
    avgDuration: 1923
  },
  previousMonth: { /* same structure */ }
}
```

**Error Handling:**

- Retry with exponential backoff (like existing API calls)
- Return null if API unavailable (section will be skipped)
- Log warnings for rate limiting

**Acceptance:**

- Correctly counts workflow runs (not jobs)
- Excludes non-build workflows (e.g., "Generate Release")
- Handles first report (no previous month) gracefully
- Respects rate limits

---

### Task 2: Generate Build Health Markdown Section

**File:** `scripts/lib/markdown-generator.mjs`

Add function to generate Build Health section in reports.

**Function Signature:**

```javascript
export function generateBuildHealthSection(buildMetrics, startDate, endDate)
```

**Requirements:**

- Add after `generateBotActivitySection()` in report generation flow
- Section title: `## Build Health`
- Table with columns: Image, Success Rate, Builds, MoM Change
- MoM badges: Shields.io with green/red colors (accessible)
- First report: Show "_Baseline_" in italic when no previous data
- Statistics panel with icons: 📊 📈 🎖️ 💯 ⏱️
- Handle missing data gracefully (show "N/A" or skip)

**Output Format:**

```markdown
## Build Health

### Success Rates by Image

| Image                         | Success Rate | Builds | MoM Change                                                                 |
| ----------------------------- | ------------ | ------ | -------------------------------------------------------------------------- |
| Bluefin Stable                | 98.5%        | 67     | ![+2.3%](https://img.shields.io/badge/%2B2.3%25-success?style=flat-square) |
| Bluefin GTS                   | 100%         | 45     | ![+1.2%](https://img.shields.io/badge/%2B1.2%25-success?style=flat-square) |
| Bluefin LTS                   | 97.1%        | 52     | ![-1.5%](https://img.shields.io/badge/--1.5%25-critical?style=flat-square) |
| Bluefin Stable (first report) | 98.5%        | 67     | _Baseline_                                                                 |

### This Month's Highlights

- 📊 **Total Builds:** 423 builds across all images
- 🏆 **Most Active:** Bluefin Stable (67 builds)
- 🎖️ **Perfect Streak:** 12 consecutive days without failures
- 💯 **100% Club:** Bluefin GTS, Bluefin LTS (perfect success rate)
- ⏱️ **Avg Build Time:** 32 minutes across all variants
```

**Acceptance:**

- Section renders correctly in both light and dark mode
- Badges are accessible (color + text)
- "_Baseline_" displays in italic for first reports
- Table is mobile-responsive

---

### Task 3: Integrate and Document

**Files:** `scripts/generate-report.mjs`, `AGENTS.md`

Integrate build metrics into report generation and document the feature.

**Integration Steps:**

1. Import `fetchBuildMetrics` from `build-metrics.mjs`
2. Call after contributor tracking, before markdown generation
3. Pass `buildMetrics` to `generateReportMarkdown()`
4. Update markdown generator to include build health section
5. Handle errors: skip section if API fails, log warning

**Documentation in AGENTS.md:**

- Add "Build Health Metrics" subsection under "Monthly Reports System"
- Document workflows tracked and workflow IDs
- Explain build counting rules (workflow-level, not job-level)
- Document statistics definitions
- Add troubleshooting section for API failures

**Testing:**

```bash
# Regenerate January 2026 report with build metrics
export GITHUB_TOKEN=$(gh auth token)
node scripts/generate-report.mjs --month=2026-01

# Verify output
cat reports/2026-01-31-report.mdx | grep -A 30 "## Build Health"

# Test in browser
npm run start
# Navigate to /reports/2026/01
```

**Acceptance:**

- Build Health section appears after Bot Activity
- All workflows tracked and displaying correct data
- MoM comparison works (or shows Baseline for first report)
- Documentation complete and accurate
- No TypeScript errors
- Build time remains < 2 minutes

---

## Success Criteria

- [x] Build metrics fetcher implemented and tested
- [x] Markdown section generator implemented
- [x] Integration complete with error handling
- [x] Documentation updated in AGENTS.md
- [x] Manual testing passes (January 2026 report)
- [x] Build Health section renders correctly
- [x] All 10 workflows tracked
- [x] Accessible color indicators
- [x] "_Baseline_" displays for first reports

## Notes

- Build counting is at **workflow run level**, not job level
- Each workflow run = 1 build event (even if it produces multiple image variants)
- Exclude auxiliary workflows like "Generate Release" (126239689)
- First report won't have MoM comparison (show "_Baseline_")
- API rate limit: ~32 requests per report (well within 5,000/hour)

---

**Estimated Time:** 2-3 hours  
**Risk Level:** Low (isolated feature, graceful degradation)
