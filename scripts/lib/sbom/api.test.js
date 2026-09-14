/**
 * Unit coverage for scripts/lib/sbom/api.js.
 *
 * Covers:
 * - Constants: SLSA_TYPE, OIDC_ISSUER
 * - getGhcrToken: auth headers (GITHUB_TOKEN, GH_TOKEN, anonymous), HTTP error handling
 * - fetchGhcrTags: single-page, multi-page (RFC 5988 / unquoted rel=next), relative URLs, error handling
 * - orasLogin: token detection, custom username, failure swallowing (best-effort)
 * - verifyAttestation: cosign-sign vs verify-attestation, NDJSON payload decoding, error classifications
 * - selectAmd64DigestFromManifest: multi-arch manifest parsing, fallback to contentDigest
 * - downloadSbom: Step 0 amd64 resolution, Step 1 discover (artifactType / mediaType), Step 2 pull and file candidate resolution
 * - getImageCreatedDate: annotation vs config blob strategy, formatting to YYYYMMDD, null fallbacks
 */

const { describe, it, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const util = require("node:util");

let execFileHandler = null;
const origExecFile = cp.execFile;

// Intercept child_process.execFile and promisified calls before requiring api.js
cp.execFile = function (cmd, args, opts, cb) {
  if (typeof opts === "function") {
    cb = opts;
    opts = {};
  }
  if (execFileHandler) {
    const res = execFileHandler(cmd, args, opts);
    if (res && typeof res.then === "function") {
      res.then(
        (val) => cb(null, val),
        (err) => cb(err),
      );
      return;
    }
    return cb(null, res);
  }
  return origExecFile.apply(this, arguments);
};

cp.execFile[util.promisify.custom] = async (cmd, args, opts) => {
  if (execFileHandler) {
    return execFileHandler(cmd, args, opts);
  }
  return util.promisify(origExecFile)(cmd, args, opts);
};

const api = require("./api.js");

const realFetch = globalThis.fetch;
const origEnv = { ...process.env };

function mockResponse(body, init = {}, url = "https://ghcr.io") {
  const res = new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    init,
  );
  Object.defineProperty(res, "url", { value: url });
  return res;
}

const noop = () => undefined;

async function quietAsync(fn) {
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = noop;
  console.warn = noop;
  try {
    return await fn();
  } finally {
    console.log = origLog;
    console.warn = origWarn;
  }
}

