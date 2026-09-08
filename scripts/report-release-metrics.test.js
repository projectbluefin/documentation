import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchReleaseEvents } from "./lib/report-release-metrics.mjs";

const PERIOD = { start: "2026-10-01", end: "2026-10-31" };
const RELEASE_ENTRY = {
  repository: "projectbluefin/bluefin",
  signals: ["activity", "releases"],
};
const RELEASES_URL =
  "https://api.github.com/repos/projectbluefin/bluefin/releases";

test("fetchReleaseEvents returns public release metadata with available provenance", async () => {
  const result = await fetchReleaseEvents(
    [RELEASE_ENTRY],
    PERIOD,
    async (url) => {
      assert.equal(url, RELEASES_URL);
      return {
        ok: true,
        async json() {
          return [
            {
              id: 101,
              name: "October release",
              tag_name: "v1.0.0",
              published_at: "2026-10-15T12:00:00Z",
              html_url:
                "https://github.com/projectbluefin/bluefin/releases/tag/v1.0.0",
              body: "Release notes must not be copied into reports.",
            },
            {
              id: 102,
              name: "September release",
              tag_name: "v0.9.0",
              published_at: "2026-09-30T12:00:00Z",
              html_url:
                "https://github.com/projectbluefin/bluefin/releases/tag/v0.9.0",
              body: "Outside the report window.",
            },
          ];
        },
      };
    },
  );

  assert.deepEqual(result.events, [
    {
      id: 101,
      repository: "projectbluefin/bluefin",
      name: "October release",
      tagName: "v1.0.0",
      publishedAt: "2026-10-15T12:00:00Z",
      url: "https://github.com/projectbluefin/bluefin/releases/tag/v1.0.0",
    },
  ]);
  assert.equal(result.events[0].body, undefined);
  assert.equal(result.source.id, "github-releases");
  assert.equal(result.source.status, "available");
  assert.equal(result.source.stateReason, null);
  assert.equal(result.source.url, RELEASES_URL);
  assert.deepEqual(result.source.window, PERIOD);
});

test("fetchReleaseEvents retains unavailable source provenance", async () => {
  const result = await fetchReleaseEvents(
    [RELEASE_ENTRY],
    PERIOD,
    async (url) => {
      assert.equal(url, RELEASES_URL);
      return { ok: false, status: 503 };
    },
  );

  assert.deepEqual(result.events, []);
  assert.equal(result.source.id, "github-releases");
  assert.equal(result.source.status, "unavailable");
  assert.match(result.source.stateReason, /503/);
  assert.equal(result.source.url, RELEASES_URL);
  assert.deepEqual(result.source.window, PERIOD);
});
