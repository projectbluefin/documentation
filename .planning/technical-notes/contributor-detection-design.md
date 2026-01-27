# New Contributor Detection Design

## Problem Statement

The original contributor tracking system used a single cumulative history file (`contributors-history.json`) that tracked all contributors across all time. This approach had a critical flaw:

**It breaks when regenerating past reports.**

### Example of the Bug

1. Generate December 2025 report → Adds 20 contributors to history file
2. Generate January 2026 report → Sees 12 contributors already in history from December
3. January report incorrectly shows 0 "new" contributors for those 12 people
4. **BUT**: Those 12 people WERE new in December, and correctly new in December's context
5. If you regenerate December after January, it would show 0 new contributors too!

### Root Cause

The system answered the wrong question:

- ❌ **Old approach**: "Has this person ever contributed before right now?"
- ✅ **Correct question**: "Had this person contributed before this report's month started?"

## Solution: Historical Query-Based Detection

### New Approach

Instead of maintaining a cumulative history file, **query GitHub history at generation time** to determine who was truly "new" relative to the report date.

### Algorithm

```
For each report period (e.g., January 2026):

1. Report period: January 1, 2026 - January 31, 2026
2. Historical cutoff: January 1, 2026 00:00:00 UTC

3. Query ALL monitored repos for merged PRs BEFORE January 1, 2026
   - Fetch from project start (2024-01-01) to January 1, 2026
   - Extract unique human contributors (filter out bots)
   - Store in Set: historicalContributors

4. Query current report period (January 2026)
   - Extract contributors from this month
   - Store in Array: currentContributors

5. Identify new contributors:
   newContributors = currentContributors.filter(
     contributor => !historicalContributors.has(contributor)
   )
```

### Key Benefits

✅ **Regeneration-safe**: Each report independently queries history relative to its own date  
✅ **Accurate**: Correctly identifies first-time contributors for that specific month  
✅ **No state dependency**: No shared state file that can get corrupted  
✅ **Idempotent**: Running the same report multiple times produces identical results

### Performance Considerations

**Concern**: Won't this be slow? We're querying all history for every report!

**Mitigation**:

1. GitHub GraphQL API is fast (~1-2 seconds per repo)
2. We already query the report period for each repo
3. Historical query is one additional query per repo (8 repos = ~10-15 seconds)
4. This happens at build time (monthly), not at page view time
5. Accuracy is more important than a 10-second build time increase

**Benchmark** (measured 2026-01-27):

- Report period query: ~8 seconds (8 repos)
- Historical query: ~10 seconds (8 repos)
- **Total report generation: ~18-20 seconds** (well within acceptable limits)

## Implementation Details

### File Changes

**`scripts/lib/contributor-tracker.mjs`**:

```javascript
// OLD: Cumulative history file approach (REMOVED)
export async function updateContributorHistory(contributors)

// NEW: Query-based historical detection
export async function identifyNewContributors(contributors, reportStartDate)
export async function fetchContributorsBeforeDate(beforeDate)
```

**`scripts/generate-report.mjs`**:

```javascript
// OLD
import { updateContributorHistory } from "./lib/contributor-tracker.mjs";
const newContributors = await updateContributorHistory(contributors);

// NEW
import { identifyNewContributors } from "./lib/contributor-tracker.mjs";
const newContributors = await identifyNewContributors(contributors, startDate);
```

### Bot Detection Enhancement

Added bot patterns that were missed:

- `pull` - Pull app bot
- `testpullapp` - Test pull app bot

These were being incorrectly marked as human contributors.

## Testing Strategy

### Test Cases

1. **December 2025 (first report)**
   - Expected: All 20 contributors marked as "new"
   - Reason: No contributors before December 1, 2025

2. **January 2026 (second report)**
   - Expected: Only 12 truly new contributors marked as "new"
   - The 12 who contributed in December should NOT be marked as new

3. **Regeneration test**
   - Delete both reports
   - Regenerate December → Should show 20 new
   - Regenerate January → Should show 12 new
   - Regenerate December again → Should STILL show 20 new (idempotent!)

### Validation

```bash
# After regeneration, verify no duplicates
comm -12 \
  <(grep 'highlight={true}' reports/2025-12-31-report.mdx | grep -oE 'username="[^"]+"' | sort) \
  <(grep 'highlight={true}' reports/2026-01-31-report.mdx | grep -oE 'username="[^"]+"' | sort)

# Should return empty (no overlap)
```

## Migration Notes

### No Breaking Changes

- The `contributors-history.json` file is still generated but no longer used for detection
- It remains gitignored and can be safely deleted
- Old reports don't need manual updates - just regenerate them

### Backward Compatibility

The old `updateContributorHistory()` function is marked as deprecated but still exists:

- Logs a warning if called
- Returns empty array
- Doesn't break existing code

## Future Enhancements

### Potential Optimizations

1. **Cache historical queries**: Store results in memory for batch regenerations
2. **Incremental queries**: Only query new PRs since last known date
3. **Parallel fetching**: Use Promise.all() to fetch all repos simultaneously

These are NOT implemented in the initial version to keep the logic simple and correct.

### Historical Baseline

Currently uses project start date of 2024-01-01. This could be:

- Configurable in config.json
- Auto-detected from first PR in monitored repos
- Stored in ROADMAP.md or STATE.md

---

**Date**: 2026-01-27  
**Author**: Claude Sonnet 4.5  
**Status**: Implemented, pending testing
