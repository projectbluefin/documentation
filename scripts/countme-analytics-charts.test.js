const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

const TSX_PATH = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "analytics",
  "CountmeAnalyticsCharts.tsx",
);

/**
 * The component's own imports, stubbed only where a test cannot run them:
 * Docusaurus internals, CSS modules, and the two chart primitives whose props
 * are what these tests actually read. Everything else — the countme source
 * policy included — is loaded from real repository source.
 */
function loadComponent() {
  return loadTsxModule(TSX_PATH, (id) => {
    if (id.endsWith(".css")) return {};
    if (id === "react") return React;
    if (id === "@docusaurus/Link") {
      return {
        __esModule: true,
        default: ({ to, children, ...rest }) =>
          React.createElement("a", { href: to, ...rest }, children),
      };
    }
    if (id === "@theme/Heading") {
      return {
        __esModule: true,
        default: ({ as: Tag = "h3", children, ...rest }) =>
          React.createElement(Tag, rest, children),
      };
    }
    if (id.includes("EChart")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("div", {
            "data-testid": "echart",
            "data-title": props.title,
            "data-summary": props.summary,
            "data-points": String(props.points),
            "data-option": JSON.stringify(props.option),
          }),
      };
    }
    if (id.includes("Unavailable")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("div", {
            "data-testid": "unavailable",
            "data-what": props.what,
            "data-reason": props.reason,
          }),
      };
    }
    return undefined;
  });
}

const mod = loadComponent();
const {
  parseCount,
  compactWeek,
  BLUEFIN_FAMILY_IMAGES,
  default: CountmeAnalyticsCharts,
} = mod;

// The first-party reader is its own module; see the note in the component.
const { familyDaily } = loadTsxModule(
  path.join(
    __dirname,
    "..",
    "src",
    "components",
    "analytics",
    "firstPartyCountme.ts",
  ),
  (id) => (id.endsWith(".css") ? {} : undefined),
);

const REGISTRY_FIXTURE = {
  generatedAt: "2026-09-10T04:08:30.490Z",
  source: "public-registry",
  packages: [
    {
      name: "bluefin",
      family: "os",
      streams: [
        {
          tag: "testing",
          publishedAt: "2026-09-08T18:31:26Z",
          ageDays: 1,
          state: "fresh",
          stateReason: null,
        },
        {
          tag: "stable",
          publishedAt: "2026-09-08T18:31:26Z",
          ageDays: 1,
          state: "fresh",
          stateReason: null,
        },
      ],
    },
  ],
  unavailable: false,
  stateReason: null,
};

test("parseCount distinguishes 0 from null/undefined", () => {
  assert.equal(parseCount(0), 0);
  assert.equal(parseCount("0"), 0);
  assert.equal(parseCount(15), 15);
  assert.equal(parseCount("15"), 15);

  assert.equal(parseCount(null), null);
  assert.equal(parseCount(undefined), null);
  assert.equal(parseCount(""), null);
  assert.equal(parseCount(NaN), null);
});

test("the catalogue names every family common ships into", () => {
  const ids = BLUEFIN_FAMILY_IMAGES.map((img) => img.id);
  assert.deepEqual(ids, ["bluefin", "dakota", "utah", "server"]);
});

test("empty count cards say no raptors are reporting, naming no infrastructure", () => {
  // Presentation rule 6 requires each panel to say it is unavailable and why.
  // AGENTS.md requires that it never emit a host address or an internal URL.
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily: { days: [] },
    }),
  );
  for (const what of ["Bluefin", "Bluefin Utah", "Printer Applications"]) {
    const panel = html.match(
      new RegExp(
        `data-what="${what} daily active systems"[^>]*data-reason="([^"]*)"`,
      ),
    );
    assert.ok(panel, `${what} must say it is unavailable`);
    assert.equal(panel[1], "No raptors reporting in, life finds a way");
  }
  assert.doesNotMatch(html, /data-reason="[^"]*projectbluefin\.io/);
});

