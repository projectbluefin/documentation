const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isIgnoredContributor,
  calculateActivityWindow,
  formatActivityWindowLabel,
  filterUniqueContributors,
} = require("./fetch-portal-contributors.js");

test("isIgnoredContributor detects bots and ignored identities", () => {
  assert.equal(isIgnoredContributor("Copilot"), true);
  assert.equal(isIgnoredContributor("dependabot[bot]"), true);
  assert.equal(isIgnoredContributor("renovate[bot]"), true);
  assert.equal(isIgnoredContributor("github-actions[bot]"), true);
  assert.equal(isIgnoredContributor("random-bot[bot]"), true);
  assert.equal(isIgnoredContributor("castrojo"), false);
  assert.equal(isIgnoredContributor("mrbobbytables"), false);
});

test("calculateActivityWindow calculates rolling 365-day cutoff", () => {
  const ref = new Date("2026-09-09T12:00:00Z");
  const windowDate = calculateActivityWindow(ref, 365);
  const diffDays = Math.round(
    (ref.getTime() - windowDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  assert.equal(diffDays, 365);
});

test("formatActivityWindowLabel produces Month Year format", () => {
  const date = new Date("2025-09-09T12:00:00Z");
  const label = formatActivityWindowLabel(date);
  assert.match(label, /Sep.*2025/);
});

test("filterUniqueContributors sorts alphabetically and limits to 12", () => {
  const peopleMap = new Map();
  for (let i = 0; i < 20; i++) {
    const char = String.fromCharCode(65 + i); // 'A', 'B', ...
    peopleMap.set(`user_${char}`, {
      login: `user_${char}`,
      html_url: `https://github.com/user_${char}`,
    });
  }

  const result = filterUniqueContributors(peopleMap, 12);
  assert.equal(result.length, 12);
  assert.equal(result[0].login, "user_A");
  assert.equal(result[11].login, "user_L");
});

// ---------------------------------------------------------------------------
// harvestPortalContributors — the 95-line harvest routine had zero coverage.
// It is exercised here through a stubbed global fetch, which also drives the
// module-private githubJson/githubPages pagination helpers.
// ---------------------------------------------------------------------------

const { harvestPortalContributors } = require("./fetch-portal-contributors.js");

const NOW = new Date("2026-09-09T12:00:00Z");

function okResponse(body) {
  return { ok: true, status: 200, statusText: "OK", json: async () => body };
}

function errorResponse(status = 500) {
  return {
    ok: false,
    status,
    statusText: "Server Error",
    json: async () => ({}),
  };
}

/** Serve `items` as 100-per-page slices, mirroring the GitHub page contract. */
function paged(items) {
  return (url) => {
    const page = Number(new URL(url).searchParams.get("page") || "1");
    return okResponse(items.slice((page - 1) * 100, page * 100));
  };
}

/**
 * Install a global fetch stub that routes by URL substring.
 * Returns the recorded call list and a restore function for the caller.
 */
function stubFetch(routes) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const href = String(url);
    calls.push(href);
    for (const [pattern, handler] of routes) {
      if (href.includes(pattern)) {
        return typeof handler === "function" ? handler(href) : handler;
      }
    }
    return okResponse([]);
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

function commit(login, extra = {}) {
  return {
    author: { login, html_url: `https://github.com/${login}`, ...extra },
  };
}

async function harvest(routes, options = {}) {
  const stub = stubFetch(routes);
  try {
    const payload = await harvestPortalContributors({
      token: "test-token",
      now: NOW,
      ...options,
    });
    return { payload, calls: stub.calls };
  } finally {
    stub.restore();
  }
}

test("harvestPortalContributors collects commit authors and stamps the activity window", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["/commits", paged([commit("castrojo"), commit("hanthor")])],
    ["/discussions", paged([])],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["castrojo", "hanthor"],
  );
  assert.equal(payload.unavailable, false);
  assert.equal(payload.generatedAt, NOW.toISOString());
  assert.equal(
    payload.activityWindowSince,
    calculateActivityWindow(NOW, 365).toISOString(),
  );
  assert.match(payload.activityWindowLabel, /Sep.*2025/);
  assert.equal(
    payload.bluefinPulseUrl,
    "https://github.com/ublue-os/bluefin/pulse",
  );
});

test("harvestPortalContributors honours a custom window in days", async () => {
  const { payload } = await harvest(
    [
      ["/orgs/projectbluefin/repos", paged([])],
      ["/commits", paged([])],
      ["/discussions", paged([])],
    ],
    { windowDays: 30 },
  );

  assert.equal(
    payload.activityWindowSince,
    calculateActivityWindow(NOW, 30).toISOString(),
  );
});

