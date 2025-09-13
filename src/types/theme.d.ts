declare module "@theme/useStoredFeed" {
  interface FeedItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
    content: string;
  }

  interface FeedData {
    items: FeedItem[];
    title?: string;
    description?: string;
    link?: string;
  }

  function useStoredFeed(key: string): FeedData | null;
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
