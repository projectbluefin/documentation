#!/bin/bash

# Script to process a single release and create changelog entry
# Usage: process_single_release.sh SOURCE_REPO RELEASE_TAG RELEASE_URL RELEASE_DATE RELEASE_NAME RELEASE_BODY RELEASE_PRERELEASE
# Exit codes: 0=success, 1=file already exists, 2=error

set -e

SOURCE_REPO="$1"
RELEASE_TAG="$2"
RELEASE_URL="$3"
RELEASE_DATE="$4"
RELEASE_NAME="$5"
RELEASE_BODY="$6"
RELEASE_PRERELEASE="$7"

if [[ -z "$SOURCE_REPO" || -z "$RELEASE_TAG" || -z "$RELEASE_DATE" ]]; then
    echo "Error: Missing required parameters"
    echo "Usage: process_single_release.sh SOURCE_REPO RELEASE_TAG RELEASE_URL RELEASE_DATE RELEASE_NAME RELEASE_BODY RELEASE_PRERELEASE"
    exit 2
fi

echo "Processing release: $RELEASE_TAG from $SOURCE_REPO"

# Parse date to YYYY-MM-DD format
FORMATTED_DATE=$(date -u -d "$RELEASE_DATE" '+%Y-%m-%d' 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$RELEASE_DATE" '+%Y-%m-%d' 2>/dev/null || echo "$(date '+%Y-%m-%d')")

# Determine release type based on source repository and tag pattern
if [[ "$SOURCE_REPO" == "ublue-os/bluefin-lts" ]] || [[ "$RELEASE_TAG" == lts-* ]]; then
    RELEASE_TYPE="lts"
    RELEASE_TAG_DISPLAY="LTS"
    # Clean up the tag for filename (remove lts- prefix if present)
    CLEAN_TAG=$(echo "$RELEASE_TAG" | sed 's/^lts-//')
    # For LTS releases, slug tag is the same as clean tag
    SLUG_TAG="$CLEAN_TAG"
elif [[ "$RELEASE_TAG" == *"gts"* ]]; then
    RELEASE_TYPE="gts"
    RELEASE_TAG_DISPLAY="GTS"
    # Clean up the tag for filename (remove gts- prefix if present)
    CLEAN_TAG=$(echo "$RELEASE_TAG" | sed 's/^gts-//')
    # For GTS releases, slug tag is the same as clean tag
    SLUG_TAG="$CLEAN_TAG"
else
    RELEASE_TYPE="stable"
    RELEASE_TAG_DISPLAY="Stable"
    CLEAN_TAG="$RELEASE_TAG"
    # For stable releases, slug tag removes the stable- prefix to avoid double "stable"
    SLUG_TAG=$(echo "$RELEASE_TAG" | sed 's/^stable-//')
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
    exit 0
fi

echo "Creating changelog entry: $CHANGELOG_FILE"

# Determine title prefix based on source repository
if [[ "$SOURCE_REPO" == "ublue-os/bluefin-lts" ]]; then
    TITLE_PREFIX="Bluefin LTS"
else
    TITLE_PREFIX="Bluefin"
fi

# Save release body to temporary file
echo "$RELEASE_BODY" > "/tmp/release_body_single.md"

# Create the changelog file using printf to avoid YAML parsing issues
printf '%s\n' \
    '---' \
    'title: "TITLE_PREFIX RELEASE_TAG_DISPLAY CLEAN_TAG"' \
    'slug: bluefin-RELEASE_TYPE-SLUG_TAG' \
    'authors: [bluefin-release-bot]' \
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
sed -i "s|RELEASE_TAG|$RELEASE_TAG|g" "$CHANGELOG_FILE"
sed -i "s|RELEASE_URL|$RELEASE_URL|g" "$CHANGELOG_FILE"
sed -i "s/FORMATTED_DATE/$FORMATTED_DATE/g" "$CHANGELOG_FILE"
sed -i "s|SOURCE_REPO|$SOURCE_REPO|g" "$CHANGELOG_FILE"

# Insert the release body content
sed -i "/RELEASE_BODY_CONTENT/r /tmp/release_body_single.md" "$CHANGELOG_FILE"
sed -i "/RELEASE_BODY_CONTENT/d" "$CHANGELOG_FILE"

echo "Successfully created changelog file: $CHANGELOG_FILE"
echo "Release type: $RELEASE_TYPE"
echo "Generated filename: $FILENAME"

exit 0