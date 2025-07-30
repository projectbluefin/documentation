# Changelogs

This directory contains changelog blog posts for the Universal Blue organization and related projects.

## Automated Release Sync

The changelog section automatically syncs releases from `ublue-os/bluefin` using a GitHub Action workflow. When a new release is published in the Bluefin repository, a changelog entry is automatically created here.

### How It Works

1. **Trigger**: The workflow can be triggered in two ways:
   - **Repository Dispatch**: Automatically when configured to receive webhook events from `ublue-os/bluefin`
   - **Manual Dispatch**: Manually through the GitHub Actions interface (automatically uses the latest release)

2. **Processing**: The workflow:
   - For manual triggers: Automatically fetches the latest release from the GitHub API
   - For repository dispatch: Uses the release data from the webhook payload
   - Determines if it's a GTS or stable release based on the tag format
   - Generates a properly formatted changelog entry
   - Creates a file with the naming convention: `YYYY-MM-DD-releaseversion.md`

3. **Content**: Each automated entry includes:
   - Proper frontmatter with title, authors, and tags
   - Full release notes from the source release
   - Release metadata (type, date, links)
   - Consistent formatting for the blog system

### Release Types

- **Stable Releases**: Tagged without "gts" prefix (e.g., `v1.2.3`)
- **GTS Releases**: Tagged with "gts" prefix (e.g., `gts-v1.2.3`)

Both types are automatically categorized with appropriate tags for filtering.

### Manual Triggering

To manually sync the latest release:

1. Go to the [Actions tab](https://github.com/ublue-os/bluefin-docs/actions/workflows/sync-bluefin-releases.yml)
2. Click "Run workflow"
3. Click "Run workflow" (no input required - automatically uses the latest release)

The workflow will automatically fetch and sync the latest release from the ublue-os/bluefin repository.

## Contributing

To add a new changelog entry:

1. Create a new Markdown file following the naming convention: `YYYY-MM-DD-title.md`
2. Include appropriate front matter with title, date, and authors
3. Use the `<!--truncate-->` marker to define the summary that appears on the changelog list page

## Example Post Structure

```markdown
---
title: "Project Name v1.2.3 Release"
authors: [username]
tags: [release, project-name]
---

Brief summary of the release.

<!--truncate-->

Detailed changelog content...

## What's New

- Feature 1
- Feature 2

## Bug Fixes

- Fix 1
- Fix 2

## Breaking Changes

- Change 1
```

## Authors

Authors should be defined in the `authors.yaml` file in this directory. You can reference them by their key in the front matter.

The automated release sync uses the `bluefin-release-bot` author entry.

## Guidelines

- Keep changelog entries factual and concise
- Use consistent formatting across posts
- Include relevant tags for better categorization
- Link to relevant GitHub issues/PRs when applicable
- Follow semantic versioning principles when applicable
- Automated entries should not be manually edited unless necessary
