#!/usr/bin/env node

/**
 * @file update-driver-versions.js
 * @description Script to update driver-versions.md with latest kernel, NVIDIA, and Mesa versions
 *
 * This script automates tracking of driver versions across Bluefin streams (stable, GTS, LTS).
 * It fetches release information from GitHub and extracts driver details from release notes.
 *
 * Features:
 * - Caches NVIDIA driver URLs (persisted in .nvidia-drivers-cache.json)
 * - Retry logic with exponential backoff for network resilience
 * - GitHub API rate limit detection and graceful handling
 * - Automatic deduplication of release entries
 *
 * Usage:
 *   node scripts/update-driver-versions.js
 *   GITHUB_TOKEN=ghp_xxx node scripts/update-driver-versions.js  # With authentication
 *
 * NVIDIA Cache Behavior:
 * - Cache file is committed to git to reduce nvidia.com scraping (~80% reduction)
 * - Only fetches from nvidia.com when encountering unknown driver versions
 * - Updates cache file when new drivers are discovered
 *
 * @requires GITHUB_TOKEN environment variable (optional but recommended for higher rate limits)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const DOC_PATH = path.join(__dirname, "../docs/driver-versions.md");
const NVIDIA_DRIVERS_CACHE = path.join(
  __dirname,
  "../.nvidia-drivers-cache.json",
);

// GitHub API configuration
const GITHUB_API = "https://api.github.com";
const REPOS = {
  bluefin: "ublue-os/bluefin",
  bluefinLts: "ublue-os/bluefin-lts",
};

// Cache for NVIDIA driver URLs
let nvidiaDriverCache = {};

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {string} operation - Operation name for logging
 * @returns {Promise} Result of the function
 */
