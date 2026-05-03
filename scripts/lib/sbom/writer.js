/**
 * Atomic JSON file writer.
 *
 * Writes to a .tmp file then renames to avoid leaving truncated JSON on
 * process interruption.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Atomically write a JSON object to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {string} filePath  Absolute path to the output file.
 * @param {object} data      Object to serialise as JSON.
 */
function atomicWriteJson(filePath, data) {
  const outDir = path.dirname(filePath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const tmpFile = filePath + ".tmp";
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, filePath);
}

module.exports = { atomicWriteJson };
