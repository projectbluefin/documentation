/**
 * Unit coverage for scripts/lib/load-tsx.js — loadTsxModule.
 *
 * This loader is test infrastructure: countme-analytics-charts.test.js,
 * image-churn-charts.test.js and report-chart.test.js all reach real `src/`
 * components through it. It had no test of its own, so a regression in its
 * resolution order would surface only as a confusing MODULE_NOT_FOUND inside
 * an unrelated chart suite.
 *
 * The four resolution branches asserted here are exactly the ones the module's
 * own doc comment says were broken before: mock-first, `@site/…` (including the
 * JSON special case), relative imports routed back through the loader rather
 * than node's `require`, and the final fall-through to `require`.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadTsxModule } = require("./load-tsx.js");

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "load-tsx-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(dir, name, source) {
  const file = path.join(dir, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source, "utf8");
  return file;
}

test("transpiles a TypeScript entry and returns its exports", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `export const streams: string[] = ["gts", "lts"];
     export function count(items: string[]): number {
       return items.length;
     }`,
  );

  const mod = loadTsxModule(entry);

  assert.deepEqual(mod.streams, ["gts", "lts"]);
  assert.equal(mod.count(["a", "b", "c"]), 3);
});

test("transpiles TSX with the React JSX factory", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.tsx",
    `import React from "react";
     export const Badge = () => <span className="badge">gts</span>;`,
  );

  const calls = [];
  const React = {
    __esModule: true,
    default: {
      createElement: (type, props, ...children) => {
        calls.push({ type, props, children });
        return { type, props, children };
      },
    },
  };

  const mod = loadTsxModule(entry, (id) =>
    id === "react" ? React : undefined,
  );
  const element = mod.Badge();

  assert.equal(element.type, "span");
  assert.equal(element.props.className, "badge");
  assert.deepEqual(element.children, ["gts"]);
  assert.equal(calls.length, 1);
});

test("mock takes precedence over every other resolution branch", (t) => {
  const dir = tmpDir(t);
  write(dir, "real.ts", `export const origin = "relative file";`);
  const entry = write(
    dir,
    "entry.ts",
    `import { origin } from "./real";
     import styles from "./styles.module.css";
     import pathMod from "node:path";
     export const values = [origin, styles.root, typeof pathMod.join];`,
  );

  const mod = loadTsxModule(entry, (id) => {
    if (id === "./real") return { __esModule: true, origin: "mocked" };
    if (id.endsWith(".module.css"))
      return { __esModule: true, default: { root: "css-root" } };
    if (id === "node:path")
      return { __esModule: true, default: { join: () => "stub" } };
    return undefined;
  });

  assert.deepEqual(mod.values, ["mocked", "css-root", "function"]);
});

test("a mock returning undefined falls through to the real resolution", (t) => {
  const dir = tmpDir(t);
  write(dir, "real.ts", `export const origin = "relative file";`);
  const entry = write(
    dir,
    "entry.ts",
    `import { origin } from "./real";
     export const value = origin;`,
  );

  const seen = [];
  const mod = loadTsxModule(entry, (id) => {
    seen.push(id);
    return undefined;
  });

  assert.equal(mod.value, "relative file");
  assert.ok(seen.includes("./real"), `mock was never consulted: ${seen}`);
});

test("a relative import nested inside a relative import still resolves", (t) => {
  // The regression the loader's doc comment records: passing node's `require`
  // down to a transpiled relative module makes the *second* level throw
  // MODULE_NOT_FOUND, because a relative .ts import is not requireable.
  const dir = tmpDir(t);
  write(dir, "leaf.ts", `export const leaf = "leaf value";`);
  write(
    dir,
    "middle.ts",
    `import { leaf } from "./leaf";
     export const middle = leaf.toUpperCase();`,
  );
  const entry = write(
    dir,
    "entry.ts",
    `import { middle } from "./middle";
     export const value = middle;`,
  );

  assert.equal(loadTsxModule(entry).value, "LEAF VALUE");
});

test("relative imports resolve a directory through its index file", (t) => {
  const dir = tmpDir(t);
  write(dir, "widget/index.tsx", `export const name = "widget index";`);
  const entry = write(
    dir,
    "entry.ts",
    `import { name } from "./widget";
     export const value = name;`,
  );

  assert.equal(loadTsxModule(entry).value, "widget index");
});

test("relative resolution prefers .ts over a same-named directory index", (t) => {
  const dir = tmpDir(t);
  write(dir, "widget.ts", `export const name = "widget file";`);
  write(dir, "widget/index.ts", `export const name = "widget index";`);
  const entry = write(
    dir,
    "entry.ts",
    `import { name } from "./widget";
     export const value = name;`,
  );

  assert.equal(loadTsxModule(entry).value, "widget file");
});

test("@site/ resolves against the repository root", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `import { loadTsxModule } from "@site/scripts/lib/load-tsx.js";
     export const value = typeof loadTsxModule;`,
  );

  assert.equal(loadTsxModule(entry).value, "function");
});

test("@site/ JSON is parsed rather than evaluated as a module", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `import pkg from "@site/package.json";
     export const value = pkg.name;`,
  );

  const repoPackageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
  );

  assert.equal(loadTsxModule(entry).value, repoPackageJson.name);
});

test("an unmocked bare specifier falls through to node's require", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `import nodePath from "node:path";
     export const value = nodePath.join("a", "b");`,
  );

  assert.equal(loadTsxModule(entry).value, path.join("a", "b"));
});

test("an unresolvable relative import fails loudly instead of silently", (t) => {
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `import { missing } from "./not-here";
     export const value = missing;`,
  );

  assert.throws(() => loadTsxModule(entry), /not-here/);
});

test("a mock without __esModule is treated as the default export", (t) => {
  // transpileModule emits __importDefault, so `import X from "id"` receives
  // `mock.__esModule ? mock : { default: mock }`. A stub that carries named
  // exports therefore has to set __esModule (as report-chart.test.js does), and
  // a stub meant to *be* the default export must not.
  const dir = tmpDir(t);
  const entry = write(
    dir,
    "entry.ts",
    `import styles from "./styles.module.css";
     export const value = styles.root;`,
  );

  const asDefault = loadTsxModule(entry, (id) =>
    id.endsWith(".module.css") ? { root: "css-root" } : undefined,
  );
  assert.equal(asDefault.value, "css-root");

  const asNamespace = loadTsxModule(entry, (id) =>
    id.endsWith(".module.css")
      ? { __esModule: true, default: { root: "css-root" } }
      : undefined,
  );
  assert.equal(asNamespace.value, "css-root");

  // The wrong shape — a default-only namespace with no __esModule — is the
  // mistake this contract makes easy, and it fails silently as undefined.
  const doubleWrapped = loadTsxModule(entry, (id) =>
    id.endsWith(".module.css") ? { default: { root: "css-root" } } : undefined,
  );
  assert.equal(doubleWrapped.value, undefined);
});
