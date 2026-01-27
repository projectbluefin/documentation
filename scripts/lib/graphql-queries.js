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
 * Fetch project items with pagination support
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
      const result = await graphqlWithAuth(PROJECT_QUERY, {
        orgLogin,
        projectNumber,
        cursor,
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
    // Handle rate limiting
    if (error.status === 403 && error.message.includes("rate limit")) {
      console.error(
        "Rate limit exceeded. Please try again later or use a token with higher limits.",
      );
      throw new Error("GitHub API rate limit exceeded");
    }

    // Handle authentication errors
    if (error.status === 401) {
      console.error(
        "Authentication failed. Ensure GITHUB_TOKEN or GH_TOKEN is set.",
      );
      throw new Error("GitHub authentication required");
    }

    // Generic error handling
    console.error("GraphQL query failed:", error.message);
    throw error;
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
