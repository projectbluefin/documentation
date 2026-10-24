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
  "ContributorMetricsCharts.tsx",
);

function loadComponent() {
  return loadTsxModule(TSX_PATH, (id) => {
    if (id.endsWith(".css")) return {};
    if (id === "react") return React;
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
          React.createElement(
            "div",
            {
              "data-testid": "echart",
              "data-title": props.title,
              "data-summary": props.summary,
              "data-points": String(props.points),
              "data-min-points": String(props.minPoints),
              "data-option": JSON.stringify(props.option),
            },
            props.points < (props.minPoints ?? 2)
              ? "accumulating data"
              : props.summary,
            props.tableCaption
              ? React.createElement(
                  "details",
                  null,
                  React.createElement("summary", null, "Show the numbers"),
                  React.createElement(
                    "table",
                    null,
                    React.createElement("caption", null, props.tableCaption),
                  ),
                )
              : null,
          ),
      };
    }
    if (id.includes("Unavailable")) {
      return {
        __esModule: true,
        default: (props) =>
          React.createElement(
            "div",
            {
              "data-testid": "unavailable",
              "data-what": props.what,
              "data-reason": props.reason,
            },
            `${props.what} unavailable: ${props.reason}`,
          ),
      };
    }
    return undefined;
  });
}

const mod = loadComponent();
const ContributorMetricsCharts = mod.default;

const FULL_DATA_FIXTURE = {
  schemaVersion: 1,
  generatedAt: "2026-10-24T00:00:00.000Z",
  source: "GitHub GraphQL & PR Events",
  org: "projectbluefin",
  unavailable: false,
  stateReason: null,
  months: [
    {
      month: "2026-07",
      activeContributors: 11,
      firstTimeContributors: 3,
      streams: {
        humanPrs: 126,
        automationPrs: 427,
        codeBuilds: 126,
        codeReviews: 45,
        issuesTriage: 80,
        documentation: 15,
        prsOpened: 150,
        prsMerged: 126,
        medianDaysToMerge: 2.5,
        medianResponseHours: 18,
        mergeRatePercent: 84,
      },
      cohorts: {
        new: 3,
        returning: 8,
      },
    },
    {
      month: "2026-08",
      activeContributors: 15,
      firstTimeContributors: 4,
      streams: {
        humanPrs: 258,
        automationPrs: 283,
        codeBuilds: 258,
        codeReviews: 70,
        issuesTriage: 110,
        documentation: 25,
        prsOpened: 270,
        prsMerged: 258,
        medianDaysToMerge: 1.8,
        medianResponseHours: 12,
        mergeRatePercent: 95,
      },
      cohorts: {
        new: 4,
        returning: 11,
      },
    },
    {
      month: "2026-09",
      activeContributors: 18,
      firstTimeContributors: 5,
      streams: {
        humanPrs: 290,
        automationPrs: 310,
        codeBuilds: 290,
        codeReviews: 85,
        issuesTriage: 130,
        documentation: 30,
        prsOpened: 310,
        prsMerged: 290,
        medianDaysToMerge: 1.5,
        medianResponseHours: 10,
        mergeRatePercent: 93,
      },
      cohorts: {
        new: 5,
        returning: 13,
      },
    },
  ],
};

const ACCUMULATING_DATA_FIXTURE = {
  schemaVersion: 1,
  generatedAt: "2026-10-24T00:00:00.000Z",
  source: "GitHub GraphQL & PR Events",
  org: "projectbluefin",
  unavailable: false,
  stateReason: null,
  months: [
    {
      month: "2026-07",
      activeContributors: 11,
      firstTimeContributors: 3,
      streams: {
        humanPrs: 126,
        automationPrs: 427,
        issues: null,
        reviews: null,
      },
      cohorts: {
        new: 3,
        returning: 8,
      },
    },
    {
      month: "2026-08",
      activeContributors: 15,
      firstTimeContributors: 4,
      streams: {
        humanPrs: 258,
        automationPrs: 283,
        issues: null,
        reviews: null,
      },
      cohorts: {
        new: 4,
        returning: 11,
      },
    },
  ],
};

const UNAVAILABLE_DATA_FIXTURE = {
  schemaVersion: 1,
  generatedAt: "2026-10-24T00:00:00.000Z",
  source: "GitHub GraphQL & PR Events",
  org: "projectbluefin",
  unavailable: true,
  stateReason: "Rate limit exceeded or GITHUB_TOKEN missing",
  months: [],
};

test("renders full contributor analytics metrics and charts", () => {
  const html = renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, {
      data: FULL_DATA_FIXTURE,
    }),
  );

  // 4 summary metric cards
  assert.ok(html.includes("Monthly Active Humans"));
  assert.ok(html.includes("First-Time Humans"));
  assert.ok(html.includes("PR Merge Rate"));
  assert.ok(html.includes("Median Response Time"));

  // Check numeric values rendered prominently
  assert.ok(html.includes("18")); // Latest active humans (2026-09)
  assert.ok(html.includes("5")); // Latest first-time humans (2026-09)
  assert.ok(html.includes("93%")); // Latest merge rate (2026-09)
  assert.ok(html.includes("10h")); // Latest median response time (2026-09)

  // 3 line charts
  assert.ok(html.includes("Active Human Contributors Trend"));
  assert.ok(html.includes("Human Contribution Types Breakdown"));
  assert.ok(
    html.includes("PR Velocity &amp; Merge Rate") ||
      html.includes("PR Velocity & Merge Rate"),
  );

  // Details summary tables
  assert.ok(html.includes("<details>"));
  assert.ok(html.includes("<summary>Show the numbers</summary>"));
  assert.ok(
    html.includes("Monthly breakdown of new vs returning human contributors"),
  );
  assert.ok(
    html.includes(
      "Activity breakdown by contribution stream across Tier-1 repositories",
    ),
  );
  assert.ok(
    html.includes(
      "Pull request opening velocity, merges, and median turnaround time",
    ),
  );
});

test("renders Unavailable when dataset is marked unavailable", () => {
  const html = renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, {
      data: UNAVAILABLE_DATA_FIXTURE,
    }),
  );

  assert.ok(html.includes('data-testid="unavailable"'));
  assert.ok(html.includes("Contributor metrics unavailable"));
  assert.ok(html.includes("Rate limit exceeded or GITHUB_TOKEN missing"));
  assert.ok(!html.includes("Monthly Active Humans"));
});

test("renders accumulating data when points count is under 3", () => {
  const html = renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, {
      data: ACCUMULATING_DATA_FIXTURE,
    }),
  );

  // Still renders summary metric cards
  assert.ok(html.includes("Monthly Active Humans"));
  // ECharts receive points=2 and minPoints=3, rendering accumulating data
  assert.ok(html.includes("accumulating data"));
  assert.ok(html.includes('data-min-points="3"'));
  assert.ok(html.includes('data-points="2"'));
});

test("deterministic SSR output across multiple renders", () => {
  const render1 = renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, {
      data: FULL_DATA_FIXTURE,
    }),
  );
  const render2 = renderToStaticMarkup(
    React.createElement(ContributorMetricsCharts, {
      data: FULL_DATA_FIXTURE,
    }),
  );

  assert.equal(render1, render2, "SSR output must be strictly deterministic");
});
