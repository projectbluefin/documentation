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
