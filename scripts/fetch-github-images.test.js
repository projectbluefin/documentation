const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  PRODUCT_SPECS,
  buildSecurityInfo,
  buildStreamVersionInfo,
  buildTestingStreams,
  buildUnavailableOutput,
  cacheAgeHours,
  handleUnavailableCache,
  isCurrentImageCatalog,
  main,
  normalizeTestingTag,
  reportMainError,
  releaseInfoFromSource,
  sbomVersionsForStream,
} = require("./fetch-github-images.js");

function completeCachedProducts() {
  return PRODUCT_SPECS.map((spec) => ({
    id: spec.id,
    org: "projectbluefin",
    versionSource: "sbom",
    versions: { source: "sbom" },
  }));
}

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

test("buildStreamVersionInfo falls back to companion nvidia SBOM stream when base stream has no nvidia", async () => {
  const spec = {
    id: "projectbluefin-bluefin",
    org: "projectbluefin",
    package: "bluefin",
    sbomStreamId: "bluefin-stable",
    nvidiaSbomStreamId: "bluefin-nvidia-open-stable",
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260906": {
            packageVersions: {
              gnome: "49.5",
              kernel: "6.18.13-200.fc43",
              nvidia: null,
              mesa: "25.3.6",
            },
          },
        },
      },
      "bluefin-nvidia-open-stable": {
        releases: {
          "stable-20260906": {
            packageVersions: {
              nvidia: "595.71.05",
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
  assert.equal(versions.nvidia, "595.71.05");
});

test("cacheAgeHours uses generatedAt instead of the file mtime", () => {
  const generatedAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();

  assert.ok(Math.abs(cacheAgeHours({ generatedAt }) - 10) < 0.2);
});

test("image cache validity rejects empty and incomplete product sets", () => {
  const products = completeCachedProducts();

  assert.equal(isCurrentImageCatalog({ products: [] }), false);
  assert.equal(
    isCurrentImageCatalog({
      products: products.filter(
        (product) => product.id !== "projectbluefin-utah",
      ),
    }),
    false,
  );
  assert.equal(isCurrentImageCatalog({ products }), true);
});

test("image cache validity rejects retired products", () => {
  const products = completeCachedProducts();

  assert.equal(
    isCurrentImageCatalog({
      products: [{ ...products[0], id: "ublue-bluefin" }, ...products.slice(1)],
    }),
    false,
  );
});

test("image cache validity requires SBOM provenance", () => {
  const products = completeCachedProducts();

  const unmarked = products.map((product) => ({
    ...product,
    versionSource: "release-feed",
    versions: {},
  }));
  assert.equal(isCurrentImageCatalog({ products: unmarked }), false);

  const versionsMarked = products.map(({ versionSource, ...product }) => ({
    ...product,
    versions: { source: "sbom" },
  }));
  assert.equal(isCurrentImageCatalog({ products: versionsMarked }), true);
});

test("main writes an unavailable catalog when the SBOM cache is missing", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fetch-github-images-"));
  const outputFile = path.join(directory, "images.json");
  try {
    await main({
      outputFile,
      sbomFile: path.join(directory, "missing-sbom.json"),
    });

    const output = JSON.parse(readFileSync(outputFile, "utf-8"));
    assert.equal(output.unavailable, true);
    assert.equal(output.stateReason, "SBOM cache not available");
    assert.deepEqual(output.products, []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("main writes an unavailable catalog when SBOM streams have no releases", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fetch-github-images-"));
  const outputFile = path.join(directory, "images.json");
  const sbomFile = path.join(directory, "sbom-attestations.json");
  try {
    writeFileSync(
      sbomFile,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        streams: {
          "bluefin-stable": { releases: {} },
          "bluefin-lts": { releases: {} },
          "dakota-latest": { releases: {} },
          "utah-testing": { releases: {} },
        },
      }),
    );

    await main({ outputFile, sbomFile });

    const output = JSON.parse(readFileSync(outputFile, "utf-8"));
    assert.equal(output.unavailable, true);
    assert.equal(output.stateReason, "SBOM cache contains no release data");
    assert.deepEqual(output.products, []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("release metadata preserves the release asset URL", () => {
  const release = releaseInfoFromSource(
    {
      bluefin: {
        items: [
          {
            title: "stable-20260906: Stable",
            link: "https://github.com/projectbluefin/bluefin/releases/tag/stable-20260906",
          },
        ],
      },
    },
    { feed: "bluefin", stream: "stable" },
  );

  assert.equal(
    release.url,
    "https://github.com/projectbluefin/bluefin/releases/tag/stable-20260906",
  );
  assert.equal(
    release.assetsUrl,
    "https://github.com/projectbluefin/bluefin/releases/tag/stable-20260906#assets",
  );

  const ltsRelease = releaseInfoFromSource(
    {
      lts: {
        items: [
          {
            title: "stable-20260906: LTS",
            link: "https://github.com/projectbluefin/bluefin-lts/releases/tag/stable-20260906",
          },
        ],
      },
    },
    { feed: "lts", stream: "lts" },
  );

  assert.equal(
    ltsRelease.url,
    "https://github.com/projectbluefin/bluefin-lts/releases/tag/stable-20260906",
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

test("buildSecurityInfo returns keyless verification commands for Utah", () => {
  const info = buildSecurityInfo(
    {
      keyRepo: "projectbluefin/utah",
      org: "projectbluefin",
      package: "utah",
    },
    "testing",
  );

  assert.equal(info.cosignKeyUrl, null);
  assert.equal(info.hasAttestation, true);
  assert.match(info.verifyCommand, /certificate-oidc-issuer/);
  assert.match(info.attestCommand, /certificate-identity-regexp/);
});

test("handleUnavailableCache preserves a valid SBOM-derived image catalog", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fetch-github-images-"));
  const outputFile = path.join(directory, "images.json");
  const existing = {
    generatedAt: new Date().toISOString(),
    products: completeCachedProducts(),
  };

  try {
    writeFileSync(outputFile, JSON.stringify(existing), "utf-8");

    const output = handleUnavailableCache(
      existing,
      "SBOM cache not available",
      outputFile,
    );

    assert.deepEqual(output, existing);
    assert.deepEqual(JSON.parse(readFileSync(outputFile, "utf-8")), existing);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reportMainError preserves a valid SBOM-derived image catalog", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "fetch-github-images-"));
  const outputFile = path.join(directory, "images.json");
  const existing = {
    generatedAt: new Date().toISOString(),
    products: completeCachedProducts(),
  };
  const originalError = console.error;

  try {
    writeFileSync(outputFile, JSON.stringify(existing), "utf-8");
    console.error = () => {};

    reportMainError(new Error("upstream failure"), outputFile);

    assert.deepEqual(JSON.parse(readFileSync(outputFile, "utf-8")), existing);
  } finally {
    console.error = originalError;
    rmSync(directory, { recursive: true, force: true });
  }
});
