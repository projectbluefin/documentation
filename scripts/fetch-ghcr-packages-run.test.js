import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fetch-ghcr-packages.js exports only its pure helpers; main() (the cache
// check, the Packages API loop, the anonymous-registry fallback CI depends on
// and the JSON it writes) runs here as a black box. The script and its imports
// are copied into a throwaway tree that mirrors the repo layout (scripts/ next
// to static/data/), so a run never touches the real output. globalThis.fetch is
// replaced by a preload module answering from a per-test route table, and a
// fake `skopeo` first on PATH answers from a per-test registry table, so no run
// ever reaches the network or a real skopeo.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  "fetch-ghcr-packages.js",
  "fetch-factory-stats.js",
  "lib/gh.js",
  "lib/request-queue.js",
];
const API = "https://api.github.com/orgs/projectbluefin/packages";

const PRELOAD = `
import fs from "node:fs";
const routes = JSON.parse(process.env.STUB_ROUTES || "{}");
globalThis.fetch = async (url) => {
  const href = String(url);
  fs.appendFileSync(process.env.STUB_LOG, JSON.stringify({ url: href }) + "\\n");
  const route = routes[href] ?? { status: 404, body: { message: "Not Found" } };
  return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
};
`;

// Registry table: { <lane>: { tags: [...], inspect: { <tag>: {Created, Digest} | "fail" } } }.
// A lane missing from the table fails list-tags, as an unknown image does.
const FAKE_SKOPEO = `
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.SKOPEO_LOG, JSON.stringify(args) + "\\n");
const lanes = JSON.parse(process.env.STUB_REGISTRY || "{}");
const ref = args[args.length - 1].replace("docker://ghcr.io/projectbluefin/", "");
if (args[0] === "list-tags") {
  const lane = lanes[ref];
  if (!lane) { console.error("manifest unknown"); process.exit(1); }
  process.stdout.write(JSON.stringify({ Repository: ref, Tags: lane.tags }));
} else if (args[0] === "inspect") {
  const [name, tag] = ref.split(":");
  const info = lanes[name]?.inspect?.[tag];
  if (!info || info === "fail") { console.error("inspect failed"); process.exit(1); }
  process.stdout.write(JSON.stringify(info));
} else {
  process.exit(2);
}
`;

const trees = [];
test.after(() => {
  for (const root of trees) fs.rmSync(root, { recursive: true, force: true });
});

function readLines(file) {
  const lines = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  fs.writeFileSync(file, "");
  return lines;
}

function makeTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-ghcr-packages-"));
  trees.push(root);
  fs.mkdirSync(path.join(root, "scripts", "lib"), { recursive: true });
  for (const f of FILES) {
    fs.copyFileSync(path.join(HERE, f), path.join(root, "scripts", f));
  }
  const preload = path.join(root, "stub-fetch.mjs");
  fs.writeFileSync(preload, PRELOAD);
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  const skopeo = path.join(bin, "skopeo");
  fs.writeFileSync(skopeo, `#!${process.execPath}\n${FAKE_SKOPEO}`);
  fs.chmodSync(skopeo, 0o755);
  const out = path.join(root, "static", "data", "ghcr-packages.json");
  const fetchLog = path.join(root, "requests.log");
  const skopeoLog = path.join(root, "skopeo.log");
  fs.writeFileSync(fetchLog, "");
  fs.writeFileSync(skopeoLog, "");
  return {
    out,
    seed(value) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(value));
    },
    run({ routes = {}, registry = {}, args = [], token = null } = {}) {
      const env = { ...process.env };
      delete env.GITHUB_TOKEN;
      delete env.GH_TOKEN;
      delete env.GHCR_CACHE_HOURS;
      if (token) env.GITHUB_TOKEN = token;
      env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;
      env.STUB_ROUTES = JSON.stringify(routes);
      env.STUB_LOG = fetchLog;
      env.STUB_REGISTRY = JSON.stringify(registry);
      env.SKOPEO_LOG = skopeoLog;
      const res = spawnSync(
        process.execPath,
        [
          "--import",
          preload,
          path.join(root, "scripts", "fetch-ghcr-packages.js"),
          ...args,
        ],
        { env, encoding: "utf8", timeout: 30000 },
      );
      return {
        ...res,
        requests: readLines(fetchLog),
        skopeoCalls: readLines(skopeoLog),
      };
    },
    payload() {
      return JSON.parse(fs.readFileSync(out, "utf8"));
    },
  };
}

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const byName = (payload, name) => payload.packages.find((p) => p.name === name);

