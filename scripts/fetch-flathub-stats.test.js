import test from "node:test";
import assert from "node:assert/strict";

import {
  splitOsKey,
  foldOsVersions,
  bluefinFlatpakVersions,
  trimDaily,
  buildPayload,
} from "./fetch-flathub-stats.js";

test("splitOsKey splits on semicolon", () => {
  assert.deepEqual(splitOsKey("bluefin;44"), { os: "bluefin", version: "44" });
});

test("splitOsKey tolerates unusual keys", () => {
  assert.deepEqual(splitOsKey("CachyOS;unknown"), {
    os: "CachyOS",
    version: "unknown",
  });
});

test("foldOsVersions sums a tracked OS across versions", () => {
  const folded = foldOsVersions({
    "bluefin;44": 410969,
    "bluefin;43": 22039,
    "bluefin;42": 1432,
  });
  const bluefin = folded.get("bluefin");
  assert.equal(bluefin.downloads, 434440);
  assert.deepEqual(bluefin.versions, { 44: 410969, 43: 22039, 42: 1432 });
});

test("foldOsVersions does NOT match lookalike prefixes", () => {
  const folded = foldOsVersions({
    "blue7;44": 100,
    "bluecat;44": 200,
    "bluenebula;44": 300,
    "blueshift-desktop;44": 400,
    "blueskull;44": 500,
    "bluefin;44": 1000,
  });
  assert.equal(folded.has("blue7"), false);
  assert.equal(folded.has("bluecat"), false);
  assert.equal(folded.has("bluenebula"), false);
  assert.equal(folded.has("blueshift-desktop"), false);
  assert.equal(folded.has("blueskull"), false);
  assert.equal(folded.get("bluefin").downloads, 1000);
});

test("bluefinFlatpakVersions merges every bluefin bucket and ignores bazzite", () => {
  const result = bluefinFlatpakVersions({
    "bluefin;44": { "1.16.2": 100, "1.16.1": 50 },
    "bluefin;43": { "1.16.2": 30, "1.14.0": 10 },
    "bazzite;44": { "1.16.2": 99999 },
  });
  assert.equal(result[0].version, "1.16.2");
  assert.equal(result[0].installs, 130);
  assert.equal(result[1].version, "1.16.1");
  assert.equal(result[1].installs, 50);
  assert.equal(result[2].version, "1.14.0");
  assert.equal(result[2].installs, 10);
  assert.equal(result.length, 3);
});

test("trimDaily keeps only the window and sorts ascending", () => {
  const daily = {
    "2026-08-01": 100,
    "2026-08-02": 200,
    "2026-08-03": 300,
  };
  const trimmed = trimDaily(daily, 2);
  assert.equal(trimmed.length, 2);
  assert.equal(trimmed[0].date, "2026-08-02");
  assert.equal(trimmed[1].date, "2026-08-03");
});

test("buildPayload assembles the full shape", () => {
  const data = {
    totals: { downloads: 1000000, number_of_apps: 500, verified_apps: 200 },
    downloads_per_day: { "2026-08-01": 100, "2026-08-02": 200 },
    os_versions: { "bluefin;44": 5000 },
    os_flatpak_versions: { "bluefin;44": { "1.16.2": 42 } },
  };
  const payload = buildPayload(data, { generatedAt: "2026-08-08T00:00:00Z" });

  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.platform.downloads, 1000000);
  assert.equal(payload.platform.apps, 500);
  assert.equal(payload.platform.verifiedApps, 200);
  assert.equal(payload.byOs[0].id, "bluefin");
  assert.equal(payload.byOs[0].downloads, 5000);
  assert.equal(payload.byOs[0].share, 0.005);
  assert.equal(payload.flatpakVersionsOnBluefin[0].version, "1.16.2");
  assert.equal(payload.flatpakVersionsOnBluefin[0].installs, 42);
  assert.equal(payload.downloadsPerDay.length, 2);
});
