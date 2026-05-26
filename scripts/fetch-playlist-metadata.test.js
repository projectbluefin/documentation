const test = require("node:test");
const assert = require("node:assert/strict");

const {
  decodeHtmlEntities,
  extractMetadataFromHtml,
} = require("./fetch-playlist-metadata.js");

test("decodeHtmlEntities decodes the entities used in YouTube meta descriptions", () => {
  assert.equal(
    decodeHtmlEntities("Bluefin &amp; Friends &quot;Live&quot; &#39;26 &lt;beta&gt;"),
    'Bluefin & Friends "Live" \'26 <beta>',
  );
});

test("extractMetadataFromHtml prefers ytInitialData metadata when present", () => {
  const ytInitialData = {
    sidebar: {
      playlistSidebarRenderer: {
        items: [
          {
            playlistSidebarPrimaryInfoRenderer: {
              description: { simpleText: "The canonical Bluefin playlist" },
              thumbnailRenderer: {
                playlistVideoThumbnailRenderer: {
                  thumbnail: {
                    thumbnails: [
                      { url: "https://img.example.com/small.jpg" },
                      { url: "https://img.example.com/large.jpg" },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  };

  const html = `<script>var ytInitialData = ${JSON.stringify(ytInitialData)};</script>`;
  const metadata = extractMetadataFromHtml(html);

  assert.equal(metadata.description, "The canonical Bluefin playlist");
  assert.equal(metadata.thumbnailUrl, "https://img.example.com/large.jpg");
});

test("extractMetadataFromHtml falls back to og tags and decodes entities", () => {
  const html = [
    '<meta property="og:image" content="https://img.example.com/fallback.jpg">',
    '<meta property="og:description" content="Bluefin &amp; Friends &quot;Live&quot;">',
  ].join("\n");
  const metadata = extractMetadataFromHtml(html);

  assert.equal(metadata.thumbnailUrl, "https://img.example.com/fallback.jpg");
  assert.equal(metadata.description, 'Bluefin & Friends "Live"');
});
