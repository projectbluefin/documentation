# Stack Research

**Domain:** Docusaurus Technical Cleanup
**Researched:** January 26, 2026
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version          | Purpose               | Why Recommended                                                                                                                                            |
| ---------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docusaurus | 3.9.2 (latest)   | Static site generator | Latest stable with Node.js 20+ support, React 19 compatibility improvements, SSR enhancements. Upgrade from 3.8.1 brings AskAI support, i18n improvements. |
| React      | 19.2 (stable)    | UI framework          | December 2024 stable release with Actions, `use` hook, improved hydration. **Must be compatible peer dependency** - not RC anymore.                        |
| TypeScript | 5.9+             | Type safety           | Minimum version for Docusaurus 3.9. Use 5.9.2+ for stability. Docusaurus extends `@docusaurus/tsconfig` base.                                              |
| Node.js    | 20.x LTS or 22.x | Runtime               | Node.js 18 dropped in Docusaurus 3.9 (EOL). Use 20.x LTS (until April 2026) or 22.x LTS (current).                                                         |

### Validation & Quality Tools

| Tool                | Version           | Purpose         | Why Recommended                                                                                                                              |
| ------------------- | ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Compiler | 5.9+              | Type checking   | Run `tsc` for type validation. Docusaurus tolerates some errors but clean code should pass `npm run typecheck`.                              |
| Prettier            | 3.6.2+            | Code formatting | Industry standard formatter. **Pin exact version** to avoid formatting churn. Use `.prettierrc` and `.prettierignore`.                       |
| ESLint              | 9.x (Flat Config) | Code linting    | ESLint 9 uses new flat config format. Integrate with Prettier via `eslint-config-prettier` to avoid conflicts. **Optional but recommended**. |

### TypeScript Configuration Packages

| Package                           | Version | Purpose                                 | When to Use                                                                                        |
| --------------------------------- | ------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@docusaurus/tsconfig`            | 3.9.2   | Base TypeScript config                  | **Required** - Extend this in your `tsconfig.json`. Provides Docusaurus-specific compiler options. |
| `@docusaurus/module-type-aliases` | 3.9.2   | Type definitions for Docusaurus modules | **Required** - Enables importing Docusaurus APIs with types (`@docusaurus/Link`, etc.)             |
| `@docusaurus/types`               | 3.9.2   | Core type definitions                   | **Required** - Provides types for config files, plugins, themes.                                   |

### Supporting Libraries (Existing Project)

| Library    | Version | Purpose                    | Notes                                                                                                          |
| ---------- | ------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| xml2js     | 0.6.2   | Parse GitHub release feeds | Used in `scripts/fetch-feeds.js` for RSS/Atom parsing.                                                         |
| node-fetch | 3.3.2   | HTTP requests              | Used for fetching external data (feeds, playlists, GitHub profiles). ESM-only, requires dynamic import in CJS. |

## Installation

```bash
# Upgrade Docusaurus to 3.9.2 (if not already)
npm install --save @docusaurus/core@3.9.2 @docusaurus/preset-classic@3.9.2

# Ensure TypeScript tooling is current
npm install --save-dev typescript@5.9.2 \
  @docusaurus/module-type-aliases@3.9.2 \
  @docusaurus/tsconfig@3.9.2 \
  @docusaurus/types@3.9.2

# Fix React 19 peer dependencies (if needed)
# Option 1: Use npm overrides in package.json
# Option 2: Wait for Docusaurus 3.10+ which may resolve peer dependency warnings

# Install or verify Prettier
npm install --save-dev --save-exact prettier@3.6.2

# Optional: Install ESLint 9 with Prettier integration
npm install --save-dev eslint@9.x @eslint/js globals \
  eslint-config-prettier
