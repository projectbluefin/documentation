# Translating the Bluefin docs

The core docs at <https://docs.projectbluefin.io> are translated through
ordinary pull requests against `i18n/<locale>/`. There is no external
translation platform; the files in this repository are the source of truth.

## Supported locales

`ar` `cs` `de` `es` `fr` `hi` `id` `it` `ja` `ko` `nl` `pl` `pt-BR` `ru` `sv`
`tr` `uk` `vi` `zh-Hans` `zh-Hant` — the `TRANSLATION_LOCALES` list in
`scripts/lib/translated-locales.mjs`. Each has an open `Translate docs:
<language>` issue and a stub directory at `i18n/<locale>/`.

## What gets translated

- **Docs pages** — copy a page from `docs/` to the same path under
  `i18n/<locale>/docusaurus-plugin-content-docs/current/` and translate it.
- **UI strings** — the `"message"` values in `i18n/<locale>/code.json`,
  `docusaurus-theme-classic/navbar.json`, `docusaurus-theme-classic/footer.json`,
  and `docusaurus-plugin-content-docs/current.json`. Leave `"description"` as is.

The blog, monthly reports, custom pages (`/factory`, `/leaderboards`, …), and
images stay English. Translated pages link to them on the English site. Do not
translate `docs/skills/`, `docs/superpowers/`, or `docs/SKILL.md`.

## When a locale is published

A locale is built — and the language menu appears — only once
`i18n/<locale>/docusaurus-plugin-content-docs/current/` contains at least one
`.md` or `.mdx` page. A pull request that translates only UI strings changes
nothing visible, so include at least `index.md` in a locale's first PR.
Untranslated pages fall back to English, so partial translations are safe to
merge.

## Pull requests

- Touch one locale per PR, and only files under `i18n/<locale>/`.
- Keep front matter keys, `slug`, `id`, MDX imports, components, code blocks,
  commands, and link targets unchanged. Translate `title`, `description`, and
  `sidebar_label`.
- Preview with `just dev --locale <locale>` and check with
  `npm run build:ci -- --locale <locale>`.
- When English UI strings change, refresh without losing translations:
  `DOCUSAURUS_CURRENT_LOCALE=<locale> npm run write-translations -- --locale <locale>`.
- Reference the locale's `Translate docs` issue.

## Reviewing a language

Every `/i18n/<locale>/` path in `.github/CODEOWNERS` starts with no owner. To
review translations for a language, open a PR adding your GitHub handle after
its path:

```
/i18n/de/ @your-handle
```

GitHub then requests your review on PRs that touch that locale.

## Adding a locale

See [`docs/skills/translations.md`](docs/skills/translations.md#adding-a-locale).
