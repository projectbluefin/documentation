# 0003. Two-level navigation for /factory and first-party chart parity

- **Status:** Accepted
- **Date:** 2026-08-07
- **Deciders:** @castrojo
- **Supersedes in part:** 0002 — the two-tab structure, the "content that stays
  on lab" split, and the "everything is hand-rolled inline SVG" rule.
- **Authorizes:** new routes under `/factory/*`, a two-level navigation
  component, decomposition of `HiveFactoryDashboard.tsx`, a design-token layer,
  an ECharts wrapper, seven new build-time data pipelines, and the panel
  inventory listed below. See ADR 0001 for what that authorization means.

## Context

ADR 0002 gave `/factory` two tabs, `Live` and `Factory health`, selected with a
`?tab=` parameter. Measured from the shipped CSS the tab bar is `0.78rem`,
uppercase, `#8b949e` on `#0d1117` with no background fill, a 2px active
underline, and padding of `0.55rem 1.1rem` — below the 44px minimum target. It
sits below a tall hero and a tall status strip, roughly 400px down a 1080p
viewport. Readers reach content before they reach navigation. The maintainer's
assessment, that the tabs are "too hidden", is a correct reading of what the
page renders.

Separately, ADR 0002 split content with lab and left the majority of the lab
site's visualizations behind. An audit of `projectbluefin/lab` counts roughly 45
ECharts visuals across 11 pages. The valuable ones — countme active devices,
pass-rate trends, daily build outcomes, release timelines, freshness brackets,
duration percentile bands — did not come across.

ADR 0002 rejected consuming lab's published JSON, on the grounds that it wires
this site to URLs the same decision renames. That reasoning still holds, and the
maintainer has now strengthened it: nothing on `/factory` may measure lab at
all. The consequence is that parity has to be rebuilt from the original upstream
sources rather than ported.

Facts verified live on 2026-08-07 while writing this record:

- `data-analysis.fedoraproject.org/csv-reports/countme/totals.csv` is public,
  unauthenticated, **617,959,570 bytes**, sorted ascending by `week_start`, and
  carries `os_name` values `Bluefin`, `Bluefin LTS`, `Aurora`, `Bazzite`.
- `formulae.brew.sh/api/analytics/os-version/365d.json` ranks `Bluefin` **#11
  worldwide** at 1,348,288 installs (0.48%) and `Bluefin LTS` #39 at 79,446.
  There is no `analytics-linux` host; that path 404s.
- `flathub.org/api/v2/stats` attributes 410,969 downloads to `bluefin;44` and
  exposes a Flatpak version distribution per operating system.
- `api.securityscorecards.dev` returns a current score of 4.5 for
  `projectbluefin/bluefin`, and no history.
- The GitHub Packages REST API exposes **no** container download counter, and
  Bluefin publishes to GHCR only. Pull counts cannot be obtained from any
  public source.

A design audit of the current page found four violations of ADR 0002's own
sparkline rules still shipping: an all-zero series disappears entirely rather
than drawing a flat line, six small multiples in `HistoryTrends` autoscale
independently, advisory severity is encoded by three hues, and `CiBadge` uses
the forbidden red/green pair. It also found three colour pairs below WCAG AA
(the worst at 2.7:1), two infinite animations with no `prefers-reduced-motion`
guard, 136 KB of static JSON fetched client-side after hydration, and a
one-second interval re-rendering the entire 5,364-line component tree.

## Decision

### Structure

Two primary tabs, `Live` and `Factory`. Each reveals its own secondary row.
Every node is a real Docusaurus route, code-split:

```
/factory              Live › Overview (default)
/factory/community    Live › Community
/factory/images       Factory › Images (the Factory primary lands here)
/factory/builds       Factory › Builds
/factory/tests        Factory › Tests
/factory/applications Factory › Applications
/factory/metrics      Factory › Metrics
/factory/userspace    Factory › Userspace
```

