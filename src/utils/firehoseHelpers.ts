/**
 * Pure helper functions extracted from FirehoseFeed.tsx.
 * Handles SBOM ↔ release-tag mapping, version chip building,
 * and SBOM-to-event synthesis for all streams.
 */

import type { OsReleaseEvent, ParsedMajorPackage, OsStream } from "../types/os-feed";
import type { SbomAttestationsData, PackageVersions } from "../types/sbom";

// ── Constants ────────────────────────────────────────────────────────────────

export const DAYS_MS: Record<string, number> = {
  "1d": 1 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const ROLLING_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/** Map from lowercase chip names to their SBOM PackageVersions field. */
export const CHIP_TO_SBOM: Array<{
  chipName: string;
  displayName: string;
  field: keyof PackageVersions;
}> = [
  { chipName: "kernel", displayName: "Kernel", field: "kernel" },
  { chipName: "gnome", displayName: "Gnome", field: "gnome" },
  { chipName: "mesa", displayName: "Mesa", field: "mesa" },
  { chipName: "podman", displayName: "Podman", field: "podman" },
  { chipName: "bootc", displayName: "bootc", field: "bootc" },
  { chipName: "systemd", displayName: "systemd", field: "systemd" },
  { chipName: "pipewire", displayName: "pipewire", field: "pipewire" },
  { chipName: "flatpak", displayName: "flatpak", field: "flatpak" },
];

/** RPM package name → display label for the DX section chips */
export const DX_CHIP_MAP: Record<string, string> = {
  "docker-ce": "Docker",
  code: "VSCode",
  incus: "Incus",
};

/** RPM package name → display label for the GDX section chips */
export const GDX_CHIP_MAP: Record<string, string> = {
  "nvidia-driver": "Nvidia",
  "nvidia-driver-cuda": "CUDA",
};

// ── Pure functions ───────────────────────────────────────────────────────────

/** Extract a YYYYMMDD date string from a release tag. */
export function parseDateFromTag(tag: string): string | null {
  const m = tag.match(/(\d{8})/);
  return m ? m[1] : null;
}

/** Convert a YYYYMMDD string to epoch ms (midnight UTC). */
export function dateStringToMs(dateStr: string): number {
  return Date.parse(
    `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`,
  );
}

/**
 * Convert a ParsedOsRelease tag + stream to the SBOM cache key + stream ID.
 */
export function sbomKeyForRelease(
  tag: string,
  stream: string,
): { streamId: string; cacheKey: string } | null {
  const date = parseDateFromTag(tag);
  if (!date) return null;
  if (stream === "lts") return { streamId: "bluefin-lts", cacheKey: `lts-${date}` };
  if (stream === "stable-daily")
    return { streamId: "bluefin-stable-daily", cacheKey: `stable-daily-${date}` };
  if (stream === "stable") return { streamId: "bluefin-stable", cacheKey: `stable-${date}` };
  return null;
}

/**
 * Build version chips from SBOM package versions for a given release.
 * Returns null if no SBOM data available.
 */
export function buildVersionChips(
  packages: PackageVersions | undefined,
): ParsedMajorPackage[] | null {
  if (!packages) return null;
  const chips: ParsedMajorPackage[] = [];
  for (const { displayName, field } of CHIP_TO_SBOM) {
    const version = packages[field] as string | null | undefined;
    if (!version) continue;
    chips.push({ name: displayName, version, prevVersion: null });
  }
  return chips.length > 0 ? chips : null;
}

/**
 * Synthesise OsReleaseEvent entries directly from an SBOM stream.
 * Used for stable-daily and any stream where events exist only in GHCR.
 */
export function sbomStreamToEvents(
  sbomData: SbomAttestationsData,
  streamId: string,
  streamLabel: OsStream,
  githubUrl: string,
): OsReleaseEvent[] {
  const stream = sbomData?.streams?.[streamId];
  if (!stream?.releases) return [];

  const events: OsReleaseEvent[] = [];
  for (const [cacheKey, releaseData] of Object.entries(stream.releases)) {
    if (!releaseData.packageVersions) continue;
    const dateStr = parseDateFromTag(cacheKey);
    if (!dateStr) continue;
    const dateMs = dateStringToMs(dateStr);
    if (isNaN(dateMs)) continue;

    const majorPackages = buildVersionChips(releaseData.packageVersions);
    if (!majorPackages) continue;

    events.push({
      kind: "os",
      stream: streamLabel,
      dateMs,
      release: {
        stream: streamLabel,
        tag: cacheKey,
        githubUrl,
        fedoraVersion: releaseData.packageVersions.fedora
          ? releaseData.packageVersions.fedora.replace(/^F/, "")
          : null,
        centosVersion: null,
        majorPackages,
        dxPackages: [],
        gdxPackages: [],
        commits: [],
        fullDiff: [],
      },
    });
  }
  return events;
}

/**
 * Filter events by stream name (case-insensitive).
 */
export function filterByStream(
  events: OsReleaseEvent[],
  stream: string,
): OsReleaseEvent[] {
  const lower = stream.toLowerCase();
  return events.filter((e) => e.stream.toLowerCase() === lower);
}
