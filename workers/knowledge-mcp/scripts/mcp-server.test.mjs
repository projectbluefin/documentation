import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function mockEnv(overrides = {}) {
  return {
    KB: {
      get: async (key) => {
        if (key === "knowledge-index") {
          return {
            generated: "2026-09-07T12:00:00Z",
            count: 42,
            entries: [
              {
                title: "Test Entry",
                body: "Body text with patterns",
                file: "path/to/file.md",
                raw: "## Test Entry\nBody text",
              },
            ],
          };
        }
        return null;
      },
      put: async () => {},
    },
    HIVE_TOKEN: "mock-token",
    ...overrides,
  };
}

async function sendMcpRequest(
  payload,
  { origin = "https://docs.projectbluefin.io", host = "localhost" } = {},
) {
  const req = new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      host,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      origin,
    },
    body: JSON.stringify(payload),
  });
  return worker.fetch(req, mockEnv(), {});
}

test("health probe returns ok without touching KV", async () => {
  const req = new Request("http://localhost/health");
  const res = await worker.fetch(req, mockEnv(), {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data, { status: "ok", endpoint: "/mcp" });
});

test("initialize request succeeds with modern streamable HTTP and sets CORS", async () => {
  const res = await sendMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  });

  assert.equal(res.status, 200);
  assert.equal(
    res.headers.get("access-control-allow-origin"),
    "https://docs.projectbluefin.io",
  );
  const text = await res.text();
  assert.match(text, /"protocolVersion":"2024-11-05"/);
  assert.match(text, /"name":"projectbluefin-knowledge"/);
});

test("tools/list exposes onboarding tools alongside knowledge tools", async () => {
  const res = await sendMcpRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });

  assert.equal(res.status, 200);
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/);
  assert.ok(match, "must receive sse data line");
  const data = JSON.parse(match[1]);
  const toolNames = data.result.tools.map((t) => t.name);

  assert.ok(toolNames.includes("search_knowledge"));
  assert.ok(toolNames.includes("get_factory_status"));
  assert.ok(toolNames.includes("get_work_queue"));
  assert.ok(toolNames.includes("get_index_status"));
  assert.ok(toolNames.includes("get_quickstart"));
  assert.ok(toolNames.includes("get_repository_map"));
});

test("get_quickstart returns onboarding steps", async () => {
  const res = await sendMcpRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "get_quickstart",
      arguments: { topic: "first-pr" },
    },
  });

  assert.equal(res.status, 200);
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/);
  assert.ok(match, "must receive sse data line");
  const data = JSON.parse(match[1]);
  assert.ok(!data.error, "must not return error");
  const content = JSON.parse(data.result.content[0].text);
  assert.equal(content.topic, "first-pr");
  assert.ok(content.steps.length > 0);
});

test("get_repository_map returns repository details", async () => {
  const res = await sendMcpRequest({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_repository_map",
      arguments: { repo: "documentation" },
    },
  });

  assert.equal(res.status, 200);
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/);
  assert.ok(match, "must receive sse data line");
  const data = JSON.parse(match[1]);
  assert.ok(!data.error, "must not return error");
  const content = JSON.parse(data.result.content[0].text);
  assert.equal(content.repo, "documentation");
  assert.equal(content.target_branch, "main");
});

test("get_index_status returns operational health", async () => {
  const res = await sendMcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "get_index_status",
      arguments: {},
    },
  });

  assert.equal(res.status, 200);
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/);
  assert.ok(match, "must receive sse data line");
  const data = JSON.parse(match[1]);
  assert.ok(!data.error, "must not return error");
  const content = JSON.parse(data.result.content[0].text);
  assert.equal(content.status, "healthy");
  assert.equal(content.count, 42);
});
