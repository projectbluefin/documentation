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

**Split by audience, not by system.** Lab keeps lab; the project page takes
project-level status.

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

### Contributor onboarding stays where it is

`docs/agentic-contributing.md` keeps ownership of onboarding prose. `/factory`
carries a "contribute your compute" call to action and the trust tiers, and links
out for the rest.

The hive's interactive setup-command generator is **not** reproduced here. It is
behavior that would drift from the hive's own generator the moment either changed,
and duplicated onboarding prose silently diverges from its owner.

### Structure

Two tabs — **Live** (hive orchestration) and **Factory health** (build, release,
and image status) — with a small always-visible status strip **above** the tabs.

Two conditions are part of this decision, not implementation detail:

1. **Tab state is reflected in the URL.** Maintainers must be able to link to what
   they are looking at. Without this, tabs are worse than one long page.
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
