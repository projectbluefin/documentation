/**
 * Unit tests for scripts/lib/request-queue.js
 *
 * Tests the shared request-queue utilities:
 *  - isNetworkError: classifies transient network errors
 *  - retryWithBackoff: exponential backoff with retry logic
 *  - sequentialFetchWithDelay: sequential iteration with inter-request delay
 *  - githubHeaders: GitHub API header construction
 */

"use strict";

const { describe, it, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");

const {
  isNetworkError,
  retryWithBackoff,
  sequentialFetchWithDelay,
  githubHeaders,
} = require("./request-queue.js");

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
    const err = new Error("dns lookup");
    err.code = "EAI_AGAIN";
    assert.equal(isNetworkError(err), true);
  });

  it("returns true for 'socket hang up' message", () => {
    const err = new Error("socket hang up");
    assert.equal(isNetworkError(err), true);
  });

  it("returns true for message containing 'timeout'", () => {
    const err = new Error("request timeout exceeded");
    assert.equal(isNetworkError(err), true);
  });

  it("returns false for generic errors", () => {
    const err = new Error("something else went wrong");
    assert.ok(!isNetworkError(err));
  });

  it("returns false for 404 errors", () => {
    const err = new Error("Not Found");
    err.status = 404;
    assert.ok(!isNetworkError(err));
  });

  it("handles errors with undefined message gracefully", () => {
    const err = { code: "OTHER" };
    assert.ok(!isNetworkError(err));
  });
});

// ── retryWithBackoff ────────────────────────────────────────────────────────

describe("retryWithBackoff", () => {
  it("returns result on first successful call", async () => {
    const fn = async () => "success";
    const result = await retryWithBackoff(fn);
    assert.equal(result, "success");
  });

  it("retries on network error and succeeds", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        const err = new Error("connection reset");
        err.code = "ECONNRESET";
        throw err;
      }
      return "recovered";
    };
    // Use maxRetries=3, but patch delay to be instant
    const result = await retryWithBackoff(fn, { maxRetries: 3 });
    assert.equal(result, "recovered");
    assert.equal(attempts, 2);
  });

  it("throws immediately on 401 auth error", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const err = new Error("Bad credentials");
      err.status = 401;
      throw err;
    };
    await assert.rejects(() => retryWithBackoff(fn, { maxRetries: 3 }), {
      message: "Bad credentials",
    });
    assert.equal(attempts, 1);
  });

  it("throws immediately on 403 rate-limit error", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const err = new Error("API rate limit exceeded");
      err.status = 403;
      throw err;
    };
    await assert.rejects(() => retryWithBackoff(fn, { maxRetries: 3 }), {
      message: "API rate limit exceeded",
    });
    assert.equal(attempts, 1);
  });

  it("throws immediately on non-network, non-auth errors", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error("unexpected parse failure");
    };
    await assert.rejects(() => retryWithBackoff(fn, { maxRetries: 3 }), {
      message: "unexpected parse failure",
    });
    assert.equal(attempts, 1);
  });

  it("throws after max retries exhausted on network errors", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const err = new Error("socket hang up");
      throw err;
    };
    await assert.rejects(() => retryWithBackoff(fn, { maxRetries: 2 }), {
      message: "socket hang up",
    });
    // Should try twice (attempt 1 fails, attempt 2 is last so no retry)
    assert.equal(attempts, 2);
  });

  it("respects custom maxRetries option", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const err = new Error("timeout");
      err.code = "ETIMEDOUT";
      throw err;
    };
    await assert.rejects(() => retryWithBackoff(fn, { maxRetries: 1 }));
    assert.equal(attempts, 1);
  });

  it("uses label in console output when provided", async () => {
    const logs = [];
    const origWarn = console.warn;
    console.warn = (...args) => logs.push(args.join(" "));
    try {
      const fn = async () => {
        const err = new Error("forbidden");
        err.status = 403;
        throw err;
      };
      await assert.rejects(() =>
        retryWithBackoff(fn, { label: "[test]" }),
      );
      assert.ok(logs.some((l) => l.includes("[test]")));
    } finally {
      console.warn = origWarn;
    }
  });

  it("defaults maxRetries to 3", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const err = new Error("socket hang up");
      throw err;
    };
    await assert.rejects(() => retryWithBackoff(fn));
    assert.equal(attempts, 3);
  });
});

// ── sequentialFetchWithDelay ────────────────────────────────────────────────

