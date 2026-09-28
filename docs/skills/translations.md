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
  up a translation issue, opting in as a human reviewer for a language, or
  adding a new locale.
metadata:
  type: procedure
---

# Translations

Translations land as ordinary pull requests against `i18n/<locale>/`. There
is no external translation platform and no secret; Docusaurus reads the files
straight from the repository.

## When to Use

- Picking up a `Translate docs: <language>` issue.
- Translating a docs page or UI strings for a supported locale.
- Opting in as the human reviewer for a language.
- Adding a locale that is not yet supported.

## When NOT to Use

- Blog posts, monthly reports, and the custom `src/pages` pages (`/factory`,
  `/leaderboards`, `/changelogs`, …). They exist only in English; translated
  builds do not contain them.
- `docs/skills/**`, `docs/superpowers/**`, and `docs/SKILL.md`. These are
  agent operating procedure, not reader docs; do not translate them.

## Supported locales

`TRANSLATION_LOCALES` in `scripts/lib/translated-locales.mjs` is the list:
`ar cs de es fr hi id it ja ko nl pl pt-BR ru sv tr uk vi zh-Hans zh-Hant`.
Each has a stub directory at `i18n/<locale>/` and an unowned entry in
`.github/CODEOWNERS`.

## A locale goes live on its first translated page

`docusaurus.config.ts` builds only the locales whose
`i18n/<locale>/docusaurus-plugin-content-docs/current/` holds at least one
`.md` or `.mdx` file. Stubs (`.gitkeep`, the JSON string files) do not count,
so no locale publishes an all-English duplicate. The language menu appears in
the navbar once any locale is live.

Consequence: a PR that translates only UI strings changes nothing visible.
Translate at least one page — start with `index.md` — in the same PR.

Untranslated pages in a live locale fall back to the English source, so a
partial translation is safe to merge.

## What a translated build contains

Core docs as text, nothing else — about 12 MB per locale against 254 MB for
English. Docusaurus loads the config once per locale with
`DOCUSAURUS_CURRENT_LOCALE` set; when it is not `en` the config:

- disables the blog and pages plugins and the legacy-URL redirects;
- runs `remarkEnglishOnlyUrls` before the default remark plugins, rewriting
  links into the blog and `src/pages` routes, and every root-relative image
  (`/img/…`), to absolute `https://docs.projectbluefin.io/…` URLs;
- points the favicon, navbar logo, and social card at the English site;
- deletes the locale's copy of `static/` after the build (`dropStaticCopy`).

Components that hard-code root paths (`src="/img/…"`, `fetch("/data/…")`)
already resolve to the English copy. A component that builds a static path
with `useBaseUrl` would resolve to `/<locale>/…`, which no longer exists —
check the locale build for such references before adding one.

The images rewrite must run in `beforeDefaultRemarkPlugins`: the default
plugins turn root images into bundled imports, which would copy every docs
image into the locale again.

## Translating a page

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

## Translating UI strings

Edit only the `"message"` values; the `"description"` fields are context.

| File                                                        | Covers                      |
| ----------------------------------------------------------- | --------------------------- |
| `i18n/<locale>/code.json`                                   | Theme and component strings |
| `i18n/<locale>/docusaurus-theme-classic/navbar.json`        | Navbar labels               |
| `i18n/<locale>/docusaurus-theme-classic/footer.json`        | Footer labels               |
| `i18n/<locale>/docusaurus-plugin-content-docs/current.json` | Sidebar category labels     |

`code.json` arrives partly translated: Docusaurus prefills its own theme
strings. Review those rather than assuming they are correct for Bluefin.

When English strings are added later, refresh the stub without losing
existing translations:

```bash
npm run write-translations -- --locale de
```

## Preview and check

```bash
just dev --locale de          # hot reload, needs one translated page
npm run build:ci -- --locale de
```

`onBrokenLinks` is `throw`, so a broken link in a translated page fails the
build exactly as in English. Images and English-only links in a preview load
from the production site, so an image added in the same PR shows only after
the English build deploys it.

## Human reviewers

`.github/CODEOWNERS` lists every `/i18n/<locale>/` path with no owner. To
review a language, open a PR adding your handle after its path:

```
/i18n/de/ @your-handle
```

GitHub then requests your review on PRs touching that locale. The `main`
ruleset does not require code-owner approval, so this routes reviews to you;
it does not block merges.

## Adding a locale

1. Add the code to `TRANSLATION_LOCALES` (keep it sorted).
2. `npm run write-translations -- --locale <code>` and
   `touch i18n/<code>/docusaurus-plugin-content-docs/current/.gitkeep`.
3. Add an unowned `/i18n/<code>/` line to `.github/CODEOWNERS`.
4. File a `Translate docs: <language>` issue labelled `queue/agent-ready`.

## References

- [Docusaurus i18n](https://docusaurus.io/docs/i18n/introduction)
- [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md)
