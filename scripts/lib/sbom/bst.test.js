"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isSemverLike, BST_PACKAGE_MAP, extractBstPackageVersions } = require("./bst.js");

// ---------------------------------------------------------------------------
// isSemverLike
// ---------------------------------------------------------------------------

describe("isSemverLike", () => {
  it("accepts standard semver versions", () => {
    assert.strictEqual(isSemverLike("50.0"), true);
    assert.strictEqual(isSemverLike("6.19.11"), true);
    assert.strictEqual(isSemverLike("26.0.5"), true);
    assert.strictEqual(isSemverLike("1.6.1"), true);
    assert.strictEqual(isSemverLike("5.8.2"), true);
  });

  it("accepts two-segment versions", () => {
    assert.strictEqual(isSemverLike("1.0"), true);
    assert.strictEqual(isSemverLike("0.1"), true);
  });

  it("rejects null, undefined, and empty string", () => {
    assert.strictEqual(isSemverLike(null), false);
    assert.strictEqual(isSemverLike(undefined), false);
    assert.strictEqual(isSemverLike(""), false);
  });

  it("rejects non-string values", () => {
    assert.strictEqual(isSemverLike(123), false);
    assert.strictEqual(isSemverLike({}), false);
    assert.strictEqual(isSemverLike([]), false);
  });

  it("rejects full git SHAs (>40 chars)", () => {
    const sha = "c9372e733d75cf1234567890abcdef1234567890a";
    assert.ok(sha.length > 40);
    assert.strictEqual(isSemverLike(sha), false);
  });

  it("rejects strings that don't start with digits.digits", () => {
    assert.strictEqual(isSemverLike("abc123"), false);
    assert.strictEqual(isSemverLike("v1.0"), false);
    assert.strictEqual(isSemverLike("1"), false);
    assert.strictEqual(isSemverLike("1-beta"), false);
  });

  it("accepts 40-char string starting with digits.digits", () => {
    // Exactly 40 chars is allowed (not > 40)
    const ver = "1.0" + "x".repeat(37);
    assert.strictEqual(ver.length, 40);
    assert.strictEqual(isSemverLike(ver), true);
  });
});

// ---------------------------------------------------------------------------
// BST_PACKAGE_MAP
// ---------------------------------------------------------------------------

describe("BST_PACKAGE_MAP", () => {
  it("contains expected entries", () => {
    const fields = BST_PACKAGE_MAP.map((e) => e.field);
    assert.ok(fields.includes("gnome"));
    assert.ok(fields.includes("kernel"));
    assert.ok(fields.includes("mesa"));
    assert.ok(fields.includes("pipewire"));
    assert.ok(fields.includes("podman"));
    assert.ok(fields.includes("flatpak"));
    assert.ok(fields.includes("bootc"));
    assert.ok(fields.includes("systemd"));
    assert.ok(fields.includes("nvidia"));
  });

  it("each entry has name, bstSuffix, and field", () => {
    for (const entry of BST_PACKAGE_MAP) {
      assert.ok(typeof entry.name === "string" && entry.name.length > 0);
      assert.ok(typeof entry.bstSuffix === "string" && entry.bstSuffix.endsWith(".bst"));
      assert.ok(typeof entry.field === "string" && entry.field.length > 0);
    }
  });

  it("has no duplicate fields", () => {
    const fields = BST_PACKAGE_MAP.map((e) => e.field);
    assert.strictEqual(fields.length, new Set(fields).size);
  });
});

// ---------------------------------------------------------------------------
// extractBstPackageVersions
// ---------------------------------------------------------------------------

