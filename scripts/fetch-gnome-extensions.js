#!/usr/bin/env node

/**
 * Fetches metadata and screenshots for GNOME extensions
 * Run with: node scripts/fetch-gnome-extensions.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Extension IDs from the tips page (alphabetical by name)
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

const OUTPUT_JSON = path.join(
  __dirname,
  "../static/data/gnome-extensions.json",
);
const OUTPUT_IMG_DIR = path.join(__dirname, "../static/img/extensions");

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Follow redirect
          https
            .get(res.headers.location, (res2) => {
              res2.pipe(file);
              file.on("finish", () => {
                file.close();
                resolve(destPath);
              });
            })
            .on("error", reject);
        } else {
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve(destPath);
          });
        }
      })
      .on("error", reject);
  });
}

async function fetchExtensionData(pk) {
  const url = `https://extensions.gnome.org/extension-info/?pk=${pk}`;
  console.log(`Fetching extension ${pk}...`);

  const data = await fetchJSON(url);

  // Download screenshot if available
  let localScreenshot = null;
  if (data.screenshot) {
    const screenshotUrl = `https://extensions.gnome.org${data.screenshot}`;
    const ext = path.extname(data.screenshot) || ".png";
    const localPath = path.join(OUTPUT_IMG_DIR, `${pk}${ext}`);
    try {
      await downloadImage(screenshotUrl, localPath);
      localScreenshot = `/img/extensions/${pk}${ext}`;
      console.log(`  Downloaded screenshot for ${data.name}`);
    } catch (e) {
      console.log(`  Failed to download screenshot: ${e.message}`);
    }
  }

  return {
    id: pk,
    uuid: data.uuid,
    name: data.name,
    creator: data.creator,
    creatorUrl: data.creator_url
      ? `https://extensions.gnome.org${data.creator_url}`
      : null,
    description: data.description,
    url: `https://extensions.gnome.org/extension/${pk}/`,
    screenshot: localScreenshot,
    remoteScreenshot: data.screenshot
      ? `https://extensions.gnome.org${data.screenshot}`
      : null,
    icon: data.icon ? `https://extensions.gnome.org${data.icon}` : null,
    donateUrl: data.donate_url || null,
  };
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_IMG_DIR)) {
    fs.mkdirSync(OUTPUT_IMG_DIR, { recursive: true });
  }

  const extensions = [];

  for (const pk of EXTENSION_IDS) {
    try {
      const data = await fetchExtensionData(pk);
      extensions.push(data);
    } catch (e) {
      console.error(`Failed to fetch extension ${pk}: ${e.message}`);
    }
  }

  // Write JSON output
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(extensions, null, 2));
  console.log(`\nWrote ${extensions.length} extensions to ${OUTPUT_JSON}`);
}

main().catch(console.error);
