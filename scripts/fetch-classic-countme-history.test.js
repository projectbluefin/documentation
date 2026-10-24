const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

let parseBadgeCount;
let buildClassicHistory;
let fetchClassicHistory;
let isValidClassicHistory;
let main;
let METHOD;
let UPSTREAM_ALLOWED;

test.before(async () => {
  ({ parseBadgeCount } = await import("./lib/classic-countme.mjs"));
  ({
    buildClassicHistory,
    fetchClassicHistory,
    isValidClassicHistory,
    main,
    METHOD,
  } = await import("./fetch-classic-countme-history.mjs"));
  ({ UPSTREAM_ALLOWED } = await import("./lib/countme-sources.mjs"));
});

const NOW = "2026-10-24T12:00:00.000Z";
const REVISIONS = [
  {
    sha: "547720fb441a3307631139408489e7874760fc2d",
    commit: { committer: { date: "2026-10-22T00:18:29Z" } },
  },
  {
    sha: "3a70bb8a3ae5ec84103aca48edde539b8b12fb20",
    commit: { committer: { date: "2026-10-15T00:19:03Z" } },
  },
  {
    sha: "9621810858840d2e1ccf0faa948f31ef6d0693b2",
    commit: { committer: { date: "2026-10-08T00:21:40Z" } },
  },
];

