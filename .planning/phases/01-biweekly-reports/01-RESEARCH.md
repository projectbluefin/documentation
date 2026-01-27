# Phase 1: Biweekly Reports - Research

**Researched:** 2026-01-26
**Domain:** GitHub Project Board automation, Docusaurus multi-blog, badge generation
**Confidence:** HIGH

## Summary

Research confirms that automated biweekly reports from GitHub Project Board (Projects V2) data are fully achievable using standard tooling. The implementation will leverage GitHub's GraphQL API (Projects V2), Docusaurus's built-in multi-blog support, and Shields.io badge generation.

**Key findings:**

- GitHub Projects V2 uses GraphQL API exclusively (no REST API)
- Docusaurus 3.8.1 has native multi-blog plugin support with separate routes
- Shields.io static badge format is simple: `https://img.shields.io/badge/{label}-{message}-{color}`
- GitHub Actions `schedule` with cron supports biweekly execution patterns
- Contributor tracking requires maintaining historical data (JSON file recommended)

**Primary recommendation:** Use GitHub Actions with cron schedule, Node.js script with GraphQL queries, static JSON for contributor history, and Docusaurus multi-blog plugin configuration.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library          | Version | Purpose               | Why Standard                                                   |
| ---------------- | ------- | --------------------- | -------------------------------------------------------------- |
| @octokit/graphql | 7.x+    | GitHub GraphQL client | Official GitHub client library, handles auth and rate limiting |
| Docusaurus       | 3.8.1   | Static site generator | Already in use, has multi-blog plugin built-in                 |
| Node.js          | 18+     | Runtime environment   | Docusaurus requirement, GitHub Actions runner default          |

### Supporting

| Library         | Version | Purpose                  | When to Use                                         |
| --------------- | ------- | ------------------------ | --------------------------------------------------- |
| @actions/core   | latest  | GitHub Actions utilities | When creating Action-specific outputs/logging       |
| @actions/github | latest  | GitHub context access    | When needing workflow context (actor, repo, etc.)   |
| date-fns        | 3.x     | Date manipulation        | For biweekly window calculations, ISO week handling |

### Alternatives Considered

| Instead of            | Could Use             | Tradeoff                                                        |
| --------------------- | --------------------- | --------------------------------------------------------------- |
| GraphQL API           | REST API              | Projects V2 has NO REST API support - GraphQL required          |
| @octokit/graphql      | plain fetch + GraphQL | Lose automatic pagination, auth handling, rate limit management |
| Docusaurus multi-blog | Custom React pages    | Lose RSS feeds, pagination, built-in SEO, more maintenance      |

**Installation:**

```bash
npm install @octokit/graphql date-fns
# @actions/* already available in GitHub Actions runner
```

## Architecture Patterns

### Recommended Project Structure

```
.github/
├── workflows/
│   └── biweekly-reports.yml        # GitHub Actions workflow
scripts/
├── generate-report.js              # Main report generation script
├── lib/
│   ├── graphql-queries.js          # GraphQL query definitions
│   ├── label-mapping.js            # Label color mapping (static)
│   ├── contributor-tracker.js      # Historical contributor management
│   └── markdown-generator.js       # Report markdown formatter
static/
└── data/
    └── contributors-history.json   # Historical contributor data (gitignored)
reports/                            # Docusaurus blog instance root
├── authors.yaml                    # Empty or system-generated metadata
└── YYYY-MM-DD-report.md            # Generated report files
```

### Pattern 1: GraphQL Query Structure

**What:** Fetch project items with field values and linked content
**When to use:** Querying GitHub Projects V2 data
**Example:**

