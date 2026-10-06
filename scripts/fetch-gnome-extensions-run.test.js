const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// fetch-gnome-extensions.js only exports its pure helpers; the fetch loop,
// screenshot download/redirect handling and the JSON it writes all live in
// main(). That path is exercised here as a black box: the script is copied into
// a throwaway tree mirroring the repo layout (scripts/ next to static/), so a
// run can never touch the checked-in data or images, and https.get is replaced
// by a preload module that answers from a per-test route table.

const SCRIPT = path.join(__dirname, "fetch-gnome-extensions.js");
const EXTENSION_IDS = (() => {
  const src = fs.readFileSync(SCRIPT, "utf8");
  const block = src.match(/const EXTENSION_IDS = \[([\s\S]*?)\];/);
  assert.ok(
    block,
    "EXTENSION_IDS literal not found in fetch-gnome-extensions.js",
  );
  return [...block[1].matchAll(/^\s*(\d+),/gm)].map((m) => Number(m[1]));
})();
const BASE = "https://extensions.gnome.org";
const infoUrl = (pk) => `${BASE}/extension-info/?pk=${pk}`;
const shotPath = (pk) => `/extension-data/screenshots/screenshot_${pk}.png`;
const PNG_BYTES = "fake-png-bytes";

const PRELOAD = `
const https = require("node:https");
const fs = require("node:fs");
const { EventEmitter } = require("node:events");
const { Readable } = require("node:stream");

const routes = JSON.parse(process.env.STUB_ROUTES || "{}");
const fallback = JSON.parse(process.env.STUB_DEFAULT || '{"status":404,"body":""}');

https.get = (url, cb) => {
  const href = String(url);
  if (process.env.STUB_URL_LOG) fs.appendFileSync(process.env.STUB_URL_LOG, href + "\\n");
  const route = routes[href] || fallback;
  const req = new EventEmitter();
  let closed = false;
  const close = () => { if (!closed) { closed = true; req.emit("close"); } };
  req.destroy = (err) => { if (err) req.emit("error", err); close(); };
  setImmediate(() => {
    if (route.error) {
      req.emit("error", new Error(route.error));
      close();
      return;
    }
    const res = Readable.from([Buffer.from(route.body ?? "")]);
    res.statusCode = route.status;
    res.headers = route.headers || {};
    res.on("end", close);
    res.on("close", close);
    cb(res);
  });
  return req;
};
`;

const trees = [];
test.after(() => {
  for (const root of trees) fs.rmSync(root, { recursive: true, force: true });
});

function makeTree() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "fetch-gnome-extensions-"),
  );
  trees.push(root);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "static", "data"), { recursive: true });
  const script = path.join(root, "scripts", "fetch-gnome-extensions.js");
  fs.copyFileSync(SCRIPT, script);
  const preload = path.join(root, "scripts", "stub-https.cjs");
  fs.writeFileSync(preload, PRELOAD);
  return {
    root,
    script,
    preload,
    out: path.join(root, "static", "data", "gnome-extensions.json"),
    imgDir: path.join(root, "static", "img", "extensions"),
    urlLog: path.join(root, "requested-urls.txt"),
  };
}

function info(pk, extra = {}) {
  return {
    status: 200,
    body: JSON.stringify({
      uuid: `ext-${pk}@example.com`,
      name: `Extension ${pk}`,
      creator: "someone",
      creator_url: "/accounts/profile/someone",
      description: `Description ${pk}`,
      screenshot: shotPath(pk),
      icon: `/extension-data/icons/icon_${pk}.png`,
      ...extra,
    }),
  };
}

function happyRoutes() {
  const routes = {};
  for (const pk of EXTENSION_IDS) {
    routes[infoUrl(pk)] = info(pk);
    routes[`${BASE}${shotPath(pk)}`] = { status: 200, body: PNG_BYTES };
  }
  return routes;
}

function run(tree, { routes = {}, fallback, args = [], env = {} } = {}) {
  const result = spawnSync(
    process.execPath,
    ["--require", tree.preload, tree.script, ...args],
    {
      encoding: "utf8",
      timeout: 20_000,
      env: {
        ...process.env,
        GNOME_EXT_CACHE_HOURS: "24",
        ...env,
        STUB_ROUTES: JSON.stringify(routes),
        STUB_DEFAULT: JSON.stringify(fallback ?? { status: 404, body: "" }),
        STUB_URL_LOG: tree.urlLog,
      },
    },
  );
  const requested = fs.existsSync(tree.urlLog)
    ? fs.readFileSync(tree.urlLog, "utf8").split("\n").filter(Boolean)
    : [];
  return { ...result, requested };
}

