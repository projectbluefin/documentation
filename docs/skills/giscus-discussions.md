---
name: giscus-discussions
description: >-
  Verify, recover, and archive Bluefin blog Giscus Discussions. Use when a
  published blog post has no comments, the Open Discussion on New Blog Post
  workflow fails, or a source Discussion must be replaced by its blog post.
metadata:
  context7-sources:
    - /websites/github_en_graphql
---

# Giscus Discussions

## When to Use

Use this procedure after publishing a Bluefin blog post when:

- the `Open Discussion on New Blog Post` workflow fails or does not create a
  Discussion;
- the post’s Giscus comment area cannot find its Discussion;
- an existing draft Discussion must point readers to the published post.

## When NOT to Use

Do not use this procedure to change the Giscus component, its repository,
mapping, category, or styling. Do not create a Discussion for a draft post, and
do not archive the source Discussion before the published post and its comment
Discussion are both verified.

## Core Process

1. Confirm the post is live at
   `https://docs.projectbluefin.io/blog/<slug>/` and that its HTML includes
   `giscus`.
2. Inspect the matching `Open Discussion on New Blog Post` workflow run. The
   normal fix is to restore the existing `BLUEFIN_DISCUSSIONS_TOKEN` repository
   secret with Discussion write access in `ublue-os/bluefin`, then rerun the
   workflow. Do not create a replacement token, GitHub App, or credential
   scheme.
3. Search `ublue-os/bluefin` for the exact title
   `<post title> | Bluefin`. If it already exists, verify its body contains the
   expected SHA-1 marker and do not create a duplicate.
4. If the post is live, the workflow cannot run with its existing secret, and
   an authorized maintainer must recover the thread immediately, use GitHub
   GraphQL with the maintainer’s existing authenticated `gh` account. Obtain
   the repository and category IDs from
   `src/components/GiscusComments/index.tsx`; they are the source of truth for
   the configured Giscus target.
5. Create the Discussion with the exact title `<post title> | Bluefin` and a
   body containing:

   ```md
   A new blog post is up: **[<post title>](https://docs.projectbluefin.io/blog/<slug>)**

   Read it and join the conversation below! 🦕

   <!-- sha1: <sha1 of "<post title> | Bluefin"> -->
   ```

   Calculate the marker from the complete title, including the spaces around
   the vertical bar:

   ```sh
   printf %s '<post title> | Bluefin' | sha1sum
   ```

   GitHub’s documented `createDiscussion` mutation requires `repositoryId`,
   `categoryId`, `title`, and `body`:

   ```graphql
   mutation (
     $repositoryId: ID!
     $categoryId: ID!
     $title: String!
     $body: String!
   ) {
     createDiscussion(
       input: {
         repositoryId: $repositoryId
         categoryId: $categoryId
         title: $title
         body: $body
       }
     ) {
       discussion {
         id
         url
       }
     }
   }
   ```

6. Query the created Discussion and confirm its exact title, canonical post
   link, SHA-1 marker, and comment count. A count of zero is valid for a new
   post. The marker is required because the site maps Giscus with
   `mapping="og:title"` and `strict="1"`.
7. Only after the Giscus Discussion is verified, replace the source draft
   Discussion body with links to the live post and comment Discussion, then
   close it. Use GitHub GraphQL `updateDiscussion` and `closeDiscussion`
   mutations when the REST update endpoint is unavailable to the authenticated
   maintainer.

## Common Rationalizations

| Rationalization                                                    | Reality                                                                                                                                   |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| “The workflow failed, but the post is live, so comments can wait.” | A strict Giscus mapping has no discussion to attach to. Create or recover the exact matching Discussion before closing the source thread. |
| “A similar title is close enough.”                                 | Giscus strict mode matches the exact `og:title` hash. Use the blog title and its `Bluefin` suffix exactly.                                |
| “I can make a new token to unblock this.”                          | The supported automation uses `BLUEFIN_DISCUSSIONS_TOKEN`. Restore that secret; do not add another credential scheme.                     |
| “The original discussion can be closed first.”                     | Readers lose the migration path until the post and its comments are both live. Archive it last.                                           |

## Red Flags

- The workflow claims success without a new `ublue-os/bluefin` Discussion.
- The Giscus title differs from the blog title plus ` | Bluefin`.
- The Discussion body lacks its SHA-1 marker.
- More than one Discussion exists with the exact blog-comment title.
- The source draft Discussion is closed before the live post and comment
  Discussion are verified.

## Verification

- [ ] The live post returns successfully and includes the Giscus integration.
- [ ] Exactly one matching Discussion exists in `ublue-os/bluefin`.
- [ ] Its title, canonical post URL, and SHA-1 marker match the published post.
- [ ] The comment count has been checked; zero is recorded as a valid initial state.
- [ ] The source Discussion links to both the post and Giscus Discussion, then
      is closed.

## Sources

- GitHub GraphQL API Discussions guide, verified through Context7:
  [`/websites/github_en_graphql`](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions)