async function withRetry(fn, maxRetries = 3, operation = "operation") {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(
          `⚠️  Retry ${attempt}/${maxRetries} for ${operation} after error: ${error.message}`,
        );
        console.warn(`   Waiting ${delay / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `${operation} failed after ${maxRetries} retries: ${lastError.message}`,
  );
}

/**
 * Load NVIDIA driver cache from file
 */
function loadNvidiaCache() {
  try {
    if (fs.existsSync(NVIDIA_DRIVERS_CACHE)) {
      const data = fs.readFileSync(NVIDIA_DRIVERS_CACHE, "utf8");
      nvidiaDriverCache = JSON.parse(data);
      console.log(
        `Loaded ${Object.keys(nvidiaDriverCache).length} NVIDIA driver URLs from cache`,
      );
    }
  } catch (error) {
    console.warn("Failed to load NVIDIA cache:", error.message);
    nvidiaDriverCache = {};
  }
}

/**
 * Save NVIDIA driver cache to file
 */
function saveNvidiaCache() {
  try {
    fs.writeFileSync(
      NVIDIA_DRIVERS_CACHE,
      JSON.stringify(nvidiaDriverCache, null, 2),
      "utf8",
    );
    console.log(
      `Saved ${Object.keys(nvidiaDriverCache).length} NVIDIA driver URLs to cache`,
    );
  } catch (error) {
    console.warn("Failed to save NVIDIA cache:", error.message);
  }
}

/**
 * Fetch NVIDIA driver URLs from their website
 */
function fetchNvidiaDriverUrls() {
  return new Promise((resolve, reject) => {
    https
      .get("https://www.nvidia.com/en-us/drivers/unix/", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            // Extract driver version -> URL mappings from the page
            const driverMap = {};

            // Match pattern: <a href="https://www.nvidia.com/en-us/drivers/details/XXXXX/">VERSION</a>
            const pattern =
              /<a href="(https:\/\/www\.nvidia\.com\/en-us\/drivers\/details\/\d+\/)">([\d.]+)<\/a>/g;
            let match;

            while ((match = pattern.exec(data)) !== null) {
              const url = match[1];
              const version = match[2];
              driverMap[version] = url;
            }

            console.log(
              `Fetched ${Object.keys(driverMap).length} NVIDIA driver URLs from nvidia.com`,
            );
            resolve(driverMap);
          } else {
            reject(new Error(`NVIDIA website returned ${res.statusCode}`));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Get NVIDIA driver URL for a given version
 */
async function getNvidiaDriverUrl(version) {
  // Extract base version (e.g., "580.105.08" from "580.105.08-1")
  const baseVersion = version.split("-")[0];

  // Check cache first
  if (nvidiaDriverCache[baseVersion]) {
    return nvidiaDriverCache[baseVersion];
  }

  // Try to fetch from NVIDIA website with retry logic
  try {
    const freshDriverMap = await withRetry(
      () => fetchNvidiaDriverUrls(),
      3,
      "NVIDIA driver URL fetching",
    );

    // Update cache with fresh data
    Object.assign(nvidiaDriverCache, freshDriverMap);

    // Save cache for future runs
    saveNvidiaCache();

    if (nvidiaDriverCache[baseVersion]) {
      return nvidiaDriverCache[baseVersion];
    }
  } catch (error) {
    console.warn(
      `Failed to fetch NVIDIA driver URLs after retries: ${error.message}`,
    );
  }

  return null;
}

/**
 * Fetch data from GitHub API with rate limit detection
 */
function fetchGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "bluefin-docs-update-script",
        Accept: "application/vnd.github+json",
      },
    };

    // Add GitHub token if available (for higher rate limits)
    if (process.env.GITHUB_TOKEN) {
      options.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    https
      .get(url, options, (res) => {
        let data = "";

        // Check rate limit headers
        const rateLimitRemaining = res.headers["x-ratelimit-remaining"];
        const rateLimitReset = res.headers["x-ratelimit-reset"];

        if (rateLimitRemaining !== undefined) {
          const remaining = parseInt(rateLimitRemaining, 10);

          if (remaining < 100) {
            const resetDate = new Date(parseInt(rateLimitReset, 10) * 1000);
            console.warn(
              `⚠️  GitHub API rate limit low: ${remaining} requests remaining`,
            );
            console.warn(`   Rate limit resets at: ${resetDate.toISOString()}`);
          }

          if (remaining === 0) {
            const resetDate = new Date(parseInt(rateLimitReset, 10) * 1000);
            reject(
              new Error(
                `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}. ` +
                  `Set GITHUB_TOKEN environment variable for higher limits.`,
              ),
            );
            return;
          }
        }

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else if (res.statusCode === 403 && data.includes("rate limit")) {
            reject(
              new Error(
                "GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.",
              ),
            );
          } else {
            reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Get latest release for each stream (stable, gts, lts)
 */
async function getLatestReleases() {
  console.log("Fetching latest releases from GitHub...");

  // Fetch releases from both repos with retry logic
  const bluefinReleases = await withRetry(
    () =>
      fetchGitHub(`${GITHUB_API}/repos/${REPOS.bluefin}/releases?per_page=10`),
    3,
    "Bluefin releases fetching",
  );
  const bluefinLtsReleases = await withRetry(
    () =>
      fetchGitHub(
        `${GITHUB_API}/repos/${REPOS.bluefinLts}/releases?per_page=3`,
      ),
    3,
    "Bluefin LTS releases fetching",
  );

  // Find latest stable release
  const latestStable = bluefinReleases.find((r) =>
    r.tag_name.startsWith("stable-"),
  );

  // Find latest GTS release
  const latestGts = bluefinReleases.find((r) => r.tag_name.startsWith("gts-"));

  // Find latest LTS release
  const latestLts = bluefinLtsReleases[0]; // LTS releases all start with "lts."

  return {
    stable: latestStable,
    gts: latestGts,
    lts: latestLts,
  };
}

/**
 * Extract driver versions from release body
 */
function extractDriverInfo(releaseBody, stream) {
  const info = {
    kernel: "N/A",
    nvidia: "N/A",
    mesa: "N/A",
  };

  // Extract from Major packages table
  const majorPackagesMatch = releaseBody.match(
    /### Major packages\s*\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)*)/,
  );

  if (majorPackagesMatch) {
    const tableRows = majorPackagesMatch[1];

    // Extract Kernel version
    const kernelMatch = tableRows.match(
      /\|\s*\*\*Kernel\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/,
    );
    if (kernelMatch) {
      info.kernel = kernelMatch[2] || kernelMatch[1]; // Use the newer version if there's an arrow
    }

    // For LTS, also check for HWE Kernel and combine them
    if (stream === "lts") {
      const hweMatch = tableRows.match(
        /\|\s*\*\*HWE Kernel\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/,
      );
      if (hweMatch) {
        const hweKernel = hweMatch[2] || hweMatch[1];
        const baseKernel = info.kernel;
        info.kernel = `${baseKernel} (HWE: ${hweKernel})`;
      }
    }

    // Extract Mesa version
    const mesaMatch = tableRows.match(
      /\|\s*\*\*Mesa\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/,
    );
    if (mesaMatch) {
      info.mesa = mesaMatch[2] || mesaMatch[1];
    }
  }

  // Extract NVIDIA from Major GDX packages table (LTS) or Major packages (stable/gts)
  const gdxMatch = releaseBody.match(
    /### Major GDX packages\s*\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)*)/,
  );
  if (gdxMatch) {
    const tableRows = gdxMatch[1];
    const nvidiaMatch = tableRows.match(
      /\|\s*\*\*Nvidia\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/,
    );
    if (nvidiaMatch) {
      info.nvidia = nvidiaMatch[2] || nvidiaMatch[1];
    }
  } else {
    // Try regular Major packages table for NVIDIA
    if (majorPackagesMatch) {
      const tableRows = majorPackagesMatch[1];
      const nvidiaMatch = tableRows.match(
        /\|\s*\*\*Nvidia\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/,
      );
      if (nvidiaMatch) {
        info.nvidia = nvidiaMatch[2] || nvidiaMatch[1];
      }
    }
  }

  return info;
}

/**
 * Format driver info into table row
 */
async function formatTableRow(release, stream) {
  const drivers = extractDriverInfo(release.body, stream);

  const tag = release.tag_name;
  const releaseUrl = release.html_url;

  // Create NVIDIA driver link
  let nvidiaLink = drivers.nvidia;
  if (drivers.nvidia !== "N/A") {
    const nvidiaUrl = await getNvidiaDriverUrl(drivers.nvidia);
    if (nvidiaUrl) {
      nvidiaLink = `[${drivers.nvidia}](${nvidiaUrl})`;
    } else {
      console.warn(
        `⚠️  No NVIDIA driver URL found for version ${drivers.nvidia}`,
      );
      nvidiaLink = drivers.nvidia;
    }
  }

  // Create Mesa driver link
  let mesaLink = drivers.mesa;
  if (drivers.mesa !== "N/A") {
    const mesaVersion = drivers.mesa.replace(/-\d+$/, ""); // Remove trailing package version
    mesaLink = `[${drivers.mesa}](https://docs.mesa3d.org/relnotes/${mesaVersion}.html)`;
  }

  return `| [**${tag}**](${releaseUrl}) | ${drivers.kernel} | ${nvidiaLink} | ${mesaLink} |`;
}

