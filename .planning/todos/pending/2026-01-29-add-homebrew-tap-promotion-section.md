---
created: 2026-01-29T02:24
title: Add homebrew tap promotion section to monthly reports
area: reports
files:
  - scripts/generate-report.mjs
  - scripts/lib/markdown-generator.mjs
  - reports/
---

## Problem

Monthly reports should include a section showing packages that have been promoted from the experimental-tap to the production-tap during the reporting period. This helps users discover newly production-ready packages.

The section should:

- Appear in monthly reports (not in command-line documentation)
- List packages promoted during the month with descriptions
- Include a link to http://github.com/ublue-os/homebrew-tap
- Use specific wording: "Use `ujust bbrew` to browse and install these packages. Follow [the tap instructions] if you want to do it by hand."

## Solution

1. **Research promotions workflow:**
   - Identify how packages move from experimental-tap to homebrew-tap
   - Determine what commit messages/patterns indicate a promotion
   - Example: commit `bd381cf` (Jan 12, 2026) promoted antigravity-linux

2. **Add data fetching to report generator:**
   - Query both experimental-tap and homebrew-tap repositories
   - Compare commits between taps to detect promotions
   - Filter commits by date range (report month)
   - Extract package names and descriptions from formulas/casks

3. **Add markdown generation:**
   - Create new section in `scripts/lib/markdown-generator.mjs`
   - Format: "## Homebrew Tap Promotions" section
   - List promoted packages with bullet points
   - Include package descriptions from formula/cask files
   - Add footer with usage instructions and tap link

4. **Integration:**
   - Wire up in `scripts/generate-report.mjs`
   - Position section after "Contributors" but before footer
   - Handle case where no promotions occurred (skip section or show "None this month")

## Implementation Notes

**Promotion Detection Strategy:**

Option 1: GitHub API commits comparison

- Fetch commits from both repos in date range
- Look for new files added to homebrew-tap/Formula or homebrew-tap/Casks
- Cross-reference with experimental-tap to confirm they existed there first

Option 2: Commit message parsing

- Look for specific commit patterns like "feat: promote X to main tap"
- Simpler but less reliable if commit messages aren't consistent

**Package Description Extraction:**

- Parse Ruby formula files to extract `desc` field
- Example: `desc "Antigravity application for Linux"`
- Cache descriptions to avoid repeated parsing

**Known Promotions (for testing):**

- antigravity-linux (Jan 12, 2026 - commit bd381cf)
- goose-linux (frequent updates, check if promotion or just updates)
- linux-mcp-server (Jan 26, 2026 - commit 90a8c88)

## Success Criteria

- [ ] Report generator detects promotions from experimental to production tap
- [ ] Promotions section appears in monthly reports when promotions occurred
- [ ] Package descriptions accurately extracted from formula files
- [ ] Section omitted or shows "None this month" when no promotions
- [ ] Usage instructions and tap link included
- [ ] Test with January 2026 report (known promotions: antigravity, linux-mcp-server)
