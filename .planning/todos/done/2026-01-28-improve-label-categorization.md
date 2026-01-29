# Todo: Improve Label Categorization in Monthly Reports

**Created:** 2026-01-28  
**Status:** Pending  
**Estimated Effort:** 30-45 minutes  
**Priority:** Medium

## Objective

Expand label categorization in monthly reports to include uncategorized `area/*` labels and add descriptive text for each category section.

## Background

Currently, several labels from `projectbluefin/common` appear in the "Other" section because they're not mapped to report categories. This todo addresses the remaining uncategorized labels while maintaining the established pattern of only showing `area/*` labels in sections (with exceptions for specific `kind/*` labels already included).

## Changes Required

### 1. Add Missing Labels to Categories

**File:** `scripts/lib/label-mapping.mjs`

Add these labels to existing categories:

```javascript
export const LABEL_CATEGORIES = {
  Desktop: ["area/gnome", "area/aurora", "area/bling"],
  Development: ["area/dx"],
  Ecosystem: ["area/brew", "area/bluespeed", "area/flatpak"],
  "System Services & Policies": ["area/services", "area/policy"],
  Hardware: ["area/hardware", "area/nvidia", "aarch64"], // ADD aarch64
  Infrastructure: [
    "area/iso",
    "area/upstream",
    "area/buildstream",
    "area/finpilot",
    "area/just",
    "area/testing",
  ],
  Documentation: ["kind/documentation"],
  "Tech Debt": ["kind/tech-debt", "kind/parity"], // ADD kind/parity
  Automation: ["kind/automation", "kind/github-action", "kind/renovate"],
  Localization: ["kind/translation"],
};
```

### 2. Add Category Descriptions

**File:** `scripts/lib/markdown-generator.mjs`

Modify `generateCategorySection()` to include italic descriptions below each category header. Use these descriptions (derived from label descriptions in GitHub):

- **Desktop:** _GNOME desktop environment, Aurora variant (KDE), and terminal enhancements_
- **Development:** _Development tools and IDE integrations_
- **Ecosystem:** _Homebrew packages, AI/ML tools (Bluespeed), and Flatpak applications_
- **System Services & Policies:** _Systemd services and system-level policies_
- **Hardware:** _Hardware support, drivers, NVIDIA GPU, and ARM64 architecture_
- **Infrastructure:** _ISO images, upstream integration, build systems, and testing frameworks_
- **Documentation:** _Documentation improvements and additions_
- **Tech Debt:** _Maintenance work and feature parity between variants_
- **Automation:** _CI/CD pipelines, GitHub Actions, and automated dependency updates_
- **Localization:** _Translation and internationalization work_

### 3. Ignore Specific Labels

Ensure these labels are excluded from all categories and "Other" section:

- `dependencies` (meta label for Renovate)
- `lgtm`, `size/*`, `stale`, `duplicate`, `invalid`, `wontfix`, `question`
- `good first issue`, `help wanted`

## Implementation Steps

1. **Update label mapping:**
   - Add `aarch64` to Hardware array
   - Add `kind/parity` to Tech Debt array

2. **Create category descriptions map:**

   ```javascript
   const CATEGORY_DESCRIPTIONS = {
     Desktop:
       "GNOME desktop environment, Aurora variant (KDE), and terminal enhancements",
     Development: "Development tools and IDE integrations",
     // ... etc
   };
   ```

3. **Modify markdown generator:**
   - Update `generateCategorySection()` to inject descriptions
   - Format: `## Category Name\n\n*Description text*\n\n### Planned Work`

4. **Test changes:**

   ```bash
   npm run generate-report -- --month=2026-01
   npm run generate-report -- --month=2025-12
   ```

5. **Verify results:**
   - Check that `aarch64` PRs appear in Hardware section
   - Check that `kind/parity` PRs appear in Tech Debt section
   - Check that "Other" section is further reduced
   - Check that category descriptions render correctly

6. **Preview in browser:**
   ```bash
   npm run start
   # Navigate to /reports and verify formatting
   ```

## Success Criteria

- [ ] `aarch64` label mapped to Hardware category
- [ ] `kind/parity` label mapped to Tech Debt category
- [ ] All category sections have italic descriptions
- [ ] "Other" section reduced by items now in Hardware/Tech Debt
- [ ] Reports regenerate without errors
- [ ] Descriptions render correctly in browser
- [ ] Git commit follows conventional commit format

## Expected Impact

- **"Other" section reduction:** Additional ~2-5% reduction (depends on aarch64/parity PR count)
- **Improved clarity:** Category descriptions help readers understand what types of work fall under each area
- **Better organization:** All relevant `area/*` labels now properly categorized

## Notes

- This follows the pattern established in commit `e568ef8` (translation label implementation)
- Maintains the "no emojis in headers" rule from commit `e417e45`
- Category descriptions should use **italic** format (`*text*`) not bold
- Keep "New Lights" section name unchanged (Guardian theme)

## References

- Label mapping: `scripts/lib/label-mapping.mjs`
- Markdown generator: `scripts/lib/markdown-generator.mjs`
- GitHub labels: https://github.com/projectbluefin/common/labels
- Previous work: `.planning/translation-label-proposal.md`
