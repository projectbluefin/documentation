// Minimal stand-in for `agents/mcp/server`.
//
// Captures the factory and the routing options the Worker passes, and answers
// with a recognisable response so `fetch` can be asserted end to end.
export function createMcpHandler(factory, options) {
  const handler = async (request, env, ctx) => {
    handler.calls.push({ request, env, ctx });
    handler.server = factory();
    return Response.json({ stub: "mcp", route: options.route });
  };
  handler.calls = [];
  handler.options = options;
  handler.server = null;
  createMcpHandler.handlers.push(handler);
  return handler;
}

createMcpHandler.handlers = [];
