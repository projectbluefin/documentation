/**
 * Homebrew Tap Promotions Detection
 *
 * Detects packages promoted from experimental-tap to production-tap
 * during the reporting period by analyzing merged PRs and file additions.
 */

import { graphqlWithAuth, retryWithBackoff } from "./graphql-queries.mjs";

const TAP_REPOS = {
  production: "ublue-os/homebrew-tap",
  experimental: "ublue-os/homebrew-experimental-tap",
};

/**
 * Fetch promoted packages during a date range (Production Tap)
 *
 * @param {Date} startDate - Start of reporting period
 * @param {Date} endDate - End of reporting period
 * @param {object} [options] - Optional dependencies/overrides
 * @param {Function} [options.client=graphqlWithAuth] - GraphQL client
 * @param {Function} [options.fetchImpl=fetch] - fetch implementation
 * @returns {Promise<Array>} Array of {name, description, mergedAt, prNumber, prUrl}
 */
export async function fetchTapPromotions(startDate, endDate, options = {}) {
  console.log(
    `\n🍺 Fetching tap promotions from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}...\n`,
  );
  return fetchRepoAdditions(TAP_REPOS.production, startDate, endDate, options);
}

/**
 * Fetch new packages from experimental tap during a date range
 *
 * @param {Date} startDate - Start of reporting period
 * @param {Date} endDate - End of reporting period
 * @param {object} [options] - Optional dependencies/overrides
 * @param {Function} [options.client=graphqlWithAuth] - GraphQL client
 * @param {Function} [options.fetchImpl=fetch] - fetch implementation
 * @returns {Promise<Array>} Array of {name, description, mergedAt, prNumber, prUrl}
 */
export async function fetchExperimentalAdditions(startDate, endDate, options = {}) {
  console.log(
    `\n🧪 Fetching experimental tap additions from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}...\n`,
  );
  return fetchRepoAdditions(TAP_REPOS.experimental, startDate, endDate, options);
}

/**
 * Fetch added packages from a repository during a date range
 *
 * @param {string} repo - Repository in format "owner/repo"
 * @param {Date} startDate - Start of reporting period
 * @param {Date} endDate - End of reporting period
 * @param {object} [options] - Optional dependencies/overrides
 * @returns {Promise<Array>} Array of {name, description, mergedAt, prNumber, prUrl}
 */
async function fetchRepoAdditions(repo, startDate, endDate, options = {}) {
  const { client = graphqlWithAuth, fetchImpl } = options;
  // Fetch merged PRs from tap
  const prs = await fetchMergedPRs(repo, startDate, endDate, { client });
  console.log(`   Found ${prs.length} merged PRs in ${repo}`);

  // Find PRs that added new formula/cask files
  const additions = [];
  for (const pr of prs) {
    const files = await fetchPRFiles(repo, pr.number, { fetchImpl });

    // Look for added formula or cask files
    const addedPackages = files.filter(
      (file) =>
        file.status === "added" &&
        (file.filename.startsWith("Formula/") ||
          file.filename.startsWith("Casks/")),
    );

    for (const file of addedPackages) {
      // Extract package name from filename
      const packageName = file.filename
        .replace(/^(Formula|Casks)\//, "")
        .replace(/\.rb$/, "");

      // Fetch package description from the added file
      const description = await fetchPackageDescription(repo, file.filename, {
        fetchImpl,
      });

      additions.push({
        name: packageName,
        description: description || "No description available",
        mergedAt: pr.mergedAt,
        prNumber: pr.number,
        prUrl: pr.url,
      });

      console.log(
        `   ✅ Found addition: ${packageName} (PR #${pr.number}, ${new Date(pr.mergedAt).toLocaleDateString()})`,
      );
    }
  }

  console.log(`\n   Total additions found in ${repo}: ${additions.length}\n`);
  return additions;
}

/**
 * Fetch merged PRs from a repository in date range
 *
 * @param {string} repo - Repository in format "owner/repo"
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {object} [options] - Optional dependencies/overrides
 * @returns {Promise<Array>} Array of {number, title, url, mergedAt}
 */
async function fetchMergedPRs(repo, startDate, endDate, options = {}) {
  const { client = graphqlWithAuth } = options;
  const [owner, name] = repo.split("/");

  const query = `
    query($owner: String!, $name: String!, $cursor: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(
          first: 100
          after: $cursor
          states: MERGED
          orderBy: {field: UPDATED_AT, direction: DESC}
        ) {
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
          }
        }
      }
    }
  `;

  let allPRs = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data = await retryWithBackoff(() =>
      client(query, { owner, name, cursor })
    );
    const prs = data.repository.pullRequests.nodes;

    const filteredPRs = prs.filter((pr) => {
      const mergedAt = new Date(pr.mergedAt);
      return mergedAt >= startDate && mergedAt <= endDate;
    });

    allPRs = allPRs.concat(filteredPRs);

    // Early-exit: results ordered UPDATED_AT DESC — since updatedAt >= mergedAt,
    // once oldest on page was last updated before startDate it was also merged before startDate
    const oldest = prs[prs.length - 1];
    if (oldest && new Date(oldest.updatedAt) < startDate) {
      break;
    }

    hasNextPage = data.repository.pullRequests.pageInfo.hasNextPage;
    cursor = data.repository.pullRequests.pageInfo.endCursor;
  }

  return allPRs;
}

/**
 * Fetch files changed in a PR using REST API
 *
 * @param {string} repo - Repository in format "owner/repo"
 * @param {number} prNumber - PR number
 * @param {object} [options] - Optional dependencies/overrides
 * @returns {Promise<Array>} Array of {filename, status}
 */
async function fetchPRFiles(repo, prNumber, options = {}) {
  const { fetchImpl } = options;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!fetchImpl && !token) {
    throw new Error(
      "GitHub token required. Set GITHUB_TOKEN or GH_TOKEN environment variable.",
    );
  }
  const call = fetchImpl ?? globalThis.fetch;

  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100`;
  const response = await call(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PR files: ${response.status} ${response.statusText}`,
    );
  }

  const files = await response.json();
  return files.map((f) => ({ filename: f.filename, status: f.status }));
}

/**
 * Fetch and parse package description from formula/cask file
 *
 * @param {string} repo - Repository in format "owner/repo"
 * @param {string} filepath - Path to formula/cask file
 * @param {object} [options] - Optional dependencies/overrides
 * @returns {Promise<string|null>} Package description or null
 */
async function fetchPackageDescription(repo, filepath, options = {}) {
  const { fetchImpl } = options;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!fetchImpl && !token) {
    return null;
  }
  const call = fetchImpl ?? globalThis.fetch;

  try {
    const url = `https://api.github.com/repos/${repo}/contents/${filepath}`;
    const response = await call(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/vnd.github.v3.raw",
      },
    });

    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    return parseFormulaDescription(content);
  } catch (error) {
    console.warn(`   ⚠️  Failed to fetch description for ${filepath}:`, error);
    return null;
  }
}

/**
 * Parse description from Ruby formula/cask file
 *
 * Extracts the `desc` field from Homebrew formula/cask syntax
 *
 * @param {string} content - Ruby file content
 * @returns {string|null} Description or null
 */
export function parseFormulaDescription(content) {
  // Match: desc "Some description here"
  const descMatch = content.match(/desc\s+"([^"]+)"/);
  if (descMatch) {
    return descMatch[1];
  }

  // Match: desc 'Some description here'
  const descMatchSingle = content.match(/desc\s+'([^']+)'/);
  if (descMatchSingle) {
    return descMatchSingle[1];
  }

  return null;
}
