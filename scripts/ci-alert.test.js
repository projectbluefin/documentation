const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const workflow = fs.readFileSync(
  path.join(__dirname, "../.github/workflows/ci-alert.yml"),
  "utf8",
);

// Execute the checked-in shell, not a copy of its cancellation logic.
function stepScript(name) {
  const step = workflow.split(`      - name: ${name}\n`)[1];
  assert.ok(step, `Missing workflow step: ${name}`);
  const script = step.split("\n      - name:")[0].split("        run: |\n")[1];
  assert.ok(script, `Missing shell script: ${name}`);
  return script.replace(/^ {10}/gm, "");
}

const superseded = stepScript(
  "Check whether a newer run superseded the cancellation",
);

function fixture(t, pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-alert-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, "output");
  fs.writeFileSync(output, "");
  fs.writeFileSync(path.join(dir, "runs.json"), JSON.stringify(pages));
  // A strict CLI stub: unknown flags (including -G) and implicit POST fail.
  fs.writeFileSync(
    path.join(dir, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const assert = require("node:assert/strict");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + "\\n");
if (args[0] === "api" && args.includes("repos/projectbluefin/documentation/actions/workflows/99/runs")) {
  assert.deepEqual(args, ["api", "--paginate", "--slurp", "-X", "GET",
    "repos/projectbluefin/documentation/actions/workflows/99/runs",
    "-f", "created=>=2026-11-20T07:00:00Z", "-f", "per_page=100"]);
  process.stdout.write(fs.readFileSync(process.env.RUNS));
} else if (args[0] === "api" && args.includes("repos/projectbluefin/documentation/actions/runs/123/jobs?per_page=100")) {
  process.stdout.write(JSON.stringify([{ jobs: [{ name: "build", conclusion: "cancelled", html_url: "https://example.com/job/1" }] }]));
} else if (args[0] === "api" && args.includes("repos/projectbluefin/documentation/issues?state=all&per_page=100")) {
  process.stdout.write("[[]]");
} else if (args[0] === "issue" && args[1] === "create") {
  assert.ok(args.includes("[CI] Deploy to GitHub Pages failed on main"));
} else {
  throw new Error("Unexpected gh invocation: " + JSON.stringify(args));
}
`,
    { mode: 0o755 },
  );
  return {
    output,
    calls: path.join(dir, "calls"),
    env: {
      ...process.env,
      PATH: `${dir}${path.delimiter}${process.env.PATH}`,
      GH_TOKEN: "offline-test-token",
      GITHUB_OUTPUT: output,
      REPO: "projectbluefin/documentation",
      WORKFLOW_ID: "99",
      RUN_NUMBER: "10",
      CREATED: "2026-11-20T07:00:00Z",
      RUNS: path.join(dir, "runs.json"),
      CALLS: path.join(dir, "calls"),
    },
  };
}

function run(script, env) {
  const result = spawnSync("bash", ["-c", script], {
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return result;
}

for (const event of ["push", "schedule", "repository_dispatch"]) {
  test(`newer ${event} run sets found=true across paginated results`, (t) => {
    const f = fixture(t, [
      { workflow_runs: [{ id: 123, run_number: 10, event: "push" }] },
      {
        workflow_runs: [
          { id: 124, run_number: 11, event },
          { id: 125, run_number: 12, event: "pull_request" },
          { id: 126, run_number: 13, event: "merge_group" },
        ],
      },
    ]);
    const result = run(superseded, f.env);
    assert.equal(fs.readFileSync(f.output, "utf8"), "found=true\n");
    assert.match(result.stdout, /superseded by run 124/);
  });
}

for (const [name, runs] of [
  [
    "only newer PR and merge-queue runs",
    [
      { id: 124, run_number: 11, event: "pull_request" },
      { id: 125, run_number: 12, event: "merge_group" },
    ],
  ],
  [
    "no newer run",
    [
      { id: 122, run_number: 9, event: "push" },
      { id: 123, run_number: 10, event: "push" },
    ],
  ],
  ["empty results", []],
]) {
  test(`${name} leaves found unset`, (t) => {
    const f = fixture(t, [{ workflow_runs: runs }]);
    run(superseded, f.env);
    assert.equal(fs.readFileSync(f.output, "utf8"), "");
  });
}

test("an unreplaced main cancellation reaches alert creation offline", (t) => {
  const f = fixture(t, [{ workflow_runs: [] }]);
  run(superseded, f.env);
  assert.equal(fs.readFileSync(f.output, "utf8"), "");

  const expressions = {
    "github.repository": "projectbluefin/documentation",
    "github.event.workflow_run.id": "123",
    "github.event.workflow_run.conclusion": "cancelled",
  };
  function render(script) {
    return script.replace(/\$\{\{\s*(.*?)\s*\}\}/g, (_, expression) => {
      assert.ok(Object.hasOwn(expressions, expression), expression);
      return expressions[expression];
    });
  }
  const env = { ...f.env, WORKFLOW: "Deploy to GitHub Pages" };
  run(render(stepScript("Get failed jobs from the run")), env);
  assert.match(fs.readFileSync(f.output, "utf8"), /^count=1$/m);
  run(render(stepScript("Check for existing alert issue")), env);
  assert.match(fs.readFileSync(f.output, "utf8"), /^issue_number=$/m);
  // Nonzero job count and no superseding run satisfy the creation step's
  // existing cancellation guard. Execute that step without touching GitHub.
  run(render(stepScript("Create or reopen alert issue")), {
    ...env,
    RUN_URL: "https://example.com/run/123",
    RUN_ID: "123",
    BRANCH: "main",
    COMMIT: "test-commit",
    FAILURES: "- build (cancelled)",
    EXISTING: "",
  });
  const calls = fs
    .readFileSync(f.calls, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[3].slice(0, 2), ["issue", "create"]);
});
