/**
 * Type declaration for the SBOM attestation frontend data file.
 *
 * static/data/sbom-attestations-frontend.json is generated at CI time by
 * scripts/fetch-github-sbom.js. It has the same schema as
 * sbom-attestations.json but is optimized for client-side consumption.
 */

declare module "@site/static/data/sbom-attestations-frontend.json" {
  import type { SbomAttestationsData } from "@site/src/types/sbom";
  const data: SbomAttestationsData;
  export default data;
}
