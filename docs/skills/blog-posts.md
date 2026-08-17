---
title: Writing blog posts
description: Conventions for authoring posts in blog/, including MDX gotchas and social embeds.
---

# Writing blog posts

Posts live in `blog/` as `YYYY-MM-DD-slug.md` or `.mdx`. Use `.mdx` when the
post imports a component. Authors come from `blog/authors.yaml`.

```yaml
---
title: "The Wolves Are Coming"
slug: the-wolves-are-coming
authors: castrojo
tags: [community, artwork]
date: 2026-08-16T23:23:14-04:00
image: /img/blog/2026-08-16-the-wolves-are-coming/nova.jpg
---
```

Put post images in `static/img/blog/<post-folder>/`. Never hotlink a CDN — copy
the asset in so the post survives the source going away.

## Keep single-line JSX single-line

`<p className="blog-post-subtitle">…</p>` **must stay on one line.** Prettier
wraps JSX past 80 characters, and once the inner text lands on its own line MDX
parses it as markdown and wraps it in a second `<p>`. The result is a nested
paragraph that fails HTML minification during `npm run build`:

```
[HTML minifier diagnostic - error] No "p" element in scope but a "p" end tag seen
```

Keep the whole element under 80 characters — shorten the subtitle rather than
letting it wrap. The same rule applies to any single-element JSX line whose
children are plain text.

## Embedding social posts

Use `src/components/blog/BlueskyPost.tsx` instead of a script-based embed. It
renders a self-contained `<blockquote cite>` with locally-hosted avatar and
media, so the post keeps working offline, in print, and after the network embed
breaks.

```jsx
import BlueskyPost from "@site/src/components/blog/BlueskyPost";

<BlueskyPost
  url="https://bsky.app/profile/<handle>/post/<rkey>"
  displayName="Jorge Castro"
  handle="castrojo.bsky.social"
  avatar="/img/blog/<post-folder>/avatar.jpg"
  text={"First line.\n\nSecond line."}
  timestamp="2026-08-17T03:18:54.739Z"
  image={{ src: "/img/blog/<post-folder>/nova.jpg", alt: "…" }}
/>;
```

Fetch the canonical record — text, timestamp, and image blob — from the public
AppView rather than transcribing it by hand:

```bash
curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://<handle>/app.bsky.feed.post/<rkey>"
```

The `text` prop preserves line breaks (`white-space: pre-line`), so pass the
original newlines exactly as posted.

## Before you push

```bash
npm run typecheck
npx prettier --write <files you touched>
npm run build:ci
```

`build:ci` is the only check that catches the MDX nesting problem above. Read
its warning list for your new page's path — a clean exit code is not enough.
