const fs = require("fs");
const path = require("path");
const {
  sequentialFetchWithDelay,
  githubHeaders,
} = require("./lib/request-queue");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "file-contributors.json");
const DOCS_DIR = path.join(__dirname, "..", "docs");
const BLOG_DIR = path.join(__dirname, "..", "blog");

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

// GitHub repo details
const REPO_OWNER = "projectbluefin";
const REPO_NAME = "documentation";

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
  const lowerCaseLogin = login.toLowerCase();
  return (
    BOT_LOGINS.some((bot) => bot.toLowerCase() === lowerCaseLogin) ||
    lowerCaseLogin.endsWith("[bot]") ||
    lowerCaseLogin.includes("bot")
  );
}

async function fetchCommits(filePath) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${filePath}`;
  const headers = githubHeaders(GITHUB_TOKEN);

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

function getAllMarkdownFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((name) => name.endsWith(".md") || name.endsWith(".mdx"))
    .map((name) => {
      // Get relative path from repo root
      const relativePath = path.relative(
        path.join(__dirname, ".."),
        path.join(dir, name),
      );
      return relativePath.replace(/\\/g, "/");
    });
}

function buildPayload(
  files = {},
  { generatedAt, unavailable, stateReason } = {},
) {
  const fileEntries =
    files instanceof Map ? Object.fromEntries(files) : files || {};
  const fileCount = Object.keys(fileEntries).length;
  const isUnavailable =
    unavailable !== undefined ? Boolean(unavailable) : fileCount === 0;

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    files: fileEntries,
    unavailable: isUnavailable,
    stateReason: isUnavailable
      ? (stateReason ?? "No contributor requests succeeded")
      : null,
  };
}

async function fetchAllContributors() {
  const force = process.argv.includes("--force");

  // Check if existing cache is fresh enough
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const stats = fs.statSync(OUTPUT_FILE);
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

      if (ageHours < CACHE_MAX_AGE_HOURS && !force) {
        console.log(
          `✓ Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
        );
        console.log(
          `  Use --force flag to bypass cache and force fresh fetch.`,
        );
        return;
      } else if (ageHours >= CACHE_MAX_AGE_HOURS) {
        console.log(
          `⏱️  Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Fetching fresh data...`,
        );
      } else {
        console.log("🔄 --force flag detected. Fetching fresh data...");
      }
    } catch {
      // Ignore cache read errors and proceed to fetch
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

  let resultsMap = new Map();
  let fetchError = null;

  try {
    resultsMap = await sequentialFetchWithDelay(allFiles, async (filePath) => {
      console.log(`Fetching contributors for ${filePath}...`);
      const contributors = await fetchCommits(filePath);
      return contributors.length > 0 ? contributors : null;
    });
  } catch (error) {
    console.error("Error fetching contributors:", error.message);
    fetchError = error;
  }

  const successCount = resultsMap.size;
  const isUnavailable = successCount === 0;

  let stateReason = null;
  if (isUnavailable) {
    console.warn(
      "\n⚠️  No contributors fetched! Contributors will not be displayed.",
    );
    if (fetchError) {
      stateReason = `Contributor fetch failed: ${fetchError.message}`;
    } else if (!GITHUB_TOKEN) {
      console.warn("   Please set a GitHub token and try again.");
      stateReason =
        "No GitHub token configured and contributor requests failed";
    } else {
      stateReason = "No contributor requests succeeded";
    }
  }

  const payload = buildPayload(resultsMap, {
    unavailable: isUnavailable,
    stateReason,
  });

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(payload, null, 2) + "\n",
    "utf-8",
  );

  if (isUnavailable) {
    console.log(`✓ Unavailable contributor payload saved to ${OUTPUT_FILE}`);
  } else {
    console.log(
      `\nSuccessfully fetched contributors for ${successCount}/${allFiles.length} files`,
    );
    console.log(`✓ Contributors data saved to ${OUTPUT_FILE}`);
  }

  return payload;
}

if (require.main === module) {
  fetchAllContributors().catch((error) => {
    console.error("Fatal error:", error.message);
    try {
      const fallback = buildPayload(
        {},
        {
          unavailable: true,
          stateReason: `Fatal contributor fetch error: ${error.message}`,
        },
      );
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(fallback, null, 2) + "\n",
        "utf-8",
      );
    } catch {
      // ignore
    }
    process.exit(0);
  });
}

module.exports = {
  OUTPUT_FILE,
  getAllMarkdownFiles,
  isBotAccount,
  buildPayload,
  fetchAllContributors,
};
