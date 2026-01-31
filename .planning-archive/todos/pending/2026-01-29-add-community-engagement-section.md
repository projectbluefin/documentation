---
created: 2026-01-29T02:31
title: Add Community Engagement section to monthly reports
area: reports
files:
  - scripts/generate-report.mjs
  - scripts/lib/graphql-queries.mjs
  - scripts/lib/markdown-generator.mjs
  - reports/
---

## Problem

Monthly reports currently show contributors by PR authorship only (merged PRs). This misses valuable community engagement from:

- Discussion participants (comments, reactions, helpful answers)
- Issue reporters and triagers
- Code reviewers
- Community support providers

We want a "Community Engagement" section alongside the existing contributors section that highlights top community participants based on broader engagement metrics.

**Key questions to research:**

1. **What metrics to track?**
   - Discussion comments/replies
   - Issue comments (excluding PR comments)
   - Reactions given/received
   - Helpful answer marks in discussions
   - Code review comments
2. **Top 10 or Top 20?**
   - Depends on activity volume in monitored repos
   - Need to query live data to determine typical engagement levels
   - Should avoid showing mostly zeros

3. **New Light subsection?**
   - Similar to "🌟 New Contributors" for first-time PR authors
   - Could show "🌟 New Voices" for first-time discussion/issue participants
   - Would require historical tracking similar to contributors-history.json

4. **Data sources:**
   - GitHub Discussions API (projectbluefin/common, ublue-os/bluefin)
   - GitHub Issues API (all monitored repos)
   - GitHub Pull Request Review API (all monitored repos)

## Solution

**Phase 1: Research & Design**

1. Query live GitHub API data for December 2024 and January 2025 (existing report months)
2. Analyze engagement patterns:
   - How many unique discussion participants per month?
   - How many unique issue commenters (non-PR)?
   - What's the distribution? (Are there 5 active people or 50?)
3. Determine appropriate threshold:
   - If 5-15 active: Top 10
   - If 15-30 active: Top 20
   - If <5 active: May not be worth separate section

**Phase 2: Implementation**

1. Add GraphQL queries for:
   - Discussion comments in date range
   - Issue comments (non-PR) in date range
   - PR review comments in date range
2. Build engagement scoring system:
   - Weight different activity types (discussion reply > reaction)
   - Filter out bot accounts
   - Aggregate by author
3. Add "Community Engagement" section to markdown generator:
   - Top N most engaged community members
   - Show engagement type breakdown (discussions, issues, reviews)
   - Optional "New Voices" subsection for first-timers
4. Update historical tracking:
   - Either extend contributors-history.json to include engagement
   - Or create separate engagement-history.json
   - Ensure query-based detection like contributor system

**Phase 3: Validation**

1. Generate test reports with engagement data
2. Verify bot filtering works correctly
3. Confirm "New Voices" detection is accurate
4. Check that section adds value (not mostly empty)

**Files likely to modify:**

- `scripts/lib/graphql-queries.mjs` - Add engagement queries
- `scripts/lib/contributor-tracker.mjs` - Extend for engagement tracking
- `scripts/lib/markdown-generator.mjs` - Add engagement section generator
- `scripts/generate-report.mjs` - Wire up engagement data flow

**Research starting points:**

- GitHub GraphQL API Explorer: https://docs.github.com/en/graphql/overview/explorer
- Discussion queries: `repository.discussions` with `comments` connection
- Issue queries: `repository.issues` with `comments` connection (filter `isPullRequest: false`)
- Review queries: `repository.pullRequests` with `reviews` connection

**Success criteria:**

- [ ] Live data analysis complete (sample size, distribution)
- [ ] Top N threshold determined (10 vs 20)
- [ ] GraphQL queries return engagement metrics
- [ ] Engagement scoring system designed
- [ ] Bot filtering verified
- [ ] Historical tracking approach decided
- [ ] "New Voices" detection implemented (if feasible)
- [ ] Test reports show valuable engagement data
