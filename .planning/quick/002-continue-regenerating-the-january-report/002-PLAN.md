---
quick_task: 002
type: execute
autonomous: true
files_modified:
  - reports/2026-01-31-report.mdx
  - static/data/contributors-history.json

context_budget: ~30%
---

<objective>
Regenerate the January 2026 monthly report with the improved report structure that separates planned vs opportunistic work, uses projectbluefin/common for planned work tracking, and implements the new categorization system (Focus Area and Work by Type).

Purpose: Update the existing January report to match the current report format with all improvements merged since the original report was generated.

Output: Regenerated January 2026 report with improved structure and accurate categorization.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md
@.github/workflows/monthly-reports.yml
@scripts/generate-report.mjs
@scripts/lib/markdown-generator.mjs
@scripts/lib/graphql-queries.mjs
@scripts/lib/label-mapping.mjs
@scripts/lib/contributor-tracker.mjs
@reports/2026-01-31-report.mdx
</context>

<background>
The January 2026 report was generated before several key improvements were made to the monthly reports system:

1. **Planned vs Opportunistic split**: PR #586 added subsections within each category to separate planned work (from projectbluefin/common) from opportunistic work (from other monitored repos)
2. **Using projectbluefin/common**: PR #587 switched to use projectbluefin/common as the source of planned work instead of ublue-os/bluefin
3. **Better categorization**: Focus Area (area/ labels) and Work by Type (kind/ labels) are now clearly separated
4. **ES module fix**: PR #587 fixed .mjs extensions for proper ES module support

The current January report needs to be regenerated to include these structural improvements and accurate categorization.

Quick task 001 already fixed the ES module issues and unblocked the workflow, so we can now regenerate the report.
</background>

<tasks>

<task type="auto">
  <name>Regenerate January 2026 report with improved structure</name>
  <files>reports/2026-01-31-report.mdx, static/data/contributors-history.json</files>
  <action>
    1. Set GITHUB_TOKEN environment variable for API access:
       ```bash
       export GITHUB_TOKEN=$GH_TOKEN
       ```
    
    2. Regenerate the January 2026 report using the updated scripts:
       ```bash
       npm run generate-report
       ```
       
       This will:
       - Fetch planned work from projectbluefin/common (merged PRs in January 2026)
       - Fetch opportunistic work from other monitored repos
       - Apply new categorization (Focus Area vs Work by Type)
       - Split each category into Planned and Opportunistic subsections
       - Update contributor history with proper bot filtering
       - Generate report with new structure matching reference format
    
    3. Verify the regenerated report has the expected improvements:
       ```bash
       # Check for "Planned Work" and "Opportunistic Work" subsections
       grep -c "📋 Planned Work" reports/2026-01-31-report.mdx
       grep -c "⚡ Opportunistic Work" reports/2026-01-31-report.mdx
       
       # Check for "Focus Area" and "Work by Type" headers
       grep -c "# Focus Area" reports/2026-01-31-report.mdx
       grep -c "# Work by Type" reports/2026-01-31-report.mdx
       
       # Verify frontmatter includes GitHubProfileCard import
       head -10 reports/2026-01-31-report.mdx
       ```
    
    4. Verify report builds successfully:
       ```bash
       npm run build
       ```
    
    The regenerated report should now match the improved structure with planned vs opportunistic subsections, proper categorization, and all the enhancements made in PRs #586 and #587.
  </action>
  <verify>
    - `npm run generate-report` completes successfully
    - Report file `reports/2026-01-31-report.mdx` is updated with new structure
    - Grep commands show presence of planned/opportunistic subsections
    - `npm run build` passes without errors
  </verify>
  <done>
    January 2026 report regenerated with improved structure: planned vs opportunistic subsections in all categories, Focus Area and Work by Type sections, and accurate categorization using projectbluefin/common as planned work source.
  </done>
</task>

<task type="auto">
  <name>Commit regenerated report</name>
  <files>reports/2026-01-31-report.mdx, static/data/contributors-history.json</files>
  <action>
    Commit the regenerated January report using conventional commit format:
    
    ```bash
    git add reports/2026-01-31-report.mdx static/data/contributors-history.json
    git commit -m "docs(reports): regenerate January 2026 report with improved structure

    Regenerate January 2026 monthly report to include structural improvements:
    - Split categories into Planned vs Opportunistic subsections
    - Use projectbluefin/common for planned work tracking
    - Separate Focus Area (area/ labels) from Work by Type (kind/ labels)
    - Apply proper bot filtering and new contributor highlighting

    Previous report was generated before PRs #586 and #587 were merged.
    This regeneration brings the January report up to date with current format.

    Refs: #586, #587"
    ```

    Note: This is a documentation update to an existing report, not a new report generation. Do NOT push to remote or create a PR - this is just updating the local report to match the current format.

  </action>
  <verify>
    - `git status` shows clean working directory after commit
    - `git log -1 --stat` shows both report files in commit
    - Commit message follows conventional commit format
  </verify>
  <done>
    Regenerated January report committed with clear explanation of improvements and references to source PRs.
  </done>
</task>

</tasks>

<verification>
After completion:
1. January 2026 report file updated with improved structure
2. Report includes planned vs opportunistic subsections
3. Focus Area and Work by Type sections properly separated
4. Report builds successfully with no errors
5. Changes committed with conventional commit message
</verification>

<success_criteria>

- [ ] `npm run generate-report` completes successfully
- [ ] Report contains "📋 Planned Work" and "⚡ Opportunistic Work" subsections
- [ ] Report contains "# Focus Area" and "# Work by Type" section headers
- [ ] `npm run build` passes without errors
- [ ] Changes committed with proper conventional commit message
- [ ] No runtime errors or missing data
      </success_criteria>

<output>
After completion, create `.planning/quick/002-continue-regenerating-the-january-report/002-SUMMARY.md`
</output>
