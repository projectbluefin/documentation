const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyKernelPin,
  extractKernelPin,
} = require("./fetch-pin-state.js");

test("extractKernelPin reads kernel-pin values and ignores missing pins", () => {
  assert.equal(extractKernelPin("kernel-pin: 6.12.30-204 # comment"), "6.12.30-204");
  assert.equal(extractKernelPin("name: build-regular-hwe"), null);
});

test("applyKernelPin stores a stream pin and rejects conflicting values", () => {
  const streamPins = {};

  applyKernelPin(streamPins, "bluefin-lts", "6.12.30-204", "build-regular-hwe.yml");
  assert.deepEqual(streamPins, {
    "bluefin-lts": { hweKernel: "6.12.30-204" },
  });

  assert.throws(
    () => applyKernelPin(streamPins, "bluefin-lts", "6.12.31-204", "build-dx-hwe.yml"),
    /Conflicting hweKernel pins/,
  );
});
