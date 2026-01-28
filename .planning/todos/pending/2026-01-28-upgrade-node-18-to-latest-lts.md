---
created: 2026-01-28T01:03
title: Upgrade Node.js from 18 to latest LTS version
area: tooling
files:
  - package.json:9-10
  - .github/workflows/monthly-reports.yml:31
  - .github/workflows/pages.yml
  - .github/workflows/update-driver-versions.yml
---

## Problem

Node.js 18 has reached End of Life (EOL) as of April 2025. The project currently specifies:

- `package.json` engines: `"node": ">=18.0"`
- Monthly reports workflow: `node-version: "18"`
- Other workflows mix Node 20 and "latest"

Continuing to use EOL Node versions creates security and compatibility risks:

- No security patches for vulnerabilities
- Incompatibility with newer dependencies
- CI/CD failures as actions drop Node 18 support
- Package managers may deprecate Node 18 in their own tooling

The inconsistency across workflows (18 in monthly-reports, 20 in pages/driver-versions, latest in renovate) suggests the upgrade was partially done but not completed.

## Solution

**Recommended:** Upgrade to Node.js 22 LTS (Active LTS as of October 2024, supported until April 2027)

**Upgrade Plan:**

1. **Update Configuration Files:**
   - `package.json`: Change engines to `"node": ">=22.0"`
   - `.github/workflows/monthly-reports.yml`: Change to `node-version: "22"`
   - Standardize all workflows to use Node 22

2. **Test Locally:**
   - Switch to Node 22: `nvm use 22` or equivalent
   - Clear node_modules: `rm -rf node_modules package-lock.json`
   - Reinstall: `npm install --legacy-peer-deps`
   - Run validation suite:
     - `npm run typecheck`
     - `npm run prettier-lint`
     - `npm run build`
     - `npm run generate-report -- --month=2026-01`
   - Test dev server: `npm start`

3. **Verify All Workflows:**
   - Trigger each workflow manually via GitHub Actions
   - Verify monthly reports generation still works
   - Check driver versions update workflow
   - Validate pages deployment

4. **Update Documentation:**
   - `AGENTS.md`: Update Node version references (currently mentions 18.x)
   - `.planning/STATE.md`: Update technical notes section
   - Update any installation docs

5. **Commit Strategy:**
   - Single atomic commit with all version bumps
   - Test in CI before merging
   - Monitor first production build after merge

**Risk Assessment:**

- Low risk: Node 22 is LTS and Docusaurus 3.8.1 supports it
- Potential issues: Dependency peer warnings (already using --legacy-peer-deps)
- Mitigation: Full test suite before commit

**Alternative:** Node 20 LTS (Maintenance mode, supported until April 2026)

- Safer short-term option if Node 22 causes issues
- Would require another upgrade in ~12 months

**References:**

- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Docusaurus system requirements: https://docusaurus.io/docs/installation#requirements