function json(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function outputPath(t) {
  const directory = mkdtempSync(join(tmpdir(), "classic-countme-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, "classic-countme-history.json");
}

function setTokens(t, githubToken, ghToken) {
  const saved = [process.env.GITHUB_TOKEN, process.env.GH_TOKEN];
  const apply = (name, value) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  apply("GITHUB_TOKEN", githubToken);
  apply("GH_TOKEN", ghToken);
  t.after(() => {
    apply("GITHUB_TOKEN", saved[0]);
    apply("GH_TOKEN", saved[1]);
  });
}

test("badge counts parse compact suffixes, whole groups, and real zero", () => {
  for (const [value, expected] of [
    ["4.6k", 4600],
    ["4.6K", 4600],
    ["1.25m", 1250000],
    ["1B", 1000000000],
    [" 1,234,567 ", 1234567],
    ["999", 999],
    ["0", 0],
    ["0k", 0],
  ]) {
    assert.equal(parseBadgeCount(value), expected, value);
  }
});

test("malformed badge messages remain null rather than becoming zero", () => {
  for (const value of [
    null,
    undefined,
    4600,
    {},
    "",
    " ",
    "unavailable",
    "NaN",
    "Infinity",
    "-1",
    "-1k",
    "1.5",
    "1,23",
    "12,3456",
    "1,000k",
    "1kk",
    "1e3",
    "1 k",
    "1k extra",
    "9".repeat(400),
    `${"9".repeat(400)}b`,
  ]) {
    assert.equal(parseBadgeCount(value), null, String(value));
  }
});

test("publication dates sort ascending and the latest full timestamp wins each day", () => {
  const payload = buildClassicHistory(
    [
      { publishedAt: "2026-10-22T23:00:00Z", message: "4.6k" },
      { publishedAt: "2026-10-08T00:21:40Z", message: "4.5k" },
      { publishedAt: "2026-10-15T00:19:03.900Z", message: "4.1k" },
      { publishedAt: "2026-10-15T00:19:03.100Z", message: "9k" },
      { publishedAt: "2026-10-22T00:18:29Z", message: "9k" },
    ],
    { generatedAt: NOW },
  );
  assert.deepEqual(payload, {
    generatedAt: NOW,
    source: UPSTREAM_ALLOWED.source,
    method: "classic-badge-history-v1",
    observations: [
      { date: "2026-10-08", count: 4500 },
      { date: "2026-10-15", count: 4100 },
      { date: "2026-10-22", count: 4600 },
    ],
  });
});

test("invalid historical readings are explicit gaps and valid zero survives", () => {
  const payload = buildClassicHistory(
    [
      { publishedAt: "2026-10-15T00:19:03Z", message: "0" },
      { publishedAt: "2026-10-22T00:18:29Z", message: "4.6k" },
      { publishedAt: "2026-10-22T01:00:00Z", message: "unavailable" },
    ],
    { generatedAt: NOW, currentBadge: "invalid" },
  );
  assert.deepEqual(payload.observations, [
    { date: "2026-10-15", count: 0 },
    { date: "2026-10-22", count: null },
  ]);
});

test("a real current badge adds today only, never backfills an earlier day", () => {
  const publications = [
    { publishedAt: "2026-10-15T00:19:03Z", message: "4.1k" },
    { publishedAt: "2026-10-24T00:18:29Z", message: "4.5k" },
  ];
  assert.deepEqual(
    buildClassicHistory(publications, {
      generatedAt: NOW,
      currentBadge: "4.6k",
    }).observations,
    [
      { date: "2026-10-15", count: 4100 },
      { date: "2026-10-24", count: 4600 },
    ],
  );
  assert.deepEqual(
    buildClassicHistory([], {
      generatedAt: NOW,
      currentBadge: "0",
    }).observations,
    [{ date: "2026-10-24", count: 0 }],
  );
  assert.deepEqual(
    buildClassicHistory([], {
      generatedAt: NOW,
      currentBadge: "invalid",
    }).observations,
    [],
  );
});

test("the producer queries only the permitted badge and reads its immutable revisions", async (t) => {
  setTokens(t, undefined, "test-gh-token");
  const calls = [];
  const messages = new Map([
    [REVISIONS[0].sha, "4.6k"],
    [REVISIONS[1].sha, "4.1k"],
    [REVISIONS[2].sha, "4.5k"],
  ]);
  const payload = await fetchClassicHistory({
    now: new Date(NOW),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      const parsed = new URL(url);
      if (parsed.hostname === "api.github.com") {
        assert.equal(parsed.pathname, "/repos/ublue-os/countme/commits");
        assert.equal(
          parsed.searchParams.get("path"),
          "badge-endpoints/bluefin.json",
        );
        assert.equal(
          parsed.searchParams.get("since"),
          "2026-01-27T12:00:00.000Z",
        );
        assert.equal(parsed.searchParams.get("until"), NOW);
        assert.equal(parsed.searchParams.get("per_page"), "100");
        assert.equal(parsed.searchParams.get("page"), "1");
        assert.equal(init.headers.authorization, "Bearer test-gh-token");
        assert.equal(init.headers.accept, "application/vnd.github+json");
        assert.equal(init.headers["x-github-api-version"], "2022-11-28");
        assert.equal(
          init.headers["user-agent"],
          "projectbluefin-documentation-factory",
        );
        return json(REVISIONS);
      }
      assert.equal(parsed.hostname, "raw.githubusercontent.com");
      assert.ok(!("authorization" in init.headers));
      assert.equal(init.headers.accept, "application/json");
      if (url === UPSTREAM_ALLOWED.source) return json({ message: "4.6k" });
      const sha = parsed.pathname.split("/")[3];
      assert.ok(messages.has(sha), `unexpected revision ${sha}`);
      assert.equal(url, UPSTREAM_ALLOWED.source.replace("/main/", `/${sha}/`));
      return json({ message: messages.get(sha) });
    },
  });
  assert.equal(calls.length, 5);
  assert.deepEqual(payload.observations, [
    { date: "2026-10-08", count: 4500 },
    { date: "2026-10-15", count: 4100 },
    { date: "2026-10-22", count: 4600 },
    { date: "2026-10-24", count: 4600 },
  ]);
});

test("commit pagination completes and revision reads stay bounded without a token", async (t) => {
  setTokens(t, undefined, undefined);
  const revisions = Array.from({ length: 101 }, (_, i) => ({
    sha: (i + 1).toString(16).padStart(40, "0"),
    commit: { committer: { date: "2026-10-22T00:18:29Z" } },
  }));
  let pages = 0;
  let active = 0;
  let maximum = 0;
  let reads = 0;
  const payload = await fetchClassicHistory({
    now: new Date(NOW),
    fetchImpl: async (url, init) => {
      assert.ok(!("authorization" in init.headers));
      const parsed = new URL(url);
      if (parsed.hostname === "api.github.com") {
        pages += 1;
        assert.equal(parsed.searchParams.get("page"), String(pages));
        return json(
          pages === 1 ? revisions.slice(0, 100) : revisions.slice(100),
        );
      }
      if (url === UPSTREAM_ALLOWED.source) return json({ message: "0" });
      active += 1;
      maximum = Math.max(maximum, active);
      reads += 1;
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return json({ message: "0" });
    },
  });
  assert.equal(pages, 2);
  assert.equal(reads, 101);
  assert.equal(maximum, 4);
  assert.deepEqual(payload.observations, [
    { date: "2026-10-22", count: 0 },
    { date: "2026-10-24", count: 0 },
  ]);
});

test("invalid revision identifiers or publication metadata are rejected before badge reads", async () => {
  for (const revision of [
    { ...REVISIONS[0], sha: "main/../../other.json" },
    {
      ...REVISIONS[0],
      commit: { committer: { date: "2026-02-30T00:00:00Z" } },
    },
    { ...REVISIONS[0], commit: { author: { date: "2026-10-22T00:18:29Z" } } },
  ]) {
    let calls = 0;
    await assert.rejects(
      fetchClassicHistory({
        now: new Date(NOW),
        fetchImpl: async () => {
          calls += 1;
          return json([revision]);
        },
      }),
      /Invalid badge revision/,
    );
    assert.equal(calls, 1);
  }
});

test("upstream failures preserve an existing valid cache byte-for-byte", async (t) => {
  const out = outputPath(t);
  const cached = buildClassicHistory(
    [{ publishedAt: "2026-10-15T00:19:03Z", message: "4.1k" }],
    { generatedAt: "2026-10-16T00:00:00.000Z" },
  );
  const bytes = JSON.stringify(cached);
  writeFileSync(out, bytes);
  const payload = await main({
    out,
    now: new Date(NOW),
    force: true,
    fetchImpl: async () => json({}, 503),
  });
  assert.deepEqual(payload, cached);
  assert.equal(readFileSync(out, "utf8"), bytes);
});

test("a failed revision read never publishes the successful fragment", async (t) => {
  const out = outputPath(t);
  const payload = await main({
    out,
    now: new Date(NOW),
    force: true,
    fetchImpl: async (url) => {
      if (url.startsWith("https://api.github.com/")) return json(REVISIONS);
      if (url.includes(REVISIONS[1].sha)) return json({}, 404);
      return json({ message: "4.6k" });
    },
  });
  assert.deepEqual(payload, {
    generatedAt: NOW,
    source: UPSTREAM_ALLOWED.source,
    method: METHOD,
    observations: [],
    unavailable: true,
    stateReason:
      "Bluefin Classic population history is temporarily unavailable.",
  });
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), payload);
});

