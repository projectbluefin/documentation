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
combine public GitHub activity, publishing-lane outcomes, countme source
state, Homebrew tap updates, release events, and contributor
activity into an immutable SSR-safe report snapshot. ECharts is already a site
dependency for substantive interactive charts; no report-specific dependency is
added.

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
   `static/data/countme-history.json`, reads the refreshed Flathub snapshot from
   `static/data/flathub-stats.json`, and extracts runs from the configured
   public publishing lanes. The scheduled workflow runs both data fetchers with
   `--force` before generating the report so a tracked or ignored local cache
   cannot silently become the report's source window.

3. **Output format:**
   The report is written to:
   `blog/YYYY-MM-DD-<dinosaur>-<month>-<year>.mdx`
   with author `[bluefin]` and tags
   `[monthly-report, project-activity, announcements]`.

4. **Infogram components:**
   The report body imports SSR-safe React components from
   `@site/src/components/reports`:
   - `<ReportHeroKPIs>`: Responsive cards for top-level velocity & adoption KPIs.
   - `<ReportLeaderboard>`: Hive Leaderboard celebrating top community heroes, ranked roster, and new lights.
   - `<ReportActivity>`: Daily activity, repository/category comparisons, and
     stable versus experimental portfolio labels.
   - `<ReportDelivery>`: Publishing-lane outcomes, cadence, and release events.
   - `<ReportParticipation>`: Human and automation activity plus contributors.
   - `<ReportEcosystem>`: Countme, Homebrew, and Flathub source states.
   - `<ReportLaneHealth>`: Publishing lane metrics (Testing, LTS, Dakota).
   - `<ReportCountmeTrend>`: Weekly active systems from countme. Unavailable
     until first-party counts are published; it states
     that reason rather than charting an upstream number.
   - `<ReportAutomationStats>`: Factory autonomous vs human PR breakdown.
   - `<ReportDoraCadence>`: Deployment cadence and velocity indicators.

5. **Verify build and tests:**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build:ci
   ```

## Reports 2.0 snapshot contract

Each generated post embeds one `Report Snapshot` with `schemaVersion: 2` and
these sections:

- `period`: the UTC month and its inclusive start and end dates.
- `sources`: public source URLs, measurement windows, availability status, and
  an unavailability reason when applicable.
- `activity`, `delivery`, `participation`, and `ecosystem`: the four
  source-attributed report sections.
- `history`: prior compatible snapshots without nested history.

The generator writes the blog post first, then merges the snapshot into
`scripts/data/report-history.json`, replacing only the same month and sorting
snapshots by month. The tracked seed is
`scripts/data/report-history-seed.json`. The scheduled archive workflow commits
the generated post together with the history, contributor cache, and
`static/data/countme-history.json`. Blog posts are created with an exclusive
file write; rerunning a month whose post already exists fails instead of
rewriting the public archive or its corresponding history.

## Portfolio and source rules

The report portfolio is explicit configuration, not organization membership.
Only repositories listed in `scripts/lib/report-portfolio.mjs` contribute
portfolio activity. Stable and Experimental entries remain labeled separately;
unconfigured repositories, lab-cluster data, internal URLs, and tokens are
excluded. `ublue-os/*` measurements are external ecosystem context rather than
Project Bluefin portfolio activity: the configured Homebrew taps provide
promotion measurements only, and no `ublue-os/*` repository enters activity or
participation totals.

Adapters use original public sources and retain a source record when a request
is unavailable. A missing measurement is `null`, not zero. Publishing lanes
retain their identity when unavailable, with measurements set to `null` and the
reason shown.

## Chart accessibility contract

Every chart must expose its current numeric value, unit, source label, and
source window. It must retain `null` gaps, state `accumulating data` below its
minimum point count, and provide the snapshot values in an accessible
`<details>` table. Severity uses a glyph as well as intensity; color is never
the only distinction. ECharts runs only in the client boundary, while the
snapshot and its provenance remain available to server-rendered output.

## Public-source adapter invariants

- Report adapters use original public endpoints only. A source record
  includes its public API URL and the exact report measurement window, whether
  the request is available or unavailable.
- Release adapters follow the GitHub `Link` pagination chain before deciding
  that a repository has no release event in the window; a failed later page
  marks that repository source unavailable.
- Release events contain release metadata only; never copy release bodies into
  an immutable report snapshot.
- Every configured publishing lane remains in the result. A failed lane keeps
  its identity and reason while its measurements are `null`, not zero.
- Delivery cadence is a date-based trend with one series per configured lane;
  lane totals are not used as a substitute for a time axis.
- Workflow runs without a terminal verdict are `pending`, not failed, and are
  excluded from the success-rate denominator.
- Partial GitHub pagination makes participation unavailable rather than
  presenting a human/automation split or leaderboard derived from an
  incomplete result.
- **A Project Bluefin count comes from our own deployment only.** Every count
  for `bluefin`, `bluefin-lts`, `dakota`, `utah`, or `server` comes from
  `countme.projectbluefin.io`. Fedora's `totals.csv` — the source behind
  `static/data/countme-history.json` — counts mirror hits for a Fedora repo
  and is never a substitute for one of our images. Until the first-party
  counts are published, `extractCountmeMetrics()` returns an
  unavailable measurement carrying `FIRST_PARTY_PENDING_REASON` from
  `scripts/lib/countme-sources.mjs`: the report keeps the countme panel and
  states the reason, and the Active Systems hero KPI does not appear.
  `scripts/countme-first-party.test.js` enforces this.
- Countme and Flathub gaps remain `null` or unavailable. A missing variant,
  failed refresh, or incomplete daily window is never coerced to zero.
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
- `scripts/lib/report-history.mjs`
- `scripts/lib/report-portfolio.mjs`
- `scripts/lib/report-ecosystem-metrics.mjs`
- `scripts/lib/report-snapshot.mjs`
- `scripts/lib/markdown-generator.mjs`
- `scripts/report-archive.test.js`
- `scripts/report-ecosystem.test.js`
- Context7 library ID: `apache/echarts`
- `src/components/reports/`
