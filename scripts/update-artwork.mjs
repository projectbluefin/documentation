#!/usr/bin/env node
/**
 * scripts/update-artwork.mjs
 *
 * Detects new wallpapers in ublue-os/artwork that are not yet in the local
 * artwork.json manifest, downloads + converts them to WebP thumbnails and
 * full-resolution WebP images, and updates artwork.json with skeleton entries.
 *
 * Also writes ARTWORK_CHANGES.md summarising what was added, for use as the
 * body of the automated PR opened by the GitHub Actions workflow.
 *
 * Usage:
 *   node scripts/update-artwork.mjs [--dry-run]
 *
 * Environment:
 *   GITHUB_TOKEN   Optional. Used to authenticate GitHub API requests to
 *                  avoid rate-limiting in CI.
 *
 * Exit codes:
 *   0  Success (including "nothing new to add" — fully idempotent)
 *   1  Fatal error (bad manifest, conversion failure, API error)
 *
 * Dependencies (runtime, not npm):
 *   djxl     Provided by libjxl-tools (Ubuntu) — decodes .jxl → .png
 *   ffmpeg   Converts any decoded image → WebP thumbnail and fullres
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { join, dirname, extname, basename } from "path";
import { fileURLToPath } from "url";
import os from "os";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(REPO_ROOT, "static/data/artwork.json");
const CHANGES_PATH = join(REPO_ROOT, "ARTWORK_CHANGES.md");
const THUMBNAILS_DIR = join(REPO_ROOT, "static/img/artwork/thumbnails");
const FULLRES_DIR = join(REPO_ROOT, "static/img/artwork/fullres");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

const UPSTREAM = "ublue-os/artwork";
const GITHUB_API = "https://api.github.com";
const RAW_BASE = `https://raw.githubusercontent.com/${UPSTREAM}/main`;

const apiHeaders = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "bluefin-docs-artwork-sync/1.0",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {}),
};

/**
 * Fetch a URL and return parsed JSON.
 * Throws on non-2xx responses with a descriptive message.
 */
async function fetchJSON(url) {
  const res = await fetch(url, { headers: apiHeaders });
  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(`HTTP ${res.status} from ${url}\n${body}`);
  }
  return res.json();
}

/**
 * Fetch the full recursive tree of the upstream repo's main branch.
 * Returns an array of { path, type, sha, url } objects.
 *
 * The recursive=1 parameter collapses everything into one call, which avoids
 * having to walk subtrees one-by-one.  For large repos this may be truncated
 * by GitHub; the `truncated` field is checked and we bail if true.
 */
async function fetchRepoTree() {
  const data = await fetchJSON(
    `${GITHUB_API}/repos/${UPSTREAM}/git/trees/main?recursive=1`
  );
  if (data.truncated) {
    throw new Error(
      "GitHub tree response was truncated — repo is too large for recursive=1. " +
        "Consider switching to paginated subtree fetches."
    );
  }
  return data.tree; // array of { path, type, sha, url }
}

// ---------------------------------------------------------------------------
// Image download & conversion
// ---------------------------------------------------------------------------

/**
 * Download a raw file from ublue-os/artwork at its main-branch path.
 * Returns the local temp file path.
 */
async function downloadRaw(remotePath, suffix) {
  const url = `${RAW_BASE}/${remotePath}`;
  const res = await fetch(url, { headers: apiHeaders });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = join(os.tmpdir(), `artwork-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`);
  writeFileSync(tmp, buf);
  return tmp;
}

/**
 * Given a local file (png/jpg/svg/jxl), produce:
 *   - thumbnailPath  480px-wide WebP  → static/img/artwork/thumbnails/<name>.webp
 *   - fullresPath   1920px-wide WebP  → static/img/artwork/fullres/<name>.webp
 *
 * For JXL files, djxl is used to decode to PNG first, then ffmpeg handles
 * the rest.  ffmpeg supports PNG, JPEG, and SVG (via librsvg) natively.
 *
 * Returns { thumbnailPath, fullresPath }.
 */
