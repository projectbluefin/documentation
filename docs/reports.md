---
sidebar_position: 6
title: Biweekly Reports
---

# Biweekly Reports

Biweekly reports provide transparent, data-driven summaries of completed work, active contributors, and project momentum from the [Bluefin Project Board](https://todo.projectbluefin.io).

## What Are Biweekly Reports?

Biweekly reports are automatically generated every other week, summarizing:

- **Completed Work:** Items moved to "Done" on the project board, categorized by area and type
- **Contributors:** Everyone who contributed during the period, with special recognition for first-time contributors
- **Bot Activity:** Automated dependency updates and maintenance tasks
- **Project Status:** ChillOps philosophy indicators for each project area

Reports are published every other Monday covering the previous two-week period.

## ChillOps Philosophy

Bluefin follows a "ChillOps" development philosophy:

- **No artificial urgency:** Work progresses at sustainable pace
- **Quality over velocity:** Thoughtful development beats rushed releases
- **Community-driven:** Contributors work on what interests them
- **Transparent:** All work visible on public project board

When a project area shows "Status: ChillOps" in reports, it means work is progressing steadily without pressure or burnout.

## Report Sections Explained

### Summary

Quick overview with key metrics:

- ISO week numbers covered
- Total items completed
- Contributor count
- New contributors this period

### Project Areas

Work categorized by system area:

- **Desktop:** GNOME, Aurora, Bling (visual enhancements)
- **Development:** Developer experience (DX) improvements
- **Ecosystem:** Homebrew, Flatpak, system tooling
- **Hardware:** Device support, NVIDIA drivers
- **Infrastructure:** Build system, testing, automation

Each area shows status badges and completed items with GitHub links.

### Work Types

Items categorized by nature of work:

- **Bug Fixes:** Issues resolved
- **Enhancements:** New features and improvements
- **Documentation:** Docs updates and guides
- **Tech Debt:** Refactoring and cleanup
- **Automation:** CI/CD and tooling

### Bot Activity

Automated maintenance tasks performed by bots:

- Dependency updates (Dependabot, Renovate)
- Automated builds and tests
- Version bumps

Shown separately from human contributions to highlight community work.

### Contributors

Recognition for everyone who contributed:

- GitHub usernames with profile links
- First-time contributors highlighted with profile cards
- Tracked across all Bluefin repositories

## How Reports Differ from Changelogs and Blog

Understanding the content types:

| Content Type   | Purpose                                | Frequency   | Source                   |
| -------------- | -------------------------------------- | ----------- | ------------------------ |
| **Changelogs** | OS release notes with package versions | Per release | GitHub Releases          |
| **Blog Posts** | Deep dives, announcements, tutorials   | Ad-hoc      | Manual authoring         |
| **Reports**    | Project activity summaries             | Biweekly    | Project board automation |

**Use changelogs** to see what changed in a specific OS release.  
**Use blog posts** for detailed explanations and guides.  
**Use reports** to track project momentum and contributor activity.

## Where to Find Reports

- **Website:** Browse all reports at [/reports](/reports)
- **RSS Feed:** Subscribe at [/reports/rss.xml](/reports/rss.xml)
- **Navigation:** Access via "Reports" link in main navigation

## Automated Generation

Reports are 100% automatically generated from the project board:

1. Every other Monday at 10:00 UTC
2. GitHub Actions workflow fetches project board data
3. Script categorizes completed items by labels
4. Markdown report generated and committed
5. Site rebuilds and deploys automatically

No manual curation or editing. What you see reflects actual project board state.

## Learn More

- **Project Board:** [todo.projectbluefin.io](https://todo.projectbluefin.io)
- **Report Issues:** [GitHub Issues](https://github.com/projectbluefin/common/issues/new)
- **Developer Docs:** See AGENTS.md in documentation repository for technical details

---

_Reports provide transparency into Bluefin's development process. For OS release details, see [Changelogs](/changelogs). For announcements and tutorials, read our [Blog](/blog)._
