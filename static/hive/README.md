# Hive leaderboard theme

`leaderboard.css` themes a contributor's profile card on the KubeStellar Hive
leaderboard with Bluefin's colours.

## Use it

```text
https://hosted-projectbluefin-knuckle-gjvq.hive.kubestellar.io/contribute/leaderboard?style=projectbluefin/documentation/static/hive/leaderboard.css@main
```

`?style=` takes `owner/repo/path/theme.css@ref`. Omit `@ref` to track the
default branch. The hive fetches the file server-side from
`raw.githubusercontent.com`, which keeps its CSP intact and keeps your IP away
from third parties, then sanitizes the result and caches it for five minutes.

## Why the CSS has no comments

**A comment takes down the rule that follows it.** The hive scopes a custom
stylesheet by string-prepending `#tab-leaderboard ` to each selector, and the
prefixer does not understand comments: it prepends to the comment instead, and
the following selector is absorbed into it. A header comment cost the first two
rules; interleaved comments cost one rule each.

That is why this directory documents the theme and the stylesheet itself
carries none. Verified live on 2026-08-08 by fetching
`/api/leaderboard/style?src=...` and diffing the result against the source.
Reported upstream as [kubestellar/hive#2972](https://github.com/kubestellar/hive/issues/2972).

## The other constraints

The sanitizer rejects a whole rule if any declaration in it is disallowed:

- **No `@import` and no `url()`** — a stylesheet that can fetch is a stylesheet
  that can exfiltrate.
- **No at-rules at all**, `@media` included.
- **No custom properties.** A rule containing `--x: value` is dropped whole, so
  a theme cannot define variables, and cannot set `--me-accent` either — even
  though that is how the hive's own built-in styles work. Use literals.
- **No gradients.**
- **No ancestor selectors.** Scoping turns `[data-theme="light"] .me-card` into
  `#tab-leaderboard [data-theme="light"] .me-card`, and `data-theme` is on
  `<html>`, above the scope.

The last two together mean **a theme cannot branch on light versus dark**.

## The palette

One palette has to clear contrast on both hive surfaces, so:

| Value     | Role                               | On `#161b22`      | On `#f6f8fa` |
| --------- | ---------------------------------- | ----------------- | ------------ |
| `#5c7bd1` | brand — numerals, borders, own row | 4.29:1            | 3.79:1       |
| `#364d8d` | filled button, white text on it    | 8.07:1 (vs white) | —            |

`#5c7bd1` is `--ifm-color-primary-light` from `src/css/custom.css`, so a
contributor's card matches the documentation site.

`scripts/hive-theme.test.js` enforces all of the above, including computing
those ratios rather than trusting them.
