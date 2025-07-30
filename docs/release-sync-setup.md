# Release Sync Setup Guide

This document explains how to set up automatic release syncing from `ublue-os/bluefin` to the changelog in `ublue-os/bluefin-docs`.

## Current Setup

The `ublue-os/bluefin-docs` repository contains a GitHub Action workflow (`sync-bluefin-releases.yml`) that can automatically create changelog entries when releases are published in the `ublue-os/bluefin` repository.

## Triggering Methods

### Method 1: Manual Triggering (Available Now)

1. Go to the [GitHub Actions tab](https://github.com/ublue-os/bluefin-docs/actions/workflows/sync-bluefin-releases.yml)
2. Click "Run workflow"
3. Enter the release tag (e.g., `v1.2.3` or `gts-v1.2.3`)
4. Optionally provide a custom release URL
5. Click "Run workflow"

The workflow will:

- Fetch the release data from the GitHub API
- Determine if it's a GTS or stable release
- Generate a properly formatted changelog entry
- Commit the file to the repository

### Method 2: Automated Triggering (Requires Setup)

To enable automatic triggering when releases are published in `ublue-os/bluefin`, you need to add a workflow to the `ublue-os/bluefin` repository that sends a repository dispatch event.

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

Generated changelog entries follow this format:

- **Filename**: `YYYY-MM-DD-releaseversion.md`
- **Location**: `changelog/` directory
- **Content**: Full release notes with proper Docusaurus frontmatter

## Release Types

- **Stable releases**: Tags without "gts" (e.g., `v1.2.3`)
- **GTS releases**: Tags with "gts" prefix (e.g., `gts-v1.2.3`)

Both types are automatically categorized with appropriate tags for filtering.

## Troubleshooting

### Common Issues:

1. **Release not found**: Ensure the release tag exists in `ublue-os/bluefin`
2. **File already exists**: The workflow skips creation if a file already exists with the same name
3. **API rate limits**: If testing frequently, GitHub API rate limits may apply

### Logs:

Check the GitHub Actions logs for detailed information about each step of the process.

## Testing

The workflow can be tested safely using the manual trigger method with any existing release tag from the `ublue-os/bluefin` repository.
