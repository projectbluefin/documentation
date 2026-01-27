declare module "@theme/useStoredFeed" {
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

  function useStoredFeed(key: string): ParsedFeed | null;
  export default useStoredFeed;
}

declare module "@theme/useStoredData" {
  function useStoredData(key: string): any;
  export default useStoredData;
}

declare module "@theme/useStoredJson" {
  function useStoredJson(key: string): any;
  export default useStoredJson;
}
