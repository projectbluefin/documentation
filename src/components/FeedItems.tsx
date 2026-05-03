import React, { useState, useCallback, useMemo } from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";
import sbomData from "@site/static/data/sbom-attestations-frontend.json";
import firehoseAppsData from "@site/static/data/firehose-apps.json";
import type { SbomAttestationsData } from "../types/sbom";
import type { FirehoseApp, FirehoseData } from "../types/firehose";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import {
  getSupplyChainLinks,
  extractVersionSummary,
  getSbomRelease,
  getPreviousRelease,
  computePackageDiff,
  extractMajorVersionBumps,
  buildReleaseSummary,
} from "../utils/sbomRelease";
import type {
  SupplyChainLinks,
  VersionChange,
  MajorVersionBump,
  ReleaseSummary,
} from "../utils/sbomRelease";

// Cast the imported JSON to its proper type
const sbomCache = sbomData as unknown as SbomAttestationsData;

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

// ─── Firehose: NVIDIA version only (not available in SBOM) ───────────────────

const FIREHOSE_APP_ID_BY_FEED_ID: Record<string, string> = {
  bluefinReleases: "bluefin-os-stable",
  bluefinLtsReleases: "bluefin-os-lts",
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

/**
 * Get NVIDIA driver version from firehose data (not present in SBOM).
 * NVIDIA ships as an akmod built outside the image and is not in Syft scans.
 */
const getNvidiaVersionFromFirehose = (feedId: string, title: string): string | null => {
  const appId = FIREHOSE_APP_ID_BY_FEED_ID[feedId];
  if (!appId) return null;
  const app = FIREHOSE_OS_APP_LOOKUP[appId];
  if (!app?.osInfo?.majorPackages) return null;
  const majorPackages = app.osInfo.majorPackages;
  return majorPackages.NVIDIA || majorPackages.Nvidia || majorPackages.nvidia || null;
};

// ─── Feed parsing helpers ────────────────────────────────────────────────────

// Helper function to determine if a feed should show executive summaries
const isReleaseFeed = (feedId: string): boolean => {
  return feedId === "bluefinReleases" || feedId === "bluefinLtsReleases";
};

// Helper to extract items from a raw parsed feed
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
    return title.replace(/^(bluefin-lts|Bluefin) LTS: /, "lts-");
  } else if (feedId === "bluefinReleases") {
    // For stable releases: Keep "stable-" prefix, strip ": Stable" text, simplify Fedora version
    if (title.startsWith("stable-")) {
      return title.replace(
        /^(stable-[^:]+): Stable \(F(\d+)\.\d+, (#[^)]+)\)$/,
        "$1 (F$2 $3)",
      );
    }
  }
  return title;
};

// ─── Derived release data from SBOM ─────────────────────────────────────────

interface DerivedReleaseData {
  versionSummary: VersionChange[];
  supplyChainLinks: SupplyChainLinks;
  majorVersionBumps: MajorVersionBump[];
  releaseSummary: ReleaseSummary | null;
}

/**
 * Compute all release-specific derived data from the SBOM cache.
 * This replaces the previous firehose-based computation for package diffs.
 */
const computeDerivedReleaseData = (
  feedId: string,
  title: string,
): DerivedReleaseData => {
  const nvidiaVersion = getNvidiaVersionFromFirehose(feedId, title);
  const versionSummary = extractVersionSummary(
    sbomCache,
    title,
    feedId,
    nvidiaVersion,
  );
  const supplyChainLinks = getSupplyChainLinks(sbomCache, title, feedId);

  // Compute package diff from consecutive SBOM releases
  const currentRelease = getSbomRelease(sbomCache, feedId, title);
  const previousRelease = getPreviousRelease(sbomCache, feedId, title);
  const diff = computePackageDiff(
    currentRelease?.packageVersions ?? null,
    previousRelease?.packageVersions ?? null,
  );
  const majorVersionBumps = extractMajorVersionBumps(diff);
  const releaseSummary = buildReleaseSummary(diff, majorVersionBumps);

  return { versionSummary, supplyChainLinks, majorVersionBumps, releaseSummary };
};

// ─── FeedItems Component ─────────────────────────────────────────────────────

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
            const versionSummary = isReleaseFeed(feedId)
              ? extractVersionSummary(
                  sbomCache,
                  item.title,
                  feedId,
                  getNvidiaVersionFromFirehose(feedId, item.title),
                )
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

// ─── CombinedFeedItems Component ─────────────────────────────────────────────

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

          // All release data now comes from SBOM cache directly
          const derived = isRelease
            ? computeDerivedReleaseData(item._feedId, item.title)
            : null;

          return {
            itemDescription,
            isRelease,
            displayTitle,
            supplyChainLinks: derived?.supplyChainLinks ?? getSupplyChainLinks(sbomCache, displayTitle, item._feedId),
            majorVersionBumps: derived?.majorVersionBumps ?? [],
            releaseSummary: derived?.releaseSummary ?? null,
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