Routes replace the `?tab=` parameter. ADR 0002's two conditions survive the
change and are strengthened by it: the view is in the URL by construction, and
the hero and status strip remain above the navigation on every route, so "is
anything on fire?" is still answerable without clicking. `?tab=live` and
`?tab=health` are rewritten client-side **on `/factory` only** to the
corresponding route — a short effect, not a redirect plugin.

The navigation itself is fixed by this decision, not left to implementation:
inactive tabs at `0.95rem`/600 in `--fx-text-muted`, active tabs with a filled
background rather than an underline alone, a 44px minimum target, the primary
row sticky at the top of the scroll container, and the secondary row visually
subordinate but never below the fold on a 1080p viewport.

Lab's `Provisioning`, `Evidence` and `About` are not carried. The first two are
pure lab-cluster measurement. `About` is methodology prose, which belongs in
`docs/` rather than in a dashboard tab.

### Charting

ADR 0002's "everything is hand-rolled inline SVG" rule is replaced.
`Sparkline` remains the required tool for inline values, leaderboard rows and
small multiples, where it is better than a chart library. ECharts — already a
dependency, already used by `FactoryCharts.tsx` — is used for the substantial
panels: multi-series lines, stacked bars and areas, heatmaps, calendars,
scatter timelines, and the one permitted pie.

All five sparkline rules from ADR 0002's addendum bind ECharts panels too.
Rule 4 in particular: a gap is `null` in a series with `connectNulls: false`,
never `0`.

Every chart is wrapped by one component that renders nothing during static
generation, mounts on the client, applies the shared theme, disables animation
outright rather than branching on `prefers-reduced-motion`, and emits a
`<details>` data table so the numbers exist for a screen reader. A chart is
never the sole carrier of a claim, and never appears without its current value
stated as a number.

### Content boundary

ADR 0002's "content that stays on lab" split is superseded. `/factory` carries
the project-level story end to end. Lab-cluster measurement is not carried and
is **not approximated**: BuildStream caches, the cache heat trend, the
Thunderbolt link, work distribution, cold/warm speedup, layer rechunking,
contributor cluster hardware cards, KubeVirt provisioning, ArgoCD sync status,
pod memory against requests, policy compliance, Zot registry storage, and the
AT-SPI evidence workbench are dropped.

`Adoption` is renamed `Metrics` and is Bluefin-only. Peer distributions appear
only where a comparison is the point: the ecosystem-share panel and the Flathub
peer bar.

`Applications` measures the applications Bluefin ships — the curated catalog
already in `static/data/firehose-apps.json`, Flathub downloads attributed to
Bluefin, and the GNOME extension inventory. `Userspace` measures Bluefin's
userspace stack — the `fsdk-containers` images on GHCR, toolbox images, and the
Flatpak runtime distribution on Bluefin. Neither measures a cluster.

`Tests` is reconstructed from GitHub Actions runs and jobs, at repo × workflow
granularity. This is coarser than lab's 64-row suite × variant matrix, which is
built from Argo runs this site cannot see, and repo × workflow is the honest
granularity available.

### Data

Zero lab resources. Every dataset is regenerated here from the original public
source by a `scripts/fetch-*.js` script in the existing pattern: pure exported
functions, a `scripts/*.test.js` beside it, never throwing, never exiting
non-zero, and always writing an explicit `unavailable: true` payload with a
reason rather than a silently empty file.

The hive — `hive.kubestellar.io`, the hosted instance, and
`queue.projectbluefin.io` — is **not** lab. It is already sanctioned by ADR 0002
and remains the source for `Live`. The prohibition covers `projectbluefin/lab`
and its cluster.

The countme CSV is 618 MB and must never be downloaded whole in CI. Because it
is sorted ascending by `week_start`, an HTTP range request over the final
megabytes yields the most recent weeks. Each build fetches a bounded 12 MB tail
and merges it into a tracked seed, `static/data/countme-history.json`, so
history accrues without the file size ever being paid. A wider one-time
backfill exists behind a `--seed` flag and is deliberately not wired into
`npm run fetch-data`.

