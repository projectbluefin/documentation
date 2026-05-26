const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildOsApp,
  buildOsInfo,
  computePackageDiff,
  sanitizeRemoteApp,
} = require("./fetch-firehose.js");

test("computePackageDiff sorts added changed and removed packages", () => {
  const diff = computePackageDiff(
    { zed: "2", alpha: "1", bravo: "2" },
    { bravo: "1", gamma: "9" },
  );

  assert.deepEqual(diff.added, [{ name: "alpha", newVersion: "1", oldVersion: null }, { name: "zed", newVersion: "2", oldVersion: null }]);
  assert.deepEqual(diff.changed, [{ name: "bravo", newVersion: "2", oldVersion: "1" }]);
  assert.deepEqual(diff.removed, [{ name: "gamma", newVersion: null, oldVersion: "9" }]);
});

test("buildOsInfo keeps core OS versions and major packages", () => {
  const info = buildOsInfo("bluefin-stable", {
    fedora: "42",
    kernel: "6.14.0",
    gnome: "48.1",
    mesa: "25.0",
    podman: "5.4",
    systemd: "257",
  });

  assert.deepEqual(info, {
    stream: "bluefin-stable",
    fedoraVersion: "42",
    kernelVersion: "6.14.0",
    gnomeVersion: "48.1",
    mesaVersion: "25.0",
    majorPackages: {
      Podman: "5.4",
      systemd: "257",
    },
  });
});

test("buildOsApp picks the newest populated release and computes package diffs", () => {
  const spec = {
    streamId: "bluefin-stable",
    appId: "bluefin-os-stable",
    name: "Bluefin OS (Stable)",
    summary: "Stable track",
    ghReleasesUrl: "https://github.com/ublue-os/bluefin/releases",
  };
  const sbomCache = {
    streams: {
      "bluefin-stable": {
        releases: {
          "stable-20260402": {
            packageVersions: {
              kernel: "6.14.1",
              gnome: "48.1",
              allPackages: { alpha: "2", beta: "1" },
            },
          },
          "stable-20260401": {
            packageVersions: {
              kernel: "6.14.0",
              gnome: "48.0",
              allPackages: { alpha: "1", gamma: "3" },
            },
          },
        },
      },
    },
  };

  const app = buildOsApp(spec, sbomCache);

  assert.equal(app.currentReleaseVersion, "2026-04-02");
  assert.equal(app.osInfo.kernelVersion, "6.14.1");
  assert.deepEqual(app.releases[0].packageDiff.changed, [
    { name: "alpha", newVersion: "2", oldVersion: "1" },
  ]);
  assert.deepEqual(app.releases[0].packageDiff.removed, [
    { name: "gamma", newVersion: null, oldVersion: "3" },
  ]);
});

test("sanitizeRemoteApp trims strings coerces booleans and limits release entries", () => {
  const app = sanitizeRemoteApp({
    id: "demo",
    name: "Demo",
    summary: "Short summary",
    description: "x".repeat(6000),
    icon: "https://example.com/icon.png",
    isVerified: "yes",
    appSet: "community",
    packageType: "flatpak",
    releases: Array.from({ length: 60 }, (_, index) => ({
      version: `v${index}`,
      title: `Release ${index}`,
      date: "2026-01-01",
      description: "details",
      url: "https://example.com/release",
      type: "remote",
    })),
  });

  assert.equal(app.isVerified, false);
  assert.equal(app.description.length, 5000);
  assert.equal(app.releases.length, 50);
  assert.equal(app.releases[0].version, "v0");
});
