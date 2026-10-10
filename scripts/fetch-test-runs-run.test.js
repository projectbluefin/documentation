import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fetch-test-runs.js exports only its pure helpers; fetchSuites() and main()
// (the GitHub fetch loop, the cache check and the JSON it writes) run here as a
// black box. The script and its imports are copied into a throwaway tree that
// mirrors the repo layout (scripts/ next to static/data/), so a run never
// touches the checked-in data, and globalThis.fetch is replaced by a preload
// module that answers from a per-test route table.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  "fetch-test-runs.js",
  "fetch-factory-stats.js",
  "lib/gh.js",
  "lib/request-queue.js",
];
const API = "https://api.github.com";
const TOKEN = "stub-token-for-tests";

const PRELOAD = `
import fs from "node:fs";
const routes = JSON.parse(process.env.STUB_ROUTES || "{}");
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  const key = href.split("?")[0];
  const auth = (init.headers && init.headers.authorization) || null;
  fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ url: href, auth }) + "\\n");
  const route = routes[key] ?? { status: 404, body: { message: "Not Found" } };
  if (route.error) throw new Error(route.error);
  return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
};
`;

const trees = [];
test.after(() => {
  for (const root of trees) fs.rmSync(root, { recursive: true, force: true });
});

function makeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-test-runs-"));
  trees.push(root);
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of FILES) {
    fs.copyFileSync(path.join(HERE, f), path.join(root, "scripts", f));
  }
  const preload = path.join(root, "stub-fetch.mjs");
  fs.writeFileSync(preload, PRELOAD);
  const out = path.join(root, "static", "data", "test-runs.json");
  const log = path.join(root, "requests.log");
  fs.writeFileSync(log, "");
  return {
    out,
    run({ routes = {}, token = TOKEN, args = [], env = {} } = {}) {
      const childEnv = { ...process.env, ...env };
      delete childEnv.GITHUB_TOKEN;
      delete childEnv.GH_TOKEN;
      delete childEnv.TEST_RUNS_CACHE_HOURS;
      Object.assign(childEnv, env);
      if (token) childEnv.GITHUB_TOKEN = token;
      childEnv.STUB_ROUTES = JSON.stringify(routes);
      childEnv.STUB_LOG = log;
      const res = spawnSync(
        process.execPath,
        [
          "--import",
          preload,
          path.join(root, "scripts", "fetch-test-runs.js"),
          ...args,
        ],
        { env: childEnv, encoding: "utf8", timeout: 30000 },
      );
      const requests = fs
        .readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      fs.writeFileSync(log, "");
      return { ...res, requests };
    },
    payload() {
      return JSON.parse(fs.readFileSync(out, "utf8"));
    },
  };
}

const iso = (daysAgo, minutes = 0) =>
  new Date(Date.now() - daysAgo * 86400000 + minutes * 60000).toISOString();

function run(id, { status = "completed", conclusion, daysAgo, minutes = 10 }) {
  return {
    id,
    status,
    conclusion: conclusion ?? null,
    run_started_at: iso(daysAgo),
    updated_at: iso(daysAgo, minutes),
    html_url: `https://github.com/x/actions/runs/${id}`,
  };
}

function happyRoutes() {
  return {
    [`${API}/repos/projectbluefin/bluefin/actions/workflows`]: {
      body: {
        workflows: [
          { id: 11, path: ".github/workflows/e2e.yml" },
          { id: 12, path: ".github/workflows/build-image-testing.yml" },
          { id: 13, path: ".github/workflows/pages.yml" },
        ],
      },
    },
    [`${API}/repos/projectbluefin/dakota/actions/workflows`]: {
      status: 500,
      body: { message: "boom" },
    },
    [`${API}/repos/projectbluefin/testsuite/actions/workflows`]: {
      body: { workflows: [{ id: 31, path: ".github/workflows/pytest.yml" }] },
    },
    // Out of order on purpose: the script sorts by start time.
    [`${API}/repos/projectbluefin/bluefin/actions/workflows/11/runs`]: {
      body: {
        workflow_runs: [
          run(103, { status: "in_progress", daysAgo: 1 }),
          run(101, { conclusion: "success", daysAgo: 3, minutes: 12 }),
          run(102, { conclusion: "failure", daysAgo: 2 }),
          { id: 104, status: "completed", conclusion: "success" },
        ],
      },
    },
    [`${API}/repos/projectbluefin/testsuite/actions/workflows/31/runs`]: {
      status: 502,
      body: { message: "bad gateway" },
    },
  };
}

test("no token writes an explicit unavailable payload and makes no request", () => {
  const tree = makeTree();
  const res = tree.run({ token: null });
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(res.requests, []);
  const p = tree.payload();
  assert.equal(p.unavailable, true);
  assert.deepEqual(p.suites, []);
  assert.equal(p.windowDays, 30);
  assert.match(p.stateReason, /No GITHUB_TOKEN or GH_TOKEN/);
});

