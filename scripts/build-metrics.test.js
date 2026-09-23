/**
 * Tests for scripts/lib/build-metrics.mjs
 *
 * Covers:
 * - calculateWorkflowMetrics:
 *   - empty runs fallback
 *   - success rate calculation and rounding
 *   - failure count
 *   - average duration calculation from run_started_at and updated_at
 * - calculateStatistics:
 *   - totalBuilds across images
 *   - mostActive image identification
 *   - perfectImages (100% success rate with builds > 0)
 *   - weighted average duration across all builds
 *   - empty images array fallback
 * - calculateMoMChange:
 *   - positive and negative percentage changes
 *   - zero baseline returns 0
 * - fetchBuildMetrics:
 *   - end-to-end with injected requestClient seam
 *   - error handling and graceful degradation to null
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

async function load() {
  return import("./lib/build-metrics.mjs");
}

describe("calculateWorkflowMetrics", () => {
  it("returns zeroed metrics when runs list is empty", async () => {
    const { calculateWorkflowMetrics } = await load();
    const result = calculateWorkflowMetrics("test:wf", "org/repo", 1234, []);

    assert.deepEqual(result, {
      name: "test:wf",
      repo: "org/repo",
      workflowId: 1234,
      successRate: 0,
      totalBuilds: 0,
      failures: 0,
      avgDuration: 0,
    });
  });

  it("calculates success rate, failures, and avgDuration correctly", async () => {
    const { calculateWorkflowMetrics } = await load();
    const runs = [
      {
        conclusion: "success",
        run_started_at: "2026-03-01T10:00:00Z",
        updated_at: "2026-03-01T10:02:00Z", // 120s
      },
      {
        conclusion: "success",
        run_started_at: "2026-03-02T10:00:00Z",
        updated_at: "2026-03-02T10:04:00Z", // 240s
      },
      {
        conclusion: "failure",
        run_started_at: "2026-03-03T10:00:00Z",
        updated_at: "2026-03-03T10:01:00Z", // 60s
      },
    ];

    const result = calculateWorkflowMetrics("bluefin:stable", "projectbluefin/bluefin", 125772764, runs);

    assert.equal(result.totalBuilds, 3);
    assert.equal(result.failures, 1);
    // (2 / 3) * 100 = 66.666... -> 66.7
    assert.equal(result.successRate, 66.7);
    // (120 + 240 + 60) / 3 = 140s
    assert.equal(result.avgDuration, 140);
  });

  it("handles runs with missing timestamps gracefully", async () => {
    const { calculateWorkflowMetrics } = await load();
    const runs = [
      {
        conclusion: "success",
        run_started_at: null,
        updated_at: null,
      },
      {
        conclusion: "success",
        run_started_at: "2026-03-01T10:00:00Z",
        updated_at: "2026-03-01T10:01:00Z", // 60s
      },
    ];

    const result = calculateWorkflowMetrics("bluefin:stable", "projectbluefin/bluefin", 125772764, runs);

    assert.equal(result.totalBuilds, 2);
    assert.equal(result.successRate, 100);
    assert.equal(result.avgDuration, 60);
  });
});

describe("calculateStatistics", () => {
  it("returns zeroed statistics when images array is empty", async () => {
    const { calculateStatistics } = await load();
    const stats = calculateStatistics([]);

    assert.deepEqual(stats, {
      totalBuilds: 0,
      mostActive: null,
      perfectStreak: 0,
      perfectImages: [],
      avgDuration: 0,
    });
  });

  it("identifies mostActive, perfectImages, and computes weighted avgDuration", async () => {
    const { calculateStatistics } = await load();
    const images = [
      {
        name: "bluefin:stable",
        totalBuilds: 50,
        successRate: 100,
        avgDuration: 100,
      },
      {
        name: "bluefin:latest",
        totalBuilds: 100,
        successRate: 98.0,
        avgDuration: 200,
      },
      {
        name: "bluefin:lts",
        totalBuilds: 20,
        successRate: 100,
        avgDuration: 150,
      },
    ];

    const stats = calculateStatistics(images);

    assert.equal(stats.totalBuilds, 170);
    assert.equal(stats.mostActive, "bluefin:latest");
    assert.deepEqual(stats.perfectImages, ["bluefin:stable", "bluefin:lts"]);
    assert.equal(stats.perfectStreak, 30);
    // (50*100 + 100*200 + 20*150) / 170 = (5000 + 20000 + 3000) / 170 = 28000 / 170 = 164.705... -> 165
    assert.equal(stats.avgDuration, 165);
  });

  it("handles images with totalBuilds === 0", async () => {
    const { calculateStatistics } = await load();
    const images = [
      {
        name: "unused:workflow",
        totalBuilds: 0,
        successRate: 0,
        avgDuration: 0,
      },
    ];

    const stats = calculateStatistics(images);
    assert.equal(stats.totalBuilds, 0);
    assert.deepEqual(stats.perfectImages, []);
    assert.equal(stats.perfectStreak, 0);
  });
});

describe("calculateMoMChange", () => {
  it("returns percentage delta rounded to 1 decimal", async () => {
    const { calculateMoMChange } = await load();
    assert.equal(calculateMoMChange(95.0, 90.0), 5.6);
    assert.equal(calculateMoMChange(80.0, 100.0), -20);
    assert.equal(calculateMoMChange(100.0, 100.0), 0);
  });

  it("returns 0 when previous is 0 (no division by zero)", async () => {
    const { calculateMoMChange } = await load();
    assert.equal(calculateMoMChange(50.0, 0), 0);
  });
});

describe("fetchBuildMetrics with injected requestClient seam", () => {
  it("fetches metrics for tracked workflows and computes monthly stats", async () => {
    const { fetchBuildMetrics } = await load();

    const start = new Date("2026-03-01T00:00:00Z");
    const end = new Date("2026-03-31T23:59:59Z");

    const mockRequest = async (route, _params) => {
      assert.equal(route, "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs");
      // Return a run based on the workflow id
      return {
        data: {
          workflow_runs: [
            {
              conclusion: "success",
              run_started_at: "2026-03-05T00:00:00Z",
              updated_at: "2026-03-05T00:02:00Z", // 120s
            },
          ],
        },
      };
    };

    const metrics = await fetchBuildMetrics(start, end, {
      requestClient: mockRequest,
    });

    assert.ok(metrics);
    assert.ok(Array.isArray(metrics.images));
    assert.equal(metrics.images.length, 7); // 7 TRACKED_WORKFLOWS
    assert.equal(metrics.stats.totalBuilds, 7);
    assert.equal(metrics.stats.perfectImages.length, 7);
    assert.equal(metrics.previousMonth.images.length, 7);
  });

  it("returns null gracefully if an unhandled top-level error occurs", async () => {
    const { fetchBuildMetrics } = await load();
    // Passing invalid Date that throws in getFullYear or similar
    const result = await fetchBuildMetrics(null, null);
    assert.equal(result, null);
  });
});

describe("fetchBuildMetrics auth headers", () => {
  const start = new Date("2026-03-01T00:00:00Z");
  const end = new Date("2026-03-31T23:59:59Z");

  // These cases assert on the ambient environment, so clear both names before
  // each one; the module caches on import, so a leaked var would persist.
  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  /** An injected requestClient that records the params it was handed. */
  function recordingClient() {
    const calls = [];
    const client = async (route, params) => {
      calls.push({ route, params });
      return { data: { workflow_runs: [] } };
    };
    return { calls, client };
  }

  it("passes the shared header contract to every request", async () => {
    process.env.GITHUB_TOKEN = "env-token";
    const { fetchBuildMetrics } = await load();
    const { calls, client } = recordingClient();

    await fetchBuildMetrics(start, end, { requestClient: client });

    assert.ok(calls.length > 0);
    for (const { params } of calls) {
      assert.equal(params.headers.authorization, "Bearer env-token");
      assert.equal(params.headers.accept, "application/vnd.github+json");
      assert.equal(params.headers["x-github-api-version"], "2022-11-28");
    }
  });

  it("omits authorization entirely when no token is set", async () => {
    // The previous inline read always sent a header, producing the literal
    // `token undefined` — a 401 on a request that would have worked anonymously.
    const { fetchBuildMetrics } = await load();
    const { calls, client } = recordingClient();

    await fetchBuildMetrics(start, end, { requestClient: client });

    assert.ok(calls.length > 0);
    for (const { params } of calls) {
      assert.ok(!("authorization" in params.headers));
    }
  });

  it("resolves the token per call rather than once at import time", async () => {
    const { fetchBuildMetrics } = await load();

    const before = recordingClient();
    await fetchBuildMetrics(start, end, { requestClient: before.client });
    assert.ok(!("authorization" in before.calls[0].params.headers));

    process.env.GH_TOKEN = "late-token";
    const after = recordingClient();
    await fetchBuildMetrics(start, end, { requestClient: after.client });
    assert.equal(
      after.calls[0].params.headers.authorization,
      "Bearer late-token",
    );
  });
});
