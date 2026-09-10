const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyKernelPin,
  extractKernelPin,
  WORKFLOWS_TO_CHECK,
} = require("./fetch-pin-state.js");

test("WORKFLOWS_TO_CHECK targets active Bluefin LTS workflows and image version sources", () => {
  const paths = WORKFLOWS_TO_CHECK.map((w) => w.path);

  assert.ok(paths.includes(".github/workflows/build-regular.yml"));
  assert.ok(paths.includes(".github/workflows/build-nvidia.yml"));
  assert.ok(paths.includes("image-versions.yaml"));

  // Verify removed paths are no longer configured
  assert.ok(!paths.includes(".github/workflows/build-regular-hwe.yml"));
  assert.ok(!paths.includes(".github/workflows/build-dx-hwe.yml"));

  for (const entry of WORKFLOWS_TO_CHECK) {
    assert.equal(entry.repo, "projectbluefin/bluefin-lts");
    assert.equal(entry.stream, "bluefin-lts");
  }
});

test("extractKernelPin reads kernel-pin values and ignores missing pins", () => {
  assert.equal(
    extractKernelPin("kernel-pin: 6.12.30-204 # comment"),
    "6.12.30-204",
  );
  assert.equal(extractKernelPin("kernel_pin: 6.12.30-204"), "6.12.30-204");
  assert.equal(extractKernelPin('kernel-pin: "6.12.30-204"'), "6.12.30-204");
  assert.equal(extractKernelPin("kernel_pin: '6.12.30-204'"), "6.12.30-204");
  assert.equal(
    extractKernelPin("pins:\n  kernel: 6.12.30-204\n"),
    "6.12.30-204",
  );
  assert.equal(
    extractKernelPin("pins:\n  gnome: 50\n  kernel: '6.12.30-204'\n"),
    "6.12.30-204",
  );
  assert.equal(extractKernelPin("name: build-regular"), null);
  assert.equal(extractKernelPin("name: build-regular-hwe"), null);
  assert.equal(extractKernelPin(""), null);
  assert.equal(extractKernelPin(null), null);
});

test("applyKernelPin stores a stream pin and rejects conflicting values", () => {
  const streamPins = {};

  applyKernelPin(
    streamPins,
    "bluefin-lts",
    "6.12.30-204",
    ".github/workflows/build-regular.yml",
  );
  assert.deepEqual(streamPins, {
    "bluefin-lts": { hweKernel: "6.12.30-204" },
  });

  // Matching pin from another file should not throw
  applyKernelPin(
    streamPins,
    "bluefin-lts",
    "6.12.30-204",
    ".github/workflows/build-nvidia.yml",
  );
  assert.deepEqual(streamPins, {
    "bluefin-lts": { hweKernel: "6.12.30-204" },
  });

  // Conflicting pin should throw
  assert.throws(
    () =>
      applyKernelPin(
        streamPins,
        "bluefin-lts",
        "6.12.31-204",
        "image-versions.yaml",
      ),
    /Conflicting hweKernel pins/,
  );

  // Null pin should not overwrite existing pin
  applyKernelPin(
    streamPins,
    "bluefin-lts",
    null,
    ".github/workflows/build-regular.yml",
  );
  assert.equal(streamPins["bluefin-lts"].hweKernel, "6.12.30-204");
});
