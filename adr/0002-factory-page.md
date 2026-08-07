# 0002. Rename /hive to /factory and absorb project-level factory content

- **Status:** Accepted
- **Date:** 2026-08-07
- **Deciders:** @castrojo
- **Authorizes:** design changes to `src/pages/hive.tsx`,
  `src/components/HiveFactoryDashboard.tsx`, their CSS, routes, navigation, and a
  new data pipeline. See ADR 0001 for what that authorization means.

## Context

Project-level status lives in two places that split the wrong way.

`factory.projectbluefin.io` is a GitHub Pages site from `projectbluefin/lab`. It
mixes two audiences: **project-level** status (release verdicts, build health,
image freshness, recent runs, open bugs) and **lab** internals (per-suite test
results and the ghost/exo-0 hardware — contributor cluster cards, BuildStream
cache heatmaps, the 40 Gbps link, work distribution, cold/warm speedup).

`docs.projectbluefin.io/hive` renders `HiveFactoryDashboard` — live hive
orchestration state, and the natural home for project-level status, since docs is
where people already look.

A reader who wants "is the project healthy?" has to visit both, and one of them is
mostly lab hardware they do not care about. Meanwhile `src/pages/hive.tsx` is
named after one component of a larger system.

Facts verified while writing this record:

- `src/pages/hive.tsx` renders `HiveFactoryDashboard` only.
  `src/components/HiveDashboard.tsx` (1,902 lines) is imported nowhere.
- `hive.projectbluefin.io` currently 301s to `docs.projectbluefin.io/hive/` via a
  Cloudflare rule that does not live in this repository.
- `lab.projectbluefin.io` already resolves to Cloudflare and returns 404 —
  the signature of a hostname pointed at GitHub Pages that no repository claims.
- This repository's `CNAME` is `docs.projectbluefin.io`. GitHub Pages allows one
  custom domain per repository, so a second hostname cannot be served by a bare
  CNAME.

## Decision

**One public supersite, backed by two working tools.** `/factory` is the
culmination of the hive and factory dashboards: a single page an end user can
visit to understand the state of Bluefin. Maintainers continue to work in the
actual tools — the hosted hive at
`hosted-projectbluefin-knuckle-gjvq.hive.kubestellar.io` for operations, and the
lab site for lab internals.

### Purpose and audience

The audience is **end users**. The page is not an operations console and does not
need to be, because a better one already exists and maintainers use it.

It is nonetheless **dense on purpose**. This page exists partly to show the
engineering behind Bluefin, so detail is a feature rather than clutter: agent
state, governor mode, token budget, cadence, ACMM level, advisories, and merge
statistics all stay, alongside the factory's release and build data. An end user
is not expected to act on every number. They are expected to come away
understanding that a serious automated system is running behind the distribution.

This is the reason the structure below pairs an at-a-glance summary with deep
detail rather than choosing between them: the summary serves comprehension, and
the depth serves credibility.

### Naming and routing

- The page becomes **Factory**, served at `/factory`. The navbar shows "Factory"
  only; hive content lives inside the page rather than as its own entry.
- `/hive` is **not** redirected. No redirect plugin is added. Links to the old
  path break, which is accepted deliberately: the correct structure matters more
  than preserving a URL, and an unreviewed redirect layer is its own maintenance
  cost. In-repo links are corrected as part of this work.
- `hive.projectbluefin.io` is repointed at the hosted hive instance
  (`hosted-projectbluefin-knuckle-gjvq.hive.kubestellar.io`), so the name refers
  to the actual hive rather than to a docs page.
- `factory.projectbluefin.io` is repointed at this page, and the lab site moves to
  `lab.projectbluefin.io`.

Both hostname changes are **Cloudflare redirect rules or Workers, not CNAMEs** —
a bare CNAME to GitHub Pages 404s, as `lab.projectbluefin.io` currently
demonstrates. They are performed by a maintainer with zone edit rights; they are
outside this repository and outside CI.

### Content moved here

All project-level content from the factory site: release verdict per lane, rolling
7-day build health, what's-degrading, image status for every published lane
(bluefin, bluefin-lts, dakota, and the other container image lanes), recent runs,
and open bugs.

### Content that stays on lab

Per-suite test results and everything hardware: contributor cluster cards,
BuildStream cache utilization, the Thunderbolt link, work distribution, cold/warm
speedup, and layer rechunking.

### Contributor onboarding

`docs/agentic-contributing.md` keeps ownership of onboarding prose. `/factory`
carries a "contribute your compute" call to action, the trust tiers, and a short
"what you bring vs. what the hive provides" summary, then links to the hosted
hive's own contribute page for the rest.

