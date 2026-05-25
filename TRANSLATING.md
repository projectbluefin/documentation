# Translating the Bluefin docs

This site uses Docusaurus's built-in internationalization (i18n) support.

## Current locales

- `en` (default)
- `de`
- `fr`

## Add or update translations

1. Edit the source content in `docs/`, `blog/`, `src/`, or other shared UI files.
2. Generate or refresh translation message files:
   ```bash
   npx docusaurus write-translations --locale <locale>
   ```
3. Translate the generated files under `i18n/<locale>/`.
4. Commit both the source change and translated strings in the same pull request when possible.

## Add a new locale

1. Add the locale code to `i18n.locales` in `docusaurus.config.ts`.
2. Generate translation files for the locale:
   ```bash
   npx docusaurus write-translations --locale <locale>
   ```
3. If needed, add localized docs or blog content under `i18n/<locale>/docusaurus-plugin-content-docs/current/` or the matching blog directory.
4. Submit the locale scaffolding in a pull request so contributors can start translating.

## Crowdin or Weblate

Docusaurus works well with hosted translation platforms such as Crowdin or Weblate.

Recommended workflow:

1. Keep English source content in `docs/`, `blog/`, and `src/`.
2. Sync the generated JSON and Markdown files in `i18n/<locale>/` to Crowdin or Weblate.
3. Review translated strings through that platform.
4. Merge the exported changes back through a normal GitHub pull request.

Either Crowdin or Weblate can be used; this repository keeps the translation source of truth in Git.

## Pull request workflow

- Create a branch for your translation work.
- Keep changes scoped to one locale or one feature when possible.
- Reference the related issue in your PR description.
- Ask reviewers to focus on translation accuracy and terminology consistency.

## Tips

- Translate user-facing text only; do not rename file paths unless Docusaurus requires localized copies.
- Preserve Markdown, MDX, code fences, links, and frontmatter structure.
- When in doubt, prefer consistency with existing English terminology.