describe("sequentialFetchWithDelay", () => {
  it("processes all items and returns results map", async () => {
    const items = ["a", "b", "c"];
    const fetchFn = async (item) => item.toUpperCase();
    const results = await sequentialFetchWithDelay(items, fetchFn, {
      delayMs: 0,
    });
    assert.equal(results.size, 3);
    assert.equal(results.get("a"), "A");
    assert.equal(results.get("b"), "B");
    assert.equal(results.get("c"), "C");
  });

  it("excludes null results from map", async () => {
    const items = [1, 2, 3];
    const fetchFn = async (item) => (item === 2 ? null : item * 10);
    const results = await sequentialFetchWithDelay(items, fetchFn, {
      delayMs: 0,
    });
    assert.equal(results.size, 2);
    assert.equal(results.get(1), 10);
    assert.equal(results.get(3), 30);
    assert.equal(results.has(2), false);
  });

  it("excludes undefined results from map", async () => {
    const items = ["x", "y"];
    const fetchFn = async (item) => (item === "y" ? undefined : "found");
    const results = await sequentialFetchWithDelay(items, fetchFn, {
      delayMs: 0,
    });
    assert.equal(results.size, 1);
    assert.equal(results.get("x"), "found");
  });

  it("handles empty items array", async () => {
    const results = await sequentialFetchWithDelay([], async () => "x", {
      delayMs: 0,
    });
    assert.equal(results.size, 0);
  });

  it("processes items sequentially (not in parallel)", async () => {
    const order = [];
    const items = [1, 2, 3];
    const fetchFn = async (item) => {
      order.push(`start-${item}`);
      await new Promise((r) => setTimeout(r, 5));
      order.push(`end-${item}`);
      return item;
    };
    await sequentialFetchWithDelay(items, fetchFn, { delayMs: 0 });
    assert.deepEqual(order, [
      "start-1",
      "end-1",
      "start-2",
      "end-2",
      "start-3",
      "end-3",
    ]);
  });

  it("applies inter-request delay between items", async () => {
    const timestamps = [];
    const items = ["a", "b", "c"];
    const fetchFn = async (item) => {
      timestamps.push(Date.now());
      return item;
    };
    await sequentialFetchWithDelay(items, fetchFn, { delayMs: 50 });
    // Each subsequent call should be at least ~50ms after the previous
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      assert.ok(gap >= 40, `Gap between items ${i - 1} and ${i} was ${gap}ms`);
    }
  });

  it("defaults delayMs to 100 when opts not provided", async () => {
    const start = Date.now();
    const items = ["a", "b"];
    const fetchFn = async (item) => item;
    await sequentialFetchWithDelay(items, fetchFn);
    const elapsed = Date.now() - start;
    // Should take at least ~200ms (100ms delay after each of 2 items)
    assert.ok(elapsed >= 150, `Elapsed ${elapsed}ms, expected >= 150ms`);
  });

  it("skips delay when delayMs is 0", async () => {
    const start = Date.now();
    const items = Array.from({ length: 10 }, (_, i) => i);
    const fetchFn = async (item) => item;
    await sequentialFetchWithDelay(items, fetchFn, { delayMs: 0 });
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `Elapsed ${elapsed}ms with delayMs=0`);
  });
});

// ── githubHeaders ───────────────────────────────────────────────────────────

describe("githubHeaders", () => {
  let origGithubToken;
  let origGhToken;

  beforeEach(() => {
    origGithubToken = process.env.GITHUB_TOKEN;
    origGhToken = process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  afterEach(() => {
    if (origGithubToken !== undefined) {
      process.env.GITHUB_TOKEN = origGithubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    if (origGhToken !== undefined) {
      process.env.GH_TOKEN = origGhToken;
    } else {
      delete process.env.GH_TOKEN;
    }
  });

  it("includes User-Agent header", () => {
    const headers = githubHeaders();
    assert.equal(headers["User-Agent"], "Bluefin-Docs-Build");
  });

  it("uses explicit token parameter", () => {
    const headers = githubHeaders("ghp_explicit123");
    assert.equal(headers["Authorization"], "Bearer ghp_explicit123");
  });

  it("falls back to GITHUB_TOKEN env var", () => {
    process.env.GITHUB_TOKEN = "ghp_env_token";
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], "Bearer ghp_env_token");
  });

  it("falls back to GH_TOKEN env var when GITHUB_TOKEN not set", () => {
    process.env.GH_TOKEN = "ghp_gh_token";
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], "Bearer ghp_gh_token");
  });

  it("prefers GITHUB_TOKEN over GH_TOKEN", () => {
    process.env.GITHUB_TOKEN = "ghp_primary";
    process.env.GH_TOKEN = "ghp_secondary";
    const headers = githubHeaders();
    assert.equal(headers["Authorization"], "Bearer ghp_primary");
  });

  it("omits Authorization when no token available", () => {
    const headers = githubHeaders();
    assert.equal(headers["User-Agent"], "Bluefin-Docs-Build");
    assert.equal(headers["Authorization"], undefined);
  });

  it("prefers explicit token over env vars", () => {
    process.env.GITHUB_TOKEN = "ghp_env";
    const headers = githubHeaders("ghp_explicit");
    assert.equal(headers["Authorization"], "Bearer ghp_explicit");
  });
});
