# knowledge-mcp

Public MCP endpoint serving the Project Bluefin organization knowledge base at
**`https://mcp.projectbluefin.io/mcp`**.

Point any MCP client at it — no account, no token:

```json
{
  "mcpServers": {
    "projectbluefin": {
      "type": "http",
      "url": "https://mcp.projectbluefin.io/mcp"
    }
  }
}
```

## Tools

| Tool | Returns |
|---|---|
| `search_knowledge(query, limit=10)` | Matching knowledge entries — patterns, coverage gaps, CI conventions across `projectbluefin/*` |
| `get_factory_status()` | Live hub health, active contributors, actionable items, per-tier limits |
| `get_work_queue(limit=10)` | Live ready-to-implement queue and triage counts |

Results are capped at 25 entries. The endpoint never returns the whole corpus:
loading a ~470 KB export into an agent's context is the exact failure this
replaces (see `review/docs/skills/goose-context.md`).

## How it works

```
GitHub Actions (*/10)  ──►  GET hub /api/v1/knowledge   [HIVE_TOKEN]
                       ──►  parse + withhold + tripwire
                       ──►  wrangler kv key put  ──►  Workers KV
                                                        │
             MCP client ──► mcp.projectbluefin.io/mcp ──┘   (Worker: read + filter)
                            └─ factory tools ──► hub /api/contribute/*  (public)
```

**The parse runs in Actions, not the Worker.** Parsing the export costs roughly
200 ms of CPU, which does not fit the free plan's 10 ms per-invocation cap.
Moving it to CI keeps the endpoint on the free plan. The Worker only reads KV
and filters, and caches the parsed index in module scope so a warm isolate does
no parsing at all.

## What is withheld from the public index

The corpus was audited before publication. It contains no credentials, and the
people named in it appear only as authors of public pull requests. Two classes
are withheld:

1. **`security`-tagged entries** (54 of ~1710). Blanket-dropped rather than
   triaged one by one.
2. **Tripwire hits** — entries matching vulnerability language
   (`CVE-\d{4}`, `unpatched`, `exploit`, `evades`, `bypass`, …) that are *not*
   tagged `security`. This caught two real unpatched-CVE entries that the tag
   had missed, which is the whole reason it exists.

A tripwire hit withholds that one entry and reports it; it does not fail the
run, because a single false positive must not be able to freeze the index. A
*spike* past `VIOLATION_CEILING` (default 25) does fail the run — that means
upstream tagging changed and a human should look.

Withheld entries should be re-tagged upstream in Hive so they are classified at
the source.

## Local development

```bash
npm ci
npm test                       # parser, security filter, tripwire

# Build a real index (needs a GitHub token the hub accepts)
HIVE_TOKEN="$(gh auth token)" node scripts/build-index.mjs --out index.json --dry-run
```

To run the Worker locally, seed a local KV namespace and start `wrangler dev`
with an override config — `wrangler.mcp.toml` targets the production route, so
do not use it directly for local runs.

## Deployment

The endpoint is deployed and serving. It was published with `wrangler` directly:

```bash
node scripts/build-index.mjs --out index.json
wrangler kv key put knowledge-index --path index.json \
  --binding KB --config ../../wrangler.mcp.toml --remote
wrangler deploy --config ../../wrangler.mcp.toml
```

Two automation workflows (`deploy-knowledge-mcp.yml` and
`refresh-knowledge-index.yml`) are **not** in this change. Creating files under
`.github/workflows/` requires a token with the `workflow` scope, which GitHub
enforces server-side and which an OAuth App token cannot carry, so they land
separately.

Until they exist, the index is refreshed by running the two commands above.

Required repository secrets:

| Secret | Used by | Purpose |
|---|---|---|
| `HIVE_TOKEN` | refresh | GitHub token the Hive hub accepts for `/api/v1/knowledge` |
| `CLOUDFLARE_API_TOKEN` | both | Workers deploy + KV write |
| `CLOUDFLARE_ACCOUNT_ID` | both | Target account |

**These are not currently set on this repository or the organization.** That is
also why `deploy-countme-worker.yml` has been failing on every run since at
least 2026-07-21 — it fails deep inside a `wrangler` invocation, after a full
install, which is why it went unnoticed. The knowledge-mcp workflows preflight
their secrets and fail immediately with a named list instead.

## Constraints

- **Read-only.** The endpoint reads Hive projections. It never assigns,
  reorders, retries, or otherwise manages Hive work — Hive alone owns
  assignment (`review/docs/skills/hive-runtime.md`).
- **The Worker never holds `HIVE_TOKEN`.** Only CI does. The published index is
  already filtered by the time it reaches KV.
- **Dependencies are deliberately isolated** from the Docusaurus root so a docs
  upgrade cannot break the endpoint, or the reverse.
