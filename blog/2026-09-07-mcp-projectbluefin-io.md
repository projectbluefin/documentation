---
title: "Announcing mcp.projectbluefin.io"
slug: mcp-projectbluefin-io
authors: castrojo
tags: [announcements, ai]
date: 2026-09-07T15:00:00-04:00
---

[Model Context Protocol](https://aaif.io/projects/model-context-protocol) (MCP) is an open protocol for LLMs and agents to talk to each other. We're now serving the Project Bluefin organization knowledge base and live factory state at `https://mcp.projectbluefin.io/mcp`.

<!-- truncate -->

Right now [hive.projectbluefin.io](https://hive.projectbluefin.io) exposes an API that has things that are useful for agents. We use it to dole out work to volunteers and to get [review tasks](https://github.com/projectbluefin/review). This is what's letting us scale out in ways we haven't been able to before. Hive has a nice Knowledge Base that it exposes, so this initial cut is to search that knowledge. This is mostly useful to connect whatever agent you use to our stuff and get context for your agent. So if you want to do Bluefin things you just add this. 

## Endpoint Details

- **URL:** `https://mcp.projectbluefin.io/mcp`
- **Transport:** Streamable HTTP / Server-Sent Events (SSE)
- **Authentication:** None (public, read-only)
- **Health Check:** `https://mcp.projectbluefin.io/health`

## Available Tools

Here's what's exposed: 

| Tool                 | Description                                                                                                                                   | Parameters                                                         |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `search_knowledge`   | Search Project Bluefin knowledge base: engineering patterns, test coverage gaps, CI conventions, and repo findings across `projectbluefin/*`. | `query` (string, required)<br />`limit` (integer 1–25, default 10) |
| `get_factory_status` | Live factory status from Hive: hub health, active contributors, actionable items, per-tier limits.                                            | None                                                               |
| `get_work_queue`     | Live work queue and triage state from Hive: issues ready to implement and triage grouping.                                                    | `limit` (integer 1–25, default 10)                                 |
| `get_index_status`   | Operational health, record count, and timestamp of the published knowledge index.                                                             | None                                                               |
| `get_quickstart`     | Onboarding checklists (`first-pr`, `run-tests`, `factory-gates`, `branch-rules`).                                                             | `topic` (enum, required)                                           |
| `get_repository_map` | High-level component map, entrypoints, and branch targets for `bluefin`, `bluefin-lts`, `common`, `dakota`, `documentation`.                  | `repo` (enum, required)                                            |

## Related Reading

- [Why Bluefin is all in on agentic development](/blog/bluefin-agentic-development)
- [Bluefin's Sausage Factory](/blog/bluefins-sausage-factory)
- [The Future of Bluefin - Time to be Honest](/blog/the-future-of-bluefin-time-to-be-honest)
- [Bluefin: Welcome to the Jungle](/blog/welcome-to-the-jungle)
- [Agentic Contributor Guide](/agentic-contributing)
