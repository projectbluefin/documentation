import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  existsSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// scripts/fetch-registry-data.js is a top-level-await entry script with no
// exports: it fetches the hive registry at build time and bakes the
// projectbluefin entry into static/data/registry-data.json. It is therefore
// exercised as a black box — copied into a throwaway tree that mirrors the
// repo layout (scripts/ next to static/data/) so a test run can never write
// over the checked-in data file, and run with a preload module that replaces
// globalThis.fetch.

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, "fetch-registry-data.js");
const REGISTRY_URL = "https://hive.hivecommons.dev/api/registry";
const DAY_MS = 24 * 60 * 60 * 1000;

const PRELOAD = `
import { writeFileSync } from "node:fs";

globalThis.fetch = async (url) => {
  if (process.env.STUB_URL_LOG) {
    writeFileSync(process.env.STUB_URL_LOG, String(url));
  }
  const mode = process.env.STUB_MODE ?? "ok";
  if (mode === "throw") {
    throw new Error("network unreachable");
  }
  if (mode === "http-error") {
    return { ok: false, status: Number(process.env.STUB_STATUS ?? 500) };
  }
  if (mode === "bad-json") {
    return {
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
    };
  }
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(process.env.STUB_BODY ?? "{}"),
  };
};
`;

/**
 * Build a throwaway tree holding a copy of the script plus the static/data
 * directory it writes into, and return the paths the assertions need.
 */
function makeTree() {
  const root = mkdtempSync(join(tmpdir(), "fetch-registry-data-"));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "static", "data"), { recursive: true });
  const script = join(root, "scripts", "fetch-registry-data.js");
  copyFileSync(SCRIPT, script);
  const preload = join(root, "scripts", "stub-fetch.mjs");
  writeFileSync(preload, PRELOAD);
  return {
    root,
    script,
    preload,
    out: join(root, "static", "data", "registry-data.json"),
    urlLog: join(root, "fetched-url.txt"),
  };
}

function run(tree, { body, mode, status, args = [] } = {}) {
  const env = {
    ...process.env,
    STUB_URL_LOG: tree.urlLog,
    STUB_MODE: mode ?? "ok",
  };
  if (body !== undefined) env.STUB_BODY = JSON.stringify(body);
  if (status !== undefined) env.STUB_STATUS = String(status);
  const result = spawnSync(
    process.execPath,
    ["--import", tree.preload, tree.script, ...args],
    { env, encoding: "utf8" },
  );
  return result;
}

function age(file, ms) {
  const when = (Date.now() - ms) / 1000;
  utimesSync(file, when, when);
}

const ENTRY = {
  org: "projectbluefin",
  acmmLevel: 3,
  governorMode: "advisory",
  agents: 12,
};

const OTHER = {
  org: "someone-else",
  acmmLevel: 1,
  governorMode: "autonomous",
};

test("writes the projectbluefin entry from the registry payload", () => {
  const tree = makeTree();
  const result = run(tree, { body: { hives: [OTHER, ENTRY] } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.urlLog, "utf8"), REGISTRY_URL);
  assert.deepEqual(JSON.parse(readFileSync(tree.out, "utf8")), ENTRY);
  assert.match(result.stdout, /acmmLevel=3/);
  assert.match(result.stdout, /mode=advisory/);
});

test("selects projectbluefin rather than the first hive in the list", () => {
  const tree = makeTree();
  run(tree, { body: { hives: [OTHER, { org: "third" }, ENTRY] } });

  assert.equal(
    JSON.parse(readFileSync(tree.out, "utf8")).org,
    "projectbluefin",
  );
});

test("the written file ends in a newline so it is diff-clean", () => {
  const tree = makeTree();
  run(tree, { body: { hives: [ENTRY] } });

  assert.ok(readFileSync(tree.out, "utf8").endsWith("\n"));
});

test("writes null when the registry has no projectbluefin entry", () => {
  const tree = makeTree();
  const result = run(tree, { body: { hives: [OTHER] } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.out, "utf8"), "null\n");
  assert.match(result.stderr, /no entry for org=projectbluefin/);
});

test("writes null when the payload has no hives key at all", () => {
  const tree = makeTree();
  const result = run(tree, { body: { message: "service starting" } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.out, "utf8"), "null\n");
});

test("a non-ok HTTP response degrades to null without failing the build", () => {
  const tree = makeTree();
  const result = run(tree, { mode: "http-error", status: 503 });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.out, "utf8"), "null\n");
  assert.match(result.stderr, /HTTP 503/);
});

test("a thrown fetch degrades to null without failing the build", () => {
  const tree = makeTree();
  const result = run(tree, { mode: "throw" });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.out, "utf8"), "null\n");
  assert.match(result.stderr, /fetch failed: network unreachable/);
});

test("unparseable JSON degrades to null without failing the build", () => {
  const tree = makeTree();
  const result = run(tree, { mode: "bad-json" });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(tree.out, "utf8"), "null\n");
});

test("a failed fetch keeps stale-but-real data instead of clobbering it", () => {
  const tree = makeTree();
  writeFileSync(tree.out, JSON.stringify(ENTRY, null, 2) + "\n");
  age(tree.out, 3 * DAY_MS);

  const result = run(tree, { mode: "throw" });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(tree.out, "utf8")), ENTRY);
});

test("a fresh cache short-circuits before any network call", () => {
  const tree = makeTree();
  writeFileSync(tree.out, JSON.stringify(ENTRY, null, 2) + "\n");
  age(tree.out, 60 * 60 * 1000);

  const result = run(tree, { body: { hives: [{ org: "projectbluefin" }] } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(tree.urlLog), false, "fetch should not have run");
  assert.match(result.stdout, /cache fresh/);
  assert.deepEqual(JSON.parse(readFileSync(tree.out, "utf8")), ENTRY);
});

test("a cache older than 24h is refetched and overwritten", () => {
  const tree = makeTree();
  writeFileSync(tree.out, JSON.stringify({ org: "stale" }, null, 2) + "\n");
  age(tree.out, DAY_MS + 60 * 1000);

  const result = run(tree, { body: { hives: [ENTRY] } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(tree.urlLog), true, "fetch should have run");
  assert.deepEqual(JSON.parse(readFileSync(tree.out, "utf8")), ENTRY);
});

test("--force refetches even when the cache is fresh", () => {
  const tree = makeTree();
  writeFileSync(tree.out, JSON.stringify({ org: "stale" }, null, 2) + "\n");
  age(tree.out, 60 * 1000);

  const result = run(tree, { body: { hives: [ENTRY] }, args: ["--force"] });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(tree.urlLog), true, "fetch should have run");
  assert.deepEqual(JSON.parse(readFileSync(tree.out, "utf8")), ENTRY);
});

test("package.json wires the script to the fetch-registry-data npm script", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, "..", "package.json"), "utf8"),
  );
  assert.equal(
    pkg.scripts["fetch-registry-data"],
    "node scripts/fetch-registry-data.js",
  );
  // The build-time data pass must actually include it, or the dashboard ships
  // whatever registry-data.json happened to be committed.
  assert.match(
    pkg.scripts["fetch-data:independent"],
    /npm run fetch-registry-data\b/,
  );
});
