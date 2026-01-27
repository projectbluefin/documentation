/**
 * GitHub GraphQL queries for Projects V2 API
 *
 * Fetches project board items with field values, labels, and author information
 */

import { graphql } from "@octokit/graphql";

/**
 * GraphQL query definition for Projects V2
 * Matches RESEARCH.md Pattern 1 (lines 86-168)
 */
const PROJECT_QUERY = `
  query($orgLogin: String!, $projectNumber: Int!, $cursor: String) {
    organization(login: $orgLogin) {
      projectV2(number: $projectNumber) {
        id
        title
        items(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                  updatedAt
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  updatedAt
                  field {
                    ... on ProjectV2Field {
                      name
                    }
                  }
                }
              }
            }
            content {
              __typename
              ... on Issue {
                number
                title
                url
                repository {
                  nameWithOwner
                }
                labels(first: 10) {
                  nodes {
                    name
                    color
                    url
                  }
                }
                author {
                  login
                  ... on User {
                    name
                  }
                }
              }
              ... on PullRequest {
                number
                title
                url
                repository {
                  nameWithOwner
                }
                labels(first: 10) {
                  nodes {
                    name
                    color
                    url
                  }
                }
                author {
                  login
                  ... on User {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

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
 * Helper function to handle network retry with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<any>} Result from successful function call
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on authentication or rate limit errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Retry on network errors
      const isNetworkError =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.code === "EAI_AGAIN" ||
        error.message?.includes("socket hang up") ||
        error.message?.includes("timeout");

      if (isNetworkError && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(
          `Retry ${attempt}/${maxRetries} after network error: ${error.message || error.code}`,
        );
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If not a network error or max retries reached, throw
      throw error;
    }
  }

  throw lastError;
}

/**
 * Fetch project items with pagination support and retry logic
 *
 * @param {string} orgLogin - Organization login (e.g., "projectbluefin")
 * @param {number} projectNumber - Project number (e.g., 2)
 * @returns {Promise<Array>} Array of project items
 */
export async function fetchProjectItems(orgLogin, projectNumber) {
  const allItems = [];
  let hasNextPage = true;
  let cursor = null;

  try {
    while (hasNextPage) {
      // Wrap GraphQL call with retry logic
      const result = await retryWithBackoff(async () => {
        return await graphqlWithAuth(PROJECT_QUERY, {
          orgLogin,
          projectNumber,
          cursor,
        });
      });

      const { items } = result.organization.projectV2;
      allItems.push(...items.nodes);

      hasNextPage = items.pageInfo.hasNextPage;
      cursor = items.pageInfo.endCursor;

      // Log progress for large projects
      if (hasNextPage) {
        console.log(`Fetched ${allItems.length} items, continuing...`);
      }
    }

    console.log(`Total items fetched: ${allItems.length}`);
    return allItems;
  } catch (error) {
    // Handle rate limiting with detailed information
    if (error.status === 403 && error.message?.includes("rate limit")) {
      console.error("❌ GitHub API rate limit exceeded");

      // Try to extract rate limit reset time from response
      if (error.response?.headers) {
        const resetTimestamp = error.response.headers["x-ratelimit-reset"];
        if (resetTimestamp) {
          const resetDate = new Date(parseInt(resetTimestamp) * 1000);
          const now = new Date();
          const minutesUntilReset = Math.ceil((resetDate - now) / 1000 / 60);
          console.error(
            `Rate limit resets in ${minutesUntilReset} minutes at ${resetDate.toISOString()}`,
          );
        }
      }

      console.error(
        "Tip: Authenticated requests have higher limits (5,000 requests/hour)",
      );
      console.error(
        "Ensure GITHUB_TOKEN or GH_TOKEN environment variable is set",
      );
      throw new Error("GitHub API rate limit exceeded");
    }

    // Handle authentication errors with actionable guidance
    if (error.status === 401) {
      console.error("❌ Authentication failed");
      console.error(
        "Ensure GITHUB_TOKEN or GH_TOKEN is valid and has the following permissions:",
      );
      console.error("  - repo: read access");
      console.error("  - project: read access");
      console.error("\nTo create a token: https://github.com/settings/tokens");
      throw new Error(
        "GitHub authentication failed. Ensure GITHUB_TOKEN is valid and has repo read access.",
      );
    }

    // Network errors (after all retries exhausted)
    const isNetworkError =
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "EAI_AGAIN" ||
      error.message?.includes("socket hang up") ||
      error.message?.includes("timeout");

    if (isNetworkError) {
      console.error("❌ Network error after 3 retry attempts");
      console.error(`Error: ${error.message || error.code}`);
      console.error(
        "Check network connectivity and GitHub API status at https://www.githubstatus.com/",
      );
      throw new Error(
        `Network failure during project board fetch: ${error.message || error.code}`,
      );
    }

    // Generic GraphQL errors with context
    console.error("❌ GraphQL query failed");
    console.error(`Query: organization.projectV2(number: ${projectNumber})`);
    console.error(`Organization: ${orgLogin}`);
    console.error(`Error: ${error.message}`);

    if (error.errors) {
      console.error("GraphQL errors:");
      error.errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err.message}`);
      });
    }

    throw new Error(
      `Unexpected error during project board fetch: ${error.message}`,
    );
  }
}

/**
 * Filter items by Status column value
 *
 * @param {Array} items - Project items
 * @param {string} statusName - Status value to filter by (e.g., "Done")
 * @returns {Array} Filtered items
 */
export function filterByStatus(items, statusName) {
  return items.filter((item) => {
    const statusValue = getStatusValue(item);
    return statusValue === statusName;
  });
}

/**
 * Extract Status field value from project item
 *
 * @param {Object} item - Project item
 * @returns {string|null} Status value or null if not found
 */
export function getStatusValue(item) {
  const statusField = item.fieldValues.nodes.find(
    (fv) => fv.field?.name === "Status",
  );
  return statusField?.name || null;
}

export { PROJECT_QUERY, graphqlWithAuth };