```

## Handling React 19 Peer Dependencies

### The Problem

Docusaurus 3.8.1 and 3.9.x were built before React 19 stable release (Dec 2024). Some Docusaurus dependencies may specify `"react": "^18.0.0"` peer dependencies, causing npm warnings:

```
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @docusaurus/theme-classic@3.9.2
npm warn Found: react@19.2.0
npm warn Could not resolve dependency:
npm warn peer react@"^18.0.0" from @docusaurus/theme-classic@3.9.2
```

### Solutions (Ordered by Preference)

| Approach                                 | Pros                         | Cons                                    | Recommendation                                       |
| ---------------------------------------- | ---------------------------- | --------------------------------------- | ---------------------------------------------------- |
| **Option 1: npm overrides**              | Clean install, no flags      | Requires npm 8.3+                       | **Use this** - Most reliable for production          |
| **Option 2: --legacy-peer-deps**         | Simple, works with older npm | Disables all peer dependency validation | **Use for quick fixes** - Not ideal long-term        |
| **Option 3: Wait for Docusaurus update** | Official support             | May take time                           | **Do this eventually** - Monitor Docusaurus releases |

### Option 1: npm overrides (Recommended)

Add to `package.json`:

```json
{
  "overrides": {
    "react": "$react",
    "react-dom": "$react-dom"
  }
}
```

This forces all transitive dependencies to use your installed React version. Run `npm install` without flags.

**Confidence:** HIGH - This is the npm-recommended approach for peer dependency resolution.

### Option 2: --legacy-peer-deps flag

Use `npm install --legacy-peer-deps` when installing. This bypasses peer dependency validation.

**Downside:** Disables ALL peer dependency checks, not just React. Could mask real compatibility issues.

**When to use:** Quick prototyping, temporary workarounds, or when Option 1 fails.

### Option 3: Future-proof approach

React 19 is stable as of Dec 2024. Docusaurus 3.10+ (estimated Q1-Q2 2026) will likely update peer dependencies to `"react": "^18.0.0 || ^19.0.0"`.

**Monitor:** Check Docusaurus releases and upgrade when peer dependencies are officially updated.

## TypeScript Configuration Best Practices

### Recommended tsconfig.json

```json
{
  "extends": "@docusaurus/tsconfig",
  "compilerOptions": {
    "baseUrl": ".",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "*.ts", "*.tsx"],
  "exclude": ["node_modules", "build", ".docusaurus"]
}
```

**Key Points:**

- **`extends: "@docusaurus/tsconfig"`** - Docusaurus provides sensible defaults
- **`strict: true`** - Enable all strict type-checking options
- **`skipLibCheck: true`** - Skip type checking of declaration files for faster builds
- **`baseUrl: "."`** - Enables absolute imports from project root

**Confidence:** HIGH - Official Docusaurus recommendation from [TypeScript Support docs](https://docusaurus.io/docs/typescript-support#setup).

### TypeScript Validation Strategy

Docusaurus's build process tolerates some TypeScript errors because it uses Babel for transpilation, not `tsc`. However, **your cleanup project should enforce zero TypeScript errors**.

```bash
# Type check without emitting files
npm run typecheck

# Expected output (goal):
# ✓ No TypeScript errors
```

If `tsc` shows errors but `npm run build` succeeds, it means:

- Babel ignores type errors during transpilation
- You have **technical debt** to clean up
- Tests may pass but code is not type-safe

**Fix:** Address all `tsc` errors before considering cleanup complete.

## Prettier Configuration Best Practices

### Recommended .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Recommended .prettierignore

```
# Build outputs
build
.docusaurus

# Dependencies
node_modules

