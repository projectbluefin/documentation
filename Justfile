default: dev

build:
    npm run build

# Fast local dev — skips fetch-data, assumes static/feeds and static/data are already present.
# Use this for hot-reload iteration. Run `just serve` once first to populate cached data.
dev:
    npx docusaurus start --host 0.0.0.0

serve:
    npm run start
