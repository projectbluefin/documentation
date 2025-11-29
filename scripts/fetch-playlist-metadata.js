const fs = require("fs");
const path = require("path");

// Configuration constants
const YOUTUBE_REQUEST_DELAY_MS = 1500; // Delay between requests to be respectful to YouTube

// Playlist IDs from docs/music.md
// Descriptions will be fetched from YouTube at build time
const PLAYLISTS = [
  {
    id: "PLhiPP9M5fgWHFlG3TS27gyOCQl4Dg115W",
    title: "Bluefin and the Birth of Universal Blue",
  },
  {
    id: "PLhiPP9M5fgWEvnp3w66WmcgiKvStzKXl9",
    title: "Bluefin finds Her Way",
  },
  {
    id: "PLhiPP9M5fgWEZbkq6ZhaHA4b4UqLwZNxt",
    title: "Bluefin and Achillobator",
  },
  {
    id: "PLhiPP9M5fgWEuxjlfOEX3fwA-E60-E4TA",
    title: "Bluefin and the Lost Tribe of Contributors",
  },
  {
    id: "PLhiPP9M5fgWHRa6Gt0UKWGxr3F0qg9t1g",
    title: "Bluefin and Dakota",
  },
  {
    id: "PLhiPP9M5fgWH4do22wEvgnoMUQLVYRIxt",
    title: "Bluefin and the Children of Jensen",
  },
  {
    id: "PLhiPP9M5fgWFOhFgduxhleNTmfVSj9JmO",
    title: "Bluefin and the Bazaar of Destiny",
  },
];

/**
 * Fetch playlist metadata from YouTube by parsing ytInitialData
 * Gets the playlist cover art thumbnail (not the first video) and description
 * This is the most reliable method as it uses the same data YouTube uses
 */
