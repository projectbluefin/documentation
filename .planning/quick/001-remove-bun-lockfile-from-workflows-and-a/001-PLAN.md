---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/codebase/STACK.md
  - .planning/GIT-WORKFLOW.md
autonomous: false # Has checkpoint for manual workflow trigger

must_haves:
  truths:
    - "Repository contains no Bun references in planning docs"
    - "January 2026 report regenerated with current format"
  artifacts:
    - path: ".planning/codebase/STACK.md"
      provides: "Updated to reflect npm-only standard"
      contains: "npm - Package manager"
    - path: ".planning/GIT-WORKFLOW.md"
      provides: "Updated to use npm run commands"
      contains: "npm run typecheck"
  key_links:
    - from: ".planning/codebase/STACK.md"
      to: "AGENTS.md"
      via: "package manager documentation consistency"
      pattern: "npm.*package manager"
---

<objective>
Clean up Bun references from planning documentation and trigger January 2026 report regeneration with updated format.

Purpose: Remove outdated Bun references (repository standardized on npm per AGENTS.md), and update January report to include new Planned/Opportunistic sections added in recent template updates.

Output:

- Planning docs updated to reflect npm-only standard
- January 2026 report regenerated via manual workflow trigger
  </objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@.planning/codebase/STACK.md
@.planning/GIT-WORKFLOW.md
@.github/workflows/monthly-reports.yml
@reports/2026-01-31-report.mdx
</context>

<tasks>

<task type="auto">
  <name>Remove Bun references from planning documentation</name>
  <files>
    .planning/codebase/STACK.md
    .planning/GIT-WORKFLOW.md
  </files>
  <action>
Update planning documentation to remove Bun references and reflect npm-only standard:

**In .planning/codebase/STACK.md (lines 23-27):**

- Remove line: `- bun - CI/CD pipeline (specified in `.github/workflows/pages.yml`)`
- Change `- npm or bun package manager` to `- npm - Package manager (standard across development and CI/CD)`
- Ensure consistency with AGENTS.md which states "npm as the standard package manager"

**In .planning/GIT-WORKFLOW.md (lines 75-77):**

- Change `- Added TypeScript validation step (bun run typecheck) - blocking` to `- Added TypeScript validation step (npm run typecheck) - blocking`
- Change `- Added ESLint validation step (bun run lint) - blocking` to `- Added ESLint validation step (npm run lint) - blocking`
- Change `- Added Prettier check (bun run prettier-lint) - non-blocking` to `- Added Prettier check (npm run prettier-lint) - non-blocking`

**Why:** Repository standardized on npm per AGENTS.md "Package Management" section. All workflows use npm (monthly-reports.yml uses `npm ci`, pages.yml should use npm). Historical Bun references create confusion about which package manager to use.

**Note:** Content references like "brisk pace" in docs/installation.md or "bundled" in docs/bluefin-dx.md are unrelated to Bun package manager and should NOT be changed.
</action>
<verify>

```bash
# Verify Bun package manager references removed from planning docs
! grep -E "bun.*package|package.*bun" .planning/codebase/STACK.md .planning/GIT-WORKFLOW.md

# Verify npm commands documented
grep "npm run" .planning/GIT-WORKFLOW.md

# Verify STACK.md consistency
grep "npm.*Package manager.*standard" .planning/codebase/STACK.md
```

  </verify>
  <done>
Planning documentation updated: STACK.md and GIT-WORKFLOW.md reference npm only, no Bun package manager references remain in planning docs.
  </done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <action>Trigger GitHub Actions workflow to regenerate January 2026 report</action>
  <instructions>
The January 2026 report was generated with an older template format. Trigger the workflow manually to regenerate it with the current format (includes Planned/Opportunistic sections).

**Steps:**

1. **Navigate to GitHub Actions:**
   - Open: https://github.com/ublue-os/bluefin-docs/actions/workflows/monthly-reports.yml
   - Or: Repository → Actions tab → "Generate Monthly Report" workflow

2. **Trigger workflow manually:**
   - Click "Run workflow" button (top right)
   - Select branch: `main`
   - Click green "Run workflow" button

3. **Monitor execution:**
   - Wait for workflow to complete (~2-3 minutes)
   - Check for successful completion (green checkmark)
   - Review workflow logs if any errors occur

4. **Verify regenerated report:**
   - Pull latest changes: `git pull origin main`
   - Check updated file: `reports/2026-01-31-report.mdx`
   - Verify report includes new template sections

**Expected outcome:** January 2026 report regenerated with current template format, committed to main branch by github-actions bot.

**Note:** Workflow uses `workflow_dispatch` trigger for manual execution. The script calculates the current month and regenerates the appropriate report file.
</instructions>
<resume-signal>Type "regenerated" when workflow completes successfully and changes are pulled</resume-signal>
</task>

</tasks>

<verification>
**Overall checks:**

```bash
# No Bun package manager references in planning docs
! grep -iE "bun.*(package|manager|pipeline)" .planning/codebase/STACK.md .planning/GIT-WORKFLOW.md

# Planning docs reference npm consistently
grep -q "npm.*Package manager" .planning/codebase/STACK.md
grep -q "npm run" .planning/GIT-WORKFLOW.md

# January report exists and is recent
ls -lh reports/2026-01-31-report.mdx
git log -1 --oneline reports/2026-01-31-report.mdx
```

**Consistency check:** Planning documentation aligns with AGENTS.md npm standard.
</verification>

<success_criteria>

- [ ] .planning/codebase/STACK.md updated to reflect npm-only standard
- [ ] .planning/GIT-WORKFLOW.md updated to use npm run commands
- [ ] No Bun package manager references remain in planning docs
- [ ] January 2026 report regenerated via manual workflow trigger
- [ ] Report file shows recent commit from github-actions bot
- [ ] Planning docs committed to repository
      </success_criteria>

<output>
After completion, create `.planning/quick/001-remove-bun-lockfile-from-workflows-and-a/001-SUMMARY.md`
</output>
