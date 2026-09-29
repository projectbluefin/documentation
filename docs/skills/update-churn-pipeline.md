---
name: update-churn-pipeline
description: Use when measuring, calculating, or visualizing OCI image update churn, layer reuse efficiency, and zstd compression statistics across Project Bluefin images.
---

# Update Churn Pipeline

Measuring release-over-release download deltas, chunkah layer reuse efficiency, and zstd compression statistics for Project Bluefin container images.

## When to Use

- Adding or updating image update churn calculations for stable or testing streams.
- Inspecting OCI container manifest layer descriptors (`application/vnd.oci.image.layer.v1.tar+zstd`).
- Calculating download byte deltas vs. shared layer cache hit rates between consecutive releases.
- Maintaining the automated churn pipeline (`scripts/fetch-update-churn.js`) and `/analytics` charts.

## When NOT to Use

- Tracking active machine populations — use countme pipelines (`scripts/fetch-countme.js`).
- Modifying SBOM attestation ingestion — use `scripts/fetch-github-sbom.js`.

## Core Process

1. **Query Platform Manifests**:
   - Query OCI manifests via registry HTTPS endpoints or Skopeo for each image tag.
   - For multi-arch manifest lists (`application/vnd.oci.image.index.v1+json`), dereference the `linux/amd64` platform digest to obtain the array of layer descriptors.
   - A tag set with only one member yields a baseline and no delta, so a card
     whose only point is a baseline is a missing measurement, not a quiet
     release. Where an image ships dated per-build tags, discover the series
     from the registry instead of hand-listing it: `tagSeries` in
     `IMAGE_CONFIGS` names a `pattern` and a `limit`, `fetchGhcrTags` (shared
     with `fetch-github-sbom.js`) supplies the candidates, and
     `selectDatedTags` keeps the most recent `limit`, oldest-first. Utah ships
     `testing-YYYYMMDD-<short-sha>` per build and is discovered this way. The
     `defaultTags` seed survives as a fallback for when tag listing fails.
   - Churn is a diff between consecutive entries, so the order *is* the
     measurement, not a presentation detail. Every candidate — seed, registry
     tag and SBOM-cache tag — is collected first and sorted exactly once, after
     every source has contributed.
   - **Order is by build time, not by tag text.** `compareTagsByDate` sorts on
     the `YYYYMMDD` the tag carries, breaks same-day ties on the registry's
     build timestamp (`fetchGhcrTagCreatedAt`, the packages API's `created_at`
     per version), and falls back to tag text only for tags the packages API
     had no timestamp for. This matters because an image that ships several
     builds a day repeats the same date across them, and `diffReleaseLayers` is
     directional — churn is the layers in N absent from N-1 and reuse % is
     relative to N — so a same-day pair compared backwards reports different
     numbers than the update a user performs. Tag text is not a build time:
     `362ea44` sorts before `815ea44` while being the newer build.
   - **A discovered series is a closed set.** When `tagSeries` is set, a tag
     that does not match its `pattern` never joins the series — notably the
     floating `testing` tag, which the SBOM cache contributes and which names a
     manifest the newest dated tag already covers. Appending it produced a
     duplicate point (0 MB churn, or a backwards delta) *and* a release dated
     today by `extractDateFromTag`, which is how an undated tag ended up
     appearing to "belong at the end" of the series. The tag list is sorted
     before it is charted, so the floating tag is last only because it is
     excluded. `limit` then trims the merged list, so a seed older than the
     discovered window cannot push the chart past the limit.
2. **Layer Digest Diffing**:
   - For release $N$ following release $N-1$:
     - Shared layers: layer digests present in both $N-1$ and $N$. These require 0 download bytes during `bootc update`.
     - Download churn: new layer digests introduced in release $N$.
     - Total update churn size = $\sum \text{size}(\text{new layers})$.
     - Layer reuse efficiency = $\frac{\sum \text{size}(\text{shared layers})}{\sum \text{size}(\text{all layers})} \times 100\%$.
3. **Zstd-Chunked Detection**:
   - A layer is recognized as zstd-chunked when its `mediaType` contains `zstd` or its annotations include `io.github.containers.zstd-chunked.manifest-checksum`.
4. **Data Degradation & Fallback**:
   - If an image has no publishable tags at all, or its tag series could not be
     listed, flag it explicitly with `{ unavailable: true, stateReason: "..." }`.
     Say which of the two happened — a registry that cannot be reached and an
     image that has not shipped are different claims.
   - Never throw or exit non-zero from the pipeline script.
