const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isSemverLike,
  BST_PACKAGE_MAP,
  extractBstPackageVersions,
} = require("./lib/sbom/bst.js");
const { buildSlimFrontendStreams } = require("./lib/sbom/slim.js");

/**
 * Dakota / BuildStream images have no RPM PURLs, so their release chips come
 * entirely from BST element paths. Name collisions are the hazard: a Rust crate
 * called `linux` must never be mistaken for the kernel.
 */

// ---------------------------------------------------------------------------
// isSemverLike
// ---------------------------------------------------------------------------

test("isSemverLike accepts digits.digits version strings", () => {
  for (const v of ["50.0", "6.19.11", "26.0.5", "1.6.1", "5.8.2"]) {
    assert.equal(isSemverLike(v), true, v);
  }
});

test("isSemverLike rejects SHAs, empties, and non-strings", () => {
  assert.equal(isSemverLike("c9372e733d75cf1a2b3c4d5e6f708192a3b4c5d6"), false);
  assert.equal(isSemverLike("abc123"), false);
  assert.equal(isSemverLike(""), false);
  assert.equal(isSemverLike(undefined), false);
  assert.equal(isSemverLike(null), false);
  assert.equal(isSemverLike(50.0), false, "numbers are not accepted");
});

test("isSemverLike rejects a single numeric segment", () => {
  assert.equal(isSemverLike("50"), false);
});

test("isSemverLike rejects strings longer than 40 characters", () => {
  assert.equal(isSemverLike(`1.0${"0".repeat(40)}`), false);
});

// ---------------------------------------------------------------------------
// BST_PACKAGE_MAP
// ---------------------------------------------------------------------------

test("BST_PACKAGE_MAP entries are well formed and map to distinct fields", () => {
  const fields = new Set();
  for (const entry of BST_PACKAGE_MAP) {
    assert.equal(typeof entry.name, "string");
    assert.ok(entry.bstSuffix.endsWith(".bst"), entry.bstSuffix);
    assert.equal(
      fields.has(entry.field),
      false,
      `duplicate field ${entry.field}`,
    );
    fields.add(entry.field);
  }
});

// ---------------------------------------------------------------------------
// extractBstPackageVersions
// ---------------------------------------------------------------------------

/** Build a BST SPDX package entry. */
function bstPkg(name, versionInfo, locators) {
  return {
    name,
    versionInfo,
    externalRefs: (locators || []).map((referenceLocator) => ({
      referenceType: "bst-element",
      referenceLocator,
    })),
  };
}

test("extractBstPackageVersions maps every element in BST_PACKAGE_MAP", () => {
  const packages = BST_PACKAGE_MAP.map((entry, i) =>
    bstPkg(entry.name, `${i + 1}.0`, [
      `freedesktop-sdk.bst:${entry.bstSuffix}`,
    ]),
  );
  const got = extractBstPackageVersions({ spdxVersion: "SPDX-2.3", packages });
  BST_PACKAGE_MAP.forEach((entry, i) => {
    assert.equal(got[entry.field], `${i + 1}.0`, entry.field);
  });
});

test("extractBstPackageVersions matches suffixes across junction prefixes", () => {
  const got = extractBstPackageVersions({
    packages: [
      bstPkg("gnome-shell", "50.0", [
        "gnome-build-meta.bst:core/gnome-shell.bst",
      ]),
      bstPkg("mesa", "26.0.5", [
        "freedesktop-sdk.bst:extensions/mesa/mesa.bst",
      ]),
    ],
  });
  assert.equal(got.gnome, "50.0");
  assert.equal(got.mesa, "26.0.5");
});

test("extractBstPackageVersions does not mistake a same-named crate for the kernel", () => {
  const got = extractBstPackageVersions({
    packages: [
      // A Rust crate that happens to be called `linux`.
      bstPkg("linux", "0.2.1", ["freedesktop-sdk.bst:vendor/rust/linux.bst"]),
      // Build-only headers, explicitly not the running kernel.
      bstPkg("linux", "6.19.10", [
        "freedesktop-sdk.bst:components/linux-headers.bst",
      ]),
      bstPkg("linux", "6.19.11", ["freedesktop-sdk.bst:components/linux.bst"]),
    ],
  });
  assert.equal(got.kernel, "6.19.11");
});

