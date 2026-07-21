# Bluefin Docs

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ublue-os/bluefin-docs)

These docs are intentionally concise because Bluefin aims to stay out of the way. The goal is to give contributors and users a short, opinionated reference for the parts of the Bluefin experience that are unique to this project.

## Prerequisites

- **Node.js 20+** — see `package.json` `engines` field (`node >=20` is required)
- **[`just`](https://just.systems)** — `brew install just` or `cargo install just`
- **`GITHUB_TOKEN` or `GH_TOKEN`** — required for data-fetch scripts that call the GitHub API (a [fine-grained token](https://github.com/settings/tokens?type=beta) with read-only public repo access is sufficient)

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
>
> ```
> export GITHUB_TOKEN=ghp_your_token_here
> just serve
> ```
>
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

## CountMe worker operations

The documentation repo also hosts the public CountMe endpoint at `https://countme.projectbluefin.io/`.
This service is a small Cloudflare Worker that serves CountMe chart images and accepts telemetry pings for Dakota.

### What the worker does

- Serves CountMe chart SVGs for the root host and a few compatibility paths.
- Accepts `/metalink` GET requests from telemetry clients.
- Returns a placeholder SVG when the Project Bluefin chart artifact is not yet available from `projectbluefin/countme`.

### Source files

- `workers/countme-proxy/index.mjs` — Worker implementation
- `wrangler.countme.toml` — Wrangler config and route binding
- `scripts/countme-worker.test.js` — regression tests for the worker behavior

### Deployment model

The worker is deployed as a Cloudflare Worker behind the `countme.projectbluefin.io` hostname.
Deployment is done with Wrangler from this repo:

```bash
cd /var/home/jorge/src/documentation
npx wrangler deploy --config wrangler.countme.toml
```

The worker is attached to the `projectbluefin.io` zone via the route configured in `wrangler.countme.toml`.

### Operational flow for future agents

1. Make code changes in `workers/countme-proxy/index.mjs`.
2. Add or update coverage in `scripts/countme-worker.test.js`.
3. Run the focused checks:

```bash
cd /var/home/jorge/src/documentation
node --test scripts/countme-worker.test.js
npx eslint workers/countme-proxy/index.mjs scripts/countme-worker.test.js
```

4. Deploy the worker:

```bash
cd /var/home/jorge/src/documentation
npx wrangler deploy --config wrangler.countme.toml
```

5. Smoke-test the live service:

```bash
curl -i 'https://countme.projectbluefin.io/metalink?repo=dakota&tag=latest&flavor=default&arch=x86_64&countme=3'
curl -i 'https://countme.projectbluefin.io/growth.svg'
curl -i 'https://countme.projectbluefin.io/'
```

### Security and maintenance posture

This service is intentionally lightweight and public-facing.
Current characteristics:

- No secrets, database, or authentication layer.
- No private user data is processed.
- Only `GET` and `HEAD` methods are accepted for the public endpoints.
- The worker fetches public upstream SVGs from GitHub raw URLs and returns a brief placeholder SVG when the Project Bluefin artifact is not yet available.
- Cloudflare TLS and route protection provide the baseline edge security; the worker itself is not currently protected by API auth or per-client access controls.

Maintenance expectations:

- Keep the worker logic simple and dependency-light.
- Prefer updating the upstream source mapping and fallback behavior in the repo over making dashboard-only changes.
- Re-run tests before every deployment.
- If the upstream artifact becomes available from `projectbluefin/countme`, update the worker to prefer it for the root-hosted chart routes.
- If operational abuse or telemetry misuse appears, add rate limiting and request validation before expanding the endpoint surface.

### Update policy

- The source of truth is the repository, not the Cloudflare dashboard.
- Any change to behavior, route mapping, fallback content, or telemetry handling should be made in the repo and deployed with Wrangler.
- Rollbacks should be handled by redeploying an earlier known-good worker version from the repo or from Wrangler deployment history.

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
