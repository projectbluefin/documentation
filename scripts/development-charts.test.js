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
const DevelopmentMetricsCharts = loadTsxModule(
  path.join(root, "analytics", "DevelopmentMetricsCharts.tsx"),
  (id) => {
    if (id.endsWith(".css")) return {};
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

function sampleFixture() {
  return {
    schemaVersion: 2,
    org: "projectbluefin",
    generatedAt: "2026-10-24T00:00:00.000Z",
    unavailable: false,
    stateReason: null,
    coverage: {
      repositories: [
        { id: "R1", name: "documentation", fork: false, archived: false },
        { id: "R2", name: "website", fork: false, archived: false },
      ],
      complete: true,
    },
    development: {
      current: {
        mergedPRs7d: 5,
        mergedPRs30d: 18,
        activeRepositories7d: 2,
        medianDurationHours7d: 14.2,
        p75DurationHours7d: 48.5,
      },
      windows: [
        {
          start: "2026-10-17T00:00:00.000Z",
          end: "2026-10-24T00:00:00.000Z",
          mergedPRs: 5,
          activeRepositories: 2,
          medianDurationHours: 14.2,
          p75DurationHours: 48.5,
        },
        {
          start: "2026-10-10T00:00:00.000Z",
          end: "2026-10-17T00:00:00.000Z",
          mergedPRs: 3,
          activeRepositories: 1,
          medianDurationHours: 8.0,
          p75DurationHours: 20.0,
        },
      ],
    },
  };
}

function render(data) {
  charts.length = 0;
  return renderToStaticMarkup(
    React.createElement(DevelopmentMetricsCharts, { data }),
  );
}

test("DevelopmentMetricsCharts renders KPI cards, readable duration, and rolling window bar chart", () => {
  const data = sampleFixture();
  const html = render(data);

  assert.match(html, /Merged PRs \(7 days\)<\/span><strong[^>]*>5<\/strong>/);
  assert.match(html, /Merged PRs \(30 days\)<\/span><strong[^>]*>18<\/strong>/);
  assert.match(html, /Across 2 repositories/);
  assert.match(html, /Median merge cycle<\/span><strong[^>]*>14.2h<\/strong>/);
  assert.match(html, /P75 merge cycle<\/span><strong[^>]*>2d<\/strong>/);
  assert.equal(charts[0].points, 2);
  assert.equal(charts[0].option.series[0].type, "bar");
  // Oldest window to newest (left to right)
  assert.deepEqual(charts[0].option.series[0].data, [3, 5]);
  assert.match(html, /<details/);
  assert.match(html, /<summary>Show the numbers<\/summary>/);
  assert.equal(charts[0].title, "Weekly merged pull requests");
});

test("DevelopmentMetricsCharts handles null counts and missing development payload", () => {
  const data = sampleFixture();
  data.development.current.mergedPRs7d = null;
  data.development.current.activeRepositories7d = null;
  data.development.current.medianDurationHours7d = null;
  data.development.current.p75DurationHours7d = null;
  data.development.windows[0].mergedPRs = null;

  const html = render(data);
  assert.match(html, /Merged PRs \(7 days\)<\/span><strong[^>]*>—<\/strong>/);
  assert.match(html, /Trailing 168-hour window/);
  assert.match(html, /Median merge cycle<\/span><strong[^>]*>—<\/strong>/);
  assert.deepEqual(charts[0].option.series[0].data, [3, null]);
  assert.equal(charts[0].points, 1);

  const missing = render({});
  assert.match(missing, /role="status"/);
  assert.match(missing, /Development metrics unavailable/);
});

test("DevelopmentMetricsCharts displays visible notice when data is unavailable or coverage incomplete", () => {
  const data = sampleFixture();
  data.unavailable = true;
  data.stateReason = "Upstream GitHub rate limit";
  const html = render(data);
  assert.match(html, /Current development metrics unavailable/);
  assert.match(html, /Upstream GitHub rate limit/);
  assert.match(html, /Values below are the retained snapshot/);
});