test("without a token, reads the reported lanes anonymously from the registry", () => {
  const tree = makeTree();
  const res = tree.run({
    registry: {
      bluefin: {
        tags: [
          "stable",
          "testing",
          "sha256-abc.sig",
          "stable-20260720",
          "pr-12",
        ],
        inspect: {
          stable: { Digest: "sha256:s", Created: daysAgo(1) },
          testing: { Digest: "sha256:t", Created: daysAgo(2) },
        },
      },
    },
  });

  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /falling back to anonymous registry reads/);
  assert.equal(res.requests.length, 0, "no token means no Packages API call");

  const inspected = res.skopeoCalls
    .filter((a) => a[0] === "inspect")
    .map((a) => a.at(-1))
    .sort();
  assert.deepEqual(inspected, [
    "docker://ghcr.io/projectbluefin/bluefin:stable",
    "docker://ghcr.io/projectbluefin/bluefin:testing",
  ]);

  const payload = tree.payload();
  assert.equal(payload.source, "public-registry");
  assert.equal(payload.unavailable, false);
  assert.equal(payload.stateReason, null);
  assert.deepEqual(
    payload.packages.map((p) => p.name),
    ["bluefin"],
    "lanes whose list-tags fails are dropped, not reported empty",
  );
  const bluefin = byName(payload, "bluefin");
  assert.equal(bluefin.family, "os");
  assert.equal(bluefin.versionCount, 2);
  assert.deepEqual(
    bluefin.streams.map((s) => [s.tag, s.state]),
    [
      ["stable", "fresh"],
      ["testing", "fresh"],
    ],
  );
  assert.deepEqual(payload.familyCounts, { os: 1 });
});

test("a tag that cannot be inspected is a gap in the lane, not a lost lane", () => {
  const tree = makeTree();
  const res = tree.run({
    registry: {
      dakota: {
        tags: ["stable", "testing", "latest"],
        inspect: {
          stable: { Digest: "sha256:s", Created: daysAgo(3) },
          testing: "fail",
          latest: { Digest: "sha256:l" },
        },
      },
    },
  });

  assert.equal(res.status, 0, res.stderr);
  const dakota = byName(tree.payload(), "dakota");
  assert.ok(dakota, "dakota lane is still reported");
  assert.equal(dakota.versionCount, 1);
  assert.deepEqual(
    dakota.streams.map((s) => s.tag),
    ["stable"],
  );
});

test("when neither source answers, writes an explicit unavailable payload and exits 0", () => {
  const tree = makeTree();
  const res = tree.run({ registry: {} });

  assert.equal(res.status, 0, res.stderr);
  const payload = tree.payload();
  assert.equal(payload.unavailable, true);
  assert.match(payload.stateReason, /Neither the GitHub Packages API/);
  assert.deepEqual(payload.packages, []);
  assert.equal(payload.source, "public-registry");
});

test("with a token, the Packages API is the source and the registry is never read", () => {
  const tree = makeTree();
  const res = tree.run({
    token: "test-token",
    routes: {
      [`${API}?package_type=container&per_page=100&page=1`]: {
        body: [
          { name: "bluefin" },
          { name: "bluefin-cache" },
          { name: "brew" },
        ],
      },
      [`${API}/container/bluefin/versions?per_page=100&page=1`]: {
        body: [
          {
            name: "sha256:a",
            created_at: daysAgo(1),
            metadata: { container: { tags: ["stable", "sha256-a.sig"] } },
          },
          {
            name: "sha256:b",
            created_at: daysAgo(3),
            metadata: { container: { tags: ["testing-20260808"] } },
          },
        ],
      },
      [`${API}/container/bluefin-cache/versions?per_page=100&page=1`]: {
        body: [],
      },
      [`${API}/container/brew/versions?per_page=100&page=1`]: {
        status: 500,
        body: { message: "boom" },
      },
    },
  });

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.skopeoCalls.length, 0);

  const payload = tree.payload();
  assert.equal(payload.source, "github-packages-api");
  assert.equal(payload.unavailable, false);
  assert.deepEqual(payload.familyCounts, {
    os: 1,
    internal: 1,
    userspace: 1,
  });
  assert.deepEqual(
    byName(payload, "bluefin").streams.map((s) => s.tag),
    ["stable", "testing"],
  );

  const brew = byName(payload, "brew");
  assert.deepEqual(brew.streams, []);
  assert.equal(brew.versionCount, 0);
  assert.match(brew.stateReason, /^Versions unavailable: GET .* -> 500/);
  assert.match(res.stderr, /versions for brew unavailable/);
});

test("a token without package scope falls back to the registry", () => {
  const tree = makeTree();
  const res = tree.run({
    token: "repo-scoped-token",
    routes: {
      [`${API}?package_type=container&per_page=100&page=1`]: {
        status: 403,
        body: { message: "Resource not accessible by integration" },
      },
    },
    registry: {
      brew: {
        tags: ["latest"],
        inspect: { latest: { Digest: "sha256:b", Created: daysAgo(0) } },
      },
    },
  });

  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /package list unavailable .* 403/);
  const payload = tree.payload();
  assert.equal(payload.source, "public-registry");
  assert.deepEqual(
    payload.packages.map((p) => [p.name, p.family]),
    [["brew", "userspace"]],
  );
});

test("a fresh cached file is kept unless --force is given", () => {
  const tree = makeTree();
  const cached = { generatedAt: "cached", packages: [] };
  tree.seed(cached);
  const registry = {
    bluefin: {
      tags: ["stable"],
      inspect: { stable: { Digest: "sha256:s", Created: daysAgo(1) } },
    },
  };

  const skipped = tree.run({ registry });
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.match(skipped.stdout, /cache fresh/);
  assert.equal(skipped.skopeoCalls.length, 0);
  assert.deepEqual(tree.payload(), cached);

  const forced = tree.run({ registry, args: ["--force"] });
  assert.equal(forced.status, 0, forced.stderr);
  assert.deepEqual(
    tree.payload().packages.map((p) => p.name),
    ["bluefin"],
  );
});
