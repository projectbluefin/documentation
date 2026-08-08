const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadModule(tsPath) {
  const { outputText } = ts.transpileModule(fs.readFileSync(tsPath, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.startsWith(".")) {
        const base = path.resolve(path.dirname(tsPath), id);
        for (const ext of [".ts", ".tsx"]) {
          if (fs.existsSync(base + ext)) return loadModule(base + ext);
        }
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

const theme = loadModule(
  path.join(__dirname, "..", "src", "components", "factory", "chartTheme.ts"),
);

test("gapSafe turns undefined and NaN into null, never into zero", () => {
  assert.deepEqual(theme.gapSafe([1, undefined, 3, NaN, null, 0]), [
    1,
    null,
    3,
    null,
    null,
    0,
  ]);
});

test("gapSafe preserves a genuine zero", () => {
  // "Steady at zero" must be distinguishable from "missing".
  assert.deepEqual(theme.gapSafe([0, 0, 0]), [0, 0, 0]);
});

test("series are distinguished by dash as well as by hue", () => {
  const dashes = [0, 1, 2, 3].map(theme.seriesDash);
  assert.equal(new Set(dashes.map(String)).size, 4);
});

test("seriesColor wraps rather than returning undefined", () => {
  assert.equal(typeof theme.seriesColor(0), "string");
  assert.equal(typeof theme.seriesColor(99), "string");
});

test("the theme never enables animation", () => {
  // Reduced motion is honoured by construction, not by a runtime check.
  assert.equal(theme.FX_CHART_THEME.animation, false);
});

test("the theme uses no red/green severity pair", () => {
  const flat = JSON.stringify(theme.FX_CHART_THEME).toLowerCase();
  // Hex literals only. A bare "red" substring check false-positives on
  // "roundRect", which is a legitimate legend icon value in this theme.
  for (const banned of ["#3fb950", "#f85149", "#2ea043", "#da3633"]) {
    assert.ok(!flat.includes(banned), banned);
  }
  assert.ok(!/\bred\b/.test(flat));
  assert.ok(!/\bgreen\b/.test(flat));
});

test("severity is one hue at four intensities, each with its own glyph", () => {
  const levels = Object.values(theme.FX_SEVERITY);
  const hues = levels.map((l) => l.color.match(/hsl\((\d+)/)[1]);
  assert.equal(new Set(hues).size, 1);
  assert.equal(new Set(levels.map((l) => l.glyph)).size, levels.length);
});

test("toTableRows produces a header plus one row per category", () => {
  const rows = theme.toTableRows({
    xAxis: { data: ["Mon", "Tue"] },
    series: [
      { name: "Passed", data: [3, 4] },
      { name: "Failed", data: [1, null] },
    ],
  });
  assert.deepEqual(rows[0], ["", "Passed", "Failed"]);
  assert.deepEqual(rows[1], ["Mon", "3", "1"]);
  // A gap is reported as a gap in the text alternative too.
  assert.deepEqual(rows[2], ["Tue", "4", "no data"]);
});

test("toTableRows tolerates an axis array and a chart with no series", () => {
  assert.deepEqual(theme.toTableRows({ xAxis: [{ data: ["a"] }] }), [
    [""],
    ["a"],
  ]);
  assert.deepEqual(theme.toTableRows({}), [[""]]);
});
