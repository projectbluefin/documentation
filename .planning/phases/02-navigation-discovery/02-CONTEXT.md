# Phase 2: Navigation & Discovery - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate biweekly reports into site navigation and make them discoverable through cross-links, search, and RSS. Phase 1 created the `/reports` route with navbar link and RSS feed — this phase focuses on connecting reports to the rest of the site ecosystem (changelogs, blog, homepage) and ensuring discoverability.

</domain>

<decisions>
## Implementation Decisions

### Cross-linking Strategy

- **Changelogs ↔ Reports:** Prominent intro sections on both pages explaining the relationship
  - Changelogs page gets intro: "Want to see what we're working on? Check Reports"
  - Reports page gets intro: "Looking for release notes? Check Changelogs"
  - They tell complementary but distinct stories (changelogs = OS releases, reports = project management activity)
- **Blog → Reports:** Relevant blog posts only should link to reports (not all posts, avoid retrofitting old content)
- **Reports → Content:** Consistent footer in every report linking back to changelogs and blog
  - Example: "See the [latest changelog](/changelogs) for OS releases, or read our [blog](/blog) for announcements"

### Homepage Presence

- **Navigation order:** Blog, Changelogs, Reports, Discussions, Feedback, Store
- **Same order on mobile:** Consistent across desktop and mobile for clarity
- **No homepage content section:** Navbar link is sufficient, keep homepage focused on core docs/features
- **Mobile responsive:** Standard Docusaurus responsive layout (no special mobile treatment needed)

### Discovery & Onboarding

- **RSS promotion:** Subtle mention (small RSS link in footer or sidebar)
  - **Important:** Check existing blog RSS treatment and match it for consistency
- **First-time visitor:** Static intro paragraph at top of `/reports` page
  - Placeholder text (a few sentences): "Biweekly reports show completed work from our project board..."
  - User will fill in final copy later
- **Empty state:** Create a real test report during implementation (don't rely on empty state)
  - Plan for backfill capability to be executed later (after Phase 3 complete, noted as future task)
- **Documentation:** No dedicated docs page — keep it simple, intro paragraph is enough

### Navigation Placement & Labeling

- **Label:** "Reports" (simple and clear)
- **Styling:** No special styling — consistent with other nav links
- **Search integration:** Label search results as "Report • [Date]" to distinguish from blog posts
  - Ensure reports are indexed and searchable by Docusaurus

### Claude's Discretion

- Mobile menu structure (grouping, separators, spacing)
- Exact wording of cross-link intro sections
- RSS link placement and styling (match blog implementation)
- Search result formatting details

</decisions>

<specifics>
## Specific Ideas

- Navigation order is explicit and intentional: Blog, Changelogs, Reports, Discussions, Feedback, Store
- Complementary narrative between changelogs and reports: "changelogs = technical release notes, reports = project management summaries"
- User will write final intro paragraph copy after seeing placeholder in context

</specifics>

<deferred>
## Deferred Ideas

- Backfill historical reports — Execute after Phase 3 complete (noted as future task, not in Phase 2 scope)

</deferred>

---

_Phase: 02-navigation-discovery_
_Context gathered: 2026-01-26_
