"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  KINDS,
  FAILURE_REASON,
  aggregateContributions,
  collectContributorMetrics,
  isVerifiedRefresh,
  main,
} = require("./fetch-contributor-metrics.js");

const AS_OF = "2026-10-24T00:00:00.000Z";
const user = (id, login = `person-${id}`) => ({
  id,
  login,
  __typename: "User",
});
const restUser = (id, login = `person-${id}`) => ({
  node_id: id,
  login,
  type: "User",
});
const resource = (id, author, createdAt = "2026-10-10T00:00:00Z") => ({
  id,
  author,
  createdAt,
});
const connection = (nodes = [], next = null, totalCount = nodes.length) => ({
  totalCount,
  nodes,
  pageInfo: { hasNextPage: next !== null, endCursor: next },
});
const repo = (id, name, overrides = {}) => ({
  id,
  name,
  isFork: false,
  isArchived: false,
  isPrivate: false,
  isEmpty: false,
  defaultBranchRef: { name: "main" },
  discussions: { totalCount: 1 },
  ...overrides,
});

/** Hand-authored API responses, not a replacement collector or precomputed dataset. */
function apiFixture({ fail, mutate, reverseDiscovery = false } = {}) {
  const calls = [];
  const mainRepo = repo("R1", "main");
  const forkRepo = repo("R2", "fork", { isFork: true, isArchived: true });
  const emptyRepo = repo("R3", "empty", {
    isEmpty: true,
    defaultBranchRef: null,
    discussions: { totalCount: 0 },
  });
  const issue = {
    ...resource("I1", user("A", "old-name"), "2026-07-01T00:00:00Z"),
    comments: connection([resource("IC1", user("B"))], "issue-comments-2", 2),
  };
  const pr = {
    ...resource("P1", user("C"), "2025-12-15T00:00:00Z"),
    comments: connection([resource("PC1", user("D"))], "pr-comments-2", 2),
    reviews: connection(
      [
        {
          id: "RV1",
          author: user("F"),
          state: "APPROVED",
          submittedAt: "2026-10-04T00:00:00Z",
        },
      ],
      "reviews-2",
      3,
    ),
  };
  const discussion = {
    ...resource("D1", user("I"), "2026-07-05T00:00:00Z"),
    comments: connection(
      [
        {
          ...resource("DC1", user("J")),
          replies: connection([resource("DR1", user("K"))], "replies-2", 2),
        },
      ],
      "discussion-comments-2",
      2,
    ),
  };
  const pages = {
    "ContributorRepositories::": {
      organization: {
        repositories: connection(
          reverseDiscovery ? [emptyRepo, forkRepo] : [mainRepo, forkRepo],
          "repos-2",
          3,
        ),
      },
    },
    "ContributorRepositories::repos-2": {
      organization: {
        repositories: connection(
          reverseDiscovery ? [mainRepo] : [emptyRepo],
          null,
          3,
        ),
      },
    },
    "ContributorIssues:R1:": { node: { issues: connection([issue]) } },
    "ContributorIssueComments:I1:issue-comments-2": {
      node: { comments: connection([resource("IC2", null)], null, 2) },
    },
    "ContributorPullRequests:R1:": {
      node: { pullRequests: connection([pr], "prs-2", 2) },
    },
    "ContributorPullRequests:R1:prs-2": {
      node: {
        pullRequests: connection(
          [
            {
              ...resource("P2", user("bot-id", "kubestellar-hive")),
              comments: connection(),
              reviews: connection(),
            },
          ],
          null,
          2,
        ),
      },
    },
    "ContributorPullRequestComments:P1:pr-comments-2": {
      node: { comments: connection([resource("PC2", user("E"))], null, 2) },
    },
    "ContributorReviews:P1:reviews-2": {
      node: {
        reviews: connection(
          [
            {
              id: "RV2",
              author: user("G"),
              state: "DISMISSED",
              submittedAt: "2026-10-05T00:00:00Z",
            },
            {
              id: "RV3",
              author: user("pending-review-only"),
              state: "PENDING",
              submittedAt: null,
            },
          ],
          null,
          3,
        ),
      },
    },
    "ContributorCommitComments:R1:": {
      node: {
        commitComments: connection([
          resource("CC1", user("H")),
          resource("CC2", {
            id: "friendly-bot",
            login: "friendly-assistant",
            __typename: "Bot",
          }),
        ]),
      },
    },
    "ContributorDiscussions:R1:": {
      node: { discussions: connection([discussion]) },
    },
    "ContributorDiscussionReplies:DC1:replies-2": {
      node: { replies: connection([resource("DR2", user("L"))], null, 2) },
    },
    "ContributorDiscussionComments:D1:discussion-comments-2": {
      node: {
        comments: connection(
          [
            {
              ...resource("DC2", user("M")),
              replies: connection([resource("DR3", user("N"))]),
            },
          ],
          null,
          2,
        ),
      },
    },
    "ContributorIssues:R2:": {
      node: {
        issues: connection([
          { ...resource("FI1", user("Q")), comments: connection() },
          { ...resource("FI2", user("B")), comments: connection() },
        ]),
      },
    },
    "ContributorPullRequests:R2:": {
      node: {
        pullRequests: connection([
          {
            ...resource("FP1", user("R")),
            comments: connection(),
            reviews: connection(),
          },
        ]),
      },
    },
    "ContributorDiscussions:R2:": {
      node: {
        discussions: connection([
          {
            ...resource("FD1", user("S")),
            comments: connection(),
          },
        ]),
      },
    },
  };
  for (const id of ["R2", "R3"]) {
    for (const [operation, field] of [
      ["ContributorIssues", "issues"],
      ["ContributorPullRequests", "pullRequests"],
      ["ContributorCommitComments", "commitComments"],
      ["ContributorDiscussions", "discussions"],
    ]) {
      pages[`${operation}:${id}:`] ??= { node: { [field]: connection() } };
    }
  }
  const commits = {
    1: [
      {
        sha: "commit-1",
        parents: [{}],
        author: restUser("A", "new-name"),
        commit: { committer: { date: "2026-10-12T00:00:00Z" } },
      },
      {
        sha: "merge",
        parents: [{}, {}],
        author: restUser("merge-only"),
        commit: { committer: { date: "2026-10-12T00:00:00Z" } },
      },
    ],
    2: [
      {
        sha: "unlinked",
        parents: [],
        author: null,
        commit: { committer: { date: "2026-10-12T00:00:00Z" } },
      },
      {
        sha: "ghost",
        parents: [{}],
        author: restUser("ghost-id", "ghost"),
        commit: { committer: { date: "2026-10-12T00:00:00Z" } },
      },
      {
        sha: "bot",
        parents: [{}],
        author: restUser("renovate-id", "renovate[bot]"),
        commit: { committer: { date: "2026-10-12T00:00:00Z" } },
      },
      {
        sha: "future",
        parents: [{}],
        author: restUser("future-only"),
        commit: { committer: { date: "2026-10-25T00:00:00Z" } },
      },
    ],
  };
  function response(body, { ok = true, link = "" } = {}) {
    return {
      ok,
      status: ok ? 200 : 502,
      json: async () => structuredClone(body),
      headers: { get: (name) => (name.toLowerCase() === "link" ? link : null) },
    };
  }
  async function fetchImpl(url, init) {
    assert.equal(init.headers.Authorization, "Bearer fixture-token");
    assert.equal(init.headers.accept, "application/vnd.github+json");
    assert.equal(init.headers["x-github-api-version"], "2022-11-28");
    assert.equal(init.headers["User-Agent"], "Bluefin-Docs-Build");
    assert.ok(init.signal);
    let key;
    let body;
    let link = "";
    if (url === "https://api.github.com/orgs/projectbluefin") {
      key = "PublicOrganization";
      body = { public_repos: 3 };
    } else if (url === "https://api.github.com/graphql") {
      assert.equal(init.method, "POST");
      const { query, variables } = JSON.parse(init.body);
      assert.doesNotMatch(query, /\bsearch\s*\(/);
      assert.match(query, /rateLimit\s*\{\s*cost\s*\}/);
      const operation = query.match(/query (\w+)/)?.[1];
      key = `${operation}:${variables.id || ""}:${variables.cursor || ""}`;
      assert.ok(Object.hasOwn(pages, key), `Unexpected GraphQL request ${key}`);
      if (operation === "ContributorRepositories") {
        assert.equal(variables.org, "projectbluefin");
        assert.match(query, /privacy: PUBLIC/);
      }
      body = {
        data: { ...structuredClone(pages[key]), rateLimit: { cost: 1 } },
      };
    } else {
      const parsed = new URL(url);
      assert.equal(parsed.origin, "https://api.github.com");
      assert.equal(parsed.searchParams.get("per_page"), "100");
      const page = parsed.searchParams.get("page");
      key = `${parsed.pathname}:${page}`;
      if (parsed.pathname === "/repos/projectbluefin/main/commits") {
        assert.equal(parsed.searchParams.get("sha"), "main");
        assert.equal(parsed.searchParams.get("until"), AS_OF);
        assert.ok(commits[page], `Unexpected commit page ${page}`);
        body = commits[page];
        if (page === "1")
          link =
            '<https://api.github.com/repos/projectbluefin/main/commits?page=2>; rel="next"';
      } else if (parsed.pathname.endsWith("/pulls/comments")) {
        if (parsed.pathname === "/repos/projectbluefin/main/pulls/comments") {
          assert.ok(["1", "2"].includes(page));
          body = [
            {
              node_id: `INLINE${page}`,
              user: restUser(page === "1" ? "O" : "P"),
              created_at: "2026-10-13T00:00:00Z",
            },
          ];
          if (page === "1")
            link =
              '<https://api.github.com/repos/projectbluefin/main/pulls/comments?page=2>; rel="next"';
        } else {
          assert.ok(
            [
              "/repos/projectbluefin/fork/pulls/comments",
              "/repos/projectbluefin/empty/pulls/comments",
            ].includes(parsed.pathname),
          );
          body = [];
        }
      } else {
        assert.fail(`Unexpected REST request ${url}`);
      }
    }
    calls.push(key);
    if (key === fail)
      return response(
        { message: "private URL and secret must not escape" },
        { ok: false },
      );
    if (mutate) body = mutate(key, structuredClone(body));
    return response(body, { link });
  }
  return { fetchImpl, calls };
}

function collect(fixture, extra = {}) {
  return collectContributorMetrics({
    fetchImpl: fixture.fetchImpl,
    token: "fixture-token",
    asOf: AS_OF,
    ...extra,
  });
}

test("real collector exhausts repository, resource, nested comment/reply/review and REST pages", async () => {
  const fixture = apiFixture();
  let stats;
  const data = await collect(fixture, {
    onStats: (value) => {
      stats = value;
    },
  });
  assert.equal(data.unavailable, false);
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.generatedAt, AS_OF);
  assert.equal(data.coverage.complete, true);
  assert.deepEqual(data.coverage.kinds, KINDS);
  assert.deepEqual(data.coverage.repositories, [
    { id: "R1", name: "main", fork: false, archived: false },
    { id: "R2", name: "fork", fork: true, archived: true },
    { id: "R3", name: "empty", fork: false, archived: false },
  ]);
  assert.equal(data.coverage.unlinkedAuthors, 3);
  assert.deepEqual(data.summary, {
    totalContributors: 19,
    activeContributors90d: 17,
    activeRepositories90d: 2,
    byType90d: {
      changes: 2,
      issues: 2,
      comments: 6,
      reviews: 2,
      discussions: 6,
    },
  });
  assert.deepEqual(
    data.contributors.map(({ id }) => id),
    "ABCDEFGHIJKLMNOPQRS".split(""),
  );
  assert.deepEqual(
    data.contributors.find(({ id }) => id === "A"),
    {
      id: "A",
      login: "new-name",
      firstContributionAt: "2026-07-01T00:00:00.000Z",
      lastContributionAt: "2026-10-12T00:00:00.000Z",
    },
  );
  assert.equal(data.months.length, 11);
  assert.deepEqual(data.months[0], {
    month: "2025-12",
    contributors: 1,
    cumulativeContributors: 1,
  });
  assert.deepEqual(
    data.months.find(({ month }) => month === "2026-07"),
    { month: "2026-07", contributors: 2, cumulativeContributors: 3 },
  );
  assert.deepEqual(
    data.months.find(({ month }) => month === "2026-08"),
    { month: "2026-08", contributors: 0, cumulativeContributors: 3 },
  );
  assert.deepEqual(data.months.at(-1), {
    month: "2026-10",
    contributors: 17,
    cumulativeContributors: 19,
  });
  assert.equal(
    data.months.at(-1).cumulativeContributors,
    data.summary.totalContributors,
  );
  assert.ok(fixture.calls.includes("ContributorRepositories::repos-2"));
  assert.ok(fixture.calls.includes("ContributorPullRequests:R1:prs-2"));
  assert.ok(fixture.calls.includes("ContributorReviews:P1:reviews-2"));
  assert.ok(
    fixture.calls.includes("ContributorIssueComments:I1:issue-comments-2"),
  );
  assert.ok(
    fixture.calls.includes("ContributorPullRequestComments:P1:pr-comments-2"),
  );
  assert.ok(
    fixture.calls.includes(
      "ContributorDiscussionComments:D1:discussion-comments-2",
    ),
  );
  assert.ok(
    fixture.calls.includes("ContributorDiscussionReplies:DC1:replies-2"),
  );
  assert.ok(fixture.calls.includes("/repos/projectbluefin/main/commits:2"));
  assert.ok(
    fixture.calls.includes("/repos/projectbluefin/main/pulls/comments:2"),
  );
  assert.ok(
    !fixture.calls.some((key) =>
      key.startsWith("/repos/projectbluefin/fork/commits"),
    ),
  );
  assert.equal(stats.requests, fixture.calls.length);
  assert.equal(stats.requests, stats.graphqlRequests + stats.restRequests);
  assert.equal(stats.graphqlCost, stats.graphqlRequests);
});

