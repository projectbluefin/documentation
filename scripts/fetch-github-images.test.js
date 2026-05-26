const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSecurityInfo,
  buildTestingStreams,
  normalizeTestingTag,
  parseFeedVersion,
  sbomVersionsForStream,
} = require("./fetch-github-images.js");

test("normalizeTestingTag strips architecture and date suffixes", () => {
  assert.equal(normalizeTestingTag("lts-testing-20260401-amd64"), "lts-testing");
  assert.equal(normalizeTestingTag("lts.hwe.testing-2-arm64"), "lts.hwe.testing-2");
});

test("buildTestingStreams keeps supported testing families and deduplicates normalized tags", () => {
  const spec = {
    allowTestingStreams: true,
    org: "ublue-os",
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

  assert.deepEqual(streams.map((stream) => stream.tag), ["lts-hwe-testing-1"]);
  assert.match(streams[0].command, /ghcr\.io\/ublue-os\/bluefin:lts-hwe-testing-1/);
});

test("sbomVersionsForStream falls back from testing stream to base stream", () => {
  const spec = {
    org: "ublue-os",
    package: "bluefin",
    sbomStreamId: "bluefin-lts",
  };
  const sbomCache = {
    streams: {
      "bluefin-lts": {
        id: "bluefin-lts",
        org: "ublue-os",
        package: "bluefin",
        releases: {
          "lts-20260401": {
            packageVersions: { kernel: "6.14.0", gnome: "48.1" },
          },
        },
      },
    },
  };

  assert.deepEqual(
    sbomVersionsForStream(sbomCache, spec, "lts-testing"),
    { kernel: "6.14.0", gnome: "48.1" },
  );
});

test("buildSecurityInfo returns keyless verification commands for keyless repos", () => {
  const info = buildSecurityInfo(
    { keyRepo: "ublue-os/bluefin", org: "ublue-os", package: "bluefin" },
    "stable",
  );

  assert.equal(info.cosignKeyUrl, null);
  assert.equal(info.hasAttestation, true);
  assert.match(info.verifyCommand, /certificate-identity-regexp/);
  assert.match(info.attestCommand, /https:\/\/slsa\.dev\/provenance\/v1/);
});

test("parseFeedVersion returns the newest arrow-separated value for a label", () => {
  const feedItem = {
    content: "<table><tr><td><strong>Nvidia</strong></td><td>570.1 ➡️ 575.2</td></tr></table>",
  };

  assert.equal(parseFeedVersion(feedItem, ["Nvidia"]), "575.2");
  assert.equal(parseFeedVersion(feedItem, ["Kernel"]), null);
});
