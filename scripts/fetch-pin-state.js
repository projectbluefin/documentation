/**
 * fetch-pin-state.js
 *
 * Reads bluefin-lts build workflows and image-version files from the GitHub Contents API
 * and extracts any `kernel-pin` (or future `*-pin`) workflow inputs or version pins.
 * Writes static/data/stream-pins.json consumed by the docs UI to render
 * 📌 "Pinned" badges next to intentionally-held component versions.
 *
 * Usage: node scripts/fetch-pin-state.js
 */

const fs = require("fs");
const path = require("path");

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
    path: ".github/workflows/build-regular.yml",
    stream: "bluefin-lts",
  },
  {
    repo: "projectbluefin/bluefin-lts",
    path: ".github/workflows/build-nvidia.yml",
    stream: "bluefin-lts",
  },
  {
    repo: "projectbluefin/bluefin-lts",
    path: "image-versions.yaml",
    stream: "bluefin-lts",
  },
];

async function fetchWorkflowContent(repo, filePath) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    "User-Agent": "bluefin-docs/fetch-pin-state",
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
 * Extract `kernel-pin` value from a workflow YAML or version file string.
 * Matches patterns:
 *   kernel-pin: <version>
 *   kernel_pin: <version>
 *   pins:
 *     kernel: <version>
 */
function extractKernelPin(yamlContent) {
  if (!yamlContent || typeof yamlContent !== "string") {
    return null;
  }

  const directMatch = yamlContent.match(
    /kernel[-_]pin:\s*["']?([^\s\n#"']+)["']?/,
  );
  if (directMatch) {
    return directMatch[1].trim();
  }

  const lines = yamlContent.split(/\r?\n/);
  let inPinsBlock = false;
  let pinsIndent = 0;

  for (const line of lines) {
    const pinsMatch = line.match(/^(\s*)pins:\s*(?:#.*)?$/);
    if (pinsMatch) {
      inPinsBlock = true;
      pinsIndent = pinsMatch[1].length;
      continue;
    }

    if (inPinsBlock) {
      const indentMatch = line.match(/^(\s*)\S/);
      if (indentMatch && indentMatch[1].length <= pinsIndent) {
        inPinsBlock = false;
        continue;
      }
      const kernelMatch = line.match(/^\s*kernel:\s*["']?([^\s\n#"']+)["']?/);
      if (kernelMatch) {
        return kernelMatch[1].trim();
      }
    }
  }

  return null;
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
      console.warn(
        `  Warning: could not fetch ${repo}/${filePath}: ${err.message}`,
      );
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
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  applyKernelPin,
  extractKernelPin,
  fetchWorkflowContent,
  WORKFLOWS_TO_CHECK,
};
