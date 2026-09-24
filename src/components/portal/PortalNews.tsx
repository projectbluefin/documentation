import React, { useState, useEffect } from "react";
import blogIndexData from "@site/static/data/blog-posts.json";
import styles from "./PortalNews.module.css";
import { NEWS_METADATA, type BlogPost } from "./portalStaticData";

export type { BlogPost };

export interface BlogIndex {
  readonly posts?: readonly Partial<BlogPost>[];
  readonly unavailable?: boolean;
  readonly stateReason?: string;
}

export interface NormalizedBlogIndex {
  readonly posts: BlogPost[];
  readonly unavailable: boolean;
  readonly stateReason?: string;
}

/**
 * Normalize the build-time blog index while preserving availability state and reasons.
 *
 * They are the server-rendered content of this section and the standing answer
 * when the live feed does not come back: every entry is a post that exists, so
 * a reader without JavaScript — or with a failed fetch — still gets the real
 * blog rather than a placeholder.
 */
export function normalizeBlogIndex(
  index?: BlogIndex | null,
): NormalizedBlogIndex {
  if (!index) {
    return { posts: [], unavailable: false };
  }

  const rawPosts = Array.isArray(index.posts) ? index.posts : [];
  const posts: BlogPost[] = rawPosts
    .filter(
      (post): post is Partial<BlogPost> & { title: string; link: string } =>
        Boolean(post?.title && post?.link),
    )
    .map((post) => ({
      title: post.title ?? "",
      link: post.link ?? "",
      description: post.description ?? "",
      pubDate: post.pubDate ?? "",
      formattedDate: post.formattedDate ?? "",
    }));

  const isUnavailable = Boolean(index.unavailable);
  return {
    posts: isUnavailable ? [] : posts,
    unavailable: isUnavailable,
    stateReason: index.stateReason,
  };
}

export const LOCAL_NEWS_INDEX: NormalizedBlogIndex = normalizeBlogIndex(
  blogIndexData as BlogIndex,
);

export const LOCAL_NEWS_POSTS: readonly BlogPost[] = LOCAL_NEWS_INDEX.posts;

export interface PortalNewsProps {
  feedUrl?: string;
  perPage?: number;
  initialPosts?: BlogPost[];
  fallbackIndex?: BlogIndex;
  fallbackPosts?: readonly BlogPost[];
  fallbackReason?: string;
  fallbackUnavailable?: boolean;
  initialLoading?: boolean;
  initialError?: string | null;
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
  fallbackIndex,
  fallbackPosts,
  fallbackReason,
  fallbackUnavailable,
  initialLoading,
  initialError,
  viewAllUrl = NEWS_METADATA.viewAllUrl,
  viewAllLabel = NEWS_METADATA.viewAllLabel,
}: PortalNewsProps): React.JSX.Element {
  const resolvedIndex = fallbackIndex
    ? normalizeBlogIndex(fallbackIndex)
    : LOCAL_NEWS_INDEX;
  const effectiveFallbackPosts =
    fallbackPosts ?? (fallbackIndex ? resolvedIndex.posts : LOCAL_NEWS_POSTS);
  const effectiveFallbackReason =
    fallbackReason ?? (fallbackPosts ? undefined : resolvedIndex.stateReason);
  const effectiveFallbackUnavailable =
    fallbackUnavailable ?? (fallbackPosts ? false : resolvedIndex.unavailable);

  // The build-time index is the same on the server and in the browser, so the
  // first client render matches the server markup instead of blanking the
  // section while the feed request is in flight.
  const seedPosts = effectiveFallbackPosts.slice(0, perPage);
  const [posts, setPosts] = useState<BlogPost[]>(
    () => initialPosts ?? seedPosts,
  );

  // Start with loading=false whichever side renders: the server has no
  // window and the client must produce the same first markup, so an empty
  // index renders "no posts" (or unavailable reason) on both until the effect
  // flips the state. A window check here causes a hydration mismatch.
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoading !== undefined) return initialLoading;
    return false;
  });

  const [error, setError] = useState<string | null>(() => {
    if (initialError !== undefined) return initialError;
    if (initialPosts !== undefined) return null;
    if (
      seedPosts.length === 0 &&
      (effectiveFallbackUnavailable || effectiveFallbackReason)
    ) {
      const reasonSuffix = effectiveFallbackReason
        ? ` (${effectiveFallbackReason}).`
        : ".";
      return `${NEWS_METADATA.unavailableText}${reasonSuffix}`;
    }
    return null;
  });

  useEffect(() => {
    if (initialPosts !== undefined) return;

    let isMounted = true;

    async function fetchFeed() {
      if (seedPosts.length === 0 && !error) {
        setLoading(true);
      }
      setError((prev) => {
        // Clear transient error when re-fetching unless index is permanently unavailable
        if (effectiveFallbackUnavailable || effectiveFallbackReason) {
          return prev;
        }
        return null;
      });

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
          if (!isMounted) return;

          if (parsedPosts.length > 0) {
            setPosts(parsedPosts.slice(0, perPage));
            setError(null);
          } else {
            // An empty feed arrived. If local index was unavailable or has an
            // explicit reason, surface that unavailability rather than generic empty.
            if (effectiveFallbackUnavailable || effectiveFallbackReason) {
              const reasonSuffix = effectiveFallbackReason
                ? ` (${effectiveFallbackReason}).`
                : ".";
              setError(`${NEWS_METADATA.unavailableText}${reasonSuffix}`);
            } else if (seedPosts.length > 0) {
              // Keep seed posts if they exist
              setError(null);
            } else {
              setError(null);
            }
          }
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (err) {
        console.warn("Failed to fetch live feed, using fallback:", err);
        if (!isMounted) return;

        const localPosts = effectiveFallbackPosts.slice(0, perPage);
        setPosts(localPosts);
        // Unavailability is visible, with its reason: a section that quietly
        // renders nothing is indistinguishable from a blog with no posts.
        if (localPosts.length === 0) {
          const fetchErr = err instanceof Error ? err.message : String(err);
          const reason = effectiveFallbackReason || fetchErr;
          setError(`${NEWS_METADATA.unavailableText} (${reason}).`);
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
  }, [
    feedUrl,
    perPage,
    initialPosts,
    effectiveFallbackPosts,
    effectiveFallbackReason,
    effectiveFallbackUnavailable,
    seedPosts.length,
    error,
  ]);

  const viewAllHref =
    viewAllUrl ??
    (feedUrl.endsWith("/atom.xml")
      ? feedUrl.replace(/\/atom\.xml$/, "")
      : "/blog");

  const isExternalViewAll = /^https?:\/\//.test(viewAllHref);

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
                <p role="alert">{error}</p>
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
              </div>
            )}

            {/* The way to the blog stays on the page in every state — a failed
                feed is the moment a reader most needs the link. */}
            <div className={`${styles.feedSource} feed-source`}>
              <p className={`${styles.sourceText} source-text`}>
                <a
                  href={viewAllHref}
                  {...(isExternalViewAll
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {viewAllLabel}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
