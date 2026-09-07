const fs = require("fs");
const path = require("path");
const {
  sequentialFetchWithDelay,
  githubHeaders,
} = require("./lib/request-queue");
const { writeUnavailable } = require("./lib/data-fallback");

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
      return null;
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
    return null;
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
    const reason =
      "No GITHUB_TOKEN or GH_TOKEN environment variable is set; contributor data was not fetched.";
    console.warn(`⚠️  ${reason}`);
    writeUnavailable(OUTPUT_FILE, reason);
    return;
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

  const resultsMap = await sequentialFetchWithDelay(
    allFiles,
    async (filePath) => {
      console.log(`Fetching contributors for ${filePath}...`);
      const contributors = await fetchCommits(filePath);
      return contributors;
    },
  );

  const contributorsData = Object.fromEntries(resultsMap);
  const successCount = resultsMap.size;
  const failedCount = allFiles.length - successCount;

  console.log(
    `\nSuccessfully fetched contributors for ${successCount}/${allFiles.length} files`,
  );

  // Don't fail build if no contributors fetched - component will gracefully handle empty data
  if (successCount === 0) {
    const reason = "No contributor data could be fetched from GitHub.";
    console.warn(`\n⚠️  ${reason}`);
    writeUnavailable(OUTPUT_FILE, reason, contributorsData);
    return;
  }
  if (failedCount > 0) {
    const reason = `Contributor data unavailable for ${failedCount} file(s).`;
    console.warn(`⚠️  ${reason}`);
    writeUnavailable(OUTPUT_FILE, reason, contributorsData);
    return;
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

if (require.main === module) {
  fetchAllContributors().catch((error) => {
    console.error("Fatal error:", error);
    writeUnavailable(
      OUTPUT_FILE,
      `Contributor data could not be generated: ${error.message}`,
    );
    process.exitCode = 0;
  });
}

module.exports = {
  getAllMarkdownFiles,
  isBotAccount,
};
