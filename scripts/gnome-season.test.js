const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_SEASON_DURATION_MS,
  parseGnomeReleases,
  releaseFromFeed,
  parseGnomeNickname,
  formatSeasonTitle,
  parseSeason,
  buildSeasonWindows,
  collectSeason,
  assignCommitsToSeasons,
  fetchSeasonCommits,
} = require("./lib/gnome-season");

const feed = `
<feed>
  <entry><title>Introducing GNOME 52</title><published>2027-03-17T00:00:00+00:00</published><link href="https://release.gnome.org/52/" /></entry>
  <entry><title>Introducing GNOME 51</title><published>2026-09-16T00:00:00+00:00</published><link href="https://release.gnome.org/51/" /></entry>
  <entry><title>Introducing GNOME 50</title><published>2026-03-18T00:00:00+00:00</published><link href="https://release.gnome.org/50/" /></entry>
</feed>`;
const notes = `<h1><a>Introducing GNOME 51, "A Coruña"</a></h1>`;
const at = (iso, login) => ({
  author: login ? { login } : null,
  commit: { committer: { date: iso } },
});

test("official feed exposes a safe release-notes URL for the latest published GNOME release", () => {
  assert.deepEqual(releaseFromFeed(feed, Date.parse("2026-09-22T00:00:00Z")), {
    version: 51,
    start: "2026-09-16T00:00:00.000Z",
    source: "https://release.gnome.org/51/",
  });
});

test("GNOME season uses official nickname and published UTC boundary, not a future release", () => {
  assert.deepEqual(
    parseSeason(feed, notes, Date.parse("2026-09-22T00:00:00Z")),
    {
      version: 51,
      name: "A Coruña",
      start: "2026-09-16T00:00:00.000Z",
      source: "https://release.gnome.org/51/",
    },
  );
});

test("the next GNOME release starts a new season without prior commits", () => {
  const next = parseSeason(
    feed,
    '<h1>Introducing GNOME 52, "Example"</h1>',
    Date.parse("2027-03-18T00:00:00Z"),
  );
  const stats = collectSeason(
    next,
    {
      common: [
        at("2027-03-16T23:59:59Z", "veteran"),
        at("2027-03-17T00:00:00Z", "newcomer"),
      ],
    },
    Date.parse("2027-03-18T00:00:00Z"),
  );
  assert.equal(next.version, 52);
  assert.deepEqual(Object.keys(stats.byLogin), ["newcomer"]);
  assert.equal(stats.totalCommits, 1);
});

test("season does not accept an unverified nickname or release mismatch", () => {
  assert.throws(
    () =>
      parseSeason(
        feed,
        `<h1>Introducing GNOME 50, “Tokyo”</h1>`,
        Date.parse("2026-09-22T00:00:00Z"),
      ),
    /nickname/,
  );
});

test("season counts only attributed commits landed since release, with Sunday UTC buckets", () => {
  const season = parseSeason(feed, notes, Date.parse("2026-09-22T00:00:00Z"));
  const stats = collectSeason(
    season,
    {
      common: [
        at("2026-09-15T23:59:59Z", "newcomer"),
        at("2026-09-16T00:00:00Z", "newcomer"),
        at("2026-09-20T09:00:00Z", "newcomer"),
        {
          ...at("2026-09-20T11:00:00Z", "newcomer"),
          parents: [{ sha: "one" }, { sha: "two" }],
        },
        at("2026-09-20T12:00:00Z", "mergeraptor[bot]"),
        at("2026-09-21T09:00:00Z", null),
      ],
      bluefin: [
        at("2026-09-20T10:00:00Z", "newcomer"),
        at("2026-09-22T12:00:00Z", "second"),
      ],
    },
    Date.parse("2026-09-22T00:00:00Z"),
    (login) => login.endsWith("[bot]"),
  );
  assert.deepEqual(stats.byLogin, {
    newcomer: { commits: 3, repos: { common: 2, bluefin: 1 } },
  });
  assert.deepEqual(stats.weekStarts, [
    Date.parse("2026-09-13T00:00:00Z") / 1000,
    Date.parse("2026-09-20T00:00:00Z") / 1000,
  ]);
  assert.deepEqual(stats.weeklyCommits, [1, 2]);
  assert.equal(stats.totalCommits, 3);
});

