const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const glob = require("glob");
const {
  sequentialFetchWithDelay,
  githubHeaders,
} = require("./lib/request-queue");

const REPO_ROOT = path.join(__dirname, "..");

/**
 * Collect all GitHub logins referenced anywhere in the site:
 * 1. authors.yaml – socials.github field
 * 2. blog/**\/*.{md,mdx} – inline `login: "username"` props (contributor grids)
 * 3. Hardcoded list below (donations page, legacy)
 */
function discoverUsernames() {
  const logins = new Set();

  // 1. authors.yaml
  const authorsFile = path.join(REPO_ROOT, "blog", "authors.yaml");
  if (fs.existsSync(authorsFile)) {
    const parsed = yaml.load(fs.readFileSync(authorsFile, "utf-8")) ?? {};
    for (const author of Object.values(parsed)) {
      const gh = author?.socials?.github;
      if (gh) logins.add(gh);
    }
  }

  // 2. Blog files – login: "username" prop
  const blogFiles = glob.sync("blog/**/*.{md,mdx}", { cwd: REPO_ROOT });
  const loginRe = /\blogin:\s*["']([A-Za-z0-9_-]+)["']/g;
  for (const rel of blogFiles) {
    const content = fs.readFileSync(path.join(REPO_ROOT, rel), "utf-8");
    for (const match of content.matchAll(loginRe)) {
      logins.add(match[1]);
    }
  }

  // 3. Hardcoded additions (donations page, supporters, etc.)
  for (const u of HARDCODED_USERNAMES) logins.add(u);

  return Array.from(logins);
}

// Hardcoded list – donations.mdx and other pages not covered by blog scanning
const HARDCODED_USERNAMES = [
  // Current Maintainers
  "ahmedadan",
  "befanyt",
  "castrojo",
  "daegalus",
  "hanthor",
  "inffy",
  "p5",
  "renner0e",
  "tulilirockz",

  // Artists
  "chandeleer1698",
  "delphicmelody",

  // Bluefin Maintainers (Emeritus)
  "bketelsen",
  "bsherman",
  "m2Giles",
  "rothgar",

  // Special Guests
  "alatiera",
  "kolunmi",
  "madonuko",

  // Report Contributors
  "AlexanderVanhee",
  "AtiusAmy",
  "AtomHare",
  "buggerman",
  "coxde",
  "dtg01100",
  "eltorrero",
  "ExistingPerson08",
  "fizzyizzy05",
  "jfmongrain",
  "joshyorko",
  "jumpyvi",
  "KiKaraage",
  "kriszentner",
  "lambdaclan",
  "leafyoung",
  "LorbusChris",
  "louhitar",
  "Micro856",
  "mmartinortiz",
  "NahsiN",
  "RaduAvramescu",
  "repires",
  "rrenomeron",
  "rwaltr",
  "salim-b",
  "sebjag",
  "spasche",
  "theMimolet",
  "tingweiwan",
  "tunix",

  // Legendary Supporters
  "abbycabs",
  "ahrkrak",
  "angellk",
  "ashleymcnamara",
  "caniszczyk",
  "carlwgeorge",
  "cblecker",
  "cgwalters",
  "colindean",
  "craigmcl",
  "ctsdownloads",
  "dustinkirkland",
  "ericcurtin",
  "funnelfiasco",
  "heavyelement",
  "idvoretskyi",
  "jbeda",
  "jberkus",
  "jeefy",
  "jonobacon",
  "karasowles",
  "kenvandine",
  "lhawthorn",
  "liljenstolpe",
  "marcoceppi",
  "marrusl",
  "mattfarina",
  "mattray",
  "mfahlandt",
  "michaeltunnell",
  "mrbobbytables",
  "nimbinatus",
  "parispittman",
  "popey",
  "puja108",
  "ramcq",
  "rhatdan",
  "sarahnovotny",
  "thockin",
  "travier",
  "wwitzel3",

  // Universal Blue Team
  "antheas",
  "dreamyukii",
  "HikariKnight",
  "KyleGospo",
  "noelmiller",
];

const OUTPUT_DIR = path.join(__dirname, "..", "static", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "github-profiles.json");

// Resolved at startup so the count is accurate in log output
const GITHUB_USERNAMES = discoverUsernames();

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchProfile(username) {
  const url = `https://api.github.com/users/${username}`;
  const headers = githubHeaders(GITHUB_TOKEN);

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(
        `Failed to fetch ${username}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    return {
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      html_url: data.html_url,
      public_repos: data.public_repos,
      followers: data.followers,
      company: data.company ?? null,
      sponsorable: false, // will be enriched by fetchSponsorableStatus
    };
  } catch (error) {
    console.error(`Error fetching ${username}:`, error.message);
    return null;
  }
}

/**
 * Known donation platform provider names (matched case-insensitively against
 * the `provider` field returned by GitHub's socialAccounts GraphQL field).
 */
const DONATION_PROVIDERS = [
  "ko-fi",
  "kofi",
  "ko_fi",
  "patreon",
  "opencollective",
  "open_collective",
  "liberapay",
  "buymeacoffee",
  "buy_me_a_coffee",
  "tidelift",
  "paypal",
];

/**
 * Batch-fetch hasSponsorsListing and socialAccounts via GraphQL for up to 100
 * users per request.
 *
 * Returns:
 *   sponsorable  – Set<string>         logins with an active GitHub Sponsors listing
 *   donationUrls – Map<string, string>  login → first matched donation platform URL
 */
async function fetchSponsorableStatus(usernames) {
  if (!GITHUB_TOKEN) {
    console.warn("⚠️  No GitHub token — skipping sponsorable check, all set to false.");
    return { sponsorable: new Set(), donationUrls: new Map() };
  }

  const BATCH_SIZE = 100;
  const sponsorable = new Set();
  const donationUrls = new Map();

  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    const batch = usernames.slice(i, i + BATCH_SIZE);
    // Build aliased GraphQL query including socialAccounts
    const fields = batch
      .map(
        (u, idx) =>
          `u${idx}: user(login: ${JSON.stringify(u)}) {
            hasSponsorsListing
            socialAccounts(first: 10) { nodes { provider url } }
          }`,
      )
      .join("\n");
    const query = `{ ${fields} }`;

    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Bluefin-Docs-Build",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        console.error(`GraphQL sponsors batch failed: ${res.status}`);
        continue;
      }

      const json = await res.json();
      if (json.errors) {
        console.warn("GraphQL errors:", json.errors.map((e) => e.message).join(", "));
      }

      batch.forEach((u, idx) => {
        const key = `u${idx}`;
        const node = json.data?.[key];
        if (!node) return;

        if (node.hasSponsorsListing) {
          sponsorable.add(u.toLowerCase());
        }

        // Extract first donation platform URL from social accounts
        const accounts = node.socialAccounts?.nodes ?? [];
        for (const account of accounts) {
          const provider = (account.provider ?? "").toLowerCase();
          if (DONATION_PROVIDERS.includes(provider)) {
            donationUrls.set(u.toLowerCase(), account.url);
            break; // take the first match
          }
        }
      });
    } catch (err) {
      console.error("GraphQL sponsors batch error:", err.message);
    }
  }

  return { sponsorable, donationUrls };
}

async function fetchAllProfiles() {
  const force = process.argv.includes("--force");

  // Load existing cached profiles (if any) so we can do a delta fetch
  let existingProfiles = {};
  let cacheAgeHours = Infinity;
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingProfiles = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      const stats = fs.statSync(OUTPUT_FILE);
      cacheAgeHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    } catch {
      existingProfiles = {};
    }
  }

  // Determine which usernames need fetching
  // - --force: fetch everyone
  // - cache fresh AND no missing: skip entirely
  // - cache fresh BUT missing entries: fetch only the missing ones (delta)
  // - cache stale: fetch everyone for a full refresh
  const existingKeys = new Set(Object.keys(existingProfiles).map((k) => k.toLowerCase()));
  const missing = GITHUB_USERNAMES.filter((u) => !existingKeys.has(u.toLowerCase()));

  let usernamestoFetch;
  if (force) {
    console.log("🔄 --force flag detected. Fetching all profiles...");
    usernamestoFetch = GITHUB_USERNAMES;
  } else if (cacheAgeHours < CACHE_MAX_AGE_HOURS && missing.length === 0) {
    console.log(
      `✓ Cache is ${cacheAgeHours.toFixed(1)}h old and complete (${Object.keys(existingProfiles).length} profiles). Skipping fetch.`,
    );
    console.log(`  Use --force flag to bypass cache and force fresh fetch.`);
    return;
  } else if (cacheAgeHours < CACHE_MAX_AGE_HOURS && missing.length > 0) {
    console.log(
      `✓ Cache is ${cacheAgeHours.toFixed(1)}h old but missing ${missing.length} profile(s). Fetching delta...`,
    );
    usernamestoFetch = missing;
  } else {
    console.log(
      `⏱️  Cache is ${cacheAgeHours === Infinity ? "absent" : `${cacheAgeHours.toFixed(1)}h old`} (max ${CACHE_MAX_AGE_HOURS}h). Fetching all profiles...`,
    );
    usernamestoFetch = GITHUB_USERNAMES;
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

  console.log(`Fetching ${usernamestoFetch.length} GitHub profiles (${GITHUB_USERNAMES.length} total discovered)...`);

  // Start with existing profiles and overlay fresh fetches
  const profiles = force ? {} : { ...existingProfiles };

  const fetchedMap = await sequentialFetchWithDelay(
    usernamestoFetch,
    async (username) => {
      console.log(`Fetching ${username}...`);
      return fetchProfile(username);
    },
  );
  for (const [username, profile] of fetchedMap) {
    profiles[username] = profile;
  }

  const fetched = Object.keys(profiles).length;
  console.log(`\nSuccessfully fetched ${usernamestoFetch.length} profiles (${fetched} total in cache)`);

  // Validate: fail if we fetched fewer profiles than we expected
  const failedCount = usernamestoFetch.length - usernamestoFetch.filter((u) => profiles[u]).length;
  if (failedCount > 0) {
    console.warn(`⚠️  ${failedCount} profile(s) could not be fetched (API errors or deleted accounts).`);
  }
  if (fetched === 0) {
    console.error("\n❌ No profiles in output! Build will fail without profile data.");
    process.exit(1);
  }

  // Enrich with sponsorable status and donation URLs via a single batched GraphQL call.
  // Only re-check users we just fetched to avoid hammering GraphQL for the full set every delta run.
  console.log("\nChecking GitHub Sponsors listings and social donation accounts...");
  const { sponsorable: sponsorableSet, donationUrls } = await fetchSponsorableStatus(usernamestoFetch);
  for (const username of usernamestoFetch) {
    if (!profiles[username]) continue;
    const lower = username.toLowerCase();
    profiles[username].sponsorable = sponsorableSet.has(lower);
    profiles[username].donationUrl = donationUrls.get(lower) ?? null;
  }
  const sponsorCount = Object.values(profiles).filter((p) => p.sponsorable).length;
  const donationCount = Object.values(profiles).filter((p) => p.donationUrl).length;
  console.log(`✓ ${sponsorCount} users have active GitHub Sponsors listings`);
  console.log(`✓ ${donationCount} users have donation links from social accounts`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2), "utf-8");
  console.log(`✓ Profiles saved to ${OUTPUT_FILE}`);
}

fetchAllProfiles().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