test("same source and asOf produce identical bytes despite repository completion order", async () => {
  const first = await collect(apiFixture());
  const second = await collect(apiFixture({ reverseDiscovery: true }));
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("every dropped nested or source page invalidates the all-time total instead of undercounting", async () => {
  for (const fail of [
    "ContributorRepositories::repos-2",
    "ContributorPullRequests:R1:prs-2",
    "ContributorReviews:P1:reviews-2",
    "ContributorIssueComments:I1:issue-comments-2",
    "ContributorPullRequestComments:P1:pr-comments-2",
    "ContributorDiscussionComments:D1:discussion-comments-2",
    "ContributorDiscussionReplies:DC1:replies-2",
    "/repos/projectbluefin/main/commits:2",
    "/repos/projectbluefin/main/pulls/comments:2",
  ]) {
    const data = await collect(apiFixture({ fail }));
    assert.equal(data.unavailable, true, fail);
    assert.equal(data.coverage.complete, false, fail);
    assert.equal(data.summary.totalContributors, null, fail);
    assert.equal(data.summary.activeContributors90d, null, fail);
    assert.deepEqual(data.contributors, [], fail);
    assert.equal(data.generatedAt, null, fail);
    assert.equal(data.stateReason, FAILURE_REASON, fail);
    assert.doesNotMatch(JSON.stringify(data), /private URL|secret|https:\/\//);
  }
});

test("failed source pages identify the repository and operation without exposing upstream messages", async () => {
  let stats;
  const data = await collect(
    apiFixture({ fail: "ContributorReviews:P1:reviews-2" }),
    {
      onStats: (value) => {
        stats = value;
      },
    },
  );
  assert.equal(data.unavailable, true);
  assert.deepEqual(
    stats.failures.find((failure) => failure.code === "http_502"),
    {
      repository: "main",
      stage: "ContributorReviews",
      code: "http_502",
    },
  );
  assert.doesNotMatch(
    JSON.stringify(stats.failures),
    /private URL|secret|https:|token=/,
  );
});

test("a newly appended review does not invalidate a complete scan or leak future activity", async () => {
  const expected = await collect(apiFixture());
  const growing = apiFixture({
    mutate: (key, body) => {
      if (key === "ContributorReviews:P1:reviews-2") {
        body.data.node.reviews.totalCount = 4;
        body.data.node.reviews.nodes.push({
          id: "appended-review",
          author: user("future-reviewer"),
          state: "APPROVED",
          submittedAt: "2026-10-25T00:00:00Z",
        });
      }
      return body;
    },
  });
  const actual = await collect(growing);
  assert.equal(actual.unavailable, false);
  assert.deepEqual(actual, expected);
});

test("pagination rejects silently dropped nodes, repeated cursors, duplicate resources and GraphQL partial errors", async () => {
  for (const corrupt of [
    (body) => {
      body.data.node.reviews.nodes = [];
    },
    (body) => {
      body.data.node.reviews.nodes[0].id = "RV1";
    },
    (body) => {
      body.data.node.reviews.totalCount = 4;
    },
    (body) => {
      body.data.node.reviews.nodes[0] = null;
    },
    (body) => {
      body.data.node.reviews.pageInfo = {
        hasNextPage: true,
        endCursor: "reviews-2",
      };
    },
    (body) => {
      body.errors = [{ message: "token=not-public" }];
    },
  ]) {
    const fixture = apiFixture({
      mutate: (key, body) => {
        if (key === "ContributorReviews:P1:reviews-2") corrupt(body);
        return body;
      },
    });
    const data = await collect(fixture);
    assert.equal(data.unavailable, true);
    assert.equal(data.summary.totalContributors, null);
    assert.equal(data.stateReason, FAILURE_REASON);
  }
});

test("a last-good schema2 scan keeps its exact history, coverage, totals and timestamp on failure", async () => {
  const previous = await collect(apiFixture());
  const original = JSON.stringify(previous);
  const failed = await collect(
    apiFixture({ fail: "ContributorReviews:P1:reviews-2" }),
    {
      previous,
      asOf: "2026-10-25T00:00:00.000Z",
    },
  );
  assert.equal(failed.unavailable, true);
  assert.equal(failed.stateReason, FAILURE_REASON);
  assert.deepEqual(failed, {
    ...previous,
    unavailable: true,
    stateReason: FAILURE_REASON,
  });
  assert.equal(JSON.stringify(previous), original);
});

test("schema1 inflated totals/history are never reused, and missing auth never refreshes timestamps", async () => {
  const old = {
    schemaVersion: 1,
    org: "projectbluefin",
    generatedAt: AS_OF,
    summary: { totalContributors: 999 },
    months: [{ month: "2026-10", activeContributors: 999 }],
  };
  const cold = await collectContributorMetrics({
    token: null,
    previous: old,
    asOf: AS_OF,
  });
  assert.equal(cold.schemaVersion, 2);
  assert.equal(cold.generatedAt, null);
  assert.equal(cold.summary.totalContributors, null);
  assert.deepEqual(cold.months, []);
  const previous = await collect(apiFixture());
  let requests = 0;
  const failed = await collectContributorMetrics({
    token: null,
    previous,
    asOf: AS_OF,
    fetchImpl: async () => {
      requests++;
      throw new Error("must not fetch");
    },
  });
  assert.equal(requests, 0);
  assert.equal(failed.generatedAt, previous.generatedAt);
  assert.deepEqual(failed.months, previous.months);
  assert.equal(failed.unavailable, true);
});

test("a promised REST continuation cannot silently become an empty terminal page", async () => {
  for (const dropped of [
    "/repos/projectbluefin/main/commits:2",
    "/repos/projectbluefin/main/pulls/comments:2",
  ]) {
    const data = await collect(
      apiFixture({ mutate: (key, body) => (key === dropped ? [] : body) }),
    );
    assert.equal(data.unavailable, true, dropped);
    assert.equal(data.summary.totalContributors, null, dropped);
    assert.equal(data.stateReason, FAILURE_REASON, dropped);
  }
});

test("a verified empty public organization is zero, not unknown", async () => {
  const fixture = apiFixture({
    mutate: (key, body) => {
      if (key === "ContributorRepositories::")
        body.data.organization.repositories = connection();
      if (key === "PublicOrganization") body.public_repos = 0;
      return body;
    },
  });
  const data = await collect(fixture);
  assert.equal(data.unavailable, false);
  assert.deepEqual(data.summary, {
    totalContributors: 0,
    activeContributors90d: 0,
    activeRepositories90d: 0,
    byType90d: Object.fromEntries(KINDS.map((kind) => [kind, 0])),
  });
  assert.deepEqual(data.months, [
    { month: "2026-10", contributors: 0, cumulativeContributors: 0 },
  ]);
});

test("a token-limited repository list cannot masquerade as complete public org coverage", async () => {
  const fixture = apiFixture({
    mutate: (key, body) => {
      if (key === "PublicOrganization") body.public_repos = 4;
      return body;
    },
  });
  const data = await collect(fixture);
  assert.equal(data.unavailable, true);
  assert.equal(data.summary.totalContributors, null);
  assert.equal(data.coverage.complete, false);
});

test("pure aggregation unions stable IDs across repositories, kinds, months, renames and UTC boundaries", async () => {
  const repositories = [
    { id: "R1", name: "docs", fork: false, archived: false },
    { id: "R2", name: "other", fork: false, archived: false },
  ];
  const event = (id, kind, at, repositoryId = "R1", login) => ({
    repositoryId,
    kind,
    at,
    author: user(id, login),
  });
  const events = [
    event("A", "changes", "2026-01-31T23:30:00-01:00", "R1", "old-name"),
    event("A", "comments", "2026-10-24T00:00:00Z", "R2", "new-name"),
    event("A", "reviews", "2026-10-24T00:00:00Z", "R2", "new-name"),
    event("B", "issues", "2026-07-26T00:00:00Z"), // Exactly 90 days, inclusive.
    event("C", "discussions", "2026-07-25T23:59:59.999Z"),
    event("D", "comments", "2026-10-24T00:00:00.001Z"), // Future, excluded.
    event("bot", "changes", AS_OF, "R1", "kubestellar-hive"),
    event("imgbot", "changes", AS_OF, "R1", "ImgBotApp"),
    { repositoryId: "R1", kind: "comments", at: AS_OF, author: null },
    {
      repositoryId: "R1",
      kind: "comments",
      at: AS_OF,
      author: { login: "unlinked" },
    },
    event("ghost", "comments", AS_OF, "R1", "ghost"),
  ];
  const input = { repositories, events, asOf: AS_OF, complete: true };
  const data = await aggregateContributions(input);
  const reversed = await aggregateContributions({
    ...input,
    repositories: [...repositories].reverse(),
    events: [...events].reverse(),
  });
  assert.equal(JSON.stringify(data), JSON.stringify(reversed));
  assert.equal(data.summary.totalContributors, 3);
  assert.equal(data.summary.activeContributors90d, 2);
  assert.equal(data.summary.activeRepositories90d, 2);
  assert.deepEqual(data.summary.byType90d, {
    changes: 0,
    issues: 1,
    comments: 1,
    reviews: 1,
    discussions: 0,
  });
  assert.equal(data.coverage.unlinkedAuthors, 3);
  assert.deepEqual(data.months[0], {
    month: "2026-02",
    contributors: 1,
    cumulativeContributors: 1,
  });
  assert.deepEqual(data.months.at(-1), {
    month: "2026-10",
    contributors: 1,
    cumulativeContributors: 3,
  });
  assert.equal(data.contributors[0].login, "new-name");
  await assert.rejects(aggregateContributions({ ...input, complete: false }));
  await assert.rejects(
    aggregateContributions({ ...input, events: [{ ...events[0], at: null }] }),
  );
});

test("CLI honors generatedAt TTL and --force, writes atomically, and no-ops for identical bytes", async (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contributor-metrics-test-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const outputFile = path.join(dir, "contributor-metrics.json");
  const fixture = apiFixture();
  const options = {
    outputFile,
    fetchImpl: fixture.fetchImpl,
    token: "fixture-token",
    asOf: AS_OF,
    log: () => undefined,
  };
  const first = await main({ ...options, args: ["--force"] });
  assert.equal(first.unavailable, false);
  const original = fs.readFileSync(outputFile, "utf8");
  const callsAfterFirst = fixture.calls.length;
  await main({ ...options, args: [] });
  assert.equal(fixture.calls.length, callsAfterFirst);
  const sentinel = new Date("2000-01-01T00:00:00Z");
  fs.utimesSync(outputFile, sentinel, sentinel);
  await main({ ...options, args: ["--force"] });
  assert.ok(fixture.calls.length > callsAfterFirst);
  assert.equal(fs.readFileSync(outputFile, "utf8"), original);
  assert.equal(
    fs.statSync(outputFile).mtime.toISOString(),
    sentinel.toISOString(),
  );
  assert.equal(fs.existsSync(`${outputFile}.tmp`), false);
  const failed = apiFixture({ fail: "ContributorReviews:P1:reviews-2" });
  const logs = [];
  const unavailable = await main({
    ...options,
    fetchImpl: failed.fetchImpl,
    args: ["--force"],
    log: (message) => {
      logs.push(message);
    },
  });
  assert.equal(unavailable.generatedAt, AS_OF);
  assert.deepEqual(unavailable.contributors, first.contributors);
  assert.equal(unavailable.unavailable, true);
  assert.equal(
    JSON.parse(fs.readFileSync(outputFile, "utf8")).unavailable,
    true,
  );
  assert.ok(logs.some((message) => message.startsWith("::warning::")));
  assert.ok(
    logs.some((message) => message.includes('"stage":"ContributorReviews"')),
  );
});

test("TTL uses the seed timestamp rather than checkout mtime and rejects future timestamps", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contributor-ttl-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const outputFile = path.join(dir, "seed.json");
  const previous = await collect(apiFixture());
  for (const generatedAt of [
    "2026-10-22T00:00:00.000Z",
    "2026-10-25T00:00:00.000Z",
  ]) {
    fs.writeFileSync(outputFile, JSON.stringify({ ...previous, generatedAt }));
    const fixture = apiFixture();
    const data = await main({
      args: [],
      outputFile,
      fetchImpl: fixture.fetchImpl,
      token: "fixture-token",
      asOf: AS_OF,
      log: () => undefined,
    });
    assert.ok(fixture.calls.length > 0);
    assert.equal(data.generatedAt, AS_OF);
    assert.equal(data.unavailable, false);
  }
});

test("the actual CLI exits zero without replacing isolated history when writes are denied", async (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "contributor-write-failure-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const scripts = path.join(dir, "scripts");
  const lib = path.join(scripts, "lib");
  fs.mkdirSync(lib, { recursive: true });
  // Run an unmodified copy of the actual CLI in a disposable workspace. A future
  // writer implementation can fail this test, but cannot overwrite a tracked seed.
  for (const file of [
    "fetch-contributor-metrics.js",
    "lib/request-queue.js",
    "lib/seed-cache.js",
    "lib/contributor-tracker.mjs",
  ]) {
    fs.copyFileSync(path.join(__dirname, file), path.join(scripts, file));
  }
  const seed = path.join(dir, "static", "data", "contributor-metrics.json");
  fs.mkdirSync(path.dirname(seed), { recursive: true });
  const previous = await collect(apiFixture());
  const before = JSON.stringify(previous, null, 2) + "\n";
  fs.writeFileSync(seed, before);
  const preload = path.join(dir, "fail-write.cjs");
  fs.writeFileSync(
    preload,
    `
    require('node:fs').writeFileSync = () => {
      process.stderr.write('injected-write-denied\\n');
      throw new Error('sensitive-write-error');
    };
  `,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--require",
      preload,
      path.join(scripts, "fetch-contributor-metrics.js"),
      "--force",
    ],
    {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "" },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(seed, "utf8"), before);
  assert.match(result.stderr, /injected-write-denied/);
  assert.doesNotMatch(result.stderr, /sensitive-write-error/);
});

test("a server-directed secondary limit waits before retrying the same public scan", async () => {
  const fixture = apiFixture();
  const waits = [];
  let throttled = false;
  const data = await collectContributorMetrics({
    token: "fixture-token",
    asOf: AS_OF,
    waitImpl: async (milliseconds) => {
      waits.push(milliseconds);
    },
    fetchImpl: async (url, init) => {
      if (!throttled) {
        throttled = true;
        return {
          ok: false,
          status: 403,
          headers: { get: (name) => (name === "retry-after" ? "60" : null) },
        };
      }
      return fixture.fetchImpl(url, init);
    },
  });
  assert.deepEqual(waits, [60_000]);
  assert.equal(data.unavailable, false);
  assert.equal(data.summary.totalContributors, 19);
});

test("persistent throttling is bounded and retains the last verified snapshot", async () => {
  const previous = await collect(apiFixture());
  const waits = [];
  let calls = 0;
  const data = await collectContributorMetrics({
    token: "fixture-token",
    previous,
    asOf: AS_OF,
    waitImpl: async (milliseconds) => {
      waits.push(milliseconds);
    },
    fetchImpl: async () => {
      calls++;
      return {
        ok: false,
        status: 429,
        headers: { get: (name) => (name === "retry-after" ? "30" : null) },
      };
    },
  });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [30_000, 30_000]);
  assert.equal(data.unavailable, true);
  assert.equal(data.generatedAt, previous.generatedAt);
  assert.deepEqual(data.contributors, previous.contributors);
});

