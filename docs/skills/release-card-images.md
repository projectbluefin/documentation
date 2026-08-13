---
title: Release card images
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
