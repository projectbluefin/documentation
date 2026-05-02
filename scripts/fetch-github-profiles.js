const fs = require("fs");
const path = require("path");

// List all GitHub usernames from donations.mdx
const GITHUB_USERNAMES = [
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

// Cache configuration
const CACHE_MAX_AGE_HOURS = 24;

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchProfile(username) {
  const url = `https://api.github.com/users/${username}`;

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

  console.log(`Fetching ${GITHUB_USERNAMES.length} GitHub profiles...`);

  const profiles = {};

  // Fetch profiles with a small delay to avoid rate limiting
  for (const username of GITHUB_USERNAMES) {
    console.log(`Fetching ${username}...`);
    const profile = await fetchProfile(username);

    if (profile) {
      profiles[username] = profile;
    }

    // Small delay to be nice to GitHub's API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `\nSuccessfully fetched ${Object.keys(profiles).length}/${GITHUB_USERNAMES.length} profiles`,
  );

  // Enrich with sponsorable status and donation URLs via a single batched GraphQL call
  console.log("\nChecking GitHub Sponsors listings and social donation accounts...");
  const { sponsorable: sponsorableSet, donationUrls } = await fetchSponsorableStatus(GITHUB_USERNAMES);
  for (const username of Object.keys(profiles)) {
    const lower = username.toLowerCase();
    profiles[username].sponsorable = sponsorableSet.has(lower);
    profiles[username].donationUrl = donationUrls.get(lower) ?? null;
  }
  const sponsorCount = Object.values(profiles).filter((p) => p.sponsorable).length;
  const donationCount = Object.values(profiles).filter((p) => p.donationUrl).length;
  console.log(`✓ ${sponsorCount} users have active GitHub Sponsors listings`);
  console.log(`✓ ${donationCount} users have donation links from social accounts`);

  if (Object.keys(profiles).length === 0) {
    console.error(
      "\n❌ No profiles fetched! Build will fail without profile data.",
    );
    console.error("   Please set a GitHub token and try again.");
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(profiles, null, 2), "utf-8");

  console.log(`✓ Profiles saved to ${OUTPUT_FILE}`);
}

fetchAllProfiles().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
