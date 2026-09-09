# 0005. Reports 2.0 public monthly snapshot model

- **Status:** Accepted
- **Date:** 2026-09-07
- **Decider:** @castrojo

## Context

Monthly reports are immutable blog-post snapshots, while `/factory` is the live
factory dashboard and `/changelogs` is the release-scoped changelog surface.
The current report already combines public GitHub activity, publishing lanes,
Countme, Homebrew, Flathub, tap promotions, contributor recognition, and
automation signals. It lacks a single model for wider factory coverage and for
the additional charts requested for Reports 2.0.

The published reports must remain source-attributed, SSR-safe, and free of
render-time network requests. Data must be collected only from original public
sources; unavailable inputs must remain visible, and missing values must not be
coerced to zero. The proposal therefore treats a report as a complete,
month-specific `Report Snapshot`, rather than a live dashboard embedded in a
blog post.

## Decision

Reports 2.0 remains a monthly blog-post archive. It is optimized for public
community members and contributors: it makes completed work, delivery
reliability, participation, and externally measured ecosystem context easy to
inspect without presenting internal operations as public fact.

Each generated Report Snapshot will have four source-attributed sections:

1. **Activity** — merged work, contribution calendar, category mix, and
   repository activity. The portfolio is explicitly configured, rather than
   inferred from organization membership.
2. **Delivery** — named publishing-lane outcomes, run cadence and duration,
   release events, and visible pending or unavailable states.
3. **Participation** — human and automation activity, contributors, new
   contributors, and the existing leaderboard when its source is available.
4. **Ecosystem context** — Countme, Homebrew, Flathub, and tap-promotion
   measurements with their actual source windows.

The initial stable portfolio is the existing image, documentation, branding,
installation, shared-factory, and automation work that is publicly measurable.
`projectbluefin/testsuite`, `projectbluefin/server`, `projectbluefin/actions`,
`projectbluefin/bonedigger`, and `projectbluefin/aurorafin-shared` are added
only where the generator can collect a defined public signal. `projectbluefin/utah`
and `projectbluefin/utah-packages` form the Experimental Portfolio and are
always labeled separately. Lab-cluster data, internal URLs, and unconfigured
repositories are excluded. `ublue-os/*` remains external ecosystem context,
not factory portfolio activity.

The report uses more charts only when a chart answers a distinct question:

| Question                                                     | Form                                               |
| ------------------------------------------------------------ | -------------------------------------------------- |
| When did completed work occur?                               | Calendar heatmap                                   |
| Which portfolio areas changed, at comparable scale?          | Shared-domain small multiples                      |
| How is activity distributed by repository and work category? | Matrix heatmap or ordered bar chart                |
| What happened in each publishing lane?                       | Accessible status table with outcome bar           |
| Are run cadence and duration changing?                       | Bounded multi-series line or duration distribution |
| How are automated and human contributions distributed?       | Ordered stacked bars                               |
| How are public ecosystem measures changing?                  | Source-window-labeled trend lines                  |

Every chart states the current numeric value, describes its units and source
window, exposes the snapshot data in a `<details>` table, uses a glyph in
addition to severity intensity, retains `null` gaps, and says `accumulating
data` below its minimum history. ECharts remains the library for substantive
interactive charts because it is already a dependency; sparklines remain
server-rendered inline SVG for compact trends. No new chart dependency is
introduced. ECharts use is client-only and never fetches data at render time.
Its required modules and SSR boundary must be verified through the Context7
`apache/echarts` library before implementation.

Release Changelogs remain the canonical per-release surface. Reports may show
release-count or cadence measurements and link to `/changelogs`, but they do
not duplicate package-level release notes.

Existing published reports remain untouched. Reports 2.0 begins with the first
newly generated report after this record is accepted. Historical-series charts
use an explicitly versioned tracked seed or show `accumulating data`; they do
not fabricate a backfill from incompatible historical methods.

## Consequences

The generator must produce one validated snapshot shape that supplies all
rendered components. It gains public-source adapters and tests for each
portfolio signal, while the post remains self-contained and immutable after it
is committed. Report components gain one shared chart wrapper instead of
individual client-only implementations.

The report becomes denser without becoming a replacement for `/factory` or
`/changelogs`. Adding a repository requires an explicit portfolio entry, a
documented public signal, a source label, an unavailable state, and an offline
test fixture.

## Considered options

**Turn reports into a live `/reports` dashboard.** Rejected: it breaks the
archive contract and overlaps `/factory`.

**Add every Project Bluefin repository automatically.** Rejected: repository
membership does not define an honest metric, and some repositories lack public
signals suitable for a monthly public report.

**Use a new visualization dependency.** Rejected: ECharts and SSR-safe
sparklines already cover the required forms; a new dependency adds bundle and
maintenance cost without a demonstrated need.

## Approval

Implementation is not authorized while this record is Proposed. A maintainer
must review and set it to Accepted before code, data-pipeline, component, or
workflow changes begin.
