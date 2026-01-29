---
created: 2026-01-27T14:34
title: Simplify bot activity table to show total count per repo
area: reports
files:
  - scripts/lib/markdown-generator.mjs:388-422
---

## Problem

The bot activity table in monthly reports is too long and detailed. It currently breaks down bot activity per-bot per-repository, which creates verbose tables like:

```
| Repository | Bot | PRs |
|------------|-----|-----|
| bluefin | ubot-7274 | 88 |
| bluefin-lts | pull | 8 |
| bluefin-lts | ubot-7274 | 50 |
| bluefin-lts | testpullapp | 5 |
| bluefin-lts | copilot-swe-agent | 1 |
| aurora | ubot-7274 | 72 |
```

This level of detail isn't useful for report readers. They only need to know total bot activity per repository.

## Solution

Aggregate bot activity at the repository level instead of per-bot:

**Desired output:**

```
| Repository | Bot PRs |
|------------|---------|
| bluefin | 88 |
| bluefin-lts | 64 |
| aurora | 72 |
```

**Implementation:**

- Modify `generateBotActivityTable()` in `markdown-generator.mjs`
- Group bot items by repository, sum counts
- Simplify table header and rows
- Keep detailed bot breakdown in collapsible details section

**Files to modify:**

- `scripts/lib/markdown-generator.mjs` lines 388-422 (`generateBotActivityTable` function)
- May need to adjust `generateBotActivitySection` caller (lines 388-401)

**Testing:**

- Regenerate December and January reports
- Verify table is shorter and more readable
- Ensure details section still shows per-bot breakdown
