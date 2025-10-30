#!/bin/bash
set -e

# Function to fetch release tags from GitHub releases
fetch_images() {
    local repo=$1
    local tag_pattern=$2
    local limit=$3
    
    # Fetch releases from GitHub API (public, no auth needed)
    curl -s "https://api.github.com/repos/ublue-os/${repo}/releases?per_page=100" \
        | jq -r '.[].tag_name' \
        | grep -E "^${tag_pattern}" \
        | head -n "$limit"
}

# Function to get release date
get_release_date() {
    local repo=$1
    local tag=$2
    
    curl -s "https://api.github.com/repos/ublue-os/${repo}/releases/tags/${tag}" \
        | jq -r '.published_at' \
        | cut -d'T' -f1
}

# Function to format image data as markdown table rows
format_table_rows() {
    local repo=$1
    local package=$2
    local tags=$3
    
    while IFS= read -r tag; do
        [ -z "$tag" ] && continue
        
        # Get release date
        formatted_date=$(get_release_date "$repo" "$tag")
        
        # Create package URL - point to GHCR package page
        package_url="https://github.com/ublue-os/${repo}/pkgs/container/${package}"
        
        # Output markdown row
        echo "| \`${tag}\` | ${formatted_date} | [View Package](${package_url}) |"
    done <<< "$tags"
}

# Temporary file for the new content
temp_file=$(mktemp)

# Fetch images for each release type
echo "Fetching stable images..."
stable_tags=$(fetch_images "bluefin" "stable" 10)
stable_images=$(format_table_rows "bluefin" "bluefin" "$stable_tags")

echo "Fetching GTS images..."
gts_tags=$(fetch_images "bluefin" "gts" 10)
gts_images=$(format_table_rows "bluefin" "bluefin" "$gts_tags")

echo "Fetching LTS images..."
lts_tags=$(fetch_images "bluefin-lts" "lts" 10)
lts_images=$(format_table_rows "bluefin-lts" "bluefin-lts" "$lts_tags")

# Get current timestamp
current_date=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

# Read the original file and replace sections
{
    while IFS= read -r line; do
        if [[ "$line" == *"<!-- STABLE_IMAGES_START -->"* ]]; then
            echo "$line"
            echo "$stable_images"
            # Skip until end marker
            while IFS= read -r line && [[ "$line" != *"<!-- STABLE_IMAGES_END -->"* ]]; do
                :
            done
            echo "$line"
        elif [[ "$line" == *"<!-- GTS_IMAGES_START -->"* ]]; then
            echo "$line"
            echo "$gts_images"
            while IFS= read -r line && [[ "$line" != *"<!-- GTS_IMAGES_END -->"* ]]; do
                :
            done
            echo "$line"
        elif [[ "$line" == *"<!-- LTS_IMAGES_START -->"* ]]; then
            echo "$line"
            echo "$lts_images"
            while IFS= read -r line && [[ "$line" != *"<!-- LTS_IMAGES_END -->"* ]]; do
                :
            done
            echo "$line"
        elif [[ "$line" == *"<!-- LAST_UPDATE -->"* ]]; then
            echo "*This page is automatically updated via GitHub Actions. Last updated: $current_date*"
            # Skip any trailing timestamps
            break
        else
            echo "$line"
        fi
    done < docs/images.md
} > "$temp_file"

# Replace the original file
mv "$temp_file" docs/images.md

echo "Images page updated successfully!"