test("a failed current badge read cannot publish otherwise successful history", async (t) => {
  const out = outputPath(t);
  const payload = await main({
    out,
    now: new Date(NOW),
    force: true,
    fetchImpl: async (url) => {
      if (url.startsWith("https://api.github.com/")) return json(REVISIONS);
      return url === UPSTREAM_ALLOWED.source
        ? json({}, 503)
        : json({ message: "4.6k" });
    },
  });
  assert.equal(payload.unavailable, true);
  assert.deepEqual(payload.observations, []);
});

test("incomparable or malformed caches cannot survive an upstream outage", async (t) => {
  const out = outputPath(t);
  const valid = buildClassicHistory([], {
    generatedAt: NOW,
    currentBadge: "4.6k",
  });
  for (const cached of [
    { ...valid, method: "old-method" },
    { ...valid, source: "https://example.com/other-badge.json" },
    { ...valid, observations: [{ date: "2026-02-30", count: 4600 }] },
    { ...valid, observations: [{ date: "2026-10-24", count: -1 }] },
    { ...valid, observations: [{ date: "2026-10-24", count: "4600" }] },
    { ...valid, generatedAt: "invalid" },
    { ...valid, unavailable: true },
  ]) {
    assert.equal(isValidClassicHistory(cached), false);
    writeFileSync(out, JSON.stringify(cached));
    const payload = await main({
      out,
      now: new Date(NOW),
      fetchImpl: async () => {
        throw new Error("private diagnostic");
      },
    });
    assert.equal(payload.unavailable, true);
    assert.deepEqual(payload.observations, []);
    assert.ok(!JSON.stringify(payload).includes("private diagnostic"));
  }
});

test("freshness uses the payload timestamp rather than a checkout's file mtime", async (t) => {
  const out = outputPath(t);
  const cached = buildClassicHistory([], {
    generatedAt: NOW,
    currentBadge: "0",
  });
  writeFileSync(out, JSON.stringify(cached));
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return json({}, 503);
  };
  await main({ out, now: new Date(NOW), fetchImpl });
  assert.equal(calls, 0);
  await main({ out, now: new Date("2026-10-26T12:00:00.000Z"), fetchImpl });
  assert.equal(calls, 1);
});

test("the command writes actual current-only data without manufacturing earlier history", async (t) => {
  const out = outputPath(t);
  const payload = await main({
    out,
    now: new Date(NOW),
    fetchImpl: async (url) =>
      url.startsWith("https://api.github.com/")
        ? json([])
        : json({ message: "4.6k" }),
  });
  assert.deepEqual(payload.observations, [{ date: "2026-10-24", count: 4600 }]);
  assert.equal(payload.unavailable, undefined);
  assert.equal(isValidClassicHistory(payload), true);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), payload);
});
