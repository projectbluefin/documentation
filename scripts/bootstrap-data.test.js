const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSeeds } = require("./bootstrap-data.js");

test("buildSeeds returns deterministic build-safe data for every generated input", () => {
  const first = buildSeeds();
  const second = buildSeeds();

  assert.deepEqual(first, second);
  for (const name of [
    "playlist-metadata.json",
    "file-contributors.json",
    "github-repos.json",
    "github-profiles.json",
    "driver-versions.json",
    "stream-pins.json",
    "images.json",
    "firehose-apps.json",
    "sbom-attestations.json",
    "sbom-attestations-frontend.json",
    "gnome-extensions.json",
    "hive-history.json",
    "registry-data.json",
    "factory-stats.json",
    "hive-live-data.json",
    "countme-history.json",
    "brew-analytics.json",
    "flathub-stats.json",
    "scorecard-history.json",
    "dora.json",
    "test-runs.json",
    "ghcr-packages.json",
  ]) {
    assert.ok(first.data[name], `missing seed for ${name}`);
  }

  assert.ok(first.feeds["bluefin-releases.json"]);
  assert.ok(first.feeds["bluefin-lts-releases.json"]);
});