describe("extractBstPackageVersions", () => {
  function makeBstPackage(name, version, bstElementPath) {
    return {
      name,
      versionInfo: version,
      externalRefs: [
        {
          referenceType: "bst-element",
          referenceLocator: bstElementPath,
        },
      ],
    };
  }

  it("returns default structure with all null fields for empty SBOM", () => {
    const result = extractBstPackageVersions({ packages: [], spdxVersion: "2.3" });
    assert.strictEqual(result.kernel, null);
    assert.strictEqual(result.gnome, null);
    assert.strictEqual(result.mesa, null);
    assert.strictEqual(result.podman, null);
    assert.strictEqual(result.systemd, null);
    assert.strictEqual(result.bootc, null);
    assert.strictEqual(result.fedora, null);
    assert.strictEqual(result.pipewire, null);
    assert.strictEqual(result.flatpak, null);
    assert.strictEqual(result.nvidia, null);
    assert.deepStrictEqual(result.allPackages, {});
  });

  it("extracts gnome-shell version via BST element suffix", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "47.3", "gnome-build-meta.bst:core/gnome-shell.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, "47.3");
    assert.strictEqual(result.allPackages["gnome-shell"], "47.3");
  });

  it("extracts kernel version from components/linux.bst", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("linux", "6.12.5", "freedesktop-sdk.bst:components/linux.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.kernel, "6.12.5");
  });

  it("extracts mesa via extensions path", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("mesa", "24.3.1", "freedesktop-sdk.bst:extensions/mesa/mesa.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.mesa, "24.3.1");
  });

  it("extracts nvidia driver version", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("NVIDIA-Linux-x86", "565.77", "gnome-build-meta.bst:bluefin-nvidia/nvidia-drivers.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.nvidia, "565.77");
  });

  it("skips packages without bst-element externalRefs", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        {
          name: "gnome-shell",
          versionInfo: "47.3",
          externalRefs: [{ referenceType: "purl", referenceLocator: "pkg:rpm/gnome-shell" }],
        },
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, null);
    assert.deepStrictEqual(result.allPackages, {});
  });

  it("skips packages with non-semver versions (git SHAs)", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "c9372e733d75cfabcdef1234567890abcdef12345", "core/gnome-shell.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, null);
  });

  it("skips packages with empty or missing version", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "", "core/gnome-shell.bst"),
        { name: "mesa", externalRefs: [{ referenceType: "bst-element", referenceLocator: "extensions/mesa/mesa.bst" }] },
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, null);
    assert.strictEqual(result.mesa, null);
  });

  it("populates allPackages for every BST component with semver", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "47.3", "core/gnome-shell.bst"),
        makeBstPackage("glib", "2.82.0", "core-deps/glib.bst"),
        makeBstPackage("gtk", "4.16.3", "core/gtk.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.allPackages["gnome-shell"], "47.3");
    assert.strictEqual(result.allPackages["glib"], "2.82.0");
    assert.strictEqual(result.allPackages["gtk"], "4.16.3");
  });

  it("uses first semver version per name (deduplication)", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("mesa", "24.3.1", "extensions/mesa/mesa.bst"),
        makeBstPackage("mesa", "24.3.2", "extensions/mesa/mesa-other.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.allPackages["mesa"], "24.3.1");
    assert.strictEqual(result.mesa, "24.3.1");
  });

  it("first matching BST_PACKAGE_MAP entry wins for named fields", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "47.3", "gnome-build-meta.bst:core/gnome-shell.bst"),
        makeBstPackage("gnome-shell", "47.4", "other-junction.bst:core/gnome-shell.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, "47.3");
  });

  it("fedora is always null (GNOME OS based)", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "47.3", "core/gnome-shell.bst"),
        makeBstPackage("linux", "6.12.5", "components/linux.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.fedora, null);
  });

  it("handles missing packages field gracefully", () => {
    const result = extractBstPackageVersions({ spdxVersion: "2.3" });
    assert.deepStrictEqual(result.allPackages, {});
  });

  it("handles packages with missing externalRefs", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [{ name: "gnome-shell", versionInfo: "47.3" }],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, null);
  });

  it("extracts multiple named fields from a full SBOM", () => {
    const sbom = {
      spdxVersion: "2.3",
      packages: [
        makeBstPackage("gnome-shell", "47.3", "gnome-build-meta.bst:core/gnome-shell.bst"),
        makeBstPackage("linux", "6.12.5", "freedesktop-sdk.bst:components/linux.bst"),
        makeBstPackage("mesa", "24.3.1", "freedesktop-sdk.bst:extensions/mesa/mesa.bst"),
        makeBstPackage("pipewire", "1.2.7", "freedesktop-sdk.bst:components/pipewire-base.bst"),
        makeBstPackage("podman", "5.3.1", "gnome-build-meta.bst:components/podman.bst"),
        makeBstPackage("flatpak", "1.15.12", "freedesktop-sdk.bst:components/flatpak.bst"),
        makeBstPackage("bootc", "0.1.15", "gnome-build-meta.bst:gnomeos-deps/bootc.bst"),
        makeBstPackage("systemd", "257.1", "freedesktop-sdk.bst:core-deps/systemd-base.bst"),
        makeBstPackage("NVIDIA-Linux-x86", "565.77", "gnome-build-meta.bst:bluefin-nvidia/nvidia-drivers.bst"),
      ],
    };
    const result = extractBstPackageVersions(sbom);
    assert.strictEqual(result.gnome, "47.3");
    assert.strictEqual(result.kernel, "6.12.5");
    assert.strictEqual(result.mesa, "24.3.1");
    assert.strictEqual(result.pipewire, "1.2.7");
    assert.strictEqual(result.podman, "5.3.1");
    assert.strictEqual(result.flatpak, "1.15.12");
    assert.strictEqual(result.bootc, "0.1.15");
    assert.strictEqual(result.systemd, "257.1");
    assert.strictEqual(result.nvidia, "565.77");
    assert.strictEqual(result.fedora, null);
    assert.strictEqual(Object.keys(result.allPackages).length, 9);
  });
});
