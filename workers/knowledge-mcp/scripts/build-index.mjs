// Builds the published knowledge index and uploads it to Workers KV.
//
// Runs in GitHub Actions, not in the Worker: parsing the ~470 KB export costs
// ~200 ms of CPU, which does not fit the 10 ms free-tier per-invocation cap.
// Doing it here keeps the endpoint on the free plan.
//
// Usage:
//   HIVE_TOKEN=... node scripts/build-index.mjs --out index.json
//   HIVE_TOKEN=... node scripts/build-index.mjs --out index.json --dry-run
import { writeFile } from "node:fs/promises";
import { parseKnowledge } from "../src/knowledge.mjs";

const HUB =
  process.env.HIVE_HUB ??
  "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev";

// A false positive must not be able to freeze the index permanently, so a
// tripwire hit withholds that one entry rather than failing the run. A *spike*
// is different: it means the upstream tag scheme changed, and that is worth
// stopping for.
const VIOLATION_CEILING = Number(process.env.VIOLATION_CEILING ?? 25);

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

async function main() {
  const token = process.env.HIVE_TOKEN;
  if (!token) throw new Error("HIVE_TOKEN is required");

  const res = await fetch(`${HUB}/api/v1/knowledge`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Never echo the response body on failure: it may carry an auth redirect.
  if (!res.ok) throw new Error(`hub returned ${res.status} fetching knowledge export`);

  const markdown = await res.text();
  if (markdown.includes("Knowledge base not yet available")) {
    throw new Error("hub served its placeholder, not a knowledge base");
  }

  const { entries, dropped, violations, total } = parseKnowledge(markdown);

  const summary = [
    `entries seen        ${total}`,
    `published           ${entries.length}`,
    `withheld (security) ${dropped}`,
    `withheld (tripwire) ${violations.length}`,
  ].join("\n");
  console.log(summary);

  if (violations.length) {
    // Titles only. Bodies of suspected vuln entries do not belong in CI logs.
    console.log("\nWithheld by tripwire (vuln language without a `security` tag):");
    for (const v of violations) console.log(` * ${v.title}`);
    console.log("Re-tag these upstream in Hive so they are classified at the source.");
  }

  if (violations.length > VIOLATION_CEILING) {
    throw new Error(
      `${violations.length} tripwire hits exceeds ceiling ${VIOLATION_CEILING} — ` +
        `upstream tagging likely changed; refusing to publish`,
    );
  }
  if (entries.length === 0) throw new Error("refusing to publish an empty index");

  const payload = JSON.stringify({
    generated: new Date().toISOString(),
    count: entries.length,
    entries,
  });

  const out = arg("--out", "index.json");
  await writeFile(out, payload);
  console.log(`\nwrote ${out} (${payload.length} bytes)`);

  if (process.argv.includes("--dry-run")) console.log("dry run — not uploaded");

  // GitHub Actions job summary, when available.
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      `### Knowledge index\n\n\`\`\`\n${summary}\n\`\`\`\n` +
        (violations.length
          ? `\n**Withheld by tripwire:**\n\n${violations.map((v) => `- ${v.title}`).join("\n")}\n`
          : ""),
      { flag: "a" },
    );
  }
}

main().catch((err) => {
  console.error(`build-index failed: ${err.message}`);
  process.exit(1);
});
