const test = require("node:test");
const assert = require("node:assert/strict");

const { unavailablePayload } = require("./lib/data-fallback.js");

test("unavailablePayload preserves the output shape and adds visible state", () => {
  assert.deepEqual(
    unavailablePayload("GitHub is unavailable.", { items: [] }),
    {
      items: [],
      unavailable: true,
      stateReason: "GitHub is unavailable.",
    },
  );
});
