---
task: "005"
type: quick
created: 2026-01-27
description: Label unlabeled PRs in monthly reports to reduce 'Other' section
---

# Quick Task: Label Unlabeled PRs in Monthly Reports

## Objective

Review unlabeled PRs from the January 2026 monthly report's "📋 Other" section (lines 186-295, 100+ items) and add appropriate area/kind labels retroactively on GitHub. Focus on OBVIOUS labeling patterns to significantly reduce the "Other" section in future report regenerations.

**Purpose:** Improve monthly report categorization and readability by ensuring PRs have proper labels.

**Output:** GitHub labels applied to unlabeled PRs, ready for report regeneration.

## Context

- January 2026 report has 100+ items in "📋 Other" section
- Most are bot PRs (already filtered to bot activity section)
- Remaining human PRs lack area/kind labels
- Available labels documented in `scripts/lib/label-mapping.mjs`
- Future report regenerations will automatically categorize labeled PRs

## Tasks

### Task 1: Identify Obvious Labeling Patterns

**Goal:** Extract and categorize unlabeled PRs by obvious patterns (CI, ISO, flatpak, brew, documentation, etc.)

**Action:**

1. Read January 2026 report "Other" section (lines 186-295)
2. Identify obvious patterns:
   - **CI/Automation:** PRs with "ci:", "chore(ci):", "fix(ci):" → `kind/automation` or `kind/github-action`
   - **ISO:** PRs from projectbluefin/iso repo → `area/iso`
   - **Brew:** PRs with "brew" in title/commit → `area/brew`
   - **Flatpak:** PRs with "flatpak" in title/commit → `area/flatpak`
   - **Documentation:** PRs from projectbluefin/documentation repo → `kind/documentation`
   - **GNOME/Desktop:** PRs mentioning "gnome", "extension", "schema" → `area/gnome` or `area/bling`
   - **Aurora/KDE:** PRs from ublue-os/aurora repo → `area/aurora`
   - **NVIDIA:** PRs with "nvidia", "kms-modifiers" → `area/nvidia` or `area/hardware`
   - **Testing:** PRs with "testing" in title → `area/testing`
   - **Upstream:** PRs with "upstream", "base image", "logos" → `area/upstream`
   - **Services/Policy:** PRs with "service", "timer", "policy" → `area/services` or `area/policy`
3. Create categorized list with PR URLs and proposed labels
4. Focus on highest-impact categories (10+ PRs each)

**Verify:**

- List produced with format: `<PR_URL> → <labels>`
- Patterns clearly identified and justified

**Done:**

- Clear categorization of 50+ PRs ready for labeling

### Task 2: Apply Labels via GitHub CLI

**Goal:** Apply identified labels to unlabeled PRs using GitHub CLI

**Action:**

1. For each categorized PR from Task 1:
   ```bash
   gh pr edit <PR_URL> --add-label "label-name"
   ```
2. Apply labels in batches by category for efficiency
3. Log results (success/failure for each PR)
4. Note any PRs that cannot be labeled (closed without merge, permission issues, etc.)

**Verify:**

```bash
# Spot-check labeled PRs
gh pr view <PR_URL> --json labels
# Should show newly applied labels
```

**Done:**

- Labels applied to 50+ PRs
- Log of applied labels and any failures

### Task 3: Validate Impact via Report Regeneration

**Goal:** Regenerate January 2026 report to verify "Other" section reduction

**Action:**

1. Regenerate January 2026 report:
   ```bash
   npm run generate-report -- --month=2026-01
   ```
2. Compare "Other" section before/after:
   - Count lines in "📋 Other" section
   - Verify labeled PRs moved to appropriate categories
3. Document impact metrics:
   - Items before: 100+
   - Items after: <target>
   - Reduction percentage
4. Commit regenerated report if significant improvement:

   ```bash
   git add reports/2026-01-31-report.mdx
   git commit -m "chore(reports): reduce 'Other' section via retroactive labeling

   - Applied area/kind labels to 50+ unlabeled PRs
   - Reduced 'Other' section from 100+ to ~X items
   - Improved categorization: CI → automation, ISO → area/iso, etc."
   ```

**Verify:**

- Report regenerates without errors
- "Other" section significantly smaller
- Labeled items appear in correct categories

**Done:**

- January 2026 report updated with improved categorization
- Metrics documented showing impact

## Success Criteria

- [ ] 50+ PRs labeled with appropriate area/kind labels
- [ ] "Other" section reduced by at least 50% (from 100+ to ~50 or fewer)
- [ ] Report regenerated and committed
- [ ] Clear patterns documented for future labeling efforts

## Notes

**Focus on obvious patterns only:**

- Don't spend time on ambiguous PRs
- Skip PRs that require deep investigation
- Goal is significant reduction, not perfection

**Common patterns observed:**

- Most aurora PRs → `area/aurora`
- Most ISO PRs → `area/iso`
- Most CI PRs → `kind/automation` or `kind/github-action`
- Most documentation PRs → `kind/documentation`
- GNOME extension updates → `area/gnome` or `area/bling`
- Brew-related → `area/brew`
- Flatpak-related → `area/flatpak`

**Time estimate:** 30-45 minutes

- Task 1: 10-15 minutes (pattern identification)
- Task 2: 15-20 minutes (label application)
- Task 3: 5-10 minutes (validation)
