#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "docs", "skills");
const SKILL_ROUTER = path.join(ROOT, "docs", "SKILL.md");
const OUTPUT_INDEX = path.join(ROOT, "static", "skills", "index.json");

const REQUIRED_HEADINGS = [
  "When to Use",
  "When NOT to Use",
  "Core Process",
  "Common Rationalizations",
  "Red Flags",
  "Verification",
  "Sources",
];

export function parseSimpleYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      let val = match[2].trim();
      if (val === ">-" || val === ">" || val === "|") {
        result[currentKey] = "";
      } else if (val.startsWith("[") && val.endsWith("]")) {
        result[currentKey] = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
      } else {
        result[currentKey] = val.replace(/^['"]|['"]$/g, "");
      }
    } else if (currentKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      if (typeof result[currentKey] === "string") {
        result[currentKey] += (result[currentKey] ? " " : "") + line.trim();
      }
    }
  }
  return result;
}

export function validateSkillFile(filePath, routerContent) {
  const errors = [];
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);
  const relPath = path.relative(ROOT, filePath);

  const lines = content.split(/\r?\n/);
  if (lines.length > 500) {
    errors.push(
      `${fileName}: exceeds hard line budget of 500 lines (${lines.length} lines)`,
    );
  }

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    errors.push(`${fileName}: missing YAML frontmatter`);
    return { valid: false, errors };
  }

  const fm = parseSimpleYaml(fmMatch[1]);
  if (!fm.name) errors.push(`${fileName}: missing frontmatter 'name'`);
  if (!fm.description)
    errors.push(`${fileName}: missing frontmatter 'description'`);

  for (const heading of REQUIRED_HEADINGS) {
    const headingRegex = new RegExp(`^##\\s+${heading}\\b`, "m");
    if (!headingRegex.test(content)) {
      errors.push(`${fileName}: missing required section '## ${heading}'`);
    }
  }

  if (routerContent && !routerContent.includes(fileName)) {
    errors.push(`${fileName}: not listed in docs/SKILL.md router`);
  }

  const skillMeta = {
    id: fm.id || fm.name || fileName.replace(/\.md$/, ""),
    name: fm.name || fileName.replace(/\.md$/, ""),
    description: fm.description || "",
    one_line_purpose: fm.one_line_purpose || fm.description || "",
    entry_point: relPath,
    category: fm.category || "general",
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    status: fm.status || "active",
    triggers: [],
  };

  if (fm.description) {
    const useWhen = fm.description.match(/Use when\s+([^.]+)/i);
    if (useWhen) {
      skillMeta.triggers.push(useWhen[1].trim());
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    skillMeta,
  };
}

export function validateAllSkills() {
  const routerContent = fs.existsSync(SKILL_ROUTER)
    ? fs.readFileSync(SKILL_ROUTER, "utf8")
    : "";
  const files = fs
    .readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const allErrors = [];
  const skills = [];

  for (const file of files) {
    const fullPath = path.join(SKILLS_DIR, file);
    const res = validateSkillFile(fullPath, routerContent);
    if (!res.valid) {
      allErrors.push(...res.errors);
    }
    if (res.skillMeta) {
      skills.push(res.skillMeta);
    }
  }

  if (allErrors.length > 0) {
    console.error(
      "Skill validation failed with errors:\n" + allErrors.join("\n"),
    );
    return { success: false, errors: allErrors, skills };
  }

  fs.mkdirSync(path.dirname(OUTPUT_INDEX), { recursive: true });
  fs.writeFileSync(
    OUTPUT_INDEX,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        count: skills.length,
        skills,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `Successfully validated ${skills.length} skills and generated ${OUTPUT_INDEX}`,
  );
  return { success: true, errors: [], skills };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { success } = validateAllSkills();
  process.exitCode = success ? 0 : 1;
}
