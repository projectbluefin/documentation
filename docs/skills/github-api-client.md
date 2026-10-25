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

9. **Use bounded concurrency and deterministic output for bulk fetches.**
   Never serialize dozens of calls or add fixed sleeps between them; fan out
   with `mapWithConcurrency` from `lib/request-queue.js` (named import works
   from ESM). Current widths are 4–10 per call site (dora caps total in flight
   at 12; GHCR lanes stay at 4 because a throttled `list-tags` drops the lane).
   Collect results by input index, never push in completion order, so
   generated JSON stays byte-stable between builds. `lib/gh.js` has no retry,
   and fetchers catch-and-continue, so an unbounded `Promise.all` that trips a
   secondary rate limit silently drops data.

10. **`fetch-data` is one parallel phase; declare real ordering explicitly.**
    Every fetcher runs concurrently via `scripts/run-parallel.mjs`. The one
    true dependency — `fetch-github-images` reads the gitignored
    `static/feeds/bluefin-releases.json` that `fetch-feeds` writes — is a
    `fetch-feeds-then-images` `&&` chain, pinned by `fetch-chain.test.js`. A
    new fetcher that reads another fetcher's output needs its own chain, not a
    second phase.

11. **A new fetcher's output goes in the Actions data cache only if it is
    gitignored.** See [`ci-workflows.md`](ci-workflows.md) step 2.

12. **`.mjs` files are not linted.** `eslint.config.mjs` matches
    `**/*.{js,jsx,ts,tsx}`, so `npm run lint` says nothing about
    `scripts/lib/*.mjs`. A green lint on an ESM-client change is not evidence —
    the `*.test.js` for that module is.
13. **Incremental month-partitioned caching & refetch window.**
    Historical completed months are immutable and must be frozen once finalized.
    To avoid losing PRs and activity occurring on the final day of a calendar
    month due to delayed reporting or webhook latencies, an incremental monthly
    fetcher must refetch both the current in-flight month and the immediately
    preceding calendar month. A month is only frozen if completed strictly
    after month-end and no pagination truncation or rate limits were tripped.
    If truncation or rate limiting is tripped, record `null` for the affected
    stream rather than coercing to 0 or publishing a partial undercount.

14. **Contributor totals require a complete account union, not search counts.**
    `fetch-contributor-metrics.js` discovers every current public organization
    repository, including archived repositories and forks. It traverses direct
    GraphQL resource connections and every nested comment, review and discussion
    reply cursor. Connection totals, unique resource IDs and cursor progress must
    agree before a scan is complete. A failed or missing page invalidates the
    whole new scan; a partial result cannot become an all-time total.
    Compare discovered repository coverage with the org's REST `public_repos`
    control total, not a curated list or token-filtered subset. A live connection
    may append resources during pagination: traverse issues and PRs oldest-first,
    require all collected raw IDs to match the final advertised total, and apply
    the snapshot timestamp cutoff to participation. Do not reject a complete scan
    solely because a total grew, or accept a missing final page. Log only safe
    source operation names and fixed failure codes, never upstream error bodies.
    Repository-wide REST inline review comments include replies on old PRs;
    paginated REST default-branch commits count linked authors on non-merge
    commits only, and skip fork git history while retaining fork-native resources.
    Deduplicate accounts by public node ID, filter the canonical
    `contributor-tracker.mjs` bot policy plus GitHub's Bot type, and count missing
    or ghost identities separately instead of inventing account IDs.
    This collector rescans recorded history: the incremental freeze rule above
    does not apply, and source corrections may change earlier month counts.
    Keep nested page sizes modest and exhaust their continuations instead of
    multiplying large parent/comment/review connections. A live full scan hit
    GitHub's secondary limit despite unused primary quota. Respect the server's
    `Retry-After` through a shared worker cooldown; stop further requests after an
    unrecoverable HTTP failure. Offline tests must cover both recovery and bounded
    failure retaining the last-good snapshot.

    Run `node scripts/fetch-contributor-metrics.js` with `GITHUB_TOKEN` or
    `GH_TOKEN`; `--force` bypasses its 24-hour `seed-cache.js` generatedAt TTL.
    Successful scans print request counts and GraphQL cost for real budget
    measurement. Only verified scans advance generatedAt. Identical serialized
    output is not rewritten. Failures preserve schema2 history, coverage,
    identity records and their old timestamp, with a fixed public reason;
    schema1 counts are never a last-good fallback. The offline fixture in
    `fetch-contributor-metrics.test.js` drives the actual injectable transport
    through two-page nested connections and dropped-page failures.
    The fetcher remains build-safe (exit 0), but the scheduled refresh job must
    finish red when it retained unavailable or stale data. Its final workflow
    gate uses `isVerifiedRefresh` to require a complete snapshot timestamped inside
    the current collection interval, after publishing any unavailable state for
    review. A genuine measured zero passes. CLI write-failure tests run copied
    modules and fixture seeds inside a disposable workspace; never point a
    fault-injected child process at the tracked production dataset.

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
  `retryWithBackoff`, `sequentialFetchWithDelay`, `mapWithConcurrency`,
  `isNetworkError`.
- `scripts/gh-lib.test.js`, `scripts/request-queue.test.js` — the contract tests.
- `AGENTS.md` → _Data pipelines_ — the never-fail-the-build and null-vs-zero
  rules restated in steps 6 and 8.
- `eslint.config.mjs` — the `files` glob that excludes `.mjs`.
- GitHub GraphQL documentation (`/websites/github_en_graphql` in Context7):
  direct node lookup, discussions pagination, submitted review fields and states.
- `adr/0003-factory-two-level-navigation.md` — authorizes the factory layer's
  shared client.
