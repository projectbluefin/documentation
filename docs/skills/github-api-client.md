---
name: github-api-client
description: Use when adding or editing a GitHub API call in scripts/ — fetching, paginating, choosing a token, or building request headers for a fetch-*.js pipeline, a lib/*.mjs report module, or update-artwork.mjs.
---

# GitHub API Client

One GitHub client per module system. `scripts/lib/request-queue.js` is the CJS
client; `scripts/lib/gh.js` is the ESM client. Every call site picks one of them
instead of restating a token read or a header object.

## When to Use

- Adding a new `scripts/fetch-*.js` pipeline that calls `api.github.com`.
- Adding a GitHub call to an ESM report module (`scripts/lib/*.mjs`).
- Reviewing a diff that contains `process.env.GITHUB_TOKEN`,
  `Authorization: Bearer`, or a hand-built `headers` object.
- Debugging a fetcher that 401s, rate-limits, or degrades to a fallback payload.

## When NOT to Use

- Reading a non-GitHub upstream (feeds, Flathub, Homebrew, GHCR OCI manifests) —
  only the GitHub REST/GraphQL plumbing is shared here.
- Chart or panel rendering — see [`update-churn-pipeline.md`](update-churn-pipeline.md)
  and [`factory-dashboard-content.md`](factory-dashboard-content.md).
- The `workers/countme-proxy/` Worker, which has its own tests and deployment.

## Core Process

1. **Pick the client by module system, not by preference.** A `.js` file
   (`require`) uses `scripts/lib/request-queue.js`. A `.mjs`/ESM file uses
   `scripts/lib/gh.js`. Neither absorbs the other without a conversion, so a
   migration across that line is a separate, reviewable change.

2. **Never restate the token.** Both clients export `githubToken()`, which
   returns `process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null`. Do not
   write `process.env.GITHUB_TOKEN || process.env.GH_TOKEN` at a call site, and
   do not read one env var alone — `GH_TOKEN` alone or `GITHUB_TOKEN` alone is
   the divergence this contract exists to remove.

3. **Never restate the headers.** Both clients export `githubHeaders(...)`.
   Call it; do not hand-build an object with `Accept`, `User-Agent`, and
   `Authorization`. Override only the field the endpoint genuinely needs — the
   Contents API `.raw` representation needs a different `accept`, and that is
   the shape of the sanctioned override.

4. **Resolve the token per call, not at import time.** Build headers inside the
   function that makes the request. A module-level `request.defaults(...)` or
   `graphql.defaults(...)` client freezes the token at import, and it bakes in a
   header even when no token exists.

5. **Omit `authorization` when there is no token — never send it empty.** A
   header built as `` `Bearer ${token}` `` / `` `token ${token}` `` from a
   missing token serialises to the literal string `Bearer null` or
   `token undefined`, which GitHub rejects with a 401. An anonymous request to a
   public endpoint would have succeeded under the 60 req/hr limit. Both clients
   only attach `authorization` when a token is actually present.

6. **Let the client own the failure mode you want.**
   - ESM: `ghFetch`/`githubFetch` throw on non-2xx. `githubFetch` takes
     `throwOnError: false` and returns `null` — the fail-soft path for a fetcher
     that writes an unavailable payload.
   - CJS: `retryWithBackoff` retries _transient network_ errors only
     (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`, `socket hang up`,
     `timeout`) with exponential backoff. It rethrows 401/403 and every other
     error immediately — it is not a rate-limit retry, so do not reach for it
     expecting a 403 to clear. Use it instead of writing your own loop.
   - Either way, a pipeline **never fails the build**: no throw escapes, no
     non-zero exit, no silently empty file. Write
     `{ unavailable: true, stateReason }` and exit 0.

7. **Reuse `classifyRun` for workflow-run state.** It is exported from
   `scripts/lib/gh.js` (re-exported from `fetch-factory-stats.js`, which owns
   the definition). An in-flight run is never a failure; anything without a
   terminal conclusion is pending. A second copy of that rule is a second chance
   to get it wrong.

8. **Mind the CJS/ESM defaults — they are not identical.** `gh.js`'s
   `githubHeaders` defaults to `accept: application/vnd.github+json`, a pinned
   `x-github-api-version: 2022-11-28`, and
   `user-agent: projectbluefin-documentation-factory`. `request-queue.js`'s
   defaults to `User-Agent: Bluefin-Docs-Build` and sets `accept` /
   `x-github-api-version` only when passed in `opts`. Header key casing differs
   too (lowercase in ESM, `Authorization`/`User-Agent` in CJS). Write assertions
   against the client you actually called.

9. **`.mjs` files are not linted.** `eslint.config.mjs` matches
   `**/*.{js,jsx,ts,tsx}`, so `npm run lint` says nothing about
   `scripts/lib/*.mjs`. A green lint on an ESM-client change is not evidence —
   the `*.test.js` for that module is.

## Common Rationalizations

- _"It's one line, inlining the token read is clearer than importing a helper."_
  Wrong. It is the mechanism by which the layer forked three ways; a dozen of
  those one-liners is how Accept, api-version, and auth-scheme drift apart.
- _"The token is always set in CI, so the empty-header case does not matter."_
  Wrong. The report pipeline runs locally and in forks without a token, and a
  401 there is indistinguishable from an upstream outage.
- _"I'll build the client once at module scope so it is not rebuilt per call."_
  Wrong. It reads the environment at import, so a token exported after load is
  ignored — and the module caches, so a test cannot vary the environment.
- _"The endpoint is public, so no token is needed at all."_ Then omit the header
  entirely rather than sending an empty one. Treated as malformed credentials,
  it is worse than anonymous.
- _"`npm run lint` passed, so the change is checked."_ Only for `.js`. ESM
  modules are outside the lint glob.

## Red Flags

- A literal `process.env.GITHUB_TOKEN`, `process.env.GH_TOKEN`, or
  `Bearer ${` in a new fetch site.
- A hand-written `{ Accept, "User-Agent", Authorization }` object.
- `request.defaults(...)`, `graphql.defaults(...)`, or a module-scope client
  constant holding headers.
- `Authorization: Bearer undefined` / `Bearer null` / an empty string.
- `Accept: application/vnd.github.v3+json` in new code — the legacy accept; the
  contract is `application/vnd.github+json`.
- A retry loop written by hand instead of `retryWithBackoff`.
- A fetcher that can exit non-zero or throw out of `main()`, or that writes an
  empty file in place of `{ unavailable: true, stateReason }`.
- A missing value coerced to `0` — a gap is `null`, a real `0` stays `0`.

## Verification

- `node --test scripts/gh-lib.test.js scripts/request-queue.test.js` passes:
  the shared contract, including that `authorization` is absent with no token.
- The `*.test.js` for every migrated module passes — for the ESM report modules
  that means `scripts/build-metrics.test.js`, `scripts/graphql-queries.test.js`,
  `scripts/tap-promotions.test.js`, and `scripts/update-artwork.test.js`, and
  `scripts/fetch-github-profiles.test.js` for the CJS side. These are the real
  gate for `.mjs`, since lint does not see it.
- `npm test` shows no new failures against the pre-change baseline.
- `npm run lint` exits 0 (0 errors; warnings pre-exist).
- A new fetch site's test asserts the header the client actually builds,
  including the no-token case.

## Sources

- `scripts/lib/gh.js` — ESM client: `githubToken`, `githubHeaders`,
  `githubFetch`, `ghFetch`, `ghPaginate`, `classifyRun`, `ageMs`, `ageDays`.
- `scripts/lib/request-queue.js` — CJS client: `githubToken`, `githubHeaders`,
  `retryWithBackoff`, `sequentialFetchWithDelay`, `isNetworkError`.
- `scripts/gh-lib.test.js`, `scripts/request-queue.test.js` — the contract tests.
- `AGENTS.md` → _Data pipelines_ — the never-fail-the-build and null-vs-zero
  rules restated in steps 6 and 8.
- `eslint.config.mjs` — the `files` glob that excludes `.mjs`.
- `adr/0003-factory-two-level-navigation.md` — authorizes the factory layer's
  shared client.
