// Executed coverage for workers/knowledge-mcp/src/index.js — the public MCP
// Worker behind mcp.projectbluefin.io.
//
// The Worker is unauthenticated and read-only, so everything that decides what
// reaches it is a publish gate: the security/tripwire refusals in
// `refreshIndex`, the KV-miss refusal in `loadIndex`, and the repository-slug
// rejection on every tool. None of it was executed by a test before this file.
//
// `src/index.js` imports three packages the knowledge-mcp CI job never installs
// (it runs `npm test` with no install on purpose). `testlib/hooks.mjs` maps
// those specifiers to local stubs, so the real Worker code runs here while the
// package stays dependency-free.
import test from "node:test";
import assert from "node:assert/strict";
import { register, registerHooks } from "node:module";
import * as hooks from "./testlib/hooks.mjs";

// `registerHooks` (in-thread, Node >= 22.15) is preferred; `register` is kept
// as the fallback so the suite still runs on an older Node than CI's.
if (typeof registerHooks === "function") {
  registerHooks(hooks);
} else {
  register("./testlib/hooks.mjs", import.meta.url);
}

const { createMcpHandler } = await import("./testlib/stub-agents.mjs");

let workerPromise;

/** The Worker, loaded once — as workerd would, one isolate per deployment. */
function loadWorker() {
  workerPromise ??= import("../src/index.js").then((mod) => mod.default);
  return workerPromise;
}

/** Last handler `createMcpHandler` produced, i.e. the one `fetch` just built. */
const lastHandler = () => createMcpHandler.handlers.at(-1);

function kv(value) {
  const store = { reads: 0, writes: [], value };
  return {
    store,
    KB: {
      get: async (key, type) => {
        store.reads++;
        store.lastGet = { key, type };
        return store.value;
      },
      put: async (key, body) => {
        store.writes.push({ key, body });
      },
    },
  };
}

/**
 * Empty the module-scope index cache between cases.
 *
 * The Worker exposes no reset, and that is the point: a successful refresh is
 * the only thing that drops the cache, so this drives the real code path.
 */
async function resetCache(worker) {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      exportMarkdown([{ title: "actions#0: cache reset", body: "", tags: [] }]),
    );
  try {
    const pending = [];
    await worker.scheduled(
      {},
      { KB: kv(null).KB, HIVE_TOKEN: "reset" },
      {
        waitUntil: (p) => pending.push(p),
      },
    );
    await pending[0];
  } finally {
    globalThis.fetch = original;
  }
}

/** Drive one registered tool with the Worker's own `fetch` entry point. */
async function withTools(env) {
  const worker = await loadWorker();
  await resetCache(worker);
  await worker.fetch(new Request("https://mcp.projectbluefin.io/mcp"), env, {});
  return { worker, tools: lastHandler().server.tools };
}

const tools = async (env) => (await withTools(env)).tools;

async function call(env, name, args = {}) {
  const tool = (await tools(env)).get(name);
  assert.ok(tool, `tool ${name} is registered`);
  const result = await tool.handler(args);
  return {
    isError: result.isError === true,
    text: result.content[0].text,
    get value() {
      return JSON.parse(result.content[0].text);
    },
  };
}

const entry = (over = {}) => ({
  title: "actions#1: a finding",
  body: "body text",
  tags: [],
  files: [],
  category: "Patterns",
  repos: ["actions"],
  ...over,
});

const index = (entries, over = {}) => ({
  generated: "2026-10-02T00:00:00.000Z",
  count: entries.length,
  entries,
  ...over,
});

/** Shape of the Hive export `refreshIndex` parses. */
function exportMarkdown(entries) {
  const lines = ["# Agent Knowledge", "", "## Patterns", ""];
  for (const e of entries) {
    lines.push(
      `### ${e.title}`,
      e.body ?? "",
      `Tags: ${(e.tags ?? []).join(", ")}`,
      "",
    );
  }
  return lines.join("\n");
}

/** Replace global fetch for one case; returns the recorded calls. */
function stubFetch(t, responder) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return responder(String(url), init);
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

/** Run the Cron entry point and surface what `ctx.waitUntil` was handed. */
async function runScheduled(env) {
  const worker = await loadWorker();
  await resetCache(worker);
  const pending = [];
  await worker.scheduled({}, env, { waitUntil: (p) => pending.push(p) });
  assert.equal(
    pending.length,
    1,
    "refresh is handed to waitUntil, not awaited inline",
  );
  return pending[0];
}

