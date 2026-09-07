"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * Build a visible, build-safe unavailable payload while preserving any
 * shape-specific fields the consumer needs for graceful rendering.
 */
function unavailablePayload(stateReason, shape = {}) {
  return {
    ...shape,
    unavailable: true,
    stateReason: String(stateReason || "Data is unavailable."),
  };
}

/**
 * Write JSON atomically so an interrupted fetch cannot leave a truncated
 * dataset for the next build.
 */
function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
  return payload;
}

function writeUnavailable(filePath, stateReason, shape = {}) {
  return writeJson(filePath, unavailablePayload(stateReason, shape));
}

module.exports = {
  unavailablePayload,
  writeJson,
  writeUnavailable,
};
