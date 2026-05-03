/**
 * SBOM → Feed compatibility adapter.
 *
 * Bridges the gap between the SBOM data model (streams/releases/packages)
 * and the legacy feed card format that FeedItems.tsx and FirehoseFeed.tsx
 * currently render. This allows a gradual migration: components can switch
 * to sbom-feed-adapter imports without rewriting their rendering logic.
 *
 * Once components are fully migrated, this adapter can be removed and
 * components can consume sbom-adapter.ts directly.
 */

import type { LatestRelease, Release, Stream } from "./sbom-adapter";
import { getStream, getStreamIds, getSbomData } from "./sbom-adapter";

// ── Feed-compatible types ────────────────────────────────────────────────────

export interface VersionChip {
  label: string;
  value: string;
}

export interface FeedCard {
  id: string;
  title: string;
  stream: string;
  tag: string;
  date: string;
  imageRef: string;
  digest: string;
  chips: VersionChip[];
  kind: "release";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CHIP_KEYS = ["kernel", "gnome", "mesa", "podman", "systemd"] as const;

function releaseToCard(streamId: string, tag: string, release: Release): FeedCard {
  const pv = release.packageVersions || {};
  const chips: VersionChip[] = CHIP_KEYS
    .filter((k) => pv[k])
    .map((k) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: pv[k]! }));

  const streamLabel = streamId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `${streamId}/${tag}`,
    title: `${streamLabel} — ${tag}`,
    stream: streamId,
    tag,
    date: release.checkedAt,
    imageRef: release.imageRef,
    digest: release.digest ?? "",
    chips,
    kind: "release",
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get all SBOM releases as feed cards, newest-first across all streams.
 * Optionally filter by stream prefix (e.g., "bluefin-stable").
 */
export function getSbomFeedCards(streamFilter?: string): FeedCard[] {
  const ids = streamFilter
    ? getStreamIds().filter((id) => id.startsWith(streamFilter))
    : getStreamIds();

  const cards: FeedCard[] = [];
  for (const streamId of ids) {
    const stream = getStream(streamId);
    if (!stream) continue;
    for (const [tag, release] of Object.entries(stream.releases)) {
      cards.push(releaseToCard(streamId, tag, release));
    }
  }

  // Sort newest-first by date
  cards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return cards;
}

/**
 * Get the latest release card per stream (one card per stream).
 * Useful for the "pinned" cards at the top of the changelogs page.
 */
export function getPinnedCards(streamIds?: string[]): FeedCard[] {
  const ids = streamIds ?? getStreamIds();
  const cards: FeedCard[] = [];

  for (const streamId of ids) {
    const stream = getStream(streamId);
    if (!stream) continue;
    const tags = Object.keys(stream.releases);
    if (tags.length === 0) continue;
    const tag = tags[0];
    cards.push(releaseToCard(streamId, tag, stream.releases[tag]));
  }

  return cards;
}

/**
 * Get the SBOM generation timestamp as an ISO string.
 */
export function getSbomTimestamp(): string {
  return getSbomData().generatedAt;
}
