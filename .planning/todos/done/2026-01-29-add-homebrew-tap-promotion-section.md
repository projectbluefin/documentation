---
created: 2026-01-29T02:24
title: Add homebrew tap promotion section
area: docs
files:
  - docs/[homebrew-related-page].md
---

## Problem

Need to add a new section to the homebrew documentation that outlines which brew packages got promoted from the experimental tap to the production tap. This helps users understand what packages are now production-ready and how to access the tap.

The section should:

- Show which packages were promoted from experimental to production
- Include a link to http://github.com/ublue-os/homebrew-tap
- Use specific wording: "Use `ujust bbrew` to browse and install these packages. Follow [the tap instructions] if you want to do it by hand."

## Solution

1. Identify the correct documentation page for homebrew content (likely `docs/tips.md` or a dedicated homebrew page)
2. Add a new section with a box/callout explaining the promotion concept
3. List promoted packages (needs research into what packages were promoted)
4. Add the specified wording with link to the tap repository
5. Ensure formatting matches existing documentation style
