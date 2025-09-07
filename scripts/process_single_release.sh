#!/bin/bash

# Script to process a single release and create changelog entry
# Usage: process_single_release.sh SOURCE_REPO RELEASE_TAG RELEASE_URL RELEASE_DATE RELEASE_NAME RELEASE_BODY RELEASE_PRERELEASE AUTHOR
# Exit codes: 0=success, 1=file already exists, 2=error

set -e

SOURCE_REPO="$1"
RELEASE_TAG="$2"
RELEASE_URL="$3"
RELEASE_DATE="$4"
RELEASE_NAME="$5"
RELEASE_BODY="$6"
RELEASE_PRERELEASE="$7"
AUTHOR="$8"

if [[ -z "$SOURCE_REPO" || -z "$RELEASE_TAG" || -z "$RELEASE_DATE" ]]; then
    echo "Error: Missing required parameters"
    echo "Usage: process_single_release.sh SOURCE_REPO RELEASE_TAG RELEASE_URL RELEASE_DATE RELEASE_NAME RELEASE_BODY RELEASE_PRERELEASE AUTHOR"
    exit 2
fi

# Set default author if not provided for backward compatibility
if [[ -z "$AUTHOR" ]]; then
    if [[ "$SOURCE_REPO" == "ublue-os/bluefin-lts" ]] || [[ "$RELEASE_TAG" == lts-* ]]; then
        AUTHOR="bluefin-lts-release-bot"
    elif [[ "$RELEASE_TAG" == *"gts"* ]]; then
        AUTHOR="bluefin-gts-release-bot"
    else
        AUTHOR="bluefin-release-bot"
    fi
fi

echo "Processing release: $RELEASE_TAG from $SOURCE_REPO"
echo "Release date: $RELEASE_DATE"
echo "Using author: $AUTHOR"

