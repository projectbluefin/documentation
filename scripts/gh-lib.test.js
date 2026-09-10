/**
 * Unit coverage for scripts/lib/gh.js — the shared GitHub client used by the
 * /factory build-time pipelines.
 *
 * These pipelines are build-time and fail soft: ghFetch throwing is how a
 * caller learns to write an explicit "unavailable" payload, and ghPaginate
 * stopping early is what keeps a build from walking the whole API. Both
 * behaviours are load-bearing and were previously unasserted.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

let gh;

test.before(async () => {
  gh = await import("./lib/gh.js");
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Installs a fake global fetch and returns the recorded calls. */
function stubFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init, calls.length);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function jsonResponse(
  body,
  { ok = true, status = 200, statusText = "OK" } = {},
) {
  return {
    ok,
    status,
    statusText,
    json: async () => body,
  };
}

/** Runs fn with GITHUB_TOKEN/GH_TOKEN set to the supplied values. */
async function withTokens({ GITHUB_TOKEN, GH_TOKEN }, fn) {
  const saved = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GH_TOKEN: process.env.GH_TOKEN,
  };
  const apply = (name, value) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  apply("GITHUB_TOKEN", GITHUB_TOKEN);
  apply("GH_TOKEN", GH_TOKEN);
  try {
    return await fn();
  } finally {
    apply("GITHUB_TOKEN", saved.GITHUB_TOKEN);
    apply("GH_TOKEN", saved.GH_TOKEN);
  }
}

// ---------------------------------------------------------------------------
// githubToken
// ---------------------------------------------------------------------------

test("githubToken prefers GITHUB_TOKEN over GH_TOKEN", async () => {
  await withTokens({ GITHUB_TOKEN: "primary", GH_TOKEN: "secondary" }, () => {
    assert.equal(gh.githubToken(), "primary");
  });
});

test("githubToken falls back to GH_TOKEN when GITHUB_TOKEN is unset", async () => {
  await withTokens({ GITHUB_TOKEN: undefined, GH_TOKEN: "secondary" }, () => {
    assert.equal(gh.githubToken(), "secondary");
  });
});

test("githubToken falls back to GH_TOKEN when GITHUB_TOKEN is empty", async () => {
  // An empty string is how an unset CI secret arrives; it must not win the
  // `||` chain and produce an `Authorization: Bearer ` header.
  await withTokens({ GITHUB_TOKEN: "", GH_TOKEN: "secondary" }, () => {
    assert.equal(gh.githubToken(), "secondary");
  });
});

test("githubToken returns null, not undefined, when neither is set", async () => {
  await withTokens({ GITHUB_TOKEN: undefined, GH_TOKEN: undefined }, () => {
    assert.equal(gh.githubToken(), null);
  });
});

// ---------------------------------------------------------------------------
// ghFetch
// ---------------------------------------------------------------------------

test("ghFetch prefixes a bare path with the GitHub API host", async () => {
  const stub = stubFetch(() => jsonResponse({ ok: true }));
  try {
    await gh.ghFetch("/repos/projectbluefin/documentation", { token: "t" });
    assert.equal(
      stub.calls[0].url,
      `${gh.GH_API}/repos/projectbluefin/documentation`,
    );
  } finally {
    stub.restore();
  }
});

test("ghFetch leaves an absolute URL untouched", async () => {
  const stub = stubFetch(() => jsonResponse({}));
  try {
    await gh.ghFetch("https://api.github.com/rate_limit", { token: "t" });
    assert.equal(stub.calls[0].url, "https://api.github.com/rate_limit");
  } finally {
    stub.restore();
  }
});

test("ghFetch sends the pinned API version and a project user agent", async () => {
  const stub = stubFetch(() => jsonResponse({}));
  try {
    await gh.ghFetch("/x", { token: "t" });
    const headers = stub.calls[0].init.headers;
    assert.equal(headers.accept, "application/vnd.github+json");
    assert.equal(headers["x-github-api-version"], "2022-11-28");
    assert.equal(headers["user-agent"], "projectbluefin-documentation-factory");
  } finally {
    stub.restore();
  }
});

test("ghFetch omits the authorization header entirely when there is no token", async () => {
  // Sending `authorization: Bearer null` is a 401 on an endpoint that would
  // otherwise have served the anonymous request.
  const stub = stubFetch(() => jsonResponse({}));
  try {
    await withTokens({ GITHUB_TOKEN: undefined, GH_TOKEN: undefined }, () =>
      gh.ghFetch("/x"),
    );
    assert.ok(!("authorization" in stub.calls[0].init.headers));
  } finally {
    stub.restore();
  }
});

test("ghFetch reads the token from the environment when none is passed", async () => {
  const stub = stubFetch(() => jsonResponse({}));
  try {
    await withTokens({ GITHUB_TOKEN: "env-token", GH_TOKEN: undefined }, () =>
      gh.ghFetch("/x"),
    );
    assert.match(stub.calls[0].init.headers.authorization, /env-token$/);
  } finally {
    stub.restore();
  }
});