const PROMOTED = [
  "bluefin",
  "bluefin-nvidia",
  "dakota",
  "dakota-nvidia",
  "dakota-gaming",
  "dakota-nvidia-gaming",
  "utah",
  "utah-nvidia",
  "utah-gaming",
  "utah-nvidia-gaming",
];

test("the catalogue lists the images the release workflows promote", () => {
  const images = BLUEFIN_FAMILY_IMAGES.filter(
    (f) => f.delivery === "oci",
  ).flatMap((f) => f.images);

  // Each repo's execute-release.yml promotion matrix, verbatim. The family
  // cards render these lists row by row, so a wrong entry is a wrong claim.
  assert.deepEqual(images, PROMOTED);

  // Bluefin Server delivers a DDI, not a container tag, so it has no stream
  // chips even though it is a counted family.
  const server = BLUEFIN_FAMILY_IMAGES.find((f) => f.id === "server");
  assert.equal(server.delivery, "ddi");
  assert.deepEqual(server.images, []);
});

test("the promotion axis is testing then stable, and nothing else", () => {
  // :gts and :latest linger on some images from retired schemes. A chip that
  // is always a dash is not a measurement.
  assert.deepEqual(mod.STREAM_COLUMNS, ["testing", "stable"]);
});

test("freshness splits stale by drift and treats a missing tag as unknown", () => {
  const { freshnessLevel } = mod;
  assert.equal(freshnessLevel(undefined), "unknown");
  assert.equal(freshnessLevel({ tag: "stable", ageDays: null }), "unknown");
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 0, state: "fresh" }),
    "ok",
  );
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 12, state: "stale" }),
    "watch",
  );
  assert.equal(
    freshnessLevel({ tag: "stable", ageDays: 72, state: "stale" }),
    "alert",
  );
});

test("the family section shows stream ages, and states a missing snapshot instead of dashes", () => {
  const present = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, { registry: REGISTRY_FIXTURE }),
  );
  assert.match(present, /testing 1d/);
  assert.doesNotMatch(present, /data-what="Image stream freshness"/);

  const missing = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: { packages: [], unavailable: true, stateReason: "no token" },
      daily: { days: [] },
    }),
  );
  assert.match(missing, /data-what="Image stream freshness"/);
  assert.match(missing, /data-reason="no token"/);
  // "testing —" would read as "that tag never published" rather than
  // "the snapshot could not be read".
  assert.doesNotMatch(missing, /testing —/);
  assert.match(missing, /dakota-gaming/, "the catalogue still renders");
});

/**
 * Bluefin and Bluefin Utah: daily pings from projectbluefin-countme, read from
 * /v1/daily.json rows of `<image-name>/<image-flavor>:<stream>`.
 */
const DAILY_FIXTURE = {
  unit: "systems active per UTC day",
  days: [
    { day: "2026-09-22", image: "utah/main:stable", n: 2 },
    { day: "2026-09-22", image: "utah-nvidia/nvidia:stable", n: 1 },
    { day: "2026-09-22", image: "dakota/main:stable", n: 9 },
    { day: "2026-09-23", image: "utah/main:testing", n: 1 },
  ],
};

const CLASSIC_HISTORY = {
  generatedAt: "2026-10-24T00:00:00Z",
  source:
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  method: "classic-badge-history-v1",
  observations: [
    { date: "2026-09-20", count: 4400 },
    { date: "2026-10-08", count: 4500 },
    { date: "2026-10-15", count: 4100 },
    { date: "2026-10-22", count: 4600 },
  ],
};

test("daily aggregation preserves same-day gaps and zero independently of Classic", () => {
  const daily = familyDaily([
    ...DAILY_FIXTURE.days,
    { day: "2026-09-25", image: "dakota/main:unknown", n: 0 },
  ]);
  assert.deepEqual(daily.days, [
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
  ]);
  assert.deepEqual(daily.streams.stable, [12, null, null, null]);
  assert.deepEqual(daily.streams.testing, [null, 1, null, null]);
  assert.deepEqual(daily.streams.unknown, [null, null, null, 0]);
});

