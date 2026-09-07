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

## When to Use

- Adding, modifying, or debugging a Cloudflare Worker in `workers/` (`countme-proxy` or `knowledge-mcp`).
- Configuring `wrangler.<name>.toml` configs, Worker KV bindings, or cron triggers.
- Setting up or updating public MCP endpoints on `*.projectbluefin.io` subdomains.

## When NOT to Use

- Standard docs pages or React component changes (use `component-testing.md`).
- DNS-only routing or static redirects that do not require compute.
- Touching `workers/countme-proxy` during routine documentation tasks (it is a separate service).

## Core Process

### 1. Layout convention

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

### 2. Isolate dependencies

Keep a Worker's dependencies out of the Docusaurus root. Give the Worker its own
`package.json`, `package-lock.json`, and nested `.gitignore`, and install with
`working-directory:` in CI.

For MCP endpoints, use `@modelcontextprotocol/server` (v2) paired with `agents/mcp/server`
`createMcpHandler`. Avoid mixing SDK v1 (`@modelcontextprotocol/sdk`) with v2 handlers.

### 3. Browser CORS and Origin Allowlisting

The `agents` stateless handler checks incoming `Origin` headers before routing.
Wildcard headers alone are insufficient if the host is rejected. When browser-based
clients on `docs.projectbluefin.io` need access, configure explicit origin validation:

```javascript
const handler = createMcpHandler(() => createServer(env), {
  route: "/mcp",
  allowedHostnames: ["mcp.projectbluefin.io", "localhost", "127.0.0.1"],
  allowedOriginHostnames: ["docs.projectbluefin.io"],
  corsOptions: {
    origin: "https://docs.projectbluefin.io",
  },
});
```

### 4. Entrypoint rules and CPU cap

**Every named export is treated as an entrypoint.** Export only the default handler
(and genuine Durable Object classes). Keep constants module-local.

**The free plan's 10 ms CPU cap is per invocation.** Expensive parses (>100ms)
belong in GitHub Actions or a Cron Trigger with full background CPU budgets. The
request path reads finished JSON from KV and caches it in module scope:

```js
let cache = { at: 0, value: null };
async function load(env) {
  if (cache.value && Date.now() - cache.at < TTL_MS) return cache.value;
  cache = { at: Date.now(), value: await env.KB.get(KEY, "json") };
  return cache.value;
}
```

## Common Rationalizations

- _"I can add the worker dependencies to the root `package.json`."_ False: this breaks
  Docusaurus builds and creates version conflicts between Node and workerd.
- _"Deploying a worker makes the hostname resolve."_ False: DNS records must route the
  zone in Cloudflare.
- _"`Access-Control-Allow-Origin: *` means any browser request succeeds."_ False: the
  `agents` runtime validates `Origin` against `allowedOriginHostnames` before processing.

## Red Flags

- Deploying a Worker to make a hostname resolve. That is a DNS job.
- Exporting anything but the default handler from a Worker entrypoint.
- Parsing a large document inside a Worker request on the free plan.
- Adding a Worker's dependencies to the site's root `package.json`.
- Omitting `allowedOriginHostnames` when web clients consume the endpoint.
- Claiming a subdomain works from a successful deploy alone — check DNS and the live HTTPS response.

## Verification

- `cd workers/<name> && npm test` passes offline without network dependencies.
- Modern MCP Streamable HTTP clients receive 200 with `accept: application/json, text/event-stream`.
- Health probe (`curl -s http://127.0.0.1:8799/health`) returns HTTP 200 `{ "status": "ok" }`.

## Sources

- `workers/knowledge-mcp/src/index.js`
- `wrangler.mcp.toml`
- Context7: `/websites/developers_cloudflare_agents`
