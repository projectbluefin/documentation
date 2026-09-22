// Executed coverage for scripts/build-index.mjs, the CLI that GitHub Actions
// runs to turn the Hive export into the published KV index.
//
// The module calls main() at import time, so it can only be driven as a
// subprocess. HIVE_HUB and VIOLATION_CEILING are the seams the script already
// reads from the environment; a loopback http server stands in for the hub.
//
// Run: node --test scripts/build-index-cli.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "build-index.mjs");

// A body a failing hub might return. If it ever reaches stdout/stderr the
// script has leaked an auth redirect into a public CI log.
const SECRET_BODY = "<html>login redirect ghs_LEAKEDTOKENSHAPE</html>";

const EXPORT = `# Agent Knowledge

## Patterns

### plain entry about bats coverage

Adds BATS coverage for 03-packages.sh.

- File: build_files/03-packages.sh

Tags: testing, 283)

### security-tagged entry naming a CVE

Blocks promotion until remediated.

Tags: security, ci

### tripwire entry that evades the security tag

The gate can be bypassed.

Tags: ci
`;

/** Hub responses are queued so each test declares exactly what it serves. */
let queued = null;
let server;
let hub;

before(async () => {
  server = createServer((req, res) => {
    const next = queued ?? { status: 200, body: EXPORT };
    res.writeHead(next.status, { "content-type": "text/plain" });
    res.end(next.body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  hub = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

/**
 * Run build-index.mjs in a scratch directory.
 * @returns {Promise<{code: number, stdout: string, stderr: string, dir: string}>}
 */
async function run({ args = [], env = {}, serve = null } = {}) {
  queued = serve;
  const dir = await mkdtemp(join(tmpdir(), "build-index-"));
  // GITHUB_STEP_SUMMARY is always set under Actions; default it off so only
  // cases that opt in write a summary, instead of polluting the real CI one.
  const child = {
    HIVE_TOKEN: "test-token",
    HIVE_HUB: hub,
    GITHUB_STEP_SUMMARY: undefined,
    ...env,
  };
  // Explicit deletes let a case unset a variable the ambient env may carry.
  const childEnv = { ...process.env, ...child };
  for (const [k, v] of Object.entries(child)) if (v === undefined) delete childEnv[k];

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [SCRIPT, ...args],
      { cwd: dir, env: childEnv },
      (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr, dir }),
    );
  });
}

test("refuses to run without HIVE_TOKEN, before contacting the hub", async () => {
  const { code, stderr } = await run({ env: { HIVE_TOKEN: undefined } });
  assert.equal(code, 1);
  assert.match(stderr, /build-index failed: HIVE_TOKEN is required/);
});

test("a failing hub fails the run by status and never echoes the body", async () => {
  const { code, stdout, stderr } = await run({
    serve: { status: 403, body: SECRET_BODY },
  });
  assert.equal(code, 1);
  assert.match(stderr, /hub returned 403 fetching knowledge export/);
  // The body may carry an auth redirect; it must not reach a public CI log.
  assert.doesNotMatch(stdout + stderr, /ghs_LEAKEDTOKENSHAPE/);
  assert.doesNotMatch(stdout + stderr, /login redirect/);
});

test("the hub's placeholder is rejected rather than published as a corpus", async () => {
  const { code, stderr } = await run({
    serve: { status: 200, body: "Knowledge base not yet available" },
  });
  assert.equal(code, 1);
  assert.match(stderr, /hub served its placeholder, not a knowledge base/);
});

test("an export whose every entry is withheld is refused, not written empty", async () => {
  const onlySecurity = `# Agent Knowledge

## Patterns

### a security-tagged entry

body

Tags: security
`;
  const { code, stdout, stderr } = await run({
    serve: { status: 200, body: onlySecurity },
  });
  assert.equal(code, 1);
  assert.match(stderr, /refusing to publish an empty index/);
  assert.match(stdout, /withheld \(security\) 1/);
});

test("a tripwire spike past the ceiling refuses to publish", async () => {
  const { code, stderr } = await run({ env: { VIOLATION_CEILING: "0" } });
  assert.equal(code, 1);
  assert.match(stderr, /1 tripwire hits exceeds ceiling 0/);
  assert.match(stderr, /refusing to publish/);
});

test("writes the index and counts what it saw, published and withheld", async () => {
  const { code, stdout, dir } = await run({ args: ["--out", "index.json"] });
  assert.equal(code, 0);
  assert.match(stdout, /entries seen {8}3/);
  assert.match(stdout, /published {11}1/);
  assert.match(stdout, /withheld \(security\) 1/);
  assert.match(stdout, /withheld \(tripwire\) 1/);

  const payload = JSON.parse(await readFile(join(dir, "index.json"), "utf8"));
  assert.equal(payload.count, 1);
  assert.equal(payload.entries.length, 1);
  assert.match(payload.entries[0].title, /plain entry about bats coverage/);
  assert.ok(!Number.isNaN(Date.parse(payload.generated)));
  assert.match(stdout, /wrote index\.json \(\d+ bytes\)/);
  await rm(dir, { recursive: true, force: true });
});

test("neither withheld entry reaches the published payload", async () => {
  const { dir } = await run({ args: ["--out", "index.json"] });
  const raw = await readFile(join(dir, "index.json"), "utf8");
  assert.doesNotMatch(raw, /Blocks promotion until remediated/);
  assert.doesNotMatch(raw, /The gate can be bypassed/);
  await rm(dir, { recursive: true, force: true });
});

test("tripwire reporting names titles only, never the suspected body", async () => {
  const { code, stdout, dir } = await run({ args: ["--out", "index.json"] });
  assert.equal(code, 0);
  assert.match(stdout, /Withheld by tripwire \(vuln language without a `security` tag\):/);
  assert.match(stdout, / \* tripwire entry that evades the security tag/);
  assert.doesNotMatch(stdout, /The gate can be bypassed/);
  assert.match(stdout, /Re-tag these upstream in Hive/);
  await rm(dir, { recursive: true, force: true });
});

test("--out defaults to index.json when the flag is absent", async () => {
  const { code, dir } = await run();
  assert.equal(code, 0);
  const payload = JSON.parse(await readFile(join(dir, "index.json"), "utf8"));
  assert.equal(payload.count, 1);
  await rm(dir, { recursive: true, force: true });
});

test("--dry-run still writes locally and says the index was not uploaded", async () => {
  const { code, stdout, dir } = await run({ args: ["--out", "dry.json", "--dry-run"] });
  assert.equal(code, 0);
  assert.match(stdout, /dry run — not uploaded/);
  // The flag documents the upload, not the local artifact: the file is written.
  const payload = JSON.parse(await readFile(join(dir, "dry.json"), "utf8"));
  assert.equal(payload.count, 1);
  await rm(dir, { recursive: true, force: true });
});

test("a run without GITHUB_STEP_SUMMARY writes no job summary", async () => {
  const { code, dir } = await run({ env: { GITHUB_STEP_SUMMARY: undefined } });
  assert.equal(code, 0);
  await assert.rejects(readFile(join(dir, "summary.md"), "utf8"));
  await rm(dir, { recursive: true, force: true });
});

test("appends the counts and tripwire titles to GITHUB_STEP_SUMMARY", async () => {
  const dirHint = await mkdtemp(join(tmpdir(), "build-index-summary-"));
  const summaryPath = join(dirHint, "summary.md");
  const { code, dir } = await run({ env: { GITHUB_STEP_SUMMARY: summaryPath } });
  assert.equal(code, 0);

  const summary = await readFile(summaryPath, "utf8");
  assert.match(summary, /### Knowledge index/);
  assert.match(summary, /published {11}1/);
  assert.match(summary, /\*\*Withheld by tripwire:\*\*/);
  assert.match(summary, /- tripwire entry that evades the security tag/);
  // Appended, so a second run does not clobber the first.
  await run({ env: { GITHUB_STEP_SUMMARY: summaryPath } });
  const twice = await readFile(summaryPath, "utf8");
  assert.equal(twice.match(/### Knowledge index/g).length, 2);

  await rm(dirHint, { recursive: true, force: true });
  await rm(dir, { recursive: true, force: true });
});

test("a clean export produces no tripwire section at all", async () => {
  const clean = `# Agent Knowledge

## Patterns

### adds BATS coverage for 03-packages.sh

Ordinary finding with no vulnerability language.

Tags: testing
`;
  const dirHint = await mkdtemp(join(tmpdir(), "build-index-clean-"));
  const summaryPath = join(dirHint, "summary.md");
  const { code, stdout, dir } = await run({
    serve: { status: 200, body: clean },
    env: { GITHUB_STEP_SUMMARY: summaryPath },
  });
  assert.equal(code, 0);
  assert.match(stdout, /withheld \(tripwire\) 0/);
  assert.doesNotMatch(stdout, /Withheld by tripwire/);
  assert.doesNotMatch(await readFile(summaryPath, "utf8"), /Withheld by tripwire/);

  await rm(dirHint, { recursive: true, force: true });
  await rm(dir, { recursive: true, force: true });
});
