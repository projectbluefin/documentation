const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { globSync, readdirSync, readFileSync } = require("node:fs");

const repoRoot = path.join(__dirname, "..");

function readTestScript() {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  return pkg.scripts.test;
}

// The `npm test` command is `node --test <pattern>`. Pull the pattern back out
// so the assertions below check what CI actually runs, not a copy of it.
function extractPattern(script) {
  const match = script.match(/node --test\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*$/);
  assert.ok(match, `could not parse a glob out of the test script: ${script}`);
  return match[1] ?? match[2] ?? match[3];
}

// Every *.test.js under scripts/, at any depth, found without using a glob so
// this is an independent answer rather than the same globbing code twice.
function walkTestFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      found.push(path.relative(repoRoot, full));
    }
  }
  return found;
}

test("the npm test glob is quoted so node expands it, not sh", () => {
  const script = readTestScript();
  // sh has no recursive `**`: unquoted, `scripts/**/*.test.js` degrades to
  // `scripts/*/*.test.js` and drops every top-level test file instead.
  assert.match(script, /node --test\s+["'][^"']+["']\s*$/);
});

test("the npm test glob collects every test file under scripts/", () => {
  const pattern = extractPattern(readTestScript());
  const matched = globSync(pattern, { cwd: repoRoot }).map((p) =>
    p.split(path.sep).join("/"),
  );
  const onDisk = walkTestFiles(path.join(repoRoot, "scripts")).map((p) =>
    p.split(path.sep).join("/"),
  );

  assert.ok(onDisk.length > 0, "expected to find test files under scripts/");
  const missed = onDisk.filter((file) => !matched.includes(file));
  assert.deepEqual(
    missed,
    [],
    `these test files exist but npm test never runs them: ${missed.join(", ")}`,
  );
});

test("a test file in a scripts/ subdirectory would be collected", () => {
  const pattern = extractPattern(readTestScript());
  // Named, not created: the point is that the pattern reaches this depth even
  // when scripts/lib/ currently holds no test file.
  const nested = "scripts/lib/example.test.js";
  const matcher = new RegExp(
    "^" +
      pattern
        .split("**/")
        .map((part) =>
          part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"),
        )
        .join("(?:[^/]+/)*") +
      "$",
  );
  assert.ok(
    matcher.test(nested),
    `${pattern} does not reach ${nested}; tests under scripts/lib/ would be skipped`,
  );
});
