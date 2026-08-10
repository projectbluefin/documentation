---
name: skill-improvement
description: >-
  The two-output rule for this repository: every session ships the work and the
  learning. Use when finishing a task, when you hit a workaround worth
  remembering, or when tempted to write a changelog.
---

# Skill improvement

The factory gets smarter only if agents write back what they learn. Without
that, every session starts from zero.

## When to Use

- Use when finishing a non-trivial implementation, fix, or documentation task.
- Use when a workaround, convention, or failure mode would be expensive for the
  next agent to rediscover.
- Use before creating a changelog or session note to route the learning to a
  maintained skill instead.

## When NOT to Use

- Do not use for read-only research or audits that produce no repository output.
- Do not record facts that are obvious from the source, task-specific status,
  or personal and sensitive information.

## Core Process

1. Ship the requested work and verify it.
2. Extract one reusable, non-obvious lesson from the work.
3. Put that lesson in the smallest relevant `docs/skills/` file.
4. Commit the skill update with the work in the same pull request.
5. Re-read the skill as a new agent and remove status reports, dates, and
   resolved issue lists.

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

## Red Flags

- The session ends with implementation changes but no skill update.
- A skill contains dates, resolved work items, live status, or a running
  backlog.
- The learning is a summary of changed files rather than an operating rule.
- A future agent would need to infer the workaround from commit history.

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

## Verification

- [ ] The skill has frontmatter with a name and trigger-bearing description.
- [ ] The skill explains when to use it and when not to use it.
- [ ] The skill contains a numbered core process.
- [ ] The learning is timeless, reusable, and free of session state.
- [ ] The skill update is committed with the implementation.

## Before marking work done

- [ ] Discovered a workaround, pattern, or convention?
- [ ] Skill file updated, or created and added to [`docs/SKILL.md`](../SKILL.md)?
- [ ] Committed in this same pull request?

## A caveat specific to this repository

`docs/` is mounted at `routeBasePath: "/"`, so every file here **publishes** to
[docs.projectbluefin.io](https://docs.projectbluefin.io/). Skills are written for a public audience.
Internal design reasoning belongs in `adr/` at the repository root, which does
not publish.

## Sources

- `/addyosmani/agent-skills` via Context7: canonical skill anatomy and section
  requirements.
