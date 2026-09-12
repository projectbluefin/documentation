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

Contribution setup and hosted leaderboard links use
`https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev`. Link to the
hosted Hive for interactive contribution flows; do not recreate its setup UI in
the docs dashboard.

Individual contributor cards and rows link to
`https://hosted-projectbluefin-common-nmq5.hive.hivecommons.dev/contribute/dossier/{username}`.
The dossier owns contributor-specific Hive statistics and milestones.

`/leaderboards` is a standalone docs page, not a Factory tab. It owns the
shared Hive data provider directly; do not add top-level pages to
`FACTORY_ROUTES`.

`scripts/fetch-hive-history.js` derives its contributor scope from the
`projectbluefin` Hive registry entry's `repos` array. Its fallback is only a
last verified registry snapshot for source outages; do not use it as the normal
repository scope.

The public Hive registry accepts anonymous requests. Do not forward GitHub
authorization to it.

### countme: match ublue-os/countme, and never trust the seed on its own

The adoption numbers come from Fedora's public countme totals CSV
(`scripts/fetch-countme.js` → `static/data/countme-history.json`, a tracked
seed).

**The canonical implementation is [`ublue-os/countme`](https://github.com/ublue-os/countme),
not this repository.** It produces the `growth_*.svg` charts embedded on
`/analytics` and the "Active Users" badges in project READMEs. Our script exists
only because those outputs are a rendered chart and a single latest number, while
the dashboard needs the weekly series as data. The counting rules in
`scripts/fetch-countme.js` are ported from that project's `data_processing.py`
and are documented in our file header. **If a number here disagrees with the
badge there, this repository is wrong.** Check it:

```bash
curl -s https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json
```

The two rules that are easy to get wrong, and were wrong until ADR 0004:

- **A hit is not a device.** DNF sends countme once a week for _each_
  countme-enabled repo, so one machine appears under ~19 repo tags. Restrict to
  the base `^fedora-[0-9]+$` repo. Bluefin LTS is exempt — it is CentOS Stream
  based, has no `fedora-N` repo, and is counted across its EPEL repos.
- **`sys_age = -1` is a different metric, not a subtotal.** `mirrors-countme`
  runs a second pass (`BucketSelectUniqueIP`) that writes a legacy unique-IP
  estimate into the same table under that sentinel. Summing it with the real
  `sys_age` 1–4 rows stacks two metrics together.

"Weekly active devices" is now the correct label, matching the upstream chart
title. Bluefin LTS must carry its EPEL caveat wherever it is charted.

#### An empty re-derive diff does not mean the data is right

This file previously advised that re-running the fetcher and seeing no diff
proved the committed data correct, and that a suspicious number should be
relabelled rather than investigated. That advice was wrong and it is why a 6×
overcount survived: re-running a script only confirms the script is
deterministic, never that its arithmetic is right. When a number looks
implausible, check it against an **independent** source — here, the project's own
published badge — before concluding the data is fine.

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
- A countme series summed across all repo tags, or including `sys_age = -1`.
- A panel that renders nothing rather than saying it is unavailable and why.
- A changed chart title with no matching update in `scripts/*-panels.test.js`.

## Verification

- [ ] `node --test scripts/factory-theming.test.js scripts/tests-panels.test.js`
      passes.
- [ ] Panel copy matches [`/press-kit`](/press-kit) vocabulary.
- [ ] Adoption numbers agree with the upstream badge from
      [`ublue-os/countme`](https://github.com/ublue-os/countme).
- [ ] The dashboard was opened in **both** light and dark mode.
- [ ] Every unavailable panel states a reason —
      `scripts/panel-unavailability.test.js` passes.
- [ ] No new empty sections.

## Sources

- [`/press-kit`](/press-kit) — brand vocabulary for panel copy.
- [`ublue-os/countme`](https://github.com/ublue-os/countme) — canonical
  counting implementation; `data_processing.py` is the reference for
  `scripts/fetch-countme.js`.
- `scripts/fetch-countme.js`, `scripts/fetch-ghcr-packages.js` — data
  pipelines; counting rules documented in their file headers.
- `src/components/factory/chartTheme.ts`,
  `src/components/factory/useFactoryTheme.ts` — theme-token plumbing.
- [`adr/0004-countme-counting-method.md`](https://github.com/projectbluefin/documentation/blob/main/adr/0004-countme-counting-method.md)
  — why a hit is not a device and `sys_age = -1` is excluded.
