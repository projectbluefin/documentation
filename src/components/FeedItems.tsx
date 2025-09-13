import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";

interface FeedItemsProps {
  feedId: string;
  title: string;
  maxItems?: number;
  showDescription?: boolean;
}

interface VersionChange {
  name: string;
  change: string;
}

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
  channel?: {
    item?: FeedItem[];
  };
  rss?: {
    channel?: {
      item?: FeedItem[];
    };
  };
  feed?: {
    entry?: FeedItem[];
  };
}

// Helper function to extract key version changes from changelog content
const extractVersionSummary = (content: string): VersionChange[] => {
  const changes: VersionChange[] = [];

  if (!content) return changes;

  // Look for package version patterns in the HTML table content
  // Pattern: <td><strong>PackageName</strong></td><td>version</td>

  const kernelMatch = content.match(
    /<td><strong>Kernel<\/strong><\/td>\s*<td>([^<]+)/,
  );
  if (kernelMatch) {
    const versionText = kernelMatch[1].trim();
    if (versionText.includes("➡️")) {
      // Extract the upgrade arrow format: "6.14.11-300 ➡️ 6.15.9-201"
      const [fromVersion, toVersion] = versionText
        .split("➡️")
        .map((v) => v.trim());
      changes.push({ name: "Kernel", change: `${fromVersion} → ${toVersion}` });
    } else if (versionText && versionText !== "N/A") {
      // Just show the current version if no upgrade arrow
      changes.push({ name: "Kernel", change: versionText });
    }
  }

  const mesaMatch = content.match(
    /<td><strong>Mesa<\/strong><\/td>\s*<td>([^<]+)/,
  );
  if (mesaMatch) {
    const versionText = mesaMatch[1].trim();
    if (versionText.includes("➡️")) {
      const [fromVersion, toVersion] = versionText
        .split("➡️")
        .map((v) => v.trim());
      changes.push({ name: "Mesa", change: `${fromVersion} → ${toVersion}` });
    } else if (versionText && versionText !== "N/A") {
      changes.push({ name: "Mesa", change: versionText });
    }
  }

  const nvidiaMatch = content.match(
    /<td><strong>Nvidia<\/strong><\/td>\s*<td>([^<]+)/,
  );
  if (nvidiaMatch) {
    const versionText = nvidiaMatch[1].trim();
    if (versionText.includes("➡️")) {
      const [fromVersion, toVersion] = versionText
        .split("➡️")
        .map((v) => v.trim());
      changes.push({ name: "NVIDIA", change: `${fromVersion} → ${toVersion}` });
    } else if (versionText && versionText !== "N/A") {
      changes.push({ name: "NVIDIA", change: versionText });
    }
  }

  const gnomeMatch = content.match(
    /<td><strong>Gnome<\/strong><\/td>\s*<td>([^<]+)/,
  );
  if (gnomeMatch) {
    const versionText = gnomeMatch[1].trim();
    if (versionText.includes("➡️")) {
      const [fromVersion, toVersion] = versionText
        .split("➡️")
        .map((v) => v.trim());
      changes.push({ name: "GNOME", change: `${fromVersion} → ${toVersion}` });
    } else if (versionText && versionText !== "N/A") {
      // Only show GNOME version if it's a significant update or if there are upgrades
      if (
        versionText.includes("47.") ||
        versionText.includes("48.") ||
        versionText.includes("46.")
      ) {
        changes.push({ name: "GNOME", change: versionText });
      }
    }
  }

  return changes;
};

// Helper function to determine if a feed should show executive summaries
const isReleaseFeed = (feedId: string): boolean => {
  return feedId === "bluefinReleases" || feedId === "bluefinLtsReleases";
};

const FeedItems: React.FC<FeedItemsProps> = ({
  feedId,
  title,
  maxItems = 5,
  showDescription = false,
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
                } else if (
                  feedId === "bluefinDiscussions" ||
                  feedId === "bluefinAnnouncements"
                ) {
                  // For discussions, the ID format might be different, but we'll try
                  itemLink = `https://github.com/ublue-os/bluefin/discussions/${tag}`;
                }
              }
            }

            const itemDate = item.pubDate || item.updated;
            const itemAuthor =
              typeof item.author === "string" ? item.author : item.author?.name;
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
                      <h4 className={styles.feedItemTitle}>{item.title}</h4>
                      {itemDate && (
                        <time className={styles.feedItemDate}>
                          {new Date(itemDate).toLocaleDateString()}
                        </time>
                      )}
                      {itemAuthor && (
                        <span className={styles.feedItemAuthor}>
                          by {itemAuthor}
                        </span>
                      )}
                      {versionSummary.length > 0 && (
                        <div className={styles.executiveSummary}>
                          {versionSummary.map((change, idx) => (
                            <span
                              key={change.name}
                              className={styles.versionChange}
                            >
                              {idx > 0 && " • "}
                              <strong>{change.name}:</strong> {change.change}
                            </span>
                          ))}
                        </div>
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
                    <h4 className={styles.feedItemTitle}>{item.title}</h4>
                    {itemDate && (
                      <time className={styles.feedItemDate}>
                        {new Date(itemDate).toLocaleDateString()}
                      </time>
                    )}
                    {itemAuthor && (
                      <span className={styles.feedItemAuthor}>
                        by {itemAuthor}
                      </span>
                    )}
                    {versionSummary.length > 0 && (
                      <div className={styles.executiveSummary}>
                        {versionSummary.map((change, idx) => (
                          <span
                            key={change.name}
                            className={styles.versionChange}
                          >
                            {idx > 0 && " • "}
                            <strong>{change.name}:</strong> {change.change}
                          </span>
                        ))}
                      </div>
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