# Parse date to YYYY-MM-DD format
FORMATTED_DATE=$(date -u -d "$RELEASE_DATE" '+%Y-%m-%d' 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$RELEASE_DATE" '+%Y-%m-%d' 2>/dev/null || echo "$(date '+%Y-%m-%d')")

# Determine release type based on source repository and tag pattern
if [[ "$SOURCE_REPO" == "ublue-os/bluefin-lts" ]] || [[ "$RELEASE_TAG" == lts-* ]] || [[ "$RELEASE_TAG" == lts.* ]]; then
    RELEASE_TYPE="lts"
    RELEASE_TAG_DISPLAY="LTS"
    # Clean up the tag for filename (remove lts- or lts. prefix if present)
    CLEAN_TAG=$(echo "$RELEASE_TAG" | sed 's/^lts[-\.]//')
    # For LTS releases, slug tag is the same as clean tag
    SLUG_TAG="$CLEAN_TAG"
elif [[ "$RELEASE_TAG" == *"gts"* ]]; then
    RELEASE_TYPE="gts"
    RELEASE_TAG_DISPLAY="GTS"
    # Clean up the tag for filename (remove gts- or gts. prefix if present)
    CLEAN_TAG=$(echo "$RELEASE_TAG" | sed 's/^gts[-\.]//')
    # For GTS releases, slug tag is the same as clean tag
    SLUG_TAG="$CLEAN_TAG"
else
    RELEASE_TYPE="stable"
    RELEASE_TAG_DISPLAY="Stable"
    # For stable releases, clean up the tag to remove stable- or stable. prefix
    CLEAN_TAG=$(echo "$RELEASE_TAG" | sed 's/^stable[-\.]//')
    # For stable releases, slug tag is the same as clean tag to avoid double "stable"
    SLUG_TAG="$CLEAN_TAG"
fi

# Remove 'v' prefix from tag if present for filename
CLEAN_TAG=$(echo "$CLEAN_TAG" | sed 's/^v//')
SLUG_TAG=$(echo "$SLUG_TAG" | sed 's/^v//')

# Generate filename based on release type
if [[ "$RELEASE_TYPE" == "lts" ]]; then
    FILENAME="$FORMATTED_DATE-lts-$CLEAN_TAG.md"
elif [[ "$RELEASE_TYPE" == "gts" ]]; then
    FILENAME="$FORMATTED_DATE-gts-$CLEAN_TAG.md"
else
    FILENAME="$FORMATTED_DATE-$CLEAN_TAG.md"
fi

# Create the changelog file path
CHANGELOG_FILE="changelogs/$FILENAME"

# Check if file already exists
if [[ -f "$CHANGELOG_FILE" ]]; then
    echo "WARNING: Changelog file already exists: $CHANGELOG_FILE"
    echo "SKIPPED: $SOURCE_REPO:$RELEASE_TAG - file already exists"
    echo "Skipping creation to avoid overwriting existing content"
    echo "If you want to regenerate this file, please delete it first"
    exit 0
fi

echo "Creating changelog entry: $CHANGELOG_FILE"

# Determine title prefix based on source repository
# For LTS releases, use "Bluefin" as prefix since RELEASE_TAG_DISPLAY already contains "LTS"
# This prevents duplication like "Bluefin LTS LTS 20250602"
if [[ "$SOURCE_REPO" == "ublue-os/bluefin-lts" ]]; then
    TITLE_PREFIX="Bluefin"
else
    TITLE_PREFIX="Bluefin"
fi

# Save release body to temporary file
echo "$RELEASE_BODY" > "/tmp/release_body_single.md"

# Validate release body content for completeness
echo "Validating release body content..."
BODY_LENGTH=$(echo "$RELEASE_BODY" | wc -c)
echo "Release body length: $BODY_LENGTH characters"

# Check for essential sections in the release body
MISSING_SECTIONS=""
if ! echo "$RELEASE_BODY" | grep -q "### All Images"; then
    MISSING_SECTIONS="$MISSING_SECTIONS 'All Images'"
fi
if ! echo "$RELEASE_BODY" | grep -q "### Commits"; then
    MISSING_SECTIONS="$MISSING_SECTIONS 'Commits'"
fi
if ! echo "$RELEASE_BODY" | grep -q "### How to rebase"; then
    MISSING_SECTIONS="$MISSING_SECTIONS 'How to rebase'"
fi

# Log validation results
if [[ -n "$MISSING_SECTIONS" ]]; then
    echo "⚠️ WARNING: Release body appears incomplete. Missing sections:$MISSING_SECTIONS"
    echo "Release body preview (first 500 chars):"
    echo "$RELEASE_BODY" | head -c 500
    echo "..."
    echo "This may result in an incomplete changelog. Consider regenerating from source."
else
    echo "✅ Release body validation passed - all essential sections found"
fi

# Log some content statistics
COMMITS_COUNT=$(echo "$RELEASE_BODY" | grep -c "^\| \*\*\[" || echo "0")
PACKAGES_COUNT=$(echo "$RELEASE_BODY" | grep -c "^| [✨🔄❌]" || echo "0")
echo "📊 Content statistics: $COMMITS_COUNT commits, $PACKAGES_COUNT package changes"

# Create the changelog file using printf to avoid YAML parsing issues
printf '%s\n' \
    '---' \
    'title: "TITLE_PREFIX RELEASE_TAG_DISPLAY CLEAN_TAG"' \
    'slug: bluefin-RELEASE_TYPE-SLUG_TAG' \
    'authors: [AUTHOR_PLACEHOLDER]' \
    'tags: [release, bluefin, RELEASE_TYPE]' \
    '---' \
    '' \
    'TITLE_PREFIX RELEASE_TAG_DISPLAY release CLEAN_TAG is now available.' \
    '' \
    '<!--truncate-->' \
    '' \
    'RELEASE_BODY_CONTENT' \
    '' \
    '---' \
    '' \
    '**Release Information:**' \
    '- **Release:** [RELEASE_TAG](RELEASE_URL)' \
    '- **Type:** RELEASE_TAG_DISPLAY' \
    '- **Date:** FORMATTED_DATE' \
    '- **Repository:** SOURCE_REPO' \
    '' \
    'For installation instructions and more information, visit the [Bluefin documentation](https://docs.projectbluefin.io/).' \
    > "$CHANGELOG_FILE"

# Replace placeholders in the file
sed -i "s/TITLE_PREFIX/$TITLE_PREFIX/g" "$CHANGELOG_FILE"
sed -i "s/RELEASE_TAG_DISPLAY/$RELEASE_TAG_DISPLAY/g" "$CHANGELOG_FILE"
sed -i "s/CLEAN_TAG/$CLEAN_TAG/g" "$CHANGELOG_FILE"
sed -i "s/SLUG_TAG/$SLUG_TAG/g" "$CHANGELOG_FILE"
sed -i "s/RELEASE_TYPE/$RELEASE_TYPE/g" "$CHANGELOG_FILE"
sed -i "s/AUTHOR_PLACEHOLDER/$AUTHOR/g" "$CHANGELOG_FILE"
sed -i "s|RELEASE_TAG|$RELEASE_TAG|g" "$CHANGELOG_FILE"
sed -i "s|RELEASE_URL|$RELEASE_URL|g" "$CHANGELOG_FILE"
sed -i "s/FORMATTED_DATE/$FORMATTED_DATE/g" "$CHANGELOG_FILE"
sed -i "s|SOURCE_REPO|$SOURCE_REPO|g" "$CHANGELOG_FILE"

# Insert the release body content
sed -i "/RELEASE_BODY_CONTENT/r /tmp/release_body_single.md" "$CHANGELOG_FILE"
sed -i "/RELEASE_BODY_CONTENT/d" "$CHANGELOG_FILE"

# Validate the generated changelog file
echo "Validating generated changelog file..."
CHANGELOG_SIZE=$(wc -c < "$CHANGELOG_FILE")
echo "Generated changelog size: $CHANGELOG_SIZE bytes"

# Verify essential sections made it into the final changelog
FINAL_MISSING_SECTIONS=""
if ! grep -q "### All Images" "$CHANGELOG_FILE"; then
    FINAL_MISSING_SECTIONS="$FINAL_MISSING_SECTIONS 'All Images'"
fi
if ! grep -q "### Commits" "$CHANGELOG_FILE"; then
    FINAL_MISSING_SECTIONS="$FINAL_MISSING_SECTIONS 'Commits'"
fi
if ! grep -q "### How to rebase" "$CHANGELOG_FILE"; then
    FINAL_MISSING_SECTIONS="$FINAL_MISSING_SECTIONS 'How to rebase'"
fi

# Final validation report
if [[ -n "$FINAL_MISSING_SECTIONS" ]]; then
    echo "❌ ERROR: Generated changelog is missing sections:$FINAL_MISSING_SECTIONS"
    echo "This suggests the release body was incomplete or processing failed."
    echo "Changelog file: $CHANGELOG_FILE"
    exit 2
else
    echo "✅ Changelog validation passed - all essential sections present"
fi

# Count lines to ensure substantial content
LINE_COUNT=$(wc -l < "$CHANGELOG_FILE")
echo "Generated changelog has $LINE_COUNT lines"

if [[ $LINE_COUNT -lt 30 ]]; then
    echo "⚠️ WARNING: Changelog seems unusually short ($LINE_COUNT lines)"
    echo "This may indicate incomplete content generation."
fi

echo "Successfully created changelog file: $CHANGELOG_FILE"
echo "Release type: $RELEASE_TYPE"
echo "Generated filename: $FILENAME"

exit 0