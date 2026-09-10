---
name: brand-assets
version: "1.0"
last_updated: "2026-09-06"
id: brand-assets
one_line_purpose: Maintain and use Bluefin wordmarks, raptor emblem, and branding assets.
entry_point: docs/skills/brand-assets.md
category: meta
status: active
tags: [branding, wordmark, logo, svg, theme]
description: >-
  Maintain and use Bluefin wordmarks, raptor emblem, and branding assets. Use
  when adding or updating logos, navbar branding, press kit graphics, or
  styling components with brand accent colors.
metadata:
  type: procedure
---

# Brand assets

Project Bluefin uses the unified Bluefin wordmark and raptor emblem across the
website and documentation. The legacy Universal Blue `u` logo is dropped from all
primary branding.

## When to Use

- Updating top navigation branding or favicons.
- Adding or modifying Bluefin logo graphics or wordmarks.
- Referencing official brand colors in themes or charts (`#4285f4`).
- Documenting press kit assets.

## When NOT to Use

- Generating embeddable release card PNGs — see [`release-card-images.md`](release-card-images.md).
- Editing `/factory` dashboard panels — see [`factory-dashboard-content.md`](factory-dashboard-content.md).

## Core Process

1. **Asset Source**: Source wordmark SVGs from `projectbluefin/website` (`public/brands/`).
2. **Transparent Background**: Strip any `<rect ... />` elements so SVGs overlay cleanly.
3. **Variants**: Maintain both `bluefin-wordmark-dark.svg` (white lettering) and `bluefin-wordmark-light.svg` (black lettering), as well as documentation-specific wordmarks (`bluefin-documentation-wordmark*.svg`).
4. **Accent Color**: The "fin" ligature fill is `#4285f4`. Do not use `--wc-gold` or arbitrary blues.
5. **Navbar Setup**: Set `navbar.title: ""` and use `src` / `srcDark` so the wordmark renders without duplicate text.

## Social Preview Cards

The documentation's Open Graph and social preview card (`static/img/meta.png`) is generated from the official Bluefin desktop wallpaper pool:

- **Style Parity**: Mirrors the projectbluefin/website social card signature layout with pristine artwork vibrancy, multi-layered letter drop shadows, and no muddy background scrim.
- **Calendar Alignment**: The website uses the Day calendar and the documentation uses the matching Night calendar (e.g. September docs uses `bluefin-09-night.webp`).
- **Wordmark & Typography**: Uses the "bluefin documentation" wordmark with `BLUE` in Audiowide and `fin documentation` set in Science Gothic.
- **Pre-rendered Library**: Static cards are pre-rendered in `static/cards/` (36 allowed wallpapers: 24 monthly pairs, 12 wolves story illustrations).
- **Generator**: Run `npm run generate:social-cards` to update `static/img/meta.png`.

## Common Rationalizations

- _"We can keep the ublue 'u' icon next to the wordmark."_ Wrong: Bluefin uses the raptor emblem and wordmark; the `u` is dropped.
- _"One SVG is fine for both themes."_ Wrong: Dark lettering is invisible on dark themes; always provide dark and light variants.

## Red Flags

- Navbar showing "BLUEfin Bluefin" due to duplicate `navbar.title`.
- Opaque rectangular background behind wordmark on colored headers.
- Re-introducing the glassmorphic ublue `u` icon.

## Verification

- `node --test scripts/brand-assets.test.js` passes.
- `npm test` passes.
- Light and dark theme toggle displays correct contrast wordmark.

## Sources

- `docusaurus.config.ts`
- `static/img/bluefin-wordmark*.svg`
- `docs/press-kit.md`
