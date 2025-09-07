#!/bin/bash

# Catch-up script for missed releases
# This script can be run manually to process missed releases from the last N days
# Usage: ./catch_up_releases.sh [days] (default: 14 days)

set -e

DAYS_BACK=${1:-14}
CUTOFF_DATE=$(date -d "$DAYS_BACK days ago" --iso-8601)

echo "=== Bluefin Release Catch-up Script ==="
echo "Looking for releases published after: $CUTOFF_DATE"
echo "Checking last $DAYS_BACK days..."

# Function to process a single release
process_release() {
    local repo="$1"
    local tag="$2"
    local url="$3"
    local date="$4"
    local name="$5"
    local body="$6"
    
    echo "Processing $repo:$tag (published: $date)"
    
    # Call existing script to process release
    if ./scripts/process_single_release.sh "$repo" "$tag" "$url" "$date" "$name" "$body" "false" ""; then
        echo "✅ Processed $repo:$tag"
        return 0
    else
        echo "⚠️ Skipped $repo:$tag (already exists or error)"
        return 1
    fi
}

# Track processed releases
PROCESSED_COUNT=0

# Check if gh CLI is available and configured
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed or not in PATH"
    echo "Please install GitHub CLI: https://cli.github.com/"
    exit 1
fi

# Check authentication
echo "Checking GitHub CLI authentication..."
if ! gh auth status >/dev/null 2>&1; then
    echo "❌ Error: GitHub CLI is not authenticated"
    echo "Please run 'gh auth login' first"
    echo "Or set the GH_TOKEN environment variable"
    exit 1
fi

echo "✅ GitHub CLI authentication verified"

# Function to fetch releases with retry logic
fetch_releases_with_retry() {
    local repo="$1"
    local filter="$2"
    local max_attempts=3
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        echo "Attempting to fetch releases from $repo (attempt $attempt/$max_attempts)"
        
        local result
        if result=$(gh api "repos/$repo/releases" --paginate --jq "$filter" 2>&1); then
            echo "$result"
            return 0
        else
            echo "❌ API call failed (attempt $attempt/$max_attempts): $result"
            if [[ $attempt -lt $max_attempts ]]; then
                echo "Retrying in 5 seconds..."
                sleep 5
            fi
            ((attempt++))
        fi
    done
    
    echo "❌ Failed to fetch releases from $repo after $max_attempts attempts"
    echo "[]"
    return 1
}

# Process stable releases from ublue-os/bluefin
echo ""
echo "=== Processing stable releases from ublue-os/bluefin ==="
STABLE_FILTER="[.[] | select(.tag_name | contains(\"stable\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"
STABLE_RELEASES=$(fetch_releases_with_retry "ublue-os/bluefin" "$STABLE_FILTER")

if [[ "$STABLE_RELEASES" != "[]" && -n "$STABLE_RELEASES" ]]; then
    echo "Found $(echo "$STABLE_RELEASES" | jq length) stable release(s)"
    echo "$STABLE_RELEASES" | jq -c '.[]' | while read -r release; do
        TAG=$(echo "$release" | jq -r '.tag_name')
        URL=$(echo "$release" | jq -r '.html_url')
        DATE=$(echo "$release" | jq -r '.published_at')
        NAME=$(echo "$release" | jq -r '.name // .tag_name')
        BODY=$(echo "$release" | jq -r '.body // ""')
        
        if process_release "ublue-os/bluefin" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
            PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
        fi
    done
else
    echo "No recent stable releases found"
fi

# Process GTS releases from ublue-os/bluefin
echo ""
echo "=== Processing GTS releases from ublue-os/bluefin ==="
GTS_FILTER="[.[] | select(.tag_name | contains(\"gts\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"
GTS_RELEASES=$(fetch_releases_with_retry "ublue-os/bluefin" "$GTS_FILTER")

if [[ "$GTS_RELEASES" != "[]" && -n "$GTS_RELEASES" ]]; then
    echo "Found $(echo "$GTS_RELEASES" | jq length) GTS release(s)"
    echo "$GTS_RELEASES" | jq -c '.[]' | while read -r release; do
        TAG=$(echo "$release" | jq -r '.tag_name')
        URL=$(echo "$release" | jq -r '.html_url')
        DATE=$(echo "$release" | jq -r '.published_at')
        NAME=$(echo "$release" | jq -r '.name // .tag_name')
        BODY=$(echo "$release" | jq -r '.body // ""')
        
        if process_release "ublue-os/bluefin" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
            PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
        fi
    done
else
    echo "No recent GTS releases found"
fi

# Process LTS releases from ublue-os/bluefin-lts
echo ""
echo "=== Processing LTS releases from ublue-os/bluefin-lts ==="
LTS_FILTER="[.[] | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"
LTS_RELEASES=$(fetch_releases_with_retry "ublue-os/bluefin-lts" "$LTS_FILTER")

if [[ "$LTS_RELEASES" != "[]" && -n "$LTS_RELEASES" ]]; then
    echo "Found $(echo "$LTS_RELEASES" | jq length) LTS release(s)"
    echo "$LTS_RELEASES" | jq -c '.[]' | while read -r release; do
        TAG=$(echo "$release" | jq -r '.tag_name')
        URL=$(echo "$release" | jq -r '.html_url')
        DATE=$(echo "$release" | jq -r '.published_at')
        NAME=$(echo "$release" | jq -r '.name // .tag_name')
        BODY=$(echo "$release" | jq -r '.body // ""')
        
        if process_release "ublue-os/bluefin-lts" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
            PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
        fi
    done
else
    echo "No recent LTS releases found"
fi

echo ""
echo "=== Summary ==="
echo "Processed $PROCESSED_COUNT new releases"

if [[ $PROCESSED_COUNT -gt 0 ]]; then
    echo ""
    echo "✅ Success! Processed $PROCESSED_COUNT releases."
    echo "📝 Please review the generated changelog files and commit them."
    echo "🔧 Consider running 'npm run build' to verify the site builds correctly."
else
    echo "ℹ️ No new releases to process. All recent releases are already up to date."
fi