test("/health answers without reading KV, so a liveness probe cannot be a cache miss", async () => {
  const { KB, store } = kv(null);
  const worker = await loadWorker();

  const res = await worker.fetch(
    new Request("https://mcp.projectbluefin.io/health"),
    { KB },
    {},
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", endpoint: "/mcp" });
  assert.equal(store.reads, 0);
});

test("every other path is routed to the MCP handler on /mcp with the hostname allowlist", async () => {
  const { KB } = kv(index([entry()]));
  const { worker } = await withTools({ KB });

  const res = await worker.fetch(
    new Request("https://mcp.projectbluefin.io/mcp"),
    { KB },
    {},
  );

  assert.deepEqual(await res.json(), { stub: "mcp", route: "/mcp" });
  assert.equal(lastHandler().options.route, "/mcp");
  assert.deepEqual(lastHandler().options.allowedHostnames, [
    "mcp.projectbluefin.io",
    "localhost",
    "127.0.0.1",
  ]);
});

test("the Worker registers exactly the four public tools", async () => {
  const { KB } = kv(index([entry()]));
  assert.deepEqual(
    [...(await tools({ KB })).keys()],
    [
      "search_knowledge",
      "get_repo_conventions",
      "get_factory_status",
      "get_work_queue",
    ],
  );
});

test("a tool fails cleanly when the indexer has not run yet", async () => {
  const { KB } = kv(null);

  const res = await call({ KB }, "search_knowledge", { query: "bats" });

  assert.ok(res.isError);
  assert.match(res.text, /knowledge index unavailable/);
});

test("the parsed index is read from KV once per isolate, not once per request", async () => {
  const { KB, store } = kv(
    index([entry({ title: "actions#1: bats coverage" })]),
  );
  const registry = await tools({ KB });
  const search = registry.get("search_knowledge").handler;

  await search({ query: "bats" });
  await search({ query: "bats" });

  assert.equal(store.reads, 1);
  assert.deepEqual(store.lastGet, { key: "knowledge-index", type: "json" });
});

test("search reports the normalized repo, the corpus size and the index timestamp", async () => {
  const entries = [entry({ title: "actions#7: bats coverage gap" })];
  const { KB } = kv(
    index(entries, { generated: "2026-09-30T12:00:00.000Z", count: 1706 }),
  );

  const res = await call({ KB }, "search_knowledge", {
    query: "bats",
    repo: "projectbluefin/actions",
  });

  assert.deepEqual(res.value, {
    query: "bats",
    repo: "projectbluefin/actions",
    matched: 1,
    indexed: 1706,
    generated: "2026-09-30T12:00:00.000Z",
    results: entries,
  });
});

test("search rejects a string that is not a projectbluefin repository name", async () => {
  const { KB, store } = kv(index([entry()]));

  const res = await call({ KB }, "search_knowledge", {
    query: "bats",
    repo: "../../etc",
  });

  assert.ok(res.isError);
  assert.match(
    res.text,
    /'\.\.\/\.\.\/etc' is not a projectbluefin repository name/,
  );
  assert.equal(store.reads, 0, "the slug is rejected before KV is touched");
});

test("search caps an oversized limit at MAX_LIMIT rather than returning the corpus", async () => {
  const entries = Array.from({ length: 30 }, (_, i) =>
    entry({ title: `actions#${i + 1}: bats coverage` }),
  );
  const { KB } = kv(index(entries));

  const capped = await call({ KB }, "search_knowledge", {
    query: "bats",
    limit: 100,
  });
  const defaulted = await call({ KB }, "search_knowledge", { query: "bats" });

  assert.equal(capped.value.matched, 25);
  assert.equal(defaulted.value.matched, 10);
  assert.equal(capped.value.repo, null);
});

test("conventions returns the curated records for the repo and no note", async () => {
  const record = entry({ title: "actions: who merges", tags: ["conventions"] });
  const { KB } = kv(index([record, entry()]));

  const res = await call({ KB }, "get_repo_conventions", { repo: "actions" });

  assert.equal(res.value.repo, "projectbluefin/actions");
  assert.equal(res.value.found, 1);
  assert.deepEqual(res.value.conventions, [record]);
  assert.equal(res.value.note, undefined);
});

test("conventions says the knowledge base has no record rather than implying no rules", async () => {
  const { KB } = kv(index([entry()]));

  const res = await call({ KB }, "get_repo_conventions", { repo: "testsuite" });

  assert.equal(res.value.found, 0);
  assert.deepEqual(res.value.conventions, []);
  assert.match(res.value.note, /No `conventions`-tagged knowledge entry/);
});

test("conventions rejects a bad repository name, where search would have allowed none", async () => {
  const { KB } = kv(index([entry()]));

  const res = await call({ KB }, "get_repo_conventions", {
    repo: "NOT A REPO",
  });

  assert.ok(res.isError);
  assert.match(res.text, /is not a projectbluefin repository name/);
});

test("factory status joins the hub's status and limits projections", async (t) => {
  const calls = stubFetch(t, (url) =>
    Response.json(
      url.endsWith("/status") ? { healthy: true } : { tier: { max: 3 } },
    ),
  );

  const res = await call({ KB: kv(null).KB }, "get_factory_status");

  assert.deepEqual(res.value, {
    status: { healthy: true },
    limits: { tier: { max: 3 } },
  });
  assert.deepEqual(
    calls.map((c) => new URL(c.url).pathname),
    ["/api/contribute/status", "/api/contribute/limits"],
  );
  assert.equal(calls[0].init.headers.accept, "application/json");
});

test("a hub outage surfaces as a tool error naming the path and status", async (t) => {
  stubFetch(t, () => new Response("gateway down", { status: 503 }));

  const res = await call({ KB: kv(null).KB }, "get_factory_status");

  assert.ok(res.isError);
  assert.match(res.text, /hub \/api\/contribute\/status returned 503/);
});

test("the work queue filters both the queue and in-flight triage items by repo", async (t) => {
  const item = (repo, n) => ({ repo, number: n });
  stubFetch(t, (url) =>
    Response.json(
      url.endsWith("/queue")
        ? {
            queue: [
              item("projectbluefin/server", 1),
              item("projectbluefin/utah", 2),
            ],
          }
        : {
            groups: [
              {
                level: "implementing",
                label: "Implementing",
                count: 9,
                issues: [
                  item("projectbluefin/server", 3),
                  item("projectbluefin/utah", 4),
                ],
              },
              {
                level: "ready",
                label: "Ready",
                count: 4,
                issues: [item("projectbluefin/server", 5)],
              },
            ],
          },
    ),
  );

  const res = await call({ KB: kv(null).KB }, "get_work_queue", {
    repo: "server",
  });

  assert.equal(res.value.repo, "projectbluefin/server");
  assert.deepEqual(res.value.queue, [item("projectbluefin/server", 1)]);
  assert.equal(res.value.queue_total, 1);
  // `count` stays the hub's org-wide total; `matched` is what survived the filter.
  assert.deepEqual(res.value.triage[0], {
    level: "implementing",
    label: "Implementing",
    count: 9,
    items: [item("projectbluefin/server", 3)],
    matched: 1,
  });
  // A level nobody is working on is a count, not a list.
  assert.deepEqual(res.value.triage[1], {
    level: "ready",
    label: "Ready",
    count: 4,
  });
  assert.match(res.value.note, /no lane account/);
});

test("the work queue tolerates a hub payload with no queue and no groups", async (t) => {
  stubFetch(t, () => Response.json({}));

  const res = await call({ KB: kv(null).KB }, "get_work_queue", { limit: 100 });

  assert.equal(res.value.repo, null);
  assert.deepEqual(res.value.queue, []);
  assert.equal(res.value.queue_total, 0);
  assert.deepEqual(res.value.triage, []);
});

test("the work queue rejects a bad repository name before calling the hub", async (t) => {
  const calls = stubFetch(t, () => Response.json({}));

  const res = await call({ KB: kv(null).KB }, "get_work_queue", {
    repo: "Not/A/Repo",
  });

  assert.ok(res.isError);
  assert.match(res.text, /is not a projectbluefin repository name/);
  assert.equal(calls.length, 0);
});

test("the cron refresh refuses to run without the hub token", async () => {
  await assert.rejects(
    runScheduled({ KB: kv(null).KB }),
    /HIVE_TOKEN secret is not set/,
  );
});

test("a failed export fetch is reported by status without echoing the body", async (t) => {
  stubFetch(
    t,
    () =>
      new Response("<html>login redirect with a session cookie</html>", {
        status: 403,
      }),
  );

  await assert.rejects(
    runScheduled({ KB: kv(null).KB, HIVE_TOKEN: "t0ken" }),
    (err) => {
      assert.match(err.message, /hub returned 403 fetching knowledge export/);
      assert.doesNotMatch(err.message, /login redirect/);
      return true;
    },
  );
});

test("the export is requested from the knowledge endpoint as a bearer", async (t) => {
  const calls = stubFetch(
    t,
    () =>
      new Response(
        exportMarkdown([
          { title: "actions#1: a finding", body: "body", tags: ["ci"] },
        ]),
      ),
  );
  const { KB, store } = kv(null);

  await runScheduled({ KB, HIVE_TOKEN: "t0ken" });

  assert.equal(new URL(calls[0].url).pathname, "/api/v1/knowledge");
  assert.equal(calls[0].init.headers.Authorization, "Bearer t0ken");
  assert.equal(store.writes.length, 1);
});

test("the hub's placeholder is refused instead of being published as a corpus", async (t) => {
  stubFetch(
    t,
    () =>
      new Response(
        "# Agent Knowledge\n\n## Patterns\n\n### Knowledge base not yet available\n",
      ),
  );
  const { KB, store } = kv(null);

  await assert.rejects(
    runScheduled({ KB, HIVE_TOKEN: "t0ken" }),
    /hub served its placeholder, not a knowledge base/,
  );
  assert.equal(store.writes.length, 0);
});

test("an export whose every entry is withheld is refused rather than published empty", async (t) => {
  stubFetch(
    t,
    () =>
      new Response(
        exportMarkdown([
          { title: "actions#1: a finding", body: "body", tags: ["security"] },
        ]),
      ),
  );
  const { KB, store } = kv(null);

  await assert.rejects(
    runScheduled({ KB, HIVE_TOKEN: "t0ken" }),
    /refusing to publish an empty index/,
  );
  assert.equal(store.writes.length, 0);
});

test("a tripwire spike is treated as changed upstream tagging and blocks the publish", async (t) => {
  const suspect = Array.from({ length: 26 }, (_, i) => ({
    title: `actions#${i + 1}: a finding`,
    body: "this one describes an exploit",
    tags: ["ci"],
  }));
  stubFetch(
    t,
    () =>
      new Response(
        exportMarkdown([
          ...suspect,
          { title: "actions#99: clean", body: "fine", tags: ["ci"] },
        ]),
      ),
  );
  const { KB, store } = kv(null);

  await assert.rejects(
    runScheduled({ KB, HIVE_TOKEN: "t0ken" }),
    /26 tripwire hits exceeds ceiling 25/,
  );
  assert.equal(store.writes.length, 0);
});

test("a tripwire hit below the ceiling withholds one entry and still publishes", async (t) => {
  stubFetch(
    t,
    () =>
      new Response(
        exportMarkdown([
          { title: "actions#1: clean", body: "fine", tags: ["ci"] },
          {
            title: "actions#2: suspect",
            body: "this one describes an exploit",
            tags: ["ci"],
          },
          { title: "actions#3: withheld", body: "fine", tags: ["security"] },
        ]),
      ),
  );
  const { KB, store } = kv(null);

  await runScheduled({ KB, HIVE_TOKEN: "t0ken" });

  const written = JSON.parse(store.writes[0].body);
  assert.equal(store.writes[0].key, "knowledge-index");
  assert.equal(written.count, 1);
  assert.deepEqual(
    written.entries.map((e) => e.title),
    ["actions#1: clean"],
  );
  assert.ok(
    Date.parse(written.generated) > 0,
    "the index carries its build time",
  );
});

test("a successful refresh drops the isolate cache so the next read sees the new index", async (t) => {
  const { KB, store } = kv(
    index([entry({ title: "actions#1: stale bats entry" })]),
  );
  const { worker, tools: registry } = await withTools({ KB });
  const search = registry.get("search_knowledge").handler;

  // Warm the module-scope cache, then refresh through the same module instance.
  await search({ query: "bats" });
  assert.equal(store.reads, 1);

  stubFetch(
    t,
    () =>
      new Response(
        exportMarkdown([
          { title: "actions#2: fresh bats entry", body: "", tags: [] },
        ]),
      ),
  );
  const refresh = [];
  await worker.scheduled(
    {},
    { KB, HIVE_TOKEN: "t0ken" },
    { waitUntil: (p) => refresh.push(p) },
  );
  await refresh[0];

  store.value = JSON.parse(store.writes[0].body);
  const after = await search({ query: "bats" });

  assert.equal(store.reads, 2, "the cache was invalidated, not served stale");
  assert.deepEqual(
    JSON.parse(after.content[0].text).results.map((e) => e.title),
    ["actions#2: fresh bats entry"],
  );
});