const readOut = (tree) => JSON.parse(fs.readFileSync(tree.out, "utf8"));
const byId = (records, pk) => records.find((r) => r.id === pk);

test("EXTENSION_IDS literal is parsed from the script", () => {
  assert.ok(EXTENSION_IDS.length > 4);
  assert.equal(new Set(EXTENSION_IDS).size, EXTENSION_IDS.length);
});

test("writes one record per extension and downloads each screenshot", () => {
  const tree = makeTree();
  const r = run(tree, { routes: happyRoutes() });
  assert.equal(r.status, 0, r.stderr);

  const records = readOut(tree);
  assert.ok(Array.isArray(records));
  assert.deepEqual(
    records.map((x) => x.id),
    EXTENSION_IDS,
  );
  for (const pk of EXTENSION_IDS) {
    const rec = byId(records, pk);
    assert.equal(rec.screenshot, `/img/extensions/${pk}.png`);
    assert.equal(rec.remoteScreenshot, `${BASE}${shotPath(pk)}`);
    assert.equal(rec.url, `${BASE}/extension/${pk}/`);
    assert.equal(
      fs.readFileSync(path.join(tree.imgDir, `${pk}.png`), "utf8"),
      PNG_BYTES,
    );
  }
  assert.doesNotMatch(r.stderr, /only \d+\/\d+ extensions fetched/);
});

test("keeps an already-present screenshot without downloading it again", () => {
  const tree = makeTree();
  const [pk] = EXTENSION_IDS;
  fs.mkdirSync(tree.imgDir, { recursive: true });
  fs.writeFileSync(path.join(tree.imgDir, `${pk}.png`), "tracked-in-git");

  const r = run(tree, { routes: happyRoutes() });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.requested.includes(`${BASE}${shotPath(pk)}`));
  assert.equal(
    fs.readFileSync(path.join(tree.imgDir, `${pk}.png`), "utf8"),
    "tracked-in-git",
  );
  assert.equal(byId(readOut(tree), pk).screenshot, `/img/extensions/${pk}.png`);
});

