# 0007. Weekly active systems from the first-party countme aggregate

- **Status:** Accepted
- **Date:** 2026-09-12
- **Deciders:** castrojo

## Context

ADR 0006 and commit `f846c652` removed every `projectbluefin` image from the
Fedora CSV pipeline. `scripts/lib/countme-sources.mjs` now states the rule as
code: a Project Bluefin count may come only from `countme.projectbluefin.io`,
with one exception, `ublue-os/bluefin:stable`, whose number is upstream's to
publish. `scripts/countme-first-party.test.js` fails the build on a violation.

That removal left no replacement. Verified at the time of this record:

- `/analytics` rendered `Weekly active systems unavailable` on the deployed
  site. The panel was a hardcoded `Unavailable` with no data wiring.
- `static/data/countme-history.json` carries `aurora`, `bazzite`, and `fedora`
  only, and declares `data-analysis.fedoraproject.org` as its source — a literal
  `FORBIDDEN_SOURCES` match for any Project Bluefin series.
- `projectbluefin/countme` does not exist. `api.github.com/repos/projectbluefin/countme`
  returns 404 and every raw artifact path under it returns 404.
- The worker resolved all first-party chart routes to that nonexistent
  repository, so `/`, `/growth.svg`, and every per-image route returned the
  placeholder SVG unconditionally.
- The worker already recorded pings into D1 (`telemetry_events`), so the
  measurements existed; nothing read them back.

## Decision

The D1 table behind `countme.projectbluefin.io` is the source for every Project
Bluefin count, and the worker exposes it.

1. The worker aggregates `telemetry_events` into Monday-anchored weekly counts
   per repo and serves `GET /counts.json`, shaped like the existing dataset
   contract: `generatedAt`, `source`, `method`, `unit`, `variants`, `weeks[]`,
   with optional `unavailable` and `stateReason`.
2. Every week carries every first-party repo key, holding either a value or
   `null`. A gap is explicit rather than inferred from an absent key, and a
   recorded `0` stays `0`.
3. Per-image chart and badge routes render from the same aggregate. The three
   legacy routes — `/growth_bluefins.svg`,
   `/sources/ublue-os/bluefin/growth.svg`, and `/badge-endpoints/bluefin.json` —
   continue to proxy `ublue-os/countme`, and nothing else does.
4. `/analytics` reads `/counts.json` at runtime and renders the panel from it,
   falling back to a reasoned `Unavailable` when the service reports no weeks.
5. `connect-src` in `docusaurus.config.ts` gains `https://countme.projectbluefin.io`.

### Chart types

- **Weekly active systems — multi-series line, zero-anchored, `connectNulls`
  off, `smooth` off.** These are discrete weekly readings. A spline invents
  values between measurements and a connected null bridges a week nobody
  reported; both are claims the data does not support. The y-axis is anchored at
  zero because a floating floor turns a flat series into a cliff.
- **Series are separated by dash pattern and marker shape, not hue.** The
  Bluefin categorical ramp is six shades of one blue, so hue alone cannot tell
  two series apart. `seriesDash` already existed for this; marker shapes were
  added alongside it. Both survive greyscale and colour-blind reading.
- **Per-image SVG routes — single-series line with the current value printed as
  text**, and an `accumulating data` panel below two points, so a chart embedded
  outside the site carries the same guarantees as one inside it.

### Where the first-party reader lives

`src/components/analytics/firstPartyCountme.ts`, not in the component.
`scripts/countme-first-party.test.js` forbids one file from holding both a
catalogue of Project Bluefin image ids and a computed index into a countme week,
because that pairing twice published a Fedora-derived number under a Project
Bluefin name. The component holds the catalogue; the reader holds the week keys.
Splitting them keeps the gate a gate instead of an exemption list.

## Scope

**In scope:**

- `workers/countme-proxy/{index,routes,render}.mjs` and its tests.
- The weekly active systems panel in
  `src/components/analytics/CountmeAnalyticsCharts.tsx`.
- `src/components/analytics/firstPartyCountme.ts`.
- The `connect-src` entry in `docusaurus.config.ts`.

