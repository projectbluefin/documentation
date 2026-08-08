# Design decisions

This directory holds design decisions for the documentation site. A record here is
what authorizes an agent to make a design change — see the boundary section in
`AGENTS.md`.

This directory sits at the repository root **on purpose**. The docs plugin is
mounted at `routeBasePath: "/"`, so anything placed under `docs/` becomes a
published page. Design records are internal and must not publish.

## When you need a record

You need one for any change to layout, CSS, component behavior, animation, page
structure, JSX or HTML structure, routes, navigation, data shapes, fetch timing,
API endpoints, or fallback behavior.

You do not need one for prose, frontmatter, links, alt text, captions, blog
metadata, authors, report text, or a content item added to an existing component
in its existing format.

## Rules

- A maintainer writes and approves the record. An agent may draft one when asked,
  but may not approve its own authorization.
- The record must exist before implementation code is written.
- Implementation covers what the record specifies and nothing more.
- If implementation shows the record is wrong or incomplete, stop and report back
  rather than amending it in passing.

## Format

Name files `NNNN-short-title.md`, numbered sequentially. Use `template.md` as a
starting point. Keep each record to one decision — split anything larger.

Set `Status` to `Proposed`, `Accepted`, `Superseded by NNNN`, or `Rejected`.
Leave accepted records in place when they are superseded; supersede, do not
delete, so the reasoning stays readable.

## Index

| ADR                                          | Title                                                          | Status   |
| -------------------------------------------- | -------------------------------------------------------------- | -------- |
| [0001](0001-agent-design-authorization.md)   | Agent design change authorization                              | Accepted |
| [0002](0002-factory-page.md)                 | Rename /hive to /factory and absorb factory content            | Accepted |
| [0003](0003-factory-two-level-navigation.md) | Two-level navigation for /factory and first-party chart parity | Accepted |
