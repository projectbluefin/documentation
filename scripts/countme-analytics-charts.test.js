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
    if (id === "@docusaurus/useBaseUrl") {
      return { __esModule: true, default: (p) => p };
    }
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
    {
      name: "bluefin-lts-hwe",
      family: "os",
      streams: [
        {
          tag: "testing",
          publishedAt: "2026-06-30T01:09:51Z",
          ageDays: 72,
          state: "stale",
          stateReason: "testing lanes are expected to publish within 7 days",
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
  assert.deepEqual(ids, ["bluefin", "bluefin-lts", "dakota", "utah", "server"]);
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
  for (const what of ["Bluefin", "Bluefin Utah"]) {
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
  "bluefin-lts",
  "bluefin-lts-nvidia",
  "dakota",
  "dakota-nvidia",
  "dakota-gaming",
  "dakota-nvidia-gaming",
];

test("the matrix rows are the images the release workflows promote", () => {
  const { matrixRows, BLUEFIN_FAMILY_IMAGES: families } = mod;
  const images = matrixRows().map((r) => r.image);

  // Each repo's execute-release.yml promotion matrix, verbatim. The -hwe images
  // are still in the registry but in nobody's matrix, so they are named on the
  // family card as retired rather than charted as permanently stale lanes.
  assert.deepEqual(images, PROMOTED);

  const lts = families.find((f) => f.id === "bluefin-lts");
  assert.deepEqual(lts.retired, ["bluefin-lts-hwe", "bluefin-lts-hwe-nvidia"]);
  for (const name of lts.retired) assert.ok(!images.includes(name));

  // Bluefin Server delivers a DDI, not a container tag, so it has no lane here
  // even though it is a counted family.
  assert.ok(families.some((f) => f.id === "server"));
  assert.ok(!images.includes("server"));
});

test("the promotion axis is testing then stable, and nothing else", () => {
  // :lts, :gts and :latest linger on some images from retired schemes. A column
  // that is a dash down most of the grid is not a measurement.
  assert.deepEqual(mod.STREAM_COLUMNS, ["testing", "stable"]);
});

test("an image the registry does not carry stays in the grid as a gap", () => {
  const { matrixRows, buildStreamMatrix, STREAM_COLUMNS } = mod;
  const rows = matrixRows();
  const cells = buildStreamMatrix(rows, []);

  assert.equal(cells.length, rows.length * STREAM_COLUMNS.length);
  for (const cell of cells) {
    assert.equal(cell.level, "unknown");
    assert.equal(cell.ageDays, null, "an absent stream is a gap, never 0");
  }
});

test("a retired tag on an image is not mistaken for a promotion lane", () => {
  const { matrixRows, buildStreamMatrix } = mod;
  const cells = buildStreamMatrix(matrixRows(), [
    {
      name: "bluefin",
      family: "os",
      streams: [
        { tag: "lts", ageDays: 99, state: "stale", publishedAt: null },
        { tag: "testing", ageDays: 1, state: "fresh", publishedAt: null },
      ],
    },
  ]);

  assert.ok(
    !cells.some((c) => c.stream === "lts"),
    ":lts is not a column, so a stale :lts tag cannot colour the grid",
  );
  const testing = cells.find(
    (c) => c.image === "bluefin" && c.stream === "testing",
  );
  assert.equal(testing.ageDays, 1);
  assert.equal(testing.level, "ok");
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

test("the matrix plots every catalogued image against every stream", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
    }),
  );

  const chart = html.match(
    /data-title="Image stream freshness"[^>]*data-option="([^"]*)"/,
  );
  assert.ok(chart, "matrix echart must be present");

  const option = JSON.parse(chart[1].replace(/&quot;/g, '"'));
  assert.deepEqual(option.yAxis.data, PROMOTED);
  assert.deepEqual(option.xAxis.data, [":testing", ":stable"]);
  assert.equal(option.series[0].data.length, PROMOTED.length * 2);

  // Every cell carries its own number, never a bare colour swatch.
  const published = option.series[0].data.filter((c) => c.text !== "—");
  assert.deepEqual(published.map((c) => c.text).sort(), ["● 1d", "● 1d"]);
});

test("the matrix says why it is empty rather than rendering nothing", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: { packages: [], unavailable: true, stateReason: "no token" },
    }),
  );

  assert.match(html, /data-what="Image stream matrix"/);
  assert.match(html, /data-reason="no token"/);
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

test("the three count cards read Bluefin, Bluefin Utah, Bluefin Classic in order", () => {
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily: DAILY_FIXTURE,
    }),
  );
  const headings = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(headings.slice(0, 3), [
    "Bluefin",
    "Bluefin Utah",
    "Bluefin Classic (ublue-os/bluefin)",
  ]);
});

test("Utah daily counts sum its flavors per stream and never include Dakota", () => {
  const { days, streams } = familyDaily(DAILY_FIXTURE.days, "utah");
  assert.deepEqual(days, ["2026-09-22", "2026-09-23"]);
  assert.deepEqual(streams.stable, [3, null], "a day with no report is a gap");
  assert.deepEqual(streams.testing, [null, 1]);
  assert.deepEqual(streams.unknown, [null, null]);
});

test("the Utah card charts its streams and states each latest value", () => {
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
  assert.match(html, /Bluefin Utah :stable: 3 \(2026-09-22\)/);
  assert.match(html, /Bluefin Utah :testing: 1 \(2026-09-23\)/);
  assert.match(html, /Bluefin Utah :unknown: accumulating data/);
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

function renderDaily(daily) {
  return renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      daily,
    }),
  );
}

function dailyOption(html, label) {
  const m = html.match(
    new RegExp(
      `data-title="${label} daily active systems"[^>]*data-option="([^"]*)"`,
    ),
  );
  assert.ok(m, `${label} must render a chart`);
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}

test("the Bluefin card charts Dakota pings per stream and never Utah", () => {
  const option = dailyOption(renderDaily(DAILY_FIXTURE), "Bluefin");
  assert.deepEqual(
    option.series.map((s) => s.name),
    ["Bluefin :stable", "Bluefin :testing", "Bluefin :unknown"],
  );
  assert.deepEqual(option.xAxis.data, ["2026-09-22"]);
  assert.deepEqual(
    option.series.map((s) => s.data),
    [[9], [null], [null]],
  );
});

test("the Bluefin Classic comparison uses the latest Bluefin daily total", () => {
  assert.match(renderDaily(DAILY_FIXTURE), /Bluefin: 9 \(2026-09-22\)/);
  assert.match(renderDaily({ days: [] }), /Bluefin: accumulating data/);
});

test("the day axis shortens its ticks but keeps the full date in the data", () => {
  const option = dailyOption(renderDaily(DAILY_FIXTURE), "Bluefin Utah");
  assert.deepEqual(option.xAxis.data, ["2026-09-22", "2026-09-23"]);
  for (const series of option.series) {
    assert.equal(series.connectNulls, false, "a gap must break the line");
    assert.equal(series.smooth, false, "a spline invents values");
  }
  assert.equal(option.yAxis.min, 0, "the floor must not exaggerate readings");
  assert.equal(compactWeek("2026-08-17"), "Aug 17");
  assert.equal(compactWeek("not-a-date"), "not-a-date");
});
