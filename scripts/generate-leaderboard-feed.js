#!/usr/bin/env node
/**
 * Builds the RSS feed for the /leaderboards "Moments of Triumph" stream.
 *
 * The page renders `hive-history.json`'s `milestones`,
 * `season.breadthUnlocks`, and `season.firstContributions` as one newest-first
 * ledger. This feed mirrors that stream so readers can subscribe to it without
 * polling the page.
 *
 * Runs at build time (see scripts/build-site.mjs) and writes into
 * static/feeds/, which is generated output and gitignored.
 */
const fs = require("node:fs");
const path = require("node:path");

const SITE_URL = "https://docs.projectbluefin.io";
const PAGE_URL = `${SITE_URL}/leaderboards/`;
const FEED_URL = `${SITE_URL}/feeds/moments-of-triumph.xml`;
const DOSSIER_BASE =
  "https://hosted-projectbluefin-common-nmq5.hive.hivecommons.dev/contribute/dossier";

const HISTORY_FILE = path.join(__dirname, "../static/data/hive-history.json");
const OUTPUT_FILE = path.join(
  __dirname,
  "../static/feeds/moments-of-triumph.xml",
);

const TYPE_LABELS = {
  tier_up: "Trust tier",
  task_landmark: "Task landmark",
  project_unlock: "Project unlock",
  first_contribution: "First contribution",
};

const CHANNEL_DESCRIPTION =
  "Contributors levelling up trust tiers, unlocking project achievements, " +
  "and crossing task landmarks across Project Bluefin's GNOME contribution " +
  "seasons.";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toUTCString() : null;
}

/** Complete combined milestone stream, newest-first. */
function collectEvents(history = {}) {
  const milestones = Array.isArray(history.milestones)
    ? history.milestones
    : [];
  const breadthUnlocks = Array.isArray(history.season?.breadthUnlocks)
    ? history.season.breadthUnlocks
    : [];
  const firstContributions = Array.isArray(history.season?.firstContributions)
    ? history.season.firstContributions
    : [];

  return [...milestones, ...breadthUnlocks, ...firstContributions]
    .filter((event) => event && event.id && event.detectedAt)
    .sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt));
}

/** Pure RSS 2.0 document for the given history payload. */
function buildFeed(history = {}, now = new Date()) {
  const events = collectEvents(history);
  const season = history.season;
  const channelTitle = season?.name
    ? `Moments of Triumph — ${season.name} · Bluefin Leaderboards`
    : "Moments of Triumph — Bluefin Leaderboards";

  const items = events.map((event) => {
    const pubDate = rfc822(event.detectedAt);
    const linkUrl =
      event.commitUrl ?? `${DOSSIER_BASE}/${encodeURIComponent(event.login)}`;
    const lines = [
      "    <item>",
      `      <title>${escapeXml(`${event.title} — ${event.login}`)}</title>`,
      `      <link>${escapeXml(linkUrl)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(event.id)}</guid>`,
    ];
    if (pubDate) lines.push(`      <pubDate>${pubDate}</pubDate>`);
    lines.push(
      `      <category>${escapeXml(TYPE_LABELS[event.type] ?? "Milestone")}</category>`,
      `      <description>${escapeXml(event.detail ?? "")}</description>`,
      "    </item>",
    );
    return lines.join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${PAGE_URL}</link>`,
    `    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

function readHistory(file = HISTORY_FILE) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.warn(
      `[leaderboard-feed] No usable ${path.basename(file)} (${err.message}); writing an empty feed`,
    );
    return {};
  }
}

function writeFeed(history, file = OUTPUT_FILE, now = new Date()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buildFeed(history, now), "utf8");
  return collectEvents(history).length;
}

/** Read the site's hive history and write the feed. Used before the build. */
function writeFeedFromFile({
  historyFile = HISTORY_FILE,
  outputFile = OUTPUT_FILE,
  now = new Date(),
} = {}) {
  const count = writeFeed(readHistory(historyFile), outputFile, now);
  console.log(`[leaderboard-feed] Wrote ${outputFile} (${count} item(s))`);
  return count;
}

if (require.main === module) {
  writeFeedFromFile();
}

module.exports = {
  buildFeed,
  collectEvents,
  escapeXml,
  rfc822,
  writeFeed,
  writeFeedFromFile,
};
