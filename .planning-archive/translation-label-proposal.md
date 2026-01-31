# Translation Label Proposal

## ✅ STATUS: IMPLEMENTED (January 28, 2026)

**Implementation commit:** e568ef8  
**GitHub label:** https://github.com/projectbluefin/common/labels/kind%2Ftranslation  
**Report preview:** January 2026 report shows new "🌍 Localization" section with 2 PRs

---

## Executive Summary

Proposal to add a `kind/translation` label to better categorize localization and internationalization work in monthly reports and issue tracking.

**✅ APPROVED AND IMPLEMENTED** - Purple color (`8B5CF6`) approved, no dual-labeling with `kind/enhancement`

## Problem Statement

Currently, translation/localization PRs are categorized as `kind/enhancement` and end up in the "Other" section of monthly reports because they don't fit existing categories. This makes it harder to:

1. Track localization efforts across the project
2. Recognize community contributions in translation work
3. Identify i18n gaps in monthly reports

## Evidence from January 2026 Report

**Current State:**

- 2 translation PRs found in "Other" section
- Both labeled as `kind/enhancement` (not specific enough)
- No dedicated category for i18n/l10n work

**Examples:**

1. **#175** - Add Polish translation to curated.yaml
   - Author: @Micro856
   - Current label: `kind/enhancement`
   - Location: Other section

2. **#143** - Adds french translation to the desktop files
   - Author: @theMimolet
   - Current labels: `kind/enhancement`, `size/XS`
   - Location: Other section

## Proposed Solution

### Label Specification

**Name:** `kind/translation`

**Color:** `8B5CF6` (purple - distinct from existing colors, represents internationalization)

**Description:** "Translation and localization work (i18n/l10n)"

**Category:** New section in reports: "🌍 Localization"

### Color Rationale

Purple (`8B5CF6`) was chosen because:

- Visually distinct from existing `kind/` labels
- Not used elsewhere in current label scheme
- Purple commonly associated with internationalization in UI design
- Good contrast in both light and dark modes
- Similar saturation to other kind/ labels

**Color Comparison:**

```
kind/bug:          E8590C (orange-red)
kind/enhancement:  17A2B8 (teal)
kind/documentation: 0066FF (blue)
kind/tech-debt:    D4A259 (tan)
kind/automation:   5B8BC1 (light blue)
kind/translation:  8B5CF6 (purple) ← NEW
```

## Implementation Plan

### Phase 1: Label Creation (5 minutes)

Create label in projectbluefin/common repository:

```bash
gh api repos/projectbluefin/common/labels \
  -f name="kind/translation" \
  -f color="8B5CF6" \
  -f description="Translation and localization work (i18n/l10n)"
```

### Phase 2: Update Label Mapping Configuration (5 minutes)

Edit `scripts/lib/label-mapping.mjs`:

```javascript
export const LABEL_COLORS = {
  // ... existing colors ...
  "kind/translation": "8B5CF6",
};

export const LABEL_CATEGORIES = {
  // ... existing categories ...
  "🌍 Localization": ["kind/translation"],
};
```

### Phase 3: Retroactive Labeling (10 minutes)

Apply label to existing January 2026 translation PRs:

```bash
gh pr edit 175 --repo projectbluefin/common --add-label "kind/translation"
gh pr edit 143 --repo projectbluefin/common --add-label "kind/translation"
```

**Note:** Keep `kind/enhancement` label as well (PRs can have multiple kind/ labels).

### Phase 4: Regenerate Reports (5 minutes)

```bash
npm run generate-report -- --month=2026-01
```

Verify new "🌍 Localization" section appears with 2 PRs.

### Phase 5: Documentation (5 minutes)

Update relevant documentation:

- `AGENTS.md` - Add translation label to Monthly Reports section
- `.planning/unlabelled-pr-analysis-2026-01.md` - Mark as implemented

## Expected Impact

### Monthly Reports

- **Before:** 2 translation PRs in "Other" section
- **After:** 2 translation PRs in new "🌍 Localization" section
- **Reduction:** 2.4% reduction in "Other" category (2 of 83 items)

### Long-term Benefits

- Better visibility for i18n/l10n contributions
- Easier tracking of localization progress
- Encourages more translation contributions
- Clearer categorization in project board

