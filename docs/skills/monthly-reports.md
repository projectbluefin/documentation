---
name: monthly-reports
version: "1.0"
last_updated: "2026-09-07"
id: monthly-reports
one_line_purpose: Generate, validate, and publish automated monthly factory report blog posts.
entry_point: docs/skills/monthly-reports.md
category: meta
status: active
tags: [reports, blog, factory, automation, infogram]
description: >-
  Generate, validate, and publish automated monthly reports as rich infogram blog
  posts under blog/. Use when generating a monthly report, testing the report
  pipeline, updating infogram components, or debugging monthly report workflows.
metadata:
  type: procedure
---

# Monthly Reports

Automated monthly reports are published directly as blog posts under `blog/`
using dinosaur-themed monthly slugs (e.g. `archaeopteryx-august-2026`). They
combine GitHub project boards, live factory publishing lane stats, Countme weekly
adoption telemetry, Homebrew tap updates, and DORA cadence metrics into a
zero-dependency SSR React infogram.

## When to Use

- Generating a monthly report for the current or prior month.
- Running or maintaining `scripts/generate-report.mjs` and related pipeline modules.
- Adding or editing report infogram components in `src/components/reports/`.
- Verifying client redirects from legacy `/reports/*` URLs to `/blog/*`.

## When NOT to Use

- Writing standard narrative or announcement blog posts — use [`blog-posts.md`](blog-posts.md).
- Editing factory status dashboard pages (`/factory`) — use [`factory-dashboard-content.md`](factory-dashboard-content.md).
- Editing repository-wide GitHub Actions workflows not related to monthly reports.

## Core Process

1. **Run the generator:**
   To run for the previous month (default):

   ```bash
   npm run generate-report
   ```

   Or specify a target month:

   ```bash
   node scripts/generate-report.mjs 2026-08
   ```

2. **Data dependencies:**
   The generator requires network access to GitHub GraphQL and REST APIs (using
   `GITHUB_TOKEN` or `GH_TOKEN`), reads local Countme statistics from
   `scripts/data/countme.json`, and extracts lane runs from `projectbluefin/bluefin`
   and `projectbluefin/bluefin-lts`.

3. **Output format:**
   The report is written to:
   `blog/YYYY-MM-DD-<dinosaur>-<month>-<year>.mdx`
   with author `[bluefin]` and tags `[monthly-report, project-activity]`.

4. **Infogram components:**
   The report body imports pure SSR React components from
   `@site/src/components/reports`:
   - `<ReportHeroKPIs>`: Responsive cards for top-level velocity & adoption KPIs.
   - `<ReportLeaderboard>`: Hive Leaderboard celebrating top community heroes, ranked roster, and new lights.
   - `<ReportLaneHealth>`: Publishing lane metrics (Testing, LTS, Dakota).
   - `<ReportCountmeTrend>`: Weekly active systems telemetry and variant distribution.
   - `<ReportAutomationStats>`: Factory autonomous vs human PR breakdown.
   - `<ReportDoraCadence>`: Deployment cadence and velocity indicators.

5. **Verify build and tests:**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build:ci
   ```

## Public-source adapter invariants

- Report adapters use original public GitHub endpoints only. A source record
  includes its public API URL and the exact report measurement window, whether
  the request is available or unavailable.
- Release events contain release metadata only; never copy release bodies into
  an immutable report snapshot.
- Every configured publishing lane remains in the result. A failed lane keeps
  its identity and reason while its measurements are `null`, not zero.
- Workflow runs without a terminal verdict are `pending`, not failed, and are
  excluded from the success-rate denominator.
- Activity aggregation skips missing repository and category values instead of
  creating `"undefined"` buckets. Add adapter tests before implementation and
  observe the expected red test run before writing production code.

## Common Rationalizations

- _"We should just put a live dashboard iframe in the post instead of static props."_
  Wrong. Monthly reports are historical archives. They must capture immutable snapshots
  of factory state as of that month, committed cleanly to git.
- _"We should write narrative editorializing about why numbers went up or down."_
  Banned. Maintainer voice rules apply: agents report data and structure, never
  invented narrative or opinions.

## Red Flags

- The generated report is written to `reports/` instead of `blog/`.
- The report attempts to make client-side network requests during rendering.
- An infogram component crashes during SSR with `window` or `document` undefined.
- Hardcoded dark-mode background colors that clash with light mode.

## Verification

- `scripts/*.test.js` passes (`npm test`).
- Production build succeeds without broken links (`npm run build:ci`).
- Redirect check confirms legacy `/reports/YYYY/MM` routes redirect to the corresponding blog slug.

## Sources

- `scripts/generate-report.mjs`
- `scripts/lib/factory-monthly-metrics.mjs`
- `scripts/lib/markdown-generator.mjs`
- `src/components/reports/`
