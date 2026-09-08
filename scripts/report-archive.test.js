import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const reportGenerator = import("./generate-report.mjs");
const workflowPath = ".github/workflows/monthly-reports.yml";

test("the monthly workflow commits every report snapshot input", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  assert.match(workflow, /blog(?:\/|\\\/)/);
  assert.match(workflow, /scripts\/data\/report-history\.json/);
  assert.match(workflow, /scripts\/data\/known-contributors\.json/);
  assert.match(workflow, /static\/data\/countme-history\.json/);
  assert.match(workflow, /npm run fetch-countme -- --force/);
  assert.match(workflow, /npm run fetch-flathub-stats -- --force/);
  assert.doesNotMatch(workflow, /git add reports\//);
});

test("the August 2026 legacy report route redirects to its blog archive post", () => {
  const config = readFileSync("docusaurus.config.ts", "utf8");

  assert.match(
    config,
    /to:\s*"\/blog\/archaeopteryx-august-2026"[\s\S]*from:\s*"\/reports\/2026\/08"/,
  );
});

test("report archives are created without replacing an existing post", async () => {
  const { writeImmutableReport } = await reportGenerator;
  const calls = [];
  await writeImmutableReport("blog/report.mdx", "snapshot", async (...args) => {
    calls.push(args);
  });

  assert.deepEqual(calls, [
    ["blog/report.mdx", "snapshot", { encoding: "utf8", flag: "wx" }],
  ]);
});