# Auto-generated files
static/data/playlist-metadata.json
static/data/github-profiles.json
static/data/github-repos.json
static/feeds/*.json

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml

# Logs
*.log
```

**Critical:** Add auto-generated data files to `.prettierignore` to avoid formatting churn on build artifacts.

**Confidence:** HIGH - Standard Prettier configuration from [official Prettier docs](https://prettier.io/docs/en/install).

## ESLint Configuration (Optional but Recommended)

### Why ESLint with Docusaurus?

- **Catch bugs:** Detect unused variables, undefined references, async issues
- **Enforce conventions:** Consistent code patterns across team
- **Complement TypeScript:** ESLint catches logic errors TypeScript can't

### Recommended eslint.config.js (ESLint 9 Flat Config)

```js
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  js.configs.recommended,
  prettier, // Disables ESLint rules that conflict with Prettier
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
]);
```

**Key Points:**

- **ESLint 9 uses flat config** (`eslint.config.js`), not `.eslintrc.*`
- **`eslint-config-prettier`** disables formatting rules to avoid conflicts
- **Globals:** Include both `browser` and `node` for Docusaurus (SSR + client)

**Installation:**

```bash
npm install --save-dev eslint@9.x @eslint/js globals eslint-config-prettier
```

**Confidence:** MEDIUM - ESLint 9 is very new (2024-2025). Ecosystem still adapting. Consider ESLint 8 if team prefers stability.

## What NOT to Use

| Avoid                                     | Why                                                                | Use Instead                                                      |
| ----------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `any` type in TypeScript                  | Defeats purpose of TypeScript. Allows type errors to slip through. | Proper types, `unknown`, or type assertions with runtime checks. |
| `--force` with npm                        | Bypasses all safety checks. Can break dependency trees.            | `--legacy-peer-deps` (if needed) or fix underlying issue.        |
| Outdated Docusaurus versions              | Security issues, missing features, peer dependency mismatches.     | Keep Docusaurus on latest 3.x minor version.                     |
| `window` or `localStorage` without guards | Causes SSR errors. Docusaurus pre-renders on server.               | Use `<BrowserOnly>`, `useIsBrowser()`, or `useEffect()` hooks.   |
| ESLint 8 with old `.eslintrc.*`           | Deprecated config format (ESLint 10 will remove support).          | Migrate to ESLint 9 flat config or stay on 8.x until ready.      |

## React 19 SSR Considerations

React 19 improves SSR hydration error reporting (shows diffs) but introduces stricter checks:

### Avoid These Patterns:

```tsx
// ❌ BAD: Accessing window during render
function Component() {
  const href = window.location.href; // ReferenceError during SSR
  return <span>{href}</span>;
}

// ❌ BAD: Conditional rendering based on window
function Component() {
  if (typeof window !== "undefined") {
    return <ClientOnlyComponent />;
  }
  return null; // Hydration mismatch!
}
```

### Use These Patterns:

```tsx
// ✅ GOOD: BrowserOnly wrapper
import BrowserOnly from "@docusaurus/BrowserOnly";

function Component() {
  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => {
        const href = window.location.href;
        return <span>{href}</span>;
      }}
    </BrowserOnly>
  );
}

// ✅ GOOD: useEffect for side effects
function Component() {
  const [href, setHref] = useState("");

  useEffect(() => {
    setHref(window.location.href);
  }, []);

  return <span>{href}</span>;
}

// ✅ GOOD: useIsBrowser hook
import useIsBrowser from "@docusaurus/useIsBrowser";

function Component() {
  const isBrowser = useIsBrowser();
  const href = isBrowser ? window.location.href : "Loading...";
  return <span>{href}</span>;
}
```

**Confidence:** HIGH - Official Docusaurus SSR best practices from [Static Site Generation docs](https://docusaurus.io/docs/advanced/ssg).

## Version Compatibility Matrix

| Docusaurus | React        | TypeScript            | Node.js      |
| ---------- | ------------ | --------------------- | ------------ |
| 3.9.2      | 18.x or 19.x | 5.1+ (recommend 5.9+) | 20.x, 22.x   |
| 3.8.1      | 18.x or 19.x | 5.1+ (recommend 5.9+) | 18.18+, 20.x |

**Source:** [Docusaurus 3.9 Release Notes](https://docusaurus.io/blog/releases/3.9) (September 2025)

## Alternatives Considered

| Recommended            | Alternative           | Why Not Alternative                                                                                    |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript strict mode | TypeScript loose mode | Defeats purpose of cleanup. Want maximum type safety.                                                  |
| Prettier               | No formatter          | Inconsistent style across team. Manual formatting is error-prone.                                      |
| npm overrides          | Yarn resolutions      | Project uses npm. Overrides is npm 8.3+ native solution.                                               |
| ESLint 9               | ESLint 8              | ESLint 8 is stable but uses deprecated config format. Choose 9 for future-proofing or 8 for stability. |

## Validation Workflow

Recommended CI/CD validation steps:

```bash
# 1. Install dependencies
npm ci

# 2. Type check
npm run typecheck
# Expected: 0 errors

# 3. Lint (optional, if using ESLint)
npm run lint
# Expected: 0 errors

# 4. Format check
npm run prettier-lint
# Expected: 0 formatting issues (warnings OK for legacy files)

# 5. Build
npm run build
# Expected: Successful build in 7-15 seconds
```

**Goal:** All validation steps pass with **zero errors**. Warnings may exist in legacy code but new code should be warning-free.

## Sources

- **HIGH Confidence:**
  - [Docusaurus TypeScript Support](https://docusaurus.io/docs/typescript-support) - Official guide
  - [Docusaurus Static Site Generation](https://docusaurus.io/docs/advanced/ssg) - SSR patterns
  - [Docusaurus 3.9 Release Notes](https://docusaurus.io/blog/releases/3.9) - Latest version changes
  - [React 19 Release Blog](https://react.dev/blog/2024/12/05/react-19) - React 19 stable features
  - [TypeScript Handbook: tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) - TypeScript configuration
  - [Prettier Install Guide](https://prettier.io/docs/en/install) - Prettier setup
  - [ESLint Getting Started](https://eslint.org/docs/latest/use/getting-started) - ESLint 9 flat config

- **MEDIUM Confidence:**
  - npm overrides approach - npm 8.3+ feature, well-documented but React 19 + Docusaurus specific application is recent

---

**Research complete.** Stack recommendations are comprehensive and actionable for roadmap creation.
