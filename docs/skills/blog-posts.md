---
name: blog-posts
version: "1.3"
last_updated: "2026-09-08"
id: blog-posts
one_line_purpose: Format, embed, and validate Bluefin blog posts under blog/.
entry_point: docs/skills/blog-posts.md
category: meta
status: active
tags: [blog, authoring, mdx, embeds]
description: >-
  Author, format, and embed content in Bluefin blog posts under blog/. Use when
  editing a blog post, converting a social post to blog format, embedding
  Bluesky posts, adding images, or fixing MDX minifier paragraph errors.
metadata:
  type: procedure
---

# Blog posts

Posts live in `blog/` as `YYYY-MM-DD-slug.md`, or `.mdx` when the post imports a
component. Authors resolve from `blog/authors.yaml`.

## When to Use

- Creating a new post in `blog/`.
- Editing the body, front matter, or assets of an existing post.
- Embedding a Bluesky post, image, or video in a post.
- Debugging an MDX or minifier error that names a file under `blog/`.

## When NOT to Use

- Monthly reports — live in `blog/` as dinosaur-slug infograms generated via `scripts/generate-report.mjs`; see [`monthly-reports.md`](monthly-reports.md).
- Comment threads on a published post — see [`giscus-discussions.md`](giscus-discussions.md).
- Getting a merged post live — see [`shipping-and-verifying.md`](shipping-and-verifying.md).

## The copy is not yours to write

**An agent formats a post. An agent does not author it.**

This is the repository-wide rule in [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md) →
_Never write in a maintainer's voice_. A blog post is mostly prose and the
temptation is to fill the page:

- The maintainer supplies the words. You supply the structure.
- Never invent narrative, lore, project history, motivation, or a promise.
- Never write a first-person sentence that will publish under someone's byline.
- If copy is missing, **ask.** Ship structure/embeds with an empty body hole.

A design skill saying "come up with copy" refers to mockups, not authorship.

## Core Process

1. **Gather the source.** For a social post, fetch the canonical record instead
   of transcribing it:

   ```bash
   curl -s "https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://<handle>/app.bsky.feed.post/<rkey>"
   ```

   The response carries the exact `record.text`, `record.createdAt`, and the
   image blob CID. Use those verbatim.

2. **Copy assets in.** Put images in
   `static/img/blog/<YYYY-MM-DD-slug>/`. Never hotlink a CDN — the post has to
   survive the source account, the CDN, and the link rotting.

   For a requested website screenshot, capture a fully rendered viewport, not
   its Open Graph image or loading state. For a YouTube-only stub, fetch the
   canonical title from the oEmbed endpoint.
   To find the most recent video without consuming YouTube Data API quota,
   retrieve `https://www.youtube.com/@<channel>/videos`, use its first video
   ID, then verify that ID with oEmbed. If `maxresdefault.jpg` returns HTTP 200,
   save it under the post's `static/img/blog/<YYYY-MM-DD-slug>/` directory and
   use that local path as the front-matter `image`; otherwise save the oEmbed
   `thumbnail_url`. When the maintainer supplied no prose, the body may contain
   only the standard accessible YouTube iframe.

3. **Write the front matter.**

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

   `image` is the social card. Point it at a local path under `static/`.

4. **Add the body only from supplied copy.** This site deliberately configures
   `truncateMarker` to match nothing, so do not add inert marker comments to
   new posts. The Docusaurus untruncated-post warning is expected for every
   post, including posts that use the documented marker syntax.

5. **Format only what you touched**, then build.

   ```bash
   npx prettier --write blog/<file>.mdx
   npm run build:ci
   ```

## Keep single-line JSX on a single line

MDX v3 wraps JSX children in a `<p>` when the children sit on their own line.
Verified against the Docusaurus v3 migration docs:

```markdown
<div>Some **Markdown** content</div>
<div>
  Some **Markdown** content
</div>
```

compiles to:

```html
<div>Some <strong>Markdown</strong> content</div>
<div>
  <p>Some <strong>Markdown</strong> content</p>
</div>
```

So this, which is what Prettier produces once the line passes 80 characters:

```jsx
<p className="blog-post-subtitle">
  A subtitle long enough that Prettier wrapped it.
</p>
```

becomes `<p><p>…</p></p>`, and the build reports:

```
[HTML minifier diagnostic - error] No "p" element in scope but a "p" end tag seen
```

**Keep the whole element under 80 characters** so Prettier cannot wrap it —
shorten the text rather than letting it break across lines. The rule applies to
any single-element JSX line whose children are plain text.

## Embedding social posts

Use `src/components/blog/BlueskyPost.tsx` rather than a script-based embed. It
renders a self-contained `<blockquote cite>` with locally hosted avatar and
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

`text` preserves line breaks via `white-space: pre-line`, so pass the newlines
exactly as posted. Styling is built from Docusaurus theme tokens plus one
Bluesky blue, so it tracks light and dark automatically.

For images and video, use `src/components/blog/BlogFigure.tsx` — it renders
`.mp4` and `.webm` as a looping muted autoplay video and everything else as an
`<img>`.

## Common Rationalizations

| Rationalization                                     | Reality                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| "The post needs an intro, I'll draft one."          | It needs the maintainer's intro. Ask, or ship without it.                     |
| "I'm just expanding what they already said."        | Expansion is authorship. The words publish under their name, not yours.       |
| "The design skill told me to write copy."           | That is mockup guidance. `AGENTS.md` outranks it.                             |
| "Hotlinking the CDN image is fine, it's their own." | CDNs expire and accounts move. Copy it into `static/img/blog/`.               |
| "Prettier formatted it, so it must be correct."     | Prettier does not know MDX's paragraph rule. Build and read the warnings.     |
| "The build exited 0, so the post is clean."         | SSG warnings do not fail the build. Grep the warning list for your page path. |

## Red Flags

- A paragraph in the post that no human wrote or approved.
- A first-person sentence, promise, or project history claim you composed.
- A post body that grew while you were "just embedding" something.
- `src=` pointing at `cdn.bsky.app`, `pbs.twimg.com`, or any remote host.
- A `<p>`, `<span>`, or `<em>` JSX element split across lines in `.mdx`.
- A post whose text you retyped instead of pulling from the source API.

## Verification

- [ ] Every sentence of prose came from the maintainer, not from you.
- [ ] Post text, timestamp, and alt text match the canonical source record.
- [ ] All images resolve under `static/img/blog/<post-folder>/`.
- [ ] Front matter has `title`, `slug`, `authors`, `tags`, `date`, and `image`.
- [ ] No single-element JSX line exceeds 80 characters.
- [ ] `npx prettier --check` passes on the files you touched.
- [ ] `npm run build:ci` completes; the untruncated-post warning is expected
      from this site's deliberately disabled `truncateMarker`.

## Sources

- Context7: `/websites/docusaurus_io_3_9_2` (MDX truncation, JSX interleaving, blog front matter).
- `src/components/blog/BlueskyPost.tsx`, `src/components/blog/BlogFigure.tsx`
- [`AGENTS.md`](https://github.com/projectbluefin/documentation/blob/main/AGENTS.md) → _Never write in a maintainer's voice_
