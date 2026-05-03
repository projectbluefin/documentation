const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

// ── Phase definitions in package.json ────────────────────────────────────────

test("fetch-data script defines independent and dependent phases", () => {
  assert.ok(pkg.scripts["fetch-data"], "fetch-data script must exist");
  assert.ok(
    pkg.scripts["fetch-data:independent"],
    "fetch-data:independent script must exist",
  );
  assert.ok(
    pkg.scripts["fetch-data:dependent"],
    "fetch-data:dependent script must exist",
  );

  // fetch-data should orchestrate the phases in order
  const fetchData = pkg.scripts["fetch-data"];
  assert.ok(
    fetchData.includes("fetch-data:independent"),
    "fetch-data must reference the independent phase",
  );
  assert.ok(
    fetchData.includes("fetch-data:dependent"),
    "fetch-data must reference the dependent phase",
  );
});

test("fetch-pin-state phase runs between independent and dependent", () => {
  const fetchData = pkg.scripts["fetch-data"];
  const indIdx = fetchData.indexOf("fetch-data:independent");
  const pinIdx = fetchData.indexOf("fetch-pin-state");
  const depIdx = fetchData.indexOf("fetch-data:dependent");

  assert.ok(indIdx < pinIdx, "independent phase must come before pin-state");
  assert.ok(pinIdx < depIdx, "pin-state must come before dependent phase");
});

// ── Script files exist and are readable ──────────────────────────────────────

const FETCH_SCRIPTS = [
  "fetch-feeds.js",
  "fetch-playlist-metadata.js",
  "fetch-github-profiles.js",
  "fetch-github-repos.js",
  "fetch-github-driver-versions.js",
  "fetch-github-images.js",
  "fetch-contributors.js",
  "fetch-firehose.js",
  "fetch-pin-state.js",
];

test("all fetch script files exist", () => {
  for (const script of FETCH_SCRIPTS) {
    const scriptPath = path.join(ROOT, "scripts", script);
    assert.ok(
      fs.existsSync(scriptPath),
      `scripts/${script} must exist`,
    );
  }
});

test("all fetch script files are readable", () => {
  for (const script of FETCH_SCRIPTS) {
    const scriptPath = path.join(ROOT, "scripts", script);
    // Should not throw
    const content = fs.readFileSync(scriptPath, "utf8");
    assert.ok(content.length > 0, `scripts/${script} must not be empty`);
  }
});

// ── Graceful degradation without GITHUB_TOKEN ────────────────────────────────

// Scripts that require GITHUB_TOKEN should exit cleanly (code 0) or with a
// controlled warning when the token is absent — never crash with an unhandled error.

const GITHUB_SCRIPTS = [
  "fetch-github-profiles.js",
  "fetch-github-repos.js",
  "fetch-contributors.js",
];

for (const script of GITHUB_SCRIPTS) {
  test(`${script} exits cleanly without GITHUB_TOKEN`, () => {
    const scriptPath = path.join(ROOT, "scripts", script);
    try {
      execFileSync("node", [scriptPath], {
        env: {
          ...process.env,
          GITHUB_TOKEN: "",
          GH_TOKEN: "",
          // Preserve PATH for node resolution
          PATH: process.env.PATH,
          HOME: process.env.HOME,
        },
        timeout: 30_000,
        stdio: "pipe",
        cwd: ROOT,
      });
      // Exit code 0 — graceful
    } catch (err) {
      // execFileSync throws on non-zero exit codes
      // A controlled exit (e.g., code 1 with a message) is acceptable;
      // an unhandled exception (segfault, ENOENT, etc.) is not.
      const exitCode = err.status;
      assert.ok(
        exitCode !== null && exitCode !== undefined,
        `${script} must not crash (got signal: ${err.signal})`,
      );
      // Verify stderr doesn't contain unhandled promise rejection or crash traces
      const stderr = err.stderr?.toString() ?? "";
      assert.ok(
        !stderr.includes("UnhandledPromiseRejection"),
        `${script} must not have unhandled promise rejections`,
      );
      assert.ok(
        !stderr.includes("FATAL ERROR"),
        `${script} must not have fatal errors`,
      );
    }
  });
}
