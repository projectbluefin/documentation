import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fetch-scorecard.js exports only its pure helpers; main() (the cache check,
// the per-repo fetch loop, the seed-preserving fallbacks and the JSON it
// writes) runs here as a black box. The script and its import are copied into
// a throwaway tree that mirrors the repo layout (scripts/ next to
// static/data/), so a run never touches the checked-in seed, and
// globalThis.fetch is replaced by a preload module that answers from a
// per-test route table.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ["fetch-scorecard.js", "lib/seed-cache.js"];
const API = "https://api.securityscorecards.dev/projects/github.com";
const BLUEFIN = "projectbluefin/bluefin";
const DAKOTA = "projectbluefin/dakota";

const PRELOAD = `
import fs from "node:fs";
const routes = JSON.parse(process.env.STUB_ROUTES || "{}");
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  const ua = (init.headers && init.headers["User-Agent"]) || null;
  fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ url: href, ua }) + "\\n");
  const route = routes[href] ?? { status: 404, body: { error: "not found" } };
  if (route.error) throw new Error(route.error);
  const body = route.raw ?? JSON.stringify(route.body);
  return new Response(body, { status: route.status ?? 200 });
};
`;

const trees = [];
test.after(() => {
  for (const root of trees) fs.rmSync(root, { recursive: true, force: true });
});

function makeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-scorecard-"));
  trees.push(root);
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of FILES) {
    fs.copyFileSync(path.join(HERE, f), path.join(root, "scripts", f));
  }
  const preload = path.join(root, "stub-fetch.mjs");
  fs.writeFileSync(preload, PRELOAD);
  const out = path.join(root, "static", "data", "scorecard-history.json");
  const log = path.join(root, "requests.log");
  fs.writeFileSync(log, "");
  return {
    out,
    seed(value) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(
        out,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    },
    run({ routes = {}, args = [], env = {} } = {}) {
      const childEnv = { ...process.env };
      delete childEnv.SCORECARD_CACHE_HOURS;
      Object.assign(childEnv, env);
      childEnv.STUB_ROUTES = JSON.stringify(routes);
      childEnv.STUB_LOG = log;
      const res = spawnSync(
        process.execPath,
        [
          "--import",
          preload,
          path.join(root, "scripts", "fetch-scorecard.js"),
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

function scorecard(date, score, checks = []) {
  return { date, score, checks };
}

function happyRoutes() {
  return {
    [`${API}/${BLUEFIN}`]: {
      body: scorecard("2026-10-02", 6.1, [
        { name: "Code-Review", score: 3, reason: "some reviews", details: [] },
        { name: "CII-Best-Practices", score: -1, reason: "n/a" },
      ]),
    },
    [`${API}/${DAKOTA}`]: {
      body: scorecard("2026-10-02", 4.2, [{ name: "Maintained", score: 10 }]),
    },
  };
}

function priorSeed(generatedAt = "2020-01-01T00:00:00.000Z") {
  return {
    generatedAt,
    repos: [
      {
        repo: BLUEFIN,
        current: null,
        history: [{ date: "2026-10-01", score: 5.9 }],
        unavailable: false,
        stateReason: null,
      },
      {
        repo: DAKOTA,
        current: null,
        history: [
          { date: "2026-09-30", score: 3.8 },
          { date: "2026-10-01", score: 4.0 },
        ],
        unavailable: false,
        stateReason: null,
      },
    ],
  };
}

const byRepo = (payload, repo) => payload.repos.find((r) => r.repo === repo);

test("first run with no seed fetches every repo and writes the payload", () => {
  const tree = makeTree();
  const res = tree.run({ routes: happyRoutes() });

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(res.requests.map((r) => r.url).sort(), [
    `${API}/${BLUEFIN}`,
    `${API}/${DAKOTA}`,
  ]);
  for (const r of res.requests) {
    assert.equal(r.ua, "bluefin-docs/fetch-scorecard");
  }

  const payload = tree.payload();
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.equal(payload.source, `${API}/{repo}`);
  assert.ok(Number.isFinite(Date.parse(payload.generatedAt)));
  assert.deepEqual(
    payload.repos.map((r) => r.repo),
    [BLUEFIN, DAKOTA],
  );

  const bluefin = byRepo(payload, BLUEFIN);
  assert.equal(bluefin.unavailable, false);
  assert.equal(bluefin.current.score, 6.1);
  assert.deepEqual(bluefin.current.checks, [
    { name: "Code-Review", score: 3, reason: "some reviews" },
    { name: "CII-Best-Practices", score: null, reason: "n/a" },
  ]);
  assert.deepEqual(bluefin.history, [{ date: "2026-10-02", score: 6.1 }]);
  assert.deepEqual(byRepo(payload, DAKOTA).current.checks, [
    { name: "Maintained", score: 10, reason: null },
  ]);
  assert.match(res.stdout, /projectbluefin\/bluefin score=6\.1 checks=2/);
  assert.match(res.stdout, /fetch-scorecard: wrote /);
});

test("a stale seed's history is extended, not replaced", () => {
  const tree = makeTree();
  tree.seed(priorSeed());
  const res = tree.run({ routes: happyRoutes() });

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 2);
  const payload = tree.payload();
  assert.deepEqual(byRepo(payload, BLUEFIN).history, [
    { date: "2026-10-01", score: 5.9 },
    { date: "2026-10-02", score: 6.1 },
  ]);
  assert.deepEqual(byRepo(payload, DAKOTA).history, [
    { date: "2026-09-30", score: 3.8 },
    { date: "2026-10-01", score: 4.0 },
    { date: "2026-10-02", score: 4.2 },
  ]);
  assert.notEqual(payload.generatedAt, "2020-01-01T00:00:00.000Z");
});

test("one repo failing is marked unavailable and keeps its prior history", () => {
  const tree = makeTree();
  tree.seed(priorSeed());
  const routes = happyRoutes();
  routes[`${API}/${DAKOTA}`] = { status: 404, body: { error: "nope" } };
  const res = tree.run({ routes });

  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /projectbluefin\/dakota unavailable — HTTP 404/);
  const payload = tree.payload();
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);

  const dakota = byRepo(payload, DAKOTA);
  assert.equal(dakota.unavailable, true);
  assert.equal(dakota.current, null);
  assert.equal(dakota.stateReason, `HTTP 404 for ${DAKOTA}`);
  assert.deepEqual(dakota.history, priorSeed().repos[1].history);

  const bluefin = byRepo(payload, BLUEFIN);
  assert.equal(bluefin.unavailable, false);
  assert.equal(bluefin.history.length, 2);
});

test("a malformed JSON body is a per-repo failure, not a crash", () => {
  const tree = makeTree();
  const routes = happyRoutes();
  routes[`${API}/${BLUEFIN}`] = { raw: "<html>gateway</html>" };
  const res = tree.run({ routes });

  assert.equal(res.status, 0, res.stderr);
  const payload = tree.payload();
  const bluefin = byRepo(payload, BLUEFIN);
  assert.equal(bluefin.unavailable, true);
  assert.deepEqual(bluefin.history, []);
  assert.equal(byRepo(payload, DAKOTA).unavailable, false);
  assert.equal(payload.unavailable, false);
});

test("every repo failing sets the top-level flag and still preserves history", () => {
  const tree = makeTree();
  tree.seed(priorSeed());
  const res = tree.run({
    routes: {
      [`${API}/${BLUEFIN}`]: { error: "getaddrinfo ENOTFOUND" },
      [`${API}/${DAKOTA}`]: { status: 503, body: {} },
    },
  });

  assert.equal(res.status, 0, res.stderr);
  const payload = tree.payload();
  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "getaddrinfo ENOTFOUND");
  assert.ok(payload.repos.every((r) => r.unavailable));
  assert.deepEqual(
    byRepo(payload, BLUEFIN).history,
    priorSeed().repos[0].history,
  );
  assert.equal(byRepo(payload, DAKOTA).stateReason, `HTTP 503 for ${DAKOTA}`);
  assert.deepEqual(
    byRepo(payload, DAKOTA).history,
    priorSeed().repos[1].history,
  );
  assert.doesNotMatch(res.stdout, /score=/);
});

