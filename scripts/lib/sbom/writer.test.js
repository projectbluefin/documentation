const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { atomicWriteJson } = require("./writer.js");

test("atomicWriteJson writes valid JSON to file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "test.json");

  atomicWriteJson(filePath, { hello: "world", count: 42 });

  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assert.deepEqual(content, { hello: "world", count: 42 });

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson creates parent directories", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "nested", "deep", "output.json");

  atomicWriteJson(filePath, { nested: true });

  assert.ok(fs.existsSync(filePath));
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assert.deepEqual(content, { nested: true });

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson overwrites existing file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "test.json");

  atomicWriteJson(filePath, { version: 1 });
  atomicWriteJson(filePath, { version: 2 });

  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assert.deepEqual(content, { version: 2 });

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson does not leave .tmp file on success", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "test.json");

  atomicWriteJson(filePath, { clean: true });

  assert.ok(!fs.existsSync(filePath + ".tmp"));
  assert.ok(fs.existsSync(filePath));

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson produces pretty-printed JSON with 2-space indent", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "test.json");

  atomicWriteJson(filePath, { key: "value" });

  const raw = fs.readFileSync(filePath, "utf-8");
  assert.equal(raw, JSON.stringify({ key: "value" }, null, 2));

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson handles empty object", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "empty.json");

  atomicWriteJson(filePath, {});

  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assert.deepEqual(content, {});

  fs.rmSync(tmpDir, { recursive: true });
});

test("atomicWriteJson handles arrays", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  const filePath = path.join(tmpDir, "array.json");

  atomicWriteJson(filePath, [1, 2, 3]);

  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assert.deepEqual(content, [1, 2, 3]);

  fs.rmSync(tmpDir, { recursive: true });
});
