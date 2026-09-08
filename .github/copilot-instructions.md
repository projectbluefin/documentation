# Copilot instructions

Read `AGENTS.md` first. It is the authoritative repository contract. Then use
`docs/SKILL.md` to load only the skill that matches the task.

## Project shape

This is a Docusaurus site. User-facing docs and blog pages are built with
React components under `src/`; build-time fetchers under `scripts/` populate
data consumed by dashboard and catalog components. Do not hand-edit generated
data under `static/data/`.

## Live pages and audits

- Audit an externally visible page from the live, cache-busted route and the
  matching `origin/main` source. A local branch or tracked seed is not
  evidence of the deployed state.
- For standalone docs UI, use `src/css/custom.css`, Infima variables, and
  established local components as the visual source of truth. Keep styling for
  external services isolated; it must not reshape the documentation site.
- If a task asks for a live, deployed, shipped, or merged result, completion
  requires the merge to `main`, a successful Pages deployment, and a
  cache-busted request to the requested route. A local commit, branch, or open
  pull request is not completion.

## Worktrees and validation

- Use a linked worktree for changes when the main checkout is not already
  isolated. In a new worktree, run `npm install --legacy-peer-deps` before
  broad checks: release-card tests resolve assets from that worktree's own
  `node_modules`.
- Use focused `node --test scripts/<name>.test.js` checks during development.
  Run `just check` before every commit. Use `npm run build:ci` to validate a
  build without refetching remote data.

## Learning capture

- Every completed engineering task updates the smallest relevant
  `docs/skills/` procedure when it yields a reusable lesson. If the lesson
  changes how an agent investigates, validates, designs, or ships work, update
  the applicable agent instructions in the same change. Neither update
  substitutes for the other.
