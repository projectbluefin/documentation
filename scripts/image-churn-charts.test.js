const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

/**
 * The /analytics update-churn section is held to the lab chart vocabulary:
 * lines, percentile bands, stacked areas and state heatmaps. Bar charts were
 * rejected repeatedly, and a bar is a one-word edit away from coming back.
 *
 * These are render assertions, not a grep: they read the option objects the
 * component actually hands ECharts.
 */

const tsxPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "analytics",
  "ImageChurnCharts.tsx",
);

/** Everything the lab style sanctions here. `bar` is deliberately absent. */
const ALLOWED_SERIES = new Set(["line", "scatter", "heatmap"]);

function loadComponent(datasetFixture) {
  const capturedECharts = [];
  const capturedUnavailable = [];

  const mocks = (id) => {
    if (id.endsWith(".css")) return {};
    if (id === "@theme/Heading") {
      return {
        __esModule: true,
        default: ({ as: Tag = "h3", children, ...rest }) =>
          React.createElement(Tag, rest, children),
      };
    }
    if (id.endsWith("EChart")) {
      return {
        __esModule: true,
        default: (props) => {
          capturedECharts.push(props);
          return React.createElement("div", { "data-echart": props.title });
        },
      };
    }
    if (id.endsWith("Unavailable")) {
      return {
        __esModule: true,
        default: (props) => {
          capturedUnavailable.push(props);
          return React.createElement("div", {
            "data-unavailable": props.what,
            "data-reason": props.reason,
          });
        },
      };
    }
    if (id.endsWith("Sparkline")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement("span", {
            "data-sparkline": "true",
            "data-domain": JSON.stringify(props.domain),
            "data-label": props.label,
          }),
      };
    }
    if (id === "@site/static/data/update-churn.json") {
      return (
        datasetFixture ||
        require(
          path.join(__dirname, "..", "static", "data", "update-churn.json"),
        )
      );
    }
    return undefined;
  };

  return {
    mod: loadTsxModule(tsxPath, mocks),
    capturedECharts,
    capturedUnavailable,
  };
}

const release = (over) => ({
  tag: "t",
  date: "2026-01-01",
  previousTag: "prev",
  downloadChurnMB: 100,
  sharedMB: 100,
  totalMB: 200,
  reuseEfficiencyPct: 50,
  totalLayers: 10,
  sharedLayers: 5,
  newLayers: 5,
  zstdLayers: 10,
  compressionFormat: "zstd-chunked",
  isBaseline: false,
  ...over,
});

const FIXTURE = {
  generatedAt: "2026-09-10T05:16:04.080Z",
  source: "test",
  method: "oci-layer-diff-v1",
  unit: "MB",
  images: {
    bluefin: {
      id: "bluefin",
      name: "Bluefin",
      edition: "Flagship Workstation",
      package: "projectbluefin/bluefin",
      stream: "stable",
      unavailable: false,
      releases: [
        release({
          tag: "base",
          date: "2026-01-01",
          previousTag: null,
          isBaseline: true,
          downloadChurnMB: 3000,
          sharedMB: 0,
          totalMB: 3000,
          reuseEfficiencyPct: 0,
          compressionFormat: "gzip",
          zstdLayers: 0,
        }),
        release({ tag: "next", date: "2026-01-08", previousTag: "base" }),
      ],
    },
    utah: {
      id: "utah",
      name: "Project Bluefin Utah",
      edition: "Modular Workstation",
      package: "projectbluefin/utah",
      stream: "testing",
      unavailable: true,
      stateReason: "No stable releases available yet",
      releases: [],
    },
  },
};

/** `null` loads the real tracked dataset; anything else is a fixture. */
function renderFixture(fixture) {
  const loaded = loadComponent(fixture);
  const html = renderToStaticMarkup(React.createElement(loaded.mod.default));
  return { ...loaded, html };
}

function seriesOf(option) {
  return Array.isArray(option.series) ? option.series : [];
}

test("no panel renders a bar chart", () => {
  for (const fixture of [FIXTURE, null]) {
    const { capturedECharts } = renderFixture(fixture);
    assert.ok(capturedECharts.length >= 4, "expected every panel to chart");
    for (const chart of capturedECharts) {
      for (const s of seriesOf(chart.option)) {
        assert.ok(
          ALLOWED_SERIES.has(s.type),
          `${chart.title} draws a "${s.type}" series`,
        );
      }
    }
  }
});

test("every chart declares how many real points it has", () => {
  const { capturedECharts } = renderFixture(FIXTURE);
  for (const chart of capturedECharts) {
    assert.equal(
      typeof chart.points,
      "number",
      `${chart.title} passes no point count`,
    );
    assert.ok(chart.points > 0, `${chart.title} charted with no points`);
    assert.equal(
      typeof chart.minPoints,
      "number",
      `${chart.title} passes no minimum`,
    );
  }
});

