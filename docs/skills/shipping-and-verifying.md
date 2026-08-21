---
name: shipping-and-verifying
description: >-
  Land a change on main and prove it reached docs.projectbluefin.io. Use when a
  pull request will not enter the merge queue, when merging a stack of two
  related pull requests, or when checking whether an edit is actually live —
  especially anything rendered by the /factory dashboard.
---

# Shipping and verifying

Merging is shipping: `.github/workflows/pages.yml` publishes on every push to
`main`. Two things in this repository reliably waste a session — a pull request
that cannot merge for a reason the error never states, and a "verified live"
check that silently proves nothing.

## When to Use

- A pull request shows `mergeStateStatus: BLOCKED` with every check green.
- Two pull requests are stacked and both need to land.
- You need to confirm a change is live, not merely merged.

## When NOT to Use

- Doc-only changes to `docs/**`, `blog/**`, `reports/**`, `adr/**`, or
  `AGENTS.md` — those push straight to `main`, no pull request or queue.
- Deciding _what_ to change. This skill covers landing and proving it.

## A green pull request that will not enqueue

`gh pr merge` reports only `The merge strategy for main is set by the merge
queue`, the queue stays empty, and the pull request sits at `BLOCKED`. That
message is about strategy, not about the blocker.

Read the ruleset instead of guessing:

```bash
gh api repos/projectbluefin/documentation/rules/branches/main \
  -q '.[] | {type, params: .parameters}'
```

The `pull_request` rule carries:

```
required_approving_review_count: 0
require_last_push_approval:      true
```

Those two combine into a trap. Zero required reviews suggests none are needed,
but `require_last_push_approval` demands an approval covering the most recent
push, and GitHub forbids approving your own pull request. **A pull request you
authored and pushed yourself can never enter the queue on its own**, no matter
how green it is. It will sit open indefinitely, looking merely slow.

Three ways out: a second person approves, the ruleset bit is turned off, or a
maintainer merges with `--admin`. `--admin` bypasses branch protection, so it is
a maintainer's call — ask, do not assume.

```bash
gh pr merge <n> --repo projectbluefin/documentation --merge --admin
```

## Stacked pull requests: merge, do not squash

When the second branch is built on the first, its branch literally contains the
first branch's commit. Squash-merging the base creates a _new_ commit with the
same content, so the follow-up lands a duplicate. Use `--merge` for both, so the
original commit enters `main`'s history once and the follow-up reduces to just
its own work.

Merge the base first, then wait — GitHub reports `mergeable: UNKNOWN` for a few
seconds afterwards while it recomputes, and acting on `UNKNOWN` is guesswork.

## Verifying that a change is actually live

Fetching the page and grepping for your text is **not** a verification. It
produces false negatives that look exactly like success.

- `docs.projectbluefin.io/factory` (no trailing slash) returns a **301**, so a
  `curl` without `-L` greps an nginx redirect stub and finds nothing.
- Everything under `/factory` is client-rendered. Panel copy lives in a
  lazy-loaded, content-hashed chunk that appears in **neither** the page HTML
  nor `main.<hash>.js`. The page HTML references only the stylesheet and the
  entry bundle; chunk names are assembled at runtime.

Grepping either one returns zero hits whether your change shipped or not.

The reliable check is to build the deployed commit locally, learn the real chunk
name, then fetch that chunk from production:

```bash
git fetch origin && git checkout main && git reset --hard origin/main
npm run build:ci                       # ~5 min; build without refetching data

cd build
f=$(grep -rl "<a string only your change introduces>" assets/js/ | head -1)
curl -sL -o /tmp/c.js "https://docs.projectbluefin.io/assets/js/$(basename "$f")"
grep -c "<new string>" /tmp/c.js       # expect ≥ 1
grep -c "<old string>" /tmp/c.js       # expect 0
```

Assert on **both** directions. A hit on the new string alone does not prove the
old copy is gone, and the old string is what a reader complains about.

Two supporting habits:

- Search for a string the change **introduces**, not one it removes — you need a
  positive anchor to locate the chunk at all.
- The CDN serves the previous copy briefly, so add `?cb=$RANDOM` to page
  requests. Hashed asset paths change per build and need no cache-buster.

## Do not mistake a passing build for a deploy

`Deploy to GitHub Pages` reports `skipping` on pull requests; it only runs on
`main`. A green check on a pull request means the site _built_, not that it
published. After merging, watch the real run:

```bash
gh run list --repo projectbluefin/documentation --branch main --limit 2
gh run view <id> --repo projectbluefin/documentation \
  -q '{s: .status, c: .conclusion}'
```

`gh run watch --compact` streams build warnings and can exit without printing a
conclusion. Confirm with `gh run view` rather than trusting the tail of a watch.

## Cleanup

The merge deletes the remote branch automatically, so `git push origin --delete`
afterwards fails with `remote ref does not exist`. That error is expected and
means the cleanup already happened; only the local branch remains:

```bash
git branch -D <branch>
```

## Common Rationalizations

| Rationalization                             | Reality                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| "All checks are green, so it will merge."   | `BLOCKED` with green checks is a ruleset problem. Read the ruleset.             |
| "The build passed, so the change is live."  | `Deploy to GitHub Pages` skips on pull requests. It only publishes from `main`. |
| "I loaded the page and saw it."             | The CDN serves the old copy. Request it cache-busted.                           |
| "`gh run watch` finished, so it succeeded." | Watch can exit without a conclusion. Confirm with `gh run view`.                |
| "I'll squash the stack into one merge."     | Stacked pull requests merge, not squash — squashing orphans the child.          |
| "`--delete-branch` will tidy it up."        | The queue rejects it. Delete the local branch after the merge lands.            |

## Red Flags

- Reporting a change as shipped without a cache-busted request against
  `docs.projectbluefin.io`.
- Concluding a run succeeded from `gh run watch` output alone.
- Retrying `gh pr merge` repeatedly instead of reading the ruleset once.
- Treating a green pull-request check as a deploy.
- Passing `--delete-branch` while the merge queue is enabled.

## Verification

- [ ] The pull request actually entered the queue and the queue landed it.
- [ ] `gh run list --branch main` shows the `Deploy to GitHub Pages` run for
      that commit with `conclusion: success`.
- [ ] The live URL was fetched with a cache buster and returned the new content:

  ```bash
  curl -s "https://docs.projectbluefin.io/<path>?cb=$RANDOM" | grep "<marker>"
  ```

- [ ] The local branch is deleted; the remote one was removed by the merge.