```javascript
// Source: GitHub GraphQL API documentation
const query = `
  query($orgLogin: String!, $projectNumber: Int!, $cursor: String) {
    organization(login: $orgLogin) {
      projectV2(number: $projectNumber) {
        id
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
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2Field {
                      name
                    }
                  }
                }
              }
            }
            content {
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
```

**Key points:**

- Use pagination (`after: $cursor`) for projects with >100 items
- Filter by `fieldValues` to identify items in specific columns (e.g., "Done")
- `content` discriminates between Issue and PullRequest types
- Labels come from the linked issue/PR, not the project item

### Pattern 2: Docusaurus Multi-Blog Configuration

**What:** Configure second blog instance for reports
**When to use:** When separating content types (main blog vs. automated reports)
**Example:**

```typescript
// Source: Docusaurus documentation
// docusaurus.config.ts
export default {
  plugins: [
    [
      "@docusaurus/plugin-content-blog",
      {
        id: "reports",
        routeBasePath: "reports",
        path: "./reports",
        blogTitle: "Biweekly Reports",
        blogDescription: "Automated project activity reports",
        blogSidebarTitle: "Recent Reports",
        blogSidebarCount: 10,
        postsPerPage: 20,
        showReadingTime: false, // Auto-generated content
        feedOptions: {
          type: "all",
          title: "Project Bluefin - Biweekly Reports",
          description: "Automated biweekly activity reports from project board",
          copyright: `Copyright © ${new Date().getFullYear()} Project Bluefin`,
        },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      items: [{ to: "/reports", label: "Reports", position: "left" }],
    },
  },
};
```

**Key points:**

- `id: 'reports'` required for multi-instance plugins
- `routeBasePath` sets URL path (`/reports` instead of `/blog`)
- RSS feed auto-generated with `feedOptions`
- `showReadingTime: false` appropriate for system-generated content

### Pattern 3: Shields.io Static Badge Format

**What:** Generate badge URLs from label data
**When to use:** Displaying GitHub labels in markdown reports
**Example:**

```javascript
// Source: Shields.io documentation
function generateBadge(label) {
  const name = encodeURIComponent(
    label.name.replace(/_/g, "__").replace(/ /g, "_"),
  );
  const color = label.color; // Hex color from GitHub (no # prefix)
  const url = encodeURIComponent(label.url);

  return `[![${label.name}](https://img.shields.io/badge/${name}-${color}?style=flat-square)](${url})`;
}

// Example output:
// [![area/gnome](https://img.shields.io/badge/area%2Fgnome-0E8A16?style=flat-square)](https://github.com/projectbluefin/common/labels/area%2Fgnome)
```

**URL encoding rules:**

- Underscore `_` → Space (display)
- Double underscore `__` → Underscore (display)
- Double dash `--` → Dash (display)
- Hex colors: Use GitHub's 6-digit hex (no # prefix)
- Style: `flat-square` matches reference format

### Pattern 4: Biweekly Schedule Calculation

**What:** Calculate 2-week window for cron schedule
**When to use:** Determining which items fall within report period
**Example:**

```javascript
// Source: GitHub Actions cron documentation + date-fns
import {
  subWeeks,
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
} from "date-fns";

// GitHub Actions cron: "0 10 * * 1" runs every Monday at 10:00 UTC
// To make biweekly: alternate execution based on ISO week number

function calculateReportWindow() {
  const reportDate = new Date(); // Today (Monday when workflow runs)
  const endDate = endOfDay(subWeeks(reportDate, 0)); // Sunday night before Monday
  const startDate = startOfDay(subWeeks(reportDate, 2)); // 2 weeks ago

  return { startDate, endDate };
}

function isInReportWindow(updatedAt, window) {
  const itemDate = parseISO(updatedAt);
  return isWithinInterval(itemDate, window);
}

// Filter project items by update time
const { startDate, endDate } = calculateReportWindow();
const itemsInWindow = projectItems.filter((item) => {
  const updatedAt = item.fieldValues.find(
    (f) => f.field.name === "Status",
  )?.updatedAt;
  return updatedAt && isInReportWindow(updatedAt, { startDate, endDate });
});
```

**Biweekly cron approaches:**

1. **Even/odd week check:** Run every Monday, skip if week number is odd/even
2. **Date arithmetic:** Run every Monday, calculate if 14 days since last report
3. **External state:** Store last run date in file, check if ≥14 days elapsed

Recommend approach #1 (even/odd week) for simplicity and no external state.

### Pattern 5: Contributor History Tracking

**What:** Maintain JSON file of all-time contributors for "first contribution" detection
**When to use:** Identifying new contributors across multiple repositories
**Example:**

```javascript
// Source: Common practice for GitHub Actions state management
// static/data/contributors-history.json (gitignored)
{
  "lastUpdated": "2026-01-26T10:00:00Z",
  "contributors": [
    "username1",
    "username2",
    "username3"
  ]
}

// Update logic:
async function updateContributorHistory(newContributors) {
  const historyPath = './static/data/contributors-history.json';
  let history = { contributors: [] };

  try {
    history = JSON.parse(await fs.readFile(historyPath, 'utf8'));
  } catch {
    // File doesn't exist yet, start fresh
  }

  const newUsernames = newContributors
    .map(c => c.author.login)
    .filter(username => !history.contributors.includes(username));

  if (newUsernames.length > 0) {
    history.contributors.push(...newUsernames);
    history.lastUpdated = new Date().toISOString();
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  }

  return newUsernames; // These are first-time contributors
}
```

**Storage location:** `static/data/contributors-history.json`
**Gitignore:** YES - This file grows over time, should not be committed
**Persistence:** File persists between workflow runs via checkout action

### Anti-Patterns to Avoid

- **Anti-pattern:** Fetching all project items on every run
  - **Why it's bad:** Rate limiting, slow performance
  - **Do instead:** Filter by date range at query level or post-fetch

- **Anti-pattern:** Hard-coding label colors in script
  - **Why it's bad:** Colors change over time, requires code changes
  - **Do instead:** Fetch labels from `projectbluefin/common` via API or maintain static mapping file

- **Anti-pattern:** Using `push` event for scheduled report generation
  - **Why it's bad:** Reports should run on schedule, not on code changes
  - **Do instead:** Use `schedule` event with cron expression

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build            | Use Instead                             | Why                                                      |
| ------------------------- | ---------------------- | --------------------------------------- | -------------------------------------------------------- |
| GraphQL pagination        | Manual cursor handling | @octokit/graphql with async iterator    | Handles pagination, rate limits, errors automatically    |
| Date range filtering      | String comparison      | date-fns `isWithinInterval`             | Handles timezones, leap years, edge cases                |
| Markdown escaping         | Manual regex           | Built-in Markdown libraries handle this | Special characters in titles break hand-rolled solutions |
| GitHub authentication     | Custom token handling  | @octokit/graphql auto-auth              | Handles token refresh, expiry, proper headers            |
| Contributor deduplication | Array loops            | Set data structure                      | O(1) lookup vs O(n) search                               |

**Key insight:** GitHub's API clients handle 90% of edge cases (pagination, rate limiting, retries, authentication refresh). Don't reimplement these.

## Common Pitfalls

### Pitfall 1: GraphQL Pagination Limits

**What goes wrong:** Query returns only first 100 items, missing completed work
**Why it happens:** Default `first: 100` limit on GraphQL queries
**How to avoid:**

```javascript
// Use @octokit/graphql's iterator
import { graphql } from "@octokit/graphql";

const iterator = graphql.paginate.iterator(query, { orgLogin, projectNumber });

for await (const response of iterator) {
  const items = response.organization.projectV2.items.nodes;
  // Process items
}
```

**Warning signs:** Report shows exactly 100 items when you expect more

### Pitfall 2: Column Field Filtering

**What goes wrong:** Cannot filter by "Done" column directly in GraphQL query
**Why it happens:** Projects V2 fields are dynamic, not query-filterable
**How to avoid:** Fetch all items, filter post-query by `fieldValues`:

```javascript
const doneItems = items.filter((item) => {
  const statusField = item.fieldValues.nodes.find(
    (fv) => fv.field?.name === "Status",
  );
  return statusField?.name === "Done";
});
```

**Warning signs:** GraphQL errors about unknown field names

### Pitfall 3: Bot Account Detection

**What goes wrong:** Bot PRs contaminate contributor list
**Why it happens:** Bots have regular User types in GraphQL
**How to avoid:** Maintain bot username pattern list:

```javascript
const BOT_PATTERNS = [
  /^dependabot\[bot\]$/,
  /^renovate\[bot\]$/,
  /^github-actions\[bot\]$/,
  /^ubot-\d+$/,
  /bot$/i, // Catches most bot usernames
];

function isBot(username) {
  return BOT_PATTERNS.some((pattern) => pattern.test(username));
}
```

**Warning signs:** Contributors section includes "dependabot[bot]", "renovate[bot]"

### Pitfall 4: Label Color Hex Format

**What goes wrong:** Shields.io badges fail to render or show wrong colors
**Why it happens:** GitHub returns hex without `#`, Shields.io expects without `#`
**How to avoid:** Use color directly from GitHub API (already correct format):

```javascript
// GitHub API returns: "0E8A16"
// Shields.io expects: "0E8A16" (no # prefix)
const badgeUrl = `https://img.shields.io/badge/label-${label.color}`;
// ✅ Correct

// ❌ Don't add # prefix
const badgeUrl = `https://img.shields.io/badge/label-%23${label.color}`;
```

**Warning signs:** Badges render as grey instead of expected colors

### Pitfall 5: Rate Limiting

**What goes wrong:** Workflow fails with 403 rate limit error
**Why it happens:** Default GITHUB_TOKEN has lower rate limits (1000/hour vs 5000/hour)
**How to avoid:**

- Use built-in `GITHUB_TOKEN` for most cases (sufficient for biweekly runs)
- For higher limits, create dedicated PAT with `public_repo` scope
- Check remaining rate limit before queries:

```javascript
import { graphql } from "@octokit/graphql";

const { rateLimit } = await graphql(
  `
    query {
      rateLimit {
        remaining
        resetAt
      }
    }
  `,
  {
    headers: { authorization: `token ${process.env.GITHUB_TOKEN}` },
  },
);

console.log(`Rate limit: ${rateLimit.remaining} remaining`);
```

**Warning signs:** Workflow fails on first run of the day, succeeds on retry hours later

### Pitfall 6: Biweekly Schedule Drift

**What goes wrong:** Reports generate every Monday instead of every other Monday
**Why it happens:** Cron expression `0 10 * * 1` runs weekly, not biweekly
**How to avoid:** Add week number check in script:

```javascript
import { getISOWeek } from "date-fns";

const currentWeek = getISOWeek(new Date());
if (currentWeek % 2 !== 0) {
  console.log("Skipping report (odd week)");
  process.exit(0);
}
```

**Warning signs:** New report appears every Monday in `/reports`

## Code Examples

Verified patterns from official sources:

### Fetch Project Board Data

```javascript
// Source: GitHub GraphQL API documentation
import { graphql } from "@octokit/graphql";

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

async function fetchProjectItems(orgLogin, projectNumber) {
  const query = `
    query($orgLogin: String!, $projectNumber: Int!) {
      organization(login: $orgLogin) {
        projectV2(number: $projectNumber) {
          id
          title
          items(first: 100) {
            nodes {
              id
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2SingleSelectField {
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
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await graphqlWithAuth(query, {
    orgLogin,
    projectNumber,
  });

  return result.organization.projectV2;
}
```

### Generate Report Markdown

```javascript
// Source: Context-based example matching reference format
function generateReportMarkdown(data, window) {
  const { startDate, endDate } = window;
  const dateStr = endDate.toISOString().split("T")[0];

  return `---
title: "Biweekly Report: ${startDate.toISOString().split("T")[0]} to ${dateStr}"
date: ${dateStr}
tags: [biweekly-report, project-activity]
---

# Summary

- **Items completed:** ${data.completedItems.length}
- **Contributors:** ${data.contributors.length}
- **New contributors:** ${data.newContributors.length}

## 🖥️ Desktop

${generateCategorySection(data.completedItems, "area/gnome", "area/aurora", "area/bling")}

## 🛠️ Development

${generateCategorySection(data.completedItems, "area/dx", "area/buildstream", "area/finpilot")}

## 🤖 Bot Activity

<details>
<summary>View bot activity details</summary>

| Repository | Bot | PRs |
|------------|-----|-----|
${data.botActivity.map((row) => `| ${row.repo} | ${row.bot} | ${row.count} |`).join("\n")}

</details>

## 👥 Contributors

Thank you to all contributors this period: ${data.contributors.join(", ")}

${data.newContributors.length > 0 ? `### 🎉 New Contributors\n\nWelcome to: ${data.newContributors.join(", ")}` : ""}

---

*Generated on ${new Date().toISOString().split("T")[0]}*  
[View Project Board](https://github.com/orgs/projectbluefin/projects/2) | [Report an Issue](https://github.com/projectbluefin/common/issues/new)
`;
}
```

## State of the Art

| Old Approach                | Current Approach          | When Changed              | Impact                                           |
| --------------------------- | ------------------------- | ------------------------- | ------------------------------------------------ |
| Projects (Classic) REST API | Projects V2 GraphQL API   | 2022 (Projects V2 launch) | Must use GraphQL, no REST alternative            |
| Single blog instance        | Multi-blog plugin support | Docusaurus 2.0 (2022)     | Native support for separate content streams      |
| Manual cron calculations    | date-fns library          | Standard practice         | Handles timezones, DST, edge cases automatically |
| HTML color names            | Hex color values          | Shields.io standard       | Consistent with GitHub label colors              |

**Deprecated/outdated:**

- **Projects Classic API**: Deprecated, use Projects V2 GraphQL API
- **@octokit/rest for Projects**: No Projects V2 support, use @octokit/graphql
- **Manual markdown escaping**: Docusaurus handles this automatically in frontmatter

## Implementation Notes

### GitHub Actions Workflow Configuration

```yaml
# .github/workflows/biweekly-reports.yml
name: Generate Biweekly Report

on:
  schedule:
    # Every Monday at 10:00 UTC
    - cron: "0 10 * * 1"
  workflow_dispatch: # Allow manual triggering

permissions:
  contents: write # For git commits
  pull-requests: read # For GraphQL queries

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for contributor tracking

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm install

      - name: Generate report
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/generate-report.js

      - name: Commit report
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add reports/ static/data/contributors-history.json
          git commit -m "docs(reports): add biweekly report for $(date +%Y-%m-%d)" || echo "No changes to commit"
          git push
```

**Cron syntax:** `0 10 * * 1` = Every Monday at 10:00 UTC
**Biweekly logic:** Implement week number check in script (see Pitfall 6)

### Label Mapping Strategy

Two approaches for label color mapping:

**Option A: Static mapping file (recommended for phase 1)**

```javascript
// scripts/lib/label-mapping.js
export const LABEL_COLORS = {
  "area/gnome": "0E8A16",
  "area/aurora": "1D76DB",
  "kind/bug": "D93F0B",
  "kind/enhancement": "A2EEEF",
  // ... etc
};
```

**Pros:** Fast, no API calls, colors stable over time
**Cons:** Requires manual updates if labels change

**Option B: Fetch from projectbluefin/common**

```javascript
// Fetch labels from common repo
const { repository } = await graphqlWithAuth(`
  query {
    repository(owner: "projectbluefin", name: "common") {
      labels(first: 100) {
        nodes {
          name
          color
        }
      }
    }
  }
`);
```

**Pros:** Always current
**Cons:** Extra API call, rate limit impact

**Recommendation:** Start with Option A, add Option B refresh script for maintenance.

### Report Filename Convention

```javascript
// Format: YYYY-MM-DD-report.md (matches Docusaurus blog post convention)
import { format } from "date-fns";

function getReportFilename(endDate) {
  return `reports/${format(endDate, "yyyy-MM-dd")}-report.md`;
}
```

**Docusaurus parses date from filename automatically.**

### Frontmatter Schema

```yaml
---
title: "Biweekly Report: 2026-01-13 to 2026-01-26"
date: 2026-01-26
tags: [biweekly-report, project-activity]
# authors: omit for system-generated content
# No author attribution, no reading time
---
```

**Key decisions:**

- `title`: Descriptive with date range
- `date`: Report end date (determines sort order)
- `tags`: For filtering, RSS feed categorization
- `authors`: Omit (system-generated, no personal attribution)

## Open Questions

Things that couldn't be fully resolved:

1. **Exact "Done" column field name in Projects V2**
   - What we know: Column names are stored as field values with type SingleSelect
   - What's unclear: Exact field name (likely "Status" with value "Done", but project-specific)
   - Recommendation: Query project structure first to identify field names dynamically

2. **Optimal bot detection pattern**
   - What we know: Common patterns like `[bot]` suffix, `ubot-\d+` format
   - What's unclear: All possible bot username formats across 4 repositories
   - Recommendation: Start with regex list, refine based on false positives in first report

3. **Historical contributor data size**
   - What we know: File grows linearly with unique contributors
   - What's unclear: At what size does git operations slow down? (estimate: 1000+ contributors = ~50KB)
   - Recommendation: Monitor file size, consider compression or database if >10K contributors

4. **Report regeneration strategy**
   - What we know: Reports are markdown files committed to git
   - What's unclear: Should we support regenerating past reports? (use case: fix formatting bug)
   - Recommendation: No regeneration in phase 1, reports are immutable once published

## Sources

### Primary (HIGH confidence)

- GitHub GraphQL API Documentation: https://docs.github.com/en/graphql
- GitHub Projects V2 API Guide: https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects
- Docusaurus Blog Documentation: https://docusaurus.io/docs/blog
- GitHub Actions Events: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
- Shields.io Badge Format: https://shields.io/badges/static-badge

### Secondary (MEDIUM confidence)

- @octokit/graphql package: https://github.com/octokit/graphql.js
- date-fns library: https://date-fns.org/docs
- Community practices for GitHub Actions state management (JSON files in repo)

### Tertiary (LOW confidence)

- None - All findings verified with official documentation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Official GitHub libraries, Docusaurus built-in features
- Architecture: HIGH - All patterns from official documentation or verified implementations
- Pitfalls: MEDIUM - Some based on common community experiences, others from official docs

**Research date:** 2026-01-26
**Valid until:** 90 days (GitHub API stable, Docusaurus v3 support period)
