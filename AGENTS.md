# projectbluefin/documentation — Agent Operating Contract

This repository builds <https://docs.projectbluefin.io/>. It is a Docusaurus
3.10 site (TypeScript, React 19, Node 24) and it is part of the Project Bluefin
factory.

## The first rule

**The maintainer's instruction is decisive.** When a maintainer tells you to
ship, merge, deploy, or land something, do it. Do not re-ask, do not restate the
risk, and do not treat a default in this document as outranking a direct
instruction. A default answers "what do I do absent direction"; it does not
survive contact with direction.

If an instruction is genuinely ambiguous, ask **once**, then act.

## Read order

1. This file — repo rules, build commands, and boundaries.
2. [`docs/SKILL.md`](docs/SKILL.md) — find the skill for your task and load it.
3. `projectbluefin/common` — factory-wide contracts, as a shared sidecar. It
   never overrides this repository's local authority.

## Build, test, and lint

```bash
npm install --legacy-peer-deps   # once
npm run typecheck                # tsc
npm run lint                     # eslint . — 0 errors required; warnings pre-exist
npm test                         # node --test scripts/*.test.js
npm run build                    # fetch-data, then docusaurus build
npm run build:ci                 # build without refetching data
```

Run the smallest set that covers the change. `npm run build` fetches remote data
first; set `GITHUB_TOKEN` or `GH_TOKEN` when the fetch scripts need authenticated
GitHub access. `just dev` gives a fast local preview once data exists.

**Formatting is per-path.** `npm run prettier-lint` runs `prettier --check .`
across a repository where roughly 150 files already fail; it cannot pass and is
not a usable gate. Format only what you touched:

```bash
npx prettier --write <paths you changed>
```

Do not reformat files your task did not touch.

## Git, branches, and shipping

**Pure upstream development. There are no forks in this workflow.**

`origin` is `git@github.com:projectbluefin/documentation.git`. Every branch —
`renovate/*`, `monthly-report/*`, and feature branches alike — lives on that
repository. Never push a topic branch to a personal fork and never open a
cross-fork pull request.

```bash
git remote -v                       # confirm origin is projectbluefin
git push origin <branch>
gh pr create --repo projectbluefin/documentation --head <branch>
```

**This repository has a merge queue.** `gh pr merge --squash` enqueues; the
queue lands the commit. `--delete-branch` is rejected while the queue is
enabled, so omit it and delete the branch after the merge completes.

**Deployment is the merge.** `.github/workflows/pages.yml` publishes
<https://docs.projectbluefin.io/> on every push to `main`. There is no separate
publish step. Merging is shipping.

