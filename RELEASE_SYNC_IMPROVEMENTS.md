# Release Sync Improvements

This document describes the improvements made to the Bluefin release synchronization system to ensure reliable changelog generation.

## Problem Statement

The original sync workflow (run 17525485080) succeeded but missed recent releases:

- `stable-20250907` (published 2025-09-07T06:57:27Z)
- `gts-20250907` (published 2025-09-07T06:51:04Z)

The workflow only fetched the "latest" release of each type, which could miss releases due to timing issues or rapid succession of releases.

## Solution Overview

### 1. Enhanced Release Detection

**Before**: Only fetched single "latest" release per type

```bash
STABLE_RELEASE=$(gh api repos/ublue-os/bluefin/releases --jq '[.[] | select(.tag_name | contains("stable")) | select(.prerelease == false)][0]')
```

**After**: Fetches all recent releases (last 10 days) and processes them

```bash
STABLE_RELEASES=$(gh api repos/ublue-os/bluefin/releases --paginate --jq "[.[] | select(.tag_name | contains(\"stable\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse")
```

### 2. Multiple Release Processing

The improved workflow can now:

- Process multiple releases per run
- Handle releases published in rapid succession
- Catch up on missed releases from the last 10 days
- Sort releases by publish date (newest first)

### 3. Better Error Handling and Logging

- Added publish date logging for each release
- Improved error messages with suggestions
- Added section headers for better troubleshooting
- Enhanced the existing file detection logic

### 4. Catch-up Mechanism

Created `scripts/catch_up_releases.sh` for manual recovery:

```bash
# Catch up on releases from last 14 days
./scripts/catch_up_releases.sh

# Catch up on releases from last 7 days
./scripts/catch_up_releases.sh 7
```

## Files Modified

1. **`.github/workflows/sync-bluefin-releases.yml`**
   - Enhanced release detection logic
   - Added date-based filtering
   - Improved logging and error handling

2. **`scripts/process_single_release.sh`**
   - Added release date logging
   - Improved error messages

3. **`scripts/catch_up_releases.sh`** (new)
   - Manual catch-up script for missed releases
   - Configurable lookback period

4. **`test_release_sync.sh`** (new)
   - Test script to validate improvements
   - Mock data for testing without network access

## Testing

The solution was tested with mock data representing the actual releases that were missed:

- ✅ Correctly identifies missing September 7th releases
- ✅ Avoids reprocessing existing releases
- ✅ Handles all three release types (stable, gts, lts)
- ✅ Maintains backward compatibility

## Key Improvements

1. **Reliability**: No longer relies on single "latest" release
2. **Recovery**: Can catch up on missed releases automatically
3. **Maintainability**: Better logging and error messages
4. **Simplicity**: Clean, well-documented approach
5. **Compatibility**: Preserves existing repository_dispatch functionality

## Repository Support

The improved workflow reliably picks up releases from:

- `ublue-os/bluefin` (stable and gts tags)
- `ublue-os/bluefin-lts` (lts tags)

## Usage

### Automatic Operation

The workflow runs automatically:

- Daily at 6am ET (10:00 UTC)
- On manual trigger
- On repository_dispatch events

### Manual Recovery

If releases are missed:

```bash
# Run the catch-up script
./scripts/catch_up_releases.sh

# Review generated files
git status

# Commit and push
git add changelogs/
git commit -m "feat(changelogs): catch up on missed releases"
git push
```

This solution ensures the changelog system remains reliable and maintainable while providing tools for manual recovery when needed.
