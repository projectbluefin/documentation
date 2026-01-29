const fs = require("fs");
const path = require("path");

async function fetchReleases(repo, filename) {
  try {
    const fetch = (await import("node-fetch")).default;
    const url = `https://api.github.com/repos/${repo}/releases?per_page=20`;
    console.log(`Fetching ${url}...`);

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const headers = {
      "User-Agent": "bluefin-docs",
    };

    if (token) {
      headers["Authorization"] = `token ${token}`;
    } else {
      console.warn("No GITHUB_TOKEN or GH_TOKEN found. Rate limits may apply.");
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const releases = data.map((release) => {
      return {
        title: release.name || release.tag_name,
        link: release.html_url,
        pubDate: release.published_at,
        contentSnippet: release.body ? release.body.substring(0, 200) + "..." : "",
        content: release.body || "",
        id: release.id.toString(),
      };
    });

    const feedsDir = path.join(__dirname, "..", "static", "feeds");
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
    }

    // Save as JSON
    const jsonPath = path.join(feedsDir, filename.replace(".xml", ".json"));
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          title: `Releases for ${repo}`,
          items: releases,
        },
        null,
        2,
      ),
    );

    console.log(`Saved ${releases.length} items to ${jsonPath}`);
    return releases;
  } catch (error) {
    console.error(`Error fetching releases for ${repo}:`, error);
    return null;
  }
}

async function main() {
  await fetchReleases("ublue-os/bluefin", "bluefin-releases.json");
  await fetchReleases("ublue-os/bluefin-lts", "bluefin-lts-releases.json");
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchReleases };
