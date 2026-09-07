#!/usr/bin/env bash
set -euo pipefail

# Validates frontmatter, required sections, and router indexing for all skills in docs/skills/
node "$(dirname "$0")/validate-skills.mjs"
