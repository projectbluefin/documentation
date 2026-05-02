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

const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join(__dirname, "..", "static", "data", "stream-pins.json");

const WORKFLOWS_TO_CHECK = [
  {
    repo: "ublue-os/bluefin-lts",
    path: ".github/workflows/build-regular-hwe.yml",
    stream: "bluefin-lts",
  },
  {
    repo: "ublue-os/bluefin-lts",
    path: ".github/workflows/build-dx-hwe.yml",
    stream: "bluefin-lts",
  },
];

async function fetchWorkflowContent(repo, filePath) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = {
    "User-Agent": "bluefin-docs/fetch-pin-state",
    Accept: "application/vnd.github.v3+json",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error for ${repo}/${filePath}: ${response.status} ${response.statusText}`);
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

async function main() {
  const streamPins = {};

  for (const { repo, path: filePath, stream } of WORKFLOWS_TO_CHECK) {
    try {
      console.log(`Fetching ${repo}/${filePath}...`);
      const content = await fetchWorkflowContent(repo, filePath);
      const kernelPin = extractKernelPin(content);

      if (!streamPins[stream]) {
        streamPins[stream] = {};
      }

      if (kernelPin) {
        // Both HWE workflows should have the same pin; last-write wins (consistent).
        streamPins[stream].hweKernel = kernelPin;
        console.log(`  ${stream} hweKernel pin: ${kernelPin}`);
      } else {
        console.log(`  ${stream}: no kernel-pin found (floating)`);
      }
    } catch (err) {
      console.warn(`  Warning: could not fetch ${repo}/${filePath}: ${err.message}`);
      // Non-fatal: keep any previously discovered pin for this stream.
    }
  }

  // Ensure all known streams appear in the output, even if empty (= all floating).
  for (const stream of ["bluefin-stable"]) {
    if (!streamPins[stream]) {
      streamPins[stream] = {};
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    streams: streamPins,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
