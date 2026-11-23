const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFeed,
  collectEvents,
  escapeXml,
} = require("./generate-leaderboard-feed");

const at = (iso) => iso;

test("collectEvents merges milestones and breadth unlocks newest-first", () => {
  const history = {
    milestones: [
      { id: "m1", detectedAt: at("2026-11-01T00:00:00Z"), title: "a" },
      { id: "m2", detectedAt: at("2026-11-10T00:00:00Z"), title: "b" },
    ],
    season: {
      breadthUnlocks: [
        { id: "b1", detectedAt: at("2026-11-05T00:00:00Z"), title: "c" },
      ],
    },
  };
  assert.deepEqual(
    collectEvents(history).map((e) => e.id),
    ["m2", "b1", "m1"],
  );
});

test("collectEvents folds in season first-contribution markers, newest-first", () => {
  const history = {
    milestones: [
      { id: "m1", detectedAt: at("2026-11-01T00:00:00Z"), title: "a" },
    ],
    season: {
      breadthUnlocks: [
        { id: "b1", detectedAt: at("2026-11-02T00:00:00Z"), title: "b" },
      ],
      firstContributions: [
        {
          id: "season-51-newcomer-first",
          login: "newcomer",
          type: "first_contribution",
          title: "First Contribution",
          detail: "First contribution to Bluefin (via common)",
          detectedAt: at("2026-11-03T00:00:00Z"),
          badge: { label: "FIRST", color: "var(--fx-gold)" },
        },
      ],
    },
  };
  assert.deepEqual(
    collectEvents(history).map((e) => e.id),
    ["season-51-newcomer-first", "b1", "m1"],
  );
});

test("buildFeed labels a first-contribution milestone", () => {
  const xml = buildFeed(
    {
      season: {
        firstContributions: [
          {
            id: "season-51-newcomer-first",
            login: "newcomer",
            type: "first_contribution",
            title: "First Contribution",
            detail: "First contribution to Bluefin (via common)",
            detectedAt: "2026-11-03T00:00:00Z",
            commitUrl:
              "https://github.com/projectbluefin/common/commit/newcomer-first",
          },
        ],
      },
    },
    new Date("2026-11-04T00:00:00Z"),
  );
  assert.match(xml, /<category>First contribution<\/category>/);
  assert.match(xml, /First Contribution — newcomer/);
  assert.match(
    xml,
    /<link>https:\/\/github\.com\/projectbluefin\/common\/commit\/newcomer-first<\/link>/,
  );
});

test("collectEvents keeps the whole stream and ignores records without an id", () => {
  const milestones = Array.from({ length: 60 }, (_, i) => ({
    id: `m${i}`,
    detectedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
  }));
  milestones.push({ detectedAt: "2026-01-01T00:00:00Z" });
  assert.equal(collectEvents({ milestones }).length, 60);
});

test("buildFeed emits a valid RSS channel with escaped items", () => {
  const xml = buildFeed(
    {
      milestones: [
        {
          id: "task-&-<1>",
          login: "alice",
          type: "task_landmark",
          title: '250 tasks & "shipped"',
          detail: "<script>alert(1)</script>",
          detectedAt: "2026-11-19T14:05:19Z",
        },
      ],
    },
    new Date("2026-11-20T00:00:00Z"),
  );

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2.0"/);
  assert.match(
    xml,
    /<title>Moments of Triumph — Bluefin Leaderboards<\/title>/,
  );
  assert.match(xml, /<guid isPermaLink="false">task-&amp;-&lt;1&gt;<\/guid>/);
  assert.match(
    xml,
    /<title>250 tasks &amp; &quot;shipped&quot; — alice<\/title>/,
  );
  assert.match(xml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(xml, /<script>/);
  assert.match(
    xml,
    /<link>https:\/\/hosted-projectbluefin-common-nmq5\.hive\.hivecommons\.dev\/contribute\/dossier\/alice<\/link>/,
  );
  assert.match(xml, /<pubDate>Thu, 19 Nov 2026 14:05:19 GMT<\/pubDate>/);
  assert.match(xml, /<category>Task landmark<\/category>/);
});

test("buildFeed with no events still publishes a valid empty channel", () => {
  const xml = buildFeed({}, new Date("2026-11-20T00:00:00Z"));
  assert.match(xml, /<rss version="2.0"/);
  assert.match(xml, /<\/channel>/);
  assert.doesNotMatch(xml, /<item>/);
});

test("escapeXml neutralises markup and quotes", () => {
  assert.equal(
    escapeXml(`<a href="x">&'</a>`),
    "&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;",
  );
});
