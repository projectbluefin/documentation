const fs = require("fs");
const path = require("path");

const fetch = (...args) => import("node-fetch").then(({ default: fn }) => fn(...args));

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "driver-versions.json");
const FEED_BLUEFIN = path.join(__dirname, "..", "static", "feeds", "bluefin-releases.json");
const FEED_LTS = path.join(__dirname, "..", "static", "feeds", "bluefin-lts-releases.json");

const CACHE_MAX_AGE_HOURS = Number(process.env.DRIVER_VERSIONS_CACHE_HOURS || 168);
const HISTORY_DAYS = Number(process.env.DRIVER_VERSIONS_HISTORY_DAYS || 90);
const FORCE_REFRESH = process.argv.includes("--force");

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function cacheAgeHours() {
  if (!fs.existsSync(OUTPUT_FILE)) return Number.POSITIVE_INFINITY;
  const stats = fs.statSync(OUTPUT_FILE);
  return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
}

function splitVersion(raw) {
  if (!raw) return null;
  const parts = String(raw)
    .split("➡️")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(raw).trim();
}

function extractVersion(content, labels) {
  if (!content) return null;

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `<td><strong>${escaped}<\\/strong><\\/td>\\s*<td>([^<]+)<\\/td>`,
      "i",
    );
    const match = content.match(regex);
    if (!match || !match[1]) continue;
    return splitVersion(match[1]);
  }

  return null;
}

function extractVersionFromMarkdown(content, labels) {
  if (!content) return null;

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\|\\s*\\*\\*${escaped}\\*\\*\\s*\\|\\s*([^|]+)\\|`, "i");
    const match = content.match(regex);
    if (!match || !match[1]) continue;
    return splitVersion(match[1]);
  }

  return null;
}

function parseDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function tagFromItem(item, fallbackPrefix) {
  const link = item?.link || "";
  const parts = link.split("/");
  const maybeTag = parts[parts.length - 1] || "";
  if (maybeTag) return maybeTag;

  const title = item?.title || "";
  if (title.includes(":")) {
    return title.split(":")[0].trim();
  }

  return `${fallbackPrefix}-unknown`;
}

function buildRow(item, streamId) {
  const content = item?.content || "";
  return {
    stream: streamId,
    tag: tagFromItem(item, streamId),
    title: item?.title || null,
    releaseUrl: item?.link || null,
    publishedAt: parseDate(item?.pubDate || item?.updated || null),
    versions: {
      kernel: extractVersion(content, ["Kernel"]),
      hweKernel: extractVersion(content, ["HWE Kernel"]),
      mesa: extractVersion(content, ["Mesa"]),
      nvidia: extractVersion(content, ["Nvidia", "NVIDIA"]),
    },
  };
}

function buildRowFromApiRelease(release, streamId) {
  const body = release?.body || "";
  return {
    stream: streamId,
    tag: release?.tag_name || `${streamId}-unknown`,
    title: release?.name || null,
    releaseUrl: release?.html_url || null,
    publishedAt: parseDate(release?.published_at || release?.created_at || null),
    versions: {
      kernel: extractVersionFromMarkdown(body, ["Kernel"]),
      hweKernel: extractVersionFromMarkdown(body, ["HWE Kernel"]),
      mesa: extractVersionFromMarkdown(body, ["Mesa"]),
      nvidia: extractVersionFromMarkdown(body, ["Nvidia", "NVIDIA"]),
    },
  };
}

function pickBluefinStableItems(feed) {
  const items = Array.isArray(feed?.items) ? feed.items : [];
  return items.filter((item) => String(item?.title || "").toLowerCase().startsWith("stable-"));
}

function pickLtsItems(feed) {
  const items = Array.isArray(feed?.items) ? feed.items : [];
  return items.filter((item) => {
    const link = String(item?.link || "").toLowerCase();
    if (link.includes("/releases/tag/lts.")) return true;
    return String(item?.title || "").toLowerCase().includes(" lts:");
  });
}

function buildStream(streamId, name, subtitle, command, feedItems) {
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const recentItems = feedItems.filter((item) => {
    const parsed = Date.parse(item?.pubDate || item?.updated || "");
    if (Number.isNaN(parsed)) return false;
    return parsed >= cutoff;
  });

  const history = recentItems.map((item) => buildRow(item, streamId));
  return {
    id: streamId,
    name,
    subtitle,
    command,
    source: "cache",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

async function fetchReleases(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "bluefin-docs-driver-versions",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub releases API failed for ${owner}/${repo}: ${response.status}`);
  }

  return response.json();
}