Scorecard has no history endpoint, so `static/data/scorecard-history.json`
accumulates the same way. Both seeds are tracked; both cold-start nearly empty
and must render "accumulating data" rather than an empty chart.

### Defects fixed as part of this work

Because they are violations of ADR 0002's own rules or of accessibility
baselines, and because the code carrying them is being moved anyway:

- An all-zero sparkline series must render a flat line, not disappear.
- Small multiples in `HistoryTrends` must share a domain; `HistoryTrends` is
  then merged into `FactoryVitals`, which measures the same three metrics from
  a richer source.
- Severity is one hue at four intensities plus a distinct glyph, everywhere,
  including advisories and CI badges.
- The three sub-AA colour pairs are corrected and `#484f58` is removed rather
  than kept as a token, so it cannot return by accident.
- Both infinite animations are guarded by `prefers-reduced-motion`.
- The one-second countdown is isolated so it cannot re-render a page.
- Static JSON is loaded per route, on demand, and cached across navigation.
- `_QueueBar` is dead and is deleted.

## Scope

**In scope:** the eight routes, the two-level navigation component, the design
token layer, the ECharts wrapper and shared theme, the visible-unavailability
component, the per-route data provider, decomposition of
`HiveFactoryDashboard.tsx` into panel modules, the seven new fetch pipelines and
their tests, the panel inventory above, the defect fixes above, and updating
inbound links.

**Out of scope:** any change to the lab site or its pipeline; `workers/countme-proxy/`;
the Cloudflare and DNS work from ADR 0002; per-image CVE counts, which are gated
behind a written feasibility check and may be refused.

## Consequences

The page becomes eight code-split routes instead of one 5,364-line component,
which is the only way the added panels do not make it slower. Two tracked seeds
now accrue history, so two files change in most CI runs.

Image pull counts are published nowhere and are simply absent; countme, Flathub
and Homebrew are the adoption signals instead. Homebrew third-party tap installs
are likewise unavailable, and Homebrew's `os-version` analytics is substituted —
a better metric, since it ranks Bluefin against every operating system rather
than against other taps.

The OpenSSF score is currently 4.5 out of 10 and is published as-is, for the
same reason ADR 0002 chose to publish an unflattering median merge time: a
number omitted because it is unflattering is worse than the number.

The docs site now maintains seven more pipelines. That is a standing cost and
the reason each one is required to degrade visibly rather than silently.

## Alternatives considered

**Keep two tabs and make them louder.** Cheapest, and it addresses the literal
complaint. Rejected because it does nothing about the missing visualizations,
and eight views' worth of content in two tabs is a scroll, not a structure.

**One flat row of nine tabs.** Honest and simple. Rejected because `Live` and
`Factory` answer genuinely different questions and a flat row hides that; nine
peers also wrap on a laptop viewport, which reintroduces the original problem.

**Keep the `?tab=` parameter and add a second one for the secondary tab.**
Rejected: it keeps the whole dashboard in one bundle, which is the thing that
makes eight views unaffordable, and two orthogonal query parameters are harder
to share correctly than a path.

**Consume lab's published JSON.** Rejected by ADR 0002 and now rejected again,
more strongly, by the maintainer.

**Keep hand-rolled SVG for everything.** Rejected: a calendar heatmap, a
percentile band and a scatter timeline hand-rolled three times over is a large
amount of bespoke, untested geometry for no gain, when ECharts is already
installed and already used on this site.

**Approximate the dropped lab panels from public data.** Rejected: there is no
public source for cache hit rates or cluster health, so any such panel would be
a plausible-looking invention. Dropping them is honest; approximating them is
the failure mode ADR 0002's visible-unavailability rule exists to prevent.
