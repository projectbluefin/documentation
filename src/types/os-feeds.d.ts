/**
 * Ambient module declarations for OS release feed JSON files.
 *
 * These files live in static/feeds/ and are committed to the repo
 * (unlike gitignored data/ files). The declarations are needed because
 * Docusaurus uses @site path aliases which TypeScript does not resolve
 * without explicit module declarations.
 */

declare module "@site/static/feeds/bluefin-releases.json" {
  import type { OsFeedData } from "@site/src/types/os-feed";
  const data: OsFeedData;
  export default data;
}

declare module "@site/static/feeds/bluefin-lts-releases.json" {
  import type { OsFeedData } from "@site/src/types/os-feed";
  const data: OsFeedData;
  export default data;
}