test("ghFetch returns the parsed JSON body", async () => {
  const stub = stubFetch(() => jsonResponse({ login: "octocat", id: 1 }));
  try {
    assert.deepEqual(await gh.ghFetch("/user", { token: "t" }), {
      login: "octocat",
      id: 1,
    });
  } finally {
    stub.restore();
  }
});

test("ghFetch throws on a non-2xx instead of returning a partial success", async () => {
  const stub = stubFetch(() => jsonResponse({}, { ok: false, status: 500 }));
  try {
    await assert.rejects(() => gh.ghFetch("/boom", { token: "t" }), /-> 500/);
  } finally {
    stub.restore();
  }
});

test("ghFetch adds a scope hint on 401 and 403", async () => {
  for (const status of [401, 403]) {
    const stub = stubFetch(() => jsonResponse({}, { ok: false, status }));
    try {
      await assert.rejects(
        () => gh.ghFetch("/private", { token: "t" }),
        /token with the required scope is missing or exhausted/,
      );
    } finally {
      stub.restore();
    }
  }
});

test("ghFetch does not add the scope hint on 404", async () => {
  const stub = stubFetch(() => jsonResponse({}, { ok: false, status: 404 }));
  try {
    await assert.rejects(
      () => gh.ghFetch("/missing", { token: "t" }),
      (error) => {
        assert.match(error.message, /-> 404$/);
        assert.doesNotMatch(error.message, /required scope/);
        return true;
      },
    );
  } finally {
    stub.restore();
  }
});

test("ghFetch error message names the requested path, not the expanded URL", async () => {
  const stub = stubFetch(() => jsonResponse({}, { ok: false, status: 502 }));
  try {
    await assert.rejects(
      () => gh.ghFetch("/repos/o/r/actions/runs", { token: "t" }),
      /^Error: GET \/repos\/o\/r\/actions\/runs -> 502$/,
    );
  } finally {
    stub.restore();
  }
});

// ---------------------------------------------------------------------------
// ghPaginate
// ---------------------------------------------------------------------------

const page = (n) => Array.from({ length: n }, (_, i) => ({ i }));

