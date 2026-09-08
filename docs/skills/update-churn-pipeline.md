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
2. **Layer Digest Diffing**:
   - For release $N$ following release $N-1$:
     - Shared layers: layer digests present in both $N-1$ and $N$. These require 0 download bytes during `bootc update`.
     - Download churn: new layer digests introduced in release $N$.
     - Total update churn size = $\sum \text{size}(\text{new layers})$.
     - Layer reuse efficiency = $\frac{\sum \text{size}(\text{shared layers})}{\sum \text{size}(\text{all layers})} \times 100\%$.
3. **Zstd-Chunked Detection**:
   - A layer is recognized as zstd-chunked when its `mediaType` contains `zstd` or its annotations include `io.github.containers.zstd-chunked.manifest-checksum`.
4. **Data Degradation & Fallback**:
   - If an image has no stable releases (e.g. Utah in bootstrapping phase), flag it explicitly with `{ unavailable: true, stateReason: "..." }`.
   - Never throw or exit non-zero from the pipeline script.
5. **Chart Representation**:
   - Use shared domains across small-multiple image cards so scales are visually comparable.
   - Always display raw numerical values alongside visual charts.
   - Encode status with intensity and glyphs, never red/green pairs.

## Common Rationalizations

- _"Utah doesn't have releases yet, so we can omit it from the dataset."_
  Wrong. ADR 0002 mandates visible unavailability: omitting a variant makes an incomplete dashboard indistinguishable from a healthy one. Render an explicit unavailable card.
- _"We can estimate churn by diffing RPM package sizes instead of container layers."_
  Wrong. OCI layer descriptors represent the actual compressed bytes transferred over the wire by container engines and bootc. Layer digest matching is the ground truth.

## Red Flags

- Script fails the build on network timeouts or registry 404s.
- Returning `null` from a chart panel causing it to disappear instead of rendering `<Unavailable>`.
- Using red/green color encoding for churn rate severity.
- Interpolating missing release data points instead of rendering visible gaps with `gapSafe()`.

## Verification

- `node --test scripts/fetch-update-churn.test.js` passes 100%.
- `npm run typecheck` passes with 0 errors.
- `npm run lint` passes with 0 errors.
- `static/data/update-churn.json` carries a valid `generatedAt` timestamp and contains entries for all four images (`bluefin`, `bluefin-lts`, `dakota`, `utah`).

## Sources

- `scripts/fetch-update-churn.js`
- `scripts/fetch-update-churn.test.js`
- `src/components/analytics/ImageChurnCharts.tsx`
- `.github/workflows/update-churn-cache.yml`
