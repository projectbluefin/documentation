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

# Process stable releases from ublue-os/bluefin
echo ""
echo "=== Processing stable releases from ublue-os/bluefin ==="
STABLE_RELEASES=$(gh api repos/ublue-os/bluefin/releases --paginate --jq "[.[] | select(.tag_name | contains(\"stable\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse" 2>/dev/null || echo "[]")

if [[ "$STABLE_RELEASES" != "[]" ]]; then
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
GTS_RELEASES=$(gh api repos/ublue-os/bluefin/releases --paginate --jq "[.[] | select(.tag_name | contains(\"gts\")) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse" 2>/dev/null || echo "[]")

if [[ "$GTS_RELEASES" != "[]" ]]; then
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
LTS_RELEASES=$(gh api repos/ublue-os/bluefin-lts/releases --paginate --jq "[.[] | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse" 2>/dev/null || echo "[]")

if [[ "$LTS_RELEASES" != "[]" ]]; then
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