test("ghPaginate stops on a short page and returns one flat array", async () => {
  const stub = stubFetch((url, init, call) =>
    jsonResponse(call === 1 ? page(100) : page(3)),
  );
  try {
    const items = await gh.ghPaginate("/items", { token: "t" });
    assert.equal(items.length, 103);
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("ghPaginate stops on an empty page without appending it", async () => {
  const stub = stubFetch((url, init, call) =>
    jsonResponse(call === 1 ? page(100) : []),
  );
  try {
    assert.equal((await gh.ghPaginate("/items", { token: "t" })).length, 100);
    assert.equal(stub.calls.length, 2);
  } finally {
    stub.restore();
  }
});

test("ghPaginate honours maxPages so a build cannot walk the whole API", async () => {
  const stub = stubFetch(() => jsonResponse(page(100)));
  try {
    const items = await gh.ghPaginate("/items", { token: "t", maxPages: 3 });
    assert.equal(items.length, 300);
    assert.equal(stub.calls.length, 3);
  } finally {
    stub.restore();
  }
});

test("ghPaginate defaults to five pages", async () => {
  const stub = stubFetch(() => jsonResponse(page(100)));
  try {
    await gh.ghPaginate("/items", { token: "t" });
    assert.equal(stub.calls.length, 5);
  } finally {
    stub.restore();
  }
});

test("ghPaginate requests per_page=100 and an incrementing page number", async () => {
  const stub = stubFetch(() => jsonResponse(page(100)));
  try {
    await gh.ghPaginate("/items", { token: "t", maxPages: 3 });
    assert.deepEqual(
      stub.calls.map((call) => call.url),
      [
        `${gh.GH_API}/items?per_page=100&page=1`,
        `${gh.GH_API}/items?per_page=100&page=2`,
        `${gh.GH_API}/items?per_page=100&page=3`,
      ],
    );
  } finally {
    stub.restore();
  }
});

test("ghPaginate appends with & when the path already carries a query string", async () => {
  // Emitting a second `?` produces a path GitHub does not route, and the
  // existing filter would be silently dropped.
  const stub = stubFetch(() => jsonResponse([]));
  try {
    await gh.ghPaginate("/items?status=completed", { token: "t" });
    assert.equal(
      stub.calls[0].url,
      `${gh.GH_API}/items?status=completed&per_page=100&page=1`,
    );
  } finally {
    stub.restore();
  }
});

test("ghPaginate unwraps a wrapped response through select", async () => {
  const stub = stubFetch(() => jsonResponse({ workflow_runs: page(2) }));
  try {
    const items = await gh.ghPaginate("/runs", {
      token: "t",
      select: (body) => body.workflow_runs,
    });
    assert.equal(items.length, 2);
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("ghPaginate returns [] when a wrapped response has no select", async () => {
  // Without `select` the body is an object, not an array — the guard must stop
  // rather than spread an object into the output.
  const stub = stubFetch(() => jsonResponse({ workflow_runs: page(2) }));
  try {
    assert.deepEqual(await gh.ghPaginate("/runs", { token: "t" }), []);
    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

test("ghPaginate returns [] when select yields undefined", async () => {
  const stub = stubFetch(() => jsonResponse({ other: [] }));
  try {
    assert.deepEqual(
      await gh.ghPaginate("/runs", {
        token: "t",
        select: (body) => body.workflow_runs,
      }),
      [],
    );
  } finally {
    stub.restore();
  }
});

test("ghPaginate propagates a mid-pagination failure rather than truncating", async () => {
  // Silently returning page 1 would publish a factory payload that looks
  // complete but is not.
  const stub = stubFetch((url, init, call) =>
    call === 1
      ? jsonResponse(page(100))
      : jsonResponse({}, { ok: false, status: 500 }),
  );
  try {
    await assert.rejects(
      () => gh.ghPaginate("/items", { token: "t" }),
      /-> 500/,
    );
  } finally {
    stub.restore();
  }
});

test("ghPaginate forwards its token to every page request", async () => {
  const stub = stubFetch(() => jsonResponse(page(100)));
  try {
    await gh.ghPaginate("/items", { token: "page-token", maxPages: 2 });
    for (const call of stub.calls) {
      assert.match(call.init.headers.authorization, /page-token$/);
    }
  } finally {
    stub.restore();
  }
});

// ---------------------------------------------------------------------------
// ageMs / ageDays
// ---------------------------------------------------------------------------

const NOW = Date.parse("2026-01-10T00:00:00.000Z");

test("ageMs returns the elapsed milliseconds against the supplied now", () => {
  assert.equal(gh.ageMs("2026-01-09T00:00:00.000Z", NOW), 86_400_000);
});

test("ageMs returns null for a missing timestamp", () => {
  for (const absent of [null, undefined, ""]) {
    assert.equal(gh.ageMs(absent, NOW), null);
  }
});

test("ageMs returns null, not NaN, for an unparseable timestamp", () => {
  // NaN would flow into ageDays and render as "NaN days" on the factory page.
  assert.equal(gh.ageMs("not-a-date", NOW), null);
});

test("ageMs is negative for a future timestamp", () => {
  assert.equal(gh.ageMs("2026-01-11T00:00:00.000Z", NOW), -86_400_000);
});

test("ageDays floors partial days", () => {
  assert.equal(gh.ageDays("2026-01-08T12:00:00.000Z", NOW), 1);
  assert.equal(gh.ageDays("2026-01-09T23:59:59.000Z", NOW), 0);
});

test("ageDays distinguishes null (a gap) from 0 (today)", () => {
  assert.equal(gh.ageDays(null, NOW), null);
  assert.equal(gh.ageDays("2026-01-10T00:00:00.000Z", NOW), 0);
});

test("ageDays returns null for an unparseable timestamp", () => {
  assert.equal(gh.ageDays("whenever", NOW), null);
});

test("ageMs and ageDays default now to the current clock", () => {
  const recent = new Date(Date.now() - 1000).toISOString();
  assert.ok(gh.ageMs(recent) >= 1000);
  assert.equal(gh.ageDays(recent), 0);
});

// ---------------------------------------------------------------------------
// classifyRun re-export
// ---------------------------------------------------------------------------

test("gh.js re-exports classifyRun rather than reimplementing it", async () => {
  const stats = await import("./fetch-factory-stats.js");
  assert.equal(gh.classifyRun, stats.classifyRun);
});

test("the re-exported classifyRun keeps an in-flight run out of the failure bucket", () => {
  // projectbluefin/lab#616: a second copy of this rule is a second chance to
  // get it wrong, so assert the guardrail through the re-export too.
  assert.equal(
    gh.classifyRun({ status: "in_progress", conclusion: null }),
    "running",
  );
  assert.equal(
    gh.classifyRun({ status: "queued", conclusion: null }),
    "running",
  );
  assert.equal(
    gh.classifyRun({ status: "completed", conclusion: "success" }),
    "passed",
  );
  assert.equal(
    gh.classifyRun({ status: "completed", conclusion: "failure" }),
    "failed",
  );
  assert.equal(
    gh.classifyRun({ status: "completed", conclusion: "cancelled" }),
    "running",
  );
  assert.equal(gh.classifyRun(null), "running");
});

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

test("GH_API points at github.com over https and carries no trailing slash", () => {
  assert.equal(gh.GH_API, "https://api.github.com");
});