test("extractBstPackageVersions keeps the first semver version per name in allPackages", () => {
  const got = extractBstPackageVersions({
    packages: [
      bstPkg("podman", "5.8.2", ["freedesktop-sdk.bst:components/podman.bst"]),
      bstPkg("podman", "9.9.9", [
        "freedesktop-sdk.bst:vendor/podman-alias.bst",
      ]),
    ],
  });
  assert.equal(got.allPackages.podman, "5.8.2");
});

test("extractBstPackageVersions skips packages with no bst-element ref", () => {
  const got = extractBstPackageVersions({
    packages: [
      {
        name: "mesa",
        versionInfo: "26.0.5",
        externalRefs: [
          {
            referenceType: "purl",
            referenceLocator: "pkg:generic/mesa@26.0.5",
          },
        ],
      },
      { name: "podman", versionInfo: "5.8.2" },
    ],
  });
  assert.equal(got.mesa, null);
  assert.deepEqual(got.allPackages, {});
});

test("extractBstPackageVersions skips packages whose version is a SHA or missing", () => {
  const got = extractBstPackageVersions({
    packages: [
      bstPkg("gnome-shell", "c9372e733d75cf1a2b3c4d5e6f708192a3b4c5d6", [
        "gnome-build-meta.bst:core/gnome-shell.bst",
      ]),
      bstPkg("mesa", "", ["freedesktop-sdk.bst:extensions/mesa/mesa.bst"]),
    ],
  });
  assert.equal(got.gnome, null);
  assert.equal(got.mesa, null);
});

test("extractBstPackageVersions returns the full chip shape with fedora null", () => {
  const got = extractBstPackageVersions({ packages: [] });
  assert.deepEqual(got, {
    kernel: null,
    gnome: null,
    mesa: null,
    podman: null,
    systemd: null,
    bootc: null,
    fedora: null,
    pipewire: null,
    flatpak: null,
    nvidia: null,
    allPackages: {},
  });
});

test("extractBstPackageVersions tolerates an SBOM with no packages key", () => {
  assert.equal(extractBstPackageVersions({}).gnome, null);
});

// ---------------------------------------------------------------------------
// buildSlimFrontendStreams
// ---------------------------------------------------------------------------

test("buildSlimFrontendStreams drops allPackages but keeps the named versions", () => {
  const streams = {
    stable: {
      title: "Stable",
      releases: {
        "stable-20260331": {
          tag: "stable-20260331",
          packageVersions: {
            kernel: "6.18.2",
            gnome: "49.5",
            allPackages: { podman: "5.6.0", bash: "5.3.0" },
          },
        },
      },
    },
  };
  const slim = buildSlimFrontendStreams(streams);
  const entry = slim.stable.releases["stable-20260331"];
  assert.equal(entry.packageVersions.allPackages, undefined);
  assert.deepEqual(entry.packageVersions, { kernel: "6.18.2", gnome: "49.5" });
  assert.equal(entry.tag, "stable-20260331", "sibling fields survive");
  assert.equal(slim.stable.title, "Stable", "stream metadata survives");
});

test("buildSlimFrontendStreams does not mutate the source streams", () => {
  const streams = {
    stable: {
      releases: {
        a: {
          packageVersions: { kernel: "6.18.2", allPackages: { bash: "5.3.0" } },
        },
      },
    },
  };
  buildSlimFrontendStreams(streams);
  assert.deepEqual(streams.stable.releases.a.packageVersions.allPackages, {
    bash: "5.3.0",
  });
});

test("buildSlimFrontendStreams handles streams with missing releases or versions", () => {
  const slim = buildSlimFrontendStreams({
    empty: { title: "Empty" },
    partial: { releases: { a: { tag: "a" } } },
  });
  assert.deepEqual(slim.empty.releases, {});
  assert.deepEqual(slim.partial.releases.a, { tag: "a", packageVersions: {} });
});

test("buildSlimFrontendStreams returns an empty object for empty input", () => {
  assert.deepEqual(buildSlimFrontendStreams({}), {});
});
