const fs = require('fs');
const path = require('path');

// List all GitHub repos from projects.mdx
const GITHUB_REPOS = [
  // Desktop Environment
  'GNOME/gnome-shell',
  
  // GNOME Extensions
  'aunetx/blur-my-shell',
  'micheleg/dash-to-dock',
  'GSConnect/gnome-shell-extension-gsconnect',
  'Aryan20/Logomenu',
  'icedman/search-light',
  'ubuntu/gnome-shell-extension-appindicator',
  
  // Flatpak Applications
  'kolunmi/bazaar',
  'nickvision-apps/cavalier',
  'flattool/warehouse',
  'flattool/ignition',
  'tchx84/Flatseal',
  'mjakeman/extension-manager',
  'deja-dup/deja-dup',
  'Flavius42/mission-center',
  'adhami3310/impression',
  'PintaProject/Pinta',
  'GNOME/Showtime',
  'tesk-g/refine',
  'mijorus/smile',
  
  // Homebrew CLI Tools (bluefin-cli)
  'atuinsh/atuin',
  'rcaloras/bash-preexec',
  'sharkdp/bat',
  'Valkyrie00/bold-brew',
  'twpayne/chezmoi',
  'direnv/direnv',
  'Canop/dysk',
  'eza-community/eza',
  'sharkdp/fd',
  'cli/cli',
  'BurntSushi/ripgrep',
  'starship/starship',
  'koalaman/shellcheck',
  'ColinIanKing/stress-ng',
  'dbrgn/tealdeer',
  'andreafrancia/trash-cli',
  'alexpasmantier/television',
  'Genivia/ugrep',
  'uutils/coreutils',
  'mikefarah/yq',
  'ajeetdsouza/zoxide',
  
  // Frameworks
  'flatpak/flatpak',
  'Homebrew/brew',
];

const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'github-repos.json');

// Check for GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function fetchRepo(repoPath) {
  const url = `https://api.github.com/repos/${repoPath}`;
  
  const headers = {
    'User-Agent': 'Bluefin-Docs-Build',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${repoPath}: ${response.status} ${response.statusText}`);
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
  if (!GITHUB_TOKEN) {
    console.warn('⚠️  No GitHub token found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
    console.warn('   This script may hit rate limits without authentication.');
    console.warn('   Get a token at: https://github.com/settings/tokens\n');
  } else {
    console.log('✓ Using authenticated GitHub API access\n');
  }
  
  console.log(`Fetching ${GITHUB_REPOS.length} GitHub repos...`);
  
  const repos = {};
  
  // Fetch repos with a small delay to avoid rate limiting
  for (const repoPath of GITHUB_REPOS) {
    console.log(`Fetching ${repoPath}...`);
    const repo = await fetchRepo(repoPath);
    
    if (repo) {
      repos[repoPath] = repo;
    }
    
    // Small delay to be nice to GitHub's API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nSuccessfully fetched ${Object.keys(repos).length}/${GITHUB_REPOS.length} repos`);
  
  // Don't fail build if no repos fetched - the component will just not show stats
  if (Object.keys(repos).length === 0) {
    console.warn('\n⚠️  No repos fetched! Stats will not be displayed.');
    console.warn('   Please set a GitHub token and try again.');
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Write to file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(repos, null, 2),
    'utf-8'
  );
  
  console.log(`✓ Repos saved to ${OUTPUT_FILE}`);
}

fetchAllRepos().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
