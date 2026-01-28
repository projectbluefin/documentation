---
type: quick
task_number: 004
created: 2026-01-27
status: ready
---

# Quick Task: Change Report Blog Slugs to Year/Month Format

## Objective

Change report blog URLs from `/reports/2026-01-31-report` to `/reports/2026/01` by:

- Adding slug frontmatter to generated reports
- Updating existing reports with new slug format
- Ensuring deterministic, clean URLs

**Why:** Year/month URLs are cleaner, more predictable, and easier to navigate than date-based slugs.

## Tasks

### Task 1: Update Report Generator to Add Slug Frontmatter

**Files:**

- `scripts/lib/markdown-generator.mjs`
- `scripts/generate-report.mjs`

**Action:**

1. In `markdown-generator.mjs`, update the `frontmatter` generation (around line 58-65):
   - Add slug field with format: `/${year}/${month}` (e.g., `/2026/01`)
   - Use zero-padded month from startDate: `String(month + 1).padStart(2, '0')`
   - Example: `slug: /2026/01`

2. Verify filename generation in `generate-report.mjs` (line 280) remains unchanged:
   - Files still named `YYYY-MM-DD-report.mdx` (sorted chronologically)
   - Only the URL slug changes, not the filename

**Verify:**

```bash
npm run generate-report
cat reports/2026-01-31-report.mdx | head -10
# Should show: slug: /2026/01
```

**Done:** Generated reports include slug frontmatter with year/month format.

---

### Task 2: Update Existing Report Files

**Files:**

- `reports/2025-12-31-report.mdx`
- `reports/2026-01-31-report.mdx`

**Action:**

1. Add `slug: /2025/12` to December 2025 report frontmatter
2. Add `slug: /2026/01` to January 2026 report frontmatter
3. Insert slug line after `date:` line, before closing `---`

**Verify:**

```bash
npm run start
# Navigate to http://localhost:3000/reports
# Click on reports - URLs should be /reports/2025/12 and /reports/2026/01
```

**Done:** Existing reports use clean year/month URLs.

---

### Task 3: Validate Build and URLs

**Files:**

- (validation only)

**Action:**

1. Run full build to ensure no breakage
2. Start dev server and test navigation
3. Verify RSS feed still works
4. Check report listing page displays correctly

**Verify:**

```bash
npm run build
npm run start
# Test URLs:
# - /reports (listing page)
# - /reports/2025/12 (December report)
# - /reports/2026/01 (January report)
# - /reports/rss.xml (RSS feed)
```

**Done:** All reports accessible via year/month URLs, build clean, RSS functional.

## Success Criteria

- [x] Report generator adds slug frontmatter with `/{year}/{month}` format
- [x] Existing reports updated with slug frontmatter
- [x] URLs deterministic: `/reports/YYYY/MM`
- [x] Build succeeds with 0 TypeScript errors
- [x] Dev server shows correct URLs
- [x] RSS feed still operational

## Context

- Reports use Docusaurus multi-blog with `id: 'reports'`
- Filenames remain `YYYY-MM-DD-report.mdx` for sorting
- Only public-facing URLs change via slug frontmatter
- Docusaurus slug field overrides default URL generation
