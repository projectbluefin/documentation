import { test } from "node:test";
import assert from "node:assert/strict";

import { generateBotActivityTable } from "./lib/markdown-generator.mjs";

test("generateBotActivityTable aggregates bot PRs per repository", () => {
  const table = generateBotActivityTable(
    [
      { repo: "projectbluefin/bluefin", count: 3 },
      { repo: "bluefin", count: 2 }, // prefix is stripped, so this folds into bluefin
      { repo: "projectbluefin/dakota", count: 5 },
    ],
    10,
  );
  const lines = table.split("\n");
  // header + divider + two aggregated repos
  assert.equal(lines.length, 4);
  assert.match(lines[2], /^\| bluefin \| 5 \| 50.0% \|$/);
  assert.match(lines[3], /^\| dakota \| 5 \| 50.0% \|$/);
});

test("rows are sorted by bot-PR count, descending", () => {
  const table = generateBotActivityTable(
    [
      { repo: "projectbluefin/actions", count: 1 },
      { repo: "projectbluefin/bluefin", count: 9 },
      { repo: "projectbluefin/dakota", count: 4 },
    ],
    14,
  );
  const repos = table
    .split("\n")
    .slice(2) // skip header and divider
    .map((l) => l.split("|")[1].trim());
  assert.deepEqual(repos, ["bluefin", "dakota", "actions"]);
});

test("the percentage is one decimal place of the total", () => {
  const table = generateBotActivityTable(
    [{ repo: "projectbluefin/bluefin", count: 1 }],
    3,
  );
  assert.match(table.split("\n")[2], /33.3%/);
});

test("an empty activity list yields just the header and divider", () => {
  const table = generateBotActivityTable([], 0);
  const lines = table.split("\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^\| Repository \| Bot PRs \| % of Total \|$/);
  assert.match(lines[1], /^\|[-|]+\|$/);
});
