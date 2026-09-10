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
  buildCacheKey,
  findRecentTagsForStream,
  extractPackageVersions,
} = require("./lib/sbom/parser.js");

/**
 * scripts/lib/sbom/parser.js feeds the release chips on the homepage. A silent
 * regression here does not crash the build — it ships wrong kernel/GNOME/mesa
 * versions, or drops releases from the feed entirely. These tests pin the
 * behaviours the rendering code depends on.
 */

// ---------------------------------------------------------------------------
// RPM version helpers
// ---------------------------------------------------------------------------

test("compareRpmVersions orders segments numerically, not lexicographically", () => {
  // The whole reason this function exists: "6.18.2" must sort below "6.18.13".
  assert.ok(compareRpmVersions("6.18.2-200.fc43", "6.18.13-200.fc43") < 0);
  assert.ok(compareRpmVersions("6.18.13-200.fc43", "6.18.2-200.fc43") > 0);
  assert.equal(compareRpmVersions("6.18.2-200.fc43", "6.18.2-200.fc43"), 0);
});

test("compareRpmVersions treats a missing trailing segment as zero", () => {
  assert.equal(compareRpmVersions("6.18", "6.18.0"), 0);
  assert.ok(compareRpmVersions("6.18", "6.18.1") < 0);
});

test("compareRpmVersions falls back to string compare on non-numeric segments", () => {
  assert.ok(compareRpmVersions("1.0~rc1", "1.0~rc2") < 0);
});

test("stripEpoch removes only a leading numeric epoch", () => {
  assert.equal(stripEpoch("1:25.3.6-6.fc43"), "25.3.6-6.fc43");
  assert.equal(stripEpoch("25.3.6-6.fc43"), "25.3.6-6.fc43");
  // A colon later in the string is not an epoch and must survive.
  assert.equal(stripEpoch("1.2.3-4:5"), "1.2.3-4:5");
});

test("stripEpoch passes empty and undefined through untouched", () => {
  assert.equal(stripEpoch(""), "");
  assert.equal(stripEpoch(undefined), undefined);
});

test("stripRpmRelease keeps only the upstream version", () => {
  assert.equal(stripRpmRelease("49.5-100.el10gnomeqr.el10"), "49.5");
  // No release component: unchanged.
  assert.equal(stripRpmRelease("49.5"), "49.5");
  assert.equal(stripRpmRelease(""), "");
});

// ---------------------------------------------------------------------------
// Tag helpers
// ---------------------------------------------------------------------------

test("extractDateFromTag reads the trailing YYYYMMDD after . or -", () => {
  assert.equal(extractDateFromTag("stable-20260331"), "20260331");
  assert.equal(extractDateFromTag("lts.20260331"), "20260331");
  assert.equal(extractDateFromTag("lts-hwe-testing-20260331"), "20260331");
});

test("extractDateFromTag returns null when there is no trailing date", () => {
  assert.equal(extractDateFromTag("latest"), null);
  assert.equal(extractDateFromTag("lts-20260331-hwe"), null);
  // Not eight digits.
  assert.equal(extractDateFromTag("stable-2026033"), null);
});

test("normaliseLtsTag converts the dotted date separator to a dash", () => {
  assert.equal(normaliseLtsTag("lts.20260331"), "lts-20260331");
  assert.equal(normaliseLtsTag("lts.20260331-hwe"), "lts-20260331-hwe");
  assert.equal(normaliseLtsTag("lts-hwe.20260501"), "lts-hwe-20260501");
  // Dakota date-stamped tags.
  assert.equal(normaliseLtsTag("latest.20260501"), "latest-20260501");
});

test("normaliseLtsTag leaves unrelated streams alone", () => {
  assert.equal(normaliseLtsTag("stable.20260331"), "stable.20260331");
  assert.equal(normaliseLtsTag("gts-20260331"), "gts-20260331");
});

test("buildCacheKey matches the key FeedItems.tsx derives", () => {
  assert.equal(buildCacheKey("stable", "20260331"), "stable-20260331");
});

// ---------------------------------------------------------------------------
// findRecentTagsForStream
// ---------------------------------------------------------------------------

const SPEC = { streamPrefix: "stable", org: "ublue-os", package: "bluefin" };

