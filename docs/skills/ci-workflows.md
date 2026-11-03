---
name: ci-workflows
version: "1.1"
last_updated: "2026-11-03"
id: ci-workflows
one_line_purpose: Edit GitHub Actions workflows without breaking caches, gates, or data.
entry_point: docs/skills/ci-workflows.md
category: ci-ops
status: active
tags: [ci, github-actions, cache, performance]
description: >-
  Use when editing anything under .github/workflows/ — adding a step, a cache,
  a job, or a concurrency group — or when a pages.yml build is slow.
metadata:
  type: procedure
  context7-sources:
    - /actions/checkout
---

# CI workflows

`pages.yml` runs `data` (fetch once, upload `site-data`) → a `build` matrix
(`en` plus translated shards of up to 4, from `build-site.mjs --matrix`) →
`assemble` (merge parts, check every locale, upload the Pages artifact on
main) → `deploy`, with `verify` (tests, lint) beside them. The cron
`update-*-cache.yml` workflows feed it data through the Actions cache. Most CI
mistakes here are silent: a cache that clobbers committed data, a gate that
stops firing, or a cache entry that carries corrupt build state.

## When to Use

- Adding or changing an `actions/cache` step, a job, or a `concurrency` block.
- Moving a check between jobs or workflows.
- Diagnosing a slow `pages.yml` run.

## When NOT to Use

- Writing a fetch script — see [`github-api-client.md`](github-api-client.md).
- Landing or verifying a deploy — see
  [`shipping-and-verifying.md`](shipping-and-verifying.md).

## Core Process

1. **Measure before changing anything.** Get per-step timings from a real run:
   `gh api repos/projectbluefin/documentation/actions/runs/<id>/jobs --jq '.jobs[] | .steps[] | "\(.name) \(.completed_at) \(.started_at)"'`.
   For `Fetch data`, split per script with `gh run view <id> --log` and each
   script's "wrote"/"saved" line. Local fetch timings are only comparable when
   `static/data/github-profiles.json` is warm; CI restores it from its own
   cache, so a cold local run measures a 250-profile refetch CI never does.

   Build time grows with live locales: one Docusaurus process builds them in
   sequence, and one 4-vCPU runner is CPU-bound (parallel builds on it saved
   only ~24% at 14 locales). Spread locales over runners instead; keep each
   shard's artifact small (translated builds drop `static/`), and check the
   shard out sparse for the same reason: the trees that only ever appear as
   article media — `static/img/user-attachments`, `static/img/blog`,
   `static/img/artwork` — are skipped by URL and never bundled, so excluding
   them drops 110 MiB per shard (`sparse-checkout` also implies
   `--filter=blob:none`, so their blobs are never fetched). The handful of
   images the bundler _does_ resolve (`url("/img/…")` in CSS modules, under
   `static/img/characters` and `static/img/portal`) must stay checked out.

   History is a separate axis. `future.faster` enables gitEagerVcs, which dates
   every file with one `git log --format=t:%ct,a:%an --name-status`, so a
   shallow checkout dates them all HEAD's. Nothing on today's `main` renders
   one — no plugin sets `showLastUpdateTime`, and a main-tip build carries zero
   `lastUpdatedAt` pages — yet every part still fetches the built commit's
   ancestry, because that is the surface the report pages read when it comes
   back. Do that without `fetch-depth: 0`, whose wildcard refspec also drags in
   all 71 branches and the tags (206 MiB of `.git` for ~187 MiB of ancestry):

   ```yaml
   - name: Fetch the built commit's history
     run: git fetch --no-tags --unshallow origin "$(git rev-parse HEAD)"
   ```

   The fetch names the commit the build checked out, so it is correct for a
   push, a PR head, or a merge-queue ref, and it inherits a sparse checkout's
   blob filter (commits and trees only). Verified by diffing its output against
   a full-history clone's: byte-identical. Dropping the step altogether would
   save a further ~117 MiB per run while nothing renders a date.

   Anything a job uploads for another must be named by `needs`: `deploy` needs
   `assemble`, not `build`, or it races the artifact. `upload-artifact` skips
   dotfiles by default — `build/.nojekyll` needs `include-hidden-files`. Matrix
   jobs sharing one job-level `concurrency` group cancel each other; include
   `matrix.part` in the group.

2. **Cache only gitignored fetcher output.** Run `git ls-files static/data`
   before adding a path to "Restore GitHub data cache". A tracked seed in that
   list is restored after checkout and replaces freshly committed data with a
   stale entry — and the cache re-saves the stale copy.

3. **`node_modules`: split restore and save, and save before the build.**
   `future.faster` turns on rspack's persistent cache, which writes
   `node_modules/.cache/rspack` during `docusaurus build` (~1 GB, and known to
   corrupt — see `just clear`). A combined `actions/cache` saves in its post
   step, after the build, and archives that state. Use `actions/cache/restore`,
   `npm ci` on miss, then `actions/cache/save` immediately after install.

4. **No `restore-keys` on `node_modules`.** A partial hit still runs `npm ci`,
   which deletes `node_modules` first; the restore is pure download cost.

5. **Don't save from PRs or the merge queue.** Their saves land in scopes no
   other run can read (PR merge ref, `gh-readonly-queue/*`). PRs already read
   main's entries. Gate saves on `github.event_name` and let main populate.

6. **Keep gates out of workflow-level `cancel-in-progress`.** A workflow-level
   cancel kills every job in the run, so a test job there gives superseded main
   pushes no result. Put `concurrency` on the jobs that should be latest-wins
   (`build`, `deploy`), and none on the gate (`verify`).

7. **Install only what a job runs.** Cron workflows whose scripts use only Node
   builtins skip `npm ci`. Prove it before removing the install: run the exact
   command from a `git archive` copy with no `node_modules` and check for
   `MODULE_NOT_FOUND`.

8. **Containers are not a speedup here.** Jobs run on the bare
   `ubuntu-latest` VM, with no image to pull. A `container:` adds a pull on
   every run, and the org's fsdk-containers images are distroless: even
   `review-runtime` (Node 24) has no `sh` or `npm`, so it cannot host `run:`
   steps.

## Common Rationalizations

- _"Caching all of `node_modules` is simpler."_ It archives rspack state that
  the Justfile documents as crash-prone. Save before the build.
- _"The seed and the cache hold the same file, so restoring it is harmless."_
  The cache entry is write-once per key; the seed moves on every commit.
- _"Tests in `pages.yml` block deploy, so that's the safer home."_ Only if the
  workflow-level cancel can't delete their result — see step 6.

## Red Flags

- A `static/data/*.json` path in a cache that `git ls-files` lists.
- `path: node_modules` on a combined `actions/cache` in a job that builds.
- `restore-keys` beside a `cache-hit`-gated `npm ci`.
- A `concurrency` block with `cancel-in-progress: true` at workflow level in a
  workflow that also runs a gate.

## Verification

- `npx --yes @action-validator/cli@0.6.0 .github/workflows/<file>.yml`.
- The first `pages.yml` run after merge: compare step timings with the
  pre-change run, and confirm "Restore node_modules" hits on the second run.

## Sources

- `.github/workflows/pages.yml` — build/verify/deploy split, cache layout.
- `Justfile` — `clear` / `dev-safe` document rspack cache corruption.
- actions/cache README — branch scoping, 10 GB LRU, restore/save split.
- `actions/checkout` at the pinned commit, `src/git-source-provider.ts` — a
  sparse checkout sets `filter: blob:none` for you, and `fetch-tags` is only
  read on the `fetch-depth > 0` branch (library id `/actions/checkout`).
