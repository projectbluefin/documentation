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

    // Combine frontmatter with fetched content
    const finalContent = frontmatter + fetchedContent;

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
