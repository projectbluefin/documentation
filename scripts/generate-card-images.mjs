#!/usr/bin/env node
/**
 * generate-card-images.mjs
 *
 * Generates embeddable PNG cards matching the "Current Versions" section on
 * docs.projectbluefin.io/changelogs (OsReleaseCard).
 *
 * Output: static/img/cards/{slug}-{light|dark}.png
 * These are gitignored; generated during the CI build before docusaurus build.
 *
 * Usage: node scripts/generate-card-images.mjs
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { renderCard, W, H } from "./lib/card-template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Font loading ────────────────────────────────────────────────────────────
const FONTSOURCE = join(ROOT, "node_modules/@fontsource/inter/files");
const fontRegular = readFileSync(join(FONTSOURCE, "inter-latin-400-normal.woff"));
const fontBold = readFileSync(join(FONTSOURCE, "inter-latin-700-normal.woff"));

const fonts = [
  { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
  { name: "Inter", data: fontBold, weight: 700, style: "normal" },
];

// ── Mascot loading ──────────────────────────────────────────────────────────
function loadMascotDataUri(name) {
  const buf = readFileSync(join(ROOT, "static/img/characters", `${name}.png`));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const MASCOTS = {
  stable: loadMascotDataUri("bluefin-small"),
  lts: loadMascotDataUri("achillobator"),
  dakota: loadMascotDataUri("dakotaraptor"),
};

// ── Markdown parser (mirrors parseOsRelease.ts) ─────────────────────────────

function stripMd(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function splitMdRow(line) {
  return line.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
}

function isMdSeparatorRow(cells) {
  return cells.every((c) => /^:?-+:?$/.test(c));
}

function extractSectionsMd(content) {
  const sections = new Map();
  const lines = content.split(/\r?\n/);
  let heading = null;
  let rows = [];

  for (const line of lines) {
    const hm = line.match(/^###\s+(.*)/);
    if (hm) {
      if (heading !== null && rows.length > 0) sections.set(heading, rows);
      heading = stripMd(hm[1]);
      rows = [];
      continue;
    }
    if (heading !== null && line.startsWith("|")) {
      const cells = splitMdRow(line);
      if (!isMdSeparatorRow(cells)) rows.push(cells);
    }
  }
  if (heading !== null && rows.length > 0) sections.set(heading, rows);
  return sections;
}

function parseTwoColTableMd(rows) {
  const results = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const name = stripMd(cells[0]);
    if (!name || name === "Name") continue;
    const raw = stripMd(cells[1]);
    const parts = raw.split(/\s*➡️?\s*/u).map((s) => s.trim());
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      results.push({ name, version: parts[parts.length - 1], prevVersion: parts[0] });
    } else {
      results.push({ name, version: raw, prevVersion: null });
    }
  }
  return results;
}

function parseDiffRows(rows) {
  let added = 0, changed = 0, removed = 0;
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const indicator = cells[0].trim();
    if (indicator.includes("✨") || indicator === "+") added++;
    else if (indicator.includes("🔄") || indicator === "~") changed++;
    else if (indicator.includes("❌") || indicator === "-") removed++;
  }
  return { added, changed, removed };
}

function parseCommitRows(rows) {
  // Filter out the header row and count valid commit rows
  return rows.filter(cells => cells.length >= 2 && cells[0] && cells[0] !== "Hash").length;
}

