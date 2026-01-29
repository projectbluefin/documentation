import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";
import {
  PACKAGE_PATTERNS,
  extractVersionChange,
} from "../config/packageConfig";

interface FeedItemsProps {
  feedId: string;
  title: string;
  maxItems?: number;
  showDescription?: boolean;
  filter?: (item: FeedItem) => boolean;
}

interface VersionChange {
  name: string;
  change: string;
}

// Local type definitions that match src/types/theme.d.ts
// These must be kept in sync with the module declaration
interface FeedItem {
  title: string;
  link:
    | string
    | { href?: string }
    | Array<{
        href?: string;
        rel?: string;
        $?: { href?: string; type?: string };
      }>;
  description?: string;
  pubDate?: string;
  updated?: string;
  guid?: string;
  id?: string;
  author?: string | { name?: string };
  content?: { value?: string } | string;
}

interface ParsedFeed {
  // RSS feed structure
  rss?: {
    channel?: {
      item?: FeedItem | FeedItem[];
    };
  };
  // Alternative RSS structure
  channel?: {
    item?: FeedItem | FeedItem[];
  };
  // Atom feed structure
  feed?: {
    entry?: FeedItem | FeedItem[];
  };
}

// Helper function to format date in long form
const formatLongDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Helper function to extract key version changes from changelog content
const extractVersionSummary = (content: string): VersionChange[] => {
  const changes: VersionChange[] = [];

  if (!content) return changes;

  // Use centralized package configuration
  for (const packageConfig of PACKAGE_PATTERNS) {
    const versionChange = extractVersionChange(content, packageConfig);
    if (versionChange) {
      changes.push(versionChange);
    }
  }

  return changes;
};

// Helper function to determine if a feed should show executive summaries
const isReleaseFeed = (feedId: string): boolean => {
  return feedId === "bluefinReleases" || feedId === "bluefinLtsReleases";
};

