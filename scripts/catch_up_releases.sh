#!/bin/bash

# Catch-up script for missed releases
# This script can be run manually to process missed releases from the last N days
# Usage: ./catch_up_releases.sh [days] [--force-regenerate] [--debug] [--verbose]

set -e

# Source GitHub API utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/github_api_utils.sh"

# Parse command line arguments
DAYS_BACK=${1:-14}
FORCE_REGENERATE="false"

# Parse additional flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-regenerate)
            FORCE_REGENERATE="true"
            export FORCE_REGENERATE_CHANGELOGS="true"
            shift
            ;;
        --debug)
            export DEBUG_MODE="true"
            shift
            ;;
        --verbose)
            export VERBOSE_MODE="true"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [days] [--force-regenerate] [--debug] [--verbose]"
            echo "  days: Number of days to look back (default: 14)"
            echo "  --force-regenerate: Overwrite existing changelog files"
            echo "  --debug: Enable debug logging"
            echo "  --verbose: Enable verbose logging"
            exit 0
            ;;
        [0-9]*)
            # Skip numeric argument (already processed as DAYS_BACK)
            shift
            ;;
        *)
            log_warn "Unknown option: $1"
            shift
            ;;
    esac
done

CUTOFF_DATE=$(date -d "$DAYS_BACK days ago" --iso-8601)

echo "=== Bluefin Release Catch-up Script ==="
echo "Looking for releases published after: $CUTOFF_DATE"
echo "Checking last $DAYS_BACK days..."

log_info "🚀 Starting Bluefin Release Catch-up Script"
log_info "📅 Looking for releases published after: $CUTOFF_DATE"
log_info "⏱️ Checking last $DAYS_BACK days..."
log_info "🔄 Force regenerate: $FORCE_REGENERATE"

# Perform GitHub API health check first
if ! api_health_check; then
    log_error "❌ GitHub API health check failed. Cannot proceed."
    exit 1
fi

# Function to process a single release
process_release() {
    local repo="$1"
    local tag="$2"
    local url="$3"
    local date="$4"
    local name="$5"
    local body="$6"
    
    log_verbose "Processing $repo:$tag (published: $date)"
    
    # Call existing script to process release with potential force regenerate flag
    local force_flag=""
    if [[ "$FORCE_REGENERATE" == "true" ]]; then
        force_flag="--force-regenerate"
    fi
    
    if ./scripts/process_single_release.sh "$repo" "$tag" "$url" "$date" "$name" "$body" "false" "" $force_flag; then
        log_info "✅ Processed $repo:$tag"
        return 0
    else
        local exit_code=$?
        if [[ $exit_code -eq 1 ]]; then
            log_verbose "⏭️ Skipped $repo:$tag (already exists)"
        else
            log_error "❌ Failed to process $repo:$tag (exit code: $exit_code)"
        fi
        return $exit_code
    fi
}

# Track processed releases
PROCESSED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

# Remove the old authentication check since it's now handled by the utils
# The api_health_check already validated authentication

# Process stable releases from ublue-os/bluefin
echo ""
echo "=== Processing stable releases from ublue-os/bluefin ==="
log_info "🔍 Processing stable releases from ublue-os/bluefin"

STABLE_FILTER="[.[] | select(.tag_name | contains(\"stable\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"

if STABLE_RELEASES=$(fetch_releases_with_filter "ublue-os/bluefin" "$STABLE_FILTER"); then
    if [[ "$STABLE_RELEASES" != "[]" && -n "$STABLE_RELEASES" ]]; then
        local count
        count=$(echo "$STABLE_RELEASES" | jq length)
        echo "Found $count stable release(s)"
        log_info "📦 Found $count stable release(s)"
        
        echo "$STABLE_RELEASES" | jq -c '.[]' | while read -r release; do
            TAG=$(echo "$release" | jq -r '.tag_name')
            URL=$(echo "$release" | jq -r '.html_url')
            DATE=$(echo "$release" | jq -r '.published_at')
            NAME=$(echo "$release" | jq -r '.name // .tag_name')
            BODY=$(echo "$release" | jq -r '.body // ""')
            
            if process_release "ublue-os/bluefin" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
                PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
            else
                case $? in
                    1) SKIPPED_COUNT=$((SKIPPED_COUNT + 1)) ;;
                    *) ERROR_COUNT=$((ERROR_COUNT + 1)) ;;
                esac
            fi
        done
    else
        echo "No recent stable releases found"
        log_info "ℹ️ No recent stable releases found"
    fi
else
    log_error "❌ Failed to fetch stable releases from ublue-os/bluefin"
    suggest_error_resolution $? "ublue-os/bluefin"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# Process GTS releases from ublue-os/bluefin
