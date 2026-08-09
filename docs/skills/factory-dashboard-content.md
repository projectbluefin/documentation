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

## countme is check-ins, not devices

The adoption numbers come from Fedora's public countme totals CSV
(`scripts/fetch-countme.js` → `static/data/countme-history.json`, a tracked
seed). Two things to remember:

- The values are **real**. Before "fixing" a suspicious number, verify against
  source: `node scripts/fetch-countme.js --force` re-derives the file from
  Fedora's CSV. If the diff is empty, the committed data is correct — relabel or
  reinterpret rather than editing the seed.
- countme is a weekly **check-in estimate**, not a device census. Label the panel
  "countme check-ins", never "active devices", so a low number (e.g. new LTS) is
  not read as a literal install base.

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
