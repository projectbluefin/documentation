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
  buildTopStreams,
  buildUnavailableOutput,
  cacheAgeHours,
  companionVersionsForStream,
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
    org: spec.org,
    package: spec.package,
    imageRef: `ghcr.io/${spec.org}/${spec.package}`,
    sbomStreamId: spec.sbomStreamId,
    nvidiaSbomStreamId: spec.nvidiaSbomStreamId,
    versionSource: "sbom",
    versions: { source: "sbom" },
  }));
}

test("Classic catalog points at the published image and key-based signer", () => {
  const classic = PRODUCT_SPECS[0];
  assert.equal(classic.id, "ublue-bluefin");
  assert.equal(classic.org, "ublue-os");
  assert.equal(classic.nvidiaPackage, "bluefin-nvidia-open");
  const security = buildSecurityInfo(classic, "stable");
  assert.equal(
    security.cosignKeyUrl,
    "https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub",
  );
  assert.match(
    security.verifyCommand,
    /cosign verify --key .*ublue-os\/bluefin.* ghcr\.io\/ublue-os\/bluefin:stable/,
  );
  assert.equal(security.attestCommand, null);
});

test("Classic exposes only published stable, daily and latest channel tags", () => {
  const streams = buildTopStreams(
    PRODUCT_SPECS[0],
    new Set(["stable", "stable-daily", "latest", "testing"]),
  );
  assert.deepEqual(
    streams.map((stream) => stream.tag),
    ["stable", "stable-daily", "latest"],
  );
  assert.equal(
    streams[1].command,
    "sudo bootc switch ghcr.io/ublue-os/bluefin:stable-daily --enforce-container-sigpolicy",
  );
});

test("image catalog rejects old organization and package even if SBOM-labelled", () => {
  const products = completeCachedProducts();
  assert.equal(isCurrentImageCatalog({ products }), true);
  const oldOrg = products.map((product, i) =>
    i
      ? product
      : {
          ...product,
          org: "projectbluefin",
          imageRef: "ghcr.io/projectbluefin/bluefin",
        },
  );
  assert.equal(isCurrentImageCatalog({ products: oldOrg }), false);
  const oldStream = products.map((product, i) =>
    i === 2 ? { ...product, sbomStreamId: "dakota-latest" } : product,
  );
  assert.equal(isCurrentImageCatalog({ products: oldStream }), false);
  assert.equal(
    isCurrentImageCatalog({
      products: products.map((product, i) =>
        i ? product : { ...product, package: "bluefin-dx" },
      ),
    }),
    false,
  );
});

test("versions never borrow an unrelated channel or companion release", async () => {
  const spec = PRODUCT_SPECS[2];
  const cache = {
    streams: {
      "dakota-stable": {
        org: "projectbluefin",
        package: "dakota",
        releases: { "stable-20260922": { packageVersions: { kernel: "7.1" } } },
      },
      "dakota-testing": {
        org: "projectbluefin",
        package: "dakota",
        releases: {
          "testing-20260922": { packageVersions: { kernel: "7.2" } },
        },
      },
      "dakota-nvidia-stable": {
        org: "projectbluefin",
        package: "dakota-nvidia",
        releases: { "stable-20260921": { packageVersions: { nvidia: "595" } } },
      },
    },
  };
  assert.equal(
    (await buildStreamVersionInfo(spec, "", "testing", null, cache)).kernel,
    "7.2",
  );
  assert.equal(
    (await buildStreamVersionInfo(spec, "", "stable", null, cache)).nvidia,
    null,
  );
  assert.equal(companionVersionsForStream(cache, spec, "stable"), null);
  cache.streams["dakota-nvidia-stable"].releases["stable-20260922"] = {
    packageVersions: { kernel: "7.1-nvidia", nvidia: "600" },
  };
  assert.deepEqual(companionVersionsForStream(cache, spec, "stable"), {
    kernel: "7.1-nvidia",
    nvidia: "600",
  });
  assert.equal(sbomVersionsForStream(cache, spec, "next"), null);
});

