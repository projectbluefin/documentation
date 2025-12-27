/**
 * Fetch activity data from GitHub Projects V2 API
 * This script fetches items from the projectbluefin/projects/2 board
 * and stores them in static/data/activity-items.json
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read GraphQL queries from separate files
const FIELDS_QUERY = readFileSync(
  path.join(__dirname, 'queries', 'fields.graphql'),
  'utf-8'
);
const ITEMS_QUERY = readFileSync(
  path.join(__dirname, 'queries', 'items.graphql'),
  'utf-8'
);

const ORG = 'projectbluefin';
const PROJECT_NUMBER = 2;
const OUTPUT_PATH = path.join(__dirname, '..', 'static', 'data', 'activity-items.json');
const GITHUB_API_DELAY_MS = 1000;

// GitHub token from environment (optional for public projects)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

/**
 * Execute GraphQL query
 */
async function graphqlQuery(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors, null, 2)}`);
  }

  return result.data;
}

/**
 * Fetch project fields to get Status field metadata
 */
async function fetchProjectFields() {
  console.log('Fetching project fields...');
  const data = await graphqlQuery(FIELDS_QUERY, {
    org: ORG,
    projectNumber: PROJECT_NUMBER,
  });

  return data.organization.projectV2.fields.nodes;
}

/**
 * Fetch all project items with pagination
 */
async function fetchAllProjectItems() {
  console.log('Fetching project items...');
  const items = [];
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;

  while (hasNextPage) {
    const data = await graphqlQuery(ITEMS_QUERY, {
      org: ORG,
      projectNumber: PROJECT_NUMBER,
      cursor,
    });

    const projectItems = data.organization.projectV2.items;
    items.push(...projectItems.nodes);

    hasNextPage = projectItems.pageInfo.hasNextPage;
    cursor = projectItems.pageInfo.endCursor;
    pageCount++;

    console.log(`  Fetched page ${pageCount}: ${items.length} items total`);

    // Rate limit protection: wait 1 second between requests
    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, GITHUB_API_DELAY_MS));
    }
  }

  return items;
}

/**
 * Extract status from item field values
 */
function getStatus(item) {
  const statusField = item.fieldValues.nodes.find(
    (fv) => fv.field && fv.field.name === 'Status'
  );
  return statusField?.name || 'No Status';
}

/**
 * Process raw items into simplified structure
 */
function processItems(items) {
  return items
    .filter((item) => !item.isArchived && item.content) // Filter out archived and null content
    .map((item) => {
      const content = item.content;
      const isDraft = content.__typename === 'DraftIssue';
      const isPR = content.__typename === 'PullRequest';

      return {
        id: item.id,
        title: content.title,
        body: content.body,
        status: getStatus(item),
        isDraft,
        isPR,
        createdAt: content.createdAt,
        updatedAt: item.updatedAt,
        url: content.url || null,
        repository: content.repository?.nameWithOwner || null,
        repositoryUrl: content.repository?.url || null,
        number: content.number || null,
        assignees: content.assignees?.nodes.map((a) => ({
          login: a.login,
          name: a.name,
          avatarUrl: a.avatarUrl,
        })) || [],
        labels: content.labels?.nodes.map((l) => ({
          name: l.name,
          color: l.color,
        })) || [],
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // Sort by updatedAt descending
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Starting activity data fetch...');
    console.log(`Organization: ${ORG}`);
    console.log(`Project number: ${PROJECT_NUMBER}`);
    console.log(`Authentication: ${GITHUB_TOKEN ? 'Yes' : 'No (public access)'}`);
    console.log('');

    // Fetch project fields (for metadata)
    const fields = await fetchProjectFields();
    const statusField = fields.find((f) => f.name === 'Status');
    console.log(`Status field found: ${statusField ? 'Yes' : 'No'}`);
    if (statusField && statusField.options) {
      console.log(`  Options: ${statusField.options.map((o) => o.name).join(', ')}`);
    }
    console.log('');

    // Fetch all items
    const items = await fetchAllProjectItems();
    console.log(`Total items fetched: ${items.length}`);

    // Process items
    const processedItems = processItems(items);
    console.log(`Items after filtering: ${processedItems.length}`);
    console.log('');

    // Group by status for summary
    const statusCounts = processedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

    // Write to file
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(processedItems, null, 2));
    console.log(`✅ Activity data saved to ${OUTPUT_PATH}`);

    // Print first few items as preview
    console.log('\nPreview (first 3 items):');
    processedItems.slice(0, 3).forEach((item, i) => {
      console.log(`${i + 1}. [${item.status}] ${item.title}`);
      console.log(`   Updated: ${item.updatedAt}`);
      console.log(`   Type: ${item.isDraft ? 'Draft' : item.isPR ? 'Pull Request' : 'Issue'}`);
      if (item.repository) console.log(`   Repo: ${item.repository}`);
    });
  } catch (error) {
    console.error('❌ Error fetching activity data:', error.message);
    if (error.message.includes('401')) {
      console.error('\n💡 Tip: Set GITHUB_TOKEN or GH_TOKEN environment variable for authentication');
    }
    process.exit(1);
  }
}

main();