function convertToWebP(srcFile, outputName, ext) {
  let pngFile = srcFile;
  let createdPng = false;

  // Decode JXL → PNG so ffmpeg can ingest it
  if (ext === ".jxl") {
    pngFile = srcFile.replace(/\.jxl$/, ".png");
    execSync(`djxl "${srcFile}" "${pngFile}"`, { stdio: "pipe" });
    createdPng = true;
  }

  mkdirSync(THUMBNAILS_DIR, { recursive: true });
  mkdirSync(FULLRES_DIR, { recursive: true });

  const thumbnailPath = join(THUMBNAILS_DIR, `${outputName}.webp`);
  const fullresPath = join(FULLRES_DIR, `${outputName}.webp`);

  // Thumbnail: scale to 480px wide, preserve aspect ratio, quality 85
  execSync(
    `ffmpeg -y -i "${pngFile}" -vf "scale=480:-1" -quality 85 "${thumbnailPath}"`,
    { stdio: "pipe" }
  );

  // Full-resolution: scale to max 1920px wide (don't upscale smaller images)
  execSync(
    `ffmpeg -y -i "${pngFile}" -vf "scale='min(1920,iw)':-1" -quality 90 "${fullresPath}"`,
    { stdio: "pipe" }
  );

  if (createdPng) {
    try { unlinkSync(pngFile); } catch { /* best-effort cleanup */ }
  }

  return { thumbnailPath, fullresPath };
}

/**
 * Download and convert a wallpaper image; returns output paths relative to
 * the repo static root (as used in artwork.json previewUrl / dayUrl fields).
 *
 * @param {string} remotePath  Path within the upstream repo (e.g. "wallpapers/aurora/...")
 * @param {string} outputName  Slug used for the output filenames
 * @returns {{ thumbnailWebpUrl: string, fullresWebpUrl: string }}
 */
