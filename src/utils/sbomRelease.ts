/**
 * Utility functions for extracting release data from the SBOM attestation cache.
 *
 * These helpers bridge between RSS feed item titles (which contain release tags
 * like "stable-20260501") and the structured SBOM data that contains package
 * versions, attestation state, and supply chain information.
 */

import type {
  SbomAttestationsData,
  SbomRelease,
  PackageVersions,
} from "../types/sbom";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maps FeedItems feedId to the corresponding SBOM stream key. */
export const SBOM_STREAM_BY_FEED_ID: Record<string, string> = {
  bluefinReleases: "bluefin-stable",
  bluefinLtsReleases: "bluefin-lts",
};

// ─── Tag Extraction ──────────────────────────────────────────────────────────

/**
 * Extract a release tag (e.g. "stable-20260501") from a feed item title.
 * Returns null if no recognizable tag pattern is found.
 */
export const extractReleaseTag = (title: string): string | null => {
  const tagMatch = title.match(
    /(stable-\d{8}|beta-\d{8}|latest-\d{8}|lts[-.]\d{8})/i,
  );
  if (tagMatch) {
    // Normalise lts.YYYYMMDD → lts-YYYYMMDD to match cache key format
    return tagMatch[1].toLowerCase().replace(/^lts\.(\d{8})$/, "lts-$1");
  }

  // LTS feed titles use "bluefin-lts LTS: YYYYMMDD (...)" format — extract date
  const ltsDateMatch = title.match(/\bLTS:\s*(\d{8})\b/i);
  if (ltsDateMatch) return `lts-${ltsDateMatch[1]}`;

  return null;
};

/**
 * Parse a release tag's date component into ISO date format (YYYY-MM-DD).
 */
export const getReleaseDateFromTag = (
  releaseTag: string | null,
): string | null => {
  if (!releaseTag) return null;
  const match = releaseTag.match(/(\d{8})$/);
  if (!match) return null;
  return match[1].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
};

// ─── SBOM Lookup ─────────────────────────────────────────────────────────────

/**
 * Look up an SBOM release entry by feed ID and item title.
 * Returns the SbomRelease if found, or null.
 */
export const getSbomRelease = (
  cache: SbomAttestationsData,
  feedId: string,
  title: string,
): SbomRelease | null => {
  const streamId = SBOM_STREAM_BY_FEED_ID[feedId];
  const cacheKey = extractReleaseTag(title);
  if (!streamId || !cacheKey) return null;

  return cache.streams?.[streamId]?.releases?.[cacheKey] ?? null;
};

/**
 * Get the package versions for a release, or null if not available.
 */
export const getPackageVersions = (
  cache: SbomAttestationsData,
  feedId: string,
  title: string,
): PackageVersions | null => {
  const release = getSbomRelease(cache, feedId, title);
  return release?.packageVersions ?? null;
};

// ─── Supply Chain ────────────────────────────────────────────────────────────

export interface SupplyChainLinks {
  packageTagUrl: string | null;
  attestationVerified: boolean | null;
  attestationPresent: boolean | null;
}

/**
 * Build supply-chain link information for a given release title.
 * Looks up attestation state from the SBOM cache, preferring the stream
 * family that matches the feed (LTS vs non-LTS).
 */
export const getSupplyChainLinks = (
  cache: SbomAttestationsData,
  title: string,
  feedId?: string,
): SupplyChainLinks => {
  const releaseTag = extractReleaseTag(title);

  if (!releaseTag) {
    return {
      packageTagUrl: null,
      attestationVerified: null,
      attestationPresent: null,
    };
  }

  const isLtsFeed = feedId === "bluefinLtsReleases";

  let attestationVerified: boolean | null = null;
  let attestationPresent: boolean | null = null;

  if (cache?.streams) {
    const streamEntries = Object.entries(cache.streams);

    // First pass: only streams that match the feed's LTS/non-LTS family.
    const preferred = streamEntries.filter(([key]) =>
      isLtsFeed ? key.includes("lts") : !key.includes("lts"),
    );

    const searchOrder = preferred.length > 0 ? preferred : streamEntries;

    for (const [, stream] of searchOrder) {
      const entry = stream.releases?.[releaseTag];
      if (entry) {
        attestationVerified = entry.attestation.verified ?? null;
        attestationPresent = entry.attestation.present ?? null;
        break;
      }
    }
  }

  return {
    packageTagUrl: `https://github.com/orgs/ublue-os/packages/container/bluefin?tag=${encodeURIComponent(releaseTag)}`,
    attestationVerified,
    attestationPresent,
  };
};

// ─── Version Summary ─────────────────────────────────────────────────────────

export interface VersionChange {
  name: string;
  change: string;
}

/**
 * Build a concise version summary (Kernel, GNOME, Mesa, etc.) for a release.
 * Reads directly from the SBOM packageVersions.
 *
 * @param nvidiaVersion Optional NVIDIA version from an external source (not in SBOM)
 */
