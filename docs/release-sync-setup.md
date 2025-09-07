# Release Sync Setup Guide

This document explains how to set up automatic release syncing from `ublue-os/bluefin` to the changelogs in `ublue-os/bluefin-docs`.

## Available Workflow

The `ublue-os/bluefin-docs` repository contains a simplified GitHub Action workflow for syncing releases:

**Release Sync** (`sync-bluefin-releases.yml`) - Automatically syncs releases from Bluefin repositories with auto-merge support

## Triggering Methods

### Bluefin Release Sync (sync-bluefin-releases.yml)

This simplified workflow handles all release types and automatically enables auto-merge for created pull requests.

#### Method 1: Manual Triggering

1. Go to the [GitHub Actions tab](https://github.com/ublue-os/bluefin-docs/actions/workflows/sync-bluefin-releases.yml)
2. Click "Run workflow"
3. Click "Run workflow" to execute

The workflow will:

- Fetch the latest stable release (tagged with 'stable') from `ublue-os/bluefin`
- Fetch the latest GTS release (tagged with 'gts') from `ublue-os/bluefin`
- Fetch the latest LTS release from `ublue-os/bluefin-lts`
- Generate changelog entries for any new releases
- Create a pull request with auto-merge enabled
- Skip existing files to avoid duplicates

#### Method 2: Scheduled Runs

The workflow runs automatically daily at 6am US Eastern Time (10:00 UTC) to check for new releases.

#### Method 3: Automated Triggering (Repository Dispatch)

For real-time automation when releases are published, you can set up repository dispatch events from the `ublue-os/bluefin` repository.

#### Setup for Repository Dispatch (Optional)

To enable automatic triggering when releases are published in `ublue-os/bluefin`, add a workflow to the `ublue-os/bluefin` repository:

Create `.github/workflows/notify-docs-release.yml`:

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

**Required Secret:**

You'll need to create a Personal Access Token (PAT) with `repo` scope and add it as a secret named `DOCS_REPO_TOKEN` in the `ublue-os/bluefin` repository settings.

## Auto-merge Feature

The simplified workflow automatically enables auto-merge on created pull requests, which means:

- Pull requests will automatically merge when all status checks pass
- No manual intervention required for standard changelog updates
- Reduces maintenance overhead for release syncing

## File Format

Generated changelogs entries follow this format:

- **Filename**: `YYYY-MM-DD-releaseversion.md`
- **Location**: `changelogs/` directory
- **Content**: Full release notes with proper Docusaurus frontmatter

## Release Types

The workflow handles multiple types of releases automatically:

- **🚢 Stable**: Tags containing "stable" (e.g., `stable-20250803.2`) - Tagged as `stable`
- **⭐ GTS**: Tags containing "gts" (e.g., `gts-20250801`) - Tagged as `gts`
- **🔒 LTS**: From the `ublue-os/bluefin-lts` repository (e.g., `lts-20250602`) - Tagged as `lts`

The workflow automatically fetches and processes the latest stable, latest GTS, and latest LTS releases in a single execution.

## Troubleshooting

### Common Issues:

1. **Release not found**: Ensure the release tag exists in the respective repository
2. **File already exists**: The workflow skips creation if a file already exists with the same name
3. **Auto-merge not working**: Check repository settings to ensure auto-merge is enabled

### Workflow Benefits:

- **Simplified**: Reduced from 615 lines to 168 lines (73% reduction)
- **Reliable**: Uses established GitHub Actions instead of complex custom logic
- **Auto-merge**: Proper auto-merge functionality using GitHub CLI
- **Maintainable**: Easier to debug and modify

## Testing

The workflow can be tested safely by using the manual trigger method. It will:
- Only create changelog files for releases that don't already have them
- Show clear output about what was processed vs. skipped
- Create pull requests with auto-merge enabled that can be reviewed

## Recommendations

- Use the simplified workflow for all release syncing needs
- Enable repository dispatch for real-time automation
- Review generated pull requests for accuracy before they auto-merge
- Check the GitHub Actions logs for detailed processing information
