import React, { useState, useCallback, useMemo } from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";
import sbomAttestationsData from "@site/static/data/sbom-attestations.json";
import firehoseAppsData from "@site/static/data/firehose-apps.json";
import type { SbomAttestationsData } from "../types/sbom";
import type { FirehoseApp, FirehoseData, FirehoseRelease } from "../types/firehose";
import { sanitizeHtml } from "../utils/sanitizeHtml";

// Small inline copy button — renders a clipboard icon, shows a tick for 1.5s after copy
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [text],
  );
  return (
    <button
      onClick={handleCopy}
      className={styles.copyButton}
      title={copied ? "Copied!" : "Copy version"}
      aria-label={copied ? "Copied!" : `Copy ${text}`}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
};

interface FeedItemsProps {
  feedId: string;
  title: string;
  maxItems?: number;
  showDescription?: boolean;
  filter?: (item: FeedItem) => boolean;
}

interface CombinedFeedItemsProps {
  feeds: Array<{
    feedId: string;
    label: string;
    filter?: (item: FeedItem) => boolean;
  }>;
  title: string;
  maxItems?: number;
  showDescription?: boolean;
}

interface VersionChange {
  name: string;
  change: string;
}

// Local type definitions that match src/types/theme.d.ts
// These must be kept in sync with the module declaration
interface FeedItem {
  title: string;
  link:
    | string
    | { href?: string }
    | Array<{
        href?: string;
        rel?: string;
        $?: { href?: string; type?: string };
      }>;
  description?: string;
  pubDate?: string;
  updated?: string;
  guid?: string;
  id?: string;
  author?: string | { name?: string };
  content?: { value?: string } | string;
}

interface ParsedFeed {
  // RSS feed structure
  rss?: {
    channel?: {
      item?: FeedItem | FeedItem[];
    };
  };
  // Alternative RSS structure
  channel?: {
    item?: FeedItem | FeedItem[];
  };
  // Atom feed structure
  feed?: {
    entry?: FeedItem | FeedItem[];
  };
}

// Helper function to format date in long form
const formatLongDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface SupplyChainLinks {
  packageTagUrl: string | null;
  attestationVerified: boolean | null;
  attestationPresent: boolean | null;
}

interface ReleaseSummary {
  packageUpdates: number;
  newPackages: number;
  removedPackages: number;
  majorBumps: number;
}

interface MajorVersionBump {
  name: string;
  from: string;
  to: string;
}

const ActionLinkButton: React.FC<{ label: string; url: string }> = ({
  label,
  url,
}) => (
  <span
    className={styles.actionLinkButton}
    role="link"
    tabIndex={0}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }}
  >
    {label}
  </span>
);

const FIREHOSE_APP_ID_BY_FEED_ID: Record<string, string> = {
  bluefinReleases: "bluefin-os-stable",
  bluefinLtsReleases: "bluefin-os-lts",
};

const extractReleaseTag = (title: string): string | null => {
  const tagMatch = title.match(
    /(stable-\d{8}|beta-\d{8}|latest-\d{8}|lts[-.]\d{8})/i,
  );
  if (tagMatch) {
    // Normalise lts.YYYYMMDD → lts-YYYYMMDD to match cache key format
    return tagMatch[1]
      .toLowerCase()
      .replace(/^lts\.(\d{8})$/, "lts-$1");
  }

  // LTS feed titles use "bluefin-lts LTS: YYYYMMDD (...)" format — extract date
  const ltsDateMatch = title.match(/\bLTS:\s*(\d{8})\b/i);
  if (ltsDateMatch) return `lts-${ltsDateMatch[1]}`;

  return null;
};

const FIREHOSE_OS_APP_LOOKUP: Record<string, FirehoseApp> = (() => {
  const firehose = firehoseAppsData as unknown as FirehoseData;
  const lookup: Record<string, FirehoseApp> = {};
  for (const app of firehose.apps || []) {
    if (app.packageType === "os") lookup[app.id] = app;
  }
  return lookup;
})();

