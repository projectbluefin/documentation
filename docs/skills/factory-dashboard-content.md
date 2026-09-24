---
name: factory-dashboard-content
version: "1.1"
last_updated: "2026-09-06"
id: factory-dashboard-content
one_line_purpose: Write and verify copy, data, and charts on /factory.
entry_point: docs/skills/factory-dashboard-content.md
category: meta
status: active
tags: [factory, dashboard, echarts, theming]
description: >-
  Write and verify copy, data, and charts on the /factory dashboard. Use when
  editing a factory panel title or summary, adding a lane or image to the
  dashboard, touching countme adoption numbers, or styling an ECharts chart in
  src/components/factory/.
metadata:
  type: procedure
---

# Factory dashboard content

The `/factory` dashboard (`src/components/HiveFactoryDashboard.tsx` and the panels
under `src/components/factory/panels/`) reports on Bluefin with live data. Chart
titles, summaries and captions are public-facing copy, so they follow the same
rules as any other page — plus a few that are specific to this data.

## When to Use

- Editing a panel title, summary, caption, or `Unavailable` reason.
- Adding or removing an image lane on the dashboard.
- Changing countme adoption numbers or their labels.
- Styling an ECharts chart under `src/components/factory/`.

## When NOT to Use

- The embeddable release card PNGs — see
  [`release-card-images.md`](release-card-images.md).
- Data-pipeline contracts in general — those are in
  [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md) → _Data pipelines_.

## Core Process

### Brand terminology in panel copy

Panel titles and summaries must follow [`/press-kit`](/press-kit). In practice:

- **Never** call Bluefin or its peers an "immutable distribution" or an
  "immutable desktop" — the press kit bans it, and there is no such thing as an
  "immutable desktop". Bluefin is a bootc image / a cloud-native operating
  system.
- The peers shown in the ecosystem and Flathub comparisons — Bluefin, Bluefin
  LTS, Aurora, Bazzite — are Universal Blue **cloud-native desktops** (or just
  "images"). Fedora is the shared base they build on, not a peer image.
- Do not invent grouping terms. "peer immutable distributions" was made up;
  "peer cloud-native desktops" is accurate.

### Only projectbluefin images belong on the dashboard

The GHCR inventory (`scripts/fetch-ghcr-packages.js`) reports images owned by the
`projectbluefin` org only. When adding a lane to `FALLBACK_LANES`, confirm the
image actually belongs to us. Images like `bluefin-toolbox` and `ubuntu-toolbox`
do **not** and were removed. If removing a lane empties a whole UI section,
remove the section too — a permanently-empty panel that says "no data found"
misleads readers into thinking there is a gap.

### Hosted Hive flows stay hosted

The standalone `/leaderboards` page presents contribution statistics; do not
duplicate hosted Hive setup controls there. Link individual contributor rows to
their hosted dossiers rather than building another profile surface.

Individual contributor cards and rows link to
`https://hosted-projectbluefin-common-nmq5.hive.hivecommons.dev/contribute/dossier/{username}`.
The dossier owns contributor-specific Hive statistics and milestones.

`/leaderboards` is a standalone docs page, not a Factory tab. It owns the
shared Hive data provider directly; do not add top-level pages to
`FACTORY_ROUTES`.

`scripts/fetch-hive-history.js` discovers active project repositories through
the GitHub API. It excludes `projectbluefin/lab` and archived repos, includes
the two explicitly tracked factory forks (`dakota-iso`, `chairlift`), and uses
the verified fallback list during discovery failures.

### Contributor leaderboard and freshness rules

- **Ranked by Hive tasks, not commits:** On `/leaderboards`, all panels
  (`ContributorLeaderboard`, `ContributorWall`, `HiveTaskLeaderboard`) rank
  contributors by all-time Hive tasks completed via `hiveHistory.hiveContributorTiers[login].tasks`.
  Commits are not used for ranking. Period tabs (season/month/week) and commit
  sparklines are omitted because Hive tasks represent all-time completed work.
