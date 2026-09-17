/**
 * Tests for scripts/lib/request-queue.js
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  GH_API,
  isNetworkError,
  retryWithBackoff,
  sequentialFetchWithDelay,
  githubToken,
  githubHeaders,
  githubFetch,
} = require("./lib/request-queue");

// ── isNetworkError ──────────────────────────────────────────────────────────

describe("isNetworkError", () => {
  it("returns true for ECONNRESET", () => {
    const err = new Error("connection reset");
    err.code = "ECONNRESET";
    assert.equal(isNetworkError(err), true);
  });

  it("returns true for ETIMEDOUT", () => {
    const err = new Error("timed out");
    err.code = "ETIMEDOUT";
    assert.equal(isNetworkError(err), true);
  });

  it("returns true for ENOTFOUND", () => {
    const err = new Error("not found");
    err.code = "ENOTFOUND";
    assert.equal(isNetworkError(err), true);
  });

  it("returns true for EAI_AGAIN", () => {
    const err = new Error("dns");
    err.code = "EAI_AGAIN";
    assert.equal(isNetworkError(err), true);
  });

  it('returns true for "socket hang up"', () => {
    assert.equal(isNetworkError(new Error("socket hang up")), true);
  });

  it('returns true for "timeout" in message', () => {
    assert.equal(isNetworkError(new Error("request timeout")), true);
  });

  it("returns false for generic errors", () => {
    assert.equal(isNetworkError(new Error("something else")), false);
  });

  it("returns false for auth errors", () => {
    const err = new Error("Bad credentials");
    err.status = 401;
    assert.equal(isNetworkError(err), false);
  });
});

// ── retryWithBackoff ────────────────────────────────────────────────────────

describe("retryWithBackoff", () => {
  it("returns result on first success", async () => {
    const result = await retryWithBackoff(() => Promise.resolve(42));
    assert.equal(result, 42);
  });

  it("retries on network error and eventually succeeds", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      () => {
        calls++;
        if (calls < 2) {
          const err = new Error("socket hang up");
          throw err;
        }
        return Promise.resolve("ok");
      },
      { maxRetries: 3 },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  it("throws immediately on 401", async () => {
    const err = new Error("Unauthorized");
    err.status = 401;
    await assert.rejects(
      () =>
        retryWithBackoff(
          () => {
            throw err;
          },
          { maxRetries: 3 },
        ),
      (thrown) => thrown.status === 401,
    );
  });

  it("throws immediately on 403", async () => {
    const err = new Error("Forbidden");
    err.status = 403;
    await assert.rejects(
      () =>
        retryWithBackoff(
          () => {
            throw err;
          },
          { maxRetries: 3 },
        ),
      (thrown) => thrown.status === 403,
    );
  });

  it("throws non-network errors without retrying", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        retryWithBackoff(
          () => {
            calls++;
            throw new Error("not a network error");
          },
          { maxRetries: 3 },
        ),
      { message: "not a network error" },
    );
    assert.equal(calls, 1);
  });
});

// ── sequentialFetchWithDelay ────────────────────────────────────────────────

describe("sequentialFetchWithDelay", () => {
  it("calls fetchFn for each item and collects results", async () => {
    const items = ["a", "b", "c"];
    const result = await sequentialFetchWithDelay(
      items,
      async (item) => item.toUpperCase(),
      { delayMs: 0 },
    );
    assert.equal(result.size, 3);
    assert.equal(result.get("a"), "A");
    assert.equal(result.get("b"), "B");
    assert.equal(result.get("c"), "C");
  });

  it("excludes null results", async () => {
    const items = [1, 2, 3];
    const result = await sequentialFetchWithDelay(
      items,
      async (item) => (item === 2 ? null : item * 10),
      { delayMs: 0 },
    );
    assert.equal(result.size, 2);
    assert.equal(result.get(1), 10);
    assert.equal(result.get(3), 30);
    assert.equal(result.has(2), false);
  });

  it("processes items sequentially (not in parallel)", async () => {
    const order = [];
    await sequentialFetchWithDelay(
      ["first", "second", "third"],
      async (item) => {
        order.push(item);
        return item;
      },
      { delayMs: 0 },
    );
    assert.deepEqual(order, ["first", "second", "third"]);
  });

  it("returns empty map for empty input", async () => {
    const result = await sequentialFetchWithDelay(
      [],
      async () => "never called",
      { delayMs: 0 },
    );
    assert.equal(result.size, 0);
  });

  it("applies default 100ms delay", async () => {
    const start = Date.now();
    await sequentialFetchWithDelay(["a", "b"], async (item) => item);
    const elapsed = Date.now() - start;
    // Two items → one inter-request delay of ~100ms + one trailing delay
    assert.ok(elapsed >= 150, `Expected ≥150ms, got ${elapsed}ms`);
  });
});

// ── githubHeaders ───────────────────────────────────────────────────────────

describe("githubHeaders", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  // Restore after tests
  it("returns User-Agent without auth when no token", () => {
    const headers = githubHeaders();
    assert.equal(headers["User-Agent"], "Bluefin-Docs-Build");
    assert.equal(headers["Authorization"], undefined);
  });

  it("uses explicit token parameter", () => {
    const headers = githubHeaders("test-token-123");
    assert.equal(headers["Authorization"], "Bearer test-token-123");
  });

  it("falls back to GITHUB_TOKEN env var", () => {
    process.env.GITHUB_TOKEN = "env-token";
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], "Bearer env-token");
    // cleanup
    if (originalToken) process.env.GITHUB_TOKEN = originalToken;
    else delete process.env.GITHUB_TOKEN;
  });

  it("falls back to GH_TOKEN env var", () => {
    process.env.GH_TOKEN = "gh-token";
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], "Bearer gh-token");
    // cleanup
    if (originalGhToken) process.env.GH_TOKEN = originalGhToken;
    else delete process.env.GH_TOKEN;
  });

  // Restore env vars at the end
  it("cleanup env", () => {
    if (originalToken) process.env.GITHUB_TOKEN = originalToken;
    if (originalGhToken) process.env.GH_TOKEN = originalGhToken;
  });
});

// ── GH_API / githubToken ────────────────────────────────────────────────────

describe("githubToken", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  it("exports the canonical GitHub API origin", () => {
    assert.equal(GH_API, "https://api.github.com");
  });

  it("returns null when no token is set", () => {
    assert.equal(githubToken(), null);
  });

  it("prefers GITHUB_TOKEN over GH_TOKEN", () => {
    process.env.GITHUB_TOKEN = "primary";
    process.env.GH_TOKEN = "secondary";
    assert.equal(githubToken(), "primary");
  });

  it("falls back to GH_TOKEN", () => {
    process.env.GH_TOKEN = "fallback";
    assert.equal(githubToken(), "fallback");
  });

  it("cleanup env", () => {
    if (originalToken) process.env.GITHUB_TOKEN = originalToken;
    if (originalGhToken) process.env.GH_TOKEN = originalGhToken;
  });
});

// ── githubHeaders contract (CJS twin of lib/gh.js) ─────────────────────────

describe("githubHeaders (contract)", () => {
  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  it("pins the api-version and advertise the json accept by default", () => {
    const headers = githubHeaders("tok");
    assert.equal(headers["Accept"], "application/vnd.github+json");
    assert.equal(headers["X-GitHub-Api-Version"], "2022-11-28");
    assert.equal(headers["User-Agent"], "Bluefin-Docs-Build");
    assert.equal(headers["Authorization"], "Bearer tok");
  });

  it("allows accept override for endpoint-specific representations", () => {
    const headers = githubHeaders("tok", {
      accept: "application/vnd.github.v3.raw",
    });
    assert.equal(headers["Accept"], "application/vnd.github.v3.raw");
    assert.equal(headers["X-GitHub-Api-Version"], "2022-11-28");
  });

  it("allows api-version and user-agent overrides", () => {
    const headers = githubHeaders(null, {
      apiVersion: "2021-01-01",
      userAgent: "bluefin-docs/fetch-pin-state",
    });
    assert.equal(headers["X-GitHub-Api-Version"], "2021-01-01");
    assert.equal(headers["User-Agent"], "bluefin-docs/fetch-pin-state");
  });

  it("omits api-version when disabled", () => {
    const headers = githubHeaders("tok", { apiVersion: false });
    assert.equal(headers["X-GitHub-Api-Version"], undefined);
  });

  it("omits Authorization when no token is present", () => {
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], undefined);
  });
});

// ── githubFetch ─────────────────────────────────────────────────────────────

describe("githubFetch", () => {
  const originalToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;
  let originalFetch;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken) process.env.GITHUB_TOKEN = originalToken;
    if (originalGhToken) process.env.GH_TOKEN = originalGhToken;
  });

  function stubFetch(handler) {
    const calls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url, init });
      return handler(url, init);
    };
    return calls;
  }

  function response(body, { ok = true, status = 200 } = {}) {
    return { ok, status, json: async () => body };
  }

  it("resolves relative paths against the shared API origin", async () => {
    const calls = stubFetch(() => response({ ok: true }));
    await githubFetch("/repos/o/r", { throwOnError: false });
    assert.equal(calls[0].url, "https://api.github.com/repos/o/r");
  });

  it("passes URLs through unchanged", async () => {
    const calls = stubFetch(() => response({ ok: true }));
    await githubFetch("https://example.com/x", { throwOnError: false });
    assert.equal(calls[0].url, "https://example.com/x");
  });

  it("uses provided headers and forwards a signal", async () => {
    const calls = stubFetch(() => response({ ok: true }));
    const signal = { aborted: false };
    await githubFetch("/path", {
      headers: githubHeaders("tok"),
      signal,
      throwOnError: false,
    });
    assert.equal(calls[0].init.headers["Authorization"], "Bearer tok");
    assert.equal(calls[0].init.signal, signal);
  });

  it("builds headers from env token when none passed", async () => {
    process.env.GH_TOKEN = "env-tok";
    const calls = stubFetch(() => response({ ok: true }));
    await githubFetch("/path", { throwOnError: false });
    assert.equal(calls[0].init.headers["Authorization"], "Bearer env-tok");
  });

  it("throws on non-2xx by default", async () => {
    stubFetch(() => response({ error: "nope" }, { ok: false, status: 500 }));
    await assert.rejects(() => githubFetch("/path"), /GET \/path -> 500/);
  });

  it("returns null on non-2xx when throwOnError is false", async () => {
    stubFetch(() => response({ error: "missing" }, { ok: false, status: 404 }));
    const res = await githubFetch("/path", { throwOnError: false });
    assert.equal(res, null);
  });

  it("returns the ok response when throwOnError is false", async () => {
    stubFetch(() => response({ hits: [1] }, { ok: true, status: 200 }));
    const res = await githubFetch("/path", { throwOnError: false });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { hits: [1] });
  });
});