/** Build a YYYYMMDD string a given number of days before now. */
function daysAgoTag(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return (
    `${d.getUTCFullYear()}` +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

test("findRecentTagsForStream keeps only canonical <prefix>-YYYYMMDD tags", () => {
  const recent = daysAgoTag(3);
  const found = findRecentTagsForStream(
    [
      `stable-${recent}`,
      "stable", // undated
      `stable-daily-${recent}`, // canonical check rejects the extra segment
      `gts-${recent}`, // wrong stream
      "stable-notadate",
    ],
    SPEC,
  );
  assert.deepEqual(
    found.map((f) => f.tag),
    [`stable-${recent}`],
  );
});

test("findRecentTagsForStream builds imageRef from the original casing of the tag", () => {
  const recent = daysAgoTag(1);
  const [entry] = findRecentTagsForStream([`STABLE-${recent}`], SPEC);
  assert.equal(entry.tag, `stable-${recent}`);
  assert.equal(entry.cacheKey, `stable-${recent}`);
  assert.equal(entry.dateStr, recent);
  assert.equal(entry.imageRef, `ghcr.io/ublue-os/bluefin:STABLE-${recent}`);
  assert.equal(
    entry.publishedAt,
    `${recent.slice(0, 4)}-${recent.slice(4, 6)}-${recent.slice(6, 8)}T00:00:00Z`,
  );
});

test("findRecentTagsForStream drops tags older than the lookback window", (t) => {
  t.after(() => {
    delete process.env.SBOM_LOOKBACK_DAYS;
  });
  process.env.SBOM_LOOKBACK_DAYS = "30";
  const fresh = daysAgoTag(5);
  const stale = daysAgoTag(120);
  const found = findRecentTagsForStream(
    [`stable-${fresh}`, `stable-${stale}`],
    SPEC,
  );
  assert.deepEqual(
    found.map((f) => f.tag),
    [`stable-${fresh}`],
  );
});

test("findRecentTagsForStream deduplicates, sorts newest first, and caps the count", (t) => {
  t.after(() => {
    delete process.env.SBOM_MAX_RELEASES;
    delete process.env.SBOM_LOOKBACK_DAYS;
  });
  process.env.SBOM_LOOKBACK_DAYS = "90";
  process.env.SBOM_MAX_RELEASES = "2";
  const d1 = daysAgoTag(1);
  const d2 = daysAgoTag(2);
  const d3 = daysAgoTag(3);
  const found = findRecentTagsForStream(
    // d2 appears twice — once dotted, once dashed — and must collapse to one.
    [`stable-${d3}`, `stable-${d2}`, `stable-${d2}`, `stable-${d1}`],
    SPEC,
  );
  assert.deepEqual(
    found.map((f) => f.tag),
    [`stable-${d1}`, `stable-${d2}`],
  );
});

test("findRecentTagsForStream recognizes version-qualified dated tags", () => {
  const recent = daysAgoTag(2);
  const found = findRecentTagsForStream([`stable-44.${recent}`], SPEC);
  assert.equal(found.length, 1);
  assert.equal(found[0].tag, `stable-44.${recent}`);
  assert.equal(found[0].cacheKey, `stable-${recent}`);
  assert.equal(found[0].dateStr, recent);
});

test("findRecentTagsForStream retains latest-release fallback when lookback finds no releases", (t) => {
  t.after(() => {
    delete process.env.SBOM_LOOKBACK_DAYS;
  });
  process.env.SBOM_LOOKBACK_DAYS = "7";
  const old1 = daysAgoTag(30);
  const old2 = daysAgoTag(60);
  const found = findRecentTagsForStream(
    [`stable-${old2}`, `stable-${old1}`],
    SPEC,
  );
  assert.equal(found.length, 1);
  assert.equal(found[0].dateStr, old1);
});

test("findRecentTagsForStream resolves issue #1082 probe tags", () => {
  const probeTags = [
    "stable-20260606",
    "stable-44.20260606",
    "testing-44.20260720",
  ];
  const stableFound = findRecentTagsForStream(probeTags, SPEC);
  assert.equal(stableFound.length, 1);
  assert.equal(stableFound[0].dateStr, "20260606");
  assert.equal(stableFound[0].cacheKey, "stable-20260606");

  const testingFound = findRecentTagsForStream(probeTags, {
    streamPrefix: "testing",
    org: "projectbluefin",
    package: "utah",
  });
  assert.equal(testingFound.length, 1);
  assert.equal(testingFound[0].dateStr, "20260720");
  assert.equal(testingFound[0].cacheKey, "testing-20260720");
});

// ---------------------------------------------------------------------------
// extractPackageVersions
// ---------------------------------------------------------------------------

/** Write an SBOM object to a temp file and return its path. */
function writeSbom(t, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sbom-test-"));
  const file = path.join(dir, "sbom.json");
  fs.writeFileSync(
    file,
    typeof contents === "string" ? contents : JSON.stringify(contents),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return file;
}

const rpm = (name, version) => ({ name, version, type: "rpm" });

test("extractPackageVersions returns null without a path", () => {
  assert.equal(extractPackageVersions(null), null);
  assert.equal(extractPackageVersions(""), null);
});

test("extractPackageVersions returns null on a missing or malformed file", (t) => {
  assert.equal(extractPackageVersions("/nonexistent/sbom.json"), null);
  assert.equal(extractPackageVersions(writeSbom(t, "{not json")), null);
});

test("extractPackageVersions returns null when there is no artifacts array", (t) => {
  assert.equal(
    extractPackageVersions(writeSbom(t, { artifacts: "nope" })),
    null,
  );
});

test("extractPackageVersions maps Syft RPM artifacts onto the named chips", (t) => {
  const file = writeSbom(t, {
    artifacts: [
      rpm("kernel", "6.18.13-200.fc43"),
      rpm("gnome-shell", "49.5-100.fc43"),
      rpm("mesa-filesystem", "1:25.3.6-6.fc43"),
      rpm("podman", "5.6.0-1.fc43"),
      rpm("systemd", "257.9-1.fc43"),
      rpm("bootc", "1.7.0-1.fc43"),
      rpm("pipewire", "1.4.9-1.fc43"),
      rpm("flatpak", "1.16.2-1.fc43"),
      rpm("nvidia-driver", "580.95-1.fc43"),
      rpm("fedora-release-common", "43-0.10"),
      { name: "some-deb", version: "1.0", type: "deb" },
    ],
  });
  const got = extractPackageVersions(file);
  // The kernel deliberately keeps its release — it is part of its identity.
  assert.equal(got.kernel, "6.18.13-200.fc43");
  assert.equal(got.gnome, "49.5");
  assert.equal(got.mesa, "25.3.6", "epoch prefix must be stripped");
  assert.equal(got.podman, "5.6.0");
  assert.equal(got.systemd, "257.9");
  assert.equal(got.bootc, "1.7.0");
  assert.equal(got.pipewire, "1.4.9");
  assert.equal(got.flatpak, "1.16.2");
  assert.equal(got.nvidia, "580.95");
  assert.equal(got.fedora, "F43");
  assert.equal(
    got.allPackages["some-deb"],
    undefined,
    "non-RPM artifacts are not inventory",
  );
});

test("extractPackageVersions picks the lowest kernel — the booted one", (t) => {
  const file = writeSbom(t, {
    artifacts: [
      rpm("kernel", "6.18.13-200.fc43"),
      rpm("kernel", "6.18.2-200.fc43"),
    ],
  });
  const got = extractPackageVersions(file);
  assert.equal(got.kernel, "6.18.2-200.fc43");
  // allPackages must agree with the displayed chip, release included.
  assert.equal(got.allPackages.kernel, "6.18.2-200.fc43");
});

test("extractPackageVersions leaves kernel null when no kernel RPM is present", (t) => {
  const got = extractPackageVersions(
    writeSbom(t, { artifacts: [rpm("podman", "5.6.0-1.fc43")] }),
  );
  assert.equal(got.kernel, null);
  assert.equal(got.allPackages.kernel, undefined);
});

test("extractPackageVersions keeps the first entry when an RPM appears twice", (t) => {
  const got = extractPackageVersions(
    writeSbom(t, {
      artifacts: [rpm("podman", "5.6.0-1.fc43"), rpm("podman", "9.9.9-1.fc43")],
    }),
  );
  assert.equal(got.podman, "5.6.0");
});

test("extractPackageVersions skips artifacts missing a name or version", (t) => {
  const got = extractPackageVersions(
    writeSbom(t, {
      artifacts: [
        { name: "", version: "1.0", type: "rpm" },
        { name: "ghost", version: null, type: "rpm" },
        rpm("real", "1.2.3-1.fc43"),
      ],
    }),
  );
  assert.deepEqual(got.allPackages, { real: "1.2.3" });
});

test("extractPackageVersions ignores a fedora-release version with no leading digits", (t) => {
  const got = extractPackageVersions(
    writeSbom(t, {
      artifacts: [rpm("fedora-release-common", "rawhide")],
    }),
  );
  assert.equal(got.fedora, null);
});

test("extractPackageVersions reads SPDX packages via their pkg:rpm PURL", (t) => {
  const spdxPkg = (name, versionInfo) => ({
    name,
    versionInfo,
    externalRefs: [
      {
        referenceCategory: "PACKAGE-MANAGER",
        referenceLocator: `pkg:rpm/fedora/${name}@${versionInfo}`,
      },
    ],
  });
  const file = writeSbom(t, {
    spdxVersion: "SPDX-2.3",
    packages: [
      spdxPkg("kernel", "6.12.0-224.el10"),
      spdxPkg("gnome-shell", "49.5-100.el10"),
      {
        name: "not-an-rpm",
        versionInfo: "1.0",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceLocator: "pkg:golang/example.com/mod@1.0",
          },
        ],
      },
      { name: "no-refs", versionInfo: "2.0" },
    ],
  });
  const got = extractPackageVersions(file);
  assert.equal(got.kernel, "6.12.0-224.el10", "kernel keeps its release");
  assert.equal(got.gnome, "49.5");
  assert.equal(got.allPackages["not-an-rpm"], undefined);
  assert.equal(got.allPackages["no-refs"], undefined);
});

test("extractPackageVersions routes BST SPDX to the BuildStream extractor", (t) => {
  const file = writeSbom(t, {
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
  });
  const got = extractPackageVersions(file);
  assert.equal(got.gnome, "50.0");
  // GNOME OS images are not Fedora — the chip must stay empty.
  assert.equal(got.fedora, null);
});
