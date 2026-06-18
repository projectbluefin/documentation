# Bluefin Documentation — Agent Instructions

**Deployed at:** https://docs.projectbluefin.io/  
**Framework:** Docusaurus 3.10.x (TypeScript), React 19, Node 24

## Quick Start

```bash
npm install
npm run start          # dev server at http://localhost:3000/ (fetches data, hot-reload)
npm run build          # full production build
npm run typecheck      # TypeScript check
npm run lint           # ESLint
```

## Git Workflow

**Never push directly to main.** Work on a topic branch:
```bash
git checkout -b <type>/<short-description>
git commit -m "type(scope): description"
git push -u origin <type>/<short-description>
# Then open a PR — do not merge
```

Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `ci`, `chore`

### Attribution footer (required in every commit)

```
Assisted-by: [Model] via [Tool]
```

## Validation Gates

| Check | Command | Blocking? |
|---|---|---|
| TypeScript | `npm run typecheck` | YES |
| ESLint | `npm run lint` | YES |
| Prettier | `npm run prettier-lint` | No (warnings only) |
| Build | `npm run build` | YES |

## Data Pipeline

Data is fetched by `npm run fetch-data` which chains: `fetch-images` → `fetch-docs` → `fetch-contributors` → `generate-report`. This runs automatically before `npm run build` and `npm run start`.

## Known Issues

- **SBOM files are load-bearing**: `static/data/sbom-attestations.json` and `static/data/sbom-attestations-frontend.json` are committed to git (via gitignore exceptions). Required at build time — do not remove or rename.
- **cosign/oras not in standard build env**: don't add `fetch-sbom` to the `fetch-data` chain. It's handled by the nightly `update-sbom-cache.yml` workflow only.
- **`npm install` may need `--legacy-peer-deps`** due to React 19 peer dependencies.

## Troubleshooting quick fixes

| Symptom | Fix |
|---|---|
| Build fails on missing `sbom-attestations.json` | `git checkout HEAD -- static/data/sbom-attestations.json static/data/sbom-attestations-frontend.json` |
| TypeScript deprecation on `baseUrl` | Already handled — `tsconfig.json` has `"ignoreDeprecations": "6.0"` |
| Post not visible after merge | `grep -r "draft: true" blog/` — remove the line and push a fix PR |
| Blog PR breaks build | Run `git diff upstream/main --name-only` on worktree; copy ALL `src/`, `scripts/`, `static/` files, not just MDX |
