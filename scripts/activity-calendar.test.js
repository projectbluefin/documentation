const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

/**
 * ActivityCalendar is TSX with a CSS-module import, so it is transpiled
 * in-memory and rendered to static markup, with `.module.css` stubbed to an
 * identity map of class names. Both `typescript` and `react-dom` are already
 * dependencies - no test tooling is added for this.
 *
 * These assertions guard the honesty rules in adr/0002-factory-page.md as they
 * apply to a heatmap: discrete steps rather than a ramp, missing rendered
 * distinctly from zero, unavailability stated rather than blank, one announced
 * summary rather than 371 cell announcements, and byte-identical output for a
 * fixed endDate so SSG does not depend on the build machine.
 */
const SRC = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "ActivityCalendar.tsx",
);

function loadCalendar() {
  const source = fs.readFileSync(SRC, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const cssStub = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === "__esModule" ? true : typeof key === "string" ? key : undefined,
    },
  );
  const requireShim = (id) =>
    id.endsWith(".css") ? { __esModule: true, default: cssStub } : require(id);
  requireShim.resolve = Module.createRequire(SRC).resolve;
  const module_ = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    requireShim,
    module_,
    module_.exports,
  );
  return module_.exports;
}

const exported = loadCalendar();
const ActivityCalendar = exported.default;
const { bucket } = exported;

const render = (props) =>
  renderToStaticMarkup(React.createElement(ActivityCalendar, props));
const countOf = (markup, needle) =>
  (markup.match(new RegExp(needle, "g")) || []).length;

/** Every `<rect>` that carries a `<title>`, i.e. a day cell, in document order. */
const cellsOf = (markup) =>
  Array.from(
    markup.matchAll(/<rect ([^>]*)><title>([^<]*)<\/title><\/rect>/g),
  ).map(([, attrs, title]) => ({
    attrs,
    title,
    date: title.slice(0, 10),
    opacity: /fill-opacity="([\d.]+)"/.exec(attrs)?.[1],
    missing: attrs.includes('fill="none"'),
  }));

/** A run of days ending on `end`, all with the same value. */
function series(end, days, value) {
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(endMs - i * 86400000).toISOString().slice(0, 10),
    value,
  }));
}

// 2026-01-03 is a Saturday in UTC, so its week column is complete and the grid
// has no omitted future days. 2026-08-07 is a Friday, which omits one.
const SATURDAY = "2026-01-03";
const FRIDAY = "2026-08-07";

test("a week span renders exactly seven cells per column", () => {
  const markup = render({
    data: series(SATURDAY, 28, 3),
    weeks: 4,
    endDate: SATURDAY,
  });
  assert.equal(cellsOf(markup).length, 28);

  const year = render({
    data: series(SATURDAY, 10, 3),
    weeks: 53,
    endDate: SATURDAY,
  });
  assert.equal(cellsOf(year).length, 53 * 7);
});

test("days after endDate are omitted, not drawn as missing", () => {
  // Friday is weekday 5, so Saturday of the final column is in the future.
  const markup = render({
    data: series(FRIDAY, 14, 2),
    weeks: 4,
    endDate: FRIDAY,
  });
  const cells = cellsOf(markup);
  assert.equal(cells.length, 4 * 7 - 1);
  assert.equal(cells[cells.length - 1].date, FRIDAY);
});

test("a day with no data does not render like a day with zero", () => {
  const markup = render({
    data: [
      { date: "2026-01-02", value: 0 },
      { date: "2026-01-03", value: 5 },
    ],
    weeks: 1,
    endDate: SATURDAY,
  });
  const cells = cellsOf(markup);
  const zero = cells.find((c) => c.date === "2026-01-02");
  const missing = cells.find((c) => c.date === "2026-01-01");

  assert.equal(zero.missing, false, "zero must be a filled square");
  assert.equal(zero.title, "2026-01-02: 0");
  assert.equal(missing.missing, true, "missing must be an unfilled outline");
  assert.match(missing.attrs, /stroke-dasharray="2 2"/);
  assert.equal(missing.title, "2026-01-01: no data");
  assert.notEqual(zero.attrs, missing.attrs);
});

