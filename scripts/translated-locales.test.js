/**
 * Unit coverage for scripts/lib/translated-locales.mjs.
 *
 * The gate decides which locales Docusaurus builds. Letting a stub through
 * publishes a full English duplicate of the site under /<locale>/; blocking a
 * real translation hides a contributor's work. Both directions are asserted.
 *
 * The URL rewrite decides what a translated page links to. Missing a route
 * fails the build or 404s; over-matching sends in-locale docs links to English.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  remarkEnglishOnlyUrls,
  translatedLocales,
} from "./lib/translated-locales.mjs";

function i18nFixture(files) {
  const root = mkdtempSync(join(tmpdir(), "i18n-"));
  for (const file of files) {
    const path = join(root, file);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "");
  }
  return root;
}

const docs = (locale, file) =>
  `${locale}/docusaurus-plugin-content-docs/current/${file}`;

test("stub-only locales stay unbuilt", () => {
  const root = i18nFixture([
    docs("de", ".gitkeep"),
    "de/code.json",
    "de/docusaurus-theme-classic/navbar.json",
    "de/docusaurus-plugin-content-docs/current.json",
  ]);
  assert.deepEqual(translatedLocales(root, ["de"]), []);
});

test("a locale with no directory at all stays unbuilt", () => {
  assert.deepEqual(translatedLocales(i18nFixture([]), ["fr"]), []);
});

test("one translated page, .md or .mdx, at any depth, turns a locale on", () => {
  const root = i18nFixture([
    docs("de", "index.md"),
    docs("fr", "donations/faq.mdx"),
    docs("ja", ".gitkeep"),
  ]);
  assert.deepEqual(translatedLocales(root, ["de", "fr", "ja"]), ["de", "fr"]);
});

const SITE = "https://docs.example";

function rewritten(nodes) {
  const tree = { type: "root", children: nodes };
  remarkEnglishOnlyUrls({ siteUrl: SITE, routes: ["blog", "factory"] })(tree);
  return tree.children.map((node) => node.url ?? node.children[0].url);
}

const link = (url) => ({ type: "link", url, children: [] });

test("links into English-only routes go to the English site", () => {
  assert.deepEqual(
    rewritten([
      link("/blog"),
      link("/blog/dakota-alpha-1"),
      link("/factory#health"),
      link("pathname:///blog/rss.xml"),
      { type: "definition", url: "/blog/tags/monthly-report/" },
      { type: "paragraph", children: [link("/factory/")] },
    ]),
    [
      `${SITE}/blog`,
      `${SITE}/blog/dakota-alpha-1`,
      `${SITE}/factory#health`,
      `${SITE}/blog/rss.xml`,
      `${SITE}/blog/tags/monthly-report/`,
      `${SITE}/factory/`,
    ],
  );
});

test("docs links stay in the locale, including prefix look-alikes", () => {
  assert.deepEqual(
    rewritten([
      link("/installation"),
      link("/blogging-guide"),
      link("installation.md"),
      link("https://example.org/blog"),
      link("pathname:///data/report.json"),
    ]),
    [
      "/installation",
      "/blogging-guide",
      "installation.md",
      "https://example.org/blog",
      "pathname:///data/report.json",
    ],
  );
});

test("root images load from the English site; relative and external do not", () => {
  const image = (url) => ({ type: "image", url });
  assert.deepEqual(
    rewritten([
      image("/img/user-attachments/a.png"),
      image("./local.png"),
      image("//cdn.example/x.png"),
      image("https://example.org/x.png"),
    ]),
    [
      `${SITE}/img/user-attachments/a.png`,
      "./local.png",
      "//cdn.example/x.png",
      "https://example.org/x.png",
    ],
  );
});
