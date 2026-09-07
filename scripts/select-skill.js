#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_INDEX = path.join(
  __dirname,
  "..",
  "static",
  "skills",
  "index.json",
);
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

function tokenize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));
}

function rankSkill(skill, queryTokens) {
  let score = 0;
  const matchedTriggers = [];
  const matchedTags = [];

  const nameTokens = tokenize(skill.name);
  const tagTokens = (skill.tags || []).flatMap((t) => tokenize(t));
  const triggerTokens = (skill.triggers || []).flatMap((t) => tokenize(t));
  const descTokens = tokenize(skill.description);

  for (const token of queryTokens) {
    if (nameTokens.includes(token)) score += 10;
    if (tagTokens.includes(token)) {
      score += 8;
      matchedTags.push(token);
    }
    if (triggerTokens.includes(token)) {
      score += 6;
      matchedTriggers.push(token);
    }
    if (descTokens.includes(token)) score += 2;
  }

  return {
    score,
    skill,
    matchedTriggers,
    matchedTags,
  };
}

function selectSkills(query, catalogPath = DEFAULT_INDEX) {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      `Skills index not found at ${catalogPath}. Run scripts/validate-skills.mjs first.`,
    );
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const tokens = tokenize(query);

  const scored = (catalog.skills || [])
    .map((s) => rankSkill(s, tokens))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    query,
    count: scored.length,
    matches: scored.map((r) => ({
      score: r.score,
      id: r.skill.id,
      name: r.skill.name,
      entry_point: r.skill.entry_point,
      one_line_purpose: r.skill.one_line_purpose,
    })),
  };
}

if (require.main === module) {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) {
    console.error("Usage: node scripts/select-skill.js <search query>");
    process.exit(1);
  }
  const result = selectSkills(query);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { selectSkills, tokenize, rankSkill };
