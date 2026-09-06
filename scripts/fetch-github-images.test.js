const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PRODUCT_SPECS,
  buildSecurityInfo,
  buildStreamVersionInfo,
  buildTestingStreams,
  buildUnavailableOutput,
  cacheAgeHours,
  isCurrentImageCatalog,
  normalizeTestingTag,
  sbomVersionsForStream,
} = require("./fetch-github-images.js");

test("PRODUCT_SPECS defines only the 4 projectbluefin image products", () => {
  const productIds = PRODUCT_SPECS.map((spec) => spec.id);

  assert.deepEqual(productIds, [
    "projectbluefin-bluefin",
    "projectbluefin-bluefin-lts",
    "projectbluefin-dakota",
    "projectbluefin-utah",
  ]);

  for (const spec of PRODUCT_SPECS) {
    assert.equal(spec.org, "projectbluefin");
    assert.ok(
      !spec.id.startsWith("ublue-"),
      `Product ID ${spec.id} must not start with ublue-`,
    );
  }
});

test("buildStreamVersionInfo extracts nvidia and packages strictly from SBOM", async () => {
  const spec = {
    id: "projectbluefin-bluefin",
    org: "projectbluefin",
    package: "bluefin",
    sbomStreamId: "bluefin-stable",
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260906": {
            packageVersions: {
              gnome: "49.5",
              kernel: "6.18.13-200.fc43",
              nvidia: "595.71.05",
              mesa: "25.3.6",
            },
          },
        },
      },
    },
  };

  const versions = await buildStreamVersionInfo(
    spec,
    "ghcr.io/projectbluefin/bluefin",
    "stable",
    null,
    sbomCache,
  );
  assert.equal(versions.gnome, "49.5");
  assert.equal(versions.kernel, "6.18.13-200.fc43");
  assert.equal(versions.nvidia, "595.71.05");
  assert.equal(versions.mesa, "25.3.6");
});

test("cacheAgeHours uses generatedAt instead of the file mtime", () => {
  const generatedAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

  assert.ok(Math.abs(cacheAgeHours({ generatedAt }) - 10) < 0.2);
});

test("image cache validity rejects retired products", () => {
  assert.equal(
    isCurrentImageCatalog({
      products: [{ id: "ublue-bluefin", org: "projectbluefin" }],
    }),
    false,
  );
  assert.equal(
    isCurrentImageCatalog({
      products: [{ id: "projectbluefin-bluefin", org: "projectbluefin" }],
    }),
    true,
  );
});

test("buildUnavailableOutput exposes an explicit fallback state", () => {
  const output = buildUnavailableOutput("upstream unavailable");

  assert.equal(output.unavailable, true);
  assert.equal(output.stateReason, "upstream unavailable");
  assert.deepEqual(output.products, []);
});

test("normalizeTestingTag strips architecture and date suffixes", () => {
  assert.equal(
    normalizeTestingTag("lts-testing-20260401-amd64"),
    "lts-testing",
  );
  assert.equal(
    normalizeTestingTag("lts.hwe.testing-2-arm64"),
    "lts.hwe.testing-2",
  );
});

test("buildTestingStreams keeps supported testing families and deduplicates normalized tags", () => {
  const spec = {
    allowTestingStreams: true,
    org: "projectbluefin",
    package: "bluefin",
  };

  const streams = buildTestingStreams(spec, [
    "lts-testing-20260401-amd64",
    "lts-testing-20260402-arm64",
    "lts-hwe-testing-1",
    "latest",
    "gts-testing",
    "stream10",
    "unstable",
  ]);

  assert.deepEqual(
    streams.map((stream) => stream.tag),
    ["lts-hwe-testing-1"],
  );
  assert.match(
    streams[0].command,
    /ghcr\.io\/projectbluefin\/bluefin:lts-hwe-testing-1/,
  );
});

test("sbomVersionsForStream falls back from testing stream to base stream", () => {
  const spec = {
    org: "projectbluefin",
    package: "bluefin",
    sbomStreamId: "bluefin-lts",
  };
  const sbomCache = {
    streams: {
      "bluefin-lts": {
        id: "bluefin-lts",
        org: "projectbluefin",
        package: "bluefin",
        releases: {
          "lts-20260401": {
            packageVersions: { kernel: "6.14.0", gnome: "48.1" },
          },
        },
      },
    },
  };

  assert.deepEqual(sbomVersionsForStream(sbomCache, spec, "lts-testing"), {
    kernel: "6.14.0",
    gnome: "48.1",
  });
});

test("buildSecurityInfo returns keyless verification commands for keyless repos", () => {
  const info = buildSecurityInfo(
    {
      keyRepo: "projectbluefin/bluefin",
      org: "projectbluefin",
      package: "bluefin",
    },
    "stable",
  );

  assert.equal(info.cosignKeyUrl, null);
  assert.equal(info.hasAttestation, true);
  assert.match(info.verifyCommand, /certificate-identity-regexp/);
  assert.match(info.attestCommand, /https:\/\/slsa\.dev\/provenance\/v1/);
});
