# Bluefin Docs

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ublue-os/bluefin-docs)

These docs are intentionally concise because Bluefin aims to stay out of the way. The goal is to give contributors and users a short, opinionated reference for the parts of the Bluefin experience that are unique to this project.

## Project overview

This repository contains the Docusaurus site for Project Bluefin documentation. It combines end-user docs, contributor-facing project guidance, release notes, and generated data that powers dynamic pages like downloads, changelogs, and version dashboards.

### What lives where

- `docs/` contains the main documentation pages, including installation, troubleshooting, downloads, contributor guidance, developer experience, and FAQ content.
- `blog/` contains release posts, announcements, status updates, and longer-form project storytelling.
- `static/` contains assets served as-is, plus generated JSON data consumed by the site.
- `scripts/` contains the fetch and generation scripts that build the data files used across the docs site.

### Content map

New contributors usually want one of these starting points:

- `docs/installation.md`, `docs/introduction.md`, and `docs/downloads.mdx` for core end-user onboarding content
- `docs/tips.mdx`, `docs/troubleshooting.mdx`, and `docs/FAQ.md` for support-oriented docs
- `docs/contributing.md`, `docs/devcontainers.md`, and `docs/local.md` for contributor and developer workflow docs
- `blog/` for release history, announcements, and project updates

## Guidelines

- Prefer linking upstream documentation with a short Bluefin-specific summary when the upstream project already owns the canonical docs.
- Use this repo for Bluefin-specific workflows, defaults, policy, release information, and project guidance.
- If something is undocumented, assume there may be a reason; check nearby docs and existing patterns before adding new content.

## Contributing to these docs

This site covers Bluefin-specific workflows, defaults, and project guidance. Generic GNOME, Fedora, or upstream-tooling documentation should usually stay upstream, with this site linking out and adding only the Bluefin-specific context contributors need.

- `docs/` contains the main documentation pages for users and contributors.
- `blog/` contains release posts, announcements, and longer-form updates.
- `static/` contains unprocessed assets like images and other files served as-is by Docusaurus.
- New docs pages should include Docusaurus frontmatter with at least `title` and `slug`; `sidebar_position` is recommended for pages that belong in a sidebar, for example:

```md
---
title: My Page
slug: /my-page
sidebar_position: 1
---
```

- For the broader Bluefin contribution workflow, start with [`docs/contributing.md`](docs/contributing.md).

## Previewing your changes

This project uses [`just`](https://just.systems) as a command runner for convenience.
Install it with `brew install just` or `cargo install just`.

- `just serve`: Fetch all remote data, then build and serve the documentation locally.
- `just dev`: Fast hot-reload dev server — skips data fetching (run `just serve` once first to populate the cache).
- `just build`: Full production build (also fetches data).

> **Note:** `just serve` and `npm run start` run data-fetch scripts that call the GitHub API.
> Set `GITHUB_TOKEN` (or `GH_TOKEN`) in your environment to avoid rate-limit errors:
> ```
> export GITHUB_TOKEN=ghp_your_token_here
> just serve
> ```
> A [fine-grained token](https://github.com/settings/tokens?type=beta) with read-only public repository access is sufficient.

<details>
<summary>Manual setup</summary>

You've made some changes and want to see how they look?

You can install node and run it:

```
npm install --legacy-peer-deps
npm run start
```

> **Note**: The `--legacy-peer-deps` flag is required due to peer dependency conflicts between React versions. If you encounter "Cannot find module" errors (like `xml2js`), make sure you're using this flag during installation.

</details>

Alternatively, you can run the container:

```
docker compose up
```

Then make sure to format all your files with Prettier!

```
npm run prettier
```

## Troubleshooting

### "Cannot find module 'xml2js'" error

If you encounter this error when running `npm run start`:

```
Error: Cannot find module 'xml2js'
```

This is typically caused by peer dependency conflicts during installation. To resolve:

1. Remove existing node_modules: `rm -rf node_modules`
2. Install with legacy peer deps: `npm install --legacy-peer-deps`
3. Try running the command again: `npm run start`

### Build Requirements

- Node.js 20+ (see `package.json` engines field)
- [`just`](https://just.systems) — `brew install just` or `cargo install just`
- `GITHUB_TOKEN` or `GH_TOKEN` env var for data-fetch scripts (GitHub API calls)
- This project uses npm for both local development and CI/CD builds
