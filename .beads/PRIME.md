# Beads Workflow Context

> **Context Recovery**: Run `bd prime` after compaction, clear, or new session
> Hooks auto-call this in Claude Code when .beads/ detected

# 🚨 SESSION CLOSE PROTOCOL 🚨

**CRITICAL**: Before saying "done" or "complete", you MUST run this checklist:

```
[ ] 1. git status              (check what changed)
[ ] 2. git add <files>         (stage code changes)
[ ] 3. bd sync --from-main     (pull beads updates from main)
[ ] 4. git commit -m "..."     (commit code changes)
[ ] 5. git push origin feature/branch-name
[ ] 6. gh pr create --repo projectbluefin/documentation --web
```

**Note:** This is a fork workflow (castrojo/documentation → projectbluefin/documentation). ALL code changes MUST go through PRs. NEVER push directly to main.

## Core Rules
- **Default**: Use beads for ALL task tracking (`bd create`, `bd ready`, `bd close`)
- **Prohibited**: Do NOT use TodoWrite, TaskCreate, or markdown files for task tracking
- **Workflow**: Create beads issue BEFORE writing code, mark in_progress when starting
- **Git**: ALWAYS use feature branches, NEVER push code directly to main
- Persistence you don't need beats lost context
- Session management: check `bd ready` for available work

## Essential Commands

### Finding Work
- `bd ready` - Show issues ready to work (no blockers)
- `bd list --status=open` - All open issues
- `bd list --status=in_progress` - Your active work
- `bd show <id>` - Detailed issue view with dependencies

### Creating & Updating
- `bd create --title="..." --type=task|bug|feature --priority=2` - New issue
  - Priority: 0-4 or P0-P4 (0=critical, 2=medium, 4=backlog). NOT "high"/"medium"/"low"
- `bd update <id> --status=in_progress` - Claim work
- `bd update <id> --assignee=username` - Assign to someone
- `bd update <id> --title/--description/--notes/--design` - Update fields inline
- `bd close <id>` - Mark complete
- `bd close <id1> <id2> ...` - Close multiple issues at once (more efficient)
- `bd close <id> --reason="explanation"` - Close with reason
- **Tip**: When creating multiple issues/tasks/epics, use parallel subagents for efficiency
- **WARNING**: Do NOT use `bd edit` - it opens $EDITOR (vim/nano) which blocks agents

### Dependencies & Blocking
- `bd dep add <issue> <depends-on>` - Add dependency (issue depends on depends-on)
- `bd blocked` - Show all blocked issues
- `bd show <id>` - See what's blocking/blocked by this issue

### Sync & Collaboration
- `bd sync --from-main` - Pull beads updates from main (for feature branches)
- `bd sync --status` - Check sync status without syncing

### Project Health
- `bd stats` - Project statistics (open/closed/blocked counts)
- `bd doctor` - Check for issues (sync problems, missing hooks)

## Fork Workflow Reminder

**Repository Setup:**
- **Origin (your fork):** `git@github.com:castrojo/documentation.git`
- **Upstream (main project):** `git@github.com:projectbluefin/documentation.git`
- **Beads Branch:** `beads-metadata` (isolated from feature branches)

**Critical Rules:**
1. **ALWAYS create feature branches** for code changes
2. **NEVER push directly to main** - all code goes through PRs
3. **Submit PRs to upstream** using `gh pr create --repo projectbluefin/documentation --web`
4. **Beads metadata** lives on `beads-metadata` branch (automatic via daemon)
5. **Feature branches** don't include `.beads/` (filtered by .gitignore)

## Common Workflows

**Starting work:**
```bash
git checkout main
git pull --rebase
git checkout -b feature/descriptive-name
bd ready           # Find available work
bd show <id>       # Review issue details
bd update <id> --status=in_progress  # Claim it
```

**Completing work:**
```bash
bd close <id1> <id2> ...    # Close all completed issues at once
bd sync --from-main         # Pull latest beads from main
git add <files>
git commit -m "conventional commit message"
git push origin feature/branch-name
gh pr create --repo projectbluefin/documentation --web
```

**Creating dependent work:**
```bash
# Run bd create commands in parallel (use subagents for many items)
bd create --title="Implement feature X" --type=feature
bd create --title="Write tests for X" --type=task
bd dep add beads-yyy beads-xxx  # Tests depend on Feature (Feature blocks tests)
```

## Validation Before Committing

**Always run these checks:**
```bash
npm run typecheck     # TypeScript validation (BLOCKING)
npm run prettier-lint # Code formatting check (warnings OK)
npm run build         # Full build test (BLOCKING)
```

**If changes affect workflows or monthly reports:**
```bash
npm run generate-report  # Test report generation
npm start                # Manual testing in browser
```

## Common Pitfalls to Avoid

- ❌ **Don't create TODO.md files** - use `bd create` instead
- ❌ **Don't push to main** - use feature branches + PRs
- ❌ **Don't use `bd edit`** - it opens vim/nano (use `bd update --title` etc.)
- ❌ **Don't forget `bd sync --from-main`** - always sync before committing
- ❌ **Don't say "ready to push when you are"** - YOU must create the PR

## Session Close Verification

Before ending a session, verify:
```bash
git status                    # Should show clean working tree on feature branch
git log -1                    # Verify last commit is yours with conventional format
git push -n origin HEAD       # Dry-run push (should succeed)
gh pr list --head $(git branch --show-current)  # Verify PR created
bd list --status=in_progress  # Should be empty or updated
```

## Emergency Recovery

**If you pushed to main by mistake:**
```bash
git reset --soft HEAD~1  # Undo commit (keep changes)
git checkout -b feature/fix-main-push
git commit -m "fix: move changes to feature branch"
git push origin feature/fix-main-push
gh pr create --repo projectbluefin/documentation --web
```

**If beads metadata is out of sync:**
```bash
bd sync --status     # Check sync state
bd sync --from-main  # Force sync from main
bd doctor            # Diagnose issues
```

## Reference

- **Full Documentation:** `AGENTS.md` (1767 lines - read for deep dives)
- **Beads Onboarding:** `.beads/ONBOARDING.md`
- **Conventional Commits:** `.github/prompts/conventional-commit.prompt.md`
- **Upstream Repo:** https://github.com/projectbluefin/documentation
- **Your Fork:** https://github.com/castrojo/documentation
