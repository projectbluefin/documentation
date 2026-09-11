/**
 * Tests for scripts/lib/graphql-queries.mjs
 *
 * Covers fetchClosedItemsFromRepo: issue/PR normalisation, the client-side
 * date window filter, independent pagination of both resources, the
 * UPDATED_AT-DESC early-exit for merged PRs, and the partial-result contract
 * when a page fails mid-pagination.
 *
 * The module builds its Octokit GraphQL client at import time, so the seam
 * used here is `globalThis.fetch`, which Octokit reads on every call.
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "./lib/graphql-queries.mjs";

const START = new Date("2026-03-01T00:00:00.000Z");
const END = new Date("2026-03-31T23:59:59.000Z");

const realFetch = globalThis.fetch;
let requests;

/** Empty page for whichever resource a test is not exercising. */
function emptyPage() {
  return { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] };
}

function page(nodes, { hasNextPage = false, endCursor = null } = {}) {
  return { pageInfo: { hasNextPage, endCursor }, nodes };
}

function issueNode(overrides = {}) {
  return {
    number: 1,
    title: "An issue",
    url: "https://github.com/o/r/issues/1",
    closedAt: "2026-03-15T00:00:00Z",
    labels: { nodes: [{ name: "bug", color: "ff0000" }] },
    author: { login: "alice" },
    ...overrides,
  };
}

function prNode(overrides = {}) {
  return {
    number: 2,
    title: "A pull request",
    url: "https://github.com/o/r/pull/2",
    mergedAt: "2026-03-20T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
    labels: { nodes: [{ name: "enhancement", color: "00ff00" }] },
    author: { login: "bob" },
    ...overrides,
  };
}

function jsonResponse(data) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Install a fetch stub driven by a queue of responders.
 *
 * Each responder receives the parsed request body and returns either a data
 * object (resolved as a 200) or an Error to reject with.
 */
function stubFetch(responders) {
  const queue = [...responders];
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    requests.push(body);
    const responder = queue.shift();
    assert.ok(responder, `unexpected extra GraphQL request: ${body.query}`);
    const result = responder(body);
    if (result instanceof Error) {
      throw result;
    }
    return jsonResponse(result);
  };
}

/** Responder that answers issues on the first call and PRs on the second. */
function repoPages({ issues = emptyPage(), pullRequests = emptyPage() } = {}) {
  return { repository: { issues, pullRequests } };
}

async function load() {
  const mod = await import(MODULE);
  return mod;
}

