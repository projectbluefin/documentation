#!/usr/bin/env node

/**
 * Fetches metadata and screenshots for GNOME extensions listed in docs/tips.mdx.
 * Run with: node scripts/fetch-gnome-extensions.js
 * Output: static/data/gnome-extensions.json, static/img/extensions/<id>.<ext>
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const EXTENSION_IDS = [
  5724, // Battery Health Charging
  6670, // Bluetooth Battery Meter
  6325, // Control monitor brightness and volume with ddcutil
  8834, // Copyous
  3843, // Just Perfection
  2236, // Night Theme Switcher
  5964, // Quick Settings Audio Devices Hider
  6000, // Quick Settings Audio Devices Renamer
  7065, // Tiling Shell
];

const OUTPUT_JSON = path.join(__dirname, "../static/data/gnome-extensions.json");
const OUTPUT_IMG_DIR = path.join(__dirname, "../static/img/extensions");
const CACHE_HOURS = parseInt(process.env.GNOME_EXT_CACHE_HOURS ?? "168", 10); // 7-day default

function isStale(filePath) {
  if (process.argv.includes("--force")) return true;
  if (!fs.existsSync(filePath)) return true;
  const ageHours = (Date.now() - fs.statSync(filePath).mtimeMs) / 3_600_000;
  if (ageHours < CACHE_HOURS) {
    console.log(`Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_HOURS}h). Skipping fetch.`);
    return false;
  }
  return true;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    }).on("error", reject);
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const follow = (u) =>
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location);
        } else {
          const file = fs.createWriteStream(destPath);
          res.pipe(file);
          file.on("finish", () => { file.close(); resolve(destPath); });
          file.on("error", reject);
        }
      }).on("error", reject);
    follow(url);
  });
}

async function fetchExtensionData(pk) {
  const url = `https://extensions.gnome.org/extension-info/?pk=${pk}`;
  console.log(`Fetching extension ${pk}...`);
  const data = await fetchJSON(url);

  let localScreenshot = null;
  if (data.screenshot) {
    const screenshotUrl = `https://extensions.gnome.org${data.screenshot}`;
    const ext = path.extname(data.screenshot) || ".png";
    const localPath = path.join(OUTPUT_IMG_DIR, `${pk}${ext}`);
    // Skip download if image already exists (tracked in git)
    if (fs.existsSync(localPath)) {
      localScreenshot = `/img/extensions/${pk}${ext}`;
      console.log(`  Screenshot already exists: ${localPath}`);
    } else {
      try {
        await downloadImage(screenshotUrl, localPath);
        localScreenshot = `/img/extensions/${pk}${ext}`;
        console.log(`  Screenshot saved: ${localPath}`);
      } catch (e) {
        console.warn(`  Screenshot download failed: ${e.message}`);
      }
    }
  }

  return {
    id: pk,
    uuid: data.uuid,
    name: data.name,
    creator: data.creator,
    creatorUrl: data.creator_url ? `https://extensions.gnome.org${data.creator_url}` : null,
    description: data.description,
    url: `https://extensions.gnome.org/extension/${pk}/`,
    screenshot: localScreenshot,
    remoteScreenshot: data.screenshot ? `https://extensions.gnome.org${data.screenshot}` : null,
    icon: data.icon ? `https://extensions.gnome.org${data.icon}` : null,
    donateUrl: data.donate_url || null,
  };
}

async function main() {
  if (!isStale(OUTPUT_JSON)) return;

  fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });

  const extensions = [];
  for (const pk of EXTENSION_IDS) {
    try {
      extensions.push(await fetchExtensionData(pk));
    } catch (e) {
      console.error(`  Failed to fetch extension ${pk}: ${e.message}`);
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(extensions, null, 2));
  console.log(`\nWrote ${extensions.length} extensions to ${OUTPUT_JSON}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
