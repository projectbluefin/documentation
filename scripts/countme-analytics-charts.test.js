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
  BLUEFIN_FAMILY_IMAGES,
  default: CountmeAnalyticsCharts,
} = mod;

// The first-party reader is its own module; see the note in the component.
const { latestReading, reportingRepos } = loadTsxModule(
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

test("the count panel says it lacks data without naming infrastructure", () => {
  // Presentation rule 6 requires the panel to say it is unavailable and why.
  // AGENTS.md requires that it never emit a host address or an internal URL.
  // Both hold: it speaks about the data, not the plumbing.
  const html = renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
    }),
  );

  const panel = html.match(
    /data-what="Weekly active systems"[^>]*data-reason="([^"]*)"/,
  );
  assert.ok(
    panel,
    "the weekly active systems panel must say it is unavailable",
  );
  assert.match(panel[1], /not published yet/);
  assert.doesNotMatch(panel[1], /projectbluefin\.io/);
  assert.doesNotMatch(panel[1], /endpoint/i);
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
 * Weekly active systems, served by the first-party service.
 *
 * A week the service did not measure is `null` — a gap. A week it measured as
 * zero is `0`. Collapsing those two into each other is the specific bug these
 * tests exist to catch: it is the difference between "nobody reported" and
 * "nobody was running it", and the chart draws them differently.
 */
const COUNTS_FIXTURE = {
  generatedAt: "2026-09-12T00:00:00.000Z",
  source: "https://countme.projectbluefin.io",
  method: "first-party-d1-v1",
  unit: "estimated weekly active systems",
  variants: ["bluefin", "bluefin-lts", "dakota", "utah"],
  weeks: [
    {
      week: "2026-08-17",
      bluefin: 3510,
      "bluefin-lts": 0,
      dakota: null,
      utah: null,
    },
    {
      week: "2026-08-24",
      bluefin: 3688,
      "bluefin-lts": null,
      dakota: 9,
      utah: null,
    },
    {
      week: "2026-08-31",
      bluefin: 3901,
      "bluefin-lts": null,
      dakota: 14,
      utah: null,
    },
  ],
};

function renderCounts(counts) {
  return renderToStaticMarkup(
    React.createElement(CountmeAnalyticsCharts, {
      registry: REGISTRY_FIXTURE,
      counts,
    }),
  );
}

test("a trailing gap reports the last week actually measured", () => {
  // bluefin-lts last reported in 2026-08-17 and has been a gap since. Reading
  // forwards would call it null and hide a real number; coercing the gap to 0
  // would claim the fleet emptied. Neither is true.
  assert.deepEqual(latestReading(COUNTS_FIXTURE.weeks, "bluefin-lts"), {
    value: 0,
    week: "2026-08-17",
  });
  assert.deepEqual(latestReading(COUNTS_FIXTURE.weeks, "bluefin"), {
    value: 3901,
    week: "2026-08-31",
  });
});

test("a repo that never reported is not a series", () => {
  // utah is null in every week. Included, it would draw as a flat line on the
  // floor and read as "zero systems" rather than "not counted yet".
  const repos = reportingRepos(COUNTS_FIXTURE.weeks);
  assert.ok(repos.includes("bluefin"));
  assert.ok(repos.includes("dakota"));
  assert.ok(!repos.includes("utah"));
  assert.deepEqual(reportingRepos([]), []);
});

test("a measured zero is a reading, not a gap", () => {
  const weeks = [{ week: "2026-08-17", bluefin: 0 }];
  assert.deepEqual(reportingRepos(weeks), ["bluefin"]);
  assert.deepEqual(latestReading(weeks, "bluefin"), {
    value: 0,
    week: "2026-08-17",
  });
});

test("the chart carries gaps through to the series, never zeros", () => {
  const html = renderCounts(COUNTS_FIXTURE);
  const option = JSON.parse(
    html
      .match(
        /data-title="Weekly active systems"[\s\S]*?data-option="([^"]*)"/,
      )[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );

  const lts = option.series.find((s) => s.name === "Bluefin LTS");
  assert.deepEqual(lts.data, [0, null, null]);
  assert.equal(lts.connectNulls, false, "a gap must break the line");
  assert.equal(lts.smooth, false, "a spline invents values between weeks");

  const dakota = option.series.find((s) => s.name === "Project Bluefin Dakota");
  assert.deepEqual(dakota.data, [null, 9, 14]);

  assert.ok(
    !option.series.some((s) => s.name === "Project Bluefin Utah"),
    "a repo with no readings must not be plotted",
  );
  assert.equal(
    option.yAxis.min,
    0,
    "a floating floor exaggerates a flat series",
  );
});

test("every plotted series states its current number", () => {
  // Presentation rule 1: the graphic never carries a claim on its own.
  const html = renderCounts(COUNTS_FIXTURE);
  const summary = html.match(
    /data-title="Weekly active systems"[\s\S]*?data-summary="([^"]*)"/,
  )[1];

  assert.match(summary, /Bluefin 3,901 \(week 2026-08-31\)/);
  assert.match(summary, /Bluefin LTS 0 \(week 2026-08-17\)/);
  assert.match(summary, /Project Bluefin Dakota 14 \(week 2026-08-31\)/);
});

test("the panel stays unavailable when the service reports no weeks", () => {
  const html = renderCounts({
    unavailable: true,
    stateReason: "Weekly active systems are not published yet.",
    weeks: [],
  });
  const panel = html.match(
    /data-what="Weekly active systems"[^>]*data-reason="([^"]*)"/,
  );
  assert.ok(panel, "an empty aggregate must still render a reasoned panel");
  assert.doesNotMatch(panel[1], /projectbluefin\.io/);
});
