---
name: write-a-skill
version: "1.0"
last_updated: "2026-09-06"
id: write-a-skill
one_line_purpose: Author a new skill doc following front-matter and size rules.
entry_point: docs/skills/write-a-skill.md
category: meta
status: active
tags: [skills, authoring, documentation]
description: >-
  Author a new agent skill for projectbluefin/documentation. Covers
  front-matter, size budget, canonical linking, verification sections, and the
  skill-update mandate. Use when creating a new docs/skills/*.md file.
metadata:
  type: procedure
---

# Writing a Skill

A skill is an agent-facing markdown file in `docs/skills/*.md` that records how
to work safely in a specific domain in this repository. Every agent session that
introduces a new domain or discovers a durable pattern must write or update one.

## When to Use

- Creating a new skill file under `docs/skills/*.md`.
- Updating skill front-matter, description, or structure.
- Verifying skills against repository and factory agentic standards.

## When NOT to Use

- Writing general end-user documentation — see `docs/contributing.md`.
- Writing or formatting blog posts — see [`blog-posts.md`](blog-posts.md).

## Core Process

1. **Verify need**: Create a new skill only when a non-obvious, repeatable domain has no existing home in `docs/skills/`.
2. **Required front-matter**: Every skill must begin with:
   ```yaml
   ---
   name: <kebab-case-name>
   version: "1.0"
   last_updated: "YYYY-MM-DD"
   id: <kebab-case-name>
   one_line_purpose: <short imperative summary <=120 chars>
   entry_point: docs/skills/<name>.md
   category: <meta | test-authoring | ci-ops>
   status: active
   tags: [tag1, tag2, tag3]
   description: >-
     <Capability first sentence>. Use when <trigger phrases>.
   metadata:
     type: <procedure | reference | runbook | policy>
   ---
   ```
3. **Description rules**: Keep description under 256 characters. Start with a third-person capability sentence, followed by "Use when ...".
4. **Size budget**: Soft max 200 lines, hard max 500 lines.
5. **Required body sections**:
   - `## When to Use`
   - `## When NOT to Use`
   - `## Core Process`
   - `## Common Rationalizations`
   - `## Red Flags`
   - `## Verification`
   - `## Sources`
6. **Update router**: Add the new skill to the table in `docs/SKILL.md` in the same commit.
7. **Verification**: Run `npm test` and `bash scripts/check-skill-frontmatter.sh` to ensure all checks pass.

## Common Rationalizations

| Rationalization                                            | Reality                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| "A description over 256 chars provides better detail."     | Truncated descriptions break agent selection; keep it tight and put detail in body.   |
| "I'll create a skill file and update docs/SKILL.md later." | A skill not listed in the router is invisible to future agents. Update both together. |
| "I can skip the Verification section for simple skills."   | Exit criteria are mandatory so agents know when the task is truly done.               |

## Red Flags

- A skill missing required front-matter keys (`name`, `version`, `last_updated`, `tags`, `description`, `metadata.type`).
- Description exceeding 256 characters.
- Skill file exceeding 200 lines without splitting or trimming.
- A skill file omitted from the `docs/SKILL.md` index table.

## Verification

- [ ] All front-matter fields present and valid.
- [ ] Description is at most 256 characters.
- [ ] Body contains all required sections (`When to Use`, `When NOT to Use`, `Core Process`, `Common Rationalizations`, `Red Flags`, `Verification`, `Sources`).
- [ ] `docs/SKILL.md` includes a markdown link to the new skill.
- [ ] `npm test` passes all tests, including skill hygiene checks.

## Sources

- `docs/SKILL.md`
- `projectbluefin/common` → `docs/skills/write-a-skill.md`
- [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md)
