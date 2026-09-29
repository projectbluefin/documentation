/**
 * Which translation locales the site builds, and what they contain.
 *
 * Every locale Docusaurus builds is a full copy of the site — static assets
 * included — so building a locale nobody has translated yet publishes an
 * English duplicate under /<locale>/ and multiplies the Pages artifact. A
 * locale therefore goes live only once its docs directory holds at least one
 * translated page. Stub directories (`.gitkeep`, UI-string JSON) do not count.
 *
 * Translated locales carry the core docs only, as text: the blog (which
 * includes the monthly reports), the custom `src/pages` pages, and every image
 * exist once, in the English build, and translated docs point at them there.
 */

import { readdirSync, rmSync } from "fs";
import { join } from "path";

/** Locales open for translation. Adding one here needs a matching i18n/<locale>/ stub. */
export const TRANSLATION_LOCALES = [
  "ar",
  "cs",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt-BR",
  "ru",
  "sv",
  "tr",
  "uk",
  "vi",
  "zh-Hans",
  "zh-Hant",
];

const DOC_PAGE = /\.mdx?$/;

/** True when i18n/<locale>/docusaurus-plugin-content-docs/current/ holds a .md or .mdx page. */
export function hasTranslatedDocs(i18nDir, locale) {
  const docsDir = join(
    i18nDir,
    locale,
    "docusaurus-plugin-content-docs",
    "current",
  );
  try {
    return readdirSync(docsDir, { recursive: true }).some((entry) =>
      DOC_PAGE.test(entry),
    );
  } catch {
    return false;
  }
}

/** The subset of `locales` with at least one translated docs page, in input order. */
export function translatedLocales(i18nDir, locales = TRANSLATION_LOCALES) {
  return locales.filter((locale) => hasTranslatedDocs(i18nDir, locale));
}

/**
 * First path segments that exist only in the English build: the blog plus
 * every top-level `src/pages` entry (`_`-prefixed files are not routes).
 */
export function englishOnlyRoutes(siteDir) {
  const pages = readdirSync(join(siteDir, "src", "pages"))
    .filter((name) => !name.startsWith("_"))
    .map((name) => name.replace(/\.(mdx?|[jt]sx?)$/, ""));
  return ["blog", ...pages];
}

/**
 * Remark plugin for translated builds. Points two kinds of URL at the English
 * site instead of the locale:
 * - links into English-only routes (`/blog/…`, `/factory`, …), which do not
 *   exist under /<locale>/ and would otherwise fail the broken-link check;
 * - root-relative images (`/img/…`), so the locale loads the English copy
 *   instead of bundling its own.
 */
export function remarkEnglishOnlyUrls({ siteUrl, routes }) {
  const englishOnly = new RegExp(`^/(?:${routes.join("|")})(?:[/?#]|$)`);
  const rewrite = (node) => {
    const isLink = node.type === "link" || node.type === "definition";
    const isRootImage =
      node.type === "image" &&
      node.url.startsWith("/") &&
      !node.url.startsWith("//");
    if ((isLink && englishOnly.test(node.url)) || isRootImage) {
      node.url = siteUrl + node.url;
    }
    node.children?.forEach(rewrite);
  };
  return rewrite;
}

/**
 * Docusaurus plugin for translated builds: deletes the locale's copy of
 * `static/`. Nothing under /<locale>/ references it once images point at the
 * English site, and it is most of each locale's size.
 */
export function dropStaticCopy(context) {
  return {
    name: "drop-locale-static-copy",
    async postBuild({ outDir }) {
      for (const dir of context.siteConfig.staticDirectories) {
        for (const entry of readdirSync(join(context.siteDir, dir))) {
          rmSync(join(outDir, entry), { recursive: true, force: true });
        }
      }
    },
  };
}
