const fs = require("fs");
const path = require("path");

async function fetchContributing() {
  try {
    const fetch = (await import("node-fetch")).default;
    const url =
      "https://raw.githubusercontent.com/ublue-os/bluefin/main/CONTRIBUTING.md";
    const targetPath = path.join(__dirname, "..", "docs", "contributing.md");

    console.log(`Fetching CONTRIBUTING.md from ${url}...`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch CONTRIBUTING.md: ${response.status} ${response.statusText}`,
      );
    }

    const fetchedContent = await response.text();

    // Check if the fetched content is just a redirect (less than 200 characters and contains a URL)
    const isRedirect =
      fetchedContent.length < 200 && fetchedContent.includes("http");

    if (isRedirect) {
      console.log(
        "Fetched CONTRIBUTING.md appears to be a redirect, skipping update to preserve existing docs.",
      );
      console.log("The local docs/contributing.md will be kept as-is.");
      return;
    }

    // Read existing file to preserve frontmatter
    let frontmatter = "";

    if (fs.existsSync(targetPath)) {
      const existingContent = fs.readFileSync(targetPath, "utf8");

      // Extract frontmatter if it exists
      const frontmatterMatch = existingContent.match(/^---\n([\s\S]*?)\n---\n/);
      if (frontmatterMatch) {
        frontmatter = frontmatterMatch[0];
      }
    }

    // If no frontmatter exists, use default
    if (!frontmatter) {
      frontmatter = `---
title: Contributor's guide
slug: /contributing
---

`;
    }

    // Enhance the fetched content with Graner's quote and admonitions
    let enhancedContent = fetchedContent;
    
    // Add Graner's quote after the intro paragraph
    const granerQuote = `\n\n:::tip\n\nYou don't need permission to contribute to your own destiny.\n\n-- Amber Graner\n\n:::\n`;
    
    // Find the first heading after the intro and insert the quote before it
    const firstHeadingMatch = enhancedContent.match(/\n## /);
    if (firstHeadingMatch) {
      const insertPos = firstHeadingMatch.index;
      enhancedContent = enhancedContent.slice(0, insertPos) + granerQuote + enhancedContent.slice(insertPos);
    }
    
    // Add strategic admonitions throughout the document
    const admonitions = [
      {
        find: /## Getting Started\n/,
        replace: `## Getting Started\n\n:::info First Time Contributing?\nStart small! Documentation improvements or simple package additions are great first contributions. Don't hesitate to ask questions in issues or discussions.\n:::\n`
      },
      {
        find: /### Commit Message Format\n\nBluefin uses \[Conventional Commits\]\(https:\/\/www\.conventionalcommits\.org\/\) enforced by CI:\n/,
        replace: `### Commit Message Format\n\n:::caution Important\nBluefin uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by CI. Your PR will fail if commit messages don't follow this format!\n:::\n`
      },
      {
        find: /## Testing Your Changes\n/,
        replace: `## Testing Your Changes\n\n:::tip Testing is Key\nAlways test your changes locally or via PR builds before merging. Broken builds affect everyone!\n:::\n`
      },
      {
        find: /### Testing on Your System\n\n\*\*Using PR Images:\*\*/,
        replace: `### Testing on Your System\n\n:::warning Testing on Your System\nRebasing to PR images is powerful but comes with risk. Always have a backup plan to revert to stable!\n:::\n\n**Using PR Images:**`
      },
      {
        find: /## Advanced Workflows\n/,
        replace: `## Advanced Workflows\n\n:::note Advanced Git Techniques\nThese workflows are for more experienced contributors. New contributors should focus on the basics first!\n:::\n`
      },
      {
        find: /## Contribution Areas by Expertise\n/,
        replace: `## Contribution Areas by Expertise\n\n:::info Find Your Fit\nContributors come from diverse backgrounds. Whether you're a DevOps engineer, package maintainer, or documentation writer, there's a place for your skills in Bluefin!\n:::\n`
      },
      {
        find: /## Troubleshooting Guide\n/,
        replace: `## Troubleshooting Guide\n\n:::tip Common Issues & Solutions\nStuck? Check this section first. Most problems have been encountered before and have known solutions!\n:::\n`
      },
      {
        find: /### Issue Capture Discipline\n\nFrom the contributing guide philosophy:\n/,
        replace: `### Issue Capture Discipline\n\n:::note Issue Capture Philosophy\nUse Discord for rapid debugging, but always capture solutions in GitHub issues. This builds permanent, searchable knowledge for the community.\n:::\n\nFrom the contributing guide philosophy:\n`
      },
      {
        find: /## Pinning Package Versions\n\nSometimes upstream Fedora has a regression requiring a temporary pin\./,
        replace: `## Pinning Package Versions\n\n:::caution Temporary Workarounds Only\nPackage pins are temporary workarounds for upstream regressions. Always document why they exist and remove them after the fix is released!\n:::\n\nSometimes upstream Fedora has a regression requiring a temporary pin.`
      },
      {
        find: /## Final Tips\n\n1\. \*\*Start small\*\*:/,
        replace: `## Final Tips\n\n:::tip Welcome to Bluefin!\nEvery maintainer started as a first-time contributor. Take it one step at a time, and don't be afraid to ask questions!\n:::\n\n1. **Start small**:`
      }
    ];
    
    // Apply all admonitions
    admonitions.forEach(admonition => {
      if (admonition.find.test(enhancedContent)) {
        enhancedContent = enhancedContent.replace(admonition.find, admonition.replace);
      }
    });
    
    // Combine frontmatter with enhanced content
    const finalContent = frontmatter + enhancedContent;

    // Write to docs/contributing.md
    fs.writeFileSync(targetPath, finalContent, "utf8");

    console.log(`Successfully saved CONTRIBUTING.md to ${targetPath}`);
  } catch (error) {
    console.error(`Error fetching CONTRIBUTING.md:`, error);
    // Don't fail the build, just warn
    console.warn(
      "Build will continue with existing contributing.md file if present",
    );
  }
}

if (require.main === module) {
  fetchContributing().catch(console.error);
}

module.exports = { fetchContributing };