const normalizeReleaseDate = (value?: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const getReleaseDateFromTag = (releaseTag: string | null): string | null => {
  if (!releaseTag) return null;
  const match = releaseTag.match(/(\d{8})$/);
  if (!match) return null;
  return match[1].replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
};

const getFirehoseRelease = (
  feedId: string,
  title: string,
): { app: FirehoseApp; release: FirehoseRelease } | null => {
  const appId = FIREHOSE_APP_ID_BY_FEED_ID[feedId];
  if (!appId) return null;
  const app = FIREHOSE_OS_APP_LOOKUP[appId];
  if (!app?.releases?.length) return null;

  const releaseTag = extractReleaseTag(title);
  const releaseDate = getReleaseDateFromTag(releaseTag);
  if (!releaseDate) return null;

  const release = app.releases.find((candidate) => {
    const byVersion = normalizeReleaseDate(candidate.version) === releaseDate;
    const byTitle = normalizeReleaseDate(candidate.title) === releaseDate;
    const byDate = normalizeReleaseDate(candidate.date) === releaseDate;
    return byVersion || byTitle || byDate;
  });

  if (!release) return null;
  return { app, release };
};

const getSupplyChainLinks = (title: string, feedId?: string): SupplyChainLinks => {
  const releaseTag = extractReleaseTag(title);

  if (!releaseTag) {
    return {
      packageTagUrl: null,
      attestationVerified: null,
      attestationPresent: null,
    };
  }

  // Look up attestation state from the SBOM cache.
  // Cache keys match releaseTag format: stable-YYYYMMDD, latest-YYYYMMDD, lts-YYYYMMDD, etc.
  //
  // lts-YYYYMMDD keys appear in multiple streams (bluefin-lts, bluefin-dx-lts, bluefin-gdx-lts).
  // Use feedId to prefer the correct stream family before falling back to any match.
  const isLtsFeed = feedId === "bluefinLtsReleases";

  let attestationVerified: boolean | null = null;
  let attestationPresent: boolean | null = null;
  const cache = sbomAttestationsData as unknown as SbomAttestationsData;
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

const parseMajorVersion = (value: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
};

const extractMajorVersionBumpsFromFirehose = (
  release: FirehoseRelease | null,
): MajorVersionBump[] => {
  if (!release?.packageDiff) return [];
  return release.packageDiff.changed
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

const extractReleaseSummaryFromFirehose = (
  release: FirehoseRelease | null,
  majorVersionBumps: MajorVersionBump[],
): ReleaseSummary | null => {
  if (!release?.packageDiff) return null;
  return {
    packageUpdates: release.packageDiff.changed.length,
    newPackages: release.packageDiff.added.length,
    removedPackages: release.packageDiff.removed.length,
    majorBumps: majorVersionBumps.length,
  };
};

const getNvidiaVersionFromFirehose = (feedId: string, title: string): string | null => {
  const firehoseRelease = getFirehoseRelease(feedId, title);
  if (!firehoseRelease?.app.osInfo?.majorPackages) return null;
  const majorPackages = firehoseRelease.app.osInfo.majorPackages;
  // Explicit workaround path: NVIDIA is not present in SBOM packageVersions.
  return majorPackages.NVIDIA || majorPackages.Nvidia || majorPackages.nvidia || null;
};

const SBOM_STREAM_BY_FEED_ID: Record<string, string> = {
  bluefinReleases: "bluefin-stable",
  bluefinLtsReleases: "bluefin-lts",
};

const extractVersionSummary = (title: string, feedId: string): VersionChange[] => {
  const streamId = SBOM_STREAM_BY_FEED_ID[feedId];
  const cacheKey = extractReleaseTag(title);
  if (!streamId || !cacheKey) return [];

  const cache = sbomAttestationsData as unknown as SbomAttestationsData;
  const packages = cache?.streams?.[streamId]?.releases?.[cacheKey]?.packageVersions;
  if (!packages) return [];

  const changes: VersionChange[] = [];
  if (packages.kernel) changes.push({ name: "Kernel", change: packages.kernel });
  if (packages.gnome) changes.push({ name: "GNOME", change: packages.gnome });
  if (packages.mesa) changes.push({ name: "Mesa", change: packages.mesa });
  if (packages.podman) changes.push({ name: "Podman", change: packages.podman });
  if (packages.systemd) changes.push({ name: "systemd", change: packages.systemd });
  if (packages.bootc) changes.push({ name: "bootc", change: packages.bootc });
  const nvidia = getNvidiaVersionFromFirehose(feedId, title);
  if (nvidia) changes.push({ name: "NVIDIA", change: nvidia });

  return changes;
};

// Helper function to determine if a feed should show executive summaries
const isReleaseFeed = (feedId: string): boolean => {
  return feedId === "bluefinReleases" || feedId === "bluefinLtsReleases";
};

// Helper to extract item items from a raw parsed feed
const extractItems = (feedData: ParsedFeed): FeedItem[] => {
  if (feedData?.rss?.channel?.item) {
    return Array.isArray(feedData.rss.channel.item)
      ? feedData.rss.channel.item
      : [feedData.rss.channel.item];
  } else if (feedData?.channel?.item) {
    return Array.isArray(feedData.channel.item)
      ? feedData.channel.item
      : [feedData.channel.item];
  } else if (feedData?.feed?.entry) {
    return Array.isArray(feedData.feed.entry)
      ? feedData.feed.entry
      : [feedData.feed.entry];
  }
  return [];
};

// Helper to resolve the URL for an item given its feedId
const resolveItemLink = (item: FeedItem, feedId: string): string => {
  let itemLink = "";
  if (typeof item.link === "string" && item.link) {
    itemLink = item.link;
  } else if (item.link && typeof item.link === "object") {
    if (Array.isArray(item.link)) {
      const htmlLink =
        item.link.find((l) => l.$ && l.$.type === "text/html") ||
        item.link.find((l) => l.rel === "alternate") ||
        item.link[0];
      itemLink = htmlLink?.href || htmlLink?.$?.href || "";
    } else {
      itemLink = (item.link as { href?: string }).href || "";
    }
  }
  if (!itemLink && item.id && typeof item.id === "string") {
    const idMatch = item.id.match(
      /^tag:github\.com,\d+:Repository\/(\d+)\/(.+)$/,
    );
    if (idMatch) {
      const [, , tag] = idMatch;
      if (feedId === "bluefinReleases") {
        itemLink = `https://github.com/ublue-os/bluefin/releases/tag/${tag}`;
      } else if (feedId === "bluefinLtsReleases") {
        itemLink = `https://github.com/ublue-os/bluefin-lts/releases/tag/${tag}`;
      }
    } else {
      const discussionMatch = item.id.match(
        /^tag:github\.com,\d+:Discussion\/(\d+)$/,
      );
      if (
        discussionMatch &&
        (feedId === "bluefinDiscussions" || feedId === "bluefinAnnouncements")
      ) {
        itemLink = `https://github.com/ublue-os/bluefin/discussions/${discussionMatch[1]}`;
      }
    }
  }
  return itemLink;
};

// Helper function to format release titles for better readability
const formatReleaseTitle = (title: string, feedId: string): string => {
  if (feedId === "bluefinLtsReleases") {
    // For LTS releases: Replace "bluefin-lts LTS: " or "Bluefin LTS: " prefix with "lts-"
    // Example: "bluefin-lts LTS: 20250910 (c10s, #cfd65ad)" -> "lts-20250910 (c10s, #cfd65ad)"
    // Example: "Bluefin LTS: 20250808 (c10s)" -> "lts-20250808 (c10s)"
    return title.replace(/^(bluefin-lts|Bluefin) LTS: /, "lts-");
  } else if (feedId === "bluefinReleases") {
    // For stable releases: Keep "stable-" prefix, strip ": Stable" text, simplify Fedora version
    // Example: "stable-20250907: Stable (F42.20250907, #921e6ba)" -> "stable-20250907 (F42 #921e6ba)"
    if (title.startsWith("stable-")) {
      return title.replace(
        /^(stable-[^:]+): Stable \(F(\d+)\.\d+, (#[^)]+)\)$/,
        "$1 (F$2 $3)",
      );
    }
  }

  // Return original title if no formatting rules apply
  return title;
};

const FeedItems: React.FC<FeedItemsProps> = ({
  feedId,
  title,
  maxItems = 5,
  showDescription = false,
  filter,
}) => {
  try {
    const feedData: ParsedFeed | null = useStoredFeed(feedId);

    let items: FeedItem[] = feedData ? extractItems(feedData) : [];

    // Apply filter if provided
    if (filter) {
      items = items.filter(filter);
    }

    // Limit items to maxItems
    const displayItems = items.slice(0, maxItems);

    if (displayItems.length === 0) {
      return (
        <div className={styles.feedContainer}>
          <h3 className={styles.feedTitle}>{title}</h3>
          <p className={styles.noItems}>No items available</p>
        </div>
      );
    }

    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <ul className={styles.feedList}>
          {displayItems.map((item, index) => {
            const itemLink = resolveItemLink(item, feedId);
            const itemDate = item.pubDate || item.updated;
            const itemDescription =
              item.description ||
              (typeof item.content === "object"
                ? item.content?.value
                : item.content);
            const itemId = item.guid || item.id || itemLink || index;
            const versionSummary =
              isReleaseFeed(feedId)
                ? extractVersionSummary(item.title, feedId)
                : [];
            const displayTitle = formatReleaseTitle(item.title, feedId);

            return (
              <li key={itemId} className={styles.feedItem}>
                {itemLink ? (
                  <a
                    href={itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.feedItemLink}
                  >
                    <div className={styles.feedItemContent}>
                      <h4 className={styles.feedItemTitle}>{displayTitle}</h4>
                      {itemDate && (
                        <time className={styles.feedItemDate}>
                          {formatLongDate(itemDate)}
                        </time>
                      )}
                      {versionSummary.length > 0 && (
                        <ul className={styles.executiveSummary}>
                          {versionSummary.map((change) => (
                            <li
                              key={change.name}
                              className={styles.versionChange}
                            >
                              <strong>{change.name}:</strong> {change.change}
                            </li>
                          ))}
                        </ul>
                      )}
                      {showDescription && itemDescription && (
                        <div
                          className={styles.feedItemDescription}
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(itemDescription) }}
                        />
                      )}
                    </div>
                  </a>
                ) : (
                  <div className={styles.feedItemContent}>
                    <h4 className={styles.feedItemTitle}>{displayTitle}</h4>
                    {itemDate && (
                      <time className={styles.feedItemDate}>
                        {formatLongDate(itemDate)}
                      </time>
                    )}
                    {versionSummary.length > 0 && (
                      <ul className={styles.executiveSummary}>
                        {versionSummary.map((change) => (
                          <li
                            key={change.name}
                            className={styles.versionChange}
                          >
                            <strong>{change.name}:</strong> {change.change}
                          </li>
                        ))}
                      </ul>
                    )}
                    {showDescription && itemDescription && (
                      <div
                        className={styles.feedItemDescription}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(itemDescription) }}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  } catch (error) {
    console.error(`Error loading feed ${feedId}:`, error);
    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <p className={styles.error}>Error loading feed data</p>
      </div>
    );
  }
};

// CombinedFeedItems — merges multiple feeds into one chronological list.
// Each feed entry is tagged with a label badge so users can tell releases apart.
const CombinedFeedItems: React.FC<CombinedFeedItemsProps> = ({
  feeds,
  title,
  maxItems = 20,
  showDescription = false,
}) => {
  try {
    // Call useStoredFeed for each feed (hooks must be called unconditionally at top level)
    const feedDataLts: ParsedFeed | null = useStoredFeed(
      feeds[0]?.feedId ?? "bluefinLtsReleases",
    );
    const feedDataStable: ParsedFeed | null = useStoredFeed(
      feeds[1]?.feedId ?? "bluefinReleases",
    );
    const rawFeeds = [feedDataLts, feedDataStable];

    // Tag each item with its source feedId + label, then merge
    type TaggedItem = FeedItem & { _feedId: string; _label: string };
    const tagged: TaggedItem[] = feeds.flatMap((feedMeta, i) => {
      let items = rawFeeds[i] ? extractItems(rawFeeds[i]!) : [];
      if (feedMeta.filter) items = items.filter(feedMeta.filter);
      return items.map((item) => ({
        ...item,
        _feedId: feedMeta.feedId,
        _label: feedMeta.label,
      }));
    });

    // Sort newest-first by date
    tagged.sort((a, b) => {
      const da = new Date(a.pubDate || a.updated || 0).getTime();
      const db = new Date(b.pubDate || b.updated || 0).getTime();
      return db - da;
    });

    const displayItems = tagged.slice(0, maxItems);

    // Pre-compute all expensive per-item derived data in a single useMemo.
    const derivedItems = useMemo(
      () =>
        displayItems.map((item) => {
          const itemDescription =
            item.description ||
            (typeof item.content === "object"
              ? item.content?.value
              : item.content);
          const isRelease = isReleaseFeed(item._feedId);
          const displayTitle = formatReleaseTitle(item.title, item._feedId);
          const supplyChainLinks = getSupplyChainLinks(displayTitle, item._feedId);
          const firehoseRelease = isRelease
            ? getFirehoseRelease(item._feedId, item.title)
            : null;
          const majorVersionBumps = extractMajorVersionBumpsFromFirehose(
            firehoseRelease?.release || null,
          );
          const releaseSummary = extractReleaseSummaryFromFirehose(
            firehoseRelease?.release || null,
            majorVersionBumps,
          );
          return {
            itemDescription,
            isRelease,
            displayTitle,
            supplyChainLinks,
            majorVersionBumps,
            releaseSummary,
          };
        }),
      [displayItems.map((i) => i.guid || i.id).join(",")],
    );

    if (displayItems.length === 0) {
      return (
        <div className={styles.feedContainer}>
          <h3 className={styles.feedTitle}>{title}</h3>
          <p className={styles.noItems}>No items available</p>
        </div>
      );
    }

    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <ul className={styles.feedList}>
          {displayItems.map((item, index) => {
            const itemLink = resolveItemLink(item, item._feedId);
            const itemDate = item.pubDate || item.updated;
            const itemId = item.guid || item.id || itemLink || index;
            const {
              itemDescription,
              isRelease,
              displayTitle,
              supplyChainLinks,
              majorVersionBumps,
              releaseSummary,
            } = derivedItems[index];

            const inner = (
              <div className={styles.feedItemContent}>
                <div
                  className={`${styles.cardArtwork} ${item._feedId === "bluefinLtsReleases" ? styles.cardArtworkLts : styles.cardArtworkMain}`}
                  aria-hidden="true"
                />
                <div className={styles.feedItemHeader}>
                  <span
                    className={`${styles.feedLabel} ${item._feedId === "bluefinLtsReleases" ? styles.feedLabelLts : styles.feedLabelBluefin}`}
                  >
                    {item._label}
                  </span>
                  <h4 className={styles.feedItemTitle}>{displayTitle}</h4>
                  <CopyButton text={displayTitle} />
                </div>
                {itemDate && (
                  <time className={styles.feedItemDate}>
                    {formatLongDate(itemDate)}
                  </time>
                )}
                {isRelease && releaseSummary && (
                  <div className={styles.releaseSummaryBlock}>
                    <div className={styles.releaseSummaryTitle}>
                      Release Summary
                    </div>
                    <div className={styles.releaseSummaryGrid}>
                      <span>
                        <strong>{releaseSummary.packageUpdates}</strong> package
                        updates
                      </span>
                      <span>
                        <strong>{releaseSummary.newPackages}</strong> additions
                      </span>
                      <span>
                        <strong>{releaseSummary.removedPackages}</strong>{" "}
                        removals
                      </span>
                      <span>
                        <strong>{releaseSummary.majorBumps}</strong> major bumps
                      </span>
                    </div>
                  </div>
                )}
                {majorVersionBumps.length > 0 && (
                  <div className={styles.headsUpBlock}>
                    <div className={styles.headsUpTitle}>
                      Heads Up: Major Version Bumps
                    </div>
                    <ul className={styles.headsUpList}>
                      {majorVersionBumps.map((bump) => (
                        <li key={`${bump.name}-${bump.from}-${bump.to}`}>
                          <strong>{bump.name}:</strong> {bump.from} -&gt;{" "}
                          {bump.to}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isRelease && (
                  <div className={styles.supplyChainBlock}>
                    <div className={styles.supplyChainTitle}>Supply Chain</div>
                    {supplyChainLinks.attestationVerified === true && (
                      <p className={styles.supplyChainAttestation}>
                        Attestation verified for this release.
                      </p>
                    )}
                    {supplyChainLinks.attestationPresent === true &&
                      supplyChainLinks.attestationVerified === false && (
                        <p className={styles.supplyChainAttestation}>
                          Attestation present but verification failed for this
                          release.
                        </p>
                      )}
                    {supplyChainLinks.attestationPresent === false && (
                      <p className={styles.supplyChainAttestation}>
                        No attestation found for this release.
                      </p>
                    )}
                    <div className={styles.supplyChainLinks}>
                      {supplyChainLinks.packageTagUrl && (
                        <ActionLinkButton
                          label="View package signatures"
                          url={supplyChainLinks.packageTagUrl}
                        />
                      )}
                      {itemLink && (
                        <ActionLinkButton
                          label="Open full release notes"
                          url={itemLink}
                        />
                      )}
                    </div>
                  </div>
                )}
                {showDescription && itemDescription && (
                  <div
                    className={styles.feedItemDescription}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(itemDescription) }}
                  />
                )}
              </div>
            );

            return (
              <li key={itemId} className={styles.feedItem}>
                {itemLink ? (
                  <a
                    href={itemLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.feedItemLink}
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  } catch (error) {
    console.error("Error loading combined feeds:", error);
    return (
      <div className={styles.feedContainer}>
        <h3 className={styles.feedTitle}>{title}</h3>
        <p className={styles.error}>Error loading feed data</p>
      </div>
    );
  }
};

export { CombinedFeedItems };

export default FeedItems;
