const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

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

// Scripts that use GITHUB_TOKEN should exit cleanly (code 0) or with a
// controlled warning when the token is absent — never crash with an unhandled
// error. A missing token does not stop anonymous requests, so each script runs
// from a throwaway copy of the checkout with a preloaded fetch stub: the result
// never depends on GitHub's response time or on data already generated in the
// real checkout, and any attempt to open a real socket is recorded as a failure.

const os = require("node:os");

const GITHUB_SCRIPTS = [
  "fetch-github-profiles.js",
  "fetch-github-repos.js",
  "fetch-contributors.js",
  "fetch-portal-contributors.js",
];

// Scripts whose plain age check lets a fresh output file skip every request.
const WARM_CACHE_OUTPUTS = {
  "fetch-github-repos.js": "github-repos.json",
  "fetch-contributors.js": "file-contributors.json",
};

const FETCH_STUB = `
const fs = require("node:fs");
const net = require("node:net");
const record = (line) => fs.appendFileSync(process.env.FETCH_STUB_LOG, line + "\\n");
net.Socket.prototype.connect = function () {
  record("NETWORK");
  throw new Error("real network access is blocked in this test");
};
globalThis.fetch = async (url) => {
  record("FETCH " + String(url));
  if (process.env.FETCH_STUB_MODE === "reject") {
    throw new TypeError("fetch failed (stubbed outage)");
  }
  return new Response(JSON.stringify({ message: "stubbed outage" }), {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "content-type": "application/json" },
  });
};
process.on("unhandledRejection", (reason) => {
  record("UNHANDLED " + (reason && reason.message));
  process.exit(98);
});
`;

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-chain-"));
  fs.cpSync(path.join(ROOT, "scripts"), path.join(dir, "scripts"), {
    recursive: true,
  });
  fs.symlinkSync(
    path.join(ROOT, "node_modules"),
    path.join(dir, "node_modules"),
  );
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs", "intro.md"), "# Intro\n");
  fs.mkdirSync(path.join(dir, "blog"));
  fs.writeFileSync(
    path.join(dir, "blog", "authors.yaml"),
    "someone:\n  name: Someone\n  socials:\n    github: someone\n",
  );
  fs.writeFileSync(path.join(dir, "blog", "2026-01-01-post.md"), "# Post\n");
  fs.mkdirSync(path.join(dir, "static", "data"), { recursive: true });
  fs.writeFileSync(path.join(dir, "fetch-stub.js"), FETCH_STUB);
  return dir;
}

function snapshotDir(dir) {
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir, { recursive: true })
    .sort()
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return `${name}:${stat.size}:${stat.mtimeMs}`;
    })
    .join("\n");
}

function runOffline(fixture, script, mode) {
  const log = path.join(fixture, `stub-${mode}.log`);
  fs.writeFileSync(log, "");
  const result = spawnSync(
    "node",
    [
      "--require",
      path.join(fixture, "fetch-stub.js"),
      path.join(fixture, "scripts", script),
    ],
    {
      env: {
        PATH: process.env.PATH,
        HOME: fixture,
        GITHUB_TOKEN: "",
        GH_TOKEN: "",
        FETCH_STUB_LOG: log,
        FETCH_STUB_MODE: mode,
      },
      timeout: 30_000,
      encoding: "utf8",
      cwd: fixture,
    },
  );
  const calls = fs.readFileSync(log, "utf8").split("\n").filter(Boolean);
  return { ...result, calls, output: `${result.stdout}\n${result.stderr}` };
}

function assertControlledExit(script, run) {
  assert.equal(
    run.signal,
    null,
    `${script} must not be killed (got ${run.signal})`,
  );
  assert.ok(
    run.status === 0 || run.status === 1,
    `${script} must exit 0 or 1, got ${run.status}:\n${run.output}`,
  );
  assert.ok(
    !run.calls.some((c) => c.startsWith("UNHANDLED")),
    `${script} must not leave an unhandled rejection: ${run.calls.join(", ")}`,
  );
  assert.ok(
    !run.calls.includes("NETWORK"),
    `${script} must not open a real network connection`,
  );
  assert.doesNotMatch(run.output, /UnhandledPromiseRejection|FATAL ERROR/);
}

const REAL_DATA_DIR = path.join(ROOT, "static", "data");

for (const script of GITHUB_SCRIPTS) {
  for (const mode of ["http-error", "reject"]) {
    test(`${script} exits cleanly without GITHUB_TOKEN when GitHub is unreachable (${mode}, cold cache)`, (t) => {
      const fixture = makeFixture();
      t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
      const before = snapshotDir(REAL_DATA_DIR);

      const run = runOffline(fixture, script, mode);

      assertControlledExit(script, run);
      if (script === "fetch-github-profiles.js") {
        assert.equal(run.status, 0, run.output);
        assert.deepEqual(
          run.calls.filter((c) => c.startsWith("FETCH ")),
          [],
          `${script} must skip requests without credentials`,
        );
        assert.match(run.output, /Skipping fetch/);
      } else {
        assert.ok(
          run.calls.some((c) => c.startsWith("FETCH ")),
          `${script} must reach the stubbed request path on a cold cache:\n${run.output}`,
        );
      }
      assert.match(
        run.output,
        /token|error|fail|unavailable|503/i,
        `${script} must report why the data is missing`,
      );
      assert.equal(
        snapshotDir(REAL_DATA_DIR),
        before,
        `${script} must not write into the repository checkout`,
      );
    });
  }
}

for (const [script, output] of Object.entries(WARM_CACHE_OUTPUTS)) {
  test(`${script} skips requests without GITHUB_TOKEN when its cache is fresh`, (t) => {
    const fixture = makeFixture();
    t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
    fs.writeFileSync(path.join(fixture, "static", "data", output), "{}\n");

    const run = runOffline(fixture, script, "reject");

    assertControlledExit(script, run);
    assert.equal(run.status, 0, `${script} must exit 0 on a fresh cache`);
    assert.deepEqual(
      run.calls.filter((c) => c.startsWith("FETCH ")),
      [],
      `${script} must not request anything on a fresh cache`,
    );
    assert.match(run.output, /Skipping fetch/);
  });
}
