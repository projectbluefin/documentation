const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const RUNNER = path.join(ROOT, "scripts", "run-parallel.mjs");

// Build a throwaway package whose scripts have known exit codes, so the
// runner's status propagation is exercised without touching real fetches.
function withFixture(scripts, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "run-parallel-"));
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "fixture", version: "0.0.0", scripts }, null, 2),
    );
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runIn(dir, args) {
  return spawnSync("node", [RUNNER, ...args], {
    cwd: dir,
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, npm_config_loglevel: "silent" },
  });
}

test("exits 0 when every script succeeds", () => {
  withFixture({ a: "exit 0", b: "exit 0" }, (dir) => {
    const res = runIn(dir, ["a", "b"]);
    assert.equal(res.status, 0, res.stderr);
  });
});

test("propagates failure when a single script exits non-zero", () => {
  withFixture({ ok: "exit 0", bad: "exit 1" }, (dir) => {
    const res = runIn(dir, ["ok", "bad"]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /"bad" failed/);
  });
});

test("a failing script is not masked by later succeeding scripts", () => {
  // The bare-`wait` regression this runner replaces: a non-zero child
  // followed by zero-exit children reported success overall.
  withFixture({ bad: "exit 7", ok1: "exit 0", ok2: "exit 0" }, (dir) => {
    const res = runIn(dir, ["bad", "ok1", "ok2"]);
    assert.equal(res.status, 1);
  });
});

test("names every failing script, not just the first", () => {
  withFixture({ a: "exit 1", b: "exit 0", c: "exit 1" }, (dir) => {
    const res = runIn(dir, ["a", "b", "c"]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /"a" failed/);
    assert.match(res.stderr, /"c" failed/);
    assert.match(res.stderr, /2 of 3 script\(s\) failed/);
  });
});

test("runs the scripts concurrently, not serially", () => {
  withFixture({ s1: "sleep 2", s2: "sleep 2", s3: "sleep 2" }, (dir) => {
    const started = Date.now();
    const res = runIn(dir, ["s1", "s2", "s3"]);
    const elapsed = Date.now() - started;
    assert.equal(res.status, 0, res.stderr);
    // Serial execution would need >=6s; allow generous headroom for npm spawn.
    assert.ok(elapsed < 5500, `took ${elapsed}ms — appears serial`);
  });
});

test("refuses an empty script list", () => {
  withFixture({}, (dir) => {
    const res = runIn(dir, []);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /no scripts given/);
  });
});