/**
 * Update the document with new releases
 */
async function updateDocument() {
  try {
    // Load NVIDIA driver cache
    loadNvidiaCache();

    // Read current document
    const content = fs.readFileSync(DOC_PATH, "utf8");
    const lines = content.split("\n");

    // Get latest releases
    const releases = await getLatestReleases();

    // Validate releases were found
    if (!releases.stable || !releases.gts || !releases.lts) {
      console.error("❌ Failed to fetch all required releases");
      console.error("  Stable:", releases.stable?.tag_name || "NOT FOUND");
      console.error("  GTS:", releases.gts?.tag_name || "NOT FOUND");
      console.error("  LTS:", releases.lts?.tag_name || "NOT FOUND");
      process.exit(1);
    }

    console.log("Latest releases:");
    console.log("- Stable:", releases.stable.tag_name);
    console.log("- GTS:", releases.gts.tag_name);
    console.log("- LTS:", releases.lts.tag_name);

    // Find the table sections and insert new rows
    let newContent = "";
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this is the start of a table section
      if (line === "## Bluefin") {
        // Copy section header
        newContent += line + "\n";
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === "") {
          newContent += lines[i] + "\n";
          i++;
        }
        // Copy table header rows (assume two lines starting with '|')
        newContent += lines[i] + "\n"; // Table header row 1
        i++;
        newContent += lines[i] + "\n"; // Table header row 2
        i++;
        // Check if the first row is already the latest stable
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith("|")) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.stable.tag_name) {
          // Insert new row at the top
          const newRow = await formatTableRow(releases.stable, "stable");
          newContent += newRow + "\n";
          console.log(
            `✅ Added new stable release: ${releases.stable.tag_name}`,
          );
        } else {
          console.log(
            `ℹ️  Stable release ${releases.stable.tag_name} already exists at top`,
          );
        }

        // Continue with existing rows, deduplicating by tag name
        const seenTags = new Set([releases.stable.tag_name]);
        while (i < lines.length && lines[i].startsWith("|")) {
          const rowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
          if (!rowTag || !seenTags.has(rowTag)) {
            if (rowTag) seenTags.add(rowTag);
            newContent += lines[i] + "\n";
          } else {
            console.log(`ℹ️  Skipping duplicate row: ${rowTag}`);
          }
          i++;
        }
        continue;
      } else if (line === "## Bluefin GTS") {
        // Copy section header
        newContent += line + "\n";
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === "") {
          newContent += lines[i] + "\n";
          i++;
        }
        // Copy table header rows
        newContent += lines[i] + "\n"; // Table header row 1
        i++;
        newContent += lines[i] + "\n"; // Table header row 2
        i++;
        // Check if the first row is already the latest GTS
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith("|")) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.gts.tag_name) {
          // Insert new row at the top
          const newRow = await formatTableRow(releases.gts, "gts");
          newContent += newRow + "\n";
          console.log(`✅ Added new GTS release: ${releases.gts.tag_name}`);
        } else {
          console.log(
            `ℹ️  GTS release ${releases.gts.tag_name} already exists at top`,
          );
        }

        // Continue with existing rows, deduplicating by tag name
        const seenGtsTags = new Set([releases.gts.tag_name]);
        while (i < lines.length && lines[i].startsWith("|")) {
          const rowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
          if (!rowTag || !seenGtsTags.has(rowTag)) {
            if (rowTag) seenGtsTags.add(rowTag);
            newContent += lines[i] + "\n";
          } else {
            console.log(`ℹ️  Skipping duplicate row: ${rowTag}`);
          }
          i++;
        }
        continue;
      } else if (line === "## Bluefin LTS") {
        // Copy section header
        newContent += line + "\n";
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === "") {
          newContent += lines[i] + "\n";
          i++;
        }
        // Copy table header rows
        newContent += lines[i] + "\n"; // Table header row 1
        i++;
        newContent += lines[i] + "\n"; // Table header row 2
        i++;
        // Check if the first row is already the latest LTS
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith("|")) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.lts.tag_name) {
          // Insert new row at the top
          const newRow = await formatTableRow(releases.lts, "lts");
          newContent += newRow + "\n";
          console.log(`✅ Added new LTS release: ${releases.lts.tag_name}`);
        } else {
          console.log(
            `ℹ️  LTS release ${releases.lts.tag_name} already exists at top`,
          );
        }

        // Continue with existing rows, deduplicating by tag name
        const seenLtsTags = new Set([releases.lts.tag_name]);
        while (i < lines.length && lines[i].startsWith("|")) {
          const rowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
          if (!rowTag || !seenLtsTags.has(rowTag)) {
            if (rowTag) seenLtsTags.add(rowTag);
            newContent += lines[i] + "\n";
          } else {
            console.log(`ℹ️  Skipping duplicate row: ${rowTag}`);
          }
          i++;
        }
        continue;
      }

      // Copy line as-is
      newContent += line + "\n";
      i++;
    }

    // Update last_updated in front matter
    const today = new Date().toISOString().split("T")[0];
    newContent = newContent.replace(
      /^last_updated: \d{4}-\d{2}-\d{2}$/m,
      `last_updated: ${today}`,
    );

    // Write updated content
    fs.writeFileSync(DOC_PATH, newContent, "utf8");
    console.log("\n✅ Document updated successfully!");
  } catch (error) {
    console.error("❌ Error updating document:", error.message);
    process.exit(1);
  }
}

// Run the update
updateDocument();
