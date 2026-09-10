const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");

const dashboardPath = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "HiveFactoryDashboard.tsx",
);
const configPath = path.join(__dirname, "..", "docusaurus.config.ts");

function loadDashboardModule() {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(dashboardPath, "utf8"),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    },
  );
  const mod = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => {
      if (id.endsWith(".css")) return {};
      if (id.includes("FactoryDataContext")) {
        return {
          useDataset: () => ({
            data: null,
            loading: false,
            reason: null,
          }),
        };
      }
      if (id === "@docusaurus/Link") {
        return { __esModule: true, default: ({ children }) => children };
      }
      if (id === "@theme/Heading") {
        return { __esModule: true, default: ({ children }) => children };
      }
      if (id === "@theme/Layout") {
        return { __esModule: true, default: ({ children }) => children };
      }
      if (id.includes("Sparkline") || id.includes("ActivityCalendar")) {
        return { __esModule: true, default: () => React.createElement("svg") };
      }
      if (id.includes("chartTheme")) return { FX_SEVERITY: {} };
      if (id.startsWith("@docusaurus/")) {
        return { __esModule: true, default: () => null };
      }
      return require(id);
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

test("QUEUE_URL_FALLBACK points to projectbluefin.github.io/review/queue.json", () => {
  const source = fs.readFileSync(dashboardPath, "utf8");
  assert.match(
    source,
    /const QUEUE_URL_FALLBACK = "https:\/\/projectbluefin\.github\.io\/review\/queue\.json";/,
  );
  assert.doesNotMatch(
    source,
    /const QUEUE_URL_FALLBACK = "https:\/\/queue\.projectbluefin\.io\/data\.json";/,
  );
});

test("docusaurus CSP connect-src allows projectbluefin.github.io and not queue.projectbluefin.io", () => {
  const config = fs.readFileSync(configPath, "utf8");
  assert.ok(
    config.includes("https://projectbluefin.github.io"),
    "CSP should allow projectbluefin.github.io",
  );
  assert.ok(
    !config.includes("https://queue.projectbluefin.io"),
    "CSP should not contain queue.projectbluefin.io",
  );
});

test("normalizePublicQueueFeed maps flat feed items to QueueData shape", () => {
  const { normalizePublicQueueFeed } = loadDashboardModule();
  assert.equal(typeof normalizePublicQueueFeed, "function");

  const sampleFeed = {
    generated_at: "2026-09-10T12:00:00Z",
    items: [
      {
        id: "projectbluefin/common#807",
        repository: "projectbluefin/common",
        number: 807,
        url: "https://github.com/projectbluefin/common/pull/807",
        title: "feat(telemetry): countme client",
        author: "castrojo",
        updated_at: "2026-08-07T01:55:17Z",
        labels: ["4-review", "agent/scanner"],
      },
      {
        id: "projectbluefin/documentation#1090",
        repository: "projectbluefin/documentation",
        number: 1090,
        url: "https://github.com/projectbluefin/documentation/pull/1090",
        title: "fix(factory): queue fallback",
        author: "Danathar",
        updated_at: "2026-09-10T12:05:00Z",
      },
    ],
  };

  const queueData = normalizePublicQueueFeed(sampleFeed);

  assert.equal(queueData.generated, "2026-09-10T12:00:00Z");
  assert.deepEqual(queueData.repos, [
    "projectbluefin/common",
    "projectbluefin/documentation",
  ]);
  assert.deepEqual(queueData.issues, { p0: [], p1: [] });
  assert.equal(queueData.prs.required.length, 2);
  assert.deepEqual(queueData.prs.approved, []);
  assert.deepEqual(queueData.prs.none, []);

  const firstPr = queueData.prs.required[0];
  assert.equal(firstPr.title, "feat(telemetry): countme client");
  assert.equal(
    firstPr.html_url,
    "https://github.com/projectbluefin/common/pull/807",
  );
  assert.equal(
    firstPr.repository_url,
    "https://api.github.com/repos/projectbluefin/common",
  );
  assert.equal(firstPr.updated_at, "2026-08-07T01:55:17Z");
  assert.deepEqual(firstPr.labels, [
    { name: "4-review", color: "" },
    { name: "agent/scanner", color: "" },
  ]);

  const secondPr = queueData.prs.required[1];
  assert.deepEqual(secondPr.labels, []);

  assert.equal(queueData.victories.startDate, "2026-09-10T12:00:00Z");
  assert.equal(queueData.victories.dreams.count, 0);
  assert.deepEqual(queueData.victories.dreams.recent, []);
});

test("normalizePublicQueueFeed handles empty items safely", () => {
  const { normalizePublicQueueFeed } = loadDashboardModule();

  const emptyFeed = {
    generated_at: "2026-09-10T12:00:00Z",
    items: [],
  };

  const queueData = normalizePublicQueueFeed(emptyFeed);
  assert.equal(queueData.generated, "2026-09-10T12:00:00Z");
  assert.deepEqual(queueData.repos, []);
  assert.deepEqual(queueData.prs.required, []);
});
