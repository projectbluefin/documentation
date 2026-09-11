/**
 * Tests for scripts/lib/tap-promotions.mjs
 *
 * Covers:
 * - parseFormulaDescription: extraction from double-quoted and single-quoted desc lines, null for missing
 * - fetchTapPromotions and fetchExperimentalAdditions routing to proper repos
 * - fetchRepoAdditions with injected client & fetchImpl:
 *   - pagination of merged PRs
 *   - UPDATED_AT DESC early exit boundary
 *   - file filtering for added Formula/ and Casks/ .rb files
 *   - package name normalization (removing Formula/, Casks/, .rb)
 *   - package description fetching and fallback to "No description available"
 *   - date range filtering on mergedAt
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const START = new Date("2026-03-01T00:00:00.000Z");
const END = new Date("2026-03-31T23:59:59.000Z");

async function load() {
  return import("./lib/tap-promotions.mjs");
}

describe("parseFormulaDescription", () => {
  it("extracts description enclosed in double quotes", async () => {
    const { parseFormulaDescription } = await load();
    const ruby = `
class Foo < Formula
  desc "A blazing fast utility for Bluefin"
  homepage "https://example.com"
end
`;
    assert.equal(
      parseFormulaDescription(ruby),
      "A blazing fast utility for Bluefin",
    );
  });

  it("extracts description enclosed in single quotes", async () => {
    const { parseFormulaDescription } = await load();
    const ruby = `
cask "bar" do
  version "1.0.0"
  desc 'Lightweight status monitor'
  homepage "https://example.com"
end
`;
    assert.equal(parseFormulaDescription(ruby), "Lightweight status monitor");
  });

  it("handles extra whitespace around desc and quotes", async () => {
    const { parseFormulaDescription } = await load();
    const ruby = `  desc    "Tool with spaces"   `;
    assert.equal(parseFormulaDescription(ruby), "Tool with spaces");
  });

  it("returns null when no desc declaration is found", async () => {
    const { parseFormulaDescription } = await load();
    const ruby = `
class EmptyDesc < Formula
  homepage "https://example.com"
end
`;
    assert.equal(parseFormulaDescription(ruby), null);
  });

  it("returns null for non-matching or empty content", async () => {
    const { parseFormulaDescription } = await load();
    assert.equal(parseFormulaDescription(""), null);
    assert.equal(parseFormulaDescription("description 'wrong keyword'"), null);
  });
});

describe("tap promotions with injected seams", () => {
  it("fetchTapPromotions queries production repo and fetches files + descriptions", async () => {
    const { fetchTapPromotions } = await load();
    let requestedRepo = null;
    const client = async (_query, vars) => {
      requestedRepo = `${vars.owner}/${vars.name}`;
      return {
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 42,
                title: "Add fancy-tool",
                url: "https://github.com/ublue-os/homebrew-tap/pull/42",
                mergedAt: "2026-03-10T12:00:00.000Z",
                updatedAt: "2026-03-10T12:00:00.000Z",
              },
            ],
          },
        },
      };
    };

    const fetchImpl = async (url) => {
      if (url.includes("/pulls/42/files")) {
        return new Response(
          JSON.stringify([
            { filename: "Formula/fancy-tool.rb", status: "added" },
            { filename: "README.md", status: "modified" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/contents/Formula/fancy-tool.rb")) {
        return new Response(
          'class FancyTool < Formula\n  desc "Does fancy things"\nend\n',
          { status: 200 },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const additions = await fetchTapPromotions(START, END, {
      client,
      fetchImpl,
    });

    assert.equal(requestedRepo, "ublue-os/homebrew-tap");
    assert.deepEqual(additions, [
      {
        name: "fancy-tool",
        description: "Does fancy things",
        mergedAt: "2026-03-10T12:00:00.000Z",
        prNumber: 42,
        prUrl: "https://github.com/ublue-os/homebrew-tap/pull/42",
      },
    ]);
  });

  it("fetchExperimentalAdditions queries experimental repo and supports Casks", async () => {
    const { fetchExperimentalAdditions } = await load();
    let requestedRepo = null;
    const client = async (_query, vars) => {
      requestedRepo = `${vars.owner}/${vars.name}`;
      return {
        repository: {
          pullRequests: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                number: 10,
                title: "Add desktop app",
                url: "https://github.com/ublue-os/homebrew-experimental-tap/pull/10",
                mergedAt: "2026-03-15T08:00:00.000Z",
                updatedAt: "2026-03-15T08:00:00.000Z",
              },
            ],
          },
        },
      };
    };

    const fetchImpl = async (url) => {
      if (url.includes("/pulls/10/files")) {
        return new Response(
          JSON.stringify([
            { filename: "Casks/desktop-app.rb", status: "added" },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/contents/Casks/desktop-app.rb")) {
        return new Response(
          'cask "desktop-app" do\n  desc "Desktop GUI app"\nend\n',
          { status: 200 },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const additions = await fetchExperimentalAdditions(START, END, {
      client,
      fetchImpl,
    });

    assert.equal(requestedRepo, "ublue-os/homebrew-experimental-tap");
    assert.deepEqual(additions, [
      {
        name: "desktop-app",
        description: "Desktop GUI app",
        mergedAt: "2026-03-15T08:00:00.000Z",
        prNumber: 10,
        prUrl: "https://github.com/ublue-os/homebrew-experimental-tap/pull/10",
      },
    ]);
  });

  it("falls back to 'No description available' if description fetch returns null", async () => {
    const { fetchTapPromotions } = await load();
    const client = async () => ({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              number: 7,
              title: "Add undescribed tool",
              url: "https://github.com/ublue-os/homebrew-tap/pull/7",
              mergedAt: "2026-03-20T00:00:00.000Z",
              updatedAt: "2026-03-20T00:00:00.000Z",
            },
          ],
        },
      },
    });

    const fetchImpl = async (url) => {
      if (url.includes("/pulls/7/files")) {
        return new Response(
          JSON.stringify([{ filename: "Formula/nodesc.rb", status: "added" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      // Return 404 or file with no desc
      return new Response("404 Not Found", { status: 404 });
    };

    const additions = await fetchTapPromotions(START, END, {
      client,
      fetchImpl,
    });

    assert.equal(additions.length, 1);
    assert.equal(additions[0].description, "No description available");
    assert.equal(additions[0].name, "nodesc");
  });

  it("filters out PRs merged outside the date window", async () => {
    const { fetchTapPromotions } = await load();
    const client = async () => ({
      repository: {
        pullRequests: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            {
              number: 1,
              title: "Too early",
              url: "https://github.com/ublue-os/homebrew-tap/pull/1",
              mergedAt: "2026-02-28T23:59:59.000Z",
              updatedAt: "2026-03-05T00:00:00.000Z",
            },
            {
              number: 2,
              title: "Inside window",
              url: "https://github.com/ublue-os/homebrew-tap/pull/2",
              mergedAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
            },
            {
              number: 3,
              title: "Too late",
              url: "https://github.com/ublue-os/homebrew-tap/pull/3",
              mergedAt: "2026-04-01T00:00:00.000Z",
              updatedAt: "2026-04-01T00:00:00.000Z",
            },
          ],
        },
      },
    });

    let filesCheckedPR = null;
    const fetchImpl = async (url) => {
      const match = url.match(/\/pulls\/(\d+)\/files/);
      if (match) {
        filesCheckedPR = match[1];
        return new Response(
          JSON.stringify([{ filename: "Formula/valid.rb", status: "added" }]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response('desc "Valid"', { status: 200 });
    };

    const additions = await fetchTapPromotions(START, END, {
      client,
      fetchImpl,
    });

    assert.equal(filesCheckedPR, "2");
    assert.equal(additions.length, 1);
    assert.equal(additions[0].prNumber, 2);
  });

  it("paginates pull requests and stops on early-exit when updatedAt < startDate", async () => {
    const { fetchTapPromotions } = await load();
    const pages = [
      {
        pageInfo: { hasNextPage: true, endCursor: "CURSOR_1" },
        nodes: [
          {
            number: 101,
            title: "PR 1",
            url: "https://github.com/ublue-os/homebrew-tap/pull/101",
            mergedAt: "2026-03-25T00:00:00.000Z",
            updatedAt: "2026-03-25T00:00:00.000Z",
          },
          {
            number: 102,
            title: "PR 2",
            url: "https://github.com/ublue-os/homebrew-tap/pull/102",
            mergedAt: "2026-03-20T00:00:00.000Z",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
        ],
      },
      {
        pageInfo: { hasNextPage: true, endCursor: "CURSOR_2" },
        nodes: [
          {
            number: 103,
            title: "PR 3",
            url: "https://github.com/ublue-os/homebrew-tap/pull/103",
            mergedAt: "2026-03-05T00:00:00.000Z",
            updatedAt: "2026-03-05T00:00:00.000Z",
          },
          {
            // Oldest on page 2 has updatedAt before START -> triggers early exit
            number: 104,
            title: "PR 4",
            url: "https://github.com/ublue-os/homebrew-tap/pull/104",
            mergedAt: "2026-02-15T00:00:00.000Z",
            updatedAt: "2026-02-20T00:00:00.000Z",
          },
        ],
      },
      {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [
          {
            number: 105,
            title: "PR 5 (should never be fetched)",
            url: "https://github.com/ublue-os/homebrew-tap/pull/105",
            mergedAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    ];

    let pageIndex = 0;
    const client = async (_query, vars) => {
      const pageData = pages[pageIndex++];
      return { repository: { pullRequests: pageData } };
    };

    const fetchImpl = async (url) => {
      if (url.includes("/files")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("", { status: 404 });
    };

    const additions = await fetchTapPromotions(START, END, {
      client,
      fetchImpl,
    });

    assert.equal(pageIndex, 2, "should have fetched exactly 2 pages before early exit");
    assert.deepEqual(additions, []);
  });
});
