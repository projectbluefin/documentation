---
title: Factory dashboard content
---

# Factory dashboard content

The `/factory` dashboard (`src/components/HiveFactoryDashboard.tsx` and the panels
under `src/components/factory/panels/`) reports on Bluefin with live data. Chart
titles, summaries and captions are public-facing copy, so they follow the same
rules as any other page — plus a few that are specific to this data.

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

## Charts render to canvas

`src/components/factory/chartTheme.ts` hardcodes a dark palette on purpose:
ECharts renders to canvas, where `var(--fx-*)` custom properties do not resolve.
`factory-theming.test.js` guards the banned severity pairs. HTML/CSS chrome
themes for light/dark via `factory/tokens.css`, but making the charts themselves
theme-reactive is a separate effort — do not sprinkle one-off hex values into a
single panel expecting it to follow the site theme.

## Tests pin the copy

Panel tests assert on rendered titles and headings
(`scripts/*-panels.test.js`). When you change a chart `title`, section heading,
or `Unavailable` `what=` string, update the matching assertion in the same
change.
