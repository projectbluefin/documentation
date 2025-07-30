# Changelogs

This directory contains changelog blog posts for the Universal Blue organization and related projects.

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

## Guidelines

- Keep changelog entries factual and concise
- Use consistent formatting across posts
- Include relevant tags for better categorization
- Link to relevant GitHub issues/PRs when applicable
- Follow semantic versioning principles when applicable