/**
 * GitHub GraphQL queries
 *
 * Fetches closed issues and merged PRs from repositories with labels and
 * author information.
 */

import { graphql } from "@octokit/graphql";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { retryWithBackoff } = require("./request-queue.js");

/**
 * Authenticated GraphQL client singleton
 * Configured with GITHUB_TOKEN from environment
 */
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`,
  },
});

/**
 * GraphQL query to fetch closed issues from a repository (paginated)
 */
const REPO_CLOSED_ISSUES_QUERY = `
  query($owner: String!, $name: String!, $since: DateTime!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor, states: CLOSED, filterBy: {since: $since}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          closedAt
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          author {
            login
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch merged PRs from a repository (paginated)
 */
const REPO_MERGED_PRS_QUERY = `
  query($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(first: 100, after: $cursor, states: MERGED, orderBy: {field: UPDATED_AT, direction: DESC}) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          mergedAt
          updatedAt
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          author {
            login
          }
        }
      }
    }
  }
`;

/**
 * Fetch closed issues and merged PRs from a repository within date range.
 * Both resources are paginated independently to avoid silent truncation at 100 items.
 *
 * @param {string} owner - Repository owner (e.g., "ublue-os")
 * @param {string} name - Repository name (e.g., "bluefin")
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Promise<{items: Array, partial: boolean, error?: string}>} Fetch result
 */
export async function fetchClosedItemsFromRepo(
  owner,
  name,
  startDate,
  endDate,
) {
  // Declared outside try so partial results are preserved on mid-pagination error.
  const allItems = [];
  try {
    // Paginate closed issues (server-side date filter via `since` keeps page count low)
    let issuesCursor = null;
    let issuesHasNextPage = true;
    while (issuesHasNextPage) {
      const result = await retryWithBackoff(async () => {
        return await graphqlWithAuth(REPO_CLOSED_ISSUES_QUERY, {
          owner,
          name,
          since: startDate.toISOString(),
          cursor: issuesCursor,
        });
      });

      const issues = result.repository.issues;
      const closedIssues = issues.nodes
        .filter((issue) => {
          const closedAt = new Date(issue.closedAt);
          return closedAt >= startDate && closedAt <= endDate;
        })
        .map((issue) => ({
          type: "Issue",
          number: issue.number,
          title: issue.title,
          url: issue.url,
          closedAt: issue.closedAt,
          labels: issue.labels.nodes,
          author: issue.author?.login || "unknown",
          repository: `${owner}/${name}`,
        }));

      allItems.push(...closedIssues);
      issuesCursor = issues.pageInfo.endCursor;
      issuesHasNextPage = issues.pageInfo.hasNextPage;
    }

    // Paginate merged PRs (no server-side date filter, so pagination is critical)
    let prsCursor = null;
    let prsHasNextPage = true;
    while (prsHasNextPage) {
      const result = await retryWithBackoff(async () => {
        return await graphqlWithAuth(REPO_MERGED_PRS_QUERY, {
          owner,
          name,
          cursor: prsCursor,
        });
      });

      const prs = result.repository.pullRequests;
      const mergedPRs = prs.nodes
        .filter((pr) => {
          const mergedAt = new Date(pr.mergedAt);
          return mergedAt >= startDate && mergedAt <= endDate;
        })
        .map((pr) => ({
          type: "PullRequest",
          number: pr.number,
          title: pr.title,
          url: pr.url,
          closedAt: pr.mergedAt,
          labels: pr.labels.nodes,
          author: pr.author?.login || "unknown",
          repository: `${owner}/${name}`,
        }));

      allItems.push(...mergedPRs);
      prsCursor = prs.pageInfo.endCursor;

      // Early-exit: results are ordered UPDATED_AT DESC. Since updatedAt >= mergedAt,
      // if the oldest PR on this page was last updated before startDate, it was also
      // merged before startDate — no further pages will have in-window PRs.
      const oldestOnPage = prs.nodes[prs.nodes.length - 1];
      if (oldestOnPage && new Date(oldestOnPage.updatedAt) < startDate) {
        break;
      }

      prsHasNextPage = prs.pageInfo.hasNextPage;
    }

    return { items: allItems, partial: false };
  } catch (error) {
    console.error(
      `Returning ${allItems.length} partial items before failure from ${owner}/${name}: ${error.message}`,
    );
    // Return partial results with explicit metadata so callers can surface truncation.
    return { items: allItems, partial: true, error: error.message };
  }
}

export {
  graphqlWithAuth,
  retryWithBackoff,
  REPO_CLOSED_ISSUES_QUERY,
  REPO_MERGED_PRS_QUERY,
};