test("the top plotted history is Bluefin plus Utah plus the displayed Classic history", () => {
  const html = renderDaily({
    days: ["2026-10-08", "2026-10-15", "2026-10-24"].flatMap((day) => [
      { day, image: "dakota/main:stable", n: 129 },
      { day, image: "utah/main:testing", n: 94 },
    ]),
  });
  const first = html.match(/data-title="([^"]+)"/);
  assert.equal(
    first?.[1],
    "All Bluefins estimated active systems",
    "the total chart comes first",
  );
  const total = chartOption(html, "All Bluefins estimated active systems");
  const expected = Array(17).fill(null);
  expected[0] = 4723;
  expected[7] = 4323;
  expected[16] = 4823;
  assert.deepEqual(
    total.series[0].data,
    expected,
    "plot all three counts, not 223 daily reports",
  );
  assert.equal(total.xAxis.data[16], "2026-10-24");
  const classic = chartOption(html, "Bluefin Classic weekly active systems");
  assert.deepEqual(classic.series[0].data, [4400, 4500, 4100, 4600]);
  assert.equal(
    classic.series[0].step,
    "end",
    "Classic is held from its actual publication date",
  );
});

test("zero in all three charts remains a plotted total", () => {
  const html = renderDaily(
    {
      days: ["2026-10-23", "2026-10-24"].flatMap((day) => [
        { day, image: "dakota/main:stable", n: 0 },
        { day, image: "utah/main:testing", n: 0 },
      ]),
    },
    null,
    { ...CLASSIC_HISTORY, observations: [{ date: "2026-10-22", count: 0 }] },
  );
  const total = chartOption(html, "All Bluefins estimated active systems");
  assert.deepEqual(total.series[0].data, [0, 0]);
});

test("the total stays unavailable when a required chart has no readings", () => {
  for (const html of [
    renderDaily(DAILY_FIXTURE, null, {
      ...CLASSIC_HISTORY,
      observations: [],
      unavailable: true,
    }),
    renderDaily({ days: [] }),
  ]) {
    assert.doesNotMatch(
      html,
      /data-title="All Bluefins estimated active systems"/,
    );
    assert.match(html, /data-what="All Bluefins estimated active systems"/);
  }
});

test("Utah daily counts sum its flavors per stream and never include Dakota", () => {
  const { days, streams } = familyDaily(DAILY_FIXTURE.days, "utah");
  assert.deepEqual(days, ["2026-09-22", "2026-09-23"]);
  assert.deepEqual(streams.stable, [3, null], "a day with no report is a gap");
  assert.deepEqual(streams.testing, [null, 1]);
  assert.deepEqual(streams.unknown, [null, null]);
});

test("the Utah card charts only its own measured streams", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily: DAILY_FIXTURE,
    }),
  );
  const option = html.match(
    /data-title="Bluefin Utah daily active systems"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(option, "the Utah card must render a chart");
  const parsed = JSON.parse(option[1].replace(/&quot;/g, '"'));
  assert.deepEqual(
    parsed.series.map((s) => s.data),
    [
      [3, null],
      [null, 1],
      [null, null],
    ],
  );
});

test("the Utah card stays empty while only Dakota reports", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily: {
        days: [{ day: "2026-09-22", image: "dakota/main:stable", n: 9 }],
      },
    }),
  );
  assert.match(
    html,
    /data-what="Bluefin Utah daily active systems"[^>]*data-reason="No raptors reporting in, life finds a way"/,
  );
});

