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
const SECOND_RELEASE_ENTRY = {
  repository: "projectbluefin/dakota",
  signals: ["activity", "releases"],
};
const SECOND_RELEASES_URL =
  "https://api.github.com/repos/projectbluefin/dakota/releases";

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
  assert.deepEqual(result.sources, [
    {
      id: "github-releases",
      repository: RELEASE_ENTRY.repository,
      status: "available",
      stateReason: null,
      url: RELEASES_URL,
      window: PERIOD,
    },
  ]);
  assert.deepEqual(result.source, {
    id: "github-releases",
    status: "available",
    stateReason: null,
    url: RELEASES_URL,
    window: PERIOD,
  });
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
  assert.deepEqual(result.sources, [
    {
      id: "github-releases",
      repository: RELEASE_ENTRY.repository,
      status: "unavailable",
      stateReason: "HTTP 503",
      url: RELEASES_URL,
      window: PERIOD,
    },
  ]);
  assert.deepEqual(result.source, {
    id: "github-releases",
    status: "unavailable",
    stateReason: "HTTP 503",
    url: RELEASES_URL,
    window: PERIOD,
  });
});

test("fetchReleaseEvents preserves provenance for each release-enabled repository", async () => {
  const result = await fetchReleaseEvents(
    [RELEASE_ENTRY, SECOND_RELEASE_ENTRY],
    PERIOD,
    async (url) => {
      if (url === RELEASES_URL) {
        return {
          ok: true,
          async json() {
            return [];
          },
        };
      }
      assert.equal(url, SECOND_RELEASES_URL);
      return { ok: false, status: 503 };
    },
  );

  assert.deepEqual(result.sources, [
    {
      id: "github-releases",
      repository: "projectbluefin/bluefin",
      status: "available",
      stateReason: null,
      url: RELEASES_URL,
      window: PERIOD,
    },
    {
      id: "github-releases",
      repository: "projectbluefin/dakota",
      status: "unavailable",
      stateReason: "HTTP 503",
      url: SECOND_RELEASES_URL,
      window: PERIOD,
    },
  ]);
  assert.deepEqual(result.source, {
    id: "github-releases",
    status: "unavailable",
    stateReason: "HTTP 503",
    url: "https://api.github.com/repos",
    window: PERIOD,
  });
});

test("fetchReleaseEvents follows GitHub release pagination", async () => {
  const pageTwoUrl = `${RELEASES_URL}?page=2`;
  const calls = [];
  const result = await fetchReleaseEvents(
    [RELEASE_ENTRY],
    PERIOD,
    async (url) => {
      calls.push(url);
      if (url === RELEASES_URL) {
        return {
          ok: true,
          headers: {
            get(name) {
              assert.equal(name, "link");
              return `<${pageTwoUrl}>; rel="next"`;
            },
          },
          async json() {
            return [
              {
                id: 201,
                name: "First page release",
                tag_name: "v1.0.0",
                published_at: "2026-10-05T12:00:00Z",
                html_url:
                  "https://github.com/projectbluefin/bluefin/releases/tag/v1.0.0",
              },
            ];
          },
        };
      }
      assert.equal(url, pageTwoUrl);
      return {
        ok: true,
        headers: { get: () => null },
        async json() {
          return [
            {
              id: 202,
              name: "Second page release",
              tag_name: "v0.9.0",
              published_at: "2026-10-20T12:00:00Z",
              html_url:
                "https://github.com/projectbluefin/bluefin/releases/tag/v0.9.0",
            },
          ];
        },
      };
    },
  );

  assert.deepEqual(calls, [RELEASES_URL, pageTwoUrl]);
  assert.deepEqual(
    result.events.map((event) => event.id),
    [201, 202],
  );
});
