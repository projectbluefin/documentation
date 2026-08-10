# Unveiling Playlist Design

## Goal

Add the newly published YouTube playlist **The Gardener and the Winnower** to
the Bluefin music page without introducing a new presentation pattern.

## User-facing design

Insert a new section immediately after **Seven Days to the Wolves** in
`docs/music.md`:

- Heading: `Unveiling`
- Description: `[ Redacted ]`
- One `MusicPlaylist` card titled `The Gardener and the Winnower`
- Playlist ID: `PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5`
- Card variant: `card`

The existing `extensionsGrid` wrapper is used so the new card follows the
same responsive layout and visual treatment as every other music playlist.

## Data flow

Register the playlist ID and display title in
`scripts/fetch-playlist-metadata.js`. The existing build-time fetcher will then:

1. Read the playlist metadata from YouTube.
2. Cache the playlist thumbnail under `static/img/playlists/`.
3. Write the generated record to `static/data/playlist-metadata.json`.
4. Let `MusicPlaylist` resolve the cached description and thumbnail at runtime.

The generated JSON and image are outputs of the existing fetch pipeline and
must not be hand-edited.

## Error handling

Use the current `fetch-playlist-metadata.js` fallback behavior. If YouTube
metadata cannot be fetched, the generated record keeps the playlist URL and
title while allowing the component's existing placeholder behavior to render.
No new network or rendering fallback is needed.

## Validation

Run the existing playlist metadata unit test and the repository typecheck.
Inspect the generated record and cached thumbnail path, and confirm the new
section appears in the expected order in `docs/music.md`.

## Non-goals

- Do not change `/artwork/`.
- Do not change `MusicPlaylist` or its CSS.
- Do not add a second playlist or manually author the YouTube description.
- Do not alter existing music section titles, descriptions, or ordering.
