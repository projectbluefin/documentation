const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { selectSkills, tokenize, rankSkill } = require("./select-skill.js");

test("tokenize strips punctuation and common stop words", () => {
  const tokens = tokenize("How to deploy a Cloudflare Worker?");
  assert.ok(tokens.includes("deploy"));
  assert.ok(tokens.includes("cloudflare"));
  assert.ok(tokens.includes("worker"));
  assert.ok(!tokens.includes("to"));
  assert.ok(!tokens.includes("a"));
});

test("rankSkill scores matching names and tags higher than descriptions", () => {
  const skill = {
    name: "cloudflare-workers",
    tags: ["cloudflare", "workers"],
    triggers: ["adding a worker"],
    description: "Conventions for workers",
  };

  const highMatch = rankSkill(skill, ["cloudflare", "workers"]);
  const lowMatch = rankSkill(skill, ["conventions"]);

  assert.ok(highMatch.score > lowMatch.score);
});

test("selectSkills matches relevant skills from catalog", () => {
  const res = selectSkills("deploy cloudflare worker");
  assert.ok(res.matches.length > 0);
  assert.equal(res.matches[0].id, "cloudflare-workers");
});
