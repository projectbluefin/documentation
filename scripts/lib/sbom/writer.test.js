/**
 * Unit coverage for scripts/lib/sbom/writer.js — atomicWriteJson.
 *
 * This writer exists so an interrupted fetch cannot leave a truncated
 * static/data JSON file behind for the site build to parse. The atomicity
 * (write .tmp, then rename) and the mkdir-p behaviour were unasserted.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { atomicWriteJson } = require("./writer.js");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sbom-writer-"));
}

test("writes valid JSON that round trips", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  const data = { stream: "gts", packages: { kernel: "6.17.4" }, count: 1 };
  atomicWriteJson(file, data);

  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf-8")), data);
});

test("serialises with two-space indentation", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  atomicWriteJson(file, { a: 1 });

  assert.equal(fs.readFileSync(file, "utf-8"), '{\n  "a": 1\n}');
});

test("creates missing parent directories", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "deep", "nested", "out.json");
  atomicWriteJson(file, { ok: true });

  assert.equal(JSON.parse(fs.readFileSync(file, "utf-8")).ok, true);
});

test("leaves no .tmp file behind on success", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  atomicWriteJson(file, { a: 1 });

  assert.deepEqual(fs.readdirSync(dir), ["out.json"]);
  assert.equal(fs.existsSync(file + ".tmp"), false);
});

test("overwrites an existing file completely rather than appending", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  atomicWriteJson(file, { long: "a".repeat(200), keep: false });
  atomicWriteJson(file, { keep: true });

  const raw = fs.readFileSync(file, "utf-8");
  assert.deepEqual(JSON.parse(raw), { keep: true });
  assert.ok(!raw.includes("aaaa"));
});

test("the destination is never partially written — rename is the publish step", (t) => {
  // If the writer truncated the destination first, an interrupted run would
  // leave unparseable JSON for the site build. Assert the pre-rename state:
  // the payload lands in the .tmp path while the destination still holds the
  // previous complete document.
  const dir = tmpDir();
  const realRename = fs.renameSync;
  t.after(() => {
    fs.renameSync = realRename;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const file = path.join(dir, "out.json");
  atomicWriteJson(file, { generation: 1 });

  let destinationAtRename;
  fs.renameSync = (from, to) => {
    destinationAtRename = fs.readFileSync(file, "utf-8");
    return realRename(from, to);
  };
  atomicWriteJson(file, { generation: 2 });

  assert.deepEqual(JSON.parse(destinationAtRename), { generation: 1 });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf-8")), {
    generation: 2,
  });
});

test("writes through the sibling .tmp path so the rename stays on one filesystem", (t) => {
  // A cross-device rename raises EXDEV; keeping the temp file beside the
  // destination is what makes the rename atomic.
  const dir = tmpDir();
  const realRename = fs.renameSync;
  t.after(() => {
    fs.renameSync = realRename;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const file = path.join(dir, "out.json");
  let observed;
  fs.renameSync = (from, to) => {
    observed = { from, to };
    return realRename(from, to);
  };
  atomicWriteJson(file, { a: 1 });

  assert.equal(observed.from, file + ".tmp");
  assert.equal(observed.to, file);
  assert.equal(path.dirname(observed.from), path.dirname(observed.to));
});

test("handles nested arrays and unicode without escaping to ASCII", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  const data = {
    images: [{ name: "bluefin", tags: ["gts", "latest"] }],
    note: "✅ ok",
  };
  atomicWriteJson(file, data);

  const raw = fs.readFileSync(file, "utf-8");
  assert.ok(raw.includes("✅"));
  assert.deepEqual(JSON.parse(raw), data);
});

test("propagates a serialisation failure instead of writing a broken file", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const file = path.join(dir, "out.json");
  const cyclic = {};
  cyclic.self = cyclic;

  assert.throws(() => atomicWriteJson(file, cyclic), TypeError);
  assert.equal(fs.existsSync(file), false);
});

test("writes to an already existing directory without failing", (t) => {
  const dir = tmpDir();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const nested = path.join(dir, "existing");
  fs.mkdirSync(nested);
  const file = path.join(nested, "out.json");

  atomicWriteJson(file, { a: 1 });
  atomicWriteJson(file, { a: 2 });

  assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf-8")), { a: 2 });
});
