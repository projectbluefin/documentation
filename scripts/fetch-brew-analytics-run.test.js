import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fetch-brew-analytics.js exports only its pure helpers; main() (the cache
// check, the three-window fetch, the per-window degradation and the JSON it
// writes) runs here as a black box. The script is copied into a throwaway
// tree that mirrors the repo layout (scripts/ next to static/data/), so a run
// never touches the real static/data, and globalThis.fetch is replaced by a
// preload module that answers from a per-test route table.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = "https://formulae.brew.sh/api/analytics/os-version";
const URL_30 = `${API}/30d.json`;
const URL_90 = `${API}/90d.json`;
const URL_365 = `${API}/365d.json`;

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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-brew-analytics-"));
  trees.push(root);
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(HERE, "fetch-brew-analytics.js"),
    path.join(root, "scripts", "fetch-brew-analytics.js"),
  );
  const preload = path.join(root, "stub-fetch.mjs");
  fs.writeFileSync(preload, PRELOAD);
  const out = path.join(root, "static", "data", "brew-analytics.json");
  const log = path.join(root, "requests.log");
  fs.writeFileSync(log, "");
  return {
    out,
    seed(value, mtime) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(value));
      if (mtime) fs.utimesSync(out, mtime, mtime);
    },
    run({ routes = {}, args = [], env = {} } = {}) {
      const childEnv = { ...process.env };
      delete childEnv.BREW_CACHE_HOURS;
      Object.assign(childEnv, env);
      childEnv.STUB_ROUTES = JSON.stringify(routes);
      childEnv.STUB_LOG = log;
      const res = spawnSync(
        process.execPath,
        [
          "--import",
          preload,
          path.join(root, "scripts", "fetch-brew-analytics.js"),
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

function windowBody(bluefinRank, bluefinCount) {
  return {
    start_date: "2026-10-01",
    end_date: "2026-10-31",
    total_count: "281,000,000",
    total_items: 412,
    items: [
      {
        number: 1,
        os_version: "macOS Tahoe (26)",
        count: "9,576,217",
        percent: "3.40",
      },
      {
        number: bluefinRank,
        os_version: "Bluefin",
        count: bluefinCount,
        percent: "0.48",
      },
      {
        number: 18,
        os_version: "Fedora Linux 43",
        count: "658,337",
        percent: "0.23",
      },
      {
        number: 40,
        os_version: "Blueflower",
        count: "100",
        percent: "0.01",
      },
    ],
  };
}

function happyRoutes() {
  return {
    [URL_30]: { body: windowBody(11, "1,348,288") },
    [URL_90]: { body: windowBody(12, "3,900,000") },
    [URL_365]: { body: windowBody(14, "12,000,000") },
  };
}

const STALE = new Date("2020-01-01T00:00:00Z");

test("main fetches all three windows and writes Bluefin rank, count and peers", () => {
  const tree = makeTree();
  const res = tree.run({ routes: happyRoutes() });
  assert.equal(res.status, 0, res.stderr);

  assert.deepEqual(res.requests.map((r) => r.url).sort(), [
    URL_30,
    URL_365,
    URL_90,
  ]);
  for (const r of res.requests) {
    assert.equal(r.ua, "bluefin-docs/fetch-brew-analytics");
  }

  const p = tree.payload();
  assert.equal(p.unavailable, false);
  assert.equal(p.stateReason, null);
  assert.equal(p.source, `${API}/{window}.json`);
  assert.ok(!Number.isNaN(Date.parse(p.generatedAt)));
  assert.deepEqual(Object.keys(p.windows).sort(), ["30d", "365d", "90d"]);

  const w30 = p.windows["30d"];
  assert.equal(w30.unavailable, false);
  assert.equal(w30.startDate, "2026-10-01");
  assert.equal(w30.totalCount, 281000000);
  assert.equal(w30.trackedItems, 412);
  assert.deepEqual(
    w30.rows.map((r) => [r.id, r.rank, r.count]),
    [["bluefin", 11, 1348288]],
  );
  assert.deepEqual(
    w30.peers.map((r) => r.id),
    ["macos-tahoe-26", "fedora-linux-43"],
  );
  assert.equal(p.windows["365d"].rows[0].rank, 14);
  assert.match(res.stdout, /30d — 1 Bluefin rows, rank 11, count 1348288/);
});

test("main marks only the failing window unavailable and keeps the others", () => {
  const tree = makeTree();
  const routes = happyRoutes();
  routes[URL_90] = { status: 503, body: { error: "busy" } };
  const res = tree.run({ routes });
  assert.equal(res.status, 0, res.stderr);

  const p = tree.payload();
  assert.equal(p.unavailable, false);
  assert.equal(p.stateReason, null);
  assert.equal(p.windows["30d"].unavailable, false);
  assert.equal(p.windows["365d"].unavailable, false);

  const w90 = p.windows["90d"];
  assert.equal(w90.unavailable, true);
  assert.match(w90.stateReason, /^Homebrew analytics 90d unavailable: /);
  assert.match(w90.stateReason, /HTTP 503/);
  assert.deepEqual(w90.rows, []);
  assert.deepEqual(w90.peers, []);
  assert.equal(w90.totalCount, null);
  assert.match(res.stderr, /90d unavailable — HTTP 503/);
});

test("main treats an unparseable body as an unavailable window", () => {
  const tree = makeTree();
  const routes = happyRoutes();
  routes[URL_30] = { raw: "<html>rate limited</html>" };
  const res = tree.run({ routes });
  assert.equal(res.status, 0, res.stderr);

  const p = tree.payload();
  assert.equal(p.windows["30d"].unavailable, true);
  assert.match(p.windows["30d"].stateReason, /^Homebrew analytics 30d/);
  assert.equal(p.windows["90d"].unavailable, false);
  assert.equal(p.unavailable, false);
});

test("main writes a top-level unavailable payload, not an empty file, when every window fails", () => {
  const tree = makeTree();
  const res = tree.run({
    routes: {
      [URL_30]: { error: "getaddrinfo ENOTFOUND formulae.brew.sh" },
      [URL_90]: { status: 500, body: {} },
    },
  });
  assert.equal(res.status, 0, res.stderr);

  const p = tree.payload();
  assert.equal(p.unavailable, true);
  assert.equal(p.stateReason, "All Homebrew analytics windows unavailable");
  for (const w of ["30d", "90d", "365d"]) {
    assert.equal(p.windows[w].unavailable, true, w);
    assert.deepEqual(p.windows[w].rows, [], w);
  }
  assert.match(p.windows["30d"].stateReason, /ENOTFOUND/);
  assert.match(p.windows["90d"].stateReason, /HTTP 500/);
  assert.match(p.windows["365d"].stateReason, /HTTP 404/);
  assert.equal(res.stdout.includes("Bluefin rows"), false);
});

test("main skips the network when the cached file is fresh", () => {
  const tree = makeTree();
  const cached = { generatedAt: "cached", windows: {}, unavailable: false };
  tree.seed(cached);
  const res = tree.run({ routes: happyRoutes() });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 0);
  assert.match(res.stdout, /cache fresh/);
  assert.deepEqual(tree.payload(), cached);
});

test("--force refetches even when the cached file is fresh", () => {
  const tree = makeTree();
  tree.seed({ generatedAt: "cached", windows: {}, unavailable: false });
  const res = tree.run({ routes: happyRoutes(), args: ["--force"] });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 3);
  assert.notEqual(tree.payload().generatedAt, "cached");
});

test("a cached file older than the TTL is refetched; BREW_CACHE_HOURS widens the TTL", () => {
  const stale = makeTree();
  stale.seed({ generatedAt: "cached" }, STALE);
  const res = stale.run({ routes: happyRoutes() });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.requests.length, 3);
  assert.equal(stale.payload().windows["30d"].rows[0].rank, 11);

  const widened = makeTree();
  widened.seed({ generatedAt: "cached" }, STALE);
  const res2 = widened.run({
    routes: happyRoutes(),
    env: { BREW_CACHE_HOURS: String(24 * 365 * 100) },
  });
  assert.equal(res2.status, 0, res2.stderr);
  assert.equal(res2.requests.length, 0);
  assert.equal(widened.payload().generatedAt, "cached");
});
