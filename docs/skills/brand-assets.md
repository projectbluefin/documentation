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
- Generating social preview Open Graph cards (`static/img/meta.png` and `static/img/meta.webp`).

## When NOT to Use

- Generating embeddable release card PNGs — see [`release-card-images.md`](release-card-images.md).
- Editing `/factory` dashboard panels — see [`factory-dashboard-content.md`](factory-dashboard-content.md).

## Core Process

1. **Asset Source**: Source wordmark SVGs from `projectbluefin/website` (`public/brands/`).
2. **Transparent Background**: Strip any `<rect ... />` elements so SVGs overlay cleanly.
3. **Variants**: Maintain both `bluefin-wordmark-dark.svg` (white lettering) and `bluefin-wordmark-light.svg` (black lettering).
4. **Accent Color**: The "fin" ligature fill is `#4285f4`. Do not use `--wc-gold` or arbitrary blues.
5. **Navbar Setup**: Set `navbar.title: ""` and use `src` / `srcDark` so the wordmark renders without duplicate text.

### Social Preview Cards

- **Tooling**: `scripts/generate-social-cards.mjs` generates Open Graph / Twitter cards (`static/img/meta.png` and `static/img/meta.webp`).
- **Rotation & Pairings**: Bluefin website uses the Day versions of the official monthly wallpapers; the documentation uses the Night versions of the same wallpaper for the month (`static/img/wallpapers/bluefin-NN-night.webp`).
- **Documentation Signature**: Displays the official Bluefin wordmark accompanied by `"Documentation"` text aligned to the letter baseline with multi-layered drop shadows (`drop-shadow(0 2px 4px rgba(0, 0, 0, 0.95)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.85)) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.75))`).

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
