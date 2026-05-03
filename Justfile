default: dev

build:
    npm run build

# Fast local dev — skips fetch-data, assumes static/feeds and static/data are already present.
# Use this for hot-reload iteration. Run `just serve` once first to populate cached data.
dev:
    npx docusaurus start --host 0.0.0.0

# Full start: fetch all data then launch dev server.
serve:
    npm run start

# Fetch all remote data (feeds, images, SBOMs, contributors, etc.)
fetch-data:
    npm run fetch-data

# Fetch SBOM attestation cache only (fast, use after SBOM pipeline updates)
fetch-sbom:
    npm run fetch-sbom

# Fetch image catalog (images.json) from GHCR + SBOM cache
fetch-images:
    npm run fetch-github-images

# Force-refresh image catalog regardless of cache age
fetch-images-force:
    npm run fetch-github-images -- --force

# Run TypeScript type check
typecheck:
    npm run typecheck

# Run Playwright e2e tests against the local dev server (reuses existing if running)
test:
    npm run test:e2e
