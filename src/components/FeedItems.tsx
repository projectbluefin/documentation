import React from 'react';
import useStoredFeed from '@theme/useStoredFeed';
import styles from './FeedItems.module.css';

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
  showDescription = false 
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
            let itemLink = '';
            if (typeof item.link === 'string') {
              itemLink = item.link;
            } else if (item.link && typeof item.link === 'object') {
              // Handle Atom link structure - could be an array or object
              if (Array.isArray(item.link)) {
                // Find the first link with rel="alternate" or just use the first one
                const alternateLink = item.link.find(l => l.rel === 'alternate') || item.link[0];
                itemLink = alternateLink?.href || '';
              } else {
                itemLink = item.link.href || '';
              }
            }
            
            const itemDate = item.pubDate || item.updated;
            const itemAuthor = typeof item.author === 'string' ? item.author : item.author?.name;
            const itemDescription = item.description || 
              (typeof item.content === 'object' ? item.content?.value : item.content);
            const itemId = item.guid || item.id || itemLink || index;
            
            return (
              <li key={itemId} className={styles.feedItem}>
                <div className={styles.feedItemContent}>
                  <h4 className={styles.feedItemTitle}>
                    {itemLink ? (
                      <a href={itemLink} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      <span>{item.title}</span>
                    )}
                  </h4>
                  {itemDate && (
                    <time className={styles.feedItemDate}>
                      {new Date(itemDate).toLocaleDateString()}
                    </time>
                  )}
                  {itemAuthor && (
                    <span className={styles.feedItemAuthor}>by {itemAuthor}</span>
                  )}
                  {showDescription && itemDescription && (
                    <div 
                      className={styles.feedItemDescription}
                      dangerouslySetInnerHTML={{ __html: itemDescription }}
                    />
                  )}
                </div>
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