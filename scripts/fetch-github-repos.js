const fs = require("fs");
const path = require("path");
const {
  sequentialFetchWithDelay,
  githubHeaders,
} = require("./lib/request-queue");

const GITHUB_REPOS = [
  // Built With Cloud Native (CNCF + OpenSSF — what makes Bluefin)
  "kubestellar/kubestellar",
  "k3s-io/k3s",
  "kubevirt/kubevirt",
  "sigstore/cosign",
  "oras-project/oras",
  "containerd/containerd",
  "ossf/scorecard",
  "slsa-framework/slsa",
  "anchore/syft",

  // Desktop Environment
  "GNOME/gnome-shell",

  // GNOME Extensions
  "aunetx/blur-my-shell",
  "micheleg/dash-to-dock",
  "GSConnect/gnome-shell-extension-gsconnect",
  "Aryan20/Logomenu",
  "icedman/search-light",
  "ubuntu/gnome-shell-extension-appindicator",

  // Flatpak Applications
  "kolunmi/bazaar",
  "ranfdev/DistroShelf",
  "flattool/warehouse",
  "flattool/ignition",
  "tchx84/Flatseal",
  "mjakeman/extension-manager",
  // deja-dup/deja-dup and Flavius42/mission-center have no canonical GitHub
  // repo: both projects moved development to GNOME GitLab and no longer
  // publish an equivalent GitHub repository, so they are intentionally
  // omitted here (see docs/donations/projects.mdx).
  "adhami3310/impression",
  "PintaProject/Pinta",
  "GNOME/Showtime",
  "TheEvilSkeleton/Refine", // formerly tesk-g/refine; account renamed
  "mijorus/smile",

  // Homebrew CLI Tools (bluefin-cli)
  "atuinsh/atuin",
  "rcaloras/bash-preexec",
  "sharkdp/bat",
  "Valkyrie00/bold-brew",
  "twpayne/chezmoi",
  "direnv/direnv",
  "Canop/dysk",
  "eza-community/eza",
  "sharkdp/fd",
  "cli/cli",
  "BurntSushi/ripgrep",
  "starship/starship",
  "koalaman/shellcheck",
  "ColinIanKing/stress-ng",
  "dbrgn/tealdeer",
  "andreafrancia/trash-cli",
  "alexpasmantier/television",
  "Genivia/ugrep",
  "uutils/coreutils",
  "mikefarah/yq",
  "ajeetdsouza/zoxide",

  // Frameworks
  "flatpak/flatpak",
  "Homebrew/brew",
];

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "github-repos.json");

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchRepo(repoPath) {
  const url = `https://api.github.com/repos/${repoPath}`;
  const headers = githubHeaders(GITHUB_TOKEN);

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(
        `Failed to fetch ${repoPath}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    return {
      full_name: data.full_name,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
    };
  } catch (error) {
    console.error(`Error fetching ${repoPath}:`, error.message);
    return null;
  }
}

async function fetchAllRepos() {
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

  console.log(`Fetching ${GITHUB_REPOS.length} GitHub repos...`);

  // Load whatever cache already exists on disk so a failed fetch for one
  // repo (rate limiting, transient network error, etc.) doesn't erase stats
  // that were previously fetched successfully for that same repo.
  let existingCache = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingCache = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
    } catch (error) {
      console.warn(`⚠️  Could not parse existing cache: ${error.message}`);
    }
  }

  const resultsMap = await sequentialFetchWithDelay(
    GITHUB_REPOS,
    async (repoPath) => {
      console.log(`Fetching ${repoPath}...`);
      return fetchRepo(repoPath);
    },
  );

  const freshRepos = Object.fromEntries(resultsMap);

  // Merge: start from cached entries for repos still tracked (dropping any
  // that were removed from GITHUB_REPOS), then overlay this run's
  // successes. A repo that failed this run keeps its last-known-good stats
  // instead of disappearing entirely.
  const repos = {};
  for (const repoPath of GITHUB_REPOS) {
    if (existingCache[repoPath]) {
      repos[repoPath] = existingCache[repoPath];
    }
  }
  Object.assign(repos, freshRepos);

  const failedCount = GITHUB_REPOS.length - Object.keys(freshRepos).length;
  console.log(
    `\nSuccessfully fetched ${Object.keys(freshRepos).length}/${GITHUB_REPOS.length} repos`,
  );
  if (failedCount > 0) {
    const recoveredFromCache = Object.keys(repos).length - Object.keys(freshRepos).length;
    console.log(
      `  ${recoveredFromCache} of the ${failedCount} failures were preserved from the existing cache.`,
    );
  }

  // Don't fail build if no repos fetched - the component will just not show stats
  if (Object.keys(repos).length === 0) {
    console.warn("\n⚠️  No repos fetched! Stats will not be displayed.");
    console.warn("   Please set a GitHub token and try again.");
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(repos, null, 2), "utf-8");

  console.log(`✓ Repos saved to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  fetchAllRepos().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  fetchRepo,
};
