# 0001. Agent design change authorization

- **Status:** Accepted
- **Date:** 2026-08-07
- **Deciders:** @castrojo

## Context

`AGENTS.md` drew an absolute boundary: agents edit content only, never design. Any
request needing design had to "stop and ask a maintainer."

The rule was right about the risk it was guarding. Agents that redesign a page to
satisfy a content request produce drive-by CSS, parallel components, and quiet
changes to fetch and fallback behavior on data-backed pages. That risk is real and
the boundary should stay.

But the document described no state after approval. A maintainer could approve a
design change and there was still no mode in which an agent could implement it.
Every design task was therefore permanently undelegatable, no matter who
authorized it or how clearly it was specified. In practice this leaves two bad
options: the maintainer hand-writes all design work and becomes a bottleneck, or
design work gets smuggled through as "content" and the boundary erodes by
precedent.

The trigger was a planned modernization of `/hive`, which is unambiguously a
design change to a data-backed page — exactly the work the old document could
neither authorize nor refuse cleanly.

## Decision

`AGENTS.md` defines two modes.

**Default mode is content only**, with the same prohibitions as before.

**Authorized mode** permits a design change when it traces to an approved record
in `adr/`. That record is the authorization. The agent implements what the record
specifies, cites it in the commit and pull request, and stops to report back if
the record turns out to be wrong or incomplete.

An agent may draft a record when asked but may never approve its own
authorization, and verbal approval in chat does not count. The record must exist
before implementation code is written.

Records live in `adr/` at the repository root, not `docs/`, because the docs
plugin is mounted at `routeBasePath: "/"` and anything under `docs/` publishes.

## Scope

**In scope:** the boundary model in `AGENTS.md`, the `adr/` directory, its README
and template, and this record.

**Out of scope:** any change to `/hive`, its components, or its data pipeline.
That work needs its own record.

## Consequences

Design work becomes delegatable once it is specified, which is the point. The cost
is that specifying it is now real work — someone must write the record before code
starts, and vaguely specified design work will be refused rather than
improvised.

The boundary gets stronger, not weaker. "Stop and ask a maintainer" previously had
no defined resolution, so pressure built to reinterpret design as content.
Escalation now has somewhere to go.

`adr/` must stay out of `docs/`, or the records publish to the documentation site.

## Alternatives considered

**Leave `AGENTS.md` unchanged; humans write all design code.** Safest, and it
keeps the document short. Rejected because it makes the maintainer the sole
implementer of every design change, including rewrites of components in the
thousands of lines, and it does nothing about the pressure to relabel design as
content.

**Record a one-off exception in the ticket or pull request.** Cheapest for a single
task. Rejected because the same gap reappears on the next design task, and a
precedent of ad-hoc exceptions erodes the rule faster than amending it honestly
does.

**Enumerate specific always-allowed design changes** (for example, "tabs are
fine"). Rejected because the list cannot anticipate real requests, and every
entry is a permanent hole that applies even where it does not fit.
