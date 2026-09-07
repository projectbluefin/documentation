---
title: "Announcing mcp.projectbluefin.io"
slug: mcp-projectbluefin-io
authors: castrojo
tags: [announcements, ai]
date: 2026-09-07T15:00:00-04:00
---

Public Model Context Protocol (MCP) endpoint serving the Project Bluefin organization knowledge base and live factory state at `https://mcp.projectbluefin.io/mcp`.

<!-- truncate -->

:::note Maintainer Note
<!-- Maintainer exposition and commentary goes here -->

:::

## Endpoint Details

- **URL:** `https://mcp.projectbluefin.io/mcp`
- **Transport:** Streamable HTTP / Server-Sent Events (SSE)
- **Authentication:** None (public, read-only)
- **Health Check:** `https://mcp.projectbluefin.io/health`

## Available Tools

| Tool                 | Description                                                                                                                                   | Parameters                                                         |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `search_knowledge`   | Search Project Bluefin knowledge base: engineering patterns, test coverage gaps, CI conventions, and repo findings across `projectbluefin/*`. | `query` (string, required)<br />`limit` (integer 1–25, default 10) |
| `get_factory_status` | Live factory status from Hive: hub health, active contributors, actionable items, per-tier limits.                                            | None                                                               |
| `get_work_queue`     | Live work queue and triage state from Hive: issues ready to implement and triage grouping.                                                    | `limit` (integer 1–25, default 10)                                 |
| `get_index_status`   | Operational health, record count, and timestamp of the published knowledge index.                                                             | None                                                               |
| `get_quickstart`     | Onboarding checklists (`first-pr`, `run-tests`, `factory-gates`, `branch-rules`).                                                             | `topic` (enum, required)                                           |
| `get_repository_map` | High-level component map, entrypoints, and branch targets for `bluefin`, `bluefin-lts`, `common`, `dakota`, `documentation`.                  | `repo` (enum, required)                                            |

## Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "projectbluefin": {
      "type": "http",
      "url": "https://mcp.projectbluefin.io/mcp"
    }
  }
}
```

### VS Code / Cursor

Add to `.vscode/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "projectbluefin": {
      "type": "http",
      "url": "https://mcp.projectbluefin.io/mcp"
    }
  }
}
```

### GitHub Copilot CLI

```bash
copilot mcp add --type http projectbluefin https://mcp.projectbluefin.io/mcp
```

### Goose

Add to `~/.config/goose/config.yaml`:

```yaml
extensions:
  projectbluefin:
    type: sse
    uri: https://mcp.projectbluefin.io/mcp
```

### Health Probe

Verify connectivity using the lightweight health probe:

```bash
curl -s https://mcp.projectbluefin.io/health
```

Expected output:

```json
{ "status": "ok", "endpoint": "/mcp" }
```

---

## Related Reading

- [Why Bluefin is all in on agentic development](/blog/bluefin-agentic-development)
- [Bluefin's Sausage Factory](/blog/bluefins-sausage-factory)
- [The Future of Bluefin - Time to be Honest](/blog/the-future-of-bluefin-time-to-be-honest)
- [Bluefin: Welcome to the Jungle](/blog/welcome-to-the-jungle)
- [Agentic Contributor Guide](/agentic-contributing)
