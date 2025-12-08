#!/usr/bin/env node

/**
 * Script to update driver-versions.md with latest release information
 * Fetches data from @ublue-os/bluefin and @ublue-os/bluefin-lts GitHub API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DOC_PATH = path.join(__dirname, '../docs/driver-versions.md');

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const REPOS = {
  bluefin: 'ublue-os/bluefin',
  bluefinLts: 'ublue-os/bluefin-lts',
};

/**
 * Fetch data from GitHub API
 */
function fetchGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'bluefin-docs-update-script',
        Accept: 'application/vnd.github+json',
      },
    };

    // Add GitHub token if available (for higher rate limits)
    if (process.env.GITHUB_TOKEN) {
      options.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    https
      .get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Get latest release for each stream (stable, gts, lts)
 */
async function getLatestReleases() {
  console.log('Fetching latest releases from GitHub...');

  // Fetch releases from both repos
  const bluefinReleases = await fetchGitHub(
    `${GITHUB_API}/repos/${REPOS.bluefin}/releases?per_page=10`
  );
  const bluefinLtsReleases = await fetchGitHub(
    `${GITHUB_API}/repos/${REPOS.bluefinLts}/releases?per_page=3`
  );

  // Find latest stable release
  const latestStable = bluefinReleases.find((r) => r.tag_name.startsWith('stable-'));

  // Find latest GTS release
  const latestGts = bluefinReleases.find((r) => r.tag_name.startsWith('gts-'));

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
    kernel: 'N/A',
    nvidia: 'N/A',
    mesa: 'N/A',
  };

  // Extract from Major packages table
  const majorPackagesMatch = releaseBody.match(/### Major packages\s*\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)*)/);

  if (majorPackagesMatch) {
    const tableRows = majorPackagesMatch[1];

    // Extract Kernel version
    const kernelMatch = tableRows.match(/\|\s*\*\*Kernel\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/);
    if (kernelMatch) {
      info.kernel = kernelMatch[2] || kernelMatch[1]; // Use the newer version if there's an arrow
    }

    // For LTS, also check for HWE Kernel and combine them
    if (stream === 'lts') {
      const hweMatch = tableRows.match(/\|\s*\*\*HWE Kernel\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/);
      if (hweMatch) {
        const hweKernel = hweMatch[2] || hweMatch[1];
        const baseKernel = info.kernel;
        info.kernel = `${baseKernel} (HWE: ${hweKernel})`;
      }
    }

    // Extract Mesa version
    const mesaMatch = tableRows.match(/\|\s*\*\*Mesa\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/);
    if (mesaMatch) {
      info.mesa = mesaMatch[2] || mesaMatch[1];
    }
  }

  // Extract NVIDIA from Major GDX packages table (LTS) or Major packages (stable/gts)
  const gdxMatch = releaseBody.match(/### Major GDX packages\s*\|[^\n]+\n\|[^\n]+\n((?:\|[^\n]+\n)*)/);
  if (gdxMatch) {
    const tableRows = gdxMatch[1];
    const nvidiaMatch = tableRows.match(/\|\s*\*\*Nvidia\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/);
    if (nvidiaMatch) {
      info.nvidia = nvidiaMatch[2] || nvidiaMatch[1];
    }
  } else {
    // Try regular Major packages table for NVIDIA
    if (majorPackagesMatch) {
      const tableRows = majorPackagesMatch[1];
      const nvidiaMatch = tableRows.match(/\|\s*\*\*Nvidia\*\*\s*\|\s*([^\|\s]+)(?:\s*➡️\s*([^\|\s]+))?\s*\|/);
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
function formatTableRow(release, stream) {
  const drivers = extractDriverInfo(release.body, stream);

  const tag = release.tag_name;
  const releaseUrl = release.html_url;

  // NVIDIA driver version to URL mapping
  const nvidiaUrlMap = {
    '580.105.08': 'https://www.nvidia.com/en-us/drivers/details/257493/',
    '580.95.05': 'https://www.nvidia.com/en-us/drivers/details/254665/',
    '580.82.07': 'https://www.nvidia.com/en-us/drivers/details/253003/',
    '580.76.05': 'https://www.nvidia.com/en-us/drivers/details/252613/',
  };

  // Create NVIDIA driver link
  let nvidiaLink = drivers.nvidia;
  if (drivers.nvidia !== 'N/A') {
    // Extract base version (e.g., "580.105.08" from "580.105.08-1")
    const baseVersion = drivers.nvidia.split('-')[0];
    
    // Try to get URL from mapping first
    if (nvidiaUrlMap[baseVersion]) {
      nvidiaLink = `[${drivers.nvidia}](${nvidiaUrlMap[baseVersion]})`;
    } else {
      // Fallback: try to extract NVIDIA URL from release body
      const escapedVersion = drivers.nvidia.replace(/\./g, '\\.');
      const nvidiaUrlMatch = release.body.match(
        new RegExp(`\\[${escapedVersion}\\]\\((https:\\/\\/www\\.nvidia\\.com[^\\)]+)\\)`, 'i')
      );
      if (nvidiaUrlMatch) {
        nvidiaLink = `[${drivers.nvidia}](${nvidiaUrlMatch[1]})`;
      } else {
        nvidiaLink = drivers.nvidia;
      }
    }
  }

  // Create Mesa driver link
  let mesaLink = drivers.mesa;
  if (drivers.mesa !== 'N/A') {
    const mesaVersion = drivers.mesa.replace(/-\d+$/, ''); // Remove trailing package version
    mesaLink = `[${drivers.mesa}](https://docs.mesa3d.org/relnotes/${mesaVersion}.html)`;
  }

  return `| [**${tag}**](${releaseUrl}) | ${drivers.kernel} | ${nvidiaLink} | ${mesaLink} |`;
}

/**
 * Update the document with new releases
 */
async function updateDocument() {
  try {
    // Read current document
    const content = fs.readFileSync(DOC_PATH, 'utf8');
    const lines = content.split('\n');

    // Get latest releases
    const releases = await getLatestReleases();

    // Validate releases were found
    if (!releases.stable || !releases.gts || !releases.lts) {
      console.error('❌ Failed to fetch all required releases');
      console.error('  Stable:', releases.stable?.tag_name || 'NOT FOUND');
      console.error('  GTS:', releases.gts?.tag_name || 'NOT FOUND');
      console.error('  LTS:', releases.lts?.tag_name || 'NOT FOUND');
      process.exit(1);
    }

    console.log('Latest releases:');
    console.log('- Stable:', releases.stable.tag_name);
    console.log('- GTS:', releases.gts.tag_name);
    console.log('- LTS:', releases.lts.tag_name);

    // Find the table sections and insert new rows
    let newContent = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this is the start of a table section
      if (line === '## Bluefin') {
        // Copy section header
        newContent += line + '\n';
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === '') {
          newContent += lines[i] + '\n';
          i++;
        }
        // Copy table header rows (assume two lines starting with '|')
        newContent += lines[i] + '\n'; // Table header row 1
        i++;
        newContent += lines[i] + '\n'; // Table header row 2
        i++;
        // Check if the first row is already the latest stable
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith('|')) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.stable.tag_name) {
          // Insert new row at the top
          const newRow = formatTableRow(releases.stable, 'stable');
          newContent += newRow + '\n';
          console.log(`✅ Added new stable release: ${releases.stable.tag_name}`);
        } else {
          console.log(`ℹ️  Stable release ${releases.stable.tag_name} already exists at top`);
        }

        // Continue with existing rows
        while (i < lines.length && lines[i].startsWith('|')) {
          newContent += lines[i] + '\n';
          i++;
        }
        continue;
      } else if (line === '## Bluefin GTS') {
        // Copy section header
        newContent += line + '\n';
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === '') {
          newContent += lines[i] + '\n';
          i++;
        }
        // Copy table header rows
        newContent += lines[i] + '\n'; // Table header row 1
        i++;
        newContent += lines[i] + '\n'; // Table header row 2
        i++;
        // Check if the first row is already the latest GTS
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith('|')) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.gts.tag_name) {
          // Insert new row at the top
          const newRow = formatTableRow(releases.gts, 'gts');
          newContent += newRow + '\n';
          console.log(`✅ Added new GTS release: ${releases.gts.tag_name}`);
        } else {
          console.log(`ℹ️  GTS release ${releases.gts.tag_name} already exists at top`);
        }

        // Continue with existing rows
        while (i < lines.length && lines[i].startsWith('|')) {
          newContent += lines[i] + '\n';
          i++;
        }
        continue;
      } else if (line === '## Bluefin LTS') {
        // Copy section header
        newContent += line + '\n';
        i++;
        // Skip any blank lines after the section header
        while (i < lines.length && lines[i].trim() === '') {
          newContent += lines[i] + '\n';
          i++;
        }
        // Copy table header rows
        newContent += lines[i] + '\n'; // Table header row 1
        i++;
        newContent += lines[i] + '\n'; // Table header row 2
        i++;
        // Check if the first row is already the latest LTS
        let firstRowTag = null;
        if (i < lines.length && lines[i].startsWith('|')) {
          firstRowTag = lines[i].match(/\|\s*\*\*([^*]+)\*\*/)?.[1];
        }
        if (firstRowTag !== releases.lts.tag_name) {
          // Insert new row at the top
          const newRow = formatTableRow(releases.lts, 'lts');
          newContent += newRow + '\n';
          console.log(`✅ Added new LTS release: ${releases.lts.tag_name}`);
        } else {
          console.log(`ℹ️  LTS release ${releases.lts.tag_name} already exists at top`);
        }

        // Continue with existing rows
        while (i < lines.length && lines[i].startsWith('|')) {
          newContent += lines[i] + '\n';
          i++;
        }
        continue;
      }

      // Copy line as-is
      newContent += line + '\n';
      i++;
    }

    // Update last_updated in front matter
    const today = new Date().toISOString().split('T')[0];
    newContent = newContent.replace(/^last_updated: \d{4}-\d{2}-\d{2}$/m, `last_updated: ${today}`);

    // Write updated content
    fs.writeFileSync(DOC_PATH, newContent, 'utf8');
    console.log('\n✅ Document updated successfully!');
  } catch (error) {
    console.error('❌ Error updating document:', error.message);
    process.exit(1);
  }
}

// Run the update
updateDocument();
