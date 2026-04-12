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

import { readFileSync, mkdirSync, writeFileSync } from "fs";
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

function parseFeedItem(item, streamHint) {
  const content = item.content ?? "";
  const isMarkdown = /^\|[\s|:-]*---[\s|:-]*\|/m.test(content);
  if (!isMarkdown) return null;

  const sections = extractSectionsMd(content);
  const majorPackages = parseTwoColTableMd(sections.get("Major packages") ?? []);
  const dxPackages = parseTwoColTableMd(sections.get("Major DX packages") ?? []);
  const gdxPackages = parseTwoColTableMd(sections.get("Major GDX packages") ?? []);
  if (majorPackages.length === 0) return null;

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
    dateMs: isNaN(dateMs) ? 0 : dateMs,
    link: item.link,
  };
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
  dateMs: 0,
  link: "https://github.com/projectbluefin/dakota",
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const stableRelease = loadLatestRelease(
    join(ROOT, "static/feeds/bluefin-releases.json"),
    "stable"
  );
  const ltsRelease = loadLatestRelease(
    join(ROOT, "static/feeds/bluefin-lts-releases.json"),
    "lts"
  );

  const cards = [
    { release: stableRelease, stream: "stable", slug: "bluefin" },
    { release: ltsRelease,    stream: "lts",    slug: "bluefin-lts" },
    { release: DAKOTA_RELEASE, stream: "dakota", slug: "dakota" },
  ];

  const outDir = join(ROOT, "static/img/cards");
  mkdirSync(outDir, { recursive: true });

  let generated = 0;

  for (const { release, stream, slug } of cards) {
    if (!release) {
      console.warn(`WARN: no release found for ${slug} — skipping`);
      continue;
    }

    const mascotDataUri = MASCOTS[stream] ?? MASCOTS.stable;

    for (const theme of ["light", "dark"]) {
      const element = renderCard(release, stream, release.dateMs, theme, mascotDataUri);

      const svg = await satori(element, { width: W, height: H, fonts });

      const resvg = new Resvg(svg, { fitTo: { mode: "width", value: W } });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      const outPath = join(outDir, `${slug}-${theme}.png`);
      writeFileSync(outPath, pngBuffer);
      console.log(`  ✓ ${slug}-${theme}.png (${Math.round(pngBuffer.length / 1024)}KB)`);
      generated++;
    }
  }

  console.log(`\nGenerated ${generated} card images → static/img/cards/`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
