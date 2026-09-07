#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build");
const DOCS_DIR = path.join(ROOT, "docs");
const STATIC_DIR = path.join(ROOT, "static");

export function cleanMarkdown(source, title = "") {
  // Strip frontmatter
  let body = source.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  // Replace video tags with markdown link
  body = body.replace(
    /<video\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>[\s\S]*?<\/video>/gi,
    "[Video]($2)",
  );

  const cleanLines = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) inFence = !inFence;
    if (!inFence && /^\s*(?:import\b|export\s+default\b)/.test(line)) continue;
    if (!inFence) {
      // Remove custom React/JSX components like <Tabs>, <TabItem>, etc.
      cleanLines.push(
        line.replace(/<\/?[A-Z][A-Za-z0-9_.-]*(?:\s[^>]*)?\s*\/?>/g, ""),
      );
    } else {
      cleanLines.push(line);
    }
  }

  let res = cleanLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (title && !/^#\s+\S/m.test(res)) {
    res = `# ${title}\n\n${res}`;
  }
  return `${res}\n`;
}

async function walkDocs(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDocs(fullPath, baseDir)));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
    ) {
      files.push({
        fullPath,
        relPath: path.relative(baseDir, fullPath),
      });
    }
  }
  return files;
}

export async function generateMarkdownRoutes() {
  const exists = await fs
    .access(BUILD_DIR)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    console.log(
      "build/ directory does not exist yet; skipping clean .md route generation.",
    );
    return;
  }

  // Ensure build/llms.txt exists
  const staticLlms = path.join(STATIC_DIR, "llms.txt");
  const buildLlms = path.join(BUILD_DIR, "llms.txt");
  if (
    await fs
      .access(staticLlms)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.copyFile(staticLlms, buildLlms);
  }

  const docFiles = await walkDocs(DOCS_DIR);
  let count = 0;

  for (const file of docFiles) {
    const rawContent = await fs.readFile(file.fullPath, "utf8");
    const targetRel = file.relPath.replace(/\.mdx$/, ".md");
    const targetPath = path.join(BUILD_DIR, targetRel);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const cleaned = cleanMarkdown(rawContent);
    await fs.writeFile(targetPath, cleaned, "utf8");
    count++;
  }

  console.log(
    `Successfully generated /llms.txt and ${count} clean .md routes in build/`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateMarkdownRoutes().catch((err) => {
    console.error("Error generating clean markdown routes:", err);
    process.exit(1);
  });
}
