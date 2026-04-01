/**
 * Type declaration for the firehose apps data file.
 *
 * static/data/firehose-apps.json is fetched at build time by
 * scripts/fetch-firehose.js from https://castrojo.github.io/bluefin-releases/apps.json
 * and committed as an empty seed {"apps":[],"metadata":{}} to allow builds
 * to succeed before the first fetch.
 *
 * The ambient declaration allows static import of this JSON file from
 * React components without TypeScript errors when the file contains
 * only the seed structure.
 */

declare module "@site/static/data/firehose-apps.json" {
  import type { FirehoseData } from "@site/src/types/firehose";
  const data: FirehoseData;
  export default data;
}