test("an all-zero week still draws, because steady at zero is news", () => {
  const markup = render({
    data: series(SATURDAY, 7, 0),
    weeks: 1,
    endDate: SATURDAY,
  });
  const cells = cellsOf(markup);
  assert.equal(cells.length, 7);
  assert.ok(cells.every((c) => !c.missing));
  assert.ok(cells.every((c) => c.opacity === "0.12"));
  assert.ok(!markup.includes("NaN"));
});

test("bucketing is discrete and correct on its boundaries", () => {
  // levels=5 gives four positive steps at max/4 intervals, inclusive from below.
  assert.equal(bucket(0, 100, 5), 0);
  assert.equal(bucket(-3, 100, 5), 0);
  assert.equal(bucket(1, 100, 5), 1);
  assert.equal(bucket(25, 100, 5), 1);
  assert.equal(bucket(26, 100, 5), 2);
  assert.equal(bucket(50, 100, 5), 2);
  assert.equal(bucket(51, 100, 5), 3);
  assert.equal(bucket(75, 100, 5), 3);
  assert.equal(bucket(76, 100, 5), 4);
  assert.equal(bucket(100, 100, 5), 4);
  assert.equal(bucket(1000, 100, 5), 4, "over-domain values clamp to the top");
  assert.equal(bucket(7, 0, 5), 4, "a zero domain cannot divide");
});

test("the rendered ramp uses discrete opacities of one hue", () => {
  const values = [0, 25, 26, 51, 100];
  const markup = render({
    data: values.map((value, i) => ({
      date: `2026-01-0${i + 1}`,
      value,
    })),
    weeks: 2,
    endDate: "2026-01-10",
    maxValue: 100,
    color: "#58a6ff",
  });
  const byDate = Object.fromEntries(cellsOf(markup).map((c) => [c.date, c]));
  assert.equal(byDate["2026-01-01"].opacity, "0.12");
  assert.equal(byDate["2026-01-02"].opacity, "0.48");
  assert.equal(byDate["2026-01-03"].opacity, "0.65");
  assert.equal(byDate["2026-01-04"].opacity, "0.83");
  assert.equal(byDate["2026-01-05"].opacity, "1");

  const opacities = new Set(
    cellsOf(markup)
      .filter((c) => !c.missing)
      .map((c) => c.opacity),
  );
  assert.ok(opacities.size <= 5, "no more distinct steps than `levels`");
  assert.equal(countOf(markup, 'fill="#58a6ff"'), 5, "one hue only");
});

test("a shared maxValue keeps two calendars comparable", () => {
  const quiet = render({
    data: series(SATURDAY, 7, 2),
    weeks: 1,
    endDate: SATURDAY,
    maxValue: 100,
  });
  const busy = render({
    data: series(SATURDAY, 7, 90),
    weeks: 1,
    endDate: SATURDAY,
    maxValue: 100,
  });
  assert.notEqual(quiet, busy);

  // Without the shared domain each autoscales and the two look identical, which
  // is exactly the failure the prop exists to prevent.
  const quietAuto = render({
    data: series(SATURDAY, 7, 2),
    weeks: 1,
    endDate: SATURDAY,
  });
  assert.notEqual(quietAuto, quiet);
});

test("insufficient data renders the empty label rather than vanishing", () => {
  assert.ok(
    render({
      data: [],
      weeks: 4,
      endDate: SATURDAY,
      emptyLabel: "no builds recorded yet",
    }).includes("no builds recorded yet"),
  );
  assert.ok(
    render({
      data: series(SATURDAY, 2, 1),
      weeks: 4,
      endDate: SATURDAY,
      minDays: 7,
      emptyLabel: "accumulating data",
    }).includes("accumulating data"),
  );
  assert.equal(render({ data: [], weeks: 4, endDate: SATURDAY }), "");
});

test("a label makes the graphic announceable, its absence keeps it decorative", () => {
  const labelled = render({
    data: series(SATURDAY, 7, 4),
    weeks: 1,
    endDate: SATURDAY,
    label: "Builds shipped per day",
    unit: "builds",
  });
  assert.ok(labelled.includes('role="img"'));
  assert.ok(labelled.includes("<title>"));
  assert.ok(labelled.includes("Builds shipped per day"));
  assert.ok(
    render({
      data: series(SATURDAY, 7, 4),
      weeks: 1,
      endDate: SATURDAY,
    }).includes("aria-hidden"),
  );
});

