---
name: update-churn-pipeline
description: Use when measuring or calculating OCI image update churn, layer reuse efficiency, and zstd compression statistics across Project Bluefin images.
---

# Update Churn Pipeline

Measuring release-over-release download deltas, chunkah layer reuse efficiency, and zstd compression statistics for Project Bluefin container images.

## When to Use

- Adding or updating image update churn calculations for stable or testing streams.
- Inspecting OCI container manifest layer descriptors (`application/vnd.oci.image.layer.v1.tar+zstd`).
- Calculating download byte deltas vs. shared layer cache hit rates between consecutive releases.
- Maintaining the automated churn pipeline (`scripts/fetch-update-churn.js`).

## When NOT to Use

- Tracking active machine populations — use countme pipelines (`scripts/fetch-countme.js`).
- Modifying SBOM attestation ingestion — use `scripts/fetch-github-sbom.js`.

The pipeline still produces `static/data/update-churn.json`, but it no longer has
a public `/analytics` chart consumer. Removing that presentation does not retire
the fetcher, its behavior tests, tracked seeds, package scripts, or workflows.

## Core Process

1. **Query Platform Manifests**:
   - Query OCI manifests via registry HTTPS endpoints or Skopeo for each image tag.
   - For multi-arch manifest lists (`application/vnd.oci.image.index.v1+json`), dereference the `linux/amd64` platform digest to obtain the array of layer descriptors.
   - A tag set with only one member yields a baseline and no delta, so a series
     whose only point is a baseline is a missing measurement, not a quiet
     release. Where an image ships dated per-build tags, discover the series
     from the registry instead of hand-listing it: `tagSeries` in
     `IMAGE_CONFIGS` names a `pattern` and a `limit`, `fetchGhcrTags` (shared
     with `fetch-github-sbom.js`) supplies the candidates, and
     `selectDatedTags` keeps the most recent `limit`, oldest-first. Utah ships
     `testing-YYYYMMDD-<short-sha>` per build and Bluefin ships
     `stable-daily-YYYYMMDD` per release, and both are discovered this way. The
     `defaultTags` seed survives as a fallback for when tag listing fails.
   - Churn is a diff between consecutive entries, so the order _is_ the
     measurement, not a presentation detail. Every candidate — seed, registry
     tag and SBOM-cache tag — is collected first and sorted exactly once, after
     every source has contributed.
   - **Order is by build time, not by tag text.** `compareTagsByDate` sorts on
     the `YYYYMMDD` the tag carries, breaks same-day ties on the registry's
     build timestamp (`fetchGhcrTagCreatedAt`, the packages API's `created_at`
     per version), and falls back to tag text when both keys tie. This matters
     because an image that ships several builds a day repeats the same date
     across them, and `diffReleaseLayers` is directional — churn is the layers
     in N absent from N-1 and reuse % is relative to N — so a same-day pair
     compared backwards reports different numbers than the update a user
     performs. Tag text is not a build time: `362ea44` sorts before `815ea44`
     while being the newer build. The `created_at` lookup needs a token, so
     any workflow that produces the dataset **must** pass `GITHUB_TOKEN` to the
     compute step — without one `fetchGhcrTagCreatedAt` returns `{}` and the
     sort degrades to the empty-string sentinel described below, which is
     predictable rather than silent.
   - **The build-time lookup pages until every matched tag is resolved.** A
     package that ships multiple builds a day accumulates versions faster
     than the original two-page (200-version) window covered. When
     `discoverSeriesTags` hands the matched set to `fetchGhcrTagCreatedAt`,
     pagination continues past the default cap up to
     `GHCR_TAG_CREATED_AT_MAX_PAGES` (default 20 pages, 2000 versions;
     override with `UPDATE_CHURN_GHCR_MAX_PAGES`) and stops early once every
     requested tag has a timestamp. A package whose matched window really is
     longer than that warns about the gap and falls back to tag text for the
     tags it could not resolve — the same approximation, in the contract
     surface. Budget for it: each Utah build publishes ~31 package versions
     (manifest, per-arch manifests, chunk blobs, `.sig`) and Utah can ship
     20 builds in a day (20261003), so the 14-tag window typically resolves
     around page 5, and because whole date groups are requested a heavy day
     at the window edge can push it to page 9 or beyond. If the
     "build timestamps incomplete" warning appears, raise the ceiling.
   - **An undated tag sorts last, never first.** A tag carrying no `YYYYMMDD`
     is a floating name (`stable`, `testing`) pointing at the newest manifest,
     so it belongs at the end of any series it is part of. Sorting it first
     would make it the baseline and make the first delta a backwards diff.
   - **Partial `created_at` coverage sorts, but in a predictable way.** A tag
     the packages API has no `created_at` for sorts as the empty-string
     sentinel, which `compareTagsByDate`'s `localeCompare` puts before every
     real timestamp — that tag is treated as the oldest in its same-day group.
     The point is not to recover the missing build time (we cannot), it is to
     keep the comparator a strict total order on `[date, buildTime, text]` so
     the dataset does not flip order between runs whenever the pagination cap
     clips coverage. An earlier comparator used build time for the
     timestamped pair and tag text for the others, which yielded a cyclic
     comparator when a same-day group had partial coverage; the series order
     then depended on `tags/list` order, which is the flip #1498 describes.
   - **A discovered series is a closed set.** When `tagSeries` is set, a tag
     that does not match its `pattern` never joins the series — notably the
     floating `testing` tag, which the SBOM cache contributes and which names a
     manifest the newest dated tag already covers. Appending it produced a
     duplicate point (0 MB churn, or a backwards delta) _and_ a release dated
     today by `extractDateFromTag`, which is how an undated tag ended up
     appearing to "belong at the end" of the series. The tag list and its window
     use the same build-time order, so a same-day pair at the edge of the window
     is never trimmed against the order used for diffing. `limit` then trims the
     merged list, so a seed older than the discovered window cannot push the
     series past the limit.
