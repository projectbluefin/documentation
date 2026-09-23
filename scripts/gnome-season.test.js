const test = require("node:test");
const assert = require("node:assert/strict");
const {
  releaseFromFeed,
  parseSeason,
  collectSeason,
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
