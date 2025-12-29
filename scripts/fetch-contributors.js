const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "file-contributors.json");
const DOCS_DIR = path.join(__dirname, "..", "docs");
const BLOG_DIR = path.join(__dirname, "..", "blog");

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

// GitHub repo details
const REPO_OWNER = "ublue-os";
const REPO_NAME = "bluefin-docs";

// Bot accounts to filter out
const BOT_LOGINS = [
  "copilot-swe-agent",
  "Copilot",
  "dependabot",
  "renovate",
  "github-actions",
  "greenkeeper",
];

function isBotAccount(login) {
  return (
    BOT_LOGINS.includes(login) ||
    login.endsWith("[bot]") ||
    login.toLowerCase().includes("bot")
  );
}

async function fetchCommits(filePath) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${filePath}`;

  const headers = {
    "User-Agent": "Bluefin-Docs-Build",
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(
        `Failed to fetch commits for ${filePath}: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const commits = await response.json();

    // Extract unique contributors, filtering out bots
    const contributorMap = new Map();

    for (const commit of commits) {
      if (commit.author) {
        const { login, html_url, avatar_url } = commit.author;
        if (login && !isBotAccount(login) && !contributorMap.has(login)) {
          contributorMap.set(login, { login, html_url, avatar_url });
        }
      }
    }

    // Convert to array and sort alphabetically
    const contributors = Array.from(contributorMap.values());
    contributors.sort((a, b) => a.login.localeCompare(b.login));

    return contributors;
  } catch (error) {
    console.error(`Error fetching commits for ${filePath}:`, error.message);
    return [];
  }
}

function getAllMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath, baseDir));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
    ) {
      // Get relative path from repo root
      const relativePath = path.relative(path.join(__dirname, ".."), fullPath);
      files.push(relativePath.replace(/\\/g, "/"));
    }
  }

  return files;
}

async function fetchAllContributors() {
  // Check if existing cache is fresh enough
  if (fs.existsSync(OUTPUT_FILE)) {
    const stats = fs.statSync(OUTPUT_FILE);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    if (ageHours < CACHE_MAX_AGE_HOURS && !process.argv.includes("--force")) {
      console.log(
        `✓ Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
      );
      console.log(`  Use --force flag to bypass cache and force fresh fetch.`);
      return;
    } else if (ageHours >= CACHE_MAX_AGE_HOURS) {
      console.log(
        `⏱️  Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Fetching fresh data...`,
      );
    } else {
      console.log("🔄 --force flag detected. Fetching fresh data...");
    }
  }

  if (!GITHUB_TOKEN) {
    console.warn(
      "⚠️  No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.",
    );
    console.warn("   This script may hit rate limits without authentication.");
    console.warn("   Get a token at: https://github.com/settings/tokens\n");
  } else {
    console.log("✓ Using authenticated GitHub API access\n");
  }

  // Get all markdown files
  const docFiles = fs.existsSync(DOCS_DIR) ? getAllMarkdownFiles(DOCS_DIR) : [];
  const blogFiles = fs.existsSync(BLOG_DIR)
    ? getAllMarkdownFiles(BLOG_DIR)
    : [];
  const allFiles = [...docFiles, ...blogFiles];

  console.log(
    `Found ${allFiles.length} files to process (${docFiles.length} docs, ${blogFiles.length} blog)`,
  );

  const contributorsData = {};
  let successCount = 0;

  for (const filePath of allFiles) {
    console.log(`Fetching contributors for ${filePath}...`);
    const contributors = await fetchCommits(filePath);

    if (contributors.length > 0) {
      contributorsData[filePath] = contributors;
      successCount++;
    }

    // Small delay to be nice to GitHub's API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `\nSuccessfully fetched contributors for ${successCount}/${allFiles.length} files`,
  );

  // Don't fail build if no contributors fetched - component will gracefully handle empty data
  if (successCount === 0) {
    console.warn(
      "\n⚠️  No contributors fetched! Contributors will not be displayed.",
    );
    console.warn("   Please set a GitHub token and try again.");
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(contributorsData, null, 2),
    "utf-8",
  );

  console.log(`✓ Contributors data saved to ${OUTPUT_FILE}`);
}

fetchAllContributors().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