**Out of scope:**

- `scripts/fetch-countme.js` and the upstream peers pipeline. It correctly
  publishes `aurora`, `bazzite`, and `fedora`, and this record does not reopen
  that decision.
- The publication matrix and the churn panels.
- Any change to `ublue-os/*`.
- Retention, sampling, or deduplication policy for `telemetry_events`.

## Consequences

Dakota, Utah, and Server report `accumulating data` until clients ping, and that
is the honest state rather than a placeholder. Bluefin and Bluefin LTS restart
from the first-party epoch, so the published series is shorter than the retired
Fedora one and the two are not comparable; the method field records which is
which.

The page now depends on a service at request time rather than on build-time
data, so a worker outage degrades the panel to its reasoned unavailable state
instead of showing stale numbers. The `<details>` table and the summary keep the
numbers reachable when the canvas does not paint.

A count is now a measurement of pings, not of DNF metalink hits. It cannot be
reconciled against Fedora's counters, and should not be presented as if it could.

## Alternatives considered

**Keep reading `countme-history.json` for Project Bluefin images.** Rejected: it
is Fedora-derived, `isPermittedSource` rejects it, and it no longer carries the
keys at all.

**Point the chart routes at `ublue-os/countme` until first-party data
accumulates.** Rejected: that is the EPEL-summed series ADR 0006 and `f846c652`
removed. `/badge-endpoints/bluefin-lts.json` was the live instance of this and
now serves from D1.

**Create a `projectbluefin/countme` repository mirroring the upstream layout.**
Rejected: it duplicates ingestion the worker already performs, adds a scheduled
job and a second source of truth, and the D1 rows are already the measurement.

**Generate the aggregate at build time into `static/data/`.** Rejected: counts
accumulate continuously while the site rebuilds only on merge, so the published
number would age with the deployment rather than with the data.

**Log y-axis to fit Fedora's magnitude alongside Bluefin's.** Rejected here: the
panel no longer plots Fedora, so the range that motivated it is gone, and a log
axis is easy to misread on a page that does not otherwise use one.

## Addendum, 2026-09-12: game mode and the upstream panel

Two follow-on decisions, taken after the first deployment.

### Game mode is an attribute, not an image

Clients report game mode two ways: a `-gaming` repo id, and a `gamemode=1`
parameter. Live D1 carried both — `dakota-gaming` with `gamemode=1`, and a
`bluefin` row also flagged `gamemode=1` — so this is not a Dakota-specific
image. Treating `dakota-gaming` as its own repo would have split Dakota's
population in two and left a phantom image in the catalogue.

The service normalizes the repo id and folds both spellings into the base
image. `weeks[i][repo]` is the whole population, including game mode.
`weeks[i].gaming[repo]` is the part of it that was in game mode. The two are a
population and its share, never addends: `gaming[repo] <= weeks[i][repo]` holds
for every repo and week, and a test asserts it.

A repo that reported with nobody in game mode is `0`, not `null` — a real
measurement, distinct from a week it did not report at all. The page draws a
game-mode series only for images with a non-zero reading, so a flat zero never
implies a population nobody measured. Each game-mode series carries its parent
image's colour with a dotted stroke, so it reads as a share of the line above
it rather than as a separate image, and the current split is stated in words
next to the image's number.

Payload method bumped to `first-party-d1-v2`.

### The upstream image is shown alongside

`ublue-os/bluefin:stable` is published on the page next to the first-party
counts, so the migration between the two is visible rather than inferred. This
is `UPSTREAM_ALLOWED`, the single permitted upstream series, and it is read
through our own worker's existing legacy routes.

Upstream publishes rendered matplotlib SVGs and a rounded badge value, and no
time-series file. The panel therefore embeds the chart upstream publishes
instead of replotting a series that does not exist, and states the badge's
value as its current number. The image is framed rather than recoloured:
altering another project's published chart would misrepresent it.

The two series are not the same quantity — the legacy one counts DNF metalink
hits, the first-party one counts image check-ins — and the panel says so rather
than inviting a subtraction.
