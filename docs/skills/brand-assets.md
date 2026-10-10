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
4. **Accent Color**: Only the wordmark's “f” is `#4285f4`; the other letters use the theme-appropriate light/dark variant. Do not use `--wc-gold` or arbitrary blues.
5. **Navbar Setup**: Set `navbar.title: ""` and use `src` / `srcDark` so the wordmark renders without duplicate text.

### Social Preview Cards

- **Tooling**: `scripts/generate-social-cards.mjs` generates Open Graph / Twitter cards (`static/img/meta.png` and `static/img/meta.webp`).
- **Rotation & source**: Fetch the current Night wallpaper from `projectbluefin/artwork/main` on every build. Monthly paths are `wallpapers/NN-bluefin/NN-bluefin-night.jxl`, except November's `.svg`. Do not substitute the old `ublue-os/artwork` PNGs or vendored WebP copies.
- **The rotation happens in CI, not in git.** `.github/workflows/pages.yml` regenerates the card before `npm run build:ci`; its six-hour schedule picks up both month changes and upstream edits without releases or tags. The committed `static/img/meta.*` is only a seed.
- **Decode before Satori.** JPEG XL requires `djxl` from `libjxl-tools`; November's SVG is rasterized with the installed Resvg library. PNG payloads are recognized by their signature, including incorrectly named inputs. `cwebp` from `webp` writes the companion image. Fetch/decode errors fail the build rather than silently preserving an old card.
- **Verify downstream caching separately.** Pages origin advertises `max-age=600`, while the public Cloudflare response advertises `max-age=31536000`. The site default image uses a UTC `YYYY-MM` query key so downstream caches fetch the new month. Blog front-matter `image:` overrides remain independent.
- **Never write PNG bytes to a `.webp` path.** When `cwebp` is missing, leave the existing `static/img/meta.webp` alone rather than producing a mislabelled file.
- **Documentation Signature**: Displays the official Bluefin wordmark accompanied by `"Documentation"` text aligned to the letter baseline with multi-layered drop shadows (`drop-shadow(0 2px 4px rgba(0, 0, 0, 0.95)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.85)) drop-shadow(0 8px 32px rgba(0, 0, 0, 0.75))`).

## Common Rationalizations

- _"We can keep the ublue 'u' icon next to the wordmark."_ Wrong: Bluefin uses the raptor emblem and wordmark; the `u` is dropped.
- _"One SVG is fine for both themes."_ Wrong: Dark lettering is invisible on dark themes; always provide dark and light variants.
- _"A green build proves the current wallpaper shipped."_ Check the generator log and the actual image; cached previews can outlive a deployment.

## Red Flags

- Navbar showing "BLUEfin Bluefin" due to duplicate `navbar.title`.
- Opaque rectangular background behind wordmark on colored headers.
- Re-introducing the glassmorphic ublue `u` icon.
- A social preview card whose wallpaper does not match the current UTC month.

## Verification

- `node --test scripts/brand-assets.test.js scripts/generate-social-cards.test.js` passes.
- `npm run generate-social-cards -- --strict --month 10` and `--month 11` render 2400x1260 cards from the actual upstream JXL and SVG (needs `libjxl-tools` and `webp`).
- `npm test` passes.
- Light and dark theme toggle displays correct contrast wordmark.

## Sources

- `docusaurus.config.ts`
- `static/img/bluefin-wordmark*.svg`
- `docs/press-kit.md`
