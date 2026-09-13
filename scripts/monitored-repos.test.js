import { test } from "node:test";
import assert from "node:assert/strict";

import { MONITORED_REPOS } from "./lib/monitored-repos.mjs";
import { REPORT_PORTFOLIO } from "./lib/report-portfolio.mjs";

test("MONITORED_REPOS only lists projectbluefin repositories", () => {
  for (const repo of MONITORED_REPOS) {
    assert.ok(
      repo.startsWith("projectbluefin/"),
      `${repo} is not a projectbluefin repo`,
    );
  }
});

test("it contains exactly the projectbluefin portfolio entries", () => {
  const expected = REPORT_PORTFOLIO.map((e) => e.repository).filter((r) =>
    r.startsWith("projectbluefin/"),
  );
  assert.deepEqual([...MONITORED_REPOS].sort(), [...expected].sort());
});

test("every monitored repo carries an activity signal", () => {
  for (const repo of MONITORED_REPOS) {
    const entry = REPORT_PORTFOLIO.find((e) => e.repository === repo);
    assert.ok(entry, `${repo} is not in the portfolio`);
    assert.ok(
      entry.signals.includes("activity"),
      `${repo} has no activity signal`,
    );
  }
});

test("it excludes ecosystem repos that lack the projectbluefin prefix", () => {
  for (const repo of MONITORED_REPOS) {
    assert.ok(!repo.startsWith("ublue-os/"), `${repo} should not be monitored`);
  }
  assert.ok(!MONITORED_REPOS.includes("ublue-os/homebrew-tap"));
});

test("the list is a stable, portfolio-ordered array", () => {
  assert.ok(Array.isArray(MONITORED_REPOS));
  assert.deepEqual(
    MONITORED_REPOS,
    REPORT_PORTFOLIO.filter(
      (e) =>
        e.signals.includes("activity") &&
        e.repository.startsWith("projectbluefin/"),
    ).map((e) => e.repository),
  );
});
