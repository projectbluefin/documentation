const fs = require('fs');
const path = require('path');

// List all GitHub usernames from donations.mdx
const GITHUB_USERNAMES = [
  // Current Maintainers
  'ahmedadan', 'befanyt', 'castrojo', 'daegalus',
  'hanthor', 'inffy', 'p5', 'renner0e', 'tulilirockz',
  
  // Artists
  'chandeleer1698', 'delphicmelody',
  
  // Bluefin Maintainers (Emeritus)
  'bketelsen', 'bsherman', 'm2Giles', 'rothgar',
  
  // Special Guests
  'alatiera', 'kolunmi', 'madonuko',
  
  // Legendary Supporters
  'abbycabs', 'ahrkrak', 'angellk', 'ashleymcnamara', 'caniszczyk',
  'carlwgeorge', 'cblecker', 'cgwalters', 'colindean', 'craigmcl',
  'ctsdownloads', 'dustinkirkland', 'ericcurtin', 'funnelfiasco', 'idvoretskyi',
  'jbeda', 'jberkus', 'jeefy', 'jonobacon', 'karasowles',
  'kenvandine', 'lhawthorn', 'liljenstolpe', 'marcoceppi', 'marrusl',
  'mattfarina', 'mattray', 'mfahlandt', 'michaeltunnell', 'mrbobbytables',
  'nimbinatus', 'parispittman', 'popey', 'puja108', 'ramcq',
  'rhatdan', 'sarahnovotny', 'thockin', 'travier', 'wwitzel3',
  
  // Universal Blue Team
  'antheas', 'dreamyukii', 'HikariKnight', 'KyleGospo', 'noelmiller',
];

const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'github-profiles.json');

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchProfile(username) {
  const url = `https://api.github.com/users/${username}`;
  
  const headers = {
    'User-Agent': 'Bluefin-Docs-Build',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${username}: ${response.status} ${response.statusText}`);
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
    };
  } catch (error) {
    console.error(`Error fetching ${username}:`, error.message);
    return null;
  }
}

async function fetchAllProfiles() {
  if (!GITHUB_TOKEN) {
    console.warn('⚠️  No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
    console.warn('   This script may hit rate limits without authentication.');
    console.warn('   Get a token at: https://github.com/settings/tokens\n');
  } else {
    console.log('✓ Using authenticated GitHub API access\n');
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
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nSuccessfully fetched ${Object.keys(profiles).length}/${GITHUB_USERNAMES.length} profiles`);
  
  if (Object.keys(profiles).length === 0) {
    console.error('\n❌ No profiles fetched! Build will fail without profile data.');
    console.error('   Please set a GitHub token and try again.');
    process.exit(1);
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(profiles, null, 2),
    'utf-8'
  );
  
  console.log(`✓ Profiles saved to ${OUTPUT_FILE}`);
}

fetchAllProfiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
