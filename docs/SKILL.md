---
title: Skill router
slug: /SKILL
---

# Skill router

Task → skill. Load only what the task needs.

| If your task is…                                      | Load                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Adding or changing a React component                  | [`skills/component-testing.md`](skills/component-testing.md)                                |
| Editing `/factory` dashboard panels or copy           | [`skills/factory-dashboard-content.md`](skills/factory-dashboard-content.md)                |
| Changing the generated release card PNGs              | [`skills/release-card-images.md`](skills/release-card-images.md)                            |
| Verifying, recovering, or archiving a blog discussion | [`skills/giscus-discussions.md`](skills/giscus-discussions.md)                              |
| Landing a pull request, or proving a change is live   | [`skills/shipping-and-verifying.md`](skills/shipping-and-verifying.md)                      |
| Writing back what you learned                         | [`skills/skill-improvement.md`](skills/skill-improvement.md)                                |
| Anything else                                         | [`../AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md) first |

Repository rules, build commands, git workflow, data-pipeline contracts and
presentation rules all live in `AGENTS.md` at the repository root. It is
authoritative; this page only routes.

## Adding a skill

A skill earns a file when it is non-obvious, repeatable, and would otherwise be
rediscovered by the next agent. One page per skill, in `docs/skills/`, added to
the table above in the same pull request.

Note that `docs/` is mounted at `routeBasePath: "/"`, so **everything here
publishes to [docs.projectbluefin.io](https://docs.projectbluefin.io/)**. Write skills for a public
audience. Internal design records belong in `adr/` at the repository root, which
does not publish.