The hive's interactive setup-command generator at
`/contribute/operations` on the hosted instance is **not** reproduced here. It is
behavior spanning OS, CLI, mode, and runtime that would drift from the hive's own
generator the moment either changed. Link to it; do not clone it.

### Structure

Two tabs — **Live** (hive orchestration) and **Factory health** (build, release,
and image status) — with an always-visible status strip **above** the tabs.

The strip and the tabs serve the two halves of the page's job. The strip answers
"how is Bluefin doing?" without any interaction, which is what most end users
want. The tabs organize the depth so density reads as substance rather than
noise. Neither works alone: without the strip the page is a wall, and without the
tabs the page is an unreadable scroll.

Two conditions are part of this decision, not implementation detail:

1. **Tab state is reflected in the URL**, so a specific view can be linked and
   shared.
2. **An empty tab is never the default.** The status strip renders from whichever
   sources are available, so "is anything on fire?" is answerable without
   clicking.

### Data

Project-level data is **regenerated in this repository** from the GitHub Actions
API by a new `scripts/fetch-factory-*.js`, following the existing fetch-script and
`scripts/*.test.js` pattern, rather than consumed from the lab site.

This avoids coupling to lab URLs that are being renamed as part of this same work.
The cost is duplicated logic, and one guardrail is mandatory: the release verdict
must **reference lab's ADR 0002 verdict definition rather than reimplement it from
memory**, or the two sites will publish contradicting verdicts on the same
release, which is worse than either site alone.

### Fallback behavior changes deliberately

Today each hive data source degrades to an invisible unavailable state. On
`/factory`, unavailability becomes **visible per panel**. This is a deliberate
change: a dashboard that silently renders less is indistinguishable from a healthy
one with less to report.

Note that `hive-history.json` is a tracked CI seed while `registry-data.json` and
`hive-live-data.json` are untracked, so local and production builds fail
differently. Verify data-related changes in both.

### Dead code

`src/components/HiveDashboard.tsx` and `HiveDashboard.module.css` are deleted as
part of this work.

A repository-wide sweep for unreferenced components found one other:
`src/components/WallpaperShowcase.tsx`, which is imported nowhere and is deleted
too.

## Scope

**In scope:** the route rename, navbar change, `hive.tsx` →
`factory.tsx`, restructuring `HiveFactoryDashboard` into the tabbed layout with
the status strip, the new factory data pipeline and its tests, per-panel
unavailable states, deleting `HiveDashboard.*`, and updating inbound links in
`docs/analytics.mdx` and `docs/agentic-contributing.md`.

**Out of scope:** the Cloudflare and DNS changes (maintainer, outside this repo);
any change to the lab site or its pipeline; reproducing the setup-command
generator; test-suite and hardware content.

## Consequences

One page answers "is the project healthy?", and lab keeps the depth its audience
wants. The docs site gains a real data pipeline it must now maintain, including
drift against lab's verdict definition — the guardrail above is the mitigation,
and it is a standing cost, not a one-time one.

External links to `docs.projectbluefin.io/hive` break, by choice. Links to
`hive.projectbluefin.io` intentionally change meaning and will land on the hosted
hive instead of documentation.

Shipping is not atomic: the repository change and the two Cloudflare changes land
separately, so there is a window where naming is inconsistent.

## Alternatives considered

**Keep `/hive` and add factory content under the old name.** Rejected: the page
would be named after one component of the system it describes.

**Consume lab's published JSON at build time.** Cheapest, and it avoids duplicated
logic. Rejected because it wires this site to URLs that this same decision
renames, guaranteeing a second breakage.

**Three tabs, including contributor onboarding.** Rejected: it duplicates
`docs/agentic-contributing.md` and creates two owners for prose that will diverge.

**No tabs, one sectioned page.** Genuinely close, and strictly better than tabs
implemented without URL state. Rejected because the two clusters serve distinct
questions and the combined scroll is long — but the two conditions above exist
precisely because this alternative wins if they are not met.

**Anonymize the ghost hardware and keep the panels.** Rejected: it keeps the
pixels and discards the meaning, and the hardware belongs to the lab audience.

**A minimal end-user summary with the telemetry stripped out.** Considered
seriously once the audience was settled as end users, on the reasoning that
governor mode and token budgets are not actionable for someone who just wants to
know whether to update. Rejected: it optimizes for comprehension alone and
discards the page's second job, which is to make the engineering behind Bluefin
visible. The status strip gives the summary without giving up the depth.

---

## Addendum: visual system and panel inventory