test("uses the screenshot's own extension and defaults to .png when it has none", () => {
  const tree = makeTree();
  const [webpPk, barePk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[infoUrl(webpPk)] = info(webpPk, { screenshot: "/shots/a.webp" });
  routes[`${BASE}/shots/a.webp`] = { status: 200, body: PNG_BYTES };
  routes[infoUrl(barePk)] = info(barePk, { screenshot: "/shots/noext" });
  routes[`${BASE}/shots/noext`] = { status: 200, body: PNG_BYTES };

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  const records = readOut(tree);
  assert.equal(
    byId(records, webpPk).screenshot,
    `/img/extensions/${webpPk}.webp`,
  );
  assert.ok(fs.existsSync(path.join(tree.imgDir, `${webpPk}.webp`)));
  assert.equal(
    byId(records, barePk).screenshot,
    `/img/extensions/${barePk}.png`,
  );
  assert.ok(fs.existsSync(path.join(tree.imgDir, `${barePk}.png`)));
});

test("follows 301/302 redirects when downloading a screenshot", () => {
  const tree = makeTree();
  const [pk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[`${BASE}${shotPath(pk)}`] = {
    status: 301,
    headers: { location: "https://cdn.example/hop" },
  };
  routes["https://cdn.example/hop"] = {
    status: 302,
    headers: { location: "https://cdn.example/final.png" },
  };
  routes["https://cdn.example/final.png"] = {
    status: 200,
    body: "redirected-bytes",
  };

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.requested.includes("https://cdn.example/final.png"));
  assert.equal(
    fs.readFileSync(path.join(tree.imgDir, `${pk}.png`), "utf8"),
    "redirected-bytes",
  );
  assert.equal(byId(readOut(tree), pk).screenshot, `/img/extensions/${pk}.png`);
});

test("gives up after five redirects but still publishes the extension without a local screenshot", () => {
  const tree = makeTree();
  const [pk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[`${BASE}${shotPath(pk)}`] = {
    status: 302,
    headers: { location: "https://cdn.example/loop" },
  };
  routes["https://cdn.example/loop"] = {
    status: 302,
    headers: { location: "https://cdn.example/loop" },
  };

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Too many redirects/);
  assert.equal(
    r.requested.filter((u) => u === "https://cdn.example/loop").length,
    5,
  );
  const rec = byId(readOut(tree), pk);
  assert.equal(rec.screenshot, null);
  assert.equal(rec.remoteScreenshot, `${BASE}${shotPath(pk)}`);
  assert.equal(readOut(tree).length, EXTENSION_IDS.length);
});

test("a failed screenshot download leaves screenshot null and writes no image file", () => {
  const tree = makeTree();
  const [notFoundPk, droppedPk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[`${BASE}${shotPath(notFoundPk)}`] = { status: 404, body: "" };
  routes[`${BASE}${shotPath(droppedPk)}`] = { error: "socket hang up" };

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /HTTP 404 downloading/);
  assert.match(r.stderr, /socket hang up/);
  const records = readOut(tree);
  for (const pk of [notFoundPk, droppedPk]) {
    assert.equal(byId(records, pk).screenshot, null);
    assert.ok(!fs.existsSync(path.join(tree.imgDir, `${pk}.png`)));
  }
});

test("an extension without a screenshot is published without any download", () => {
  const tree = makeTree();
  const [pk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[infoUrl(pk)] = info(pk, {
    screenshot: null,
    icon: null,
    creator_url: null,
  });

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.requested.includes(`${BASE}${shotPath(pk)}`));
  const rec = byId(readOut(tree), pk);
  assert.equal(rec.screenshot, null);
  assert.equal(rec.remoteScreenshot, null);
  assert.equal(rec.icon, null);
  assert.equal(rec.creatorUrl, null);
});

test("drops extensions whose metadata fetch fails and warns about the shortfall", () => {
  const tree = makeTree();
  const [httpPk, jsonPk, netPk, notFoundPk] = EXTENSION_IDS;
  const routes = happyRoutes();
  routes[infoUrl(httpPk)] = { status: 500, body: "boom" };
  // A JSON error body must not be mistaken for extension metadata.
  routes[infoUrl(notFoundPk)] = {
    status: 404,
    body: '{"detail":"Not found."}',
  };
  routes[infoUrl(jsonPk)] = { status: 200, body: "<html>not json</html>" };
  routes[infoUrl(netPk)] = { error: "ECONNRESET" };

  const r = run(tree, { routes });
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    r.stderr,
    new RegExp(`Failed to fetch extension ${httpPk}: HTTP 500`),
  );
  assert.match(
    r.stderr,
    new RegExp(`Failed to fetch extension ${jsonPk}: JSON parse error`),
  );
  assert.match(
    r.stderr,
    new RegExp(`Failed to fetch extension ${netPk}: ECONNRESET`),
  );
  assert.match(
    r.stderr,
    new RegExp(`Failed to fetch extension ${notFoundPk}: HTTP 404`),
  );
  const expected = EXTENSION_IDS.length - 4;
  assert.match(
    r.stderr,
    new RegExp(`only ${expected}/${EXTENSION_IDS.length} extensions fetched`),
  );

  const records = readOut(tree);
  assert.ok(Array.isArray(records));
  assert.deepEqual(
    records.map((x) => x.id),
    EXTENSION_IDS.slice(4),
  );
});

test("writes the unavailable payload the Tips page understands when every fetch fails", () => {
  const tree = makeTree();
  const r = run(tree, { fallback: { status: 503, body: "" } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /All extension fetches failed/);

  const payload = readOut(tree);
  assert.ok(!Array.isArray(payload));
  assert.equal(payload.unavailable, true);
  assert.equal(payload.stateReason, "GNOME extensions API unavailable");
  assert.deepEqual(payload.extensions, []);
  assert.ok(!Number.isNaN(Date.parse(payload.generatedAt)));
});

test("skips every request while the cached output is fresh", () => {
  const tree = makeTree();
  fs.writeFileSync(tree.out, '["cached"]');

  const r = run(tree, { routes: happyRoutes() });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Skipping fetch/);
  assert.deepEqual(r.requested, []);
  assert.deepEqual(readOut(tree), ["cached"]);
});

test("refetches a fresh cache with --force or when it is older than GNOME_EXT_CACHE_HOURS", () => {
  const forced = makeTree();
  fs.writeFileSync(forced.out, '["cached"]');
  const r1 = run(forced, { routes: happyRoutes(), args: ["--force"] });
  assert.equal(r1.status, 0, r1.stderr);
  assert.equal(readOut(forced).length, EXTENSION_IDS.length);

  const aged = makeTree();
  fs.writeFileSync(aged.out, '["cached"]');
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
  fs.utimesSync(aged.out, twoHoursAgo, twoHoursAgo);
  const r2 = run(aged, {
    routes: happyRoutes(),
    env: { GNOME_EXT_CACHE_HOURS: "1" },
  });
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(readOut(aged).length, EXTENSION_IDS.length);
});