5. **Baseline Releases Are Not Deltas**:
   - The first tag the pipeline tracked for an image has `previousTag: null` and
     `isBaseline: true`. The fetcher writes its `downloadChurnMB` as the whole
     image and its `sharedMB` and `reuseEfficiencyPct` as `0`.
   - That `0` means "not measured", not "measured as zero". Every delta-derived
     series withholds baseline points and marks them separately — a diamond on
     the churn ridgeline, an `○ base` cell on the reuse heatmap. Charting a
     baseline as churn draws the whole image as a regression against a release
     it was never compared to.
   - Properties that are not deltas — the layer compression format, the layer
     count — still read from baseline releases, because they are observed on the
     release itself rather than diffed against a predecessor.
6. **Chart Vocabulary**: `/analytics` follows the `projectbluefin/lab` house
   style, and bar charts are not part of it. The five panels are:
   - **KPI summary strip**: fleet churn in GB, layer reuse %, zstd adoption %,
     tracked-image coverage, in tabular numerals.
   - **Churn ridgeline**: multi-grid line small multiples, one lane per image,
     every lane on the same value domain and the same union-of-release-dates
     category axis. A rolling p50 and a p50–p95 band appear per lane once that
     lane has 5 consecutive deltas: two stacked series, the median line visible
     and the spread carrying `areaStyle` behind `lineStyle: { opacity: 0 }`.
     Below that count the band is withheld and the panel says so.
   - **Reuse heatmap**: rows are images, columns are release dates, cells carry
     a glyph plus the percentage, coloured by `visualMap.pieces` over the
     severity ramp. Give each cell `{ value: [x, y, v], text, tip }` so
     `toTableRows` pivots it into the accessible table.
   - **Byte composition**: stacked area, cached below downloaded. Colour by
     category, never by lane — the same band must mean the same thing in every
     lane.
   - **Compression state lane**: the same heatmap frame, one hue plus a glyph,
     carrying `zstdLayers/totalLayers` in the cell.
7. **Colour Comes From Tokens**: no hex literal in the component or its CSS
   module. `useFactoryTheme()` resolves the `--fx-*` ramp; use
   `fxTheme.categorical[i]`, `fxTheme.severity[level]`, `withAlpha()` and
   `readableInk()`, and attach the returned ref to a root carrying
   `className="fxRoot"`. `scripts/factory-theming.test.js` enforces this.
   Charts render only through `src/components/factory/EChart.tsx`, which needs
   `points` and `minPoints` on every panel.

## Common Rationalizations

- _"The tag list in `IMAGE_CONFIGS` is stale, so let us just update it by hand."_
  Wrong. A hand-maintained list goes stale the day after it is written, and a
  stale list is indistinguishable from an image that stopped shipping. Add a
  `tagSeries` and let the registry supply the series.
- _"Utah doesn't have releases yet, so we can omit it from the dataset."_
  Wrong. ADR 0002 mandates visible unavailability: omitting a variant makes an incomplete dashboard indistinguishable from a healthy one. Render an explicit unavailable card.
- _"We can estimate churn by diffing RPM package sizes instead of container layers."_
  Wrong. OCI layer descriptors represent the actual compressed bytes transferred over the wire by container engines and bootc. Layer digest matching is the ground truth.
- _"A bar chart is the obvious way to show per-release download size."_
  Wrong, and it has been rejected repeatedly. Use the lane/heatmap/area
  vocabulary above. `scripts/image-churn-charts.test.js` reads the option
  objects and fails on any `bar` series.
- _"The baseline release shows 0% reuse, so the cache is not working."_
  Wrong. A baseline has no predecessor, so reuse is undefined. Withhold it and
  mark the cell `unknown`.

## Red Flags

- Script fails the build on network timeouts or registry 404s.
- Returning `null` from a chart panel causing it to disappear instead of rendering `<Unavailable>`.
- Using red/green color encoding for churn rate severity, or hue without a glyph.
- Interpolating missing release data points instead of rendering visible gaps with `gapSafe()`.
- Autoscaling a small multiple to its own lane instead of the shared domain.
- A hex literal anywhere in the component or its CSS module.

## Verification

- `node --test scripts/fetch-update-churn.test.js` passes 100%.
- `node --test scripts/image-churn-charts.test.js` passes: no bar series, one
  shared domain per small-multiple panel, baselines withheld from deltas, and
  every panel able to state unavailability.
- `node --test scripts/factory-theming.test.js` passes, which covers
  `src/components/analytics/ImageChurnCharts.module.css`.
- `npm run typecheck` passes with 0 errors.
- `npm run lint` passes with 0 errors.
- `static/data/update-churn.json` carries a valid `generatedAt` timestamp and contains entries for all three images (`bluefin`, `dakota`, `utah`).

## Sources

- `scripts/fetch-update-churn.js`
- `scripts/fetch-update-churn.test.js`
- `src/components/analytics/ImageChurnCharts.tsx`
- `src/components/analytics/ImageChurnCharts.module.css`
- `scripts/image-churn-charts.test.js`
- `projectbluefin/lab` → `src/scripts/{tests-charts.js,builds-charts.js}`, the
  house chart style these panels follow
- `.github/workflows/update-churn-cache.yml`
