---
name: release-card-images
description: >-
  Generate and debug the embeddable release card PNGs served from
  /img/cards/. Use when a card shows a stale or missing version, when adding a
  card for a new image stream, when changing card layout, or when
  scripts/generate-card-images.mjs skips a slug.
---

# Release card images

`scripts/generate-card-images.mjs` renders the embeddable PNG cards that other
repositories hotlink from their READMEs:

```
https://docs.projectbluefin.io/img/cards/{bluefin,bluefin-lts,dakota}-{light,dark}.png
```

The PNGs are gitignored and regenerated during the CI build, so **a card is only
as fresh as the data source it reads**. A card that reads a constant will look
correct forever and be wrong within a month.

## When to Use

- A published card shows the wrong version, or no version.
- Adding a card for a new image stream.
- Changing `scripts/lib/card-template.mjs` layout or styling.
- The generator logs a skipped slug during the build.

## When NOT to Use

- Panels and charts on `/factory` — see
  [`factory-dashboard-content.md`](factory-dashboard-content.md).
- The pinned release cards rendered in React on `/changelogs` — those are
  components, though they must agree with the PNGs (see below).

## Every card reads a live source

| Card          | Source                                                     |
| ------------- | ---------------------------------------------------------- |
| `bluefin`     | `static/feeds/bluefin-releases.json` + SBOM enrichment     |
| `bluefin-lts` | `static/feeds/bluefin-lts-releases.json` + SBOM enrichment |
| `dakota`      | `static/data/sbom-attestations-frontend.json` (SBOM only)  |

Dakota has no release-notes feed to parse, so `buildDakotaRelease()` in
`scripts/lib/card-feed-parser.mjs` reads the `dakota-latest` SBOM stream
directly and overlays the Nvidia version from `dakota-nvidia-latest`. This
mirrors `getDakotaOsEvent()` in `src/components/FirehoseFeed.tsx` — the PNG and
the pinned card on `/changelogs` must agree, so change both together.

Two traps in the SBOM cache:

- **The newest entry is often empty.** `packageVersions: {}` shows up for recent
  builds whose attestation has not been scanned yet. Select the newest entry
  that actually carries versions, not the newest entry.
- **No data means no card, not a stale card.** When the cache yields nothing,
  the generator warns and skips the slug rather than falling back to a constant.

## Regenerating and eyeballing a card

The tracked SBOM seed is deliberately small, so local output may lag the live
site. To render exactly what production renders:

```bash
curl -s "https://docs.projectbluefin.io/data/sbom-attestations-frontend.json?cb=$RANDOM" \
  -o /tmp/sbom.json
cp static/data/sbom-attestations-frontend.json /tmp/sbom-seed.json
cp /tmp/sbom.json static/data/sbom-attestations-frontend.json
node scripts/generate-card-images.mjs
cp /tmp/sbom-seed.json static/data/sbom-attestations-frontend.json   # always restore
```

Then view `static/img/cards/dakota-light.png`. Never commit the swapped seed.

`static/data/card-hashes.json` caches a content hash per slug; a card is only
re-rendered when its release data or `scripts/lib/card-template.mjs` changes.
Delete the entry if you need to force a re-render.

## Tests

Parsing lives in `scripts/lib/card-feed-parser.mjs` as pure exported functions
so `scripts/generate-card-images.test.js` can exercise it offline:

```bash
node --test scripts/generate-card-images.test.js
```

## Common Rationalizations

| Rationalization                                         | Reality                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "The newest SBOM entry is the one to use."              | The newest entry is often `packageVersions: {}`. Pick the newest entry with data.   |
| "I'll hardcode the version until the feed is fixed."    | A constant renders correct today and wrong next month, with nothing to catch it.    |
| "No data — I'll fall back to the last known version."   | No data means no card. A stale card is a false claim; a missing one is honest.      |
| "The card renders locally, so it's right."              | The tracked seed lags production. Render against the live JSON before believing it. |
| "I updated the PNG, the `/changelogs` card can follow." | They publish the same claim. Disagreeing sources are a bug in both.                 |

## Red Flags

- A version string literal anywhere in `scripts/lib/card-template.mjs` or the
  generator.
- A fallback that substitutes an older release when the SBOM lookup is empty.
- A committed `static/data/sbom-attestations-frontend.json` that came from the
  live-site swap instead of the tracked seed.
- `buildDakotaRelease()` changed without the matching change to
  `getDakotaOsEvent()` in `src/components/FirehoseFeed.tsx`.
- Parsing logic added directly to the generator rather than to the exported
  functions in `scripts/lib/card-feed-parser.mjs`.

## Verification

- [ ] `node --test scripts/generate-card-images.test.js` passes.
- [ ] Every card's version came from a live source, not a literal.
- [ ] An empty SBOM lookup skips the slug rather than emitting a stale card.
- [ ] The Dakota PNG and the `/changelogs` pinned card report the same version.
- [ ] `static/data/sbom-attestations-frontend.json` is restored to the tracked
      seed — `git status` shows it unmodified.
- [ ] The rendered PNG was actually opened and looked at, in both light and dark.