Added 2026-08-07 after an audit of both existing sites and prior-art research.
Supporting evidence is in `adr/research/`. The maintainer's direction for this
addendum: take **the best visualizations from each site** rather than porting
either, and treat sparklines as a first-class form.

### Why neither site is ported as-is

The factory site currently reads as broken. Measured from its own published
contracts: 1 of 15 image lanes has a release timestamp, 0 of 5 release lanes are
judged good, 0 of 5 cache cells have data, and 50 of 64 test-matrix rows are
waiting for results.

The dominant cause is a single mapping defect, not real failure: `running` is
rendered as `failed`, with the reason string "latest publishing run concluded
running" and `finished_at: null`. In the same window 94% of publish builds
passed. **Any panel carried over must map in-flight work to a pending state and
never to a failure.**

Two further constraints follow from that audit:

- The Thunderbolt/USB-4 panel family (40 Gbps, 4.2x speedup, 145 s rechunk,
  45/55 split) is **hardcoded constants** inside an object whose own `status` is
  `"unavailable"`, with no `source_url` or `collected_at`. It is not carried
  unless a real collector is wired.
- The lab site publishes LAN IPs and private Argo URLs. Nothing carried here may
  surface host addresses.

### Sparkline system

One component, extended from the existing `src/components/Sparkline.tsx`, which
is sound: pure, zero-dependency, inline SVG, SSR-safe, and it normalizes
min-to-max so it shows shape.

`HiveFactoryDashboard.tsx` does not use it. It carries four private
reimplementations, three of which use a zero baseline, one of which is dead code,
and one of which coerces missing points to zero so gaps render as crashes to
zero. **Consolidate to the shared component first; delete the reimplementations.**

Required extensions: variants `line`, `winloss`, `bars`, `bullet`; an explicit
`scale` of `minmax` | `zero` | shared `domain`; end/min/max markers; an optional
shaded normal-range band; and an optional `label` that switches the graphic from
`aria-hidden` to `role="img"` with a generated sentence.

Rules that are part of this decision:

1. **A sparkline never appears without its current value as a number.** The line
   carries trend; the number carries scale.
2. **Small multiples share one domain.** Per-series autoscaling across a grid
   makes every lane look identical regardless of value. This is the difference
   between the best panel on the page and the most misleading one.
3. **Severity is encoded by intensity of a single hue, plus shape** — never by
   hue alone, and not with the red/green pair currently in use.
4. **Gaps are drawn as gaps**, never interpolated or coerced to zero.
5. **Below a minimum point count, render "accumulating data"**, and render
   "steady at zero" distinctly from missing. Silent disappearance is forbidden by
   the unavailability rule above.

Everything is hand-rolled inline SVG. Sankey is the sole exception and may use
the `echarts` dependency already present.

### Data already available and unused

The public hive registry (`https://hive.kubestellar.io/api/registry`, no auth)
serves `issueHistory` and `prHistory` at **672 points each, 16-minute interval,
spanning 7.5 days** — verified live. The current page renders 48 points of one
series and none of the other. Meanwhile six sparklines are drawn from a file
containing two points. The redesign inverts this.

`scripts/fetch-hive-history.js` fetches 52 weekly commit buckets per contributor
and collapses them to three integers before writing. **Persist the weekly buckets**
so per-contributor activity sparklines can sit inline in leaderboard rows.

`https://<hosted-hive>/api/contribute/fleet` is public and returns live named
contributors, their CLI backend and model, trust tier, and current task. Most
other hosted-hive endpoints now require auth.

### Panels

**Carry, from the factory site:** release verdict cards, rebuilt around a
plain-language headline with the digest retained; the rolling build-health KPI
strip with daily outcome bars; image freshness cards, rendering only lanes with
evidence and summarizing the rest in one honest line; the provenance and lineage
block, promoted from footnote to feature.

**Carry, from the hive dashboard:** live agent state, the contributor
leaderboard, queue depth, and merge statistics.

**New forms adopted:** a build-activity calendar heatmap; small multiples of
per-lane health on a shared domain; a Sankey of issue to agent to PR to merge to
release, with abandoned work shown as a visible dead end; and a live agent
activity pulse.

**Dropped:** work distribution, layer rechunking, cache heat trend, the racing
leaderboard framing, raw poller run labels, and pie or donut charts.

### Consequence: the SLA panel will look bad

Median merge time currently runs far above the sub-30-minute target, so a bullet
graph against that target will show a large miss. It ships anyway. Publishing an
unflattering number next to the target is more credible than omitting it, and
omitting it would contradict the visible-unavailability rule. If the target
applies to a narrower class of work than the metric measures, the label says so.
