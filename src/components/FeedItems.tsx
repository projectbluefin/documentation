import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";

interface FeedItemsProps {
  feedId: string;
  title: string;
  maxItems?: number;
  showDescription?: boolean;
}

interface FeedItem {
  title: string;
  link: string | { href?: string } | Array<{ href?: string; rel?: string }>;
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
              const idMatch = item.id.match(/^tag:github\.com,\d+:Repository\/(\d+)\/(.+)$/);
              if (idMatch) {
                const [, repoId, tag] = idMatch;
                // For GitHub releases, we need to determine the repo name from the feedId
                if (feedId === "bluefinReleases") {
                  itemLink = `https://github.com/ublue-os/bluefin/releases/tag/${tag}`;
                } else if (feedId === "bluefinLtsReleases") {
                  itemLink = `https://github.com/ublue-os/bluefin-lts/releases/tag/${tag}`;
                } else if (feedId === "bluefinDiscussions" || feedId === "bluefinAnnouncements") {
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
