const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'board-changelog.json');

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

// GitHub Projects V2 GraphQL query
const GRAPHQL_QUERY = `
  query($org: String!, $number: Int!, $cursor: String) {
    organization(login: $org) {
      projectV2(number: $number) {
        title
        items(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            createdAt
            updatedAt
            content {
              ... on Issue {
                title
                body
                url
                author {
                  login
                }
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
              }
              ... on PullRequest {
                title
                body
                url
                author {
                  login
                }
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2Field {
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
  }
`;

async function fetchProjectBoard(org, projectNumber) {
  const url = 'https://api.github.com/graphql';
  
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN environment variable is required for GraphQL API access');
  }
  
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Bluefin-Docs-Build',
  };
  
  let allItems = [];
  let hasNextPage = true;
  let cursor = null;
  
  console.log(`Fetching project board: ${org}/projects/${projectNumber}...`);
  
  while (hasNextPage) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: {
          org,
          number: projectNumber,
          cursor,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    const projectData = result.data?.organization?.projectV2;
    
    if (!projectData) {
      throw new Error('Project not found. Check organization and project number.');
    }
    
    const items = projectData.items.nodes;
    allItems = allItems.concat(items);
    
    hasNextPage = projectData.items.pageInfo.hasNextPage;
    cursor = projectData.items.pageInfo.endCursor;
    
    console.log(`Fetched ${items.length} items (total: ${allItems.length})...`);
    
    // Small delay to be nice to GitHub's API
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return allItems;
}

function extractStatus(fieldValues) {
  // Look for Status field
  for (const fieldValue of fieldValues.nodes) {
    if (fieldValue.field?.name === 'Status' && fieldValue.name) {
      return fieldValue.name;
    }
  }
  return 'Unknown';
}

function processItems(items) {
  return items
    .filter(item => item.content) // Only items with content (issues/PRs)
    .map(item => {
      const content = item.content;
      const labels = content.labels?.nodes.map(label => label.name) || [];
      const status = extractStatus(item.fieldValues);
      
      return {
        id: item.id,
        title: content.title,
        description: content.body || '',
        url: content.url,
        author: content.author?.login || 'Unknown',
        labels,
        status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); // Sort by newest first
}

async function fetchBoardData() {
  // Check if existing cache is fresh enough
  if (fs.existsSync(OUTPUT_FILE)) {
    const stats = fs.statSync(OUTPUT_FILE);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    
    if (ageHours < CACHE_MAX_AGE_HOURS && !process.argv.includes('--force')) {
      console.log(`✓ Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`);
      console.log(`  Use --force flag to bypass cache and force fresh fetch.`);
      return;
    } else if (ageHours >= CACHE_MAX_AGE_HOURS) {
      console.log(`⏱️  Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Fetching fresh data...`);
    } else {
      console.log('🔄 --force flag detected. Fetching fresh data...');
    }
  }
  
  if (!GITHUB_TOKEN) {
    console.warn('\n⚠️  No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
    console.warn('   This script requires authentication for GraphQL API access.');
    console.warn('   Get a token at: https://github.com/settings/tokens');
    console.warn('   Creating empty board data file to prevent build failure.\n');
    
    // Create empty file so build doesn't fail
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf-8');
    return;
  } else {
    console.log('✓ Using authenticated GitHub API access\n');
  }
  
  try {
    // Fetch from projectbluefin organization, project #1
    const items = await fetchProjectBoard('projectbluefin', 1);
    
    console.log(`\n✓ Successfully fetched ${items.length} items`);
    
    // Process and sort items
    const processedItems = processItems(items);
    
    console.log(`✓ Processed ${processedItems.length} items with content`);
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(processedItems, null, 2),
      'utf-8'
    );
    
    console.log(`✓ Board data saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Error fetching board data:', error.message);
    
    // Don't fail the build - just warn
    console.warn('\n⚠️  Failed to fetch board data. The board page may not display correctly.');
    console.warn('   Set a valid GitHub token and try again.\n');
    
    // Create empty file so build doesn't fail
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

fetchBoardData().catch(error => {
  console.error('Fatal error:', error);
  // Don't fail build - create empty file instead
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2), 'utf-8');
  console.warn('Created empty board data file to prevent build failure.');
});
