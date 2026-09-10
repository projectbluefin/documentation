const fs = require("fs");
const path = require("path");
const { githubHeaders } = require("./lib/request-queue");

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "portal-contributors.json");

const CACHE_MAX_AGE_HOURS = 24;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

const IGNORED_IDENTITIES = new Set([
  "Copilot",
  "dependabot[bot]",
  "dependabot",
  "github-actions[bot]",
  "github-actions",
  "renovate[bot]",
  "renovate",
  "ubot-7274[bot]",
  "copilot-swe-agent",
  "greenkeeper",
]);

function isIgnoredContributor(login) {
  if (!login) return true;
  if (login.endsWith("[bot]")) return true;
  return IGNORED_IDENTITIES.has(login);
}

function calculateActivityWindow(now = new Date(), days = 365) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatActivityWindowLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function filterUniqueContributors(peopleMap, limit = 12) {
  const list = Array.from(peopleMap.values());
  list.sort((left, right) => left.login.localeCompare(right.login));
  return list.slice(0, limit);
}

async function githubJson(url, token = GITHUB_TOKEN) {
  const headers = githubHeaders(token);
  headers.Accept = "application/vnd.github+json";

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function githubPages(url, token = GITHUB_TOKEN, maxPages = 5) {
  const records = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = url.includes("?") ? "&" : "?";
    const batch = await githubJson(
      `${url}${separator}per_page=100&page=${page}`,
      token,
    );
    if (!Array.isArray(batch)) {
      break;
    }
    records.push(...batch);
    if (batch.length < 100) {
      return records;
    }
  }
  return records;
}

async function harvestPortalContributors({
  token = GITHUB_TOKEN,
  windowDays = 365,
  now = new Date(),
} = {}) {
  const activityWindow = calculateActivityWindow(now, windowDays);
  const activityWindowLabel = formatActivityWindowLabel(activityWindow);

  let orgRepos = [];
  try {
    orgRepos = await githubPages(
      "https://api.github.com/orgs/projectbluefin/repos?type=all",
      token,
      5,
    );
  } catch (err) {
    console.warn(
      `[fetch-portal-contributors] org repos failed: ${err.message}`,
    );
  }

  const repositories = [
    ...orgRepos
      .filter((repo) => repo && !repo.fork && repo.full_name)
      .map((repo) => repo.full_name),
    "ublue-os/bluefin",
    "ublue-os/bluefin-lts",
  ].filter((repo, index, all) => all.indexOf(repo) === index);

  const people = new Map();
  const addPerson = (person) => {
    if (person && person.login && !isIgnoredContributor(person.login)) {
      people.set(person.login, {
        login: person.login,
        html_url: person.html_url || `https://github.com/${person.login}`,
      });
    }
  };

  const commitResults = await Promise.allSettled(
    repositories.map((repo) =>
      githubPages(
        `https://api.github.com/repos/${repo}/commits?since=${encodeURIComponent(
          activityWindow.toISOString(),
        )}`,
        token,
        3,
      ),
    ),
  );

  commitResults.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.forEach((commit) => {
        if (commit && commit.author) {
          addPerson(commit.author);
        }
      });
    }
  });

  try {
    const discussions = await githubPages(
      "https://api.github.com/repos/ublue-os/bluefin/discussions",
      token,
      2,
    );
    discussions
      .filter(
        (discussion) =>
          discussion &&
          discussion.created_at &&
          new Date(discussion.created_at) >= activityWindow,
      )
      .forEach((discussion) => {
        if (discussion && discussion.user) {
          addPerson(discussion.user);
        }
      });
  } catch (_err) {
    // Commits remain visible when Discussions is unavailable
  }

  const contributors = filterUniqueContributors(people, 12);
  const unavailable = contributors.length === 0;

  return {
    generatedAt: now.toISOString(),
    activityWindowSince: activityWindow.toISOString(),
    activityWindowLabel,
    contributors,
    unavailable,
    bluefinPulseUrl: "https://github.com/ublue-os/bluefin/pulse",
  };
}

async function main() {
  const force = process.argv.includes("--force");

  if (!force && fs.existsSync(OUTPUT_FILE)) {
    try {
      const stats = fs.statSync(OUTPUT_FILE);
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < CACHE_MAX_AGE_HOURS) {
        console.log(
          `✓ Cache is ${ageHours.toFixed(1)}h old (max ${CACHE_MAX_AGE_HOURS}h). Skipping fetch.`,
        );
        return;
      }
    } catch {
      // ignore stat error
    }
  }

  if (!GITHUB_TOKEN) {
    console.warn(
      "⚠️  No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.",
    );
  } else {
    console.log("✓ Using authenticated GitHub API access");
  }

  let payload;
  try {
    payload = await harvestPortalContributors();
  } catch (err) {
    console.error(`fetch-portal-contributors error: ${err.message}`);
    const now = new Date();
    const activityWindow = calculateActivityWindow(now, 365);
    payload = {
      generatedAt: now.toISOString(),
      activityWindowSince: activityWindow.toISOString(),
      activityWindowLabel: formatActivityWindowLabel(activityWindow),
      contributors: [],
      unavailable: true,
      bluefinPulseUrl: "https://github.com/ublue-os/bluefin/pulse",
    };
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `✓ Portal contributors data saved to ${OUTPUT_FILE} (${payload.contributors.length} contributors)`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  OUTPUT_FILE,
  IGNORED_IDENTITIES,
  isIgnoredContributor,
  calculateActivityWindow,
  formatActivityWindowLabel,
  filterUniqueContributors,
  harvestPortalContributors,
  main,
};
