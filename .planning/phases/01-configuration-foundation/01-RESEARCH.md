# Phase 1: Configuration Foundation - Research

**Researched:** 2026-01-26
**Domain:** npm dependency management, Docusaurus configuration, TypeScript setup
**Confidence:** HIGH

## Summary

This phase focuses on resolving React 19 peer dependency conflicts and establishing a stable TypeScript/Docusaurus configuration foundation. The primary challenge is that Docusaurus 3.8.1 ships with peerDependencies declaring React 18, while the project uses React 19.0.0. The npm overrides feature (available since npm 8.3.0, 2021) is the official solution for this type of peer dependency conflict.

Docusaurus 3.7.0 (January 2025) officially added React 19 support to the v3.x line, confirming that React 19 is fully compatible with Docusaurus 3.x. The issue is purely a peerDependencies declaration problem in transitional packages, not an actual incompatibility. npm overrides allows forcing specific React versions throughout the dependency tree, eliminating the need for the --legacy-peer-deps workaround.

The standard approach is: (1) add npm overrides to package.json, (2) ensure TypeScript extends @docusaurus/tsconfig, (3) audit and remove unused dependencies, (4) validate docusaurus.config.ts against Docusaurus 3.8.1+ best practices. This provides a clean, reproducible installation process without legacy flags.

**Primary recommendation:** Use npm overrides to force React 19 across all dependencies, validate TypeScript configuration extends @docusaurus/tsconfig, and remove unused dependencies.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library                    | Version | Purpose               | Why Standard                                             |
| -------------------------- | ------- | --------------------- | -------------------------------------------------------- |
| npm                        | 8.3+    | Package manager       | Required for overrides feature (npm 8.3.0+, March 2021)  |
| @docusaurus/core           | 3.8.1+  | Static site generator | Current project version with React 18/19 compatibility   |
| @docusaurus/preset-classic | 3.8.1+  | Docusaurus preset     | Bundled theme and plugins                                |
| React                      | 19.0+   | UI framework          | Latest stable, officially supported by Docusaurus 3.7.0+ |
| TypeScript                 | 5.9.2   | Type system           | Project standard, minimum 5.1 for Docusaurus 3           |

### Supporting

| Library                         | Version | Purpose                     | When to Use                            |
| ------------------------------- | ------- | --------------------------- | -------------------------------------- |
| @docusaurus/tsconfig            | 3.8.1+  | TypeScript base config      | Always (replaces @tsconfig/docusaurus) |
| @docusaurus/module-type-aliases | 3.8.1+  | TypeScript type definitions | Always for TypeScript projects         |
| @docusaurus/types               | 3.8.1+  | Docusaurus type definitions | Always for TypeScript projects         |

### Alternatives Considered

| Instead of    | Could Use               | Tradeoff                                                                                           |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| npm overrides | --legacy-peer-deps flag | Flag bypasses all peer dependency checks, masks real conflicts; overrides is surgical and explicit |
| npm overrides | yarn resolutions        | Yarn-specific, different syntax; overrides is npm-standard since 2021                              |
| npm overrides | pnpm overrides          | Different package manager; requires full migration to pnpm                                         |

**Installation:**

```bash
# Standard installation after adding overrides to package.json
npm install
```

## Architecture Patterns

### Recommended package.json Structure