test("ridgeline lanes share one value domain rather than autoscaling", () => {
  const { capturedECharts } = renderFixture(null);
  const ridgelines = capturedECharts.filter((c) =>
    Array.isArray(c.option.grid),
  );
  assert.ok(ridgelines.length >= 2, "expected the two small-multiple panels");

  for (const chart of ridgelines) {
    const maxima = chart.option.yAxis.map((a) => a.max);
    assert.ok(maxima.length > 1, `${chart.title} has a single lane`);
    assert.equal(
      new Set(maxima).size,
      1,
      `${chart.title} lanes autoscale: ${maxima.join(", ")}`,
    );

    // One x domain too: every lane is indexed against the same release dates.
    const columns = chart.option.xAxis.map((a) => JSON.stringify(a.data));
    assert.equal(new Set(columns).size, 1, `${chart.title} lanes differ in x`);
  }
});

test("a baseline release is withheld from the delta series, not drawn as churn", () => {
  const { capturedECharts } = renderFixture(FIXTURE);
  const churn = capturedECharts.find(
    (c) => c.title === "Download churn per release",
  );
  const delta = seriesOf(churn.option).find((s) =>
    s.name.includes("download delta"),
  );
  const baseline = seriesOf(churn.option).find((s) =>
    s.name.includes("baseline pull"),
  );

  // Two dates: the baseline on the first, a real delta on the second.
  assert.deepEqual(delta.data, [null, 100]);
  assert.deepEqual(baseline.data, [3000, null]);
  assert.equal(baseline.type, "scatter");
});

test("an unmeasurable reuse cell reads as unknown, never as zero percent", () => {
  const { capturedECharts } = renderFixture(FIXTURE);
  const heat = capturedECharts.find(
    (c) => c.title === "Layer reuse by image and release",
  );
  const cells = seriesOf(heat.option)[0].data;
  const byKey = new Map(cells.map((c) => [c.value.slice(0, 2).join(":"), c]));

  const baselineCell = byKey.get("0:0");
  assert.equal(baselineCell.value[2], 0, "baseline maps to the unknown piece");
  assert.match(baselineCell.text, /base$/);
  assert.match(baselineCell.tip, /no previous tag/);

  const deltaCell = byKey.get("1:0");
  assert.match(deltaCell.text, /50%$/, "a measured cell carries its number");

  // An image with no releases keeps its row and says why.
  const utahCell = byKey.get("0:1");
  assert.equal(utahCell.value[2], 0);
  assert.match(utahCell.tip, /No stable releases available yet/);
});

test("an image with no releases states the reason instead of vanishing", () => {
  const { capturedUnavailable, html } = renderFixture(FIXTURE);
  const utah = capturedUnavailable.filter((u) =>
    u.what.includes("Project Bluefin Utah"),
  );
  assert.ok(utah.length > 0, "Utah dropped out of the page silently");
  for (const panel of utah) {
    assert.match(panel.reason, /No stable releases available yet/);
  }
  assert.match(html, /data-unavailable/);
});

test("a percentile band is withheld until a lane has enough real deltas", () => {
  const { capturedECharts, html } = renderFixture(FIXTURE);
  const churn = capturedECharts.find(
    (c) => c.title === "Download churn per release",
  );
  const bandOf = (option) =>
    seriesOf(option).filter((s) => String(s.stack).startsWith("band-"));
  assert.deepEqual(bandOf(churn.option), [], "a band was drawn from one delta");
  assert.match(html, /Percentile band withheld/);

  const dense = structuredClone(FIXTURE);
  dense.images.bluefin.releases = [
    dense.images.bluefin.releases[0],
    ...[1, 2, 3, 4, 5].map((d) =>
      release({
        tag: `d${d}`,
        date: `2026-02-0${d}`,
        downloadChurnMB: 100 * d,
      }),
    ),
  ];
  const banded = renderFixture(dense).capturedECharts.find(
    (c) => c.title === "Download churn per release",
  );
  const band = bandOf(banded.option);
  assert.equal(band.length, 2, "expected a floor series and a spread series");
  assert.equal(band[0].lineStyle.opacity, undefined);
  assert.equal(band[1].lineStyle.opacity, 0, "the spread carries the area");
  assert.ok(band[1].areaStyle, "the spread series has no area");
});

test("the whole section reports a pipeline outage with its reason", () => {
  const { capturedECharts, capturedUnavailable } = renderFixture({
    generatedAt: "2026-09-10T00:00:00Z",
    source: "test",
    method: "oci-layer-diff-v1",
    unit: "MB",
    unavailable: true,
    stateReason: "GHCR manifest read failed",
    images: {},
  });
  assert.equal(capturedECharts.length, 0);
  assert.deepEqual(
    capturedUnavailable.map((u) => u.reason),
    ["GHCR manifest read failed"],
  );
});
