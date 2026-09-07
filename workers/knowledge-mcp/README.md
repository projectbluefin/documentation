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

| Tool                                | Returns                                                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `search_knowledge(query, limit=10)` | Matching knowledge entries — patterns, coverage gaps, CI conventions across `projectbluefin/*`                              |
| `get_factory_status()`              | Live hub health, active contributors, actionable items, per-tier limits                                                     |
| `get_work_queue(limit=10)`          | Live ready-to-implement queue and triage counts                                                                             |
| `get_index_status()`                | Live knowledge index count, timestamp, and health                                                                           |
| `get_quickstart(topic)`             | Onboarding checklists: `first-pr`, `run-tests`, `factory-gates`, `branch-rules`                                             |
| `get_repository_map(repo)`          | High-level component map, entrypoints, and branch targets for `bluefin`, `bluefin-lts`, `common`, `dakota`, `documentation` |

Results are capped at 25 entries. The endpoint never returns the whole corpus:
loading a ~470 KB export into an agent's context is the exact failure this
replaces (see `review/docs/skills/goose-context.md`).

## How it works

```
Cron Trigger (*/10)  ──►  GET hub /api/v1/knowledge   [HIVE_TOKEN secret]
                     ──►  parse + withhold + tripwire
                     ──►  KV
                            │
        MCP client ──► mcp.projectbluefin.io/mcp ──┘   (read + filter)
                       └─ factory tools ──► hub /api/contribute/*  (public)
```

**The Worker refreshes its own index.** A Cron Trigger gets the full CPU budget
rather than the per-request cap, so the ~200 ms parse of the ~470 KB export runs
there. The request path only reads KV and filters, and caches the parsed index
in module scope, so a warm isolate does no parsing at all.

There is no CI job, no `CLOUDFLARE_API_TOKEN`, no `CLOUDFLARE_ACCOUNT_ID`, and
no GitHub secret in this design. `HIVE_TOKEN` is a Worker secret.

## What is withheld from the public index

The corpus was audited before publication. It contains no credentials, and the
people named in it appear only as authors of public pull requests. Two classes
are withheld:

1. **`security`-tagged entries** (54 of ~1710). Blanket-dropped rather than
   triaged one by one.
2. **Tripwire hits** — entries matching vulnerability language
   (`CVE-\d{4}`, `unpatched`, `exploit`, `evades`, `bypass`, …) that are _not_
   tagged `security`. This caught two real unpatched-CVE entries that the tag
   had missed, which is the whole reason it exists.

A tripwire hit withholds that one entry and reports it; it does not fail the
run, because a single false positive must not be able to freeze the index. A
_spike_ past `VIOLATION_CEILING` (default 25) does fail the run — that means
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

```bash
wrangler secret put HIVE_TOKEN --config ../../wrangler.mcp.toml
wrangler deploy --config ../../wrangler.mcp.toml
```

That is the whole deployment. The cron trigger is declared in
`wrangler.mcp.toml` and refreshes the index every ten minutes; `scripts/build-index.mjs`
remains for building an index by hand or inspecting what would be published.

The only credential is the `HIVE_TOKEN` Worker secret — a GitHub token the Hive
hub accepts for `/api/v1/knowledge`.

## Constraints

- **Read-only.** The endpoint reads Hive projections. It never assigns,
  reorders, retries, or otherwise manages Hive work — Hive alone owns
  assignment (`review/docs/skills/hive-runtime.md`).
- **The Worker never holds `HIVE_TOKEN`.** Only CI does. The published index is
  already filtered by the time it reaches KV.
- **Dependencies are deliberately isolated** from the Docusaurus root so a docs
  upgrade cannot break the endpoint, or the reverse.
