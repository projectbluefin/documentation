const test = require("node:test");
const assert = require("node:assert/strict");
const {
  diffMilestones,
  extractSeasonProjectUnlocks,
  mergeMilestonesLedger,
  tierRank,
} = require("./lib/recent-milestones.js");

test("tierRank orders trust tiers monotonically", () => {
  assert.ok(tierRank("newcomer") < tierRank("contributor"));
  assert.ok(tierRank("contributor") < tierRank("trusted"));
  assert.ok(tierRank("trusted") < tierRank("merger"));
  assert.ok(tierRank("merger") < tierRank("advisor"));
});

test("diffMilestones returns empty when baseline is created", () => {
  const prev = {};
  const next = {
    alice: { tier: "contributor", tasks: 12 },
    bob: { tier: "trusted", tasks: 50 },
  };
  const events = diffMilestones(prev, next, "2026-09-23T12:00:00Z");
  assert.deepEqual(events, []);
});

test("diffMilestones detects trust tier promotions", () => {
  const prev = {
    alice: { tier: "contributor", tasks: 12 },
    bob: { tier: "contributor", tasks: 20 },
  };
  const next = {
    alice: { tier: "trusted", tasks: 14 },
    bob: { tier: "contributor", tasks: 21 },
  };
  const events = diffMilestones(prev, next, "2026-09-23T12:00:00Z");
  assert.equal(events.length, 1);
  assert.equal(events[0].login, "alice");
  assert.equal(events[0].type, "tier_up");
  assert.equal(events[0].tier, "trusted");
  assert.match(events[0].title, /Reached Trusted Tier/);
  assert.equal(events[0].detectedAt, "2026-09-23T12:00:00Z");
});

test("diffMilestones detects task landmark crossings", () => {
  const prev = {
    charlie: { tier: "contributor", tasks: 9 },
    dan: { tier: "contributor", tasks: 24 },
  };
  const next = {
    charlie: { tier: "contributor", tasks: 11 }, // crossed 10
    dan: { tier: "contributor", tasks: 27 }, // crossed 25
  };
  const events = diffMilestones(prev, next, "2026-09-23T12:00:00Z");
  assert.equal(events.length, 2);
  const charlieEvent = events.find((e) => e.login === "charlie");
  const danEvent = events.find((e) => e.login === "dan");
  assert.ok(charlieEvent);
  assert.equal(charlieEvent.type, "task_landmark");
  assert.equal(charlieEvent.value, 10);
  assert.ok(danEvent);
  assert.equal(danEvent.type, "task_landmark");
  assert.equal(danEvent.value, 25);
});

test("extractSeasonProjectUnlocks emits level-ups when reaching breadth tiers (2, 3, etc.)", () => {
  const season = {
    version: 51,
    name: "A Coruña",
    start: "2026-09-16T00:00:00Z",
  };
  const commitsByRepo = {
    common: [
      {
        author: { login: "elena" },
        commit: { committer: { date: "2026-09-17T10:00:00Z" } },
        parents: [{}],
      },
      {
        author: { login: "elena" },
        commit: { committer: { date: "2026-09-18T12:00:00Z" } },
        parents: [{}],
      },
    ],
    dakota: [
      {
        author: { login: "elena" },
        commit: { committer: { date: "2026-09-19T15:00:00Z" } },
        parents: [{}],
      },
      {
        author: { login: "frank" },
        commit: { committer: { date: "2026-09-16T08:00:00Z" } },
        parents: [{}],
      },
      // Merge commit by frank in common: parents.length > 1 skipped, so frank stays at 1 repo
      {
        author: { login: "frank" },
        commit: { committer: { date: "2026-09-17T08:00:00Z" } },
        parents: [{}, {}],
      },
    ],
  };
  // elena has 2 repos (common, dakota); frank has only 1 (dakota)
  const unlocks = extractSeasonProjectUnlocks(season, commitsByRepo);
  assert.equal(unlocks.length, 1); // Only elena reached breadth 2
  assert.equal(unlocks[0].login, "elena");
  assert.equal(unlocks[0].value, 2);
  assert.equal(unlocks[0].id, "season-51-elena-breadth-2");
  assert.equal(unlocks[0].detectedAt, "2026-09-19T15:00:00Z");
  assert.equal(unlocks[0].repo, "dakota");
  assert.match(unlocks[0].title, /Reached Contributor Breadth/);
});

test("mergeMilestonesLedger deduplicates and caps newest first", () => {
  const existing = [
    { id: "e1", detectedAt: "2026-09-20T00:00:00Z" },
    { id: "e2", detectedAt: "2026-09-19T00:00:00Z" },
  ];
  const newEvents = [
    { id: "e3", detectedAt: "2026-09-23T00:00:00Z" },
    { id: "e1", detectedAt: "2026-09-20T00:00:00Z" }, // duplicate
  ];
  const merged = mergeMilestonesLedger(existing, newEvents, 2);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "e3");
  assert.equal(merged[1].id, "e1");
});
