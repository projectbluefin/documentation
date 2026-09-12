const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/**
 * Load a TypeScript/TSX module for a test, with the imports a test cannot run.
 *
 * Components under `src/` import Docusaurus internals, CSS modules, and build-time
 * JSON that only exist inside a bundler. Each test supplies a `mock(id)` for those
 * and gets the real module back.
 *
 * Relative imports are transpiled and handed this same loader, not node's
 * `require`. A relative `.ts` import inside a relative `.ts` import is still a
 * `.ts` import, and passing node's `require` down means the first nested local
 * module throws `MODULE_NOT_FOUND` — which is exactly how three analytics tests
 * broke the first time a component grew a second local dependency.
 *
 * @param {string} entryPath absolute path to the .ts/.tsx entry
 * @param {(id: string) => unknown} mock returns exports for an id, or undefined
 *   to fall through to relative resolution and then node's require
 */
function loadTsxModule(entryPath, mock = () => undefined) {
  const compilerOptions = {
    jsx: ts.JsxEmit.React,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  };

  const evaluate = (filePath) => {
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filePath, "utf8"),
      { compilerOptions },
    );
    const mod = { exports: {} };
    new Function("require", "module", "exports", outputText)(
      shimFor(filePath),
      mod,
      mod.exports,
    );
    return mod.exports;
  };

  const shimFor = (from) => (id) => {
    const mocked = mock(id);
    if (mocked !== undefined) return mocked;

    if (id.startsWith(".")) {
      const base = path.resolve(path.dirname(from), id);
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        if (fs.existsSync(base + ext)) return evaluate(base + ext);
      }
    }
    return require(id);
  };

  return evaluate(entryPath);
}

module.exports = { loadTsxModule };