// Helper function to format release titles for better readability
const formatReleaseTitle = (title: string, feedId: string): string => {
  if (feedId === "bluefinLtsReleases") {
    // For LTS releases: Remove "bluefin-lts LTS: " or "Bluefin LTS: " prefix
    // Example: "bluefin-lts LTS: 20250910 (c10s, #cfd65ad)" -> "20250910 (c10s, #cfd65ad)"
    // Example: "Bluefin LTS: 20250808 (c10s)" -> "20250808 (c10s)"
    return title.replace(/^(bluefin-lts|Bluefin) LTS: /, "");
  } else if (feedId === "bluefinReleases") {
    // For stable releases: Remove "stable-" prefix and ": Stable" text, simplify Fedora version
    // Example: "stable-20250907: Stable (F42.20250907, #921e6ba)" -> "20250907 (F42 #921e6ba)"
    if (title.startsWith("stable-")) {
      return title.replace(
        /^stable-([^:]+): Stable \(F(\d+)\.\d+, (#[^)]+)\)$/,
        "$1 (F$2 $3)",
      );
    }
    // For GTS releases: Remove "gts-" prefix and ": Gts" text, simplify Fedora version
    // Example: "gts-20250907: Gts (F41.20250907, #921e6ba)" -> "20250907 (F41 #921e6ba)"
    else if (title.startsWith("gts-")) {
      return title.replace(
        /^gts-([^:]+): Gts \(F(\d+)\.\d+, (#[^)]+)\)$/,
        "$1 (F$2 $3)",
      );
    }
  }

  // Return original title if no formatting rules apply
  return title;
};

const FeedItems: React.FC<FeedItemsProps> = ({
  feedId,
  title,
  maxItems = 5,
  showDescription = false,
  filter,
}) => {
  try {
    const feedData: ParsedFeed = useStoredFeed(feedId);

    // Handle different RSS/Atom feed structures
    let items: FeedItem[] = [];

    if (feedData?.rss?.channel?.item) {
      items = Array.isArray(feedData.rss.channel.item)
        ? feedData.rss.channel.item
        : [feedData.rss.channel.item];
    } else if (feedData?.channel?.item) {
      items = Array.isArray(feedData.channel.item)
        ? feedData.channel.item
        : [feedData.channel.item];
    } else if (feedData?.feed?.entry) {
      items = Array.isArray(feedData.feed.entry)
        ? feedData.feed.entry
        : [feedData.feed.entry];
    }

    // Apply filter if provided
    if (filter) {
      items = items.filter(filter);
    }

    // Limit items to maxItems
    const displayItems = items.slice(0, maxItems);

    if (displayItems.length === 0) {
      return (
        <div className={styles.feedContainer}>
          <h3 className={styles.feedTitle}>{title}</h3>
          <p className={styles.noItems}>No items available</p>
        </div>
      );
    }

    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <ul className={styles.feedList}>
          {displayItems.map((item, index) => {
            // Extract values handling both RSS and Atom formats
            let itemLink = "";

            // First try to get link from the link field
            if (typeof item.link === "string" && item.link) {
              itemLink = item.link;
            } else if (item.link && typeof item.link === "object") {
              // Handle Atom link structure - could be an array or object
              if (Array.isArray(item.link)) {
                // For GitHub Atom feeds, look for type="text/html" first, then fall back to rel="alternate"
                const htmlLink =
                  item.link.find((l) => l.$ && l.$.type === "text/html") ||
                  item.link.find((l) => l.rel === "alternate") ||
                  item.link[0];
                itemLink = htmlLink?.href || htmlLink?.$.href || "";
              } else {
                itemLink = item.link.href || "";
              }
            }

            // If no link found, try to construct it from GitHub Atom feed ID format
            if (!itemLink && item.id && typeof item.id === "string") {
              // GitHub Atom feed IDs look like: "tag:github.com,2008:Repository/611397346/stable-20250907"
              const idMatch = item.id.match(
                /^tag:github\.com,\d+:Repository\/(\d+)\/(.+)$/,
              );
              if (idMatch) {
                const [, repoId, tag] = idMatch;
                // For GitHub releases, we need to determine the repo name from the feedId
                if (feedId === "bluefinReleases") {
                  itemLink = `https://github.com/ublue-os/bluefin/releases/tag/${tag}`;
                } else if (feedId === "bluefinLtsReleases") {
                  itemLink = `https://github.com/ublue-os/bluefin-lts/releases/tag/${tag}`;
                }
              } else {
                // Try to match GitHub Discussion IDs
                // Format: "tag:github.com,2008:Discussion/12345"
                const discussionMatch = item.id.match(
                  /^tag:github\.com,\d+:Discussion\/(\d+)$/,
                );

                if (discussionMatch) {
                  const [, discussionId] = discussionMatch;
                  if (
                    feedId === "bluefinDiscussions" ||
                    feedId === "bluefinAnnouncements"
                  ) {
                    itemLink = `https://github.com/ublue-os/bluefin/discussions/${discussionId}`;
                  }
                }
              }
            }

            const itemDate = item.pubDate || item.updated;
            const itemAuthor =
              typeof item.author === "string" ? item.author : item.author?.name;

            // No individual authors displayed for release feeds - moved to section level
            const itemDescription =
              item.description ||
              (typeof item.content === "object"
                ? item.content?.value
                : item.content);
            const itemId = item.guid || item.id || itemLink || index;

            // Extract executive summary for release feeds
            const versionSummary =
              isReleaseFeed(feedId) && itemDescription
                ? extractVersionSummary(itemDescription)
                : [];

            // Format the title for better readability
            const displayTitle = formatReleaseTitle(item.title, feedId);

            return (
              <li key={itemId} className={styles.feedItem}>
                {itemLink ? (
                  <a
                    href={itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.feedItemLink}
                  >
                    <div className={styles.feedItemContent}>
                      <h4 className={styles.feedItemTitle}>{displayTitle}</h4>
                      {itemDate && (
                        <time className={styles.feedItemDate}>
                          {formatLongDate(itemDate)}
                        </time>
                      )}
                      {versionSummary.length > 0 && (
                        <ul className={styles.executiveSummary}>
                          {versionSummary.map((change) => (
                            <li
                              key={change.name}
                              className={styles.versionChange}
                            >
                              <strong>{change.name}:</strong> {change.change}
                            </li>
                          ))}
                        </ul>
                      )}
                      {showDescription && itemDescription && (
                        <div
                          className={styles.feedItemDescription}
                          dangerouslySetInnerHTML={{ __html: itemDescription }}
                        />
                      )}
                    </div>
                  </a>
                ) : (
                  <div className={styles.feedItemContent}>
                    <h4 className={styles.feedItemTitle}>{displayTitle}</h4>
                    {itemDate && (
                      <time className={styles.feedItemDate}>
                        {formatLongDate(itemDate)}
                      </time>
                    )}
                    {versionSummary.length > 0 && (
                      <ul className={styles.executiveSummary}>
                        {versionSummary.map((change) => (
                          <li
                            key={change.name}
                            className={styles.versionChange}
                          >
                            <strong>{change.name}:</strong> {change.change}
                          </li>
                        ))}
                      </ul>
                    )}
                    {showDescription && itemDescription && (
                      <div
                        className={styles.feedItemDescription}
                        dangerouslySetInnerHTML={{ __html: itemDescription }}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  } catch (error) {
    console.error(`Error loading feed ${feedId}:`, error);
    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <p className={styles.error}>Error loading feed data</p>
      </div>
    );
  }
};

export default FeedItems;
