#!/usr/bin/env node

/**
 * Script to replace GitHub user-attachment URLs with local image paths
 * This script updates all markdown files to use local static images instead of GitHub URLs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATIC_IMG_DIR = path.join(__dirname, '..', 'static', 'img', 'user-attachments');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BLOG_DIR = path.join(__dirname, '..', 'blog');

// Function to get the file extension for a UUID
function getImageExtension(uuid) {
  const possibleExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  
  for (const ext of possibleExtensions) {
    const filePath = path.join(STATIC_IMG_DIR, `${uuid}.${ext}`);
    if (fs.existsSync(filePath)) {
      return ext;
    }
  }
  
  return null;
}

// Function to find all markdown files
function findMarkdownFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findMarkdownFiles(filePath));
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Function to replace URLs in a file
function replaceUrlsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const urlPattern = /https:\/\/github\.com\/user-attachments\/assets\/([a-f0-9-]+)/g;
  
  let replacements = 0;
  let missingImages = [];
  
  const newContent = content.replace(urlPattern, (match, uuid) => {
    const ext = getImageExtension(uuid);
    
    if (ext) {
      replacements++;
      return `/img/user-attachments/${uuid}.${ext}`;
    } else {
      missingImages.push(uuid);
      // Return original URL if local image doesn't exist
      return match;
    }
  });
  
  if (replacements > 0) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
  
  return { replacements, missingImages };
}

// Main function
function main() {
  console.log('Starting URL replacement in markdown files...\n');
  
  // Check if user-attachments directory exists
  if (!fs.existsSync(STATIC_IMG_DIR)) {
    console.error(`Error: Directory ${STATIC_IMG_DIR} does not exist.`);
    console.error('Please run download-user-attachments.js first to download the images.');
    process.exit(1);
  }
  
  // Get list of downloaded images
  const downloadedImages = fs.readdirSync(STATIC_IMG_DIR)
    .filter(file => !file.endsWith('.json'))
    .map(file => {
      const match = file.match(/^([a-f0-9-]+)\.(png|jpg|jpeg|gif|webp|svg)$/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
  
  console.log(`Found ${downloadedImages.length} downloaded images in ${STATIC_IMG_DIR}\n`);
  
  // Find all markdown files
  const docsFiles = findMarkdownFiles(DOCS_DIR);
  const blogFiles = findMarkdownFiles(BLOG_DIR);
  const allFiles = [...docsFiles, ...blogFiles];
  
  console.log(`Found ${allFiles.length} markdown files to process\n`);
  
  // Process each file
  let totalReplacements = 0;
  const filesWithReplacements = [];
  const allMissingImages = new Set();
  
  for (const file of allFiles) {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    const { replacements, missingImages } = replaceUrlsInFile(file);
    
    if (replacements > 0) {
      filesWithReplacements.push({ file: relativePath, count: replacements });
      totalReplacements += replacements;
      console.log(`✓ ${relativePath}: ${replacements} replacement(s)`);
    }
    
    missingImages.forEach(uuid => allMissingImages.add(uuid));
  }
  
  console.log('\n--- Summary ---');
  console.log(`Total files processed: ${allFiles.length}`);
  console.log(`Files with replacements: ${filesWithReplacements.length}`);
  console.log(`Total replacements: ${totalReplacements}`);
  
  if (allMissingImages.size > 0) {
    console.log(`\nWarning: ${allMissingImages.size} image(s) not found locally:`);
    Array.from(allMissingImages).forEach(uuid => {
      console.log(`  - ${uuid}`);
    });
    console.log('\nThese images were not replaced. Run download-user-attachments.js to download them.');
  }
  
  console.log('\nReplacement complete!');
}

main();
