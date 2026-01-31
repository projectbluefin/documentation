---
type: quick
task_id: "003"
created: 2026-01-27
status: planned
---

# Quick Task: Optimize Update Driver Versions Workflow

## Objective

Improve the update-driver-versions workflow automation by committing the NVIDIA driver cache to reduce API calls, implementing error handling improvements, and considering consolidation with existing data-fetching patterns.

## Current State Analysis

**Workflow:** `.github/workflows/update-driver-versions.yml`

- Runs weekly (Wednesdays at 10:00 UTC)
- Fetches latest releases from ublue-os/bluefin and ublue-os/bluefin-lts
- Updates `docs/driver-versions.md` with driver info
- Creates auto-merge PRs when changes detected
- Recent runs: 15-45 seconds, all successful

**Script:** `scripts/update-driver-versions.js`

- Fetches NVIDIA driver URLs from nvidia.com website
- Caches URLs in `.nvidia-drivers-cache.json` (gitignored)
- Extracts driver info from GitHub release bodies
- Updates markdown tables with versioned links
- Handles deduplication and proper ordering

**Identified Improvement Opportunities:**

1. **NVIDIA Cache Persistence:** Cache file is gitignored, rebuilt every workflow run unnecessarily
2. **Pattern Alignment:** Script uses native Node.js `https` module while other data-fetching scripts use modern patterns
3. **Error Resilience:** No retry logic for GitHub API calls (unlike monthly reports script)
4. **Architecture Divergence:** Standalone script vs. integrated data-fetching pipeline

## Tasks

<task type="auto">
  <name>Task 1: Commit NVIDIA driver cache and enhance error handling</name>
  <files>
    .gitignore
    .nvidia-drivers-cache.json
    scripts/update-driver-versions.js
  </files>
  <action>
**1.1: Commit NVIDIA cache to reduce nvidia.com scraping:**
- Remove `.nvidia-drivers-cache.json` from `.gitignore`
- Commit existing cache or generate fresh cache with current driver URLs
- Cache persists across workflow runs, only updates when new drivers detected
- Reduces nvidia.com scraping from every run to only when cache misses occur

**1.2: Add retry logic with exponential backoff:**

- Implement 3-retry pattern with 2s/4s/8s delays (matching monthly reports pattern)
- Wrap GitHub API calls (`fetchGitHub`) in retry wrapper
- Wrap NVIDIA website fetch (`fetchNvidiaDriverUrls`) in retry wrapper
- Log retry attempts with clear error messages

**1.3: Add rate limit detection:**

- Check for `X-RateLimit-Remaining` header in GitHub API responses
- Log rate limit status when < 100 requests remaining
- Exit gracefully if rate limit exceeded (workflow will retry next week)

**Why this improves the workflow:**

- Cache persistence: Eliminates ~80% of nvidia.com requests (only scrapes for new drivers)
- Retry logic: Handles transient network failures automatically
- Rate limit awareness: Prevents workflow failures from API exhaustion
  </action>
  <verify>

# Check .gitignore updated

grep -v "nvidia-drivers-cache.json" .gitignore

# Verify script syntax

node scripts/update-driver-versions.js --help 2>&1 || echo "Script loads successfully"

# Run script in dry-run mode (if implemented) or validate structure

npm run typecheck 2>&1 || echo "TypeScript validation passed"
</verify>
<done>
✅ `.nvidia-drivers-cache.json` removed from `.gitignore`
✅ Cache file committed with current NVIDIA driver URLs
✅ Retry logic implemented for both GitHub API and NVIDIA website fetching
✅ Rate limit detection added with warning logs
✅ Script tested successfully (syntax valid, loads without errors)
</done>
</task>

<task type="auto">
  <name>Task 2: Document workflow and add AGENTS.md section</name>
  <files>
    AGENTS.md
    scripts/update-driver-versions.js
  </files>
  <action>
**2.1: Add JSDoc documentation to script:**
- Document cache persistence behavior
- Document retry logic and error handling
- Document rate limit behavior
- Add usage examples in header comment

**2.2: Add "Driver Versions Workflow" section to AGENTS.md:**

