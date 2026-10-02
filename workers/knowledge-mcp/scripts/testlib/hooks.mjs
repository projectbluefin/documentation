// Module resolve hooks that let `src/index.js` load under `node --test` with
// no `npm install`.
//
// The Worker imports `agents/mcp/server`, the MCP SDK and `zod`. The CI job
// for this package runs `npm test` without installing anything, because every
// other module here needs only `node:` builtins and `src/`. Mapping those three
// specifiers to local stubs keeps that property while still executing the real
// Worker code.
const STUBS = new Map([
  ["agents/mcp/server", "./stub-agents.mjs"],
  ["@modelcontextprotocol/sdk/server/mcp.js", "./stub-mcp-sdk.mjs"],
  ["zod", "./stub-zod.mjs"],
]);

export function resolve(specifier, context, nextResolve) {
  const stub = STUBS.get(specifier);
  if (stub) {
    return { url: new URL(stub, import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