- **Hosted Hive API source:** Human trust tiers and task completions are snapshotted
  at build/cache time from the hosted Hive instance's `/api/leaderboard` endpoint
  (`leaderboard[]`). Autonomous agents (`trust_tier: "agent"`) and bots are excluded.
  The central registry leaderboard is agents-only and is not used for human rankings.
- **Resilient refresh prevents corrupted partial state:** Network fetches for
  all-time contributors and weekly stats validate every repository response. If
  all repositories fail, prior data is preserved, timestamps are not bumped, and
  an explicit error notice (`contributorError`, `weeklyStatsError`) is recorded.
- **Agents are not humans:** Autonomous agent accounts carry `trust_tier: "agent"`
  in the Hive registry and must be excluded from attributed contributor cards.
  System accounts like `web-flow` also require exclusion. A GitHub login or
  profile bio does not establish who produced a commit.
- **Graceful partial handling for computing endpoints:** When a busy repository
  returns 202 while GitHub computes stats, available repositories are still folded
  in, and an explicit notice indicates in-flight status without freezing all data.
- **Unavailability is visible:** Neither the contributor table nor the task grid
  collapses silently when filtered or quiet. Render an explicit notice when zero
  human entries remain. When `hiveContributorTiers` is empty (such as on a fresh
  checkout or prior to `update-hive-cache.yml`'s initial post-merge run),
  panels render an explicit "Hive task data unavailable" notice (incorporating
  `milestonesError` if present) rather than displaying misleading zeros or empty tables.
- **Publishing cadence matches cache TTL:** `pages.yml` publishes on a 6-hour
  schedule (`0 */6 * * *`) aligned with the data refresh horizon.
- **Recent Milestones ledger of teamwork:** The Recent Milestones leaderboard celebrates
  collaborative milestones alongside individual standings:
  - Tracks contributors levelling up trust tiers (Contributor, Trusted, Merger, Advisor),
    crossing task landmarks (1, 10, 25, 50, 100, 250, 500 tasks shipped), and reaching
    project breadth thresholds (2, 3, 5, 7, 10 distinct repos) in the GNOME release cycle.
  - Hive tier promotions and landmark thresholds mirror `hivecommons/hive`
    `src/pkg/dashboard/me_profile.go` (`taskShippedMilestones`, `tierRankValue`).
  - Hive milestone events are diffed between runs and stored in `hive-history.json`
    via `update-hive-cache.yml` (labeled "detected <date>").
  - Season breadth unlocks are recomputed fresh per release into
    `history.season.breadthUnlocks` (dated by the commit landed time) to avoid
    cache pollution.
  - A baseline run without prior diff state displays "Milestone ledger accumulating".

### GNOME release seasons on /leaderboards

- Read the latest **published** GNOME release from
  [`release.gnome.org/atom.xml`](https://release.gnome.org/atom.xml), then read
  its official release notes heading for the nickname. GNOME 51 is **A Coruña**,
  published September 16, 2026 at 00:00 UTC; do not infer a release from an OS
  image version or reuse a nickname for the next GNOME release.
- A season starts at the release timestamp. Count only default-branch
  **non-merge** commits (`parents.length <= 1`) whose committer timestamp lands
  within the season and whose GitHub author resolves to a login. GitHub's
  `/stats/contributors` excludes merge commits; including them here inflates the
  season relative to Month and Week. Keep `parents` when projecting the
  `/commits` response. Fetch every page with `since` and `until`; a partial
  repository response cannot become a complete season. The all-time
  `/contributors` count is a separate contract and never resets.
- Keep the last complete season if discovery or collection fails, with a
  visible `seasonError`. If no season has been collected, show unavailability,
  not zero. The tracked `static/data/hive-history.json` is only a seed; inspect
  `lastContributorFetch` and `season.updatedAt` in the published JSON when
  auditing freshness.
- Use the actual light/dark Bluefin wordmark assets for the page heading: only
  the **f** has the brand-blue accent. On narrow layouts, keep “Leaderboards”
  horizontally aligned with the mark. Broken hosted contribution tiles do not
  belong above the standings.

The public Hive registry accepts anonymous requests. Do not forward GitHub
authorization to it.

### CountMe: first-party stream counts only

`/analytics` reads `https://countme.projectbluefin.io/counts.json` at runtime.
The Worker aggregates D1 events; `scripts/lib/countme-sources.mjs` allows only
`dakota` as a first-party published repo today. This image is labeled
**Bluefin**. The older upstream artifact is **Bluefin Classic** and remains
separate. Fedora's `totals.csv` and the tracked `countme-history.json` are not
sources for a Project Bluefin image count.

- The Dakota client reports one successful check-in per UTC Monday-anchored
  week, with a booted `stable` or `testing` tag. Its daily calendar retry does
  not send another ping after a successful report that week. No machine ID is
  transmitted, so the totals estimate active systems rather than count
  distinct devices.
- `/counts.json` keeps the all-tag Dakota total for existing consumers, but
  additionally publishes nullable `dakotaStable`, `dakotaTesting` and
  `dakotaUnclassified` readings. Only exact tags belong to named streams;
  `latest`, missing or ambiguous tags stay unclassified. Game mode is a subset
  of check-ins, not a separate image or a third stream.
- The first chart plots stable and testing only, on one zero-anchored domain.
  Its text dates each last measured reading and labels the in-progress UTC
  week using `generatedAt`. Missing is `null`, never zero; unclassified pings
  are disclosed separately rather than attributed to either line.
- The cards read **Bluefin**, **Bluefin Utah**, **Bluefin Classic**, in that
  order. Bluefin Utah is fed by `https://countme.projectbluefin.io/v1/daily.json`
  (daily `projectbluefin-countme` pings, one row per day and image), read with
  `familyDaily(rows, "utah")` in `firstPartyCountme.ts`. It plots systems
  active **per day** by stream; never add days together into weekly users.

Verify suspicious numbers against the read-only D1 rows grouped by `repo`,
`tag` and UTC week, then compare `/counts.json`. Re-running a fetcher only
proves determinism. Never send a synthetic production ping to test a chart.

### Charts follow the site theme

ECharts paints to canvas, where `var(--fx-*)` in an option string does **not**
resolve. That fact was once used to justify a hardcoded dark palette, which
survived the light-mode switch and left axis labels near-white on white.
`getComputedStyle` resolves custom properties fine, so the palette is read from
the DOM at init instead:

`EChart.tsx` → `resolvePalette()` reads the `--fx-*` tokens off the mounted
element, `chartTheme.ts` → `fxEchartsTheme()` turns them into an ECharts theme
object, and `core.registerTheme()` + `core.init(el, "fx")` install it.

Rules:

- **`FX_CHART_THEME` carries no colours.** It is spread over every option, so
  anything coloured in it would override the registered theme in both modes.
  Colour belongs in the registered theme or in the panel's own series.
- **`categoryAxis` / `valueAxis` are theme keys, not option keys.** ECharts
  honours them only through `registerTheme`; putting them in an option object
  does nothing at all, silently.
- **The chart must live inside `.fxRoot`.** The tokens are scoped to that class,
  so a chart mounted outside it silently falls back to the dark literals in
  `FX_COLORS`. A standalone page imports `src/components/factory/tokens.css` and
  wraps its root — see `src/pages/leaderboards.tsx` and
  `src/components/analytics/CountmeAnalyticsCharts.tsx`.
- **A theme flip disposes and re-inits the instance.** `EChart` watches
  `data-theme` with a `MutationObserver`. The re-init is keyed on a **counter**,
  not a `ready` boolean: a dispose/re-init pair that lands in one React batch
  coalesces `false`→`true` into no state change, the `setOption` effect never
  re-runs, and the fresh canvas stays blank.
- **Register every component you use.** `EChart`'s `core.use([...])` list is the
  whole allowlist. A missing `TitleComponent` does not throw — the titles simply
  never paint. Add the component in the same change as the chart that needs it.
- **Turn the shared legend off when it is wrong.** A single-series heatmap gets
  a legend that lands on the axis labels, and a multi-grid chart that titles its
  own lanes gets the same five names repeated underneath. Both pass
  `legend: { show: false }`.
- **A heatmap needs the table pivot.** `toTableRows` detects
  `type: "heatmap"` and rebuilds the y-by-x grid from each cell's `text`. Without
  it the `<details>` table lists raw `[x, y, value]` triples and the screen
  reader is told less than the sighted reader.

**Check both themes before claiming a visual fix.** A dashboard that is only
ever opened in dark mode hides half its contrast bugs.

### Only tracked seeds may be imported

`import data from "@site/static/data/thing.json"` works only for the seeds
tracked in git. Everything else under `static/data/` is generated by
`npm run build` and absent from a fresh worktree, from `build:ci`, and from any
checkout that has not run the fetchers — a static import of one fails the whole
build instead of rendering a panel that explains itself.

Check before importing:

```bash
git ls-files static/data/ | grep thing.json
```

No match means fetch it at runtime from `/data/thing.json` and render
`Unavailable` with the reason on failure, the way `FactoryDataProvider` and
`CountmeAnalyticsCharts` do.

### The catalogue drives the grid, and source drives the catalogue

`/analytics` plots every image family `projectbluefin/common` ships into against
every promotion stream. The row set comes from `BLUEFIN_FAMILY_IMAGES` in
`src/components/analytics/CountmeAnalyticsCharts.tsx`; the GHCR snapshot only
fills the cells in.

That order matters. If the snapshot drove the rows, an image that stopped
publishing would quietly vanish from the grid and the page would look healthy.
Driven by the catalogue, it keeps its row and the cell reads `—`.

**The catalogue is derived from each repository's `execute-release.yml`
promotion matrix — not from `common` → `docs/skills/image-registry.md`.** That
file is a convenient summary and it was wrong on three counts when this chart
was built against it:

- It claims `bluefin-lts` promotes `:testing` → `:lts` with `:stable` as a
  floating alias. Every repo's release workflow targets `stable`. There is no
  `:lts` promotion, so an `:lts` column is a column of dashes.
- It lists `bluefin-lts-hwe` and `bluefin-lts-hwe-nvidia` as live. They answer
  in the registry but appear in no promotion matrix — they are retired, and
  charting them as lanes shows two permanently-stale rows that nobody owns.
- It omits `bluefin-lts-nvidia`, `dakota-gaming` and `dakota-nvidia-gaming`
  entirely. All three are promoted; none could appear on the dashboard, because
  `FALLBACK_LANES` in `scripts/fetch-ghcr-packages.js` had been written from the
  same summary.

Re-derive before editing either list:

```bash
for r in bluefin bluefin-lts dakota; do
  gh api "repos/projectbluefin/$r/contents/.github/workflows/execute-release.yml" \
    --jq .content | base64 -d | grep -E '"image"'
done

# Cross-check against the registry, which answers anonymously:
tok=$(curl -s "https://ghcr.io/token?scope=repository:projectbluefin/dakota-gaming:pull" | jq -r .token)
curl -s -H "Authorization: Bearer $tok" https://ghcr.io/v2/projectbluefin/dakota-gaming/tags/list | jq '.tags'
```

**`FALLBACK_LANES` is not a nicety — in CI it is the only list.**
`github.token` is repository-scoped and cannot list an org's packages, so the
Packages API returns nothing and the fetcher falls back to those lanes every
time. An image missing from it is an image the dashboard can never show,
however correct the component is. `scripts/fetch-ghcr-packages.test.js` pins
`PROMOTED_IMAGES ⊆ FALLBACK_LANES`.

Two more distinctions the matrix keeps straight:

- **Retired tags stay out of the columns.** `:latest`, `:gts` and `:lts` still
  sit on some images from older schemes. They are named in the panel note and
  the retired images are named on their family card.
- **Bluefin Server ships a DDI**, not a container tag, so it is a counted family
  with no row in the OCI matrix at all — `delivery: "ddi"` marks it.

### Tests pin the copy

Panel tests assert on rendered titles and headings
(`scripts/*-panels.test.js`). When you change a chart `title`, section heading,
or `Unavailable` `what=` string, update the matching assertion in the same
change.

## Common Rationalizations

| Rationalization                                    | Reality                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| "'Immutable distro' is what everyone calls it."    | The press kit bans it and the thing does not exist. Bluefin is a bootc image.     |
| "I need a grouping term, I'll coin one."           | Coined terms publish as fact. Use the press kit's vocabulary or none.             |
| "Re-ran the fetcher, no diff — the data is right." | That proves determinism, not arithmetic. Check an independent source.             |
| "The number looks off, I'll relabel the chart."    | Relabelling hid a 6× overcount. Investigate the arithmetic instead.               |
| "A hex is fine, it's just this one series."        | `factory-theming.test.js` fails the build, and it survives the next theme switch. |
| "Looks good in dark mode."                         | Half the contrast bugs only appear in light. Check both.                          |
| "An empty panel is harmless."                      | It reads as a real gap in the data. Remove the section instead.                   |

## Red Flags

- The words "immutable distribution", "immutable desktop", or any invented
  grouping term in panel copy.
- A hex colour literal in a chart option anywhere under `src/components/factory/`.
- `categoryAxis` or `valueAxis` set inside an option object rather than applied
  by `applyAxisTheme()`.
- A lane in `FALLBACK_LANES` for an image the `projectbluefin` org does not own.
- An unclassified count attributed to `:stable` or `:testing`, or a
  Fedora-derived number labeled as a Project Bluefin image.
- A panel that renders nothing rather than saying it is unavailable and why.
- A changed chart title with no matching update in `scripts/*-panels.test.js`.

## Verification

- [ ] `node --test scripts/factory-theming.test.js scripts/tests-panels.test.js`
      passes.
- [ ] Panel copy matches [`/press-kit`](/press-kit) vocabulary.
- [ ] Named stream counts agree with exact `stable`/`testing` D1 tags; other
      Dakota tags remain unclassified.
- [ ] The dashboard was opened in **both** light and dark mode.
- [ ] Every unavailable panel states a reason —
      `scripts/panel-unavailability.test.js` passes.
- [ ] No new empty sections.
- [ ] `node --test scripts/gnome-season.test.js scripts/leaderboards-standalone.test.js`
      passes; GNOME release rollover resets seasonal counts but leaves all-time
      totals intact.
- [ ] `/leaderboards` is readable at desktop and 390px in both themes; the
      wordmark and heading remain on one line with no horizontal overflow.

## Sources

- [`/press-kit`](/press-kit) — brand vocabulary for panel copy.
- `workers/countme-proxy/counts.mjs`,
  `src/components/analytics/firstPartyCountme.ts`, and
  `scripts/lib/countme-sources.mjs` — first-party counting contract.
- [`ublue-os/countme`](https://github.com/ublue-os/countme) — upstream source
  only for separately labeled Bluefin Classic.
- `scripts/fetch-ghcr-packages.js` — image publication, not countme adoption.
- `src/components/factory/chartTheme.ts`,
  `src/components/factory/useFactoryTheme.ts` — theme-token plumbing.
- [GNOME release Atom feed](https://release.gnome.org/atom.xml) and
  [GNOME 51 release notes](https://release.gnome.org/51/) — canonical release
  version, published UTC boundary, and nickname.
- Apache ECharts official handbook `/apache/echarts-handbook` — category/value
  line-axis configuration used through the local `EChart` wrapper.
- [`adr/0004-countme-counting-method.md`](https://github.com/projectbluefin/documentation/blob/main/adr/0004-countme-counting-method.md)
  — why a hit is not a device and `sys_age = -1` is excluded.