test("a fresh seed is left untouched and nothing is fetched", () => {
  const tree = makeTree();
  const seed = priorSeed(new Date(Date.now() - 30 * 60000).toISOString());
  tree.seed(seed);
  const before = fs.readFileSync(tree.out, "utf8");
  const res = tree.run({ routes: happyRoutes() });

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 0);
  assert.match(res.stdout, /seed generated 30m ago, skipping/);
  assert.equal(fs.readFileSync(tree.out, "utf8"), before);
});

test("--force refetches even when the seed is fresh", () => {
  const tree = makeTree();
  tree.seed(priorSeed(new Date().toISOString()));
  const res = tree.run({ routes: happyRoutes(), args: ["--force"] });

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 2);
  assert.equal(byRepo(tree.payload(), BLUEFIN).history.length, 2);
});

test("SCORECARD_CACHE_HOURS shortens the TTL", () => {
  const tree = makeTree();
  tree.seed(priorSeed(new Date(Date.now() - 2 * 3_600_000).toISOString()));

  const skipped = tree.run({ routes: happyRoutes() });
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.equal(skipped.requests.length, 0);

  const refetched = tree.run({
    routes: happyRoutes(),
    env: { SCORECARD_CACHE_HOURS: "1" },
  });
  assert.equal(refetched.status, 0, refetched.stderr);
  assert.equal(refetched.requests.length, 2);
});

test("a corrupted seed is treated as stale and replaced with a valid payload", () => {
  const tree = makeTree();
  tree.seed("{ not json");
  const res = tree.run({ routes: happyRoutes() });

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 2);
  const payload = tree.payload();
  assert.equal(payload.unavailable, false);
  assert.deepEqual(byRepo(payload, BLUEFIN).history, [
    { date: "2026-10-02", score: 6.1 },
  ]);
});