test("a Utah day with no reports stays on the axis as a gap", () => {
  const { days, streams } = familyDaily(
    [
      { day: "2026-09-20", image: "utah/main:stable", n: 4 },
      { day: "2026-09-22", image: "utah/main:stable", n: 5 },
    ],
    "utah",
  );
  assert.deepEqual(days, ["2026-09-20", "2026-09-21", "2026-09-22"]);
  assert.deepEqual(streams.stable, [4, null, 5]);
});
test("daily aggregation excludes the ongoing UTC day to chart full days only", () => {
  const rows = [
    { day: "2026-11-05", image: "dakota/main:stable", n: 10 },
    { day: "2026-11-06", image: "dakota/main:stable", n: 12 },
    { day: "2026-11-07", image: "dakota/main:stable", n: 2 },
  ];
  const asOfNov7 = familyDaily(
    rows,
    "dakota",
    new Date("2026-11-07T14:30:00Z"),
  );
  assert.deepEqual(asOfNov7.days, ["2026-11-05", "2026-11-06"]);
  assert.deepEqual(asOfNov7.streams.stable, [10, 12]);
});

function renderDaily(daily, classic = null, history = CLASSIC_HISTORY) {
  return renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily,
      classic,
      history,
    }),
  );
}

function chartOption(html, title) {
  const m = html.match(
    new RegExp(`data-title="${title}"[^>]*data-option="([^"]*)"`),
  );
  assert.ok(m, `${title} must render a chart`);
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}

test("the Bluefin card charts Dakota pings per stream and never Utah", () => {
  const option = chartOption(
    renderDaily(DAILY_FIXTURE),
    "Bluefin daily active systems",
  );
  assert.deepEqual(
    option.series.map((s) => s.name),
    ["stable", "testing", "unknown"],
  );
  assert.deepEqual(option.xAxis.data, ["2026-09-22"]);
  assert.deepEqual(
    option.series.map((s) => s.data),
    [[9], [null], [null]],
  );
});

test("the day axis shortens its ticks but keeps the full date in the data", () => {
  const option = chartOption(
    renderDaily(DAILY_FIXTURE),
    "Bluefin Utah daily active systems",
  );
  assert.deepEqual(option.xAxis.data, ["2026-09-22", "2026-09-23"]);
  for (const series of option.series) {
    assert.equal(series.connectNulls, false, "a gap must break the line");
    assert.equal(series.smooth, false, "a spline invents values");
  }
  assert.equal(option.yAxis.min, 0, "the floor must not exaggerate readings");
  assert.equal(compactWeek("2026-08-17"), "Aug 17");
  assert.equal(compactWeek("not-a-date"), "not-a-date");
});

test("Printer Applications card plots reporting printer families on a common day axis", () => {
  const PRINTER_DAILY_FIXTURE = {
    days: [
      {
        day: "2026-09-01",
        image: "ghostscript-printer-app/main:unknown",
        n: 3,
      },
      {
        day: "2026-09-02",
        image: "ghostscript-printer-app/main:unknown",
        n: 4,
      },
      { day: "2026-09-02", image: "hplip-printer-app/main:unknown", n: 5 },
      { day: "2026-09-03", image: "gutenprint-printer-app/main:unknown", n: 2 },
      { day: "2026-09-03", image: "dakota/main:stable", n: 100 },
    ],
  };
  const option = chartOption(
    renderDaily(PRINTER_DAILY_FIXTURE),
    "Printer Applications daily active systems",
  );
  assert.deepEqual(option.xAxis.data, [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
  ]);
  const seriesNames = option.series.map((s) => s.name);
  assert.deepEqual(seriesNames, [
    "Ghostscript",
    "HPLIP",
    "Gutenprint",
    "PostScript",
  ]);
  const ghostscript = option.series.find((s) => s.name === "Ghostscript");
  assert.deepEqual(ghostscript.data, [3, 4, null]);
  const hplip = option.series.find((s) => s.name === "HPLIP");
  assert.deepEqual(hplip.data, [null, 5, null]);
});
