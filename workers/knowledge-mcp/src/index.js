// mcp.projectbluefin.io — public MCP endpoint for the Project Bluefin org.
//
// Serves the Hive knowledge base plus live factory projections. Read-only and
// unauthenticated by design; the index it reads has already had security-tagged
// and tripwire-flagged entries withheld by scripts/build-index.mjs.
//
// This Worker never parses the raw export — GitHub Actions does that and writes
// the finished index to KV. See workers/knowledge-mcp/README.md.
import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchEntries } from "./knowledge.mjs";

// NOTE: workerd treats every named export as a potential entrypoint, so
// nothing but the default handler may be exported from this module.
const INDEX_KEY = "knowledge-index";
const HUB = "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev";
const MAX_LIMIT = 25;

// Workers isolates survive between requests, so the parsed index is kept in
// module scope: JSON.parse of ~540 KB is the single most expensive thing this
// Worker can do, and paying it once per isolate keeps a warm request well
// inside the free-tier 10 ms CPU budget. TTL bounds staleness against the
// 10-minute refresh cadence.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, index: null };

async function loadIndex(env) {
  const now = Date.now();
  if (cache.index && now - cache.at < CACHE_TTL_MS) return cache.index;
  const index = await env.KB.get(INDEX_KEY, "json");
  if (!index) throw new Error("knowledge index unavailable — indexer has not run yet");
  cache = { at: now, index };
  return index;
}

/** Hive's `/api/contribute/*` projections are public and read-only. */
async function hub(path) {
  const res = await fetch(`${HUB}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`hub ${path} returned ${res.status}`);
  return res.json();
}

const json = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const fail = (err) => ({
  content: [{ type: "text", text: `error: ${err.message}` }],
  isError: true,
});

function createServer(env) {
  const server = new McpServer({ name: "projectbluefin-knowledge", version: "1.0.0" });

  server.registerTool(
    "search_knowledge",
    {
      description:
        "Search the Project Bluefin organization knowledge base: engineering patterns, " +
        "test-coverage gaps, CI conventions, and per-repository findings across " +
        "projectbluefin/*. Returns only matching entries, never the whole corpus.",
      inputSchema: {
        query: z.string().min(2).describe("Keywords, e.g. 'bats coverage bluefin-lts'"),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Max entries (default 10)"),
      },
    },
    async ({ query, limit }) => {
      try {
        const index = await loadIndex(env);
        const hits = searchEntries(index.entries, query, Math.min(limit ?? 10, MAX_LIMIT));
        return json({
          query,
          matched: hits.length,
          indexed: index.count,
          generated: index.generated,
          results: hits,
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_factory_status",
    {
      description:
        "Live Project Bluefin factory status from Hive: hub health, active contributors, " +
        "actionable item count, and per-tier contribution limits.",
      inputSchema: {},
    },
    async () => {
      try {
        const [status, limits] = await Promise.all([
          hub("/api/contribute/status"),
          hub("/api/contribute/limits"),
        ]);
        return json({ status, limits });
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    "get_work_queue",
    {
      description:
        "Live Project Bluefin work queue and triage state from Hive: issues ready to " +
        "implement, and how work is grouped by triage level. Read-only — Hive alone " +
        "assigns work.",
      inputSchema: {
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Max queue items (default 10)"),
      },
    },
    async ({ limit }) => {
      try {
        const cap = Math.min(limit ?? 10, MAX_LIMIT);
        const [queue, triage] = await Promise.all([
          hub("/api/contribute/queue"),
          hub("/api/contribute/triage"),
        ]);
        return json({
          queue: (queue.queue ?? []).slice(0, cap),
          queue_total: (queue.queue ?? []).length,
          triage: (triage.groups ?? []).map((g) => ({
            level: g.level,
            label: g.label,
            count: g.count,
          })),
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Cheap liveness probe that does not touch KV.
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", endpoint: "/mcp" });
    }

    // The factory receives no Cloudflare env, so the handler closes over it.
    const handler = createMcpHandler(() => createServer(env), {
      route: "/mcp",
      allowedHostnames: ["mcp.projectbluefin.io", "localhost", "127.0.0.1"],
    });
    return handler(request, env, ctx);
  },
};
