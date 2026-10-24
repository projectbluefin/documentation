const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadTsxModule } = require("./lib/load-tsx");

const root = path.join(__dirname, "..", "src", "components");
const css = (id) => (id.endsWith(".css") ? {} : undefined);
const EChart = loadTsxModule(
  path.join(root, "factory", "EChart.tsx"),
  css,
).default;
const charts = [];
const ContributorMetricsCharts = loadTsxModule(
  path.join(root, "analytics", "ContributorMetricsCharts.tsx"),
  (id) => {
    if (id.endsWith(".css")) return {};
    if (id === "@theme/Heading")
      return {
        __esModule: true,
        default: ({ as: Tag = "h3", children, ...props }) =>
          React.createElement(Tag, props, children),
      };
    if (id === "@site/static/data/contributor-metrics.json")
      return { unavailable: true };
    if (id === "../factory/EChart")
      return {
        __esModule: true,
        default: (props) => {
          charts.push(props);
          return React.createElement(EChart, props);
        },
      };
    return undefined;
  },
).default;

let collectedFixture;
test.before(async () => {
  const { aggregateContributions } = require("./fetch-contributor-metrics");
  const event = (id, kind, at) => ({
    repositoryId: "R1",
    kind,
    at,
    author: { id, login: `account-${id}`, __typename: "User" },
  });
  collectedFixture = await aggregateContributions({
    repositories: [
      { id: "R1", name: "documentation", fork: false, archived: false },
    ],
    asOf: "2026-10-24T00:00:00.000Z",
    complete: true,
    events: [
      event("A", "changes", "2026-07-01T00:00:00Z"),
      event("C", "changes", "2026-07-02T00:00:00Z"),
      event("B", "issues", "2026-09-20T00:00:00Z"),
      event("B", "comments", "2026-09-20T00:00:00Z"),
      event("A", "changes", "2026-10-01T00:00:00Z"),
      event("A", "comments", "2026-10-01T00:00:00Z"),
    ],
  });
});

function fixture() {
  return structuredClone(collectedFixture);
}

function render(data) {
  charts.length = 0;
  return renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, { data }),
  );
}

function assertChartCounts() {
  assert.equal(charts.length, 2);
  for (const chart of charts) {
    assert.equal(chart.option.series.length, 1, "one real series per chart");
    const series = chart.option.series[0];
    assert.equal(
      chart.points,
      series.data.filter((v) => typeof v === "number" && Number.isFinite(v))
        .length,
    );
    assert.equal(series.smooth, false);
    assert.equal(series.connectNulls, false);
    assert.equal(series.type, "line");
    assert.ok(series.areaStyle);
    assert.equal(series.stack, undefined);
    assert.equal(chart.option.yAxis.min, 0);
  }
}

test("schema2 total is independently collected, not monthly activity summed; actual EChart tables expose the data", () => {
  const data = fixture();
  const html = render(data);
  assert.match(html, /Total contributors<\/span><strong[^>]*>3<\/strong>/);
  assert.match(html, /Active in last 90 days<\/span><strong[^>]*>2<\/strong>/);
  assert.equal((html.match(/<figure/g) || []).length, 2);
  assert.equal((html.match(/<details/g) || []).length, 2);
  assert.match(html, /<th scope="row">2026-08<\/th><td>0<\/td>/);
  assert.deepEqual(charts[0].option.series[0].data, [2, 2, 3, 3]);
  assert.deepEqual(charts[1].option.series[0].data, [2, 0, 1, 1]);
  assertChartCounts();
});

test("null counts remain gaps, zero stays measured, and each chart counts only its own finite points", () => {
  const data = fixture();
  data.summary.activeContributors90d = null;
  data.summary.byType90d.reviews = null;
  data.months[1].cumulativeContributors = null;
  data.months[2].contributors = null;
  data.months[3].contributors = null;
  const html = render(data);
  assert.match(html, /Active in last 90 days<\/span><strong[^>]*>—<\/strong>/);
  assert.match(html, /Count unavailable in this snapshot/);
  assert.match(
    html,
    /<th scope="row">Reviews<\/th><td>— · Count unavailable<\/td>/,
  );
  assert.deepEqual(charts[0].option.series[0].data, [2, null, 3, 3]);
  assert.deepEqual(charts[1].option.series[0].data, [2, 0, null, null]);
  assert.equal(charts[0].points, 3);
  assert.equal(charts[1].points, 2);
  assert.match(charts[1].summary, /^— accounts · 2026-10/);
  assertChartCounts();
});

test("zero and unknown datasets do not disappear or pretend to have chart points", () => {
  const data = fixture();
  data.contributors = [];
  data.summary.totalContributors = 0;
  data.summary.activeContributors90d = 0;
  data.summary.activeRepositories90d = 0;
  data.months = [
    { month: "2026-10", contributors: 0, cumulativeContributors: null },
  ];
  const html = render(data);
  assert.match(html, /Total contributors<\/span><strong[^>]*>0<\/strong>/);
  assert.match(html, /accumulating data/);
  assert.equal(charts[0].points, 0);
  assert.equal(charts[1].points, 1);
  assertChartCounts();
  data.months = [];
  const empty = render(data);
  assert.equal((empty.match(/accumulating data/g) || []).length, 2);
  assertChartCounts();
});

test("missing, deprecated, malformed, or non-finite data is visibly unavailable", () => {
  const malformed = fixture();
  malformed.months[0].contributors = Infinity;
  const omitted = fixture();
  delete omitted.summary.byType90d.comments;
  const discontinuous = fixture();
  discontinuous.months.splice(1, 1);
  for (const data of [
    undefined,
    null,
    {},
    { schemaVersion: 1, months: [] },
    malformed,
    omitted,
    discontinuous,
  ]) {
    const html = render(data);
    assert.match(html, /role="status"/);
    assert.match(html, /Contributor metrics unavailable/);
    assert.match(html, /schema version 2/);
    assert.equal(charts.length, 0);
  }
});

test("failed refresh, incomplete coverage, and future snapshots show a visible retained-snapshot warning", () => {
  for (const patch of [
    { unavailable: true, stateReason: "GitHub collection could not complete." },
    { coverage: { ...fixture().coverage, complete: false } },
    { generatedAt: "2999-01-01T00:00:00Z" },
    {
      months: [
        { month: "2999-01", contributors: 1, cumulativeContributors: 3 },
      ],
    },
  ]) {
    const html = render({ ...fixture(), ...patch });
    assert.match(html, /Current contributor metrics unavailable/);
    assert.match(html, /retained snapshot, not a successful current refresh/);
    assert.match(html, /role="status"/);
    assertChartCounts();
  }
});

test("coverage and refresh are accessible and SSR output deterministic", () => {
  const data = fixture();
  const html = render(data);
  assert.match(html, /<time dateTime="2026-10-24T00:00:00.000Z"/);
  assert.match(html, /Complete scan of 1 current public/);
  assert.match(html, /0 unlinked author records excluded/);
  assert.match(html, /not verified people/);
  assert.match(html, /Kinds overlap/);
  assert.equal(render(data), html);
});
