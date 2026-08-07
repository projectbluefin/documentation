const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

/**
 * Sparkline is TSX, so it is transpiled in-memory and rendered to static markup.
 * Both `typescript` and `react-dom` are already dependencies — no test tooling
 * is added for this.
 *
 * These assertions guard the honesty rules in adr/0002-factory-page.md: gaps are
 * drawn as gaps, small multiples share a domain, unavailability stays visible,
 * and information-bearing sparklines are announced to screen readers.
 */
const SRC = path.join(__dirname, "..", "src", "components", "Sparkline.tsx");

function loadSparkline() {
  const source = fs.readFileSync(SRC, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const module_ = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    require,
    module_,
    module_.exports,
  );
  return module_.exports.default;
}

const Sparkline = loadSparkline();
const render = (props) =>
  renderToStaticMarkup(React.createElement(Sparkline, props));
const countOf = (markup, needle) =>
  (markup.match(new RegExp(needle, "g")) || []).length;
const pointsOf = (markup) => {
  const match = markup.match(/points="([^"]+)"/);
  return match ? match[1].split(" ") : [];
};

test("a gap breaks the line instead of interpolating across it", () => {
  const markup = render({ data: [1, 2, null, 8, 9], width: 100, height: 20 });
  assert.equal(countOf(markup, "<polyline"), 2);
  assert.ok(!markup.includes("NaN"));
});

test("a gap is not drawn as a drop to zero", () => {
  // The regression this locks: `values.map((v) => v ?? 0)` rendered missing
  // samples as a crash to the baseline, inventing an outage that never happened.
  const markup = render({
    data: [50, 50, null, 50],
    scale: "zero",
    width: 100,
    height: 20,
  });
  const ys = pointsOf(markup).map((p) => Number(p.split(",")[1]));
  assert.ok(
    ys.every((y) => y < 18),
    `no plotted point should sit on the baseline, got ${ys.join(" ")}`,
  );
});

test("an explicit domain keeps small multiples comparable", () => {
  const low = render({
    data: [1, 2, 3],
    domain: [0, 100],
    width: 100,
    height: 20,
  });
  const high = render({
    data: [90, 95, 99],
    domain: [0, 100],
    width: 100,
    height: 20,
  });
  assert.notEqual(low, high);
});

test("minmax scaling pins both extremes regardless of magnitude", () => {
  // Documents why `domain` is mandatory for a grid: without it every series
  // fills the box identically and a 3-deep queue looks like a 99-deep one.
  const low = pointsOf(render({ data: [1, 2, 3], width: 100, height: 20 }));
  const high = pointsOf(render({ data: [90, 95, 99], width: 100, height: 20 }));
  assert.equal(low[0], high[0]);
  assert.equal(low[low.length - 1], high[high.length - 1]);
});

test("a label makes the graphic announceable, its absence keeps it decorative", () => {
  const labelled = render({ data: [1, 2], label: "Queue depth: 2 now" });
  assert.ok(labelled.includes('role="img"'));
  assert.ok(labelled.includes("<title>"));
  assert.ok(labelled.includes("Queue depth: 2 now"));
  assert.ok(render({ data: [1, 2] }).includes("aria-hidden"));
});

test("insufficient data renders the empty label rather than vanishing", () => {
  assert.ok(
    render({ data: [1], emptyLabel: "accumulating data" }).includes(
      "accumulating data",
    ),
  );
  assert.ok(
    render({ data: [], emptyLabel: "accumulating data" }).includes(
      "accumulating data",
    ),
  );
  assert.equal(render({ data: [1] }), "");
});

test("an all-zero series still draws, because steady at zero is news", () => {
  const markup = render({
    data: [0, 0, 0, 0],
    scale: "zero",
    width: 100,
    height: 20,
  });
  assert.ok(markup.includes("<polyline"));
  assert.ok(!markup.includes("NaN"));
});

test("a flat series does not divide by zero", () => {
  const markup = render({ data: [5, 5, 5], width: 100, height: 20 });
  assert.ok(markup.includes("<polyline"));
  assert.ok(!markup.includes("NaN"));
});

test("winloss draws one bar per sample", () => {
  const markup = render({ data: [1, -1, 1, 1], variant: "winloss" });
  assert.equal(countOf(markup, "<rect"), 4);
});

test("bullet renders from a single value and marks its target", () => {
  const markup = render({
    data: [5],
    variant: "bullet",
    domain: [0, 10],
    target: 8,
  });
  assert.ok(markup.includes("<line"));
  assert.ok(markup.includes("<rect"));
});

test("markers are opt-in", () => {
  assert.equal(countOf(render({ data: [1, 5, 2] }), "<circle"), 0);
  assert.equal(
    countOf(render({ data: [1, 5, 2], showEnd: true }), "<circle"),
    1,
  );
  assert.equal(
    countOf(
      render({ data: [1, 5, 2], showEnd: true, showExtremes: true }),
      "<circle",
    ),
    3,
  );
});

test("a band renders behind the line", () => {
  const markup = render({
    data: [5, 5, 5],
    band: [4, 6],
    width: 100,
    height: 20,
  });
  assert.ok(markup.includes("<rect"));
  assert.ok(markup.includes('opacity="0.12"'));
});