describe("scripts/lib/sbom/api.js", () => {
  let createdDirs = [];

  beforeEach(() => {
    execFileHandler = null;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.ORAS_USERNAME;
    createdDirs = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    execFileHandler = null;
    process.env = { ...origEnv };
    for (const dir of createdDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  after(() => {
    cp.execFile = origExecFile;
  });

  describe("Constants", () => {
    it("exports the SLSA provenance v1 type", () => {
      assert.equal(api.SLSA_TYPE, "https://slsa.dev/provenance/v1");
    });

    it("exports the GitHub Actions OIDC issuer URL", () => {
      assert.equal(
        api.OIDC_ISSUER,
        "https://token.actions.githubusercontent.com",
      );
    });
  });

  describe("getGhcrToken", () => {
    it("requests token with correct URL, User-Agent, and returns token", async () => {
      let requestedUrl = null;
      let requestedHeaders = null;

      globalThis.fetch = async (url, opts) => {
        requestedUrl = url;
        requestedHeaders = opts.headers;
        return mockResponse(
          { token: "fake-ghcr-token-123" },
          { status: 200, headers: { "content-type": "application/json" } },
          url,
        );
      };

      const token = await api.getGhcrToken("ublue-os", "bluefin");
      assert.equal(token, "fake-ghcr-token-123");
      assert.equal(
        requestedUrl,
        "https://ghcr.io/token?scope=repository:ublue-os/bluefin:pull&service=ghcr.io",
      );
      assert.equal(requestedHeaders["User-Agent"], "BluefinDocsSBOM/1.0");
      assert.equal(requestedHeaders.Authorization, undefined);
    });

    it("uses GITHUB_TOKEN for Basic auth if set", async () => {
      process.env.GITHUB_TOKEN = "secret-github-token";
      let authHeader = null;

      globalThis.fetch = async (url, opts) => {
        authHeader = opts.headers.Authorization;
        return mockResponse({ token: "tok-gh" }, { status: 200 }, url);
      };

      const token = await api.getGhcrToken("ublue-os", "bluefin");
      assert.equal(token, "tok-gh");
      const expectedB64 = Buffer.from(
        "x-access-token:secret-github-token",
      ).toString("base64");
      assert.equal(authHeader, `Basic ${expectedB64}`);
    });

    it("uses GH_TOKEN for Basic auth if GITHUB_TOKEN is unset", async () => {
      process.env.GH_TOKEN = "secret-gh-token";
      let authHeader = null;

      globalThis.fetch = async (url, opts) => {
        authHeader = opts.headers.Authorization;
        return mockResponse({ token: "tok-gh2" }, { status: 200 }, url);
      };

      const token = await api.getGhcrToken("ublue-os", "bluefin");
      assert.equal(token, "tok-gh2");
      const expectedB64 = Buffer.from(
        "x-access-token:secret-gh-token",
      ).toString("base64");
      assert.equal(authHeader, `Basic ${expectedB64}`);
    });

    it("throws a descriptive error when exchange fails", async () => {
      globalThis.fetch = async (url) =>
        mockResponse("Unauthorized", { status: 401 }, url);

      await assert.rejects(
        () => api.getGhcrToken("ublue-os", "private-pkg"),
        /GHCR token exchange failed: HTTP 401/,
      );
    });
  });

  describe("fetchGhcrTags", () => {
    it("fetches single page of tags with bearer token", async () => {
      let tokenCall = false;
      let tagsCall = false;

      globalThis.fetch = async (url, opts) => {
        if (url.includes("/token?")) {
          tokenCall = true;
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        if (url.includes("/tags/list")) {
          tagsCall = true;
          assert.equal(opts.headers.Authorization, "Bearer my-token");
          assert.equal(opts.headers["User-Agent"], "BluefinDocsSBOM/1.0");
          return mockResponse(
            { tags: ["latest", "gts", "stable"] },
            { status: 200 },
            url,
          );
        }
        throw new Error(`Unexpected URL: ${url}`);
      };

      const tags = await api.fetchGhcrTags("ublue-os", "bluefin");
      assert.ok(tokenCall);
      assert.ok(tagsCall);
      assert.deepEqual(tags, ["latest", "gts", "stable"]);
    });

    it('follows pagination Link header with rel="next"', async () => {
      let pageCount = 0;
      globalThis.fetch = async (url) => {
        if (url.includes("/token?")) {
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        pageCount++;
        if (pageCount === 1) {
          return mockResponse(
            { tags: ["tag1", "tag2"] },
            {
              status: 200,
              headers: {
                link: '<https://ghcr.io/v2/ublue-os/bluefin/tags/list?n=1000&last=tag2>; rel="next"',
              },
            },
            url,
          );
        }
        return mockResponse({ tags: ["tag3"] }, { status: 200 }, url);
      };

      const tags = await api.fetchGhcrTags("ublue-os", "bluefin");
      assert.equal(pageCount, 2);
      assert.deepEqual(tags, ["tag1", "tag2", "tag3"]);
    });

    it("follows pagination Link header with unquoted rel=next", async () => {
      let pageCount = 0;
      globalThis.fetch = async (url) => {
        if (url.includes("/token?")) {
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        pageCount++;
        if (pageCount === 1) {
          return mockResponse(
            { tags: ["a"] },
            {
              status: 200,
              headers: {
                link: "<https://ghcr.io/v2/ublue-os/bluefin/tags/list?n=1000&last=a>; rel=next",
              },
            },
            url,
          );
        }
        return mockResponse({ tags: ["b"] }, { status: 200 }, url);
      };

      const tags = await api.fetchGhcrTags("ublue-os", "bluefin");
      assert.equal(pageCount, 2);
      assert.deepEqual(tags, ["a", "b"]);
    });

    it("resolves relative URL in pagination Link header", async () => {
      let pageCount = 0;
      globalThis.fetch = async (url) => {
        if (url.includes("/token?")) {
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        pageCount++;
        if (pageCount === 1) {
          return mockResponse(
            { tags: ["t1"] },
            {
              status: 200,
              headers: {
                link: '</v2/ublue-os/bluefin/tags/list?n=1000&last=t1>; rel="next"',
              },
            },
            url,
          );
        }
        assert.equal(
          url,
          "https://ghcr.io/v2/ublue-os/bluefin/tags/list?n=1000&last=t1",
        );
        return mockResponse({ tags: ["t2"] }, { status: 200 }, url);
      };

      const tags = await api.fetchGhcrTags("ublue-os", "bluefin");
      assert.equal(pageCount, 2);
      assert.deepEqual(tags, ["t1", "t2"]);
    });

    it("handles non-array or missing tags property gracefully", async () => {
      globalThis.fetch = async (url) => {
        if (url.includes("/token?")) {
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        return mockResponse({ tags: null }, { status: 200 }, url);
      };

      const tags = await api.fetchGhcrTags("ublue-os", "bluefin");
      assert.deepEqual(tags, []);
    });

    it("throws error when tags/list fails with non-200 status", async () => {
      globalThis.fetch = async (url) => {
        if (url.includes("/token?")) {
          return mockResponse({ token: "my-token" }, { status: 200 }, url);
        }
        return mockResponse("Internal Error", { status: 500 }, url);
      };

      await assert.rejects(
        () => api.fetchGhcrTags("ublue-os", "bluefin"),
        /GHCR tags\/list failed: HTTP 500/,
      );
    });
  });

  describe("orasLogin", () => {
    it("returns immediately without calling oras when no token in env", async () => {
      let called = false;
      execFileHandler = () => {
        called = true;
      };

      await api.orasLogin();
      assert.equal(called, false);
    });

    it("invokes oras login with default username x-access-token", async () => {
      process.env.GITHUB_TOKEN = "test-token";
      let captured = null;

      execFileHandler = (cmd, args, opts) => {
        captured = { cmd, args, opts };
        return { stdout: "", stderr: "" };
      };

      await quietAsync(() => api.orasLogin());
      assert.equal(captured.cmd, "oras");
      assert.deepEqual(captured.args, [
        "login",
        "ghcr.io",
        "-u",
        "x-access-token",
        "--password-stdin",
      ]);
      assert.equal(captured.opts.input, "test-token");
    });

    it("uses ORAS_USERNAME if specified in env", async () => {
      process.env.GH_TOKEN = "test-token";
      process.env.ORAS_USERNAME = "custom-user";
      let capturedArgs = null;

      execFileHandler = (_cmd, args) => {
        capturedArgs = args;
        return { stdout: "", stderr: "" };
      };

      await quietAsync(() => api.orasLogin());
      assert.deepEqual(capturedArgs, [
        "login",
        "ghcr.io",
        "-u",
        "custom-user",
        "--password-stdin",
      ]);
    });

    it("swallows login failure and logs warning (best-effort)", async () => {
      process.env.GITHUB_TOKEN = "test-token";
      execFileHandler = () => {
        throw new Error("connection timed out");
      };

      let warned = false;
      const origWarn = console.warn;
      console.warn = (msg) => {
        if (msg.includes("oras: login failed")) warned = true;
      };

      try {
        await api.orasLogin();
      } finally {
        console.warn = origWarn;
      }

      assert.ok(warned);
    });
  });

  describe("verifyAttestation", () => {
    const spec = { keyRepo: "ublue-os/bluefin" };

    it("cosign-sign stream: returns verified when cosign verify succeeds", async () => {
      const cosignSpec = { ...spec, signingType: "cosign-sign" };
      let invokedArgs = null;

      execFileHandler = (cmd, args) => {
        assert.equal(cmd, "cosign");
        invokedArgs = args;
        return { stdout: "Verification OK\n", stderr: "" };
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:dakota",
        cosignSpec,
      );
      assert.deepEqual(result, {
        present: true,
        verified: true,
        predicateType: "cosign-sign",
        error: null,
      });
      assert.equal(invokedArgs[0], "verify");
      assert.equal(invokedArgs[1], "--certificate-oidc-issuer");
      assert.equal(invokedArgs[2], api.OIDC_ISSUER);
      assert.equal(invokedArgs[3], "--certificate-identity-regexp");
      assert.equal(
        invokedArgs[4],
        "^https://github.com/ublue-os/bluefin/.github/workflows/",
      );
    });

    it("cosign-sign stream: returns present:false on 'no matching signatures'", async () => {
      const cosignSpec = { ...spec, signingType: "cosign-sign" };
      execFileHandler = () => {
        const err = new Error("Command failed");
        err.stderr = "Error: no matching signatures found";
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:dakota",
        cosignSpec,
      );
      assert.deepEqual(result, {
        present: false,
        verified: false,
        predicateType: null,
        error: "no signature",
      });
    });

    it("cosign-sign stream: returns present:false on 'not found'", async () => {
      const cosignSpec = { ...spec, signingType: "cosign-sign" };
      execFileHandler = () => {
        const err = new Error("signature not found in registry");
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:dakota",
        cosignSpec,
      );
      assert.deepEqual(result, {
        present: false,
        verified: false,
        predicateType: null,
        error: "no signature",
      });
    });

    it("cosign-sign stream: returns tooling error on other failures", async () => {
      const cosignSpec = { ...spec, signingType: "cosign-sign" };
      execFileHandler = () => {
        const err = new Error("x509: certificate has expired");
        err.stderr = "x509: certificate has expired";
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:dakota",
        cosignSpec,
      );
      assert.deepEqual(result, {
        present: null,
        verified: false,
        predicateType: null,
        errorKind: "tooling",
        error: "x509: certificate has expired",
      });
    });

    it("SLSA stream: extracts predicateType from base64 payload in NDJSON", async () => {
      const inner = { predicateType: "https://slsa.dev/provenance/v1" };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const stdout = `Verification OK\n{"payload":"${b64}"}\n`;

      execFileHandler = (cmd, args) => {
        assert.equal(cmd, "cosign");
        assert.equal(args[0], "verify-attestation");
        assert.equal(args[2], api.SLSA_TYPE);
        return { stdout, stderr: "Verification OK" };
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: true,
        verified: true,
        predicateType: "https://slsa.dev/provenance/v1",
        error: null,
      });
    });

    it("SLSA stream: extracts predicate_type (snake_case) from base64 payload", async () => {
      const inner = { predicate_type: "https://slsa.dev/provenance/v1" };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const stdout = `{"payload":"${b64}"}\n`;

      execFileHandler = () => ({ stdout, stderr: "" });

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: true,
        verified: true,
        predicateType: "https://slsa.dev/provenance/v1",
        error: null,
      });
    });

    it("SLSA stream: skips non-JSON or malformed payload lines", async () => {
      const inner = { predicateType: "https://slsa.dev/provenance/v1" };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const stdout = [
        "random status line",
        "{ malformed json",
        '{"payload": "not-json"}',
        `{"payload":"${b64}"}`,
      ].join("\n");

      execFileHandler = () => ({ stdout, stderr: "" });

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: true,
        verified: true,
        predicateType: "https://slsa.dev/provenance/v1",
        error: null,
      });
    });

    it("SLSA stream: returns predicateType: null when no valid payload contains predicateType", async () => {
      const inner = { someOtherField: true };
      const b64 = Buffer.from(JSON.stringify(inner)).toString("base64");
      const stdout = `{"payload":"${b64}"}\n`;

      execFileHandler = () => ({ stdout, stderr: "" });

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: true,
        verified: true,
        predicateType: null,
        error: null,
      });
    });

    it("SLSA stream: returns present:false on 'no matching attestations'", async () => {
      execFileHandler = () => {
        const err = new Error("Command failed");
        err.stderr = "Error: no matching attestations found";
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: false,
        verified: false,
        predicateType: null,
        error: "no attestation",
      });
    });

    it("SLSA stream: returns present:false on 'no attestations'", async () => {
      execFileHandler = () => {
        const err = new Error("Error: no attestations");
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: false,
        verified: false,
        predicateType: null,
        error: "no attestation",
      });
    });

    it("SLSA stream: returns present:false on 'not found'", async () => {
      execFileHandler = () => {
        const err = new Error("attestation manifest not found");
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: false,
        verified: false,
        predicateType: null,
        error: "no attestation",
      });
    });

    it("SLSA stream: returns tooling error on unexpected cosign failure", async () => {
      execFileHandler = () => {
        const err = new Error("unexpected I/O error");
        err.stderr = "network timeout";
        throw err;
      };

      const result = await api.verifyAttestation(
        "ghcr.io/ublue-os/bluefin:stable",
        spec,
      );
      assert.deepEqual(result, {
        present: null,
        verified: false,
        predicateType: null,
        errorKind: "tooling",
        error: "network timeout",
      });
    });
  });

  describe("selectAmd64DigestFromManifest", () => {
    it("returns amd64 digest from multi-arch manifest index", () => {
      const manifest = {
        manifests: [
          {
            platform: { os: "linux", architecture: "arm64" },
            digest: "sha256:arm64",
          },
          {
            platform: { os: "linux", architecture: "amd64" },
            digest: "sha256:amd64",
          },
        ],
      };
      assert.equal(
        api.selectAmd64DigestFromManifest(manifest, "sha256:fallback"),
        "sha256:amd64",
      );
    });

    it("returns contentDigest if manifests array has no linux/amd64 platform", () => {
      const manifest = {
        manifests: [
          {
            platform: { os: "linux", architecture: "arm64" },
            digest: "sha256:arm64",
          },
        ],
      };
      assert.equal(
        api.selectAmd64DigestFromManifest(manifest, "sha256:fallback"),
        "sha256:fallback",
      );
    });

    it("returns contentDigest if amd64 manifest entry lacks a digest", () => {
      const manifest = {
        manifests: [{ platform: { os: "linux", architecture: "amd64" } }],
      };
      assert.equal(
        api.selectAmd64DigestFromManifest(manifest, "sha256:fallback"),
        "sha256:fallback",
      );
    });

    it("returns contentDigest for single-arch manifest without manifests array", () => {
      const manifest = {
        schemaVersion: 2,
        mediaType: "application/vnd.oci.image.manifest.v1+json",
      };
      assert.equal(
        api.selectAmd64DigestFromManifest(manifest, "sha256:fallback"),
        "sha256:fallback",
      );
    });

    it("returns contentDigest when manifest is null or undefined", () => {
      assert.equal(
        api.selectAmd64DigestFromManifest(null, "sha256:fallback"),
        "sha256:fallback",
      );
      assert.equal(
        api.selectAmd64DigestFromManifest(undefined, "sha256:fallback"),
        "sha256:fallback",
      );
    });
  });

  describe("downloadSbom", () => {
    it("resolves amd64 digest in Step 0, discovers referrers, pulls sbom.json", async () => {
      let discoverRef = null;
      let pullRef = null;

      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest" && args[1] === "fetch") {
          if (args.includes("--platform")) {
            return { stdout: "sha256:amd64hash\n", stderr: "" };
          }
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  platform: { os: "linux", architecture: "amd64" },
                  digest: "sha256:amd64hash",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "discover") {
          discoverRef = args[args.length - 1];
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  artifactType: "application/vnd.spdx+json",
                  digest: "sha256:sbomdigest123",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "pull") {
          pullRef = args[1];
          const outDir = args[3];
          createdDirs.push(outDir);
          fs.writeFileSync(
            path.join(outDir, "sbom.json"),
            '{"spdxVersion":"SPDX-2.3"}',
          );
          return { stdout: "", stderr: "" };
        }
        throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );

      assert.ok(result);
      assert.ok(result.endsWith("sbom.json"));
      assert.ok(fs.existsSync(result));
      assert.equal(discoverRef, "ghcr.io/ublue-os/bluefin@sha256:amd64hash");
      assert.equal(pullRef, "ghcr.io/ublue-os/bluefin@sha256:sbomdigest123");
    });

    it("falls back to tag ref when Step 0 manifest fetch fails", async () => {
      let discoverRef = null;

      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") {
          throw new Error("manifest fetch failed");
        }
        if (cmd === "oras" && args[0] === "discover") {
          discoverRef = args[args.length - 1];
          return {
            stdout: JSON.stringify({
              referrers: [
                {
                  mediaType: "application/vnd.spdx+json",
                  digest: "sha256:fallbackdigest",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "pull") {
          const outDir = args[3];
          createdDirs.push(outDir);
          fs.writeFileSync(
            path.join(outDir, "spdx.json"),
            '{"spdxVersion":"SPDX-2.3"}',
          );
          return { stdout: "", stderr: "" };
        }
        throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:stable"),
      );

      assert.ok(result);
      assert.ok(result.endsWith("spdx.json"));
      assert.equal(discoverRef, "ghcr.io/ublue-os/bluefin:stable");
    });

    it("falls back to first .json file in tmpdir if named neither sbom.json nor spdx.json", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") {
          throw new Error("skip");
        }
        if (cmd === "oras" && args[0] === "discover") {
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  artifactType: "application/vnd.spdx+json",
                  digest: "sha256:digest",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "pull") {
          const outDir = args[3];
          createdDirs.push(outDir);
          fs.writeFileSync(path.join(outDir, "custom-sbom.json"), "{}");
          return { stdout: "", stderr: "" };
        }
        throw new Error(`Unexpected command: ${cmd}`);
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );

      assert.ok(result);
      assert.ok(result.endsWith("custom-sbom.json"));
    });

    it("returns null when oras discover output is unparseable", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") throw new Error("skip");
        if (cmd === "oras" && args[0] === "discover") {
          return { stdout: "not json", stderr: "" };
        }
        throw new Error("should not reach");
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );
      assert.equal(result, null);
    });

    it("returns null when no SPDX referrer is discovered", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") throw new Error("skip");
        if (cmd === "oras" && args[0] === "discover") {
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  artifactType: "application/vnd.other+json",
                  digest: "sha256:1",
                },
              ],
            }),
            stderr: "",
          };
        }
        throw new Error("should not reach");
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );
      assert.equal(result, null);
    });

    it("returns null when discovered SPDX referrer has no digest", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") throw new Error("skip");
        if (cmd === "oras" && args[0] === "discover") {
          return {
            stdout: JSON.stringify({
              manifests: [{ artifactType: "application/vnd.spdx+json" }],
            }),
            stderr: "",
          };
        }
        throw new Error("should not reach");
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );
      assert.equal(result, null);
    });

    it("returns null when oras pull leaves no JSON files", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") throw new Error("skip");
        if (cmd === "oras" && args[0] === "discover") {
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  artifactType: "application/vnd.spdx+json",
                  digest: "sha256:1",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "pull") {
          const outDir = args[3];
          createdDirs.push(outDir);
          fs.writeFileSync(path.join(outDir, "README.txt"), "no json here");
          return { stdout: "", stderr: "" };
        }
        throw new Error("should not reach");
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );
      assert.equal(result, null);
    });

    it("returns null when oras pull throws an error", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") throw new Error("skip");
        if (cmd === "oras" && args[0] === "discover") {
          return {
            stdout: JSON.stringify({
              manifests: [
                {
                  artifactType: "application/vnd.spdx+json",
                  digest: "sha256:1",
                },
              ],
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "pull") {
          throw new Error("pull failed: network error");
        }
        throw new Error("should not reach");
      };

      const result = await quietAsync(() =>
        api.downloadSbom("ghcr.io/ublue-os/bluefin:latest"),
      );
      assert.equal(result, null);
    });
  });

  describe("getImageCreatedDate", () => {
    it("strategy 1: extracts date from manifest annotation org.opencontainers.image.created", async () => {
      execFileHandler = (cmd, args) => {
        assert.equal(cmd, "oras");
        assert.deepEqual(args, [
          "manifest",
          "fetch",
          "ghcr.io/ublue-os/bluefin:latest",
        ]);
        return {
          stdout: JSON.stringify({
            annotations: {
              "org.opencontainers.image.created": "2026-09-08T14:32:00Z",
            },
          }),
          stderr: "",
        };
      };

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.equal(dateStr, "20260908");
    });

    it("strategy 2: extracts date from image config blob when annotation is missing", async () => {
      let blobFetched = false;
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") {
          return {
            stdout: JSON.stringify({
              config: { digest: "sha256:configdigest999" },
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "blob") {
          blobFetched = true;
          assert.equal(
            args[args.length - 1],
            "ghcr.io/ublue-os/bluefin@sha256:configdigest999",
          );
          return {
            stdout: JSON.stringify({
              created: "2026-08-30T09:15:22.123456Z",
            }),
            stderr: "",
          };
        }
        throw new Error(`Unexpected command: ${cmd} ${args.join(" ")}`);
      };

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.ok(blobFetched);
      assert.equal(dateStr, "20260830");
    });

    it("returns null when neither annotation nor config digest is present", async () => {
      execFileHandler = () => ({
        stdout: JSON.stringify({ schemaVersion: 2 }),
        stderr: "",
      });

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.equal(dateStr, null);
    });

    it("returns null when config blob has no created timestamp", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") {
          return {
            stdout: JSON.stringify({
              config: { digest: "sha256:configdigest999" },
            }),
            stderr: "",
          };
        }
        if (cmd === "oras" && args[0] === "blob") {
          return {
            stdout: JSON.stringify({ architecture: "amd64" }),
            stderr: "",
          };
        }
        throw new Error("unexpected");
      };

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.equal(dateStr, null);
    });

    it("returns null when oras manifest fetch fails", async () => {
      execFileHandler = () => {
        throw new Error("oras: manifest fetch timed out");
      };

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.equal(dateStr, null);
    });

    it("returns null when oras blob fetch fails", async () => {
      execFileHandler = (cmd, args) => {
        if (cmd === "oras" && args[0] === "manifest") {
          return {
            stdout: JSON.stringify({
              config: { digest: "sha256:configdigest999" },
            }),
            stderr: "",
          };
        }
        throw new Error("blob fetch failed");
      };

      const dateStr = await api.getImageCreatedDate(
        "ghcr.io/ublue-os/bluefin:latest",
      );
      assert.equal(dateStr, null);
    });
  });
});
