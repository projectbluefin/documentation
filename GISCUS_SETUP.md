# Giscus Comments Setup

This documentation site uses [Giscus](https://giscus.app/) for blog post comments, powered by GitHub Discussions.

## Configuration

- **Repository**: `ublue-os/bluefin`
- **Category**: Discussions
- **Mapping**: pathname (comments are linked to the blog post URL)
- **Theme**: Automatically switches between light/dark based on site theme

## How it works

1. Comments are stored as GitHub Discussions in the `Blog Comments` category
2. Each blog post gets its own discussion thread
3. Users need a GitHub account to comment
4. The component automatically adjusts theme based on user preference

## Implementation

### Component Location
- `src/components/GiscusComments/index.tsx` - Main Giscus component
- `src/theme/BlogPostPage/index.tsx` - Swizzled theme to inject comments

### Disabling Comments

To disable comments on a specific blog post, add to frontmatter:

```yaml
---
title: My Blog Post
hide_comments: true
---
```

## Maintenance

The Giscus configuration uses:
- **repoId**: `R_kgDOJHEu4g`
- **categoryId**: `DIC_kwDOJHEu4s4CtFFL`

If the repository or category changes, update these values in:
`src/components/GiscusComments/index.tsx`

You can get new IDs from https://giscus.app/ by entering the repository details.

## Permissions Required

For users to create discussions from blog posts:
1. GitHub account required
2. Must have public repository access (public repo)
3. Giscus app must be installed on the repository with Discussions enabled
4. Users need read access to the repository to post comments