test("harvestPortalContributors queries org repos plus the two ublue-os fallbacks and skips forks", async () => {
  const { calls } = await harvest([
    [
      "/orgs/projectbluefin/repos",
      paged([
        { full_name: "projectbluefin/common", fork: false },
        { full_name: "projectbluefin/forked", fork: true },
        { full_name: null, fork: false },
        null,
      ]),
    ],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  const commitRepos = calls
    .filter((url) => url.includes("/commits"))
    .map((url) => url.match(/repos\/([^/]+\/[^/]+)\/commits/)[1]);

  assert.deepEqual(commitRepos, [
    "projectbluefin/common",
    "ublue-os/bluefin",
    "ublue-os/bluefin-lts",
  ]);
});

test("harvestPortalContributors de-duplicates a repo the org listing already returned", async () => {
  const { calls } = await harvest([
    [
      "/orgs/projectbluefin/repos",
      paged([
        { full_name: "ublue-os/bluefin", fork: false },
        { full_name: "ublue-os/bluefin-lts", fork: false },
      ]),
    ],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  const commitRepos = calls.filter((url) => url.includes("/commits"));
  assert.equal(commitRepos.length, 2);
});

test("harvestPortalContributors still reports the fallback repos when the org listing fails", async () => {
  const { payload, calls } = await harvest([
    ["/orgs/projectbluefin/repos", errorResponse(403)],
    ["/commits", paged([commit("castrojo")])],
    ["/discussions", paged([])],
  ]);

  assert.equal(calls.filter((url) => url.includes("/commits")).length, 2);
  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["castrojo"],
  );
});

test("harvestPortalContributors treats a non-array org listing page as the end of pagination", async () => {
  const { payload, calls } = await harvest([
    ["/orgs/projectbluefin/repos", okResponse({ message: "Not Found" })],
    ["/commits", paged([commit("hanthor")])],
    ["/discussions", paged([])],
  ]);

  assert.equal(calls.filter((url) => url.includes("/orgs/")).length, 1);
  assert.equal(calls.filter((url) => url.includes("/commits")).length, 2);
  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["hanthor"],
  );
});

test("harvestPortalContributors pages the org listing until a short page arrives", async () => {
  const repos = Array.from({ length: 150 }, (_, index) => ({
    full_name: `projectbluefin/repo-${index}`,
    fork: false,
  }));

  const { calls } = await harvest([
    ["/orgs/projectbluefin/repos", paged(repos)],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  const orgCalls = calls.filter((url) => url.includes("/orgs/"));
  assert.equal(orgCalls.length, 2);
  assert.ok(orgCalls.every((url) => url.includes("per_page=100")));
  assert.ok(orgCalls[0].includes("page=1"));
  assert.ok(orgCalls[1].includes("page=2"));
  // type=all already carries a query string, so pagination must append with '&'
  assert.ok(orgCalls[0].includes("type=all&per_page=100"));
});

test("harvestPortalContributors caps commit pagination at three pages per repo", async () => {
  const manyCommits = Array.from({ length: 500 }, (_, index) =>
    commit(`user-${String(index).padStart(3, "0")}`),
  );

  const { calls } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["ublue-os/bluefin/commits", paged(manyCommits)],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  const pagedCalls = calls.filter((url) =>
    url.includes("ublue-os/bluefin/commits"),
  );
  assert.equal(pagedCalls.length, 3);
});

test("harvestPortalContributors sends the activity window as a since= filter", async () => {
  const { calls } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  const since = encodeURIComponent(
    calculateActivityWindow(NOW, 365).toISOString(),
  );
  assert.ok(
    calls
      .filter((url) => url.includes("/commits"))
      .every((url) => url.includes(`since=${since}`)),
  );
});

test("harvestPortalContributors filters bots and commits with no linked account", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    [
      "ublue-os/bluefin/commits",
      paged([
        commit("dependabot[bot]"),
        commit("Copilot"),
        commit("renovate"),
        { author: null },
        { author: { login: "" } },
        null,
        commit("castrojo"),
      ]),
    ],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["castrojo"],
  );
});

test("harvestPortalContributors synthesises a profile URL when the API omits html_url", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["ublue-os/bluefin/commits", paged([{ author: { login: "castrojo" } }])],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  assert.equal(payload.contributors[0].html_url, "https://github.com/castrojo");
});

test("harvestPortalContributors keeps results from repos that succeeded when one repo fails", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["ublue-os/bluefin/commits", errorResponse(500)],
    ["ublue-os/bluefin-lts/commits", paged([commit("hanthor")])],
    ["/discussions", paged([])],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["hanthor"],
  );
});

test("harvestPortalContributors de-duplicates one person across several repos", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["/commits", paged([commit("castrojo"), commit("castrojo")])],
    ["/discussions", paged([])],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["castrojo"],
  );
});

test("harvestPortalContributors adds discussion authors inside the window and drops older ones", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["/commits", paged([])],
    [
      "/discussions",
      paged([
        {
          created_at: "2026-06-01T00:00:00Z",
          user: { login: "recent-person" },
        },
        {
          created_at: "2020-01-01T00:00:00Z",
          user: { login: "stale-person" },
        },
        { user: { login: "undated-person" } },
        { created_at: "2026-06-01T00:00:00Z", user: null },
        null,
      ]),
    ],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["recent-person"],
  );
});

test("harvestPortalContributors keeps commit contributors when Discussions is unavailable", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["/commits", paged([commit("castrojo")])],
    ["/discussions", errorResponse(410)],
  ]);

  assert.deepEqual(
    payload.contributors.map((person) => person.login),
    ["castrojo"],
  );
  assert.equal(payload.unavailable, false);
});

test("harvestPortalContributors limits the portal to twelve people", async () => {
  const authors = Array.from({ length: 30 }, (_, index) =>
    commit(`user-${String(index).padStart(2, "0")}`),
  );

  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", paged([])],
    ["ublue-os/bluefin/commits", paged(authors)],
    ["/commits", paged([])],
    ["/discussions", paged([])],
  ]);

  assert.equal(payload.contributors.length, 12);
  assert.equal(payload.contributors[0].login, "user-00");
  assert.equal(payload.contributors[11].login, "user-11");
});

test("harvestPortalContributors marks the payload unavailable when nothing is found", async () => {
  const { payload } = await harvest([
    ["/orgs/projectbluefin/repos", errorResponse(403)],
    ["/commits", errorResponse(500)],
    ["/discussions", errorResponse(500)],
  ]);

  assert.equal(payload.unavailable, true);
  assert.deepEqual(payload.contributors, []);
  assert.equal(payload.generatedAt, NOW.toISOString());
});
