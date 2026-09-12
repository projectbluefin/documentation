---
name: cloudflare-workers
version: "1.0"
last_updated: "2026-09-07"
id: cloudflare-workers
one_line_purpose: Build and ship a Cloudflare Worker on a projectbluefin.io subdomain.
entry_point: docs/skills/cloudflare-workers.md
category: ci-ops
status: active
tags: [cloudflare, workers, wrangler, kv, mcp, subdomain]
description: >-
  Conventions and hard-won failure modes for the Workers this repository ships
  on projectbluefin.io subdomains. Use when adding, changing, or debugging a
  Worker, a wrangler config, or a Workers KV binding.
metadata:
  type: procedure
  context7-sources:
    - /websites/developers_cloudflare_agents
---

# Cloudflare Workers

This repository is the org's home for Cloudflare Workers. Two ship today:
`workers/countme-proxy` (`countme.projectbluefin.io`) and
`workers/knowledge-mcp` (`mcp.projectbluefin.io`).

## Layout convention

One directory per Worker under `workers/`, one `wrangler.<name>.toml` at the
repository root, one `deploy-<name>.yml` workflow. Follow the existing pair
rather than inventing a layout.

Deploy workflows pin every action by SHA and deploy with
`npx wrangler@latest deploy --config wrangler.<name>.toml`, using
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

Route a subdomain the way the existing Workers do — this is a DNS-shaped
problem, so solve it in the route table, not with a redirect Worker:

```toml
workers_dev = false
routes = [{ pattern = "<sub>.projectbluefin.io/*", zone_name = "projectbluefin.io" }]
```

For vanity cross-domain redirects (such as `hive.projectbluefin.io/*` to
the hosted Hive instance on `*.hive.hivecommons.dev`), lightweight module
workers (e.g. `hive-redirect`) handle path and search query forwarding via 301
redirects.

## Failure modes that cost real time

**Every named export is treated as an entrypoint.** A stray constant export
kills startup with a message that names the constant, not the cause:

```
Uncaught TypeError: Incorrect type for map entry 'INDEX_KEY':
the provided value is not of type 'function or ExportedHandler'.
```

Export only the default handler (and genuine Durable Object classes). Keep
constants module-local, or export pure helper logic from a separate module
(e.g. `routes.mjs`) so unit tests can exercise them offline without leaking
named exports on the Worker entrypoint.

**`main` resolves relative to the config file, not the working directory.** An
override config written to `/tmp` cannot use a repo-relative `main`. Use an
absolute path in throwaway configs.

**The free plan's 10 ms CPU cap is per invocation, and it binds.** Anything
that parses a large payload will not fit. Do the expensive work in GitHub
Actions and have the Worker read the finished artifact from KV. Then cache the
parsed value in module scope — isolates survive between requests, so a warm
request does no parsing at all:

```js
let cache = { at: 0, value: null };
async function load(env) {
  if (cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  cache = { at: Date.now(), value: await env.KB.get(KEY, "json") };
  return cache.value;
}
```

**Keep a Worker's dependencies out of the Docusaurus root.** Give the Worker
its own `package.json`, `package-lock.json`, and nested `.gitignore`, and
install with `working-directory:` in CI. The root `.gitignore` entry is
`/node_modules` — anchored — so a nested `node_modules` is **not** ignored
unless the Worker directory ships its own `.gitignore`.

**Check peer ranges before writing a version.** `agents@0.22` requires
`zod@^4`; pinning `zod@^3` fails `ERESOLVE`. Resolve the real versions rather
than reaching for `--legacy-peer-deps`.

## CountMe Worker (countme.projectbluefin.io)

`workers/countme-proxy` handles three workloads:

1. **First-party counts:** Every Project Bluefin series is aggregated from its
   own D1 rows, never fetched from another service. One weekly query, grouped
   by Monday-anchored week and `repo`, feeds `/counts.json`, the per-repo
   charts (`/`, `/growth.svg`, `/<repo>/growth.svg`) and the shields.io badges
   (`/badge-endpoints/<repo>.json`). `scripts/lib/countme-sources.mjs` is
   imported directly rather than restated, so the Worker and the site enforce
   one definition of where a count may come from.
   - A repo with no rows in a week is `null`, never `0`: the service cannot
     tell "nobody reported" from "nobody was running it". SVG charts break the
     line at a gap instead of interpolating across it.
   - Unbound binding, failing query, or zero rows all return HTTP 200 with
     `unavailable: true` and `FIRST_PARTY_PENDING_REASON`. A counts endpoint
     that 500s is a chart that renders nothing.
2. **Upstream artifact proxy:** Only `ublue-os/bluefin:stable`, the upstream
   pre-migration image — `/growth_bluefins.svg`,
   `/sources/ublue-os/bluefin/growth.svg`, `/badge-endpoints/bluefin.json`.
   That is the whole exception; every other `ublue-os/countme` series,
   Bluefin LTS included, is EPEL-summed and may not be republished as ours.
3. **Client ingestion (`/metalink`):** Receives weekly anonymous countme pings
   from Project Bluefin clients and writes the rows the counts query reads.
   - Query parameters: `repo` (one of `bluefin`, `bluefin-lts`, `dakota`,
     `utah`, `server`), `tag`
     (e.g. `stable`), `flavor` (e.g. `main`), `arch` (`x86_64`, `aarch64`),
     `countme` (integer bucket 1–4).
   - Responses are HTTP 200 with `cache-control: no-store`.
   - The endpoint strictly disallows persistent machine identifiers or tokens.

## Verifying before deploy

`wrangler dev` against an override config catches entrypoint and binding errors
that only appear at runtime. Seed KV locally and drive the Worker over real
HTTP:

```bash
wrangler kv key put <key> --path <file> --binding KB \
  --config /tmp/override.toml --local --persist-to /tmp/kvdata
wrangler dev --config /tmp/override.toml --local --persist-to /tmp/kvdata --port 8799
curl -s http://127.0.0.1:8799/health
```

Do not point a local run at the production `wrangler.<name>.toml` — it carries
the live route.

## Publishing derived data

A Worker that republishes data from another system is a disclosure decision,
not a config choice. Audit the corpus before it goes public, filter at the
indexer, and verify the filter through the live endpoint by querying the
withheld content verbatim — a filter that has not been queried is untested.

Prefer withholding a single flagged record over failing the whole refresh: one
false positive must not be able to freeze a published index. Fail the run only
when flags spike, which signals the upstream classification changed.

## Red flags

- Deploying a Worker to make a hostname resolve. That is a DNS job.
- Exporting anything but the default handler from a Worker entrypoint.
- Parsing a large document inside a Worker on the free plan.
- Adding a Worker's dependencies to the site's root `package.json`.
- Publishing data from an authenticated upstream without auditing it first.
- Claiming a subdomain works from a successful deploy alone — check DNS and the
  live HTTPS response.