echo ""
echo "=== Processing GTS releases from ublue-os/bluefin ==="
log_info "🔍 Processing GTS releases from ublue-os/bluefin"

GTS_FILTER="[.[] | select(.tag_name | contains(\"gts\")) | select(.prerelease == false) | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"

if GTS_RELEASES=$(fetch_releases_with_filter "ublue-os/bluefin" "$GTS_FILTER"); then
    if [[ "$GTS_RELEASES" != "[]" && -n "$GTS_RELEASES" ]]; then
        local count
        count=$(echo "$GTS_RELEASES" | jq length)
        echo "Found $count GTS release(s)"
        log_info "📦 Found $count GTS release(s)"
        
        echo "$GTS_RELEASES" | jq -c '.[]' | while read -r release; do
            TAG=$(echo "$release" | jq -r '.tag_name')
            URL=$(echo "$release" | jq -r '.html_url')
            DATE=$(echo "$release" | jq -r '.published_at')
            NAME=$(echo "$release" | jq -r '.name // .tag_name')
            BODY=$(echo "$release" | jq -r '.body // ""')
            
            if process_release "ublue-os/bluefin" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
                PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
            else
                case $? in
                    1) SKIPPED_COUNT=$((SKIPPED_COUNT + 1)) ;;
                    *) ERROR_COUNT=$((ERROR_COUNT + 1)) ;;
                esac
            fi
        done
    else
        echo "No recent GTS releases found"
        log_info "ℹ️ No recent GTS releases found"
    fi
else
    log_error "❌ Failed to fetch GTS releases from ublue-os/bluefin"
    suggest_error_resolution $? "ublue-os/bluefin"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# Process LTS releases from ublue-os/bluefin-lts
echo ""
echo "=== Processing LTS releases from ublue-os/bluefin-lts ==="
log_info "🔍 Processing LTS releases from ublue-os/bluefin-lts"

LTS_FILTER="[.[] | select(.published_at > \"$CUTOFF_DATE\")] | sort_by(.published_at) | reverse"

if LTS_RELEASES=$(fetch_releases_with_filter "ublue-os/bluefin-lts" "$LTS_FILTER"); then
    if [[ "$LTS_RELEASES" != "[]" && -n "$LTS_RELEASES" ]]; then
        local count
        count=$(echo "$LTS_RELEASES" | jq length)
        echo "Found $count LTS release(s)"
        log_info "📦 Found $count LTS release(s)"
        
        echo "$LTS_RELEASES" | jq -c '.[]' | while read -r release; do
            TAG=$(echo "$release" | jq -r '.tag_name')
            URL=$(echo "$release" | jq -r '.html_url')
            DATE=$(echo "$release" | jq -r '.published_at')
            NAME=$(echo "$release" | jq -r '.name // .tag_name')
            BODY=$(echo "$release" | jq -r '.body // ""')
            
            if process_release "ublue-os/bluefin-lts" "$TAG" "$URL" "$DATE" "$NAME" "$BODY"; then
                PROCESSED_COUNT=$((PROCESSED_COUNT + 1))
            else
                case $? in
                    1) SKIPPED_COUNT=$((SKIPPED_COUNT + 1)) ;;
                    *) ERROR_COUNT=$((ERROR_COUNT + 1)) ;;
                esac
            fi
        done
    else
        echo "No recent LTS releases found"
        log_info "ℹ️ No recent LTS releases found"
    fi
else
    log_error "❌ Failed to fetch LTS releases from ublue-os/bluefin-lts"
    suggest_error_resolution $? "ublue-os/bluefin-lts"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""
echo "=== Summary ==="
echo "Processed $PROCESSED_COUNT new releases"

log_info "📊 Processing Summary:"
log_info "✅ Processed: $PROCESSED_COUNT new releases"
log_info "⏭️ Skipped: $SKIPPED_COUNT releases (already exist)"
log_info "❌ Errors: $ERROR_COUNT releases failed"

if [[ $PROCESSED_COUNT -gt 0 ]]; then
    echo ""
    echo "✅ Success! Processed $PROCESSED_COUNT releases."
    echo "📝 Please review the generated changelog files and commit them."
    echo "🔧 Consider running 'npm run build' to verify the site builds correctly."
    log_info "🎉 Success! Processed $PROCESSED_COUNT releases."
elif [[ $ERROR_COUNT -gt 0 ]]; then
    echo ""
    echo "⚠️ Completed with $ERROR_COUNT errors. Some releases may not have been processed."
    log_error "❌ Completed with $ERROR_COUNT errors. Some releases may not have been processed."
    exit 1
else
    echo "ℹ️ No new releases to process. All recent releases are already up to date."
    log_info "ℹ️ No new releases to process. All recent releases are already up to date."
fi