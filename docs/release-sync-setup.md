# Release Sync Setup Guide

This document explains how to set up automatic release syncing from `ublue-os/bluefin` to the changelogs in `ublue-os/bluefin-docs`.

## Available Workflows

The `ublue-os/bluefin-docs` repository contains two GitHub Action workflows for syncing releases:

1. **Single Release Sync** (`sync-bluefin-releases.yml`) - Syncs one release at a time
2. **Multiple Release Sync** (`sync-multiple-bluefin-releases.yml`) - Syncs multiple releases in a single operation

## Triggering Methods

### Single Release Sync (sync-bluefin-releases.yml)

#### Method 1: Manual Triggering (Available Now)

1. Go to the [GitHub Actions tab](https://github.com/ublue-os/bluefin-docs/actions/workflows/sync-bluefin-releases.yml)
2. Click "Run workflow"
3. Click "Run workflow" to execute

The workflow will:

- Fetch all releases from the `ublue-os/bluefin` repository
- Automatically identify and process the latest stable release (tagged with 'stable')
- Automatically identify and process the latest GTS release (tagged with 'gts')
- Also process the latest LTS release from `ublue-os/bluefin-lts` repository
- Generate properly formatted changelog entries for each release type
- Create a pull request with all new changelog entries
- Skip existing files to avoid duplicates

#### Method 2: Automated Triggering (Requires Setup)

To enable automatic triggering when releases are published in `ublue-os/bluefin`, you need to add a workflow to the `ublue-os/bluefin` repository that sends a repository dispatch event.

### Multiple Release Sync (sync-multiple-bluefin-releases.yml)

This workflow allows you to sync multiple releases at once, which is useful for:

- Initial setup or backfilling changelogs
- Syncing multiple releases that were missed
- Bulk operations

#### Manual Triggering:

1. Go to the [GitHub Actions tab](https://github.com/ublue-os/bluefin-docs/actions/workflows/sync-multiple-bluefin-releases.yml)
2. Click "Run workflow"
3. Optionally specify the number of releases to fetch (default: 3)
4. Click "Run workflow"

The workflow will:

- Fetch the last N releases from `ublue-os/bluefin` (configurable, default 3)
- Sort releases by published date (oldest first)
- Process each release and determine type (gts/stable/other)
- Create changelogs entries for all new releases
- Skip existing changelogs files to avoid duplicates
- Create a single pull request with all new changelogs entries

#### Configuration Options:

- **release_count**: Number of releases to fetch and process (default: 3, can be adjusted as needed)

#### Setup in ublue-os/bluefin:

Create a workflow file `.github/workflows/notify-docs-release.yml`:

```yaml
name: Notify Docs of Release

on:
  release:
    types: [published]

jobs:
  notify-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Notify bluefin-docs repository
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.DOCS_REPO_TOKEN }}
          repository: ublue-os/bluefin-docs
          event-type: bluefin-release
          client-payload: |
            {
              "tag_name": "${{ github.event.release.tag_name }}",
              "html_url": "${{ github.event.release.html_url }}"
            }
```

#### Required Secret:

You'll need to create a Personal Access Token (PAT) with `repo` scope and add it as a secret named `DOCS_REPO_TOKEN` in the `ublue-os/bluefin` repository settings.

## File Format

Generated changelogs entries follow this format:

- **Filename**: `YYYY-MM-DD-releaseversion.md`
- **Location**: `changelogs/` directory
- **Content**: Full release notes with proper Docusaurus frontmatter

## Release Types

The workflows handle multiple types of releases automatically:

- **Stable releases**: Tags containing "stable" (e.g., `stable-20250803.2`) - Tagged as `stable`
- **GTS releases**: Tags containing "gts" (e.g., `gts-20250801`) - Tagged as `gts`  
- **LTS releases**: From the `ublue-os/bluefin-lts` repository (e.g., `lts-20250602`) - Tagged as `lts`
- **Other releases**: Beta, alpha, RC, and development releases - Tagged as `other`

The main sync workflow now automatically fetches and processes both the latest stable and latest GTS releases in a single execution, ensuring both release types are kept up to date.

## Troubleshooting

### Common Issues:

1. **Release not found**: Ensure the release tag exists in `ublue-os/bluefin`
2. **File already exists**: Both workflows skip creation if a file already exists with the same name
3. **API rate limits**: If testing frequently, GitHub API rate limits may apply
4. **No changes in multi-release sync**: All requested releases may already have changelogs entries

### Multiple Release Sync Specific:

- **No files created**: This happens when all fetched releases already have changelogs entries
- **Partial creation**: Some releases may be skipped if their changelogs files already exist
- **Release count adjustment**: Increase the `release_count` parameter if you need to fetch more releases

### Logs:

Check the GitHub Actions logs for detailed information about each step of the process.

## Testing

Both workflows can be tested safely:

- **Single release**: Use the manual trigger method with any existing release tag from `ublue-os/bluefin`
- **Multiple releases**: Use the manual trigger with a small release count (e.g., 1-3) to test the functionality

## Recommendations

- Use **single release sync** for real-time automation when releases are published
- Use **multiple release sync** for initial setup, backfilling, or catching up on missed releases
- Always review the generated pull requests before merging to ensure content accuracy