test("seasonal commit fetch follows GitHub pagination and rejects incomplete repos", async () => {
  const calls = [];
  const request = async (url) => {
    calls.push(url);
    if (url.includes("/repos/projectbluefin/bluefin/"))
      return { ok: false, status: 403 };
    return {
      ok: true,
      json: async () => [
        {
          ...at("2026-09-20T00:00:00Z", "newcomer"),
          parents: [{ sha: "one" }, { sha: "two" }],
        },
      ],
      headers: {
        get: () =>
          url.includes("page=2")
            ? null
            : '<https://api.github.com/repos/projectbluefin/common/commits?page=2>; rel="next"',
      },
    };
  };
  await assert.rejects(
    fetchSeasonCommits(
      ["common", "bluefin"],
      "2026-09-16T00:00:00.000Z",
      "2026-09-22T00:00:00.000Z",
      request,
    ),
    /bluefin: HTTP 403/,
  );
  const rows = await fetchSeasonCommits(
    ["common"],
    "2026-09-16T00:00:00.000Z",
    "2026-09-22T00:00:00.000Z",
    request,
  );
  assert.equal(rows.common.length, 2);
  assert.equal(rows.common[0].parents.length, 2);
  assert.ok(calls.some((url) => url.includes("page=2")));
});

test("a newly created empty repository does not block the season", async () => {
  const rows = await fetchSeasonCommits(
    ["common", "empty"],
    "2026-09-16T00:00:00.000Z",
    "2026-09-22T00:00:00.000Z",
    async (url) =>
      url.includes("/empty/")
        ? { status: 409, ok: false }
        : {
            status: 200,
            ok: true,
            json: async () => [at("2026-09-20T00:00:00Z", "newcomer")],
            headers: { get: () => null },
          },
  );
  assert.equal(rows.common.length, 1);
  assert.deepEqual(rows.empty, []);
});

test("parseGnomeReleases and parseGnomeNickname handle official nicknames and nicknameless releases", () => {
  const historicalFeed = `
<feed>
  <entry><title>Introducing GNOME 45</title><published>2023-09-20T00:00:00+00:00</published></entry>
  <entry><title>Introducing GNOME 44</title><published>2023-03-22T00:00:00+00:00</published></entry>
  <entry><title>Introducing GNOME 43</title><published>2022-09-21T00:00:00+00:00</published></entry>
  <entry><title>Introducing GNOME 42</title><published>2022-03-23T00:00:00+00:00</published></entry>
</feed>`;
  const releases = parseGnomeReleases(
    historicalFeed,
    Date.parse("2026-01-01T00:00:00Z"),
  );
  assert.deepEqual(
    releases.map((r) => r.version),
    [42, 43, 44, 45],
  );
  assert.equal(
    parseGnomeNickname(43, '<h1>Introducing GNOME&nbsp;43, "Guadalajara"</h1>'),
    "Guadalajara",
  );
  assert.equal(
    parseGnomeNickname(45, "<h1>Introducing GNOME 45, “Rīga”</h1>"),
    "Rīga",
  );
  // GNOME 42 has no official nickname — must return null rather than inventing one.
  assert.equal(
    parseGnomeNickname(42, "<h1>Introducing GNOME\u00a042</h1>"),
    null,
  );
  assert.equal(
    formatSeasonTitle({ version: 43, name: "Guadalajara" }),
    "Season of Guadalajara",
  );
  assert.equal(
    formatSeasonTitle({ version: 42, name: null }),
    "Season of GNOME 42",
  );
});

test("buildSeasonWindows enforces the 6-month cap by splitting at the nearest ublue-os/bluefin release", () => {
  const gnomeReleases = [
    {
      version: 42,
      name: null,
      start: "2022-03-23T00:00:00.000Z",
      source: "https://release.gnome.org/42/",
    },
    {
      version: 44,
      name: "Kuala Lumpur",
      start: "2023-03-22T00:00:00.000Z",
      source: "https://release.gnome.org/44/",
    },
  ];
  const bluefinReleases = [
    { tag_name: "v0.1.0", published_at: "2022-07-01T00:00:00Z" },
    { tag_name: "v0.5.0", published_at: "2022-09-20T00:00:00Z" },
    { tag_name: "v0.9.0", published_at: "2022-12-15T00:00:00Z" },
  ];
  const windows = buildSeasonWindows(gnomeReleases, bluefinReleases, {
    earliestDate: "2022-04-01T00:00:00Z",
    currentSeasonStart: "2023-03-22T00:00:00.000Z",
  });
  assert.equal(
    windows.length,
    2,
    "a 364-day GNOME gap must split into 2 windows",
  );
  for (const w of windows) {
    assert.ok(
      Date.parse(w.end) - Date.parse(w.start) <= MAX_SEASON_DURATION_MS,
      `season ${w.id} must not exceed 6 months`,
    );
    assert.match(w.splitRule, /v0\.5\.0/);
  }
  assert.equal(windows[0].end, windows[1].start, "no gap or overlap at split");
  assert.equal(windows[0].name, null);
  assert.match(windows[0].nicknameNote, /no official release nickname/i);
});

