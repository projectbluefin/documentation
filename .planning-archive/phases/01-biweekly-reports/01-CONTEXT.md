# Phase 1: Biweekly Reports - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish infrastructure to automatically generate biweekly status reports from GitHub Project Board data and publish them as a Docusaurus blog. Reports are 100% automated - no manual curation.

</domain>

<decisions>
## Implementation Decisions

### Data Source

- **Primary source:** GitHub Project Board at `https://github.com/orgs/projectbluefin/projects/2`
- **Time window:** 2-week periods (biweekly, not weekly)
- **Tracked repositories:**
  - `projectbluefin/common`
  - `projectbluefin/dakota`
  - `ublue-os/bluefin`
  - `ublue-os/bluefin-lts`

### Report Timing & Filtering

- **Publishing schedule:** Every other Monday (biweekly)
- **Time window:** 2-week period ending on Sunday before publication Monday
- **Column filtering:**
  - Primary: Items moved to "Done" column during 2-week period
  - Secondary: Large work in "In Progress" (size:M or larger PRs)
  - Focus: Completed work is primary, in-progress is supplementary context
- **Item types tracked:** Issues, Pull Requests (both linked and standalone)

### Report Structure

- **Format:** Separate Docusaurus blog instance (configured via `docusaurus.config.ts`)
- **Route:** `/reports` (distinct from main `/blog`)
- **Generation:** 100% automated - script generates complete markdown files
- **Publishing:** Auto-posted every other Monday (no manual intervention)
- **RSS Feed:** Separate feed from main blog (standard Docusaurus blog plugin behavior)
- **Categories:** Determined by GitHub label prefixes from `projectbluefin/common` convention:
  - `area/gnome`, `area/aurora`, `area/bling` → "🖥️ Desktop"
  - `area/dx`, `area/buildstream`, `area/finpilot` → "🛠️ Development"
  - `area/brew`, `area/just`, `area/bluespeed` → "📦 Ecosystem"
  - `area/services`, `area/policy` → "⚙️ System Services & Policies"
  - `area/iso`, `area/upstream` → "🏗️ Infrastructure"
  - `kind/bug` → "🔧 Bug Fixes"
  - `kind/enhancement` → "🚀 Enhancements"
  - `kind/documentation` → "📚 Documentation"
  - `kind/tech-debt` → "🧹 Tech Debt"
  - Uncategorized → "📋 Other"

### Label Badge Formatting

- **Style:** Shields.io badge format matching example
- **Colors:** Static mapping set once from `projectbluefin/common` labels
- **Format:** `[![label-name](https://img.shields.io/badge/label-color?style=flat-square)](label-url)`
- **Graceful degradation:** If label exists on issue but not in mapping, don't display badge
- Multiple labels per category shown inline

### Bot Handling

- **Separation:** Bots get dedicated "🤖 Bot Activity" section
- **Presentation:** Aggregate table summary (by repository, by bot type)
- **Detail:** Collapsible section with full bot PR list
- **Identification:** By username patterns (e.g., `ubot-7274`, `renovate`, GitHub Actions accounts)
- **Focus:** Human contributions are primary; bot activity is supporting context

### Contributor Tracking

- **New contributors:** First-time contributors across ALL tracked repos
- **Detection:** Track historical contributor list across all 4 repositories
- **Highlight:** Special "🎉 New Contributors" subsection with welcome message
- **Attribution:** Show contributor GitHub username with link for all human contributions

### Report Content Sections

1. **Summary** - Total items completed, contributor count, new contributors
2. **Categorized work** - Issues/PRs grouped by label categories with badges
3. **Bot activity** - Separate aggregate summary table + collapsible details
4. **Contributors** - Thank you list + new contributor highlights

### Automation Requirements

- **Trigger:** Every other Monday (biweekly schedule)
- **Process:** Fetch board data → Generate markdown → Create blog post → Commit to repo
- **Zero manual steps** - Fully automated end-to-end
- **Error handling:** Graceful failures (skip report if data unavailable, alert maintainers)

### Claude's Discretion

- Historical contributor storage format (JSON file, database, or fetch each time)
- Bot username detection patterns (regex or list)
- Markdown frontmatter schema (date, title, tags)
- Report filename convention (date-based naming)
- Exact Monday calculation for biweekly schedule (start date, algorithm)

</decisions>

<specifics>
## Specific Ideas

**Reference format:** https://github.com/projectbluefin/common/issues/166

- Exact structure to follow (sections, formatting, emoji usage)
- Badge style matches example precisely
- "Generated on [date]" footer with board/issue links
- Collapsible `<details>` for bot PR lists
- Table format for bot activity summary

**Label source:** `projectbluefin/common` repository labels

- Authoritative source for label names, colors, and prefixes
- Maintain consistency with project board visual identity

**Blog implementation:** Standard Docusaurus blog plugin (separate instance)

- Reports live at `/reports` route (not `/blog`)
- Configured as second blog instance in `docusaurus.config.ts` following Docusaurus multi-blog pattern
- Markdown files with frontmatter (date, title, authors, tags)
- Auto-generated content, no manual editing expected
- Separate RSS feed automatically generated by Docusaurus

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

Full automation means:

- No manual narrative writing (unlike original hybrid model)
- No author attribution in frontmatter (system-generated)
- No editorial curation (board state is truth)

</deferred>

---

_Phase: 01-biweekly-reports_
_Context gathered: 2026-01-27_