test("buildStreamVersionInfo extracts nvidia and packages strictly from SBOM", async () => {
  const spec = {
    id: "ublue-bluefin",
    org: "ublue-os",
    package: "bluefin",
    sbomStreamId: "bluefin-stable",
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        org: "ublue-os",
        package: "bluefin",
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
    "ghcr.io/ublue-os/bluefin",
    "stable",
    null,
    sbomCache,
  );
  assert.equal(versions.gnome, "49.5");
  assert.equal(versions.kernel, "6.18.13-200.fc43");
  assert.equal(versions.nvidia, "595.71.05");
  assert.equal(versions.mesa, "25.3.6");
});

test("buildStreamVersionInfo extracts systemd, bootc, and pipewire for Dakota from SBOM", async () => {
  const spec = {
    id: "projectbluefin-dakota",
    org: "projectbluefin",
    package: "dakota",
    sbomStreamId: "dakota-stable",
    nvidiaSbomStreamId: "dakota-nvidia-stable",
    streamOrder: ["stable", "testing"],
  };
  const sbomCache = {
    streams: {
      "dakota-stable": {
        org: "projectbluefin",
        package: "dakota",
        releases: {
          "stable-20260608": {
            packageVersions: {
              kernel: "7.0.7",
              gnome: "50.2",
              mesa: "26.0.6",
              systemd: "260.2",
              bootc: "1.15.2",
              pipewire: "1.6.1",
            },
          },
        },
      },
      "dakota-nvidia-stable": {
        org: "projectbluefin",
        package: "dakota-nvidia",
        releases: {
          "stable-20260608": {
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
    "ghcr.io/projectbluefin/dakota",
    "stable",
    null,
    sbomCache,
  );
  assert.equal(versions.kernel, "7.0.7");
  assert.equal(versions.systemd, "260.2");
  assert.equal(versions.bootc, "1.15.2");
  assert.equal(versions.mesa, "26.0.6");
  assert.equal(versions.nvidia, null);
  assert.equal(versions.gnome, "50.2");
  assert.equal(versions.pipewire, "1.6.1");
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
      products: [
        { ...products[0], id: "projectbluefin-bluefin" },
        ...products.slice(1),
      ],
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

test("Classic release metadata ignores a similarly named release from another repository", () => {
  const spec = PRODUCT_SPECS[0];
  const feeds = {
    bluefin: {
      items: [
        {
          title: "stable-44.20260922: other",
          link: "https://github.com/projectbluefin/bluefin/releases/tag/stable-44.20260922",
        },
        {
          title: "stable-44.20260922: Classic",
          link: "https://github.com/ublue-os/bluefin/releases/tag/stable-44.20260922",
        },
      ],
    },
  };
  assert.equal(
    releaseInfoFromSource(feeds, spec.releaseSource).url,
    "https://github.com/ublue-os/bluefin/releases/tag/stable-44.20260922",
  );
});

test("release listing fallback does not invent an assets anchor", () => {
  const release = releaseInfoFromSource(
    { bluefin: { items: [] } },
    PRODUCT_SPECS[0].releaseSource,
  );
  assert.equal(release.url, "https://github.com/ublue-os/bluefin/releases");
  assert.equal(release.assetsUrl, null);
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

test("buildSecurityInfo returns keyless verification commands for Utah with attestationLive false", () => {
  const info = buildSecurityInfo(
    {
      keyRepo: "projectbluefin/utah",
      org: "projectbluefin",
      package: "utah",
    },
    "testing",
  );

  assert.equal(info.cosignKeyUrl, null);
  assert.equal(info.hasAttestation, false);
  assert.match(info.verifyCommand, /certificate-oidc-issuer/);
  assert.equal(info.attestCommand, null);
});

test("buildSecurityInfo hides verification commands when tag is not available", () => {
  const info = buildSecurityInfo(
    {
      keyRepo: "projectbluefin/utah",
      org: "projectbluefin",
      package: "utah",
    },
    "testing",
    false,
  );

  assert.equal(info.cosignKeyUrl, null);
  assert.equal(info.hasAttestation, false);
  assert.equal(info.verifyCommand, null);
  assert.equal(info.attestCommand, null);
  assert.equal(info.sbomCommand, null);
});

test("buildTopStreams leaves command null when tag is not in tagSet", () => {
  const spec = {
    org: "projectbluefin",
    package: "utah",
    streamOrder: ["testing"],
  };
  const emptyTagSet = new Set();
  const streams = buildTopStreams(spec, emptyTagSet);

  assert.equal(streams.length, 1);
  assert.equal(streams[0].tag, "testing");
  assert.equal(streams[0].command, null);
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
