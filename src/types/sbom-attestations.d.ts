/**
 * Type declaration for the SBOM attestation cache data file.
 *
 * static/data/sbom-attestations.json is generated at CI time by
 * scripts/fetch-github-sbom.js and restored from GitHub Actions cache before
 * the build runs. It is gitignored and will not exist during local `tsc`
 * typechecks — this ambient declaration satisfies the compiler without
 * requiring the file to be present on disk.
 */

declare module "@site/static/data/sbom-attestations.json" {
  import type { SbomAttestationsData } from "@site/src/types/sbom";
  const data: SbomAttestationsData;
  export default data;
}
