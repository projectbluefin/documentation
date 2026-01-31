# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**

- TypeScript 5.9.2 - All React components, configuration, type definitions
- JavaScript (Node.js) - Build scripts and data fetching utilities

**Secondary:**

- MDX 3.0.0 - Documentation and blog content with embedded React components
- CSS - Custom styling in `src/css/custom.css`

## Runtime

**Environment:**

- Node.js >= 18.0 (specified in `package.json` engines field)

**Package Manager:**

- npm - Package manager (standard across development and CI/CD)

## Frameworks

**Core:**

- Docusaurus 3.8.1 - Static site generator framework
  - `@docusaurus/core` - Core functionality
  - `@docusaurus/preset-classic` - Classic preset with docs/blog/pages
  - `@docusaurus/theme-mermaid` - Mermaid diagram support
  - `@docusaurus/faster` - Performance optimizations
- React 19.0.0 - UI component library
- React DOM 19.0.0 - React renderer

**Testing:**

- Not detected - No test framework configured

**Build/Dev:**

- Docusaurus CLI - Build, serve, development server via `npm run start`
- Prettier 3.6.2 - Code formatting
- TypeScript Compiler 5.9.2 - Type checking (via `tsc`)
- Just - Optional command runner (`Justfile` with build/serve shortcuts)

## Key Dependencies

**Critical:**

- `@docusaurus/core` 3.8.1 - Core framework for site generation
- `react` 19.0.0 - Component rendering and UI
- `node-fetch` 3.3.2 - HTTP fetching in build scripts (for GitHub API, YouTube scraping)
- `xml2js` 0.6.2 - Parsing GitHub Atom feeds into JSON

**Infrastructure:**

- `@1password/docusaurus-plugin-stored-data` 1.0.0 - Fetches external data feeds (GitHub releases/discussions)
- `@easyops-cn/docusaurus-search-local` 0.52.0 - Local search plugin (note: Algolia also configured)
- `@giscus/react` 3.1.0 - GitHub Discussions-based comments integration
- `prism-react-renderer` 2.3.0 - Syntax highlighting in code blocks
- `clsx` 2.0.0 - CSS class name utility
- `caniuse-lite` 1.0.30001727 - Browser compatibility data

**DevDependencies:**

- `@docusaurus/module-type-aliases` 3.8.1 - TypeScript type definitions for Docusaurus modules
- `@docusaurus/tsconfig` 3.8.1 - Base TypeScript configuration
- `@docusaurus/types` 3.8.1 - TypeScript types for Docusaurus

## Configuration

**Environment:**

- No `.env` files used in local development
- Environment variables via CI/CD:
  - `GITHUB_TOKEN` or `GH_TOKEN` - Optional for GitHub API rate limit increases (used in `scripts/fetch-github-profiles.js`, `scripts/fetch-github-repos.js`, `scripts/fetch-contributors.js`)
  - `PROJECT_READ_TOKEN` - Used in CI/CD pipeline for authenticated GitHub API access
- Configuration centralized in `docusaurus.config.ts`

**Build:**

- `docusaurus.config.ts` - Main Docusaurus configuration
- `tsconfig.json` - TypeScript compiler options (extends `@docusaurus/tsconfig`)
- `sidebars.ts` - Documentation navigation structure
- `package.json` - Scripts, dependencies, engines
- `docker-compose.yml` - Containerized development environment
- `Justfile` - Just command runner recipes (build/serve shortcuts)
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow

## Platform Requirements

**Development:**

- Node.js >= 18.0
- npm - Package manager
- Optional: Docker for containerized development
- Optional: Just command runner

**Production:**

- GitHub Pages - Static site hosting (deployed via GitHub Actions)
- Target URL: https://docs.projectbluefin.io
- Build generates static HTML/CSS/JS to `build/` directory
- No server-side runtime required (SSG only)

**Browserslist:**

- Production: `>0.5%, not dead, not op_mini all`
- Development: `last 3 chrome version, last 3 firefox version, last 5 safari version`

---

_Stack analysis: 2026-01-26_
