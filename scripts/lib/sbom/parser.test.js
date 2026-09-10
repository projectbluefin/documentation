const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  compareRpmVersions,
  stripEpoch,
  stripRpmRelease,
  extractDateFromTag,
  normaliseLtsTag,
  matchesStreamTag,
  buildCacheKey,
  findRecentTagsForStream,
  extractPackageVersions,
} = require("./parser.js");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function withTempSbom(contents, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sbom-parser-test-"));
  const file = path.join(dir, "sbom.json");
  fs.writeFileSync(
    file,
    typeof contents === "string" ? contents : JSON.stringify(contents),
    "utf8",
  );
  try {
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Silence the parser's progress/warning output for the duration of fn. */
function quiet(fn) {
  const log = console.log;
  const warn = console.warn;
  console.log = () => {};
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
}

function rpm(name, version) {
  return { name, version, type: "rpm" };
}

function daysAgoTag(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

const STABLE_SPEC = {
  streamPrefix: "stable",
  org: "ublue-os",
  package: "bluefin",
};

// ---------------------------------------------------------------------------
// compareRpmVersions
// ---------------------------------------------------------------------------

test("compareRpmVersions compares segments numerically, not lexicographically", () => {
  assert.ok(compareRpmVersions("6.18.2-200.fc43", "6.18.13-200.fc43") < 0);
  assert.ok(compareRpmVersions("6.18.13-200.fc43", "6.18.2-200.fc43") > 0);
  assert.equal(compareRpmVersions("6.18.2-200.fc43", "6.18.2-200.fc43"), 0);
});

test("compareRpmVersions treats missing trailing segments as zero", () => {
  assert.equal(compareRpmVersions("6.18", "6.18.0"), 0);
  assert.ok(compareRpmVersions("6.18", "6.18.1") < 0);
});

test("compareRpmVersions falls back to string compare for non-numeric segments", () => {
  assert.ok(compareRpmVersions("1.0~rc1", "1.0~rc2") < 0);
  assert.equal(compareRpmVersions("1.0~rc1", "1.0~rc1"), 0);
});

test("compareRpmVersions sorts a kernel list so the booted (lowest) kernel is first", () => {
  const versions = ["6.18.13-200.fc43", "6.18.2-200.fc43", "6.19.0-100.fc43"];
  versions.sort(compareRpmVersions);
  assert.equal(versions[0], "6.18.2-200.fc43");
  assert.equal(versions[2], "6.19.0-100.fc43");
});

// ---------------------------------------------------------------------------
// stripEpoch / stripRpmRelease
// ---------------------------------------------------------------------------

test("stripEpoch removes a leading epoch prefix only", () => {
  assert.equal(stripEpoch("1:25.3.6-6.fc43"), "25.3.6-6.fc43");
  assert.equal(stripEpoch("10:1.2.3"), "1.2.3");
  assert.equal(stripEpoch("25.3.6-6.fc43"), "25.3.6-6.fc43");
});

test("stripEpoch passes through falsy input unchanged", () => {
  assert.equal(stripEpoch(""), "");
  assert.equal(stripEpoch(null), null);
  assert.equal(stripEpoch(undefined), undefined);
});

test("stripRpmRelease keeps only the upstream version", () => {
  assert.equal(stripRpmRelease("49.5-100.el10gnomeqr.el10"), "49.5");
  assert.equal(stripRpmRelease("25.3.6-6.fc43"), "25.3.6");
});

test("stripRpmRelease is a no-op when there is no release suffix", () => {
  assert.equal(stripRpmRelease("49.5"), "49.5");
  assert.equal(stripRpmRelease(""), "");
  assert.equal(stripRpmRelease(null), null);
});

// ---------------------------------------------------------------------------
// extractDateFromTag / normaliseLtsTag / buildCacheKey
// ---------------------------------------------------------------------------

test("extractDateFromTag pulls the trailing YYYYMMDD after a dash or dot", () => {
  assert.equal(extractDateFromTag("stable-20260331"), "20260331");
  assert.equal(extractDateFromTag("lts.20260331"), "20260331");
  assert.equal(extractDateFromTag("lts-hwe-testing-20260331"), "20260331");
});

test("extractDateFromTag returns null when there is no trailing date", () => {
  assert.equal(extractDateFromTag("latest"), null);
  assert.equal(extractDateFromTag("stable-2026033"), null);
  assert.equal(extractDateFromTag("stable-20260331-hwe"), null);
});

test("normaliseLtsTag converts the dot separator to a dash for lts and latest", () => {
  assert.equal(normaliseLtsTag("lts.20260331"), "lts-20260331");
  assert.equal(normaliseLtsTag("lts.20260331-hwe"), "lts-20260331-hwe");
  assert.equal(normaliseLtsTag("lts-hwe.20260501"), "lts-hwe-20260501");
  assert.equal(normaliseLtsTag("latest.20260501"), "latest-20260501");
});

test("normaliseLtsTag leaves unrelated tags untouched", () => {
  assert.equal(normaliseLtsTag("stable.20260331"), "stable.20260331");
  assert.equal(normaliseLtsTag("lts-20260331"), "lts-20260331");
});

test("buildCacheKey joins the stream prefix and date with a dash", () => {
  assert.equal(buildCacheKey("stable", "20260331"), "stable-20260331");
  assert.equal(buildCacheKey("lts-hwe", "20260501"), "lts-hwe-20260501");
});

// ---------------------------------------------------------------------------
// findRecentTagsForStream
// ---------------------------------------------------------------------------

test("findRecentTagsForStream keeps only canonical tags for the requested stream", () => {
  const recent = daysAgoTag(1);
  const tags = [
    `stable-${recent}`,
    `gts-${recent}`,
    `stable-${recent}-hwe`,
    "stable",
    "latest",
  ];

  const found = findRecentTagsForStream(tags, STABLE_SPEC);

  assert.equal(found.length, 1);
  assert.equal(found[0].tag, `stable-${recent}`);
  assert.equal(found[0].cacheKey, `stable-${recent}`);
  assert.equal(found[0].dateStr, recent);
  assert.equal(found[0].imageRef, `ghcr.io/ublue-os/bluefin:stable-${recent}`);
  assert.equal(
    found[0].publishedAt,
    `${recent.slice(0, 4)}-${recent.slice(4, 6)}-${recent.slice(6, 8)}T00:00:00Z`,
  );
});

test("findRecentTagsForStream drops tags older than the lookback window", () => {
  const tags = [`stable-${daysAgoTag(1)}`, "stable-20200101"];
  const found = findRecentTagsForStream(tags, STABLE_SPEC);
  assert.deepEqual(
    found.map((f) => f.dateStr),
    [daysAgoTag(1)],
  );
});

test("findRecentTagsForStream sorts newest first and deduplicates by cache key", () => {
  const older = daysAgoTag(10);
  const newer = daysAgoTag(2);
  const tags = [`stable-${older}`, `stable-${newer}`, `STABLE-${newer}`];

  const found = findRecentTagsForStream(tags, STABLE_SPEC);

  assert.deepEqual(
    found.map((f) => f.dateStr),
    [newer, older],
  );
});

test("findRecentTagsForStream normalises lts dot tags before matching", () => {
  const recent = daysAgoTag(3);
  const found = findRecentTagsForStream([`lts.${recent}`], {
    streamPrefix: "lts",
    org: "ublue-os",
    package: "bluefin-lts",
  });

  assert.equal(found.length, 1);
  assert.equal(found[0].tag, `lts-${recent}`);
  // imageRef must keep the original (un-normalised) tag so the pull works.
  assert.equal(found[0].imageRef, `ghcr.io/ublue-os/bluefin-lts:lts.${recent}`);
});

test("findRecentTagsForStream honours SBOM_MAX_RELEASES", () => {
  const tags = [1, 2, 3, 4].map((d) => `stable-${daysAgoTag(d)}`);
  const previous = process.env.SBOM_MAX_RELEASES;
  process.env.SBOM_MAX_RELEASES = "2";
  try {
    assert.equal(findRecentTagsForStream(tags, STABLE_SPEC).length, 2);
  } finally {
    if (previous === undefined) delete process.env.SBOM_MAX_RELEASES;
    else process.env.SBOM_MAX_RELEASES = previous;
  }
});

test("findRecentTagsForStream honours SBOM_LOOKBACK_DAYS when recent releases exist", () => {
  const tags = [`stable-${daysAgoTag(3)}`, `stable-${daysAgoTag(30)}`];
  const previous = process.env.SBOM_LOOKBACK_DAYS;
  process.env.SBOM_LOOKBACK_DAYS = "7";
  try {
    const found = findRecentTagsForStream(tags, STABLE_SPEC);
    assert.equal(found.length, 1);
    assert.equal(found[0].dateStr, daysAgoTag(3));
  } finally {
    if (previous === undefined) delete process.env.SBOM_LOOKBACK_DAYS;
    else process.env.SBOM_LOOKBACK_DAYS = previous;
  }
});

test("findRecentTagsForStream retains latest-release fallback when lookback finds no releases", () => {
  const tags = [`stable-${daysAgoTag(30)}`, `stable-${daysAgoTag(60)}`];
  const previous = process.env.SBOM_LOOKBACK_DAYS;
  process.env.SBOM_LOOKBACK_DAYS = "7";
  try {
    const found = findRecentTagsForStream(tags, STABLE_SPEC);
    assert.equal(found.length, 1);
    assert.equal(found[0].dateStr, daysAgoTag(30));
  } finally {
    if (previous === undefined) delete process.env.SBOM_LOOKBACK_DAYS;
    else process.env.SBOM_LOOKBACK_DAYS = previous;
  }
});

test("findRecentTagsForStream supports version-qualified live tags", () => {
  const recent = daysAgoTag(3);
  const tags = [
    `stable-44.${recent}`,
    `testing-44.${recent}`,
    "stable-44.notadate",
  ];
  const found = findRecentTagsForStream(tags, STABLE_SPEC);
  assert.equal(found.length, 1);
  assert.equal(found[0].tag, `stable-44.${recent}`);
  assert.equal(found[0].cacheKey, `stable-${recent}`);
  assert.equal(found[0].dateStr, recent);
  assert.equal(
    found[0].imageRef,
    `ghcr.io/ublue-os/bluefin:stable-44.${recent}`,
  );
});

test("findRecentTagsForStream handles issue #1082 probe tags and fallback", () => {
  const probeTags = [
    "stable-20260606",
    "stable-44.20260606",
    "testing-44.20260720",
  ];

  // For stable: both tags are older than 90-day lookback from now, so fallback retains 20260606
  const stableFound = findRecentTagsForStream(probeTags, STABLE_SPEC);
  assert.equal(stableFound.length, 1);
  assert.equal(stableFound[0].dateStr, "20260606");
  assert.equal(stableFound[0].cacheKey, "stable-20260606");
  // Exact canonical tag is preferred over version-qualified when both exist
  assert.equal(stableFound[0].tag, "stable-20260606");

  // For testing: testing-44.20260720 is recognized
  const testingSpec = {
    streamPrefix: "testing",
    org: "projectbluefin",
    package: "utah",
  };
  const testingFound = findRecentTagsForStream(probeTags, testingSpec);
  assert.equal(testingFound.length, 1);
  assert.equal(testingFound[0].dateStr, "20260720");
  assert.equal(testingFound[0].cacheKey, "testing-20260720");
  assert.equal(testingFound[0].tag, "testing-44.20260720");
});

test("matchesStreamTag matches canonical and version-qualified tags", () => {
  assert.equal(matchesStreamTag("stable-20260606", "stable", "20260606"), true);
  assert.equal(matchesStreamTag("stable.20260606", "stable", "20260606"), true);
  assert.equal(
    matchesStreamTag("stable-44.20260606", "stable", "20260606"),
    true,
  );
  assert.equal(
    matchesStreamTag("stable-44-20260606", "stable", "20260606"),
    true,
  );
  assert.equal(
    matchesStreamTag("testing-44.20260720", "testing", "20260720"),
    true,
  );
  assert.equal(
    matchesStreamTag("stable-daily-44.20260530", "stable-daily", "20260530"),
    true,
  );
  // Rejections
  assert.equal(
    matchesStreamTag("stable-daily-20260606", "stable", "20260606"),
    false,
  );
  assert.equal(
    matchesStreamTag("stable-daily-44.20260606", "stable", "20260606"),
    false,
  );
  assert.equal(
    matchesStreamTag("stable-20260606-hwe", "stable", "20260606"),
    false,
  );
  assert.equal(matchesStreamTag("gts-20260606", "stable", "20260606"), false);
});

test("findRecentTagsForStream returns an empty list for no tags", () => {
  assert.deepEqual(findRecentTagsForStream([], STABLE_SPEC), []);
});

// ---------------------------------------------------------------------------
// extractPackageVersions — failure paths
// ---------------------------------------------------------------------------

test("extractPackageVersions returns null without a path", () => {
  assert.equal(extractPackageVersions(null), null);
  assert.equal(extractPackageVersions(""), null);
});

test("extractPackageVersions returns null when the file is missing or malformed", () => {
  quiet(() => {
    assert.equal(extractPackageVersions("/nonexistent/sbom.json"), null);
    withTempSbom("{not json", (file) => {
      assert.equal(extractPackageVersions(file), null);
    });
  });
});

test("extractPackageVersions returns null when there is no artifacts array", () => {
  quiet(() => {
    withTempSbom({ artifacts: "nope" }, (file) => {
      assert.equal(extractPackageVersions(file), null);
    });
    withTempSbom({}, (file) => {
      assert.equal(extractPackageVersions(file), null);
    });
  });
});

// ---------------------------------------------------------------------------
// extractPackageVersions — Syft JSON
// ---------------------------------------------------------------------------

test("extractPackageVersions maps the tracked Syft RPM artifacts", () => {
  const sbom = {
    artifacts: [
      rpm("kernel", "6.18.2-200.fc43"),
      rpm("gnome-shell", "49.5-1.fc43"),
      rpm("mesa-filesystem", "1:25.3.6-6.fc43"),
      rpm("podman", "5.7.0-1.fc43"),
      rpm("systemd", "258-1.fc43"),
      rpm("bootc", "1.7.0-1.fc43"),
      rpm("pipewire", "1.4.10-1.fc43"),
      rpm("flatpak", "1.16.2-1.fc43"),
      rpm("nvidia-driver", "580.95.05-1.fc43"),
      rpm("fedora-release-common", "43-1.fc43"),
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.kernel, "6.18.2-200.fc43");
  assert.equal(result.gnome, "49.5");
  assert.equal(result.mesa, "25.3.6");
  assert.equal(result.podman, "5.7.0");
  assert.equal(result.systemd, "258");
  assert.equal(result.bootc, "1.7.0");
  assert.equal(result.pipewire, "1.4.10");
  assert.equal(result.flatpak, "1.16.2");
  assert.equal(result.nvidia, "580.95.05");
  assert.equal(result.fedora, "F43");
});

test("extractPackageVersions picks the lowest (booted) kernel", () => {
  const sbom = {
    artifacts: [
      rpm("kernel", "6.18.13-200.fc43"),
      rpm("kernel", "6.18.2-200.fc43"),
      rpm("kernel-core", "6.18.13-200.fc43"),
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.kernel, "6.18.2-200.fc43");
  // allPackages keeps the booted kernel with its release, unlike other packages.
  assert.equal(result.allPackages.kernel, "6.18.2-200.fc43");
  assert.equal(result.allPackages["kernel-core"], "6.18.13");
});

test("extractPackageVersions leaves kernel null when no kernel RPM is present", () => {
  const result = quiet(() =>
    withTempSbom(
      { artifacts: [rpm("podman", "5.7.0-1.fc43")] },
      extractPackageVersions,
    ),
  );

  assert.equal(result.kernel, null);
  assert.equal(result.allPackages.kernel, undefined);
});

test("extractPackageVersions keeps the first occurrence of a duplicated package", () => {
  const sbom = {
    artifacts: [rpm("podman", "5.7.0-1.fc43"), rpm("podman", "5.8.0-1.fc43")],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.podman, "5.7.0");
});

test("extractPackageVersions ignores non-RPM artifacts and incomplete entries", () => {
  const sbom = {
    artifacts: [
      { name: "npm-thing", version: "1.0.0", type: "npm" },
      { name: "podman", type: "rpm" },
      { version: "1.2.3", type: "rpm" },
      rpm("bootc", "1.7.0-1.fc43"),
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.bootc, "1.7.0");
  assert.equal(result.podman, null);
  assert.deepEqual(Object.keys(result.allPackages), ["bootc"]);
});

test("extractPackageVersions leaves fedora null for an unparseable release version", () => {
  const result = quiet(() =>
    withTempSbom(
      { artifacts: [rpm("fedora-release-common", "rawhide")] },
      extractPackageVersions,
    ),
  );

  assert.equal(result.fedora, null);
});

test("extractPackageVersions strips the epoch before deriving the Fedora release", () => {
  const result = quiet(() =>
    withTempSbom(
      { artifacts: [rpm("fedora-release-common", "1:43-1.fc43")] },
      extractPackageVersions,
    ),
  );

  assert.equal(result.fedora, "F43");
});

// ---------------------------------------------------------------------------
// extractPackageVersions — SPDX JSON
// ---------------------------------------------------------------------------

function spdxRpm(name, version) {
  return {
    name,
    versionInfo: version,
    externalRefs: [
      {
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: `pkg:rpm/fedora/${name}@${version}`,
      },
    ],
  };
}

test("extractPackageVersions parses SPDX packages with pkg:rpm PURLs", () => {
  const sbom = {
    spdxVersion: "SPDX-2.3",
    packages: [
      spdxRpm("kernel", "6.12.0-224.el10"),
      spdxRpm("gnome-shell", "49.5-100.el10"),
      { name: "not-an-rpm", versionInfo: "1.0.0", externalRefs: [] },
      { name: "no-refs", versionInfo: "2.0.0" },
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.kernel, "6.12.0-224.el10");
  assert.equal(result.gnome, "49.5");
  assert.equal(result.allPackages["not-an-rpm"], undefined);
  assert.equal(result.allPackages["no-refs"], undefined);
});

test("extractPackageVersions ignores non-PACKAGE-MANAGER external refs in SPDX", () => {
  const sbom = {
    spdxVersion: "SPDX-2.3",
    packages: [
      {
        name: "podman",
        versionInfo: "5.7.0-1.el10",
        externalRefs: [
          {
            referenceCategory: "SECURITY",
            referenceLocator: "pkg:rpm/fedora/podman@5.7.0",
          },
        ],
      },
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.podman, null);
  assert.deepEqual(result.allPackages, {});
});

test("extractPackageVersions routes BST SPDX documents to the BST extractor", () => {
  const sbom = {
    spdxVersion: "SPDX-2.3",
    packages: [
      {
        name: "gnome-shell",
        versionInfo: "50.0",
        externalRefs: [
          {
            referenceType: "bst-element",
            referenceLocator: "gnome-build-meta.bst:core/gnome-shell.bst",
          },
        ],
      },
    ],
  };

  const result = quiet(() => withTempSbom(sbom, extractPackageVersions));

  assert.equal(result.gnome, "50.0");
});
