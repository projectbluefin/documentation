import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";

const readmes = [
  {
    repo: "projectbluefin/server",
    ref: "main",
    readmePath: "README.md",
    output: fileURLToPath(
      new URL("../src/content/server-readme.md", import.meta.url),
    ),
  },
];

// Parse Markdown so links inside code examples are never rewritten.
export async function prepareReadme(markdown, { repo, ref, readmePath }) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkStringify);
  const tree = processor.parse(markdown);
  const imageReferences = new Set();
  const walk = (node, visit) => {
    visit(node);
    node.children?.forEach((child) => walk(child, visit));
  };
  walk(tree, (node) => {
    if (node.type === "imageReference") imageReferences.add(node.identifier);
  });
  const resolve = (value, image) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
    const base = image
      ? `https://raw.githubusercontent.com/${repo}/${ref}/`
      : `https://github.com/${repo}/blob/${ref}/`;
    return new URL(
      value.replace(/^\//, ""),
      value.startsWith("/") ? base : base + readmePath,
    ).href;
  };
  walk(tree, (node) => {
    if (node.url) {
      node.url = resolve(
        node.url,
        node.type === "image" || imageReferences.has(node.identifier),
      );
    }
    if (node.type === "html") {
      node.value = node.value.replace(
        /\s(href|src)=(['"])(.*?)\2/g,
        (_match, name, quote, value) =>
          ` ${name}=${quote}${resolve(value, name === "src")}${quote}`,
      );
    }
  });
  // Outside docs/, Docusaurus's partial loader accepts this per-file format.
  return `---\nmdx:\n  format: md\n---\n\n${processor.stringify(tree)}`;
}

export async function fetchReadme(source, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${source.readmePath}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    if (!markdown.trim()) throw new Error("empty README");
    const content = await prepareReadme(markdown, source);
    await mkdir(dirname(source.output), { recursive: true });
    await writeFile(source.output, content);
    console.log(`README refreshed: ${source.repo}@${source.ref}`);
  } catch (error) {
    console.warn(
      `README unavailable: ${source.repo}: ${error.message}; preserving the existing seed`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await Promise.all(readmes.map((source) => fetchReadme(source)));
}
