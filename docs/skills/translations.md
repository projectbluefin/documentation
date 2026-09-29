---
name: translations
title: Translations
version: "1.0"
last_updated: "2026-09-28"
id: translations
one_line_purpose: Translate docs pages and UI strings into a supported locale, or add a locale.
entry_point: docs/skills/translations.md
category: content
status: active
tags: [i18n, translations, locales, codeowners]
description: >-
  Translate docs.projectbluefin.io into another language through pull requests.
  Use when translating a docs page or UI strings under i18n/<locale>/, picking
  up a translation issue, opting in as a human reviewer for a language, adding
  a new locale, or changing how translated builds are assembled.
metadata:
  type: procedure
---

# Translations

Translations land as ordinary pull requests against `i18n/<locale>/`. There
is no external translation platform and no secret; Docusaurus reads the files
straight from the repository. The human-facing contributor guide is
[`TRANSLATING.md`](https://github.com/projectbluefin/documentation/blob/main/TRANSLATING.md);
this page is the agent procedure and the build internals behind it.

Supported locales are `TRANSLATION_LOCALES` in
`scripts/lib/translated-locales.mjs`:
`ar cs de es fr hi id it ja ko nl pl pt-BR ru sv tr uk vi zh-Hans zh-Hant`.
Each has a stub at `i18n/<locale>/`, an unowned `.github/CODEOWNERS` entry, and
a `Translate docs: <language>` issue.

## When to Use

- Picking up a `Translate docs: <language>` issue.
- Translating a docs page or UI strings for a supported locale.
- Opting in as the human reviewer for a language.
- Adding a locale that is not yet supported.
- Changing what a translated build contains (`docusaurus.config.ts`,
  `scripts/lib/translated-locales.mjs`), or a component used on docs pages
  that loads static files.

## When NOT to Use

- Blog posts and monthly reports (published as blog posts) — see
  [`blog-posts.md`](blog-posts.md). Both stay English.
- Custom `src/pages` pages (`/factory`, `/leaderboards`, `/changelogs`, …) —
  English-only; translated builds do not contain them.
- `docs/skills/**`, `docs/superpowers/**`, and `docs/SKILL.md` — agent
  operating procedure, not reader docs; never translated.

## Core Process

### Translate a page

1. Copy the English page to the same relative path under the locale:

   ```bash
   cp docs/installation.md i18n/de/docusaurus-plugin-content-docs/current/installation.md
   ```

2. Translate the prose. Keep unchanged: front matter keys, `slug`, `id`,
   `sidebar_position`, MDX `import` lines, component tags and props, code
   blocks, commands, and link targets. Translate `title`, `description`, and
   `sidebar_label` values.
3. Keep the page structurally identical to the English source so later
   English edits can be diffed across.
4. A locale's first PR includes `index.md`: the locale is built only once it
   holds a translated docs page (see _How a translated build works_).

### Translate UI strings

Edit only the `"message"` values; the `"description"` fields are context.

| File                                                        | Covers                      |
| ----------------------------------------------------------- | --------------------------- |
| `i18n/<locale>/code.json`                                   | Theme and component strings |
| `i18n/<locale>/docusaurus-theme-classic/navbar.json`        | Navbar labels               |
| `i18n/<locale>/docusaurus-theme-classic/footer.json`        | Footer labels               |
| `i18n/<locale>/docusaurus-plugin-content-docs/current.json` | Sidebar category labels     |

`code.json` arrives partly translated: Docusaurus prefills its own theme
strings. Review those rather than assuming they are correct for Bluefin.

When English strings change, refresh the stub without losing translations.
`write-translations` does not set `DOCUSAURUS_CURRENT_LOCALE` itself; without
it the config loads as English and writes a blog stub that is never built:

```bash
DOCUSAURUS_CURRENT_LOCALE=de npm run write-translations -- --locale de
```

### Preview and check

```bash
just dev --locale de          # hot reload, needs one translated page
npm run build:ci -- --locale de && npm run serve   # then open /de/
```

A single-locale build lands in `build/de/` and serves under `/de/`, because
`i18n.localeConfigs` pins each locale's `baseUrl` (see below). Images and
English-only links in a preview load from the production site, so an image
added in the same PR shows only after the English build deploys it.

### Opt in as a human reviewer

`.github/CODEOWNERS` lists every `/i18n/<locale>/` path with no owner. Add a
handle after its path in a PR:

```
/i18n/de/ @your-handle
```

GitHub then requests that reviewer on PRs touching the locale. The `main`
ruleset does not require code-owner approval, so this routes reviews; it does
not block merges.

### Add a locale

1. Add the code to `TRANSLATION_LOCALES`, and its lunr-languages code to
   `SEARCH_LANGUAGES` if `node_modules/lunr-languages/lunr.<code>.js` exists.
2. `DOCUSAURUS_CURRENT_LOCALE=<code> npm run write-translations -- --locale <code>`
   and `touch i18n/<code>/docusaurus-plugin-content-docs/current/.gitkeep`.
3. Add an unowned `/i18n/<code>/` line to `.github/CODEOWNERS`.
4. File a `Translate docs: <language>` issue labelled `queue/agent-ready`.

### How a translated build works

`docusaurus.config.ts` puts a locale in `i18n.locales` only when
`i18n/<locale>/docusaurus-plugin-content-docs/current/` holds a `.md` or
`.mdx` file (`translatedLocales`). Stubs — `.gitkeep`, the JSON string files
— do not count, so no locale publishes an all-English duplicate.

Docusaurus loads the config once per locale with `DOCUSAURUS_CURRENT_LOCALE`
set. When it is not `en`, the config:

- disables the blog and pages plugins and the legacy-URL redirects;
- runs `remarkEnglishOnlyUrls` in `beforeDefaultRemarkPlugins`, rewriting
  links into the blog and `src/pages` routes (plain or `pathname://`) and
  every root-relative image (`/img/…`) to absolute
  `https://docs.projectbluefin.io/…` URLs;
- points the favicon, navbar logo, and social card at the English site;
- deletes the locale's copy of `static/` after the build (`dropStaticCopy`).

Result: about 12 MB per live locale against 254 MB for English.

Each locale builds in its own process (`scripts/build-site.mjs`), because a
single `docusaurus build` builds locales one after another and every live
translation added ~10s to CI. Locally the translated builds run in parallel
beside English; CI spreads them over runners (see
[`ci-workflows.md`](ci-workflows.md)). Two consequences:

- A lone `--locale <l>` build drops the `/<l>/` baseUrl by design (multi-domain
  support), so `i18n.localeConfigs` pins `baseUrl: "/<l>/"` for every live
  locale — the same value a multi-locale build infers. Without the pin every
  link in the locale points at the English root; `build-site.mjs` fails the
  build if `build/<l>/index.html` has no `/<l>/` URL.
- Output matches the single-process build: English byte-for-byte, translated
  locales up to JS content hashes (module ids derive from the per-process
  `.docusaurus-<l>/` path) and search-document ids (numbered per process).

Search is one exception to per-locale config. `@easyops-cn/docusaurus-search-local`
takes its `language` list from the config, which every locale shares: `"en"`
plus the `SEARCH_LANGUAGES` code of every live locale, so each locale's process
sets up the same lunr pipeline. English only until a locale goes live. Once
`zh` is in the list its jieba tokenizer replaces the tokenizer for every
locale; Japanese then loses katakana terms (verified: `インストール` indexed
without `zh`, dropped with it). A per-locale `language` crashes the build on
`lunr.zh`.

The language menu is wrapped (`src/theme/NavbarItem/LocaleDropdownNavbarItem`)
to render on docs routes only; elsewhere the other locales have no
counterpart. The `hreflang` alternates in the page head come from the same
theme utility and still list every locale on those routes; search engines
ignore alternates that 404, and suppressing them would mean ejecting the
theme's 142-line `SiteMetadata`.

## Common Rationalizations

- "A locale with only UI strings translated is progress, merge it." — It
  builds nothing until a docs page exists; include `index.md`.
- "Plain `npm run write-translations` is what Docusaurus documents." — Here
  it loads the English config and writes a blog stub that is never built.
- "`useBaseUrl` is the Docusaurus way to reference static files." — In a
  translated build it resolves to `/<locale>/…`, which `dropStaticCopy`
  deleted. Docs-page components use root paths (`/data/…`, `/img/…`).
- "The rewrite works as a normal `remarkPlugins` entry." — The default
  plugins have already turned images into bundled imports by then, copying
  every image into the locale again.

## Red Flags

- A translation PR touching anything outside its `i18n/<locale>/`.
- `i18n/<locale>/docusaurus-plugin-content-blog/` appearing in a diff.
- A `README.md` or other `.md` placed in a stub's docs directory — it would
  publish as a page and turn the locale on.
- `build/<locale>/` larger than about 20 MB, or containing `img/`.
- `/<locale>/(img|data|feeds)/` appearing in a locale build's HTML or JS.
- A panel on a translated page reporting data unavailable that renders on
  the English page.

## Verification

- `node --test scripts/translated-locales.test.js` passes.
- `npm run build:ci` with the change and at least one translated page:
  `du -sh build/<locale>` is about 12 MB, and
  `grep -rhoE '/<locale>/(img|data|feeds)/' build/<locale> | wc -l` is 0.
- `npx docusaurus serve`, then load a translated page that renders a
  data-driven component (for example `/<locale>/analytics/`): no request
  returns 4xx, and the panels match the English page.
- On `/blog/`, the language menu is absent; on a docs page it lists the live
  locales.

## Sources

- `scripts/lib/translated-locales.mjs`, `scripts/translated-locales.test.js`,
  `docusaurus.config.ts`, `src/theme/NavbarItem/LocaleDropdownNavbarItem/`,
  `TRANSLATING.md`, `.github/CODEOWNERS`.
- Context7 `/facebook/docusaurus` — `i18n.locales`, `write-translations`,
  per-locale `start`/`build --locale`.
- Verified in installed source, not in Context7:
  `@docusaurus/core/lib/commands/build/buildLocale.js` and
  `commands/start/start.js` set `DOCUSAURUS_CURRENT_LOCALE` before loading
  the config; `write-translations` does not. Remark plugin ordering was
  verified by build output: as a `remarkPlugins` entry the German build
  carried 28 MB of `assets/images`, as `beforeDefaultRemarkPlugins` 180 KB.
- `@easyops-cn/docusaurus-search-local` `dist/server/server/utils/buildIndex.js`
  — loads `lunr-languages/lunr.<code>` per `language` entry; `zh` uses its
  bundled `@node-rs/jieba` tokenizer.