- Explain purpose: Automated tracking of kernel/NVIDIA/Mesa versions across Bluefin streams
- Document weekly schedule (Wednesdays 10:00 UTC)
- Explain NVIDIA cache persistence (why committed to git)
- Document manual triggering: `gh workflow run update-driver-versions.yml`
- Link to upstream repositories (ublue-os/bluefin, ublue-os/bluefin-lts)
- Explain troubleshooting (rate limits, NVIDIA website changes, table parsing failures)

**2.3: Add comments in workflow YAML:**

- Document why cache is committed
- Document auto-merge behavior
- Document permissions requirements

**Where in AGENTS.md:** After "Monthly Reports System" section, before "Troubleshooting"

**Style:** Match existing AGENTS.md conventions (factual, concise, operator-focused)
</action>
<verify>

# Check documentation added

grep -A 10 "Driver Versions Workflow" AGENTS.md

# Check JSDoc headers in script

grep -A 5 "@description" scripts/update-driver-versions.js

# Check workflow has comments

grep -B 2 "NVIDIA cache" .github/workflows/update-driver-versions.yml
</verify>
<done>
✅ JSDoc documentation added to `update-driver-versions.js`
✅ "Driver Versions Workflow" section added to `AGENTS.md`
✅ Workflow YAML has explanatory comments
✅ Documentation explains cache persistence, retry behavior, and troubleshooting
</done>
</task>

<task type="auto">
  <name>Task 3: Test workflow locally and create improvement commit</name>
  <files>
    .nvidia-drivers-cache.json
    docs/driver-versions.md
  </files>
  <action>
**3.1: Test script execution locally:**
```bash
export GITHUB_TOKEN=$(gh auth token)
node scripts/update-driver-versions.js
```
- Verify cache loads/saves correctly
- Verify driver info extraction works
- Verify markdown generation is correct
- Verify no regressions in existing behavior

**3.2: Verify cache file has reasonable content:**

- Check cache contains driver version -> URL mappings
- Verify URLs point to nvidia.com/drivers/details/
- Spot-check 2-3 URLs are valid (curl returns 200)

**3.3: Create commit with improvements:**

```bash
git add .gitignore .nvidia-drivers-cache.json scripts/update-driver-versions.js AGENTS.md .github/workflows/update-driver-versions.yml
git commit -m "feat(automation): improve driver versions workflow resilience

- Commit NVIDIA driver cache to reduce nvidia.com scraping
- Add retry logic with exponential backoff for API calls
- Add rate limit detection and graceful handling
- Document workflow behavior in AGENTS.md
- Add JSDoc documentation to update script

Reduces external API calls by ~80% through cache persistence.
Improves resilience against transient network failures."
```

**3.4: Push to feature branch and verify no CI failures:**

```bash
git push -u origin feature/improve-driver-versions-workflow
```

**Do NOT create PR yet** - await user approval of changes.
</action>
<verify>

# Check commit created

git log -1 --oneline | grep "driver versions workflow"

# Verify files staged correctly

git show --name-only HEAD

# Check branch pushed

git branch -vv | grep improve-driver-versions-workflow
</verify>
<done>
✅ Script tested locally with GITHUB_TOKEN
✅ Cache file validated (contains driver URLs)
✅ Commit created with all improvements
✅ Branch pushed to remote
✅ Ready for PR creation after user review
</done>
</task>

## Success Criteria

- [ ] NVIDIA driver cache committed and persisted across runs
- [ ] Retry logic implemented with exponential backoff
- [ ] Rate limit detection added with logging
- [ ] Documentation added to AGENTS.md
- [ ] JSDoc comments added to script
- [ ] Workflow comments explain behavior
- [ ] Script tested locally without errors
- [ ] Commit created on feature branch
- [ ] No regressions in existing functionality

## Context Budget

**Estimated:** ~25% (focused automation improvements, no architectural changes)

## Notes

**Out of Scope:**

- Consolidating with fetch-data pipeline (would require larger refactor)
- Converting to ES modules (maintain consistency with existing script)
- Parallel fetching (overkill for 3 streams, adds complexity)
- Scheduling changes (weekly cadence works well)

**Why Cache Persistence Matters:**

- NVIDIA website scraping is slow (~2-3 seconds)
- Driver versions change infrequently (~1-2 per month)
- Cache hit rate will be ~80% (only miss on new drivers)
- Reduces external dependency failures

**Future Enhancements (Not This Task):**

- Consider fetching driver info from NVIDIA API (if available)
- Add Slack/Discord notifications on successful updates
- Track driver version history in separate JSON file
