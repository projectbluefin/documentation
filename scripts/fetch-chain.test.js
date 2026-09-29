const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
);

// ── Phase definitions in package.json ────────────────────────────────────────

// fetch-github-images reads static/feeds/bluefin-releases.json, which only
// fetch-feeds writes. Started concurrently with fetch-feeds, it silently loses
// the Bluefin Classic release link and digest. Every other fetch script is
// independent, so the single parallel phase must carry this one ordering.
test("fetch-github-images runs only after fetch-feeds completes", () => {
  assert.match(
    pkg.scripts["fetch-data"],
    /fetch-data:independent/,
    "fetch-data must run the parallel phase",
  );
  const phase = pkg.scripts["fetch-data:independent"].split(/\s+/);
  assert.ok(
    !phase.includes("fetch-github-images") && !phase.includes("fetch-feeds"),
    "fetch-feeds and fetch-github-images must not be fanned out independently",
  );
  const chains = phase.filter((name) =>
    /^npm run fetch-feeds && npm run fetch-github-images$/.test(
      pkg.scripts[name] ?? "",
    ),
  );
  assert.equal(
    chains.length,
    1,
    "the parallel phase must include one fetch-feeds && fetch-github-images chain",
  );
});

// ── Failure propagation across the parallel phases ───────────────────────────

// Both phases fan out over many scripts. A bare `wait` terminating a chain of
// backgrounded `&` jobs always returns 0, which silently discards the exit code
// of every fetch script — including the ones that deliberately exit non-zero.
// The phases must delegate to scripts/run-parallel.mjs, which propagates status.

const PARALLEL_PHASES = ["fetch-data:independent"];

for (const phase of PARALLEL_PHASES) {
  test(`${phase} does not swallow exit codes with a bare wait`, () => {
    const cmd = pkg.scripts[phase];
    assert.doesNotMatch(
      cmd,
      /(^|[;&\s])wait\s*$/,
      `${phase} must not end in a bare \`wait\` — it always returns 0`,
    );
    assert.doesNotMatch(
      cmd,
      /&(?!&)/,
      `${phase} must not background jobs with \`&\`; their status is lost`,
    );
  });

  test(`${phase} delegates to the status-propagating runner`, () => {
    assert.match(
      pkg.scripts[phase],
      /node scripts\/run-parallel\.mjs /,
      `${phase} must fan out via scripts/run-parallel.mjs`,
    );
  });
}

test("run-parallel runner exists and is executable by node", () => {
  const runner = path.join(ROOT, "scripts", "run-parallel.mjs");
  assert.ok(fs.existsSync(runner), "scripts/run-parallel.mjs must exist");
  const res = execFileSync("node", ["--check", runner], { stdio: "pipe" });
  assert.ok(res !== undefined);
});

test("every script named by the phases is defined in package.json", () => {
  for (const phase of PARALLEL_PHASES) {
    const names = pkg.scripts[phase]
      .replace(/^node scripts\/run-parallel\.mjs /, "")
      .trim()
      .split(/\s+/);
    assert.ok(names.length > 0, `${phase} must name at least one script`);
    for (const name of names) {
      assert.ok(
        pkg.scripts[name],
        `${phase} references undefined script "${name}"`,
      );
    }
  }
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
  "fetch-portal-contributors.js",
  "fetch-firehose.js",
];

test("all fetch script files exist", () => {
  for (const script of FETCH_SCRIPTS) {
    const scriptPath = path.join(ROOT, "scripts", script);
    assert.ok(fs.existsSync(scriptPath), `scripts/${script} must exist`);
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
  "fetch-portal-contributors.js",
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
