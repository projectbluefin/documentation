# Task 7 report — archive deployment and operating contract

## Status

Complete on `feat/reports-2-archive`.

## Changes

- Updated the monthly workflow to stage exactly the generated blog report,
  report history, known-contributor cache, and Countme history.
- Added archive-contract assertions and the August 2026 legacy redirect test.
- Updated the monthly-reports skill and reports page with the implemented
  snapshot, portfolio, availability, chart, and archive contracts.
- No historical posts, dependencies, or Docusaurus redirect entries changed.

## TDD evidence

RED:

```text
node --test scripts/report-archive.test.js
```

The archive assertion failed because the workflow still staged `reports/` and
did not include report history or Countme history. The existing August redirect
assertion passed.

GREEN:

```text
node --test scripts/report-archive.test.js
```

`2` passed, `0` failed.

## Validation

- Changed-file Prettier check — pass.
- `git diff --check` — pass.
- Full `npm run lint` — pass with existing warnings only.
- `just check` — blocked by pre-existing missing generated
  `static/data/playlist-metadata.json`, `file-contributors.json`, and
  `github-repos.json`.
- `npm run build:ci` — blocked by the same missing generated data and feeds.
- Full `npm test` — pre-existing release-card failures because the checkout
  lacks the Inter WOFF asset.

## Scope and review

- No push was made.
- The `.github/workflows/monthly-reports.yml` change requires maintainer review
  before merge.
