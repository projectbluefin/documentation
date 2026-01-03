#!/usr/bin/env node

/**
 * Script to download GitHub user-attachment images to local static directory
 * This script fetches all images from GitHub user-attachments URLs and saves them locally
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATIC_IMG_DIR = path.join(__dirname, '..', 'static', 'img', 'user-attachments');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BLOG_DIR = path.join(__dirname, '..', 'blog');

// Create the user-attachments directory if it doesn't exist
if (!fs.existsSync(STATIC_IMG_DIR)) {
  fs.mkdirSync(STATIC_IMG_DIR, { recursive: true });
  console.log(`Created directory: ${STATIC_IMG_DIR}`);
}

// Function to extract all unique GitHub user-attachment URLs
function extractUserAttachmentUrls() {
  const urlPattern = 'https://github\\.com/user-attachments/assets/[a-f0-9-]+';
  
  try {
    // Use grep to find all URLs
    const grepCommand = `grep -rhoE '${urlPattern}' ${DOCS_DIR} ${BLOG_DIR} | sort -u`;
    const output = execSync(grepCommand, { encoding: 'utf-8' });
    const urls = output.trim().split('\n').filter(url => url.length > 0);
    
    console.log(`Found ${urls.length} unique user-attachment URLs`);
    return urls;
  } catch (error) {
    console.error('Error extracting URLs:', error.message);
    return [];
  }
}

// Function to download a single image
async function downloadImage(url) {
  const uuid = url.split('/').pop();
  const tempFile = path.join(STATIC_IMG_DIR, `temp_${uuid}`);
  
  try {
    // Download the file using curl with redirect following
    console.log(`Downloading ${uuid}...`);
    execSync(`curl -L -s "${url}" -o "${tempFile}"`, { stdio: 'pipe' });
    
    if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
      console.error(`  Failed to download ${uuid} - file is empty or doesn't exist`);
      return null;
    }
    
    // Detect the file type
    const fileTypeOutput = execSync(`file -b --mime-type "${tempFile}"`, { encoding: 'utf-8' }).trim();
    
    // Determine extension based on MIME type
    let ext = 'png'; // default
    if (fileTypeOutput.includes('image/jpeg')) {
      ext = 'jpg';
    } else if (fileTypeOutput.includes('image/png')) {
      ext = 'png';
    } else if (fileTypeOutput.includes('image/gif')) {
      ext = 'gif';
    } else if (fileTypeOutput.includes('image/webp')) {
      ext = 'webp';
    } else if (fileTypeOutput.includes('image/svg')) {
      ext = 'svg';
    }
    
    // Move to final destination with proper extension
    const finalFile = path.join(STATIC_IMG_DIR, `${uuid}.${ext}`);
    fs.renameSync(tempFile, finalFile);
    console.log(`  Saved as ${uuid}.${ext}`);
    
    return { uuid, ext, url };
  } catch (error) {
    console.error(`  Error downloading ${uuid}:`, error.message);
    // Clean up temp file if it exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return null;
  }
}

// Main function
async function main() {
  console.log('Starting GitHub user-attachment image download...\n');
  
  const urls = extractUserAttachmentUrls();
  
  if (urls.length === 0) {
    console.log('No user-attachment URLs found.');
    return;
  }
  
  const results = [];
  const failed = [];
  
  for (const url of urls) {
    const result = await downloadImage(url);
    if (result) {
      results.push(result);
    } else {
      failed.push(url);
    }
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total URLs: ${urls.length}`);
  console.log(`Successfully downloaded: ${results.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\nFailed URLs:');
    failed.forEach(url => console.log(`  - ${url}`));
  }
  
  // Save mapping file for reference
  const mappingFile = path.join(STATIC_IMG_DIR, 'url-mapping.json');
  const mapping = {};
  results.forEach(({ uuid, ext, url }) => {
    mapping[url] = `/img/user-attachments/${uuid}.${ext}`;
  });
  
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\nURL mapping saved to: ${mappingFile}`);
  
  console.log('\nDownload complete!');
}

main().catch(console.error);
