/**
 * SBOM-first data adapter.
 *
 * Single entry point for components that need release, version, or package
 * data. Reads from sbom-attestations-frontend.json and exposes a clean API
 * so that components never import raw JSON directly.
 *
 * Design goals:
 *   1. One canonical import for release data across the site
 *   2. Lazy loading — the 104 KB SBOM payload is parsed on first access
 *   3. Typed interfaces that match what components actually render
 *   4. Adapter layer isolates components from upstream SBOM schema changes
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface PackageVersions {
  kernel?: string | null;
  gnome?: string | null;
  mesa?: string | null;
  podman?: string | null;
  systemd?: string | null;
  [key: string]: string | null | undefined;
}

export interface Attestation {
  present: boolean | null;
  verified: boolean;
  predicateType: string | null;
  slsaType?: string;
  errorKind?: string;
  error: string | null;
}

export interface Release {
  tag: string;
  imageRef: string;
  digest: string | null;
  attestation: Attestation;
  packageVersions: PackageVersions | null;
  checkedAt: string;
}

export interface Stream {
  id: string;
  label: string;
  org: string;
  package: string;
  streamPrefix: string;
  keyRepo: string;
  keyless: boolean;
  releases: Record<string, Release>;
}

export interface SbomData {
  generatedAt: string;
  lookbackDays: number;
  maxReleasesPerStream: number;
  streams: Record<string, Stream>;
}

export interface LatestRelease {
  stream: string;
  tag: string;
  date: string;
  kernel: string;
  gnome: string;
  mesa: string;
  digest: string;
  imageRef: string;
  allVersions: PackageVersions;
}

export interface StreamSummary {
  id: string;
  label: string;
  releaseCount: number;
  latestTag: string | null;
  latestDate: string | null;
}

// ── Lazy loader ──────────────────────────────────────────────────────────────

let _cache: SbomData | null = null;

function load(): SbomData {
  if (_cache) return _cache;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _cache = require("@site/static/data/sbom-attestations-frontend.json") as SbomData;
  return _cache;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Get the raw SBOM data (lazy-loaded). */
export function getSbomData(): SbomData {
  return load();
}

/** List all stream IDs. */
export function getStreamIds(): string[] {
  return Object.keys(load().streams);
}

/** Get a single stream by ID. */
export function getStream(streamId: string): Stream | undefined {
  return load().streams[streamId];
}

/** Get the latest release for a stream. Returns null if stream has no releases. */
export function getLatestRelease(streamId: string): LatestRelease | null {
  const stream = getStream(streamId);
  if (!stream) return null;

  const entries = Object.entries(stream.releases);
  if (entries.length === 0) return null;

  // Releases are ordered newest-first by convention
  const [tag, release] = entries[0];
  const pv = release.packageVersions || {};

  return {
    stream: streamId,
    tag,
    date: release.checkedAt,
    kernel: pv.kernel ?? "unknown",
    gnome: pv.gnome ?? "unknown",
    mesa: pv.mesa ?? "unknown",
    digest: release.digest ?? "unknown",
    imageRef: release.imageRef,
    allVersions: pv,
  };
}

/** Get latest releases for all streams. Streams with no releases are skipped. */
export function getAllLatestReleases(): LatestRelease[] {
  return getStreamIds()
    .map(getLatestRelease)
    .filter((r): r is LatestRelease => r !== null);
}

/** Get a summary of all streams (id, label, release count, latest tag). */
export function getStreamSummaries(): StreamSummary[] {
  const data = load();
  return Object.values(data.streams).map((s) => {
    const tags = Object.keys(s.releases);
    return {
      id: s.id,
      label: s.label,
      releaseCount: tags.length,
      latestTag: tags[0] ?? null,
      latestDate: tags[0] ? s.releases[tags[0]].checkedAt : null,
    };
  });
}

/** Get all releases for a stream, sorted newest-first. */
export function getReleases(streamId: string): Release[] {
  const stream = getStream(streamId);
  if (!stream) return [];
  return Object.values(stream.releases);
}

/** Check SBOM freshness. Returns hours since generation. */
export function getSbomAgeHours(): number {
  const gen = new Date(load().generatedAt);
  return (Date.now() - gen.getTime()) / (1000 * 60 * 60);
}

/**
 * Find which streams contain a specific package version.
 * Useful for "which images ship kernel X.Y.Z?" queries.
 */
export function findStreamsByPackageVersion(
  packageName: string,
  version: string,
): string[] {
  const data = load();
  const matches: string[] = [];
  for (const [streamId, stream] of Object.entries(data.streams)) {
    for (const release of Object.values(stream.releases)) {
      if (release.packageVersions?.[packageName] === version) {
        matches.push(streamId);
        break;
      }
    }
  }
  return matches;
}