function parseFeedItem(item, streamHint) {
  const content = item.content ?? "";
  const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(content);
  if (!isMarkdown) return null;

  const sections = extractSectionsMd(content);
  const majorPackages = parseTwoColTableMd(sections.get("Major packages") ?? []);
  const dxPackages = parseTwoColTableMd(sections.get("Major DX packages") ?? []);
  const gdxPackages = parseTwoColTableMd(sections.get("Major GDX packages") ?? []);
  if (majorPackages.length === 0) return null;

  const diffStats = parseDiffRows(sections.get("All Images") ?? []);
  const commitCount = parseCommitRows(sections.get("Commits") ?? []);

  // Extract Fedora version from title e.g. "(F43.20260331, ...)"
  const fedoraMatch = item.title.match(/\(F(\d+)\./);
  const fedoraVersion = fedoraMatch ? fedoraMatch[1] : null;
  // CentOS version from LTS title e.g. "(c10s, #...)"
  const centosMatch = item.title.match(/\(([a-z0-9]+s),\s*#/i);
  const centosVersion = centosMatch ? centosMatch[1] : null;

  // Normalize tag
  const prefixMatch = item.title.match(/^([a-z]+-[\d.]+)/i);
  let tag = prefixMatch ? prefixMatch[1].toLowerCase() : streamHint;
  tag = tag.replace(/^lts\.(\d{8})$/, "lts-$1");

  const dateMs = new Date(item.pubDate).getTime();

  return {
    stream: streamHint,
    tag,
    fedoraVersion,
    centosVersion,
    majorPackages,
    dxPackages,
    gdxPackages,
    diffStats,
    commitCount,
    dateMs: isNaN(dateMs) ? 0 : dateMs,
    link: item.link,
  };
}

// ── SBOM enrichment (mirrors FirehoseFeed.tsx enrichFromSbom) ───────────────

let SBOM_CACHE = null;
try {
  SBOM_CACHE = JSON.parse(readFileSync(join(ROOT, "static/data/sbom-attestations-frontend.json"), "utf8"));
} catch {
  // SBOM file absent or empty — enrichment silently skipped
}

const CHIP_TO_SBOM = [
  { chipName: "kernel",   displayName: "Kernel",   field: "kernel" },
  { chipName: "gnome",    displayName: "Gnome",    field: "gnome" },
  { chipName: "mesa",     displayName: "Mesa",     field: "mesa" },
  { chipName: "podman",   displayName: "Podman",   field: "podman" },
  { chipName: "bootc",    displayName: "bootc",    field: "bootc" },
  { chipName: "systemd",  displayName: "systemd",  field: "systemd" },
  { chipName: "pipewire", displayName: "pipewire", field: "pipewire" },
  { chipName: "flatpak",  displayName: "flatpak",  field: "flatpak" },
];

function sbomKeyForRelease(tag, stream) {
  const dateMatch = tag.match(/(\d{8})/);
  if (!dateMatch) return null;
  const date = dateMatch[1];
  if (stream === "lts") return { streamId: "bluefin-lts", cacheKey: `lts-${date}` };
  if (stream === "stable-daily") return { streamId: "bluefin-stable-daily", cacheKey: `stable-daily-${date}` };
  if (stream === "stable") return { streamId: "bluefin-stable", cacheKey: `stable-${date}` };
  return null;
}

function enrichFromSbom(release, stream) {
  if (!SBOM_CACHE) return release;

  let packages;
  if (stream === "dakota") {
    // Dakota tag ("dakota-alpha") has no date — look up the latest entry in
    // the dakota-latest SBOM stream directly instead of using a dated key.
    const dakotaReleases = SBOM_CACHE?.streams?.["dakota-latest"]?.releases ?? {};
    const latestKey = Object.keys(dakotaReleases).sort().reverse()[0];
    packages = latestKey ? dakotaReleases[latestKey]?.packageVersions : undefined;
  } else {
    const key = sbomKeyForRelease(release.tag, stream);
    if (!key) return release;
    packages = SBOM_CACHE?.streams?.[key.streamId]?.releases?.[key.cacheKey]?.packageVersions;
  }
  if (!packages) return release;

  // SBOM-primary: SBOM version wins for tracked packages; prevVersion preserved from
  // release notes for the gold change-indicator. Non-SBOM packages (Nvidia, HWE Kernel,
  // DX, GDX, etc.) are kept from release notes unchanged.
  const sbomChipNames = new Set(CHIP_TO_SBOM.map(({ chipName }) => chipName));
  const nonSbomPackages = release.majorPackages.filter(
    (p) => !sbomChipNames.has(p.name.toLowerCase())
  );
  const sbomPackages = [];
  for (const { chipName, displayName, field } of CHIP_TO_SBOM) {
    const sbomVersion = packages[field];
    const fromNotes = release.majorPackages.find((p) => p.name.toLowerCase() === chipName);
    const version = sbomVersion ?? fromNotes?.version ?? null;
    if (!version) continue; // neither SBOM nor release notes has this package
    sbomPackages.push({ name: displayName, version, prevVersion: fromNotes?.prevVersion ?? null });
  }
  if (sbomPackages.length === 0) return release;
  return { ...release, majorPackages: [...sbomPackages, ...nonSbomPackages] };
}

// ── Load release data ────────────────────────────────────────────────────────

function loadLatestRelease(feedPath, streamHint) {
  let feed;
  try {
    feed = JSON.parse(readFileSync(feedPath, "utf8"));
  } catch {
    console.error(`ERROR: ${feedPath} not found. Run \`npm run fetch-feeds\` first.`);
    process.exit(1);
  }
  for (const item of feed.items ?? []) {
    const parsed = parseFeedItem(item, streamHint);
    if (parsed) return parsed;
  }
  return null;
}

// Dakota: hardcoded placeholder (no releases yet — same as FirehoseFeed.tsx)
const DAKOTA_RELEASE = {
  stream: "dakota",
  tag: "dakota-alpha",
  fedoraVersion: null,
  centosVersion: null,
  majorPackages: [
    { name: "Kernel",            version: "6.18.7",  prevVersion: null },
    { name: "Gnome",             version: "50.0",    prevVersion: null },
    { name: "Mesa",              version: "25.3.5",  prevVersion: null },
    { name: "Podman",            version: "5.8.0",   prevVersion: null },
    { name: "bootc",             version: "1.12.1",  prevVersion: null },
    { name: "systemd",           version: "259.2",   prevVersion: null },
    { name: "pipewire",          version: "1.6.1",   prevVersion: null },
    { name: "sudo-rs",           version: "74e0db4", prevVersion: null },
    { name: "uutils-coreutils",  version: "e7f2fd9", prevVersion: null },
  ],
  dxPackages: [],
  gdxPackages: [],
  diffStats: { added: 0, changed: 0, removed: 0 },
  commitCount: 0,
  dateMs: 0,
  link: "https://github.com/projectbluefin/dakota",
};

// ── Content hashing ──────────────────────────────────────────────────────────

const HASH_MANIFEST_PATH = join(ROOT, "static/data/card-hashes.json");

/**
 * Compute a SHA-256 hash of the release data + card-template source that
 * determines the visual output of a card. If this hash hasn't changed,
 * the generated PNG will be byte-identical — no need to regenerate.
 */
function computeCardHash(release, stream) {
  const h = createHash("sha256");
  // Include the enriched release data (determines card content)
  h.update(JSON.stringify(release));
  // Include stream (affects theme colors / mascot selection)
  h.update(stream);
  // Include the card-template source (layout/style changes invalidate cache)
  try {
    h.update(readFileSync(join(__dirname, "lib/card-template.mjs"), "utf8"));
  } catch {
    // If template can't be read, always regenerate
    h.update(Date.now().toString());
  }
  return h.digest("hex");
}

function loadHashManifest() {
  try {
    return JSON.parse(readFileSync(HASH_MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveHashManifest(manifest) {
  mkdirSync(dirname(HASH_MANIFEST_PATH), { recursive: true });
  writeFileSync(HASH_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * Check whether all expected output files for a card slug exist on disk.
 */
function cardFilesExist(outDir, slug) {
  return ["light", "dark"].every((theme) =>
    existsSync(join(outDir, `${slug}-${theme}.png`))
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const stableRaw = loadLatestRelease(
    join(ROOT, "static/feeds/bluefin-releases.json"),
    "stable"
  );
  const ltsRaw = loadLatestRelease(
    join(ROOT, "static/feeds/bluefin-lts-releases.json"),
    "lts"
  );

  const stableRelease = stableRaw ? enrichFromSbom(stableRaw, "stable") : null;
  const ltsRelease    = ltsRaw    ? enrichFromSbom(ltsRaw,    "lts")    : null;
  const dakotaRelease = enrichFromSbom(DAKOTA_RELEASE, "dakota");

  const cards = [
    { release: stableRelease,  stream: "stable", slug: "bluefin" },
    { release: ltsRelease,     stream: "lts",    slug: "bluefin-lts" },
    { release: dakotaRelease,  stream: "dakota", slug: "dakota" },
  ];

  const outDir = join(ROOT, "static/img/cards");
  mkdirSync(outDir, { recursive: true });

  const prevManifest = loadHashManifest();
  const nextManifest = {};

  let generated = 0;
  let skipped = 0;

  for (const { release, stream, slug } of cards) {
    if (!release) {
      console.warn(`WARN: no release found for ${slug} — skipping`);
      continue;
    }

    const contentHash = computeCardHash(release, stream);
    nextManifest[slug] = contentHash;

    // Cache hit: hash matches AND output files already exist on disk
    if (prevManifest[slug] === contentHash && cardFilesExist(outDir, slug)) {
      console.log(`  ⊘ ${slug} — unchanged (cache hit)`);
      skipped++;
      continue;
    }

    const mascotDataUri = MASCOTS[stream] ?? MASCOTS.stable;

    for (const theme of ["light", "dark"]) {
      const element = renderCard(release, stream, release.dateMs, theme, mascotDataUri);

      const svg = await satori(element, { width: W, height: H, fonts });

      const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W * 2 } });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      const outPath = join(outDir, `${slug}-${theme}.png`);
      writeFileSync(outPath, pngBuffer);
      console.log(`  ✓ ${slug}-${theme}.png (${Math.round(pngBuffer.length / 1024)}KB)`);
      generated++;
    }
  }

  // Persist the manifest for the next run
  saveHashManifest(nextManifest);

  const parts = [`Generated ${generated} card image(s)`];
  if (skipped > 0) parts.push(`skipped ${skipped} (cached)`);
  console.log(`\n${parts.join(", ")} → static/img/cards/`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
