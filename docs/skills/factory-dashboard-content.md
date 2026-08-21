---
name: factory-dashboard-content
description: >-
  Write and verify copy, data, and charts on the /factory dashboard. Use when
  editing a factory panel title or summary, adding a lane or image to the
  dashboard, touching countme adoption numbers, or styling an ECharts chart in
  src/components/factory/.
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

## Brand terminology in panel copy

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

## Only projectbluefin images belong on the dashboard

The GHCR inventory (`scripts/fetch-ghcr-packages.js`) reports images owned by the
`projectbluefin` org only. When adding a lane to `FALLBACK_LANES`, confirm the
image actually belongs to us. Images like `bluefin-toolbox` and `ubuntu-toolbox`
do **not** and were removed. If removing a lane empties a whole UI section,
remove the section too — a permanently-empty panel that says "no data found"
misleads readers into thinking there is a gap.

## countme: match ublue-os/countme, and never trust the seed on its own

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

### An empty re-derive diff does not mean the data is right

This file previously advised that re-running the fetcher and seeing no diff
proved the committed data correct, and that a suspicious number should be
relabelled rather than investigated. That advice was wrong and it is why a 6×
overcount survived: re-running a script only confirms the script is
deterministic, never that its arithmetic is right. When a number looks
implausible, check it against an **independent** source — here, the project's own
published badge — before concluding the data is fine.

## Charts follow the site theme

`src/components/factory/chartTheme.ts` reads the `--fx-*` tokens off the live
DOM with `getComputedStyle`. ECharts paints to canvas, where `var(--fx-*)` in a
style string does **not** resolve — that fact was previously used to justify a
hardcoded dark palette, which then survived the light-mode switch and left axis
labels near-white on white. `getComputedStyle` resolves custom properties fine,
so read them rather than duplicating them.

Rules:

- **Never put a hex literal in a chart option.** Use `useSeverityColors()` for
  severity series and `useChartColors()` for label/text colours, both from
  `src/components/factory/useFactoryTheme.ts`. `factory-theming.test.js` fails
  the build on a hex in any panel.
- **Axis styling is applied per-axis**, by `applyAxisTheme()` in `EChart`.
  `categoryAxis` / `valueAxis` are _theme_ keys that ECharts only honours via
  `registerTheme`; putting them in an option object does nothing at all, silently.
- **Severity tokens branch on theme.** `tokens.css` carries the light-mode
  intensities and a `[data-theme="dark"] .fxRoot` block overrides them. The
  light set is dark by design — that is what gives it contrast on white, and
  exactly what makes it vanish on the dark surface.
- `EChart` repaints on `data-theme` changes via a `MutationObserver`. A chart is
  painted once; without that, toggling the theme leaves the old palette on the
  canvas until something else changes the option.

**Check both themes before claiming a visual fix.** A dashboard that is only
ever opened in dark mode hides half its contrast bugs.

## Tests pin the copy

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