```json
{
  "dependencies": {
    "@docusaurus/core": "3.8.1",
    "@docusaurus/preset-classic": "3.8.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@docusaurus/module-type-aliases": "3.8.1",
    "@docusaurus/tsconfig": "3.8.1",
    "@docusaurus/types": "3.8.1",
    "typescript": "5.9.2"
  },
  "overrides": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### Pattern 1: npm Overrides for Peer Dependencies

**What:** Force specific versions of packages throughout the dependency tree
**When to use:** When direct dependencies declare incompatible peerDependencies but actual code is compatible
**Example:**

```json
// Source: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides
{
  "overrides": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Key constraints:**

- Overrides only work in root package.json (not in dependencies)
- npm 8.3.0+ required (released March 2021)
- Must ensure actual compatibility (not just suppress warnings)
- Use `$dependency` syntax to reference direct dependency versions for consistency

### Pattern 2: TypeScript Configuration Extends

**What:** Extend official Docusaurus TypeScript config instead of custom config
**When to use:** Always for Docusaurus projects
**Example:**

```json
// Source: https://docusaurus.io/docs/typescript-support
{
  "extends": "@docusaurus/tsconfig",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

### Pattern 3: Docusaurus Config Validation

**What:** Validate config against current Docusaurus version capabilities
**When to use:** After major/minor version upgrades
**Key areas:**

- `future` flags (e.g., `experimental_faster`)
- Plugin configuration schema
- Theme configuration schema
- MDX configuration options

### Anti-Patterns to Avoid

- **Using --legacy-peer-deps permanently:** Masks real dependency conflicts, provides no granular control. Use overrides instead for surgical fixes.
- **Manually editing package-lock.json:** Breaks reproducible builds, gets overwritten. Use overrides in package.json.
- **Skipping TypeScript validation:** `npm run typecheck` may show some tolerated errors, but still catches real issues.
- **Ignoring unused dependencies:** Increases bundle size and attack surface. Audit and remove.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                       | Don't Build                | Use Instead                               | Why                                                                                           |
| ----------------------------- | -------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Peer dependency resolution    | Custom dependency patching | npm overrides                             | Official npm feature since 8.3.0, predictable behavior, well-documented                       |
| TypeScript base configuration | Custom tsconfig            | @docusaurus/tsconfig                      | Maintained by Docusaurus team, versioned with core, ensures compatibility                     |
| Unused dependency detection   | Manual package.json review | npm-check, depcheck, or manual validation | Automated tools catch transitive deps, false positives possible so manual review still needed |
| Config file validation        | Manual testing             | Docusaurus CLI --validate flag            | Built-in validation catches schema errors before runtime                                      |

**Key insight:** npm overrides is the official, supported solution for this exact problem. Docusaurus 3.7.0 release notes explicitly confirm React 19 support. The "hack" is actually the standard approach.

## Common Pitfalls

### Pitfall 1: Assuming --legacy-peer-deps is Safer Than Overrides

**What goes wrong:** Developers use --legacy-peer-deps flag instead of overrides, thinking it's "safer" or "less invasive"
**Why it happens:** Fear of forcing versions, misunderstanding that overrides is the recommended approach
**How to avoid:**

- Understand that --legacy-peer-deps disables ALL peer dependency checking (not just one conflict)
- Overrides is surgical and explicit about what you're overriding
- Docusaurus 3.7.0 release notes confirm React 19 compatibility, making override safe
  **Warning signs:**
- Need to use --legacy-peer-deps on every npm command
- CI/CD scripts require --legacy-peer-deps flag
- Team members forget the flag and get errors

### Pitfall 2: Not Validating Actual Compatibility

**What goes wrong:** Adding overrides without verifying the forced version actually works
**Why it happens:** Overrides suppress warnings but don't guarantee runtime compatibility
**How to avoid:**

- Test critical workflows after adding overrides
- Check official release notes (Docusaurus 3.7.0 added React 19 support)
- Run full build and typecheck
- Test development server
  **Warning signs:**
- Runtime errors about React versions
- Hooks errors from multiple React copies
- Build succeeds but runtime fails

### Pitfall 3: Overriding Direct Dependencies

**What goes wrong:** Attempting to override packages you directly depend on, which npm rejects
**Why it happens:** Misunderstanding override rules
**How to avoid:**

- Overrides work on transitive dependencies (dependencies of dependencies)
- For direct dependencies, you override by updating the dependency itself
- Use `$dependency` syntax to reference your direct dependency version if needed
  **Warning signs:** npm error "You may not set an override for a package that you directly depend on"

### Pitfall 4: Forgetting to Commit package-lock.json

**What goes wrong:** After adding overrides, package-lock.json changes but isn't committed
**Why it happens:** Gitignore misconfiguration or forgetting lock files are important
**How to avoid:**

- Always commit package-lock.json (it's generated, but essential for reproducible builds)
- Verify package-lock.json contains your override
- CI should fail if package-lock.json is out of sync
  **Warning signs:**
- Other developers can't reproduce your successful install
- CI behaves differently than local

### Pitfall 5: TypeScript Configuration Not Extending @docusaurus/tsconfig

**What goes wrong:** Custom TypeScript configuration causes type errors or mismatches
**Why it happens:** Using outdated @tsconfig/docusaurus or custom config
**How to avoid:**

- Always extend @docusaurus/tsconfig (official package since Docusaurus 3.0)
- Remove old @tsconfig/docusaurus external package
- Verify extends path is correct
  **Warning signs:**
- TypeScript errors that don't make sense
- Type definitions not found
- Compilation errors on valid Docusaurus patterns

## Code Examples

Verified patterns from official sources:

### Adding npm Overrides

```json
// Source: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "overrides": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### TypeScript Configuration

```json
// Source: https://docusaurus.io/docs/typescript-support
{
  "extends": "@docusaurus/tsconfig",
  "compilerOptions": {
    "baseUrl": "."
  },
  "exclude": [".docusaurus", "build"]
}
```

### Docusaurus Config TypeScript

```typescript
// Source: https://docusaurus.io/docs/typescript-support
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Bluefin",
  tagline: "Bluefin Documentation",
  // ... rest of config
  presets: [
    [
      "classic",
      {
        /* Your preset config here */
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    /* Your theme config here */
  } satisfies Preset.ThemeConfig,
};

export default config;
```

### Dependency Audit Pattern

```bash
# Source: npm documentation + Docusaurus best practices
# Check for unused dependencies (manual validation required)
npm ls --all | grep "extraneous" # Lists packages not in package.json
npm prune # Removes extraneous packages from node_modules

# Verify all dependencies are used
# 1. Search for imports in codebase
# 2. Check if any deps are only in package.json but never imported
# 3. Validate all scripts still work after removal
```

## State of the Art

| Old Approach             | Current Approach                      | When Changed                    | Impact                                               |
| ------------------------ | ------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| --legacy-peer-deps flag  | npm overrides                         | npm 8.3.0 (March 2021)          | More explicit control, better error detection        |
| @tsconfig/docusaurus     | @docusaurus/tsconfig                  | Docusaurus 3.0 (October 2023)   | Official package, versioned with Docusaurus          |
| React 18 only            | React 18/19 dual support              | Docusaurus 3.7.0 (January 2025) | Enables React 19 features for sites that need them   |
| Manual dependency audits | Automated tools (npm-check, depcheck) | Ongoing                         | Faster detection, but manual validation still needed |

**Deprecated/outdated:**

- `--legacy-peer-deps` as permanent solution: Now an anti-pattern, use overrides instead
- `@tsconfig/docusaurus`: Replaced by `@docusaurus/tsconfig` in Docusaurus 3.0

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal timing for Docusaurus 3.9.2 upgrade**
   - What we know: Docusaurus 3.9.2 is latest stable (October 2025), has better React 19 support
   - What's unclear: Whether upgrade should be in this phase or deferred to phase 3
   - Recommendation: Stay on 3.8.1 for this phase to minimize variables; upgrade in phase 3 dedicated to that

2. **TypeScript errors tolerance threshold**
   - What we know: Some TypeScript errors are tolerated by Docusaurus build process
   - What's unclear: Which specific errors are acceptable vs. critical
   - Recommendation: Run `npm run typecheck` and document any errors; if build succeeds, errors are likely tolerated

3. **Exact unused dependencies list**
   - What we know: 21 dependencies to audit (16 deps + 5 devDeps)
   - What's unclear: Whether all are truly unused or some are indirect requirements
   - Recommendation: Use `npm ls <package>` to check if any packages depend on each candidate for removal

## Sources

### Primary (HIGH confidence)

- npm CLI v10 documentation - package.json overrides: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides
- Docusaurus TypeScript Support: https://docusaurus.io/docs/typescript-support
- Docusaurus Installation Guide: https://docusaurus.io/docs/installation
- Docusaurus v3.7.0 Release Notes: https://github.com/facebook/docusaurus/releases/tag/v3.7.0
- Docusaurus v3.9.2 Release Notes (latest stable): https://github.com/facebook/docusaurus/releases/tag/v3.9.2
- Docusaurus React 19 Support PR: https://github.com/facebook/docusaurus/pull/10763

### Secondary (MEDIUM confidence)

- npm package registry data for version information
- Current project files (package.json, tsconfig.json, docusaurus.config.ts)

### Tertiary (LOW confidence)

- None (all findings verified with official sources)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Official npm and Docusaurus documentation
- Architecture patterns: HIGH - Documented in official sources with examples
- Pitfalls: MEDIUM - Based on common patterns and official migration guides, not all explicitly documented

**Research date:** 2026-01-26
**Valid until:** ~30 days (Docusaurus is stable, npm overrides is stable API, unlikely to change)

---

## Additional Context for Planner

### Why This Approach Works

1. **npm overrides is official:** Available since npm 8.3.0 (March 2021), documented in official npm CLI docs
2. **React 19 is officially supported:** Docusaurus 3.7.0 release (January 2025) explicitly added React 19 support
3. **This is transitional:** Some transitive dependencies haven't updated their peerDependencies declarations yet, but code is compatible
4. **Overrides is surgical:** Unlike --legacy-peer-deps which disables all checks, overrides only forces specific packages
5. **Verified by Docusaurus team:** The React 19 support PR shows extensive testing and validation

### Dependencies That Need Overrides

Based on project structure analysis:

- `react` and `react-dom` are the primary candidates
- Some Docusaurus plugins may have React 18 peerDependencies declarations
- MDX-related packages may need attention

### Success Validation

After implementing this phase:

```bash
# Should work WITHOUT --legacy-peer-deps
npm install

# Should complete without peer dependency warnings
npm run build

# Should show no new TypeScript errors
npm run typecheck

# Should start without issues
npm run start
```