export const extractVersionSummary = (
  cache: SbomAttestationsData,
  title: string,
  feedId: string,
  nvidiaVersion?: string | null,
): VersionChange[] => {
  const packages = getPackageVersions(cache, feedId, title);
  if (!packages) return [];

  const changes: VersionChange[] = [];
  if (packages.kernel) changes.push({ name: "Kernel", change: packages.kernel });
  if (packages.gnome) changes.push({ name: "GNOME", change: packages.gnome });
  if (packages.mesa) changes.push({ name: "Mesa", change: packages.mesa });
  if (packages.podman) changes.push({ name: "Podman", change: packages.podman });
  if (packages.systemd) changes.push({ name: "systemd", change: packages.systemd });
  if (packages.bootc) changes.push({ name: "bootc", change: packages.bootc });
  if (nvidiaVersion) changes.push({ name: "NVIDIA", change: nvidiaVersion });

  return changes;
};

// ─── Package Diff (computed from SBOM) ───────────────────────────────────────

export interface PackageDiffEntry {
  name: string;
  newVersion: string | null;
  oldVersion: string | null;
}

export interface PackageDiff {
  added: PackageDiffEntry[];
  changed: PackageDiffEntry[];
  removed: PackageDiffEntry[];
}

export interface MajorVersionBump {
  name: string;
  from: string;
  to: string;
}

export interface ReleaseSummary {
  packageUpdates: number;
  newPackages: number;
  removedPackages: number;
  majorBumps: number;
}

/**
 * Compute a package diff between two consecutive releases by comparing
 * their allPackages maps from the SBOM data.
 */
export const computePackageDiff = (
  current: PackageVersions | null,
  previous: PackageVersions | null,
): PackageDiff | null => {
  const currentPkgs = current?.allPackages;
  const previousPkgs = previous?.allPackages;

  // If either release lacks allPackages, we can't compute a diff
  if (!currentPkgs || !previousPkgs) return null;

  const added: PackageDiffEntry[] = [];
  const changed: PackageDiffEntry[] = [];
  const removed: PackageDiffEntry[] = [];

  // Find added and changed packages
  for (const [name, newVersion] of Object.entries(currentPkgs)) {
    const oldVersion = previousPkgs[name];
    if (oldVersion === undefined) {
      added.push({ name, newVersion, oldVersion: null });
    } else if (oldVersion !== newVersion) {
      changed.push({ name, newVersion, oldVersion });
    }
  }

  // Find removed packages
  for (const name of Object.keys(previousPkgs)) {
    if (currentPkgs[name] === undefined) {
      removed.push({ name, newVersion: null, oldVersion: previousPkgs[name] });
    }
  }

  return { added, changed, removed };
};

/**
 * Get the previous release in the same SBOM stream (by tag sort order).
 * Release tags sort lexicographically as YYYYMMDD.
 */
export const getPreviousRelease = (
  cache: SbomAttestationsData,
  feedId: string,
  title: string,
): SbomRelease | null => {
  const streamId = SBOM_STREAM_BY_FEED_ID[feedId];
  const cacheKey = extractReleaseTag(title);
  if (!streamId || !cacheKey) return null;

  const stream = cache.streams?.[streamId];
  if (!stream?.releases) return null;

  // Sort release keys descending (newest first)
  const sortedKeys = Object.keys(stream.releases).sort().reverse();
  const currentIdx = sortedKeys.indexOf(cacheKey);
  if (currentIdx < 0 || currentIdx >= sortedKeys.length - 1) return null;

  const previousKey = sortedKeys[currentIdx + 1];
  return stream.releases[previousKey] ?? null;
};

/**
 * Parse the major version number from a version string.
 */
export const parseMajorVersion = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
};

/**
 * Extract major version bumps from a package diff.
 */
export const extractMajorVersionBumps = (
  diff: PackageDiff | null,
): MajorVersionBump[] => {
  if (!diff) return [];
  return diff.changed
    .flatMap((pkg) => {
      const fromMajor = parseMajorVersion(pkg.oldVersion);
      const toMajor = parseMajorVersion(pkg.newVersion);
      if (fromMajor === null || toMajor === null || toMajor <= fromMajor) {
        return [];
      }
      return [
        {
          name: pkg.name,
          from: pkg.oldVersion || "unknown",
          to: pkg.newVersion || "unknown",
        },
      ];
    })
    .slice(0, 10);
};

/**
 * Build a release summary from a computed package diff.
 */
export const buildReleaseSummary = (
  diff: PackageDiff | null,
  majorVersionBumps: MajorVersionBump[],
): ReleaseSummary | null => {
  if (!diff) return null;
  return {
    packageUpdates: diff.changed.length,
    newPackages: diff.added.length,
    removedPackages: diff.removed.length,
    majorBumps: majorVersionBumps.length,
  };
};