test("scheduled refresh status rejects retained, incomplete, stale or future snapshots", async () => {
  const verified = await collect(apiFixture());
  const stamp = Date.parse(AS_OF);
  assert.equal(isVerifiedRefresh(verified, stamp - 1000, stamp + 1000), true);
  for (const snapshot of [
    null,
    { ...verified, unavailable: true },
    { ...verified, coverage: { ...verified.coverage, complete: false } },
    { ...verified, generatedAt: null },
    { ...verified, generatedAt: "not-a-date" },
    { ...verified, schemaVersion: 1 },
  ]) {
    assert.equal(
      isVerifiedRefresh(snapshot, stamp - 1000, stamp + 1000),
      false,
    );
  }
  assert.equal(isVerifiedRefresh(verified, stamp + 1, stamp + 1000), false);
  assert.equal(isVerifiedRefresh(verified, stamp - 1000, stamp - 1), false);
  assert.equal(isVerifiedRefresh(verified, 0, stamp + 1000), false);
  assert.equal(isVerifiedRefresh(verified, NaN, stamp + 1000), false);
});

test("a verified zero-contributor refresh is still a successful scheduled collection", async () => {
  const empty = await aggregateContributions({
    repositories: [],
    events: [],
    asOf: AS_OF,
    complete: true,
  });
  const stamp = Date.parse(AS_OF);
  assert.equal(empty.summary.totalContributors, 0);
  assert.equal(isVerifiedRefresh(empty, stamp - 1000, stamp + 1000), true);
});
