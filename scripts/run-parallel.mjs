#!/usr/bin/env node
/**
 * Run npm scripts concurrently and propagate their exit status.
 *
 * Replaces the `npm run a & npm run b & wait` fan-out, where a bare `wait`
 * always returns 0 and therefore discards every child's exit code.
 *
 * Usage: node scripts/run-parallel.mjs <script> [<script> ...]
 */

import { spawn } from "node:child_process";

const scripts = process.argv.slice(2);

if (scripts.length === 0) {
  console.error("run-parallel: no scripts given");
  process.exit(2);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(script) {
  return new Promise((resolve) => {
    const child = spawn(npm, ["run", script], { stdio: "inherit" });
    child.on("error", (err) => {
      console.error(
        `run-parallel: failed to spawn "${script}": ${err.message}`,
      );
      resolve({ script, code: 1, signal: null });
    });
    child.on("close", (code, signal) => resolve({ script, code, signal }));
  });
}

const results = await Promise.all(scripts.map(run));
const failed = results.filter((r) => r.signal !== null || r.code !== 0);

if (failed.length > 0) {
  for (const { script, code, signal } of failed) {
    console.error(
      `run-parallel: "${script}" failed (${signal ? `signal ${signal}` : `exit ${code}`})`,
    );
  }
  console.error(
    `run-parallel: ${failed.length} of ${results.length} script(s) failed`,
  );
  process.exit(1);
}
