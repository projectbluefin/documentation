# Git Workflow Configuration

**Updated:** 2026-01-27

This repository uses branch-based development with pull requests for all changes.

## Configuration

See `.planning/config.json` for the git workflow settings:

```json
{
  "git": {
    "workflow": "branch",
    "protected_branches": ["main", "master"],
    "branch_prefix": "gsd",
    "auto_pr": false,
    "pr_on_completion": true,
    "prompt_before_pr": true
  }
}
```

## Workflow Behavior

### Branch-Based Development

**All work happens in feature branches:**

- GSD agents will NEVER commit directly to `main` or `master`
- Each plan execution creates a new branch: `gsd/{phase}-{plan}-{description}`
- All commits go to the feature branch
- Pull requests are created automatically at completion

### Branch Naming Convention

**Format:** `gsd/{phase}-{plan}-{slug}`

**Examples:**

- `gsd/01-01-configuration-foundation`
- `gsd/02-01-type-system-repair`
- `gsd/04-02-ci-validation-gates`

### Pull Request Creation

**When:** After each plan completes successfully (with user prompt)

**Behavior:**

- `auto_pr: false` - PRs are NOT created automatically
- `prompt_before_pr: true` - Agent will ask before creating PR
- User reviews changes and approves PR creation

**PR includes:**

- Title: `{type}({phase}-{plan}): {plan name}`
- Body: Summary from SUMMARY.md with:
  - What was built
  - Changes made
  - Verification steps
  - Testing recommendations
- All commits from the plan
- Link to planning artifacts

**Example PR:**

```
Title: feat(04-02): Add CI/CD validation gates

## Summary
Added validation gates to GitHub Actions workflow to enforce code quality standards.

## Changes
- Added TypeScript validation step (npm run typecheck) - blocking
- Added ESLint validation step (npm run lint) - blocking
- Added Prettier check (npm run prettier-lint) - non-blocking

## Verification
- CI workflow runs validation before build
- Validation failures block deployment
- Gap from 04-01-VERIFICATION.md closed

## Testing
Push a commit with TypeScript errors to verify CI fails.

See: .planning/phases/04-validation-quality-gates/04-02-SUMMARY.md
```

### Protected Branches

**These branches are protected from direct commits:**

- `main` (default branch)
- `master` (if present)

Any attempt to commit directly to these branches will error and abort.

### Workflow Steps

1. **Start Plan Execution**
   - Agent creates branch: `gsd/{phase}-{plan}-{slug}`
   - Checks out new branch

2. **Execute Tasks**
   - Each task committed to feature branch
   - Atomic commits with conventional format

3. **Complete Plan**
   - SUMMARY.md created and committed
   - STATE.md updated and committed

4. **Create Pull Request**
   - Agent prompts user: "Create PR now?"
   - User approves PR creation
   - PR created with `gh pr create`
   - PR body includes summary and changes
   - User reviews and merges when ready

5. **Merge to Main**
   - User merges PR via GitHub UI or CLI
   - Feature branch can be deleted after merge

## Benefits

✅ **Code Review:** All changes reviewed before merging to main
✅ **CI/CD Validation:** GitHub Actions validation gates run on every PR
✅ **History:** Clear feature branch history in git log
✅ **Rollback:** Easy to revert merged PRs if needed
✅ **Collaboration:** Other developers can review and comment on changes
✅ **Protection:** Main branch stays stable and deployable

## Manual Overrides

If you need to bypass the workflow for emergency fixes:

1. **Disable workflow temporarily:**

   ```json
   {
     "git": {
       "workflow": "direct"
     }
   }
   ```

2. **Or use git directly:**

   ```bash
   git checkout main
   git commit -m "fix: emergency hotfix"
   git push origin main
   ```

3. **Re-enable branch workflow:**
   ```json
   {
     "git": {
       "workflow": "branch"
     }
   }
   ```

## Phase Execution Workflow

**For multi-plan phases:**

Each plan in the phase gets its own branch and PR:

- Phase 4 has 2 plans → 2 branches, 2 PRs
- `gsd/04-01-validation-quality-gates` → PR #1
- `gsd/04-02-ci-validation-gates` → PR #2

**Merging strategy:**

- Merge PRs in order (04-01 before 04-02 if dependent)
- Or merge all at once after reviewing both
- Phase directories accumulate across all merged PRs

## Milestone Completion

**Milestone archiving commits go to a branch too:**

Branch: `gsd/milestone-v{version}`
Example: `gsd/milestone-v1.0`

PR includes:

- Milestone archive files
- MILESTONES.md entry
- STATE.md updates
- Git tag annotation (tag created after merge)

## Troubleshooting

### "Already on branch main"

**Issue:** Agent tried to create PR but you're on main
**Fix:** Agent will abort and ask you to checkout a branch or change config

### "Branch already exists"

**Issue:** Feature branch from previous attempt still exists
**Fix:** Delete old branch: `git branch -D gsd/{phase}-{plan}-{slug}`

### "No commits to create PR"

**Issue:** Branch has no commits compared to main
**Fix:** Verify commits exist: `git log origin/main..HEAD`

### "Permission denied to push"

**Issue:** No write access to remote repository
**Fix:** Check repository permissions or fork the repository

## Future Enhancements

**Planned features (not yet implemented):**

- Draft PR mode (create draft PRs for work-in-progress)
- Auto-merge (merge PRs automatically if CI passes and in yolo mode)
- Squash commits (combine all plan commits into one before merge)
- PR templates (use repository's .github/PULL_REQUEST_TEMPLATE.md)

---

_Last updated: 2026-01-27 after v1.0 milestone completion_
_Config location: `.planning/config.json`_
