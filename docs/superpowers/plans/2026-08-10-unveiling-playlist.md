# Unveiling Playlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the YouTube playlist "The Gardener and the Winnower" to the Bluefin music page in a new "Unveiling" section below "Seven Days to the Wolves," using the existing metadata and card patterns.

**Architecture:** Keep presentation in `docs/music.md` with the existing `MusicPlaylist` component. Register the playlist in the existing metadata fetcher so the build generates its current YouTube description and cached thumbnail; do not add component or CSS behavior.

**Tech Stack:** Docusaurus MDX, React/TypeScript `MusicPlaylist`, Node.js metadata fetcher, generated JSON and image assets.

## Global Constraints

- Use the existing `MusicPlaylist` card pattern; do not change `MusicPlaylist` or its CSS.
- Add the section immediately after "Seven Days to the Wolves."
- Use section heading `Unveiling` and description `[ Redacted ]`.
- Use playlist title `The Gardener and the Winnower`.
- Use playlist ID `PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5`.
- Fetch the YouTube description and thumbnail through `scripts/fetch-playlist-metadata.js`; never hand-edit generated outputs.
- Do not change `/artwork/` or add a second playlist.

---

### Task 1: Add the Unveiling playlist source and page card

**Files:**
- Modify: `scripts/fetch-playlist-metadata.js:8-54` - add the playlist definition to `PLAYLISTS`.
- Modify: `docs/music.md:9-38` - insert the new section after the existing "Seven Days to the Wolves" grid.

**Interfaces:**
- Consumes: `MusicPlaylist` props `title`, `playlistId`, and `variant="card"`.
- Produces: one registered playlist source and one MDX card that references the same playlist ID.

- [ ] **Step 1: Register the playlist in the metadata fetcher**

Add this object to the `PLAYLISTS` array near the other current story playlists:

```js
{
  id: "PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5",
  title: "The Gardener and the Winnower",
},
```

- [ ] **Step 2: Add the new section in the existing page layout**

Insert this block immediately after the closing `</div>` for "Seven Days to the Wolves" and before `## Allies from The Light`:

```mdx
## Unveiling

[ Redacted ]

<div className={styles.extensionsGrid}>

<MusicPlaylist
  title="The Gardener and the Winnower"
  playlistId="PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5"
  variant="card"
/>

</div>
```

- [ ] **Step 3: Run the existing playlist metadata unit test**

Run:

```bash
node --test scripts/fetch-playlist-metadata.test.js
```

Expected: all playlist metadata parser tests pass. This confirms the existing fetcher test surface remains healthy before generating new outputs.

- [ ] **Step 4: Commit the source change**

Run:

```bash
git add docs/music.md scripts/fetch-playlist-metadata.js
git diff --cached --name-only
git commit -m "docs(music): add Unveiling playlist" -m "Assisted-by: GPT-5.6 Luna via GitHub Copilot

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: only `docs/music.md` and `scripts/fetch-playlist-metadata.js` are included in this commit.

### Task 2: Generate the playlist metadata and thumbnail

**Files:**
- Modify: `static/data/playlist-metadata.json` - generated metadata record.
- Create or modify: `static/img/playlists/` - generated cached thumbnail for the playlist ID.

**Interfaces:**
- Consumes: the playlist definition from `scripts/fetch-playlist-metadata.js`.
- Produces: a metadata record whose `id` is `PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5`, plus a local thumbnail path used by `MusicPlaylist`.

- [ ] **Step 1: Run the existing fetch command**

Run:

```bash
npm run fetch-playlists
```

Expected: the script fetches YouTube metadata for the registered playlists and exits successfully, writing `static/data/playlist-metadata.json` and caching the new thumbnail under `static/img/playlists/`.

- [ ] **Step 2: Verify the generated record and thumbnail**

Run:

```bash
node -e 'const fs = require("fs"); const id = "PLhiPP9M5fgWETQZheRqv2ue5bv-zZNpK5"; const data = JSON.parse(fs.readFileSync("static/data/playlist-metadata.json", "utf8")); const item = data.find((entry) => entry.id === id); if (!item || item.title !== "The Gardener and the Winnower" || !item.playlistUrl.includes(id)) throw new Error("Generated playlist metadata is missing or incorrect"); const image = fs.readdirSync("static/img/playlists").find((name) => name.startsWith(`${id}.`)); if (!image) throw new Error("Generated playlist thumbnail is missing"); console.log(JSON.stringify({ ...item, image }, null, 2));'
```

Expected: the output contains the playlist ID, title, YouTube playlist URL, the fetched description value, and the generated local thumbnail filename.

- [ ] **Step 3: Commit generated outputs**

Run:

```bash
git add static/data/playlist-metadata.json static/img/playlists/
git diff --cached --name-only
git commit -m "build(music): cache Unveiling playlist metadata" -m "Assisted-by: GPT-5.6 Luna via GitHub Copilot

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: only the generated playlist metadata file and the new playlist thumbnail are included.

### Task 3: Run final validation

**Files:**
- Test: `scripts/fetch-playlist-metadata.test.js`
- Validate: `docs/music.md`, `scripts/fetch-playlist-metadata.js`, `static/data/playlist-metadata.json`, and the generated thumbnail.

**Interfaces:**
- Consumes: the committed source and generated metadata from Tasks 1 and 2.
- Produces: a typechecked, whitespace-clean music page update with the new section in the expected order.

- [ ] **Step 1: Re-run the targeted unit test**

Run:

```bash
node --test scripts/fetch-playlist-metadata.test.js
```

Expected: PASS.

- [ ] **Step 2: Run the repository typecheck**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits successfully with no new errors.

- [ ] **Step 3: Check the changed paths and whitespace**

Run:

```bash
git diff --check HEAD~2..HEAD
git show --stat --oneline HEAD~1
git show --stat --oneline HEAD
```

Expected: the two implementation commits contain only the intended source and generated playlist files; pre-existing unrelated working-tree changes remain unstaged and untouched.
