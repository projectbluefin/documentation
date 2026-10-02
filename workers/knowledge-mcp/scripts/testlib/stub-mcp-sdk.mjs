// Minimal stand-in for `@modelcontextprotocol/sdk/server/mcp.js`.
//
// Records what the Worker registers so a test can call a tool handler directly
// instead of speaking the MCP wire protocol.
export class McpServer {
  constructor(info) {
    this.info = info;
    this.tools = new Map();
  }

  registerTool(name, config, handler) {
    this.tools.set(name, { config, handler });
  }
}