2. **Freeze Published Points**:
   - Treat the existing output's release records as published history, not a
     disposable manifest cache. Preserve every record, including its original
     `tag`/`previousTag` pair, baseline marker, and measured values.
   - `appendReleaseChurn` only calculates tags after the last published release.
     Re-pushed dated tags must not rewrite earlier measurements, even during a
     forced refresh. Retain published history outside the discovery window.
   - Fetch an old manifest only when it is the predecessor of a new point.
     If either manifest is missing, leave a gap rather than bridging releases
     or introducing a new baseline. Do not hand-edit generated data to restore
     a historical value: this policy freezes the records already published.
3. **Layer Digest Diffing**:
   - For release $N$ following release $N-1$:
     - Shared layers: layer digests present in both $N-1$ and $N$. These require 0 download bytes during `bootc update`.
     - Download churn: new layer digests introduced in release $N$.
     - Total update churn size = $\sum \text{size}(\text{new layers})$.
     - Layer reuse efficiency = $\frac{\sum \text{size}(\text{shared layers})}{\sum \text{size}(\text{all layers})} \times 100\%$.
4. **Zstd-Chunked Detection**:
   - A layer is recognized as zstd-chunked when its `mediaType` contains `zstd` or its annotations include `io.github.containers.zstd-chunked.manifest-checksum`.
5. **Data Degradation & Fallback**:
   - If an image has no publishable tags at all, or its tag series could not be
     listed, flag it explicitly with `{ unavailable: true, stateReason: "..." }`.
     Say which of the two happened — a registry that cannot be reached and an
     image that has not shipped are different claims.
   - Never throw or exit non-zero from the pipeline script.
6. **Baseline Releases Are Not Deltas**:
   - The first tag the pipeline tracked for an image has `previousTag: null` and
     `isBaseline: true`. The fetcher writes its `downloadChurnMB` as the whole
     image and its `sharedMB` and `reuseEfficiencyPct` as `0`.
   - That `0` means "not measured", not "measured as zero". Do not treat a
     baseline as a delta against a release it was never compared to.
   - Properties that are not deltas — the layer compression format, the layer
     count — still read from baseline releases, because they are observed on the
     release itself rather than diffed against a predecessor.

## Common Rationalizations

- _"The tag list in `IMAGE_CONFIGS` is stale, so let us just update it by hand."_
  Wrong. A hand-maintained list goes stale the day after it is written, and a
  stale list is indistinguishable from an image that stopped shipping. Add a
  `tagSeries` and let the registry supply the series. Bluefin and Utah both
  do this; a hand-maintained list is only ever a fallback.
- _"Utah doesn't have releases yet, so we can omit it from the dataset."_
  Wrong. Keep the variant in the dataset with explicit `unavailable` and
  `stateReason` fields rather than silently omitting it.
- _"We can estimate churn by diffing RPM package sizes instead of container layers."_
  Wrong. OCI layer descriptors represent the actual compressed bytes transferred over the wire by container engines and bootc. Layer digest matching is the ground truth.
- _"The baseline release shows 0% reuse, so the cache is not working."_
  Wrong. A baseline has no predecessor, so reuse is undefined; preserve its
  baseline marker rather than interpreting it as a measured zero.

## Red Flags

- Script fails the build on network timeouts or registry 404s.
- Missing variants silently omitted instead of carrying an unavailable reason.
- Baseline entries treated as measured release-over-release deltas.

## Verification

- `node --test scripts/fetch-update-churn.test.js` passes 100%.
- `static/data/update-churn.json` carries a valid `generatedAt` timestamp and contains entries for all three images (`bluefin`, `dakota`, `utah`).

## Sources

- `scripts/fetch-update-churn.js`
- `scripts/fetch-update-churn.test.js`
- `.github/workflows/update-churn-cache.yml`