function buildStreamFromApi(streamId, name, subtitle, command, releases, tagPrefix) {
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;

  const filtered = releases
    .filter((release) => String(release?.tag_name || "").startsWith(tagPrefix))
    .filter((release) => {
      const parsed = Date.parse(release?.published_at || release?.created_at || "");
      if (Number.isNaN(parsed)) return false;
      return parsed >= cutoff;
    })
    .sort(
      (a, b) =>
        Date.parse(b?.published_at || b?.created_at || 0) -
        Date.parse(a?.published_at || a?.created_at || 0),
    );

  const history = filtered.map((release) => buildRowFromApiRelease(release, streamId));

  return {
    id: streamId,
    name,
    subtitle,
    command,
    source: "github-api",
    rowCount: history.length,
    latest: history[0] || null,
    history,
  };
}

function main() {
  const ageHours = cacheAgeHours();
  if (ageHours < CACHE_MAX_AGE_HOURS && !FORCE_REFRESH) {
    console.log(
      `Driver versions cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
    );
    return;
  }

  return Promise.all([
    fetchReleases("ublue-os", "bluefin"),
    fetchReleases("ublue-os", "bluefin-lts"),
  ])
    .then(([bluefinReleases, ltsReleases]) => {
      const streams = [
        buildStreamFromApi(
          "bluefin-stable",
          "Bluefin",
          "Current stable stream from ublue-os/bluefin.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
          bluefinReleases,
          "stable-",
        ),
        buildStreamFromApi(
          "bluefin-lts",
          "Bluefin LTS",
          "Long-term support stream from ublue-os/bluefin-lts.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:lts --enforce-container-sigpolicy",
          ltsReleases,
          "lts.",
        ),
      ];

      const output = {
        generatedAt: new Date().toISOString(),
        cacheHours: CACHE_MAX_AGE_HOURS,
        historyDays: HISTORY_DAYS,
        streams,
      };

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
      console.log(`Driver versions data saved to ${OUTPUT_FILE}`);
    })
    .catch(() => {
      const bluefinFeed = readJsonIfExists(FEED_BLUEFIN, { items: [] });
      const ltsFeed = readJsonIfExists(FEED_LTS, { items: [] });

      const streams = [
        buildStream(
          "bluefin-stable",
          "Bluefin",
          "Current stable stream from ublue-os/bluefin.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy",
          pickBluefinStableItems(bluefinFeed),
        ),
        buildStream(
          "bluefin-lts",
          "Bluefin LTS",
          "Long-term support stream from ublue-os/bluefin-lts.",
          "sudo bootc switch ghcr.io/ublue-os/bluefin:lts --enforce-container-sigpolicy",
          pickLtsItems(ltsFeed),
        ),
      ];

      const output = {
        generatedAt: new Date().toISOString(),
        cacheHours: CACHE_MAX_AGE_HOURS,
        historyDays: HISTORY_DAYS,
        streams,
      };

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
      console.log(`Driver versions data saved to ${OUTPUT_FILE} (feed fallback)`);
    });
}

try {
  Promise.resolve(main()).catch((error) => {
    console.error(error?.message || "Failed to generate driver versions data");
    process.exit(1);
  });
} catch (error) {
  console.error(error?.message || "Failed to generate driver versions data");
  process.exit(1);
}