async function fetchPlaylistMetadata(playlistId, title) {
  console.log(`Fetching: ${title}`);

  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

  try {
    const fetch = (await import("node-fetch")).default;

    // Fetch the playlist page HTML
    const pageResponse = await fetch(playlistUrl);
    if (!pageResponse.ok) {
      throw new Error(`Playlist page returned ${pageResponse.status}`);
    }

    const html = await pageResponse.text();

    // Extract ytInitialData JSON from the page
    // This contains all the playlist metadata YouTube uses
    let ytInitialData = null;

    // Look for var ytInitialData = {...}; in the HTML
    // We need to match the complete JSON object, handling nested braces
    const ytInitialDataMatch = html.match(/var ytInitialData = (\{[^<]*\});/);
    if (ytInitialDataMatch) {
      try {
        ytInitialData = JSON.parse(ytInitialDataMatch[1]);
        console.log(`  ✓ Extracted ytInitialData`);
      } catch (parseError) {
        console.log(`  ✗ Failed to parse ytInitialData: ${parseError.message}`);
      }
    }

    let thumbnailUrl = null;
    let description = "";

    if (ytInitialData) {
      // Navigate the complex JSON structure to find playlist metadata
      try {
        // Path to playlist metadata varies, but typically:
        // ytInitialData.sidebar.playlistSidebarRenderer.items[0].playlistSidebarPrimaryInfoRenderer
        const sidebar = ytInitialData.sidebar?.playlistSidebarRenderer?.items;

        if (sidebar && sidebar.length > 0) {
          const primaryInfo = sidebar[0]?.playlistSidebarPrimaryInfoRenderer;

          // Get description
          if (primaryInfo?.description?.simpleText) {
            description = primaryInfo.description.simpleText;
            console.log(
              `  ✓ Description: ${String(description).substring(0, Math.min(60, String(description).length))}...`,
            );
          }

          // Get thumbnail (playlist cover art)
          if (
            primaryInfo?.thumbnailRenderer?.playlistVideoThumbnailRenderer
              ?.thumbnail?.thumbnails
          ) {
            const thumbnails =
              primaryInfo.thumbnailRenderer.playlistVideoThumbnailRenderer
                .thumbnail.thumbnails;
            // Get the highest quality thumbnail (last one in the array)
            thumbnailUrl = thumbnails[thumbnails.length - 1]?.url;
            console.log(`  ✓ Found playlist cover art thumbnail`);
          }
        }

        // Alternative path for thumbnails
        if (!thumbnailUrl) {
          const header = ytInitialData.header?.playlistHeaderRenderer;
          if (
            header?.playlistHeaderBanner?.heroPlaylistThumbnailRenderer
              ?.thumbnail?.thumbnails
          ) {
            const thumbnails =
              header.playlistHeaderBanner.heroPlaylistThumbnailRenderer
                .thumbnail.thumbnails;
            thumbnailUrl = thumbnails[thumbnails.length - 1]?.url;
            console.log(`  ✓ Found playlist header thumbnail`);
          }
        }

        // Another alternative for microformat (most reliable for cover art)
        if (!thumbnailUrl) {
          const microformat =
            ytInitialData.microformat?.microformatDataRenderer;
          if (microformat?.thumbnail?.thumbnails) {
            const thumbnails = microformat.thumbnail.thumbnails;
            thumbnailUrl = thumbnails[thumbnails.length - 1]?.url;
            console.log(`  ✓ Found microformat thumbnail`);
          }
        }
      } catch (navError) {
        console.log(`  ✗ Error navigating ytInitialData: ${navError.message}`);
      }
    }

    // Fallback to og:image if ytInitialData parsing failed
    if (!thumbnailUrl) {
      const ogImageMatch = html.match(
        /<meta property="og:image" content="([^"]+)"/,
      );
      if (ogImageMatch) {
        thumbnailUrl = ogImageMatch[1];
        console.log(`  ✓ Fallback to og:image thumbnail`);
      }
    }

    // Fallback to meta description if ytInitialData parsing failed
    if (!description) {
      const descMatch = html.match(
        /<meta property="og:description" content="([^"]+)"/,
      );
      if (descMatch) {
        // Decode HTML entities in the correct order to prevent double-unescaping
        // Replace &amp; last since other entities may contain it
        description = descMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
        console.log(`  ✓ Fallback to meta description`);
      }
    }

    let localThumbnailPath = null;

    // Download and cache the thumbnail
    if (thumbnailUrl) {
      try {
        // Handle protocol-relative URLs
        if (thumbnailUrl.startsWith("//")) {
          thumbnailUrl = "https:" + thumbnailUrl;
        }

        const imgResponse = await fetch(thumbnailUrl);
        if (imgResponse.ok) {
          const imageBuffer = Buffer.from(await imgResponse.arrayBuffer());

          // Determine file extension from URL or content-type
          let ext = "jpg";
          if (thumbnailUrl.includes(".jpg") || thumbnailUrl.includes("jpeg")) {
            ext = "jpg";
          } else if (thumbnailUrl.includes(".webp")) {
            ext = "webp";
          } else if (thumbnailUrl.includes(".png")) {
            ext = "png";
          }

          // Save to static/img/playlists/
          const playlistsDir = path.join(
            __dirname,
            "..",
            "static",
            "img",
            "playlists",
          );
          if (!fs.existsSync(playlistsDir)) {
            fs.mkdirSync(playlistsDir, { recursive: true });
          }

          const filename = `${playlistId}.${ext}`;
          const imagePath = path.join(playlistsDir, filename);
          fs.writeFileSync(imagePath, imageBuffer);

          localThumbnailPath = `/img/playlists/${filename}`;
          console.log(`  ✓ Thumbnail cached locally`);
        }
      } catch (imgError) {
        console.log(`  ✗ Failed to download thumbnail: ${imgError.message}`);
      }
    }

    return {
      id: playlistId,
      title,
      thumbnailUrl: localThumbnailPath || thumbnailUrl,
      description: description || "",
      playlistUrl,
    };
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);

    // Return minimal data if fetch fails
    return {
      id: playlistId,
      title,
      thumbnailUrl: null,
      description: "",
      playlistUrl,
    };
  }
}

async function main() {
  console.log("Fetching playlist metadata from YouTube...\n");

  const metadata = [];

  for (const playlist of PLAYLISTS) {
    const data = await fetchPlaylistMetadata(playlist.id, playlist.title);
    metadata.push(data);

    // Be nice to YouTube's servers - add delay between requests
    await new Promise((resolve) =>
      setTimeout(resolve, YOUTUBE_REQUEST_DELAY_MS),
    );
  }

  // Save metadata to a JSON file
  const metadataPath = path.join(
    __dirname,
    "..",
    "static",
    "data",
    "playlist-metadata.json",
  );

  const dataDir = path.dirname(metadataPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`\n✓ Metadata saved to ${metadataPath}`);
  console.log(`✓ Processed ${metadata.length} playlists`);

  const successCount = metadata.filter(
    (m) => m.thumbnailUrl && m.thumbnailUrl.startsWith("/img/"),
  ).length;
  const descCount = metadata.filter((m) => m.description).length;
  console.log(`✓ ${successCount} thumbnails cached locally`);
  console.log(`✓ ${descCount} descriptions fetched`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchPlaylistMetadata };
