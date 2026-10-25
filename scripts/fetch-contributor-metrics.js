#!/usr/bin/env node
/** Public, recorded participation in every current public projectbluefin repository. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { setTimeout: wait } = require("node:timers/promises");
const {
  githubHeaders,
  githubToken,
  mapWithConcurrency,
} = require("./lib/request-queue");

const ORG = "projectbluefin";
const KINDS = ["changes", "issues", "comments", "reviews", "discussions"];
const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "static/data/contributor-metrics.json",
);
const FAILURE_REASON =
  "A complete public GitHub contribution scan could not be verified. Previous verified data is retained when available.";
const AUTH_REASON =
  "GitHub authentication is unavailable. Previous verified data is retained when available.";
const PAGE = "totalCount pageInfo { hasNextPage endCursor }";
const AUTHOR =
  "author { __typename login ... on User { id } ... on Bot { id } }";
const RESOURCE = `id createdAt ${AUTHOR}`;
const COMMENTS = `comments(first: 25) { ${PAGE} nodes { ${RESOURCE} } }`;
const REVIEWS = `reviews(first: 25) { ${PAGE} nodes { id submittedAt state ${AUTHOR} } }`;
const REPLIES = `replies(first: 25) { ${PAGE} nodes { ${RESOURCE} } }`;
const DISCUSSION_COMMENTS = `comments(first: 25) { ${PAGE} nodes { ${RESOURCE} ${REPLIES} } }`;

function requireValue(condition, sourceCode = "invalid_source_response") {
  if (!condition)
    throw Object.assign(new Error(FAILURE_REASON), { sourceCode });
}

function referenceTime(asOf) {
  requireValue(typeof asOf === "string" || asOf instanceof Date);
  const time = new Date(asOf);
  requireValue(Number.isFinite(time.getTime()));
  return time;
}

/** Pure aggregation: all counts are identity unions, never event or monthly sums. */
async function aggregateContributions({
  repositories,
  events,
  asOf,
  complete,
}) {
  requireValue(complete === true);
  const { isBot } = await import("./lib/contributor-tracker.mjs");
  const now = referenceTime(asOf);
  const cutoff = now.getTime() - 90 * 86_400_000;
  const repos = new Map(repositories.map((repo) => [repo.id, repo]));
  const people = new Map();
  const monthly = new Map();
  const active = new Set();
  const activeRepos = new Set();
  const byType = Object.fromEntries(KINDS.map((kind) => [kind, new Set()]));
  let unlinkedAuthors = 0;

  for (const event of events) {
    requireValue(repos.has(event.repositoryId) && KINDS.includes(event.kind));
    const at = referenceTime(event.at);
    if (at > now) continue;
    const author = event.author;
    if (author?.__typename === "Bot" || (author?.login && isBot(author.login)))
      continue;
    if (
      author?.__typename !== "User" ||
      typeof author.id !== "string" ||
      !author.id ||
      typeof author.login !== "string" ||
      !author.login ||
      ["ghost", "deleted", "unknown"].includes(author.login.toLowerCase())
    ) {
      unlinkedAuthors++;
      continue;
    }
    const stamp = at.toISOString();
    const prior = people.get(author.id);
    if (!prior) {
      people.set(author.id, {
        id: author.id,
        login: author.login,
        firstContributionAt: stamp,
        lastContributionAt: stamp,
      });
    } else {
      if (stamp < prior.firstContributionAt) prior.firstContributionAt = stamp;
      // Stable tie-break makes renamed-account fixtures independent of input order.
      if (
        stamp > prior.lastContributionAt ||
        (stamp === prior.lastContributionAt && author.login < prior.login)
      ) {
        prior.login = author.login;
      }
      if (stamp > prior.lastContributionAt) prior.lastContributionAt = stamp;
    }
    const month = stamp.slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, new Set());
    monthly.get(month).add(author.id);
    if (at.getTime() >= cutoff) {
      active.add(author.id);
      activeRepos.add(event.repositoryId);
      byType[event.kind].add(author.id);
    }
  }

  const contributors = [...people.values()].sort((a, b) =>
    a.id.localeCompare(b.id, "en"),
  );
  const firstMonth =
    [...monthly.keys()].sort()[0] || now.toISOString().slice(0, 7);
  const month = new Date(`${firstMonth}-01T00:00:00.000Z`);
  const cumulative = new Set();
  const months = [];
  while (month <= now) {
    const key = month.toISOString().slice(0, 7);
    const ids = monthly.get(key) || new Set();
    for (const id of ids) cumulative.add(id);
    months.push({
      month: key,
      contributors: ids.size,
      cumulativeContributors: cumulative.size,
    });
    month.setUTCMonth(month.getUTCMonth() + 1);
  }
  return {
    schemaVersion: 2,
    org: ORG,
    generatedAt: now.toISOString(),
    unavailable: false,
    stateReason: null,
    coverage: {
      repositories: repositories
        .map(({ id, name, fork, archived }) => ({ id, name, fork, archived }))
        .sort((a, b) => a.id.localeCompare(b.id, "en")),
      kinds: [...KINDS],
      complete: true,
      unlinkedAuthors,
    },
    summary: {
      totalContributors: contributors.length,
      activeContributors90d: active.size,
      activeRepositories90d: activeRepos.size,
      byType90d: Object.fromEntries(
        KINDS.map((kind) => [kind, byType[kind].size]),
      ),
    },
    contributors,
    months,
  };
}

function unavailableData(previous, reason = FAILURE_REASON) {
  if (
    previous?.schemaVersion === 2 &&
    previous.org === ORG &&
    Array.isArray(previous.contributors) &&
    Array.isArray(previous.months) &&
    previous.coverage &&
    previous.summary
  ) {
    return { ...previous, unavailable: true, stateReason: reason };
  }
  return {
    schemaVersion: 2,
    org: ORG,
    generatedAt: null,
    unavailable: true,
    stateReason: reason,
    coverage: {
      repositories: [],
      kinds: [...KINDS],
      complete: false,
      unlinkedAuthors: 0,
    },
    summary: {
      totalContributors: null,
      activeContributors90d: null,
      activeRepositories90d: null,
      byType90d: Object.fromEntries(KINDS.map((kind) => [kind, null])),
    },
    contributors: [],
    months: [],
  };
}

/** Fail closed on missing nodes, shrinking totals, duplicate pages or broken cursors. */
async function connectionPages(load, visit, initial) {
  let cursor = null;
  let expected = null;
  let count = 0;
  const cursors = new Set();
  const ids = new Set();
  try {
    do {
      const connection = initial || (await load(cursor));
      initial = null;
      requireValue(
        connection &&
          Array.isArray(connection.nodes) &&
          Number.isInteger(connection.totalCount) &&
          connection.totalCount >= 0 &&
          typeof connection.pageInfo?.hasNextPage === "boolean",
      );
      requireValue(
        expected === null || connection.totalCount >= expected,
        "connection_total_decreased",
      );
      // Live connections may append new resources while we page. The final count
      // must still match the latest advertised total; the snapshot cutoff filters future activity.
      expected = connection.totalCount;
      for (const node of connection.nodes) {
        requireValue(
          typeof node?.id === "string" && node.id && !ids.has(node.id),
        );
        ids.add(node.id);
        count++;
        await visit(node);
      }
      requireValue(count <= expected, "connection_count_overflow");
      if (!connection.pageInfo.hasNextPage) {
        requireValue(count === expected, "connection_count_mismatch");
        return;
      }
      cursor = connection.pageInfo.endCursor;
      requireValue(
        connection.nodes.length > 0 &&
          typeof cursor === "string" &&
          cursor &&
          !cursors.has(cursor),
      );
      cursors.add(cursor);
    } while (true);
  } catch (error) {
    if (error && typeof error === "object")
      error.stage ??= load.stage || "repository_discovery";
    throw error;
  }
}

function createClient(fetchImpl, token, stats, waitImpl) {
  let cooldown = null;
  let stopped = false;
  async function request(url, init = {}) {
    for (let attempt = 0; attempt < 3; attempt++) {
      requireValue(!stopped, "scan_cancelled");
      if (cooldown) await cooldown;
      stats.requests++;
      const response = await fetchImpl(url, {
        ...init,
        headers: {
          ...githubHeaders(token, {
            accept: "application/vnd.github+json",
            apiVersion: "2022-11-28",
          }),
          ...(init.method === "POST"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) return response;
      const retryAfter = Number(response.headers.get("retry-after"));
      if (
        (response.status === 403 || response.status === 429) &&
        retryAfter > 0 &&
        Number.isFinite(retryAfter) &&
        attempt < 2
      ) {
        // GitHub's explicit cooldown is shared by all workers; never hammer a throttled source.
        cooldown ??= waitImpl(retryAfter * 1000).finally(() => {
          cooldown = null;
        });
        await cooldown;
        continue;
      }
      stopped = true;
      requireValue(
        false,
        `http_${Number.isInteger(response.status) ? response.status : "failure"}`,
      );
    }
    throw new Error(FAILURE_REASON);
  }
  return {
    async publicRepositoryCount() {
      stats.restRequests++;
      const response = await request(`https://api.github.com/orgs/${ORG}`);
      const organization = await response.json();
      requireValue(
        Number.isInteger(organization.public_repos) &&
          organization.public_repos >= 0,
      );
      return organization.public_repos;
    },
    async graphql(query, variables) {
      stats.graphqlRequests++;
      const response = await request("https://api.github.com/graphql", {
        method: "POST",
        body: JSON.stringify({ query, variables }),
      });
      const json = await response.json();
      requireValue(!json.errors?.length && json.data, "graphql_response_error");
      const cost = json.data.rateLimit?.cost;
      requireValue(Number.isInteger(cost) && cost >= 0);
      stats.graphqlCost += cost;
      return json.data;
    },
    async restPages(route, visit) {
      let page = 1;
      const seen = new Set();
      while (true) {
        stats.restRequests++;
        const response = await request(
          `https://api.github.com${route}&per_page=100&page=${page}`,
        );
        const nodes = await response.json();
        requireValue(Array.isArray(nodes));
        const next = /rel="next"/.test(response.headers.get("link") || "");
        requireValue((!next && page === 1) || nodes.length > 0);
        for (const node of nodes) {
          const id = node?.node_id || node?.sha;
          requireValue(typeof id === "string" && id && !seen.has(id));
          seen.add(id);
          visit(node);
        }
        if (!next) return;
        page++;
      }
    },
  };
}

async function collectRepository(repo, client, asOf) {
  const events = [];
  function record(node, kind, at = node.createdAt) {
    events.push({ repositoryId: repo.id, kind, at, author: node.author });
  }
  function page(type, id, field, fields, operation, size = 50) {
    const order =
      type === "Repository" && (field === "issues" || field === "pullRequests")
        ? ", orderBy: {field: CREATED_AT, direction: ASC}"
        : "";
    const load = async (cursor) => {
      const data = await client.graphql(
        `query ${operation}($id: ID!, $cursor: String) {
        node(id: $id) { ... on ${type} {
          ${field}(first: ${size}, after: $cursor${order}) { ${PAGE} nodes { ${fields} } }
        } }
        rateLimit { cost }
      }`,
        { id, cursor },
      );
      return data.node?.[field];
    };
    load.stage = operation;
    return load;
  }
  async function comments(type, parent, kind = "comments") {
    await connectionPages(
      page(type, parent.id, "comments", RESOURCE, `Contributor${type}Comments`),
      (node) => record(node, kind),
      parent.comments,
    );
  }

  await connectionPages(
    page(
      "Repository",
      repo.id,
      "issues",
      `${RESOURCE} ${COMMENTS}`,
      "ContributorIssues",
    ),
    async (issue) => {
      record(issue, "issues");
      await comments("Issue", issue);
    },
  );
  await connectionPages(
    page(
      "Repository",
      repo.id,
      "pullRequests",
      `${RESOURCE} ${COMMENTS} ${REVIEWS}`,
      "ContributorPullRequests",
    ),
    async (pr) => {
      record(pr, "changes");
      await comments("PullRequest", pr);
      await connectionPages(
        page(
          "PullRequest",
          pr.id,
          "reviews",
          `id submittedAt state ${AUTHOR}`,
          "ContributorReviews",
        ),
        (review) => {
          requireValue(typeof review.state === "string");
          if (review.state !== "PENDING") {
            requireValue(review.submittedAt);
            record(review, "reviews", review.submittedAt);
          }
        },
        pr.reviews,
      );
    },
  );
  await connectionPages(
    page(
      "Repository",
      repo.id,
      "commitComments",
      RESOURCE,
      "ContributorCommitComments",
    ),
    (comment) => record(comment, "comments"),
  );
  if (repo.discussionCount > 0) {
    await connectionPages(
      page(
        "Repository",
        repo.id,
        "discussions",
        `${RESOURCE} ${DISCUSSION_COMMENTS}`,
        "ContributorDiscussions",
        25,
      ),
      async (discussion) => {
        record(discussion, "discussions");
        await connectionPages(
          page(
            "Discussion",
            discussion.id,
            "comments",
            `${RESOURCE} ${REPLIES}`,
            "ContributorDiscussionComments",
            25,
          ),
          async (comment) => {
            record(comment, "discussions");
            await connectionPages(
              page(
                "DiscussionComment",
                comment.id,
                "replies",
                RESOURCE,
                "ContributorDiscussionReplies",
              ),
              (reply) => record(reply, "discussions"),
              comment.replies,
            );
          },
          discussion.comments,
        );
      },
    );
  }

  const route = `/repos/${ORG}/${encodeURIComponent(repo.name)}`;
  function restAuthor(user) {
    return user
      ? { id: user.node_id, login: user.login, __typename: user.type }
      : null;
  }
  // Repository-wide inline comments include replies on old/closed pull requests.
  await client.restPages(
    `${route}/pulls/comments?sort=created&direction=asc`,
    (comment) => {
      record(
        { createdAt: comment.created_at, author: restAuthor(comment.user) },
        "comments",
      );
    },
  );
  // Fork PRs/issues/comments/reviews count; inherited fork git history never does.
  if (!repo.fork && !repo.empty) {
    requireValue(repo.defaultBranch);
    await client.restPages(
      `${route}/commits?sha=${encodeURIComponent(repo.defaultBranch)}&until=${encodeURIComponent(asOf)}`,
      (commit) => {
        requireValue(Array.isArray(commit.parents));
        if (commit.parents.length > 1) return;
        record(
          { author: restAuthor(commit.author) },
          "changes",
          commit.commit?.committer?.date,
        );
      },
    );
  }
  return events;
}

/** Injectable transport exercises the same discovery and nested pagination as the CLI. */
async function collectContributorMetrics({
  fetchImpl = globalThis.fetch,
  token = githubToken(),
  asOf = new Date().toISOString(),
  previous = null,
  onStats,
  waitImpl = wait,
} = {}) {
  const stats = {
    requests: 0,
    graphqlRequests: 0,
    restRequests: 0,
    graphqlCost: 0,
    failures: [],
  };
  try {
    const stamp = referenceTime(asOf).toISOString();
    if (!token) return unavailableData(previous, AUTH_REASON);
    const client = createClient(fetchImpl, token, stats, waitImpl);
    const publicRepositoryCount = await client.publicRepositoryCount();
    const repositories = [];
    await connectionPages(
      async (cursor) => {
        const data = await client.graphql(
          `query ContributorRepositories($org: String!, $cursor: String) {
        organization(login: $org) {
          repositories(first: 100, after: $cursor, privacy: PUBLIC, orderBy: {field: NAME, direction: ASC}) {
            ${PAGE}
            nodes { id name isFork isArchived isPrivate isEmpty defaultBranchRef { name } discussions { totalCount } }
          }
        }
        rateLimit { cost }
      }`,
          { org: ORG, cursor },
        );
        return data.organization?.repositories;
      },
      (node) => {
        requireValue(
          node.isPrivate === false &&
            typeof node.name === "string" &&
            typeof node.isFork === "boolean" &&
            typeof node.isArchived === "boolean" &&
            typeof node.isEmpty === "boolean" &&
            Number.isInteger(node.discussions?.totalCount) &&
            node.discussions.totalCount >= 0,
        );
        repositories.push({
          id: node.id,
          name: node.name,
          fork: node.isFork,
          archived: node.isArchived,
          empty: node.isEmpty,
          defaultBranch: node.defaultBranchRef?.name,
          discussionCount: node.discussions.totalCount,
        });
      },
    );
    requireValue(
      repositories.length === publicRepositoryCount,
      "public_repository_count_mismatch",
    );
    const batches = await mapWithConcurrency(
      repositories,
      async (repo) => {
        try {
          return await collectRepository(repo, client, stamp);
        } catch (error) {
          stats.failures.push({
            repository: repo.name,
            stage: error?.stage || "repository_activity",
            code: error?.sourceCode || "source_unavailable",
          });
          return null;
        }
      },
      { concurrency: 2 },
    );
    // Wait for every worker before reporting request totals or accepting a complete scan.
    requireValue(batches.every((batch) => batch !== null));
    return await aggregateContributions({
      repositories,
      events: batches.flat(),
      asOf: stamp,
      complete: true,
    });
  } catch (error) {
    if (!stats.failures.length)
      stats.failures.push({
        stage: error?.stage || "discovery_or_aggregation",
        code: error?.sourceCode || "source_unavailable",
      });
    return unavailableData(previous);
  } finally {
    onStats?.(stats);
  }
}

/** The scheduled job must distinguish a fresh scan from retained build-safe data. */
function isVerifiedRefresh(snapshot, startedAt, finishedAt) {
  const generatedAt =
    typeof snapshot?.generatedAt === "string"
      ? Date.parse(snapshot.generatedAt)
      : NaN;
  return (
    snapshot?.schemaVersion === 2 &&
    snapshot.unavailable === false &&
    snapshot.coverage?.complete === true &&
    Number.isFinite(startedAt) &&
    startedAt > 0 &&
    Number.isFinite(finishedAt) &&
    Number.isFinite(generatedAt) &&
    startedAt <= generatedAt &&
    generatedAt <= finishedAt
  );
}

async function main({
  args = process.argv.slice(2),
  outputFile = OUTPUT_FILE,
  fetchImpl = globalThis.fetch,
  token = githubToken(),
  asOf = new Date().toISOString(),
  log = console.log,
} = {}) {
  if (args.includes("--help")) {
    log(
      "Usage: node scripts/fetch-contributor-metrics.js [--force]\nUses GITHUB_TOKEN or GH_TOKEN. --force bypasses the 24-hour verified-seed TTL.",
    );
    return;
  }
  let previous = null;
  try {
    previous = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  } catch {
    /* Cold cache. */
  }
  const { seedIsFresh } = await import("./lib/seed-cache.js");
  const now = referenceTime(asOf).getTime();
  const cacheAge = now - Date.parse(previous?.generatedAt || "");
  if (
    !args.includes("--force") &&
    previous?.schemaVersion === 2 &&
    previous.unavailable === false &&
    previous.coverage?.complete === true &&
    cacheAge >= 0 &&
    seedIsFresh(outputFile, 24, now)
  ) {
    log(
      "Contributor metrics: verified seed is inside the 24-hour TTL; no scan.",
    );
    return previous;
  }
  const data = await collectContributorMetrics({
    fetchImpl,
    token,
    asOf,
    previous,
    onStats: ({
      requests,
      graphqlRequests,
      restRequests,
      graphqlCost,
      failures,
    }) => {
      for (const failure of failures)
        log(`Contributor source failure: ${JSON.stringify(failure)}`);
      log(
        `Contributor scan: ${requests} requests (${graphqlRequests} GraphQL, ${restRequests} REST), GraphQL cost ${graphqlCost}.`,
      );
    },
  });
  const serialized = JSON.stringify(data, null, 2) + "\n";
  let priorBytes = null;
  try {
    priorBytes = fs.readFileSync(outputFile, "utf8");
  } catch {
    /* Cold cache. */
  }
  if (serialized !== priorBytes) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    const temporary = `${outputFile}.tmp`;
    fs.writeFileSync(temporary, serialized, "utf8");
    fs.renameSync(temporary, outputFile);
  }
  log(
    data.unavailable
      ? `::warning::${data.stateReason}`
      : `Contributor metrics: ${data.summary.totalContributors} public accounts across ${data.coverage.repositories.length} repositories.`,
  );
  return data;
}

module.exports = {
  OUTPUT_FILE,
  KINDS,
  FAILURE_REASON,
  aggregateContributions,
  unavailableData,
  collectContributorMetrics,
  isVerifiedRefresh,
  main,
};

if (require.main === module) {
  main().catch(() => {
    // Output failures must not destroy the previously verified file or leak errors.
    console.error(
      "Contributor metrics could not be written; previous data was not replaced.",
    );
    process.exitCode = 0;
  });
}
