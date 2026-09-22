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
import {
  parseKnowledge,
  searchEntries,
  conventionsFor,
  normalizeRepo,
  ORG,
} from "./knowledge.mjs";

// NOTE: workerd treats every named export as a potential entrypoint, so
// nothing but the default handler may be exported from this module.
const INDEX_KEY = "knowledge-index";
const HUB = "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev";
const MAX_LIMIT = 25;
// Triage levels whose items a caller needs by name, not just by count: these
// are the states that say "someone is already on this".
const IN_FLIGHT = new Set(["implementing", "reviewing"]);
// A false positive must not freeze the index, so a tripwire hit withholds one
// entry. A spike means upstream tagging changed and is worth refusing to publish.
const VIOLATION_CEILING = 25;

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
        "projectbluefin/*. Returns only matching entries, never the whole corpus. " +
        "Hits carry a repo/number/url citation when the source entry names one, so a " +
        "duplicate check needs no follow-up GitHub call.",
      inputSchema: {
        query: z.string().min(2).describe("Keywords, e.g. 'bats coverage bluefin-lts'"),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Max entries (default 10)"),
        repo: z
          .string()
          .optional()
          .describe("Narrow to one repository, e.g. 'projectbluefin/actions' or 'actions'"),
      },
    },
    async ({ query, limit, repo }) => {
      try {
        const slug = normalizeRepo(repo);
        if (repo && !slug) throw new Error(`'${repo}' is not a projectbluefin repository name`);
        const index = await loadIndex(env);
        const hits = searchEntries(index.entries, query, Math.min(limit ?? 10, MAX_LIMIT), {
          repo: slug,
        });
        return json({
          query,
          repo: slug ? `${ORG}/${slug}` : null,
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
    "get_repo_conventions",
    {
      description:
        "Curated ground rules for one projectbluefin repository — who merges, review and " +
        "merge-queue requirements, repo-specific CI gates, and whether the repo is " +
        "hands-off for agents. Read from the knowledge base, so a missing or wrong record " +
        "is fixed upstream in Hive rather than here.",
      inputSchema: {
        repo: z.string().describe("Repository, e.g. 'projectbluefin/testsuite' or 'testsuite'"),
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Max records (default 10)"),
      },
    },
    async ({ repo, limit }) => {
      try {
        const slug = normalizeRepo(repo);
        if (!slug) throw new Error(`'${repo}' is not a projectbluefin repository name`);
        const index = await loadIndex(env);
        const records = conventionsFor(index.entries, slug, Math.min(limit ?? 10, MAX_LIMIT));
        return json({
          repo: `${ORG}/${slug}`,
          found: records.length,
          generated: index.generated,
          conventions: records,
          // Say so rather than implying the repo has no rules.
          note: records.length
            ? undefined
            : "No `conventions`-tagged knowledge entry mentions this repository yet. " +
              "Add one in Hive — this endpoint publishes the knowledge base and holds no " +
              "repository facts of its own.",
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
        "implement, plus what is already in flight (implementing, reviewing) so a " +
        "maintainer does not race a Hive lane. Read-only — Hive alone assigns work.",
      inputSchema: {
        limit: z.number().int().min(1).max(MAX_LIMIT).optional().describe("Max queue items (default 10)"),
        repo: z
          .string()
          .optional()
          .describe("Narrow to one repository, e.g. 'projectbluefin/server' or 'server'"),
      },
    },
    async ({ limit, repo }) => {
      try {
        const cap = Math.min(limit ?? 10, MAX_LIMIT);
        const slug = normalizeRepo(repo);
        if (repo && !slug) throw new Error(`'${repo}' is not a projectbluefin repository name`);
        const wanted = slug ? `${ORG}/${slug}` : null;
        const forRepo = (items) =>
          wanted ? (items ?? []).filter((i) => i.repo === wanted) : (items ?? []);

        const [queue, triage] = await Promise.all([
          hub("/api/contribute/queue"),
          hub("/api/contribute/triage"),
        ]);
        const ready = forRepo(queue.queue);
        return json({
          repo: wanted,
          queue: ready.slice(0, cap),
          queue_total: ready.length,
          triage: (triage.groups ?? []).map((g) => {
            const items = forRepo(g.issues);
            return {
              level: g.level,
              label: g.label,
              // `count` is the hub's org-wide total for the level; `items` is
              // what survived the repo filter and the cap, so the two differ
              // on purpose.
              count: g.count,
              ...(IN_FLIGHT.has(g.level) ? { items: items.slice(0, cap), matched: items.length } : {}),
            };
          }),
          note:
            "Hive's triage projection carries no lane account; pull request details (number, " +
            "url, state) are included on reviewing items when supplied by the hub.",
        });
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}

/**
 * Rebuild the published index from the Hive export.
 *
 * Runs on a Cron Trigger, which gets the full CPU budget rather than the
 * per-request cap, so the ~200 ms parse of the ~470 KB export belongs here.
 * Withholds security-tagged entries and tripwire hits before anything is
 * written to KV, so unpublishable content never reaches the endpoint.
 */
async function refreshIndex(env) {
  if (!env.HIVE_TOKEN) throw new Error("HIVE_TOKEN secret is not set");

  const res = await fetch(`${HUB}/api/v1/knowledge`, {
    headers: { Authorization: `Bearer ${env.HIVE_TOKEN}` },
  });
  // Never echo the body on failure: it may carry an auth redirect.
  if (!res.ok) throw new Error(`hub returned ${res.status} fetching knowledge export`);

  const markdown = await res.text();
  if (markdown.includes("Knowledge base not yet available")) {
    throw new Error("hub served its placeholder, not a knowledge base");
  }

  const { entries, dropped, violations, total } = parseKnowledge(markdown);
  if (entries.length === 0) throw new Error("refusing to publish an empty index");
  if (violations.length > VIOLATION_CEILING) {
    throw new Error(
      `${violations.length} tripwire hits exceeds ceiling ${VIOLATION_CEILING} — ` +
        "upstream tagging likely changed; refusing to publish",
    );
  }

  await env.KB.put(
    INDEX_KEY,
    JSON.stringify({
      generated: new Date().toISOString(),
      count: entries.length,
      entries,
    }),
  );
  cache = { at: 0, index: null }; // force this isolate to re-read

  // Titles only. Bodies of suspected vuln entries do not belong in logs.
  const summary = {
    seen: total,
    published: entries.length,
    withheldSecurity: dropped,
    withheldTripwire: violations.length,
    tripwireTitles: violations.map((v) => v.title),
  };
  console.log("knowledge index refreshed", JSON.stringify(summary));
  return summary;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refreshIndex(env));
  },

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
