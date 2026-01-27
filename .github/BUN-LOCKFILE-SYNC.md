# Bun Lockfile Sync Solution

## Problem

This repository uses **bun** in CI (GitHub Actions) but developers may use **npm** locally. This causes `bun.lockb` to get out of sync with `package-lock.json`, leading to CI failures:

```
error: lockfile had changes, but lockfile is frozen
```

## Solution: Multi-Layered Approach

### Layer 1: Automatic CI Sync (Primary Solution)

**File:** `.github/workflows/sync-bun-lockfile.yml`

- **Triggers:** When `package.json` or `package-lock.json` changes in a PR
- **Action:** Automatically regenerates `bun.lockb` and commits it to the PR
- **Benefit:** Zero developer effort - works even if you don't have bun installed locally

**How it works:**

1. PR modifies dependencies (via npm)
2. Workflow detects package-lock.json change
3. Workflow runs `bun install` to sync bun.lockb
4. If out of sync, commits and pushes the updated bun.lockb
5. Adds a comment to the PR explaining what happened

### Layer 2: Pre-Commit Hook (Developer Option)

**File:** `.githooks/pre-commit`

- **Triggers:** When committing changes to `package.json` or `package-lock.json`
- **Action:** Syncs `bun.lockb` before commit (if bun is installed)
- **Benefit:** Prevents the issue before pushing to CI

**Setup:**

```bash
# One-time setup to use custom hooks directory
git config core.hooksPath .githooks

# Or install bun globally
curl -fsSL https://bun.sh/install | bash
source ~/.bash_profile  # or ~/.bashrc
```

### Layer 3: Package.json Scripts

**Addition to package.json:**

```json
{
  "scripts": {
    "postinstall": "command -v bun >/dev/null 2>&1 && bun install || true",
    "sync-lockfile": "bun install"
  }
}
```

- **`postinstall`**: Auto-syncs bun.lockb after `npm install` (if bun is available)
- **`sync-lockfile`**: Manual command to sync lockfiles

### Layer 4: Documentation Update (AGENTS.md)

Added section explaining:

- Why both lockfiles exist
- Which to commit when
- How the auto-sync works
- Troubleshooting steps

## Usage for Developers

### Scenario 1: Adding Dependencies with npm (Recommended)

```bash
# Add dependency
npm install some-package

# Option A: Let CI handle it (easiest)
git add package.json package-lock.json
git commit -m "feat: add some-package"
git push
# CI will auto-sync bun.lockb

# Option B: Sync locally (if you have bun)
npm run sync-lockfile
git add package.json package-lock.json bun.lockb
git commit -m "feat: add some-package"
git push
```

### Scenario 2: Adding Dependencies with bun

```bash
# Add dependency
bun add some-package

# Commit both lockfiles
git add package.json bun.lockb
git commit -m "feat: add some-package"
git push
```

### Scenario 3: Lockfile Out of Sync (Fix)

```bash
# If CI fails with "lockfile had changes"
bun install  # Regenerates bun.lockb
git add bun.lockb
git commit -m "chore: sync bun.lockb"
git push
```

## Why This Solution Works

1. **Zero-Config for Most Devs**: CI handles sync automatically - devs don't need bun installed
2. **Multiple Fallbacks**: Pre-commit hook, postinstall script, manual command
3. **Clear Communication**: CI comments on PR when it syncs
4. **No Breaking Changes**: Works with existing workflow - npm still supported
5. **Future-Proof**: If we switch to bun-only, delete sync workflow and remove npm lockfile

## Testing the Solution

```bash
# Test 1: Modify package.json (add/remove dependency)
npm install lodash
git add package.json package-lock.json
git commit -m "test: add lodash"
git push
# Watch PR - CI should auto-sync bun.lockb

# Test 2: Pre-commit hook (if bun installed)
npm install chalk
git add package.json package-lock.json
git commit -m "test: add chalk"
# Hook should sync bun.lockb before commit
git log -1 --stat
# Should show bun.lockb in commit

# Test 3: Manual sync
npm install axios
npm run sync-lockfile
git status
# Should show bun.lockb as modified
```

## Migration Path

If we decide to standardize on one package manager:

**Option A: Standardize on bun**

```bash
rm package-lock.json
rm .github/workflows/sync-bun-lockfile.yml
# Update AGENTS.md: "Use bun only"
```

**Option B: Standardize on npm**

```bash
rm bun.lockb
# Update .github/workflows/pages.yml: Use npm instead of bun
# Update AGENTS.md: "Use npm only"
```

## Troubleshooting

**Q: CI still failing after sync commit?**
A: Wait for the sync commit to finish, then re-run the failing check.

**Q: Multiple bun.lockb commits on same PR?**
A: Workflow only runs once per push. If it creates multiple commits, check for multiple pushes or manual bun.lockb edits.

**Q: Pre-commit hook not working?**
A: Run `git config core.hooksPath .githooks` to enable custom hooks directory.

**Q: Should I commit bun.lockb or not?**
A: Yes, always commit bun.lockb. The sync workflow ensures it matches package-lock.json.

## References

- Bun documentation: https://bun.sh/docs/install/lockfile
- GitHub Actions: https://docs.github.com/en/actions
- Git hooks: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
