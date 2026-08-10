---
name: skill-improvement
description: >-
  The two-output rule for this repository: every session ships the work and the
  learning. Load when finishing a task, when you hit a workaround worth
  remembering, or when tempted to write a changelog.
---

# Skill improvement

The factory gets smarter only if agents write back what they learn. Without
that, every session starts from zero.

## The two-output rule

Every session produces two outputs:

1. **The work** — the PR, fix, or feature.
2. **The learning** — what a future agent needs to know.

Output 1 without output 2 means the factory did not improve. The learning goes
in `docs/skills/`, in the **same pull request**, never a follow-up.

## What earns a skill file

Something non-obvious, repeatable, and expensive to rediscover. Two real
examples from this repository:

- `npm run prettier-lint` cannot pass — roughly 150 files already fail it, so
  the gate is per-path. An agent that does not know this either wastes a cycle
  or reformats the repository and buries its own diff.
- A tracked data seed cannot use file mtime as a cache key, because `git
checkout` stamps every tracked file with the current time and the TTL never
  expires in CI. This cost a shipped build before it was caught.
- **Run prettier before the final test run, not after.** Formatting rewraps
  long lines, so any assertion that reads whole lines can pass locally and then
  fail in CI. This broke a production deploy once already; the fix is to parse
  the thing you are asserting on rather than its layout.
- When a service transforms what you publish, **fetch the transformed result
  back and diff it against the source**. The hive sanitizes a custom stylesheet
  server-side; four rounds of "looks right in the repository" shipped a theme
  that rendered as a no-op, and only the diff showed which rules had been
  silently discarded and why.
- Music playlist metadata is ignored build output, while cached playlist
  thumbnails under `static/img/playlists/` are tracked. Adding a playlist
  requires updating both `docs/music.md` and the `PLAYLISTS` list in
  `scripts/fetch-playlist-metadata.js`, running `npm run fetch-playlists`, and
  committing only the new thumbnail.

Each is invisible from the source alone. Each would be paid again by the next
agent. That is the bar.

## What does not earn one

A restatement of what the code already says. A summary of a task. A list of
files changed. If a reader could learn it faster by opening the file, it is not
a skill.

## Banned

- **Changelog files.** `IMPROVEMENTS.md`, `CHANGELOG.md`, `CHANGES.md`,
  `SESSION.md` and friends. Agents append to them instead of updating skills,
  and the result is a stale log beside skill files nobody maintained. Delete on
  sight.
- **Session notes in the repository.** `NOTES.md`, `PLAN.md`, `TODO.md`,
  progress files. They become stale context that misleads every future agent.
  Session state lives in the agent's session folder.
- **"Append here" instructions.** Any document inviting an append is a
  hallucination magnet. Route to `docs/skills/<file>.md` instead.

## Before marking work done

- [ ] Discovered a workaround, pattern, or convention?
- [ ] Skill file updated, or created and added to [`docs/SKILL.md`](../SKILL.md)?
- [ ] Committed in this same pull request?

## A caveat specific to this repository

`docs/` is mounted at `routeBasePath: "/"`, so every file here **publishes** to
[docs.projectbluefin.io](https://docs.projectbluefin.io/). Skills are written for a public audience.
Internal design reasoning belongs in `adr/` at the repository root, which does
not publish.
