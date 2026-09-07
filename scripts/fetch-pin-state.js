/**
 * fetch-pin-state.js
 *
 * Reads bluefin-lts HWE workflow YAML files from the GitHub Contents API
 * and extracts any `kernel-pin` (or future `*-pin`) workflow inputs.
 * Writes static/data/stream-pins.json consumed by the docs UI to render
 * 📌 "Pinned" badges next to intentionally-held component versions.
 *
 * Usage: node scripts/fetch-pin-state.js
 */

const path = require("path");
const { writeJson, writeUnavailable } = require("./lib/data-fallback");
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static",
  "data",
  "stream-pins.json",
);

const WORKFLOWS_TO_CHECK = [
  {
    repo: "projectbluefin/bluefin-lts",
    path: ".github/workflows/build-regular-hwe.yml",
    stream: "bluefin-lts",
  },
  {
    repo: "projectbluefin/bluefin-lts",
    path: ".github/workflows/build-dx-hwe.yml",
    stream: "bluefin-lts",
  },
];

async function fetchWorkflowContent(repo, filePath) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    "User-Agent": "bluefin-docs/fetch-pin-state",
    Accept: "application/vnd.github.v3+json",
    ...(GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(
      `GitHub API error for ${repo}/${filePath}: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return Buffer.from(data.content, "base64").toString("utf8");
}

/**
 * Extract `kernel-pin` value from a workflow YAML string.
 * Matches the pattern:   kernel-pin: <version>
 */
function extractKernelPin(yamlContent) {
  const match = yamlContent.match(/kernel-pin:\s*([^\s\n#]+)/);
  return match ? match[1].trim() : null;
}

function applyKernelPin(streamPins, stream, kernelPin, filePath) {
  if (!streamPins[stream]) {
    streamPins[stream] = {};
  }

  if (!kernelPin) {
    return streamPins;
  }

  const existing = streamPins[stream].hweKernel;
  if (existing && existing !== kernelPin) {
    throw new Error(
      `Conflicting hweKernel pins for ${stream}: ${existing} vs ${kernelPin} (from ${filePath})`,
    );
  }

  streamPins[stream].hweKernel = kernelPin;
  return streamPins;
}

async function main() {
  const streamPins = {};
  const failures = [];

  for (const { repo, path: filePath, stream } of WORKFLOWS_TO_CHECK) {
    try {
      console.log(`Fetching ${repo}/${filePath}...`);
      const content = await fetchWorkflowContent(repo, filePath);
      const kernelPin = extractKernelPin(content);

      applyKernelPin(streamPins, stream, kernelPin, filePath);

      if (kernelPin) {
        console.log(`  ${stream} hweKernel pin: ${kernelPin}`);
      } else {
        console.log(`  ${stream}: no kernel-pin found (floating)`);
      }
    } catch (err) {
      const reason = `could not fetch ${repo}/${filePath}: ${err.message}`;
      console.warn(`  Warning: ${reason}`);
      failures.push(reason);
      // Non-fatal: keep any previously discovered pin for this stream.
    }
  }

  // Ensure all known streams appear in the output, even if empty (= all floating).
  for (const stream of ["bluefin-stable", "bluefin-lts"]) {
    if (!streamPins[stream]) {
      streamPins[stream] = {};
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    streams: streamPins,
    unavailable: failures.length > 0,
    stateReason:
      failures.length > 0
        ? `Pin state was unavailable for ${failures.length} workflow(s): ${failures.join("; ")}`
        : null,
  };

  writeJson(OUTPUT_FILE, output);
  console.log(`Wrote ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    writeUnavailable(
      OUTPUT_FILE,
      `Pin state could not be generated: ${err.message}`,
      { generatedAt: new Date().toISOString(), streams: {} },
    );
    process.exitCode = 0;
  });
}

module.exports = {
  applyKernelPin,
  extractKernelPin,
};
