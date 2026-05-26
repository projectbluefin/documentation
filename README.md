# Bluefin Docs

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ublue-os/bluefin-docs)

These docs are pretty sparse on purpose as Bluefin's intended to be invisible. Ideally the docs should be able to be consumed in one sitting.

## Guidelines

- Docs linking to upstream documentation directly with a short summary is preferred.
- There's likely a reason why something is undocumented.

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
