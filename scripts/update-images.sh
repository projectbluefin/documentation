#!/bin/bash
set -e

# Enable more verbose error reporting
set -o pipefail

# Check for GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Warning: GITHUB_TOKEN not set. API requests may be rate limited."
    AUTH_HEADER=""
else
    AUTH_HEADER="Authorization: Bearer $GITHUB_TOKEN"
fi

# Function to fetch package versions from GitHub Packages API
fetch_images() {
    local org=$1
    local package=$2
    local tag_pattern=$3
    local limit=$4
    
    # Fetch package versions from GitHub Packages API with authentication
    # This queries GHCR (ghcr.io) properly through the Packages API
    local url="https://api.github.com/orgs/${org}/packages/container/${package}/versions?per_page=100"
    
    local response
    if [ -n "$AUTH_HEADER" ]; then
        response=$(curl -s -H "$AUTH_HEADER" -H "Accept: application/vnd.github+json" "$url")
    else
        response=$(curl -s -H "Accept: application/vnd.github+json" "$url")
    fi
    
    # Validate response is valid JSON array
    if ! echo "$response" | jq -e 'if type == "array" then true else false end' > /dev/null 2>&1; then
        echo "Error: Invalid API response for ${package}" >&2
        return 1
    fi
    
    echo "$response" | jq -r --arg pattern "^${tag_pattern}" '
        [.[] | 
         select(.metadata.container.tags[] | test($pattern)) |
         {
             id: .id,
             tag: ([.metadata.container.tags[] | select(test($pattern))][0]),
             all_tags: .metadata.container.tags,
             created_at: .created_at
         }
        ] | 
        sort_by(.created_at) | 
        reverse | 
        .[:'"$limit"'][]'
}

# Function to format image data as markdown table rows
format_table_rows() {
    local repo=$1
    local package=$2
    local version_data=$3
    
    # Output table header first
    echo "| Image Name | Publication Date | Package Link |"
    echo "| ---------- | ---------------- | ------------ |"
    
    # Then output the data rows
    echo "$version_data" | jq -r --arg repo "$repo" --arg pkg "$package" '
        select(.tag != null) | 
        
        # Build labels for special tags
        (
            if (.all_tags | contains(["latest"])) then " 🏷️ **latest**" else "" end +
            if (.all_tags | index("stable") != null) then " 🏷️ **stable**" else "" end +
            if (.all_tags | contains(["stable-daily"])) then " 🏷️ **stable-daily**" else "" end +
            if (.all_tags | index("lts") != null) then " 🏷️ **lts**" else "" end
        ) as $labels |
        
        "| `\(.tag)`\($labels) | \(.created_at | split("T")[0]) | [View Package](https://github.com/ublue-os/\($repo)/pkgs/container/\($pkg)/\(.id)?tag=\(.tag)) |"
    '
}

# Temporary file for the new content
temp_file=$(mktemp)

# Fetch images for each release type (15 images each, sorted newest first)
echo "Fetching stable images..."
stable_data=$(fetch_images "ublue-os" "bluefin" "stable-[0-9]" 15)
stable_images=$(format_table_rows "bluefin" "bluefin" "$stable_data")

echo "Fetching stable-daily images..."
stable_daily_data=$(fetch_images "ublue-os" "bluefin" "stable-daily" 15)
stable_daily_images=$(format_table_rows "bluefin" "bluefin" "$stable_daily_data")

echo "Fetching GTS images..."
gts_data=$(fetch_images "ublue-os" "bluefin" "gts" 15)
gts_images=$(format_table_rows "bluefin" "bluefin" "$gts_data")

echo "Fetching LTS images..."
if lts_data=$(fetch_images "ublue-os" "bluefin-lts" "lts" 15); then
    lts_images=$(format_table_rows "bluefin-lts" "bluefin-lts" "$lts_data")
else
    echo "Warning: Failed to fetch LTS images, skipping..."
    lts_images=""
fi

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
        elif [[ "$line" == *"<!-- STABLE_DAILY_IMAGES_START -->"* ]]; then
            echo "$line"
            echo "$stable_daily_images"
            while IFS= read -r line && [[ "$line" != *"<!-- STABLE_DAILY_IMAGES_END -->"* ]]; do
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
            echo "$line"
            echo ""
            echo "_This page is automatically updated via GitHub Actions. Last updated: ${current_date}_"
            # Skip any trailing content
            break
        else
            echo "$line"
        fi
    done < docs/images.md
} > "$temp_file"

# Replace the original file
mv "$temp_file" docs/images.md

echo "Images page updated successfully!"