test("screen readers get one summary, not one announcement per cell", () => {
  const markup = render({
    data: [...series(SATURDAY, 3, 5), { date: "2025-12-31", value: 0 }],
    weeks: 53,
    endDate: SATURDAY,
    label: "Factory activity",
    unit: "builds",
  });
  const ariaLabel = /aria-label="([^"]+)"/.exec(markup)[1];
  assert.ok(ariaLabel.startsWith("Factory activity."));
  assert.match(ariaLabel, /15 builds across 3 active days/);
  assert.match(ariaLabel, /1 day with none/);
  assert.match(ariaLabel, /367 days without data/);
  assert.match(ariaLabel, /busiest 2026-01-0\d with 5 builds\.$/);

  // The cells still carry titles for zero-JS native tooltips; role="img" keeps
  // them out of the accessibility tree.
  assert.equal(cellsOf(markup).length, 371);
  assert.equal(countOf(markup, "<title>"), 372);
});

test("output is byte-identical for a fixed endDate", () => {
  const props = {
    data: series(SATURDAY, 200, 7),
    weeks: 53,
    endDate: SATURDAY,
    label: "Factory activity",
    legend: true,
  };
  assert.equal(render(props), render(props));
});

test("the grid never emits NaN, whatever the input", () => {
  const inputs = [
    { data: [{ date: "2026-01-03", value: 1 }], weeks: 53, endDate: SATURDAY },
    {
      data: [
        { date: "2026-01-03", value: 1 },
        { date: "not-a-date", value: 4 },
        { date: "2026-02-30", value: 4 },
        { date: "2026-01-02", value: Number.NaN },
        null,
      ],
      weeks: 0,
      levels: 1,
      cellSize: 0,
      cellGap: 0,
      endDate: "garbage",
    },
    {
      data: series(SATURDAY, 7, 1),
      weeks: 1,
      endDate: SATURDAY,
      maxValue: Number.NaN,
      legend: true,
      weekdayLabels: false,
      monthLabels: false,
    },
  ];
  for (const props of inputs) {
    const markup = render(props);
    assert.ok(!markup.includes("NaN"), JSON.stringify(props));
    assert.ok(!markup.includes("undefined"), JSON.stringify(props));
  }
});

test("repeated observations for one day are summed", () => {
  const markup = render({
    data: [
      { date: "2026-01-03", value: 2 },
      { date: "2026-01-03", value: 3 },
    ],
    weeks: 1,
    endDate: SATURDAY,
    unit: "builds",
  });
  assert.ok(markup.includes("2026-01-03: 5 builds"));
});

test("observations outside the window are ignored, not clamped into it", () => {
  const markup = render({
    data: [
      { date: "2026-01-03", value: 1 },
      { date: "2020-05-05", value: 999 },
      { date: "2030-05-05", value: 999 },
    ],
    weeks: 1,
    endDate: SATURDAY,
  });
  assert.ok(!markup.includes("999"));
  assert.equal(cellsOf(markup).filter((c) => !c.missing).length, 1);
});

test("month and weekday labels are opt-out and locale-independent", () => {
  const markup = render({
    data: series(SATURDAY, 60, 1),
    weeks: 53,
    endDate: SATURDAY,
  });
  assert.ok(markup.includes(">Mon<") && markup.includes(">Fri<"));
  assert.ok(/>(Jan|Feb|Mar)</.test(markup));

  const bare = render({
    data: series(SATURDAY, 60, 1),
    weeks: 53,
    endDate: SATURDAY,
    weekdayLabels: false,
    monthLabels: false,
  });
  assert.ok(!bare.includes(">Mon<"));
  assert.equal(countOf(bare, "<text"), 0);
});

test("the legend shows every step and the missing swatch", () => {
  const markup = render({
    data: series(SATURDAY, 7, 4),
    weeks: 1,
    endDate: SATURDAY,
    legend: true,
    levels: 5,
  });
  assert.ok(markup.includes(">Less<"));
  assert.ok(markup.includes("no data<"));
  // 7 day cells + 5 ramp swatches + 1 missing swatch.
  assert.equal(countOf(markup, "<rect"), 13);
});
