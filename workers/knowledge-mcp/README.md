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
| `search_knowledge(query, limit=10, repo?)` | Matching knowledge entries — patterns, coverage gaps, CI conventions across `projectbluefin/*`. Optionally narrowed to one repository |
| `get_repo_conventions(repo, limit=10)` | Curated ground rules for one repository, from `conventions`-tagged knowledge entries |
| `get_factory_status()` | Live hub health, active contributors, actionable items, per-tier limits |
| `get_work_queue(limit=10, repo?)` | Live ready-to-implement queue, plus the `implementing` and `reviewing` items already in flight |

Results are capped at 25 entries. The endpoint never returns the whole corpus:
loading a ~470 KB export into an agent's context is the exact failure this
replaces (see `review/docs/skills/goose-context.md`).

### Citations

A `search_knowledge` hit carries `repo`, `number` and `url` when the source
entry's title opens with a `<repo>#<number>` citation — `utah-packages#46: …`,
`bluefin-lts#511: …`. That prefix is the only citation the Hive export
contains; there are no structured issue fields to read, so entries whose titles
carry no such prefix come back without those three fields rather than with
guessed ones. `url` uses `/issues/<n>`, which GitHub redirects to the pull
request when the number is a PR.

The `repo` filter is deliberately looser than the citation: it matches any
`projectbluefin/<repo>` or `<repo>#<n>` mention in the title or body, so a
finding filed in one repository still surfaces for the repository it is about.

The export carries no `kind` (issue vs PR), no open/closed `state`, and no
date, so `search_knowledge` has no `since` argument and reports neither. Those
would need the hub to add the fields to `/api/v1/knowledge` first.

### Conventions records

`get_repo_conventions` reads the same index; it holds no repository facts of
its own and makes no GitHub call. A record is any knowledge entry that mentions
the repository and is tagged `conventions`. A missing or wrong record is
therefore fixed upstream in Hive, not here, and the tool says so explicitly
when a repository has none.

### Work queue

`get_work_queue` returns the ready queue plus, for the `implementing` and
`reviewing` triage levels, the items themselves rather than only a count —
those are the states that say a lane is already on something. Each group keeps
the hub's org-wide `count` alongside `matched`, the number that survived the
`repo` filter, so the two differ on purpose.

Hive's `/api/contribute/triage` projection carries no lane account and no pull
request link, so neither is returned; adding them is a hub change.

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