test("assignCommitsToSeasons handles boundary dates, multi-season contributors, multi-source repos, and empty preseason", () => {
  const gnomeReleases = [
    {
      version: 43,
      name: "Guadalajara",
      start: "2022-09-21T00:00:00.000Z",
      source: "https://release.gnome.org/43/",
    },
    {
      version: 44,
      name: "Kuala Lumpur",
      start: "2023-03-22T00:00:00.000Z",
      source: "https://release.gnome.org/44/",
    },
  ];
  const windows = buildSeasonWindows(
    gnomeReleases,
    [{ tag_name: "v1.0.0", published_at: "2023-04-02T12:39:46Z" }],
    {
      earliestDate: "2023-03-08T18:39:32Z",
      currentSeasonStart: "2023-09-20T00:00:00.000Z",
    },
  );
  const commitsByRepo = {
    // Multiple tracked sources: org repo + ublue-os/bluefin + ublue-os/bluefin-lts
    website: [
      at("2023-08-10T10:00:00Z", "alice"),
      at("2023-08-11T10:00:00Z", "bob"),
    ],
    "ublue-os/bluefin": [
      at("2023-03-08T18:39:33Z", "alice"),
      // Exact boundary: 2023-03-22T00:00:00Z belongs to Season 2 (GNOME 44), not Season 1.
      at("2023-03-22T00:00:00Z", "alice"),
      at("2023-03-21T23:59:59Z", "charlie"),
    ],
    "ublue-os/bluefin-lts": [at("2023-06-01T12:00:00Z", "alice")],
  };
  const { seasons, preseason } = assignCommitsToSeasons(
    windows,
    commitsByRepo,
    (login) => login.endsWith("[bot]"),
  );
  assert.equal(seasons.length, 2);
  // Season 1 (Guadalajara): alice (1 commit on 03-08) + charlie (1 commit on 03-21 23:59:59)
  assert.deepEqual(seasons[0].byLogin, {
    alice: { commits: 1, repos: { "ublue-os/bluefin": 1 } },
    charlie: { commits: 1, repos: { "ublue-os/bluefin": 1 } },
  });
  // Season 2 (Kuala Lumpur): alice spans org repo + ublue-os/bluefin + ublue-os/bluefin-lts
  assert.deepEqual(seasons[1].byLogin, {
    alice: {
      commits: 3,
      repos: {
        website: 1,
        "ublue-os/bluefin": 1,
        "ublue-os/bluefin-lts": 1,
      },
    },
    bob: { commits: 1, repos: { website: 1 } },
  });
  // Preseason is completely empty
  assert.equal(preseason.contributorCount, 0);
  assert.equal(preseason.totalCommits, 0);
});

test("fetchSeasonCommits supports qualified owner/repo slugs and partial failure reporting", async () => {
  const urls = [];
  const res = await fetchSeasonCommits(
    ["common", "ublue-os/bluefin", "ublue-os/bluefin-lts"],
    "2024-09-18T00:00:00.000Z",
    "2025-03-19T00:00:00.000Z",
    async (url) => {
      urls.push(url);
      if (url.includes("/repos/ublue-os/bluefin-lts/")) {
        return { ok: false, status: 503 };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [at("2024-10-01T00:00:00Z", "alice")],
        headers: { get: () => null },
      };
    },
    { allowPartial: true },
  );
  assert.ok(
    urls.some((u) => u.includes("/repos/projectbluefin/common/commits")),
  );
  assert.ok(urls.some((u) => u.includes("/repos/ublue-os/bluefin/commits")));
  assert.equal(res.byRepo.common.length, 1);
  assert.equal(res.byRepo["ublue-os/bluefin"].length, 1);
  assert.equal(res.failedRepos.length, 1);
  assert.equal(res.failedRepos[0].repo, "ublue-os/bluefin-lts");
  assert.match(res.failedRepos[0].reason, /HTTP 503/);
});
