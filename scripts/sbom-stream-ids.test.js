/**
 * Drift gate for the SBOM stream-id namespace.
 *
 * scripts/fetch-github-sbom.js STREAM_SPECS is the authoritative list of SBOM
 * stream ids written into static/data/sbom-attestations.json. Four consumer
 * sites join against that namespace by raw string:
 *
 *   - fetch-github-images.js  PRODUCT_SPECS  (sbomStreamId / nvidiaSbomStreamId
 *                                             / nvidiaSbomFallbackStreamId)
 *   - fetch-firehose.js       OS_STREAM_SPECS (streamId)
 *   - fetch-update-churn.js   IMAGE_CONFIGS   (sbomStreamId)
 *
 * Nothing else keeps those strings resolvable: a typo or a renamed stream
 * yields silently missing data on the published site instead of a build
 * failure. (Happened in practice: bluefin-lts named nvidiaSbomStreamId
 * "bluefin-lts-nvidia" months before that stream existed — it only rendered
 * because resolveNvidiaVersion fell back to bluefin-gdx-lts.)
 *
 * Rules enforced here:
 *   1. Every sbomStreamId / streamId must be a declared STREAM_SPECS id.
 *   2. Every nvidiaSbomStreamId must be declared, OR the spec must carry a
 *      declared nvidiaSbomFallbackStreamId — the documented forward-reference
 *      pattern used while a dedicated nvidia SBOM stream does not exist yet.
 *
 * Two consumers are intentionally out of scope until their files are free of
 * in-flight PRs and export their tables: fetch-github-driver-versions.js
 * (SBOM_STREAM_PREFIX) and lib/card-feed-parser.mjs. Tracked in issue #1231.
 */

const test = require("node:test");
const assert = require("node:assert");

const { STREAM_SPECS } = require("./fetch-github-sbom");
const { PRODUCT_SPECS } = require("./fetch-github-images");
const { OS_STREAM_SPECS } = require("./fetch-firehose");
const { IMAGE_CONFIGS } = require("./fetch-update-churn");

const STREAM_IDS = new Set(STREAM_SPECS.map((s) => s.id));

test("every PRODUCT_SPECS sbomStreamId is a declared SBOM stream", () => {
  for (const spec of PRODUCT_SPECS) {
    assert.ok(
      STREAM_IDS.has(spec.sbomStreamId),
      `product ${spec.id} names sbomStreamId "${spec.sbomStreamId}", which is not in fetch-github-sbom.js STREAM_SPECS`,
    );
  }
});

test("every PRODUCT_SPECS nvidia stream resolves directly or via fallback", () => {
  for (const spec of PRODUCT_SPECS) {
    if (!spec.nvidiaSbomStreamId) continue;
    if (STREAM_IDS.has(spec.nvidiaSbomStreamId)) continue;
    assert.ok(
      spec.nvidiaSbomFallbackStreamId &&
        STREAM_IDS.has(spec.nvidiaSbomFallbackStreamId),
      `product ${spec.id} names nvidiaSbomStreamId "${spec.nvidiaSbomStreamId}", which is not in STREAM_SPECS and has no resolvable nvidiaSbomFallbackStreamId`,
    );
  }
});

test("every PRODUCT_SPECS nvidiaSbomFallbackStreamId is a declared SBOM stream", () => {
  for (const spec of PRODUCT_SPECS) {
    if (!spec.nvidiaSbomFallbackStreamId) continue;
    assert.ok(
      STREAM_IDS.has(spec.nvidiaSbomFallbackStreamId),
      `product ${spec.id} names nvidiaSbomFallbackStreamId "${spec.nvidiaSbomFallbackStreamId}", which is not in STREAM_SPECS`,
    );
  }
});

test("every OS_STREAM_SPECS streamId is a declared SBOM stream", () => {
  for (const spec of OS_STREAM_SPECS) {
    assert.ok(
      STREAM_IDS.has(spec.streamId),
      `firehose OS stream ${spec.appId} names streamId "${spec.streamId}", which is not in fetch-github-sbom.js STREAM_SPECS`,
    );
  }
});

test("every IMAGE_CONFIGS sbomStreamId is a declared SBOM stream", () => {
  for (const spec of IMAGE_CONFIGS) {
    assert.ok(
      STREAM_IDS.has(spec.sbomStreamId),
      `churn image ${spec.id} names sbomStreamId "${spec.sbomStreamId}", which is not in fetch-github-sbom.js STREAM_SPECS`,
    );
  }
});

test("STREAM_SPECS ids are unique", () => {
  assert.strictEqual(
    STREAM_IDS.size,
    STREAM_SPECS.length,
    "duplicate ids in fetch-github-sbom.js STREAM_SPECS",
  );
});
