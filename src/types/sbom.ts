/**
 * TypeScript interfaces for the SBOM attestation cache.
 * Written to static/data/sbom-attestations.json by scripts/fetch-github-sbom.js
 * and consumed by ImagesCatalog.tsx and FeedItems.tsx.
 */

export interface AttestationResult {
  /**
   * Whether a SLSA provenance attestation was found for this image.
   * false = no attestation published (the command will fail if run).
   */
  present: boolean;
  /**
   * Whether the attestation passed cosign signature verification.
   * false with present:true = attestation exists but verification failed.
   * false with present:false = attestation does not exist.
   */
  verified: boolean;
  /** SLSA predicate type URI, populated when present:true */
  predicateType: string | null;
  /** SLSA type URL used during verification */
  slsaType: string;
  /** Human-readable error string when present:false or verified:false */
  error: string | null;
}

export interface SbomRelease {
  /** The GHCR stream-prefixed tag e.g. stable-20260331 */
  tag: string;
  /** Full image reference used for verification */
  imageRef: string;
  /** OCI digest (sha256:...) if available */
  digest: string | null;
  attestation: AttestationResult;
  /** ISO-8601 timestamp when this entry was last checked */
  checkedAt: string;
}

export interface SbomStream {
  id: string;
  label: string;
  org: string;
  package: string;
  streamPrefix: string;
  keyRepo: string;
  keyless: boolean;
  /**
   * Map of cache key → release attestation result.
   * Cache keys match the format produced by extractReleaseTag() in FeedItems.tsx:
   *   stable-YYYYMMDD, gts-YYYYMMDD, lts-YYYYMMDD, etc.
   */
  releases: Record<string, SbomRelease>;
}

export interface SbomAttestationsData {
  /** ISO-8601 timestamp when the cache was generated, or null for the seed file */
  generatedAt: string | null;
  lookbackDays?: number;
  maxReleasesPerStream?: number;
  /** Map of stream id → stream attestation data */
  streams: Record<string, SbomStream>;
}