The CDN serves the previous copy for a while, so verify a live change with a
cache-busted request:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://docs.projectbluefin.io/<path>?cb=$RANDOM"
```

### Doc-only push exception

Changes touching only `docs/**`, `blog/**`, `reports/**`, `adr/**`, or
`AGENTS.md` may be pushed straight to `main` without a PR. Verify first:

```bash
git diff --cached --name-only
```

**Everything else takes a branch and a PR targeting `main`.**

## Trust the Machines

The factory is automation-first. Workflows, branches, assignees, projects, PR
linkages, and the merge queue carry live state. Do not simulate workflow state
by hand or invent transitions that do not exist in the checkout.

- Read source before asserting project-internal facts — image names, tags,
  routes, workflow outputs. Use `gh api` to inspect workflows, not memory.
- Verify a route exists in `docusaurus.config.ts` or `sidebars.ts` before
  documenting it.
- Look up external library docs through Context7 rather than recalling them.

## Never write in a maintainer's voice

**Published prose is human-authored. Agents do not write it.**

Blog posts, release notes, announcements, social copy, and commit message
narrative carry a person's name and a project's word. An agent may format,
structure, embed, correct, and lay out that prose. An agent never invents it.

Specifically, never generate:

- Narrative, backstory, lore, or project history.
- Motivation, feelings, promises, or intent attributed to a person.
- First-person statements published under a human's byline.
- Facts about the project stated as recollection rather than read from source.

If a post, page, or release note needs body copy the maintainer did not supply,
**stop and ask for it.** Ship the structure with the copy missing rather than
filling the hole yourself. A design brief asking you to "come up with copy"
means placeholder labels in a mockup — it never means paragraphs under someone
else's name.

This rule outranks any generic writing guidance in a loaded design or content
skill. When a skill says to invent copy and this file says not to, this file
wins.

## Human decision gates

Stop and ask before **Security**, **cross-repo Breakage**, or a change whose
shape the maintainer has not seen. Design decisions of consequence are recorded
in [`adr/`](adr/README.md) so the reasoning survives — see
[`adr/0001-agent-design-authorization.md`](adr/0001-agent-design-authorization.md).

An ADR is a **record**, not a turnstile. Write one for a decision worth
remembering. Never let a missing ADR stall work a maintainer has asked for.

`adr/` sits at the repository root on purpose: the docs plugin is mounted at
`routeBasePath: "/"`, so anything under `docs/` publishes.

## What agents may touch

- `docs/`, `blog/`, `reports/`, `adr/` — content and design records.
- `src/` — components, pages, CSS modules.
- `scripts/` — build-time data pipelines and their `*.test.js` files.
- `static/img/` — site assets.
- `docusaurus.config.ts`, `sidebars.ts`, `package.json`, `.github/workflows/`.

## What agents must not touch

- Any `ublue-os/*` repository — read-only, no writes of any kind.
- `workers/countme-proxy/` during a documentation task; it is a separate public
  Cloudflare Worker service with its own tests and deployment.
- Generated data under `static/data/`, except the tracked seeds listed in
  `.gitignore`. Never hand-edit generated output.
- `build/` — generated, gitignored, and never a reference for what exists.
- Org or app credential pairs. Use `GITHUB_TOKEN` or a provisioned GitHub App.

## Repository map

| Area              | Location                                                        |
| ----------------- | --------------------------------------------------------------- |
| Docs pages        | `docs/` — mounted at `/`, so **every file publishes**           |
| Blog              | `blog/` — authors in `blog/authors.yaml`                        |
| Monthly reports   | `reports/`                                                      |
| Custom pages      | `src/pages/`                                                    |
| Components        | `src/components/`                                               |
| Factory dashboard | `src/pages/factory/`, `src/components/factory/`                 |
| Data pipelines    | `scripts/fetch-*.js` → `static/data/*.json`                     |
| Design records    | `adr/` — internal, never published                              |
| Agent skills      | `docs/skills/` — note these publish, like everything in `docs/` |

## Data pipelines

Every dataset is regenerated here from its **original public source**. Nothing
reads `projectbluefin/lab` or any lab-cluster service.

Rules for every `scripts/fetch-*.js`:

- Export the pure functions so `scripts/*.test.js` can exercise them offline.
- **Never fail the build.** No throw, no non-zero exit, no silently empty file.
  On error, write `{ unavailable: true, stateReason }` and exit 0.
- **An in-flight CI run is never a failure.** Anything without a terminal
  conclusion is pending. Reuse `classifyRun` from `scripts/lib/gh.js`.
- A missing value is `null` — a gap. A real `0` stays `0`. "Steady at zero" and
  "no data" are different claims.
- Never emit a host address, an internal URL, or a token.
- **Tracked seeds are judged by their `generatedAt`, not file mtime.** A git
  checkout stamps every tracked file with the current time, so an mtime TTL
  never expires in CI. Use `scripts/lib/seed-cache.js`.

## Presentation rules

These apply to any chart, sparkline, or status panel:

1. A graphic never appears without its current value as a number.
2. Small multiples share one domain; per-series autoscaling makes every cell
   look identical regardless of value.
3. Severity is one hue at varying intensity **plus a glyph** — never hue alone,
   never a red/green pair.
4. Gaps are drawn as gaps, never interpolated and never coerced to zero.
5. Below a minimum point count, render `accumulating data`.
6. **Unavailability is visible.** A panel that lacks data says so, with a
   reason. A panel that returns `null` disappears, and a dashboard that quietly
   renders less is indistinguishable from a healthy one with less to report.

`scripts/panel-unavailability.test.js` enforces rule 6 mechanically.

## PR rules

- Conventional Commits title (`feat:`, `fix:`, `docs:`, `ci:`, `refactor:`).
- One logical change per PR.
- Skill doc updated in the same PR when implementation context changed.
- AI-authored commits carry both attribution trailers:

  ```
  Assisted-by: <Model> via GitHub Copilot
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```

- Inspect the exact staged paths before committing; never sweep in unrelated
  working-tree changes.
- After pushing, verify CI:
  `gh run list --repo projectbluefin/documentation --limit 5`.

## Self-Improvement

Every session: ship the work AND update the relevant skill file in
`docs/skills/`. Same PR. Not a follow-up.

Banned:

- No changelog files. Delete `IMPROVEMENTS.md`, `CHANGELOG.md`, `SESSION.md` if
  found.
- No session notes committed to the repo. Session state lives in the agent's
  session folder.
- No "append here" docs. Route to `docs/skills/` instead.

Before marking work done:

- [ ] Discovered a workaround, pattern, or convention?
- [ ] Skill file updated (or created)?
- [ ] Committed in this same PR?

## Canonical sources

| Topic                     | Source                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Task → skill router       | [`docs/SKILL.md`](docs/SKILL.md)                                         |
| Skill improvement mandate | [`docs/skills/skill-improvement.md`](docs/skills/skill-improvement.md)   |
| Component testing         | [`docs/skills/component-testing.md`](docs/skills/component-testing.md)   |
| Giscus discussions        | [`docs/skills/giscus-discussions.md`](docs/skills/giscus-discussions.md) |
| Design records            | [`adr/README.md`](adr/README.md)                                         |
| Factory model, cross-repo | `projectbluefin/common` → `docs/factory/agentic-model.md`                |
| Factory onboarding        | `projectbluefin/common` → `docs/skills/factory-onboarding.md`            |
