const test = require("node:test");
const assert = require("node:assert");

const {
  COSIGN_KEY_LTS,
  SIGNING_TRUST,
  trustForRepo,
  requireTrustForRepo,
  knownSigningRepos,
} = require("./lib/signing-trust");

const { STREAM_SPECS } = require("./fetch-github-sbom");
const { PRODUCT_SPECS, buildSecurityInfo } = require("./fetch-github-images");

test("trustForRepo returns a copy, not the shared table entry", () => {
  const a = trustForRepo("projectbluefin/bluefin");
  a.keyless = false;
  assert.strictEqual(trustForRepo("projectbluefin/bluefin").keyless, true);
});

test("trustForRepo returns null for an undeclared signing repo", () => {
  assert.strictEqual(trustForRepo("projectbluefin/not-a-repo"), null);
});

test("requireTrustForRepo throws and names the offending repo", () => {
  assert.throws(
    () => requireTrustForRepo("projectbluefin/not-a-repo", "test context"),
    /projectbluefin\/not-a-repo.*test context.*signing-trust\.js/s,
  );
});

test("key-based repos declare a cosignKeyUrl and keyless repos do not", () => {
  for (const repo of knownSigningRepos()) {
    const trust = SIGNING_TRUST[repo];
    if (trust.keyless) {
      assert.strictEqual(
        trust.cosignKeyUrl,
        null,
        `${repo} is keyless so it must not carry a cosign key URL`,
      );
    } else {
      assert.ok(
        trust.cosignKeyUrl,
        `${repo} is key-based so it must declare a cosign key URL`,
      );
    }
  }
});

test("LTS trust points at the cosign.pub in the LTS repo", () => {
  assert.strictEqual(
    SIGNING_TRUST["projectbluefin/bluefin-lts"].cosignKeyUrl,
    COSIGN_KEY_LTS,
  );
  assert.match(
    COSIGN_KEY_LTS,
    /projectbluefin\/bluefin-lts\/main\/cosign\.pub$/,
  );
});

// --- drift gates: both consumers must resolve through the shared table ------

test("every STREAM_SPECS keyRepo has a declared trust policy", () => {
  for (const spec of STREAM_SPECS) {
    assert.ok(
      trustForRepo(spec.keyRepo),
      `stream ${spec.id} signs from ${spec.keyRepo}, which has no entry in signing-trust.js`,
    );
  }
});

test("every PRODUCT_SPECS keyRepo has a declared trust policy", () => {
  for (const spec of PRODUCT_SPECS) {
    assert.ok(
      trustForRepo(spec.keyRepo),
      `product ${spec.id} signs from ${spec.keyRepo}, which has no entry in signing-trust.js`,
    );
  }
});

test("STREAM_SPECS keyless/cosignKeyUrl match the shared table exactly", () => {
  for (const spec of STREAM_SPECS) {
    const trust = trustForRepo(spec.keyRepo);
    assert.strictEqual(
      spec.keyless,
      trust.keyless,
      `stream ${spec.id} disagrees with signing-trust.js on keyless`,
    );
    assert.strictEqual(
      spec.cosignKeyUrl,
      trust.cosignKeyUrl,
      `stream ${spec.id} disagrees with signing-trust.js on cosignKeyUrl`,
    );
  }
});

test("buildSecurityInfo renders the command shape the shared table declares", () => {
  for (const repo of knownSigningRepos()) {
    const trust = trustForRepo(repo);
    const info = buildSecurityInfo(
      { org: "projectbluefin", package: "bluefin", keyRepo: repo },
      "stable",
    );

    if (trust.keyless) {
      assert.strictEqual(
        info.cosignKeyUrl,
        null,
        `${repo} is keyless so no key URL should be published`,
      );
      assert.match(
        info.verifyCommand,
        /--certificate-identity-regexp/,
        `${repo} is keyless so the verify command must be certificate-based`,
      );
      assert.ok(
        info.verifyCommand.includes(
          `^https://github.com/${repo}/.github/workflows/`,
        ),
        `${repo} keyless identity regexp must be anchored to its own workflows`,
      );
      assert.strictEqual(info.hasAttestation, trust.attestationLive);
    } else {
      assert.strictEqual(info.cosignKeyUrl, trust.cosignKeyUrl);
      assert.ok(
        info.verifyCommand.includes(`--key ${trust.cosignKeyUrl}`),
        `${repo} is key-based so the verify command must pass --key`,
      );
      assert.strictEqual(info.hasAttestation, false);
    }
  }
});

test("an undeclared signing repo renders no verification pipeline", () => {
  const info = buildSecurityInfo(
    {
      org: "projectbluefin",
      package: "bluefin",
      keyRepo: "projectbluefin/unknown",
    },
    "stable",
  );
  assert.strictEqual(info.verifyCommand, null);
  assert.strictEqual(info.attestCommand, null);
  assert.strictEqual(info.cosignKeyUrl, null);
  assert.strictEqual(info.hasAttestation, false);
});
