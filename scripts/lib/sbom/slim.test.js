import { test } from "node:test";
import assert from "node:assert/strict";

import { buildSlimFrontendStreams } from "./slim.js";

// A realistic-enough streams object: two streams, each with a couple of
// releases carrying a full packageVersions map (allPackages + named versions).
const streams = {
  bluefin: {
    releases: {
      "latest-x86_64": {
        packageVersions: {
          allPackages: {
            rpm1: "1",
            rpm2: "2",
            hugeList: Array(500).fill("0.0"),
          },
          kernel: "6.10.9-200",
          gnome: "47.2",
          mesa: "24.3",
          f30: "41",
        },
        extra: "keep-me",
      },
      "old-x86_64": {
        packageVersions: {
          allPackages: { rpm1: "1" },
          kernel: "6.9.5-200",
        },
      },
    },
  },
  "bluefin-lts": {
    releases: {
      "lts-x86_64": {
        packageVersions: { kernel: "6.12.8-300" },
      },
    },
  },
};

test("buildSlimFrontendStreams drops allPackages from every release", () => {
  const out = buildSlimFrontendStreams(streams);
  for (const stream of Object.values(out)) {
    for (const release of Object.values(stream.releases)) {
      assert.ok(
        !("allPackages" in release.packageVersions),
        "allPackages must be stripped",
      );
    }
  }
});

test("it keeps the named versions the frontend actually needs", () => {
  const out = buildSlimFrontendStreams(streams);
  const bluefin = out.bluefin.releases["latest-x86_64"].packageVersions;
  assert.equal(bluefin.kernel, "6.10.9-200");
  assert.equal(bluefin.gnome, "47.2");
  assert.equal(bluefin.mesa, "24.3");
  assert.equal(bluefin.f30, "41");
  assert.equal(Object.keys(bluefin).length, 4);
});

test("it preserves the stream shape and sibling release fields", () => {
  const out = buildSlimFrontendStreams(streams);
  assert.deepEqual(Object.keys(out), ["bluefin", "bluefin-lts"]);
  assert.equal(out.bluefin.releases["latest-x86_64"].extra, "keep-me");
  assert.deepEqual(Object.keys(out.bluefin.releases), [
    "latest-x86_64",
    "old-x86_64",
  ]);
});

test("it does not mutate the input streams object", () => {
  buildSlimFrontendStreams(streams);
  const latest = streams.bluefin.releases["latest-x86_64"];
  assert.ok("allPackages" in latest.packageVersions, "input must be untouched");
  assert.equal(latest.packageVersions.kernel, "6.10.9-200");
});

test("a release without packageVersions is left intact", () => {
  const out = buildSlimFrontendStreams({
    s: { releases: { r: { packageVersions: undefined, keep: 1 } } },
  });
  assert.deepEqual(out.s.releases.r, { packageVersions: {}, keep: 1 });
});

test("a stream without releases yields an empty releases map", () => {
  const out = buildSlimFrontendStreams({ s: {} });
  assert.deepEqual(out.s.releases, {});
});