## Scope and Applicability

### What Gets This Label

- ✅ Adding/updating .po/.pot translation files
- ✅ Desktop file translations (Name[locale]=)
- ✅ Curated app translations in YAML
- ✅ Documentation translations
- ✅ UI string translations

### What Doesn't Get This Label

- ❌ Adding English-only documentation (use `kind/documentation`)
- ❌ Internationalization infrastructure (use `kind/enhancement` + `area/buildstream`)
- ❌ Font additions for non-Latin scripts (use `area/gnome` or `area/aurora`)

## Alternative Options Considered

### Option 1: Use `kind/enhancement` (Current State)

- **Pros:** No changes needed
- **Cons:** Translation work gets lost in noise, no visibility

### Option 2: Use `kind/documentation`

- **Pros:** Reuses existing label
- **Cons:** Translation is distinct from documentation writing

### Option 3: Create `area/i18n` label

- **Pros:** Groups infrastructure + translations
- **Cons:** Mixes two different concerns (infrastructure vs. content)

### Option 4: New label `kind/translation` (RECOMMENDED)

- **Pros:** Clear categorization, dedicated section in reports, encourages contributions
- **Cons:** Adds one more label to maintain

## Risk Assessment

**Low Risk:**

- Single label addition
- Backward compatible (doesn't break existing workflows)
- Easy to revert if not useful
- No infrastructure dependencies

**Testing:**

- Create label in test environment
- Apply to test PRs
- Regenerate report
- Verify rendering

## Timeline

**Total Time:** ~30 minutes

1. **Label Creation:** 5 minutes
2. **Config Update:** 5 minutes
3. **Retroactive Labeling:** 10 minutes
4. **Report Regeneration:** 5 minutes
5. **Documentation:** 5 minutes

## Success Metrics

### Immediate (Week 1)

- ✅ Label created in GitHub
- ✅ Config updated in docs repo
- ✅ January 2026 report shows "🌍 Localization" section
- ✅ 2 PRs properly categorized

### Short-term (Month 1)

- All new translation PRs receive `kind/translation` label
- Contributors aware of label (via CONTRIBUTING.md or issue templates)

### Long-term (6 Months)

- Track translation coverage across supported languages
- Measure increase in translation contributions
- Evaluate if label should expand to cover i18n infrastructure

## Next Steps

1. **Decision:** Get approval from maintainers
2. **Create:** Add label to projectbluefin/common
3. **Configure:** Update label mapping
4. **Apply:** Label existing PRs
5. **Regenerate:** Update January 2026 report
6. **Document:** Update AGENTS.md
7. **Commit:** Push all changes
8. **Monitor:** Track usage over next month

## Questions for Maintainers

1. **✅ Approve color choice?** Purple (`8B5CF6`) - APPROVED
2. **✅ Approve label name?** `kind/translation` - APPROVED
3. **✅ Should we keep `kind/enhancement` on translation PRs?** NO - Single label only
4. **Any existing translation guidelines?** Not applicable

## Implementation Results

**Label Created:**

- URL: https://github.com/projectbluefin/common/labels/kind%2Ftranslation
- Color: 8B5CF6 (purple)
- Description: Translation and localization work (i18n/l10n)

**PRs Updated:**

- #175 (Polish translation): ✅ Labeled, `kind/enhancement` removed
- #143 (French translation): ✅ Labeled, `kind/enhancement` removed

**Reports Updated:**

- January 2026: ✅ New "🌍 Localization" section with 2 PRs
- Other section: Reduced from 83 to 79 items

**Configuration Updated:**

- `scripts/lib/label-mapping.mjs`: ✅ Color and category added
- `reports/2026-01-31-report.mdx`: ✅ Regenerated with new section

## Related Documents

- `.planning/unlabelled-pr-analysis-2026-01.md` - Original analysis identifying need
- `scripts/lib/label-mapping.mjs` - Configuration file (UPDATED)
- `reports/2026-01-31-report.mdx` - Report (UPDATED)
- Commit e568ef8 - Implementation commit

---

**Author:** OpenCode (Claude Sonnet 4.5 via GitHub Copilot)  
**Date:** January 28, 2026  
**Status:** ✅ IMPLEMENTED - All phases complete