test("fetches test workflows, skips failed repos and reports every suite", () => {
  const tree = makeTree();
  const routes = happyRoutes();
  const res = tree.run({ routes });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /projectbluefin\/dakota workflows unavailable/);
  assert.match(res.stderr, /testsuite\/pytest\.yml runs unavailable/);

  const p = tree.payload();
  assert.equal(p.unavailable, false);
  assert.equal(p.stateReason, null);
  assert.equal(p.windowDays, 30);
  assert.deepEqual(
    p.suites.map((s) => s.id),
    ["testsuite/pytest.yml", "bluefin/e2e.yml"],
    "a suite with no terminal run ranks as maximally stale; build/publish and non-test workflows are excluded",
  );

  const [pytest, e2e] = p.suites;
  assert.equal(e2e.repo, "projectbluefin/bluefin");
  assert.equal(e2e.workflow, "e2e.yml");
  assert.equal(e2e.label, "bluefin · e2e");
  assert.deepEqual(
    e2e.runs.map((r) => r.status),
    ["passed", "failed", "running"],
    "runs are sorted oldest first and a run with no timestamp is dropped",
  );
  assert.deepEqual(
    e2e.runs.map((r) => r.durationMin),
    [12, 10, null],
  );
  assert.equal(e2e.runs[0].url, "https://github.com/x/actions/runs/101");
  for (const r of e2e.runs) {
    assert.equal(typeof r.t, "number");
    assert.ok(!("isoTime" in r), "isoTime is internal and must not be written");
  }
  assert.equal(e2e.passRate, 0.5);
  assert.equal(e2e.flips, 1);
  assert.equal(e2e.consecutiveFailures, 1);
  const failedRun = routes[
    `${API}/repos/projectbluefin/bluefin/actions/workflows/11/runs`
  ].body.workflow_runs.find((r) => r.id === 102);
  assert.equal(e2e.lastTerminalAt, failedRun.run_started_at);
  assert.equal(e2e.unavailable, false);

  assert.deepEqual(
    pytest.runs,
    [],
    "a suite whose runs failed is still reported",
  );
  assert.equal(pytest.passRate, null);
  assert.ok(pytest.triageRank > e2e.triageRank);

  const runsReq = res.requests.find((r) =>
    r.url.includes("/workflows/11/runs"),
  );
  assert.ok(runsReq, "runs for the e2e workflow were requested");
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  assert.ok(
    runsReq.url.includes(`created=${encodeURIComponent(`>=${since}`)}`),
    `runs request ${runsReq.url} is not bounded to the 30-day window`,
  );
  assert.match(runsReq.url, /per_page=100&page=1$/);
  assert.ok(
    !res.requests.some((r) => /\/workflows\/1[23]\/runs/.test(r.url)),
    "runs were fetched for a non-test workflow",
  );
  for (const r of res.requests) {
    assert.ok(r.auth && r.auth.includes(TOKEN), `${r.url} sent no token`);
  }
});

test("a fresh cache is kept without a request; --force and an expired TTL refetch", () => {
  const tree = makeTree();
  fs.mkdirSync(path.dirname(tree.out), { recursive: true });
  fs.writeFileSync(tree.out, '{"sentinel":true}\n');

  const fresh = tree.run({ routes: happyRoutes() });
  assert.equal(fresh.status, 0, fresh.stderr);
  assert.match(fresh.stdout, /cache fresh/);
  assert.deepEqual(fresh.requests, []);
  assert.deepEqual(tree.payload(), { sentinel: true });

  const forced = tree.run({ routes: happyRoutes(), args: ["--force"] });
  assert.equal(forced.status, 0, forced.stderr);
  assert.ok(forced.requests.length > 0);
  assert.equal(tree.payload().suites.length, 2);

  fs.writeFileSync(tree.out, '{"sentinel":true}\n');
  const expired = tree.run({
    routes: happyRoutes(),
    env: { TEST_RUNS_CACHE_HOURS: "0" },
  });
  assert.equal(expired.status, 0, expired.stderr);
  assert.ok(expired.requests.length > 0);
  assert.equal(tree.payload().suites.length, 2);
});

test("an unexpected error still writes an unavailable payload and exits 0", () => {
  const tree = makeTree();
  const routes = happyRoutes();
  routes[`${API}/repos/projectbluefin/bluefin/actions/workflows`] = {
    body: { workflows: "not-a-list" },
  };
  const res = tree.run({ routes });
  assert.equal(res.status, 0, res.stderr);
  const p = tree.payload();
  assert.equal(p.unavailable, true);
  assert.deepEqual(p.suites, []);
  assert.match(p.stateReason, /^Test run data could not be generated: /);
});

test(
  "every repo failing is reported as unavailable, not as an empty success",
  {
    todo: "fetch-test-runs.js writes unavailable:false with zero suites when every workflow list fails (e.g. a revoked token)",
  },
  () => {
    const tree = makeTree();
    const routes = {};
    for (const repo of ["bluefin", "dakota", "testsuite"]) {
      routes[`${API}/repos/projectbluefin/${repo}/actions/workflows`] = {
        status: 401,
        body: { message: "Bad credentials" },
      };
    }
    const res = tree.run({ routes });
    assert.equal(res.status, 0, res.stderr);
    const p = tree.payload();
    assert.deepEqual(p.suites, []);
    assert.equal(p.unavailable, true);
    assert.ok(p.stateReason);
  },
);
