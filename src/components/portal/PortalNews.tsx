import React, { useState, useEffect } from "react";
import styles from "./PortalNews.module.css";
import {
  NEWS_METADATA,
  FALLBACK_NEWS_POSTS,
  type BlogPost,
} from "./portalStaticData";

export type { BlogPost };

export interface PortalNewsProps {
  feedUrl?: string;
  perPage?: number;
  initialPosts?: BlogPost[];
  fallbackPosts?: readonly BlogPost[];
  initialLoading?: boolean;
  viewAllUrl?: string;
  viewAllLabel?: string;
}

interface XmlNodeLike {
  textContent?: string | null;
  getAttribute?: (name: string) => string | null;
  getElementsByTagName: (tagName: string) => ArrayLike<XmlNodeLike>;
}

function getFirstElement(
  parent: { getElementsByTagName: (tagName: string) => ArrayLike<XmlNodeLike> },
  tagName: string,
): XmlNodeLike | null {
  return parent.getElementsByTagName(tagName)[0] ?? null;
}

function getTextContent(
  parent: { getElementsByTagName: (tagName: string) => ArrayLike<XmlNodeLike> },
  tagName: string,
): string {
  return getFirstElement(parent, tagName)?.textContent?.trim() ?? "";
}

function getAttribute(
  parent: { getElementsByTagName: (tagName: string) => ArrayLike<XmlNodeLike> },
  tagName: string,
  name: string,
): string {
  return getFirstElement(parent, tagName)?.getAttribute?.(name) ?? "";
}

export function formatFeedDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function cleanDescription(text: string): string {
  if (!text) return "";
  let clean = text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
  clean = clean.replace(
    /<\/(p|div|h[1-6]|li|tr|table|article|section)>/gi,
    " ",
  );
  clean = clean.replace(/<(br|hr)\s*\/?>/gi, " ");
  clean = clean.replace(/<[^>]*>/g, "");
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  return clean.replace(/\s+/g, " ").trim();
}

export function parseAtomFeedRegex(xmlText: string): BlogPost[] {
  const posts: BlogPost[] = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[1];

    const titleMatch =
      /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i.exec(
        entryXml,
      );
    const title = titleMatch ? cleanDescription(titleMatch[1]) : "Untitled";

    const linkMatch = /<link[^>]*href=["']([^"']+)["']/i.exec(entryXml);
    const link = linkMatch ? linkMatch[1] : "#";

    const pubMatch =
      /<(?:published|updated)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:published|updated)>/i.exec(
        entryXml,
      );
    const pubDate = pubMatch ? pubMatch[1].trim() : "";

    const summaryMatch =
      /<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i.exec(
        entryXml,
      );
    const contentMatch =
      /<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i.exec(
        entryXml,
      );
    const rawDescription = summaryMatch
      ? summaryMatch[1]
      : contentMatch
        ? contentMatch[1]
        : "";

    posts.push({
      title,
      link,
      description: cleanDescription(rawDescription),
      pubDate,
      formattedDate: formatFeedDate(pubDate),
    });
  }

  return posts;
}

export function parseAtomFeed(xmlText: string): BlogPost[] {
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const hasParserError =
        xmlDoc.documentElement?.nodeName === "parsererror" ||
        xmlDoc.getElementsByTagName("parsererror").length > 0;

      if (!hasParserError) {
        const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
        if (entries.length > 0) {
          return entries.map((entry) => {
            const published =
              getTextContent(entry, "published") ||
              getTextContent(entry, "updated");
            const link = getAttribute(entry, "link", "href") || "#";
            const rawDescription =
              getTextContent(entry, "summary") ||
              getTextContent(entry, "content");

            return {
              title: getTextContent(entry, "title") || "Untitled",
              link,
              description: cleanDescription(rawDescription),
              pubDate: published,
              formattedDate: formatFeedDate(published),
            };
          });
        }
      }
    } catch {
      // Fall through to regex parser
    }
  }

  return parseAtomFeedRegex(xmlText);
}

export default function PortalNews({
  feedUrl = NEWS_METADATA.feedUrl,
  perPage = 5,
  initialPosts,
  fallbackPosts = FALLBACK_NEWS_POSTS,
  initialLoading,
  viewAllUrl = NEWS_METADATA.viewAllUrl,
  viewAllLabel = NEWS_METADATA.viewAllLabel,
}: PortalNewsProps): React.JSX.Element {
  const isServer = typeof window === "undefined";
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    if (initialPosts !== undefined) return initialPosts;
    return isServer ? fallbackPosts.slice(0, perPage) : [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoading !== undefined) return initialLoading;
    if (initialPosts !== undefined) return false;
    return !isServer;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosts !== undefined) return;

    let isMounted = true;

    async function fetchFeed() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(feedUrl, {
          mode: "cors",
          headers: {
            Accept: "application/atom+xml, application/xml, text/xml",
          },
        });

        if (response.ok) {
          const xmlText = await response.text();
          const parsedPosts = parseAtomFeed(xmlText);
          if (isMounted) {
            setPosts(parsedPosts.slice(0, perPage));
          }
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (err) {
        console.warn("Failed to fetch live feed, using fallback:", err);
        if (isMounted) {
          setPosts(fallbackPosts.slice(0, perPage));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchFeed();

    return () => {
      isMounted = false;
    };
  }, [feedUrl, perPage, initialPosts, fallbackPosts]);

  const viewAllHref =
    viewAllUrl ??
    (feedUrl.endsWith("/atom.xml")
      ? feedUrl.replace(/\/atom\.xml$/, "")
      : "/blog");

  return (
    <section
      id="scene-news"
      aria-label="Latest News"
      className={styles.newsSection}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.tag}>
              <strong>{NEWS_METADATA.tag}</strong>
            </div>
            <h2 className={styles.title}>{NEWS_METADATA.title}</h2>
          </div>

          <div className={`${styles.rssFeed} rss-feed`}>
            {loading ? (
              <div className={`${styles.loading} loading`}>
                <p>{NEWS_METADATA.loadingText}</p>
              </div>
            ) : error ? (
              <div className={`${styles.error} error`}>
                <p>{error}</p>
              </div>
            ) : posts.length === 0 ? (
              <div className={`${styles.noPosts} no-posts`}>
                <p>{NEWS_METADATA.noPostsText}</p>
              </div>
            ) : (
              <div className={`${styles.postsList} posts-list`}>
                {posts.map((post) => (
                  <article
                    key={post.link || post.title}
                    className={`${styles.blogPost} blog-post`}
                  >
                    <div className={`${styles.postContent} post-content`}>
                      <div className={`${styles.postText} post-text`}>
                        <header className={`${styles.postHeader} post-header`}>
                          <h3 className={`${styles.postTitle} post-title`}>
                            <a
                              href={post.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {post.title}
                            </a>
                          </h3>
                          {post.formattedDate && (
                            <time
                              className={`${styles.postDate} post-date`}
                              dateTime={post.pubDate}
                            >
                              {post.formattedDate}
                            </time>
                          )}
                        </header>
                        {post.description && (
                          <div
                            className={`${styles.postDescription} post-description`}
                          >
                            <p>{post.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                <div className={`${styles.feedSource} feed-source`}>
                  <p className={`${styles.sourceText} source-text`}>
                    <a
                      href={viewAllHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {viewAllLabel}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
