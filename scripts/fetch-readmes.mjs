import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import identities from "../src/components/image-identities.json" with { type: "json" };

const readmes = Object.entries(identities).map(([product, identity]) => ({
  product,
  repo: identity.repo,
  ref: identity.ref,
  readmePath: "README.md",
  output: fileURLToPath(
    new URL(`../src/content/${product}-readme.md`, import.meta.url),
  ),
}));

// Parse Markdown so links inside code examples are never rewritten.
export async function prepareReadme(
  markdown,
  { repo, ref, readmePath, product },
) {
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
  const definitions = new Map();
  walk(tree, (node) => {
    if (node.type === "definition") definitions.set(node.identifier, node.url);
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
  const identity = product
    ? identities[product]
    : Object.values(identities).find((entry) => entry.repo === repo);
  if (identity) {
    const artwork = new Set(
      [
        identity.logoLight,
        identity.logoDark,
        ...identity.images.map((image) => image.src),
      ].filter(Boolean),
    );
    const matchesArtwork = (url) => artwork.has(resolve(url, true));
    const plainText = (node) => {
      if (node.type === "text") return node.value;
      if (
        ["paragraph", "emphasis", "strong", "blockquote"].includes(node.type)
      ) {
        const parts = node.children.map(plainText);
        return parts.every((part) => part !== null) ? parts.join("") : null;
      }
      return null;
    };
    const stripHtmlArtwork = (value) =>
      value.replace(
        /<picture\b[^>]*>[\s\S]*?<\/picture>|<img\b[^>]*>/gi,
        (image) => {
          const sources = [
            ...image.matchAll(/\s(?:src|srcset)=(['"])(.*?)\1/g),
          ];
          const text = image.replace(/<[^>]*>/g, "").trim();
          return sources.length &&
            !text &&
            sources.every((match) => matchesArtwork(match[2]))
            ? ""
            : image;
        },
      );
    const stripIdentity = (node) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => {
        if (
          ["paragraph", "blockquote"].includes(child.type) &&
          plainText(child) === identity.species
        )
          return false;
        if (child.type === "image" && matchesArtwork(child.url)) return false;
        if (child.type === "imageReference") {
          const url = definitions.get(child.identifier);
          if (url && matchesArtwork(url)) return false;
        }
        if (child.type === "html") {
          child.value = stripHtmlArtwork(child.value);
          return Boolean(child.value.trim());
        }
        stripIdentity(child);
        return !child.children || child.children.length > 0;
      });
    };
    stripIdentity(tree);
    // When preparing a product's embedded README, strip the leading h1 so Docusaurus's
    // page title owns the single top-level h1 on the page.
    if (product && tree.children.length > 0 && tree.children[0].type === "heading" && tree.children[0].depth === 1) {
      tree.children.shift();
    }
  }
  walk(tree, (node) => {
    if (node.url) {
      node.url = resolve(
        node.url,
        node.type === "image" || imageReferences.has(node.identifier),
      );
    }
    if (node.type === "html") {
      node.value = node.value.replace(
        /\s(href|src|srcset)=(['"])(.*?)\2/g,
        (_match, name, quote, value) =>
          ` ${name}=${quote}${resolve(value, name !== "href")}${quote}`,
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