describe("fetchClosedItemsFromRepo", () => {
  beforeEach(() => {
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("normalises closed issues into report items", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages({ issues: page([issueNode()]) }),
      () => repoPages(),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(result.partial, false);
    assert.equal(result.error, undefined);
    assert.deepEqual(result.items, [
      {
        type: "Issue",
        number: 1,
        title: "An issue",
        url: "https://github.com/o/r/issues/1",
        closedAt: "2026-03-15T00:00:00Z",
        labels: [{ name: "bug", color: "ff0000" }],
        author: "alice",
        repository: "o/r",
      },
    ]);
  });

  it("normalises merged PRs and keeps mergedAt alongside closedAt", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages(),
      () => repoPages({ pullRequests: page([prNode()]) }),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(result.items, [
      {
        type: "PullRequest",
        number: 2,
        title: "A pull request",
        url: "https://github.com/o/r/pull/2",
        closedAt: "2026-03-20T00:00:00Z",
        mergedAt: "2026-03-20T00:00:00Z",
        labels: [{ name: "enhancement", color: "00ff00" }],
        author: "bob",
        repository: "o/r",
      },
    ]);
  });

  it('falls back to "unknown" when the author account is gone', async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages({ issues: page([issueNode({ author: null })]) }),
      () => repoPages({ pullRequests: page([prNode({ author: null })]) }),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(
      result.items.map((item) => item.author),
      ["unknown", "unknown"],
    );
  });

  it("drops issues closed before the window and after the window", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () =>
        repoPages({
          issues: page([
            issueNode({ number: 10, closedAt: "2026-02-28T23:59:59Z" }),
            issueNode({ number: 11, closedAt: "2026-03-10T00:00:00Z" }),
            issueNode({ number: 12, closedAt: "2026-04-01T00:00:00Z" }),
          ]),
        }),
      () => repoPages(),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(
      result.items.map((item) => item.number),
      [11],
    );
  });

  it("drops PRs merged outside the window", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages(),
      () =>
        repoPages({
          pullRequests: page([
            prNode({
              number: 20,
              mergedAt: "2026-03-05T00:00:00Z",
              updatedAt: "2026-03-05T00:00:00Z",
            }),
            prNode({
              number: 21,
              mergedAt: "2026-02-01T00:00:00Z",
              updatedAt: "2026-03-30T00:00:00Z",
            }),
          ]),
        }),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(
      result.items.map((item) => item.number),
      [20],
    );
  });

  it("keeps items closed exactly on the window boundaries", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () =>
        repoPages({
          issues: page([
            issueNode({ number: 30, closedAt: START.toISOString() }),
            issueNode({ number: 31, closedAt: END.toISOString() }),
          ]),
        }),
      () => repoPages(),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(
      result.items.map((item) => item.number),
      [30, 31],
    );
  });

  it("sends the window start as the server-side issue `since` filter", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([() => repoPages(), () => repoPages()]);

    await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(requests[0].variables, {
      owner: "o",
      name: "r",
      since: START.toISOString(),
      cursor: null,
    });
    assert.deepEqual(requests[1].variables, {
      owner: "o",
      name: "r",
      cursor: null,
    });
  });

  it("paginates issues until hasNextPage is false, forwarding the cursor", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () =>
        repoPages({
          issues: page([issueNode({ number: 40 })], {
            hasNextPage: true,
            endCursor: "ISSUE_CURSOR_1",
          }),
        }),
      () =>
        repoPages({
          issues: page([issueNode({ number: 41 })], {
            hasNextPage: false,
            endCursor: "ISSUE_CURSOR_2",
          }),
        }),
      () => repoPages(),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(requests.length, 3);
    assert.equal(requests[0].variables.cursor, null);
    assert.equal(requests[1].variables.cursor, "ISSUE_CURSOR_1");
    assert.deepEqual(
      result.items.map((item) => item.number),
      [40, 41],
    );
  });

  it("paginates merged PRs while the oldest row on a page is still in range", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages(),
      () =>
        repoPages({
          pullRequests: page(
            [
              prNode({
                number: 50,
                mergedAt: "2026-03-25T00:00:00Z",
                updatedAt: "2026-03-25T00:00:00Z",
              }),
            ],
            { hasNextPage: true, endCursor: "PR_CURSOR_1" },
          ),
        }),
      () =>
        repoPages({
          pullRequests: page(
            [
              prNode({
                number: 51,
                mergedAt: "2026-03-02T00:00:00Z",
                updatedAt: "2026-03-02T00:00:00Z",
              }),
            ],
            { hasNextPage: false, endCursor: "PR_CURSOR_2" },
          ),
        }),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(requests.length, 3);
    assert.equal(requests[2].variables.cursor, "PR_CURSOR_1");
    assert.deepEqual(
      result.items.map((item) => item.number),
      [50, 51],
    );
  });

  it("stops paging PRs once the oldest row on a page was updated before the window", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages(),
      () =>
        repoPages({
          pullRequests: page(
            [
              prNode({
                number: 60,
                mergedAt: "2026-03-25T00:00:00Z",
                updatedAt: "2026-03-25T00:00:00Z",
              }),
              prNode({
                number: 61,
                mergedAt: "2026-01-05T00:00:00Z",
                updatedAt: "2026-02-01T00:00:00Z",
              }),
            ],
            { hasNextPage: true, endCursor: "PR_CURSOR_1" },
          ),
        }),
      // A third responder is deliberately absent: another request would trip
      // the "unexpected extra GraphQL request" assertion in stubFetch.
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(requests.length, 2);
    assert.equal(result.partial, false);
    assert.deepEqual(
      result.items.map((item) => item.number),
      [60],
    );
  });

  it("returns partial results with the error when an issue page fails", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () =>
        repoPages({
          issues: page([issueNode({ number: 70 })], {
            hasNextPage: true,
            endCursor: "ISSUE_CURSOR_1",
          }),
        }),
      () => new Error("upstream exploded"),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(result.partial, true);
    assert.match(result.error, /upstream exploded/);
    assert.deepEqual(
      result.items.map((item) => item.number),
      [70],
    );
  });

  it("preserves already-collected issues when the PR query fails", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([
      () => repoPages({ issues: page([issueNode({ number: 80 })]) }),
      () => new Error("pull request query failed"),
    ]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.equal(result.partial, true);
    assert.match(result.error, /pull request query failed/);
    assert.deepEqual(
      result.items.map((item) => item.number),
      [80],
    );
  });

  it("reports an empty, non-partial result when the repository has nothing in range", async () => {
    const { fetchClosedItemsFromRepo } = await load();
    stubFetch([() => repoPages(), () => repoPages()]);

    const result = await fetchClosedItemsFromRepo("o", "r", START, END);

    assert.deepEqual(result, { items: [], partial: false });
  });

  it("accepts an injected client option to bypass the default graphqlWithAuth", async () => {
    const { fetchClosedItemsFromRepo, REPO_CLOSED_ISSUES_QUERY, REPO_MERGED_PRS_QUERY } = await load();
    const mockCalls = [];
    const customClient = async (query, vars) => {
      mockCalls.push({ query, vars });
      if (query === REPO_CLOSED_ISSUES_QUERY) {
        return repoPages({ issues: page([issueNode({ number: 99 })]) });
      }
      if (query === REPO_MERGED_PRS_QUERY) {
        return repoPages({ pullRequests: page([prNode({ number: 100 })]) });
      }
      return repoPages();
    };

    const result = await fetchClosedItemsFromRepo("custom-owner", "custom-repo", START, END, {
      client: customClient,
    });

    assert.equal(result.partial, false);
    assert.deepEqual(
      result.items.map((i) => i.number),
      [99, 100],
    );
    assert.equal(mockCalls.length, 2);
    assert.equal(mockCalls[0].vars.owner, "custom-owner");
    assert.equal(mockCalls[0].vars.name, "custom-repo");
  });
});

describe("graphql-queries module surface", () => {
  it("exports both paginated queries and the shared retry helper", async () => {
    const mod = await load();

    assert.equal(typeof mod.fetchClosedItemsFromRepo, "function");
    assert.equal(typeof mod.graphqlWithAuth, "function");
    assert.equal(typeof mod.retryWithBackoff, "function");
    assert.match(mod.REPO_CLOSED_ISSUES_QUERY, /states: CLOSED/);
    assert.match(mod.REPO_CLOSED_ISSUES_QUERY, /filterBy: \{since: \$since\}/);
    assert.match(mod.REPO_MERGED_PRS_QUERY, /states: MERGED/);
    assert.match(
      mod.REPO_MERGED_PRS_QUERY,
      /orderBy: \{field: UPDATED_AT, direction: DESC\}/,
    );
  });

  it("requests both resources with a page size of 100", async () => {
    const mod = await load();

    assert.match(mod.REPO_CLOSED_ISSUES_QUERY, /issues\(first: 100/);
    assert.match(mod.REPO_MERGED_PRS_QUERY, /pullRequests\(first: 100/);
  });
});