async function downloadAndConvert(remotePath, outputName) {
  const ext = extname(remotePath).toLowerCase();
  let tmpFile;
  try {
    tmpFile = await downloadRaw(remotePath, ext);
    const { thumbnailPath, fullresPath } = convertToWebP(tmpFile, outputName, ext);

    // Return site-root-relative paths (as used throughout artwork.json)
    return {
      thumbnailWebpUrl: `/img/artwork/thumbnails/${outputName}.webp`,
      fullresWebpUrl: `/img/artwork/fullres/${outputName}.webp`,
    };
  } finally {
    if (tmpFile && existsSync(tmpFile)) {
      try { unlinkSync(tmpFile); } catch { /* best-effort */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse the artwork.json manifest.
 */
function readManifest() {
  const raw = readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * Write the updated manifest to disk (direct overwrite — acceptable in CI
 * where this is the only writer process).
 */
function writeManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Get all wallpaper paths from the repo tree as a Set (only blob/file entries).
 */
function getTreePaths(tree) {
  return new Set(tree.filter((e) => e.type === "blob").map((e) => e.path));
}

/**
 * Get the set of directory names under a given prefix in the tree.
 * Only returns immediate children (one level deep).
 */
function getSubdirNames(tree, prefix) {
  const dirs = new Set();
  for (const entry of tree) {
    if (!entry.path.startsWith(prefix + "/")) continue;
    const rest = entry.path.slice(prefix.length + 1);
    const firstSegment = rest.split("/")[0];
    if (firstSegment) dirs.add(firstSegment);
  }
  return dirs;
}

// ---------------------------------------------------------------------------
// Per-collection detection & processing
// ---------------------------------------------------------------------------

/**
 * Bluefin monthly wallpapers.
 *
 * Upstream layout: wallpapers/bluefin/png/NN-bluefin-day.png
 *                              (and) NN-bluefin-night.png
 * Manifest IDs:    bluefin-NN  (zero-padded two digits)
 * Detection:       any NN not yet present in the collection
 */
async function syncBluefinMonthly(manifest, tree, changes) {
  const collection = manifest.projects.bluefin.collections.find(
    (c) => c.id === "bluefin-monthly"
  );
  if (!collection) throw new Error("bluefin-monthly collection not found in manifest");

  const existingNums = new Set(
    collection.wallpapers.map((w) => {
      const m = w.id.match(/^bluefin-(\d+)$/);
      return m ? parseInt(m[1], 10) : null;
    }).filter(Boolean)
  );

  const paths = getTreePaths(tree);
  const newWallpapers = [];

  // Find all unique NN values in the upstream tree
  for (const p of paths) {
    const m = p.match(/^wallpapers\/bluefin\/png\/(\d{2})-bluefin-day\.png$/);
    if (!m) continue;
    const nn = parseInt(m[1], 10);
    if (existingNums.has(nn)) continue;

    const nnPadded = String(nn).padStart(2, "0");
    const outputBase = `bluefin-${nnPadded}`;
    const dayRemote = `wallpapers/bluefin/png/${nnPadded}-bluefin-day.png`;
    const nightRemote = `wallpapers/bluefin/png/${nnPadded}-bluefin-night.png`;

    console.log(`  [bluefin-monthly] New entry: ${outputBase}`);

    let previewUrl = null;
    let previewNightUrl = null;

    if (!DRY_RUN) {
      // Download and convert the day image for the thumbnail
      const { thumbnailWebpUrl } = await downloadAndConvert(dayRemote, `${outputBase}-day`);
      previewUrl = thumbnailWebpUrl;

      // Night thumbnail if the night image exists upstream
      if (paths.has(nightRemote)) {
        const { thumbnailWebpUrl: nightThumb } = await downloadAndConvert(nightRemote, `${outputBase}-night`);
        previewNightUrl = nightThumb;
      }
    } else {
      previewUrl = `/img/artwork/thumbnails/${outputBase}-day.webp`;
      previewNightUrl = `/img/artwork/thumbnails/${outputBase}-night.webp`;
    }

    newWallpapers.push({
      id: outputBase,
      title: null,
      author: null,
      authorLicense: null,
      previewUrl,
      dayUrl: `https://raw.githubusercontent.com/${UPSTREAM}/main/${dayRemote}`,
      nightUrl: paths.has(nightRemote)
        ? `https://raw.githubusercontent.com/${UPSTREAM}/main/${nightRemote}`
        : null,
      jxlUrl: null,
      primaryFormat: "png",
      hasLightbox: true,
      previewNightUrl,
    });
    changes.push(`- **Bluefin Monthly #${nnPadded}** — new monthly wallpaper (author TBD)`);
  }

  if (newWallpapers.length > 0) {
    // Insert in numeric order
    collection.wallpapers.push(...newWallpapers);
    collection.wallpapers.sort((a, b) => {
      const na = parseInt(a.id.replace("bluefin-", ""), 10);
      const nb = parseInt(b.id.replace("bluefin-", ""), 10);
      return na - nb;
    });
  }

  return newWallpapers.length;
}

/**
 * Bluefin extras.
 *
 * Upstream layout: wallpapers/{name}/ (directories that are NOT "bluefin",
 *                  "aurora", "bazzite", or "framework")
 *
 * The extras collection also includes the bluefin/images/ JXL files and
 * named directories like "framework".  We detect any directory whose name
 * is not already an existing wallpaper `id` in the extras collection.
 *
 * Note: "framework" is a known special case with SVGs; we handle it by
 * treating the directory as a named extra.
 */
async function syncBluefinExtras(manifest, tree, changes) {
  const collection = manifest.projects.bluefin.collections.find(
    (c) => c.id === "bluefin-wallpapers-extra"
  );
  if (!collection) throw new Error("bluefin-wallpapers-extra collection not found in manifest");

  const existingIds = new Set(collection.wallpapers.map((w) => w.id));

  // Collect top-level wallpaper directories (excluding the monthly dirs)
  // "bluefin-wallpapers-extra" is a packaging directory containing SVG source
  // files for existing extras wallpapers — not a new wallpaper entry.
  const SKIP_DIRS = new Set(["bluefin", "aurora", "bazzite", "bluefin-wallpapers-extra"]);
  const topLevelDirs = getSubdirNames(tree, "wallpapers");
  const newWallpapers = [];

  for (const dirName of topLevelDirs) {
    if (SKIP_DIRS.has(dirName)) continue;
    if (existingIds.has(dirName)) continue;

    console.log(`  [bluefin-extras] New directory: wallpapers/${dirName}/`);

    // Try to find a usable image in this directory.
    // Prefer: .jxl > .png > .jpg > .svg
    const dirFiles = [...getTreePaths(tree)].filter((p) =>
      p.startsWith(`wallpapers/${dirName}/`)
    );
    const pick = (exts) =>
      dirFiles.find((p) => exts.some((e) => p.toLowerCase().endsWith(e)));

    const srcPath =
      pick([".jxl"]) ||
      pick([".png"]) ||
      pick([".jpg", ".jpeg"]) ||
      pick([".svg"]);

    if (!srcPath) {
      console.warn(`  [bluefin-extras] No image found in wallpapers/${dirName}/ — skipping`);
      continue;
    }

    const ext = extname(srcPath).toLowerCase();
    const outputName = `bluefin-${dirName}`;

    let previewUrl = null;
    let fullresWebpUrl = null;
    let jxlUrl = null;

    if (ext === ".jxl") {
      jxlUrl = `https://raw.githubusercontent.com/${UPSTREAM}/main/${srcPath}`;
    }

    if (!DRY_RUN && ext !== ".svg") {
      // SVGs are served directly (no conversion needed for extras with SVGs).
      const converted = await downloadAndConvert(srcPath, outputName);
      previewUrl = converted.thumbnailWebpUrl;
      fullresWebpUrl = converted.fullresWebpUrl;
    } else {
      previewUrl = ext !== ".svg"
        ? `/img/artwork/thumbnails/${outputName}.webp`
        : null;
      fullresWebpUrl = ext !== ".svg"
        ? `/img/artwork/fullres/${outputName}.webp`
        : null;
    }

    const rawBase = `https://raw.githubusercontent.com/${UPSTREAM}/main`;
    const dayUrl = fullresWebpUrl ?? `${rawBase}/${srcPath}`;

    newWallpapers.push({
      id: dirName,
      title: dirName
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()), // title-case slug
      author: null,
      authorLicense: null,
      previewUrl,
      previewNightUrl: null,
      dayUrl,
      nightUrl: null,
      jxlUrl,
      primaryFormat: ext === ".svg" ? "svg" : ext.slice(1),
      hasLightbox: true,
    });

    changes.push(`- **Bluefin Extra "${dirName}"** — new wallpaper directory (author TBD)`);
  }

  // Also detect new JXL images added to wallpapers/bluefin/images/
  // Exclude NN-bluefin-day/night JXLs — those are counterparts to the monthly
  // PNG wallpapers already tracked in the bluefin-monthly collection.
  const MONTHLY_JXL_RE = /^wallpapers\/bluefin\/images\/\d{2}-bluefin-(day|night)\.jxl$/i;
  const bluefinJxls = [...getTreePaths(tree)].filter((p) =>
    p.startsWith("wallpapers/bluefin/images/") &&
    p.endsWith(".jxl") &&
    !MONTHLY_JXL_RE.test(p)
  );
  for (const jxlPath of bluefinJxls) {
    const slug = basename(jxlPath, ".jxl");
    if (existingIds.has(slug)) continue;

    console.log(`  [bluefin-extras] New JXL: ${jxlPath}`);

    const outputName = `bluefin-${slug}`;
    let previewUrl = null;
    let fullresWebpUrl = null;

    if (!DRY_RUN) {
      const converted = await downloadAndConvert(jxlPath, outputName);
      previewUrl = converted.thumbnailWebpUrl;
      fullresWebpUrl = converted.fullresWebpUrl;
    } else {
      previewUrl = `/img/artwork/thumbnails/${outputName}.webp`;
      fullresWebpUrl = `/img/artwork/fullres/${outputName}.webp`;
    }

    newWallpapers.push({
      id: slug,
      title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      author: null,
      authorLicense: null,
      previewUrl,
      previewNightUrl: null,
      dayUrl: fullresWebpUrl,
      nightUrl: null,
      jxlUrl: `https://raw.githubusercontent.com/${UPSTREAM}/main/${jxlPath}`,
      primaryFormat: null,
      hasLightbox: true,
    });

    changes.push(`- **Bluefin Extra (JXL) "${slug}"** — new artwork (author TBD)`);
  }

  collection.wallpapers.push(...newWallpapers);
  return newWallpapers.length;
}

/**
 * Aurora wallpapers.
 *
 * Upstream layout: wallpapers/aurora/{id}/contents/images/*.jxl
 * Manifest IDs:    {id}  (the directory name, e.g. "aurora-wallpaper-10")
 * Detection:       any {id} directory not already in the collection
 */
async function syncAurora(manifest, tree, changes) {
  const collection = manifest.projects.aurora.collections.find(
    (c) => c.id === "aurora-wallpapers"
  );
  if (!collection) throw new Error("aurora-wallpapers collection not found in manifest");

  const existingIds = new Set(collection.wallpapers.map((w) => w.id));
  const upstreamIds = getSubdirNames(tree, "wallpapers/aurora");
  const newWallpapers = [];

  for (const id of upstreamIds) {
    if (existingIds.has(id)) continue;

    console.log(`  [aurora] New wallpaper: ${id}`);

    // Find the JXL in the images subdirectory (pick the highest resolution)
    const jxlFiles = [...getTreePaths(tree)].filter((p) =>
      p.startsWith(`wallpapers/aurora/${id}/contents/images/`) && p.endsWith(".jxl")
    );

    // Sort by resolution if multiple JXLs exist (e.g. 3840x2160 > 1920x1080)
    jxlFiles.sort((a, b) => {
      const resA = parseInt(basename(a, ".jxl").split("x")[0], 10) || 0;
      const resB = parseInt(basename(b, ".jxl").split("x")[0], 10) || 0;
      return resB - resA; // descending (highest first)
    });

    const jxlPath = jxlFiles[0] ?? null;
    const outputName = `aurora-${id}`;

    let previewUrl = null;
    let fullresWebpUrl = null;

    if (!DRY_RUN && jxlPath) {
      const converted = await downloadAndConvert(jxlPath, outputName);
      previewUrl = converted.thumbnailWebpUrl;
      fullresWebpUrl = converted.fullresWebpUrl;
    } else {
      previewUrl = `/img/artwork/thumbnails/${outputName}.webp`;
      fullresWebpUrl = `/img/artwork/fullres/${outputName}.webp`;
    }

    newWallpapers.push({
      id,
      title: id
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      author: null,
      authorLicense: null,
      previewUrl,
      dayUrl: fullresWebpUrl,
      nightUrl: null,
      jxlUrl: jxlPath
        ? `https://raw.githubusercontent.com/${UPSTREAM}/main/${jxlPath}`
        : null,
      primaryFormat: null,
      hasLightbox: true,
      previewNightUrl: null,
    });

    changes.push(`- **Aurora "${id}"** — new wallpaper (author/title TBD)`);
  }

  collection.wallpapers.push(...newWallpapers);
  return newWallpapers.length;
}

/**
 * Bazzite wallpapers.
 *
 * Upstream layout: wallpapers/bazzite/images/*.{jpg,png,jxl}
 * Manifest IDs:    bazzite-{slug}  where slug is the filename without extension,
 *                  lowercased + underscores → hyphens
 * Detection:       any file whose slug-based ID is not already in the collection
 */
async function syncBazzite(manifest, tree, changes) {
  const collection = manifest.projects.bazzite.collections.find(
    (c) => c.id === "bazzite-wallpapers"
  );
  if (!collection) throw new Error("bazzite-wallpapers collection not found in manifest");

  const existingIds = new Set(collection.wallpapers.map((w) => w.id));

  // Also index by the filename of the upstream source URL so we don't
  // duplicate wallpapers that were added manually with a different ID
  // convention (e.g. "bazzite-giants" for the file "Bazzite_Giants.jpg").
  const existingFilenames = new Set(
    collection.wallpapers.flatMap((w) => {
      const urls = [w.dayUrl, w.nightUrl, w.jxlUrl].filter(Boolean);
      return urls.map((u) => basename(u).toLowerCase());
    })
  );
  // Skip .jxl pairs for files that already have a PNG/JPG counterpart
  const bazziteFiles = [...getTreePaths(tree)].filter((p) =>
    p.startsWith("wallpapers/bazzite/images/") &&
    /\.(jpg|jpeg|png|jxl)$/i.test(p)
  );

  // Group by base name (without extension) to handle JXL + PNG pairs
  /** @type {Map<string, { png?: string, jpg?: string, jxl?: string }>} */
  const byBase = new Map();
  for (const p of bazziteFiles) {
    const ext = extname(p).toLowerCase().slice(1);
    const base = basename(p, extname(p));
    if (!byBase.has(base)) byBase.set(base, {});
    byBase.get(base)[ext] = p;
  }

  const newWallpapers = [];

  for (const [base, variants] of byBase) {
    // Derive a stable slug: lowercase, spaces+underscores → hyphens
    const slug = base.toLowerCase().replace(/[\s_]+/g, "-");
    const id = `bazzite-${slug}`;

    if (existingIds.has(id)) continue;

    // Also skip if any of the source filenames are already referenced in the
    // manifest (handles manually-added entries with different ID conventions)
    const fileBaseLower = base.toLowerCase();
    const alreadyCovered = [...Object.values(variants)].some((p) =>
      existingFilenames.has(basename(p).toLowerCase())
    );
    if (alreadyCovered) {
      // Known file under a different manifest ID — skip silently
      continue;
    }

    console.log(`  [bazzite] New wallpaper: ${id}`);

    // Primary format preference: png > jpg > jxl
    const primaryExt = variants.png ? "png"
      : variants.jpg ? "jpg"
      : variants.jpeg ? "jpg"
      : "jxl";
    const primaryPath = variants[primaryExt] ?? variants.jpeg ?? Object.values(variants)[0];
    const jxlPath = variants.jxl ?? null;
    const outputName = id;

    let previewUrl = null;

    if (!DRY_RUN) {
      const converted = await downloadAndConvert(primaryPath, outputName);
      previewUrl = converted.thumbnailWebpUrl;
      // Note: we only store the thumbnail for bazzite (no fullres WebP — we
      // link directly to the upstream PNG/JPG via dayUrl instead).
    } else {
      previewUrl = `/img/artwork/thumbnails/${outputName}.webp`;
    }

    const rawBase = `https://raw.githubusercontent.com/${UPSTREAM}/main`;

    newWallpapers.push({
      id,
      title: base
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      author: null,
      authorLicense: null,
      previewUrl,
      dayUrl: `${rawBase}/${primaryPath}`,
      nightUrl: null,
      jxlUrl: jxlPath ? `${rawBase}/${jxlPath}` : null,
      primaryFormat: primaryExt,
      hasLightbox: true,
      previewNightUrl: null,
    });

    changes.push(`- **Bazzite "${base}"** — new wallpaper (author TBD)`);
  }

  collection.wallpapers.push(...newWallpapers);
  return newWallpapers.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`update-artwork.mjs — ${DRY_RUN ? "DRY RUN" : "live mode"}`);
  console.log(`Upstream: https://github.com/${UPSTREAM}`);

  // Validate required tools are available (skip in dry-run since we won't call them)
  if (!DRY_RUN) {
    for (const tool of ["djxl", "ffmpeg"]) {
      try {
        execSync(`command -v ${tool}`, { stdio: "pipe" });
      } catch {
        throw new Error(
          `Required tool '${tool}' not found in PATH. ` +
            "Install libjxl-tools (for djxl) and ffmpeg before running this script."
        );
      }
    }
  }

  console.log("Fetching upstream repo tree…");
  const tree = await fetchRepoTree();
  console.log(`  Got ${tree.length} tree entries`);

  const manifest = readManifest();
  const changes = [];

  // Run all four sync routines
  const counts = {
    bluefinMonthly: await syncBluefinMonthly(manifest, tree, changes),
    bluefinExtras: await syncBluefinExtras(manifest, tree, changes),
    aurora: await syncAurora(manifest, tree, changes),
    bazzite: await syncBazzite(manifest, tree, changes),
  };

  const totalNew = Object.values(counts).reduce((a, b) => a + b, 0);

  if (totalNew === 0) {
    console.log("No new wallpapers detected — manifest is up to date.");
    // Exit 0 — idempotent
    return;
  }

  console.log(`\nAdded ${totalNew} new wallpaper(s):`);
  for (const line of changes) console.log(` ${line}`);

  // Update the generatedAt timestamp
  manifest.generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  if (!DRY_RUN) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    console.log(`\nWrote updated manifest → ${MANIFEST_PATH}`);

    // Write PR body
    const body = [
      "## Automated artwork sync from `ublue-os/artwork`",
      "",
      `Detected **${totalNew}** new wallpaper(s). Skeleton entries have been added to`,
      "`static/data/artwork.json`. Please fill in `title`, `author`, and `authorLicense`",
      "before merging.",
      "",
      "### Changes",
      ...changes,
      "",
      "---",
      `_Generated by \`scripts/update-artwork.mjs\` at ${manifest.generatedAt}_`,
    ].join("\n");

    writeFileSync(CHANGES_PATH, body, "utf8");
    console.log(`Wrote PR body → ${CHANGES_PATH}`);
  } else {
    console.log("\n[dry-run] No files written.");
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message ?? err);
  process.exit(1);
});
