import React, { useState, useCallback } from "react";
import useStoredFeed from "@theme/useStoredFeed";
import styles from "./FeedItems.module.css";
import {
  PACKAGE_PATTERNS,
  extractVersionChange,
} from "../config/packageConfig";
import githubProfilesData from "@site/static/data/github-profiles.json";

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

interface CommitEntry {
  hash: string;
  hashUrl: string;
  subject: string; // raw HTML — may contain <a> links to PRs/issues
  author: string;
}

interface SupplyChainHighlight {
  keyword: string;
  commit: CommitEntry;
}

interface SupplyChainLinks {
  packageTagUrl: string | null;
}

interface ReleaseContributor {
  login: string;
  displayName: string;
  html_url: string;
  avatar_url: string;
}

interface ReleaseSummary {
  commits: number;
  packageUpdates: number;
  newPackages: number;
  removedPackages: number;
  majorBumps: number;
  supplyChainSignals: number;
}

const ContributorAvatar: React.FC<{
  author: string;
  contributor?: ReleaseContributor;
}> = ({ author, contributor }) => {
  const [imageError, setImageError] = useState(false);
  const displayName = contributor?.displayName || author;
  const profileUrl = contributor?.html_url || null;
  const avatarUrl = contributor?.avatar_url || null;

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const avatarInner = !imageError && avatarUrl ? (
    <img
      src={avatarUrl}
      alt={displayName}
      className={styles.contributorAvatarImage}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  ) : (
    <span className={styles.contributorAvatarFallback}>{initials || "?"}</span>
  );

  if (profileUrl) {
    return (
      <span
        className={styles.contributorAvatarLink}
        role="link"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          window.open(profileUrl, "_blank", "noopener,noreferrer");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            window.open(profileUrl, "_blank", "noopener,noreferrer");
          }
        }}
        title={displayName}
        aria-label={displayName}
      >
        <span className={styles.contributorAvatar}>{avatarInner}</span>
      </span>
    );
  }

  return (
    <span className={styles.contributorAvatar} title={displayName} aria-label={displayName}>
      {avatarInner}
    </span>
  );
};

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

// Extract the Commits table from release HTML content
const extractCommits = (content: string): CommitEntry[] => {
  if (!content) return [];

  // Find the <h3>Commits</h3> section (feed content is already HTML, not markdown)
  const commitsMatch = content.match(
    /<h3>Commits<\/h3>\s*<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/,
  );
  if (!commitsMatch) return [];

  const tbody = commitsMatch[1];
  const rows = tbody.match(/<tr>([\s\S]*?)<\/tr>/g);
  if (!rows) return [];

  const commits: CommitEntry[] = [];
  for (const row of rows) {
    // Hash cell: <td><strong><a href="URL">HASH</a></strong></td>
    const hashMatch = row.match(
      /<td><strong><a href="([^"]+)">([^<]+)<\/a><\/strong><\/td>/,
    );
    // Subject cell: second <td> — may contain nested HTML
    const cells = row.match(/<td>([\s\S]*?)<\/td>/g);
    // Author cell: third <td>
    if (!hashMatch || !cells || cells.length < 3) continue;

    const hashUrl = hashMatch[1];
    const hash = hashMatch[2];
    // Strip outer <td>…</td> tags from subject cell
    const subject = cells[1].replace(/^<td>|<\/td>$/g, "");
    const author = cells[2].replace(/<[^>]+>/g, "").trim();

    commits.push({ hash, hashUrl, subject, author });
  }
  return commits;
};

const SUPPLY_CHAIN_KEYWORDS = [
  "sbom",
  "attest",
  "attestation",
  "provenance",
  "spdx",
  "syft",
  "cosign",
  "oras",
];

const stripHtml = (input: string): string => input.replace(/<[^>]+>/g, " ");

const extractSupplyChainHighlights = (
  commits: CommitEntry[],
): SupplyChainHighlight[] => {
  const highlights: SupplyChainHighlight[] = [];

  for (const commit of commits) {
    const normalizedSubject = stripHtml(commit.subject).toLowerCase();
    for (const keyword of SUPPLY_CHAIN_KEYWORDS) {
      if (normalizedSubject.includes(keyword)) {
        highlights.push({ keyword, commit });
        break;
      }
    }
  }

  return highlights;
};

const extractReleaseTag = (title: string): string | null => {
  const tagMatch = title.match(
    /(stable-\d{8}|gts-\d{8}|beta-\d{8}|latest-\d{8}|lts[-.]\d{8})/i,
  );
  if (!tagMatch) return null;

  const normalized = tagMatch[1].toLowerCase();
  return normalized;
};

const getSupplyChainLinks = (title: string): SupplyChainLinks => {
  const releaseTag = extractReleaseTag(title);

  if (!releaseTag) {
    return { packageTagUrl: null };
  }

  return {
    packageTagUrl: `https://github.com/orgs/ublue-os/packages/container/bluefin?tag=${encodeURIComponent(releaseTag)}`,
  };
};

const countMatches = (content: string, pattern: RegExp): number => {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
};

const parseMajorVersion = (value: string): number | null => {
  const match = value.match(/\d+/);
  if (!match) return null;
  return Number.parseInt(match[0], 10);
};

const extractMajorVersionBumps = (content: string): MajorVersionBump[] => {
  const bumps: MajorVersionBump[] = [];
  const sectionRegex =
    /<h3>Major(?: DX| GDX)? packages<\/h3>\s*<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;

  const sections = content.matchAll(sectionRegex);
  for (const section of sections) {
    const tbody = section[1];
    const rowRegex =
      /<tr>\s*<td><strong>([^<]+)<\/strong><\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
    const rows = tbody.matchAll(rowRegex);

    for (const row of rows) {
      const name = row[1].trim();
      const versionText = row[2].trim();
      const split = versionText.split(/➡️|→/).map((part) => part.trim());

      if (split.length < 2) continue;

      const from = split[0];
      const to = split[split.length - 1];
      const fromMajor = parseMajorVersion(from);
      const toMajor = parseMajorVersion(to);

      if (fromMajor === null || toMajor === null) continue;
      if (toMajor > fromMajor) {
        bumps.push({ name, from, to });
      }
    }
  }

  return bumps;
};

const extractReleaseSummary = (
  content: string,
  commits: CommitEntry[],
  supplyChainHighlights: SupplyChainHighlight[],
  majorVersionBumps: MajorVersionBump[],
): ReleaseSummary => ({
  commits: commits.length,
  packageUpdates: countMatches(content, /<td>🔄<\/td>/g),
  newPackages: countMatches(content, /<td>✨<\/td>/g),
  removedPackages: countMatches(content, /<td>❌<\/td>/g),
  majorBumps: majorVersionBumps.length,
  supplyChainSignals: supplyChainHighlights.length,
});

const getReleaseContributors = (commits: CommitEntry[]): string[] => {
  const unique = new Set<string>();
  for (const commit of commits) {
    if (commit.author) {
      unique.add(commit.author);
    }
  }
  return Array.from(unique);
};

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const PROFILE_LOOKUP: Record<string, ReleaseContributor> = (() => {
  const lookup: Record<string, ReleaseContributor> = {};
  const entries = Object.values(githubProfilesData as Record<string, any>);

  for (const profile of entries) {
    if (!profile?.login || !profile?.html_url || !profile?.avatar_url) continue;
    const contributor: ReleaseContributor = {
      login: profile.login,
      displayName: profile.name || profile.login,
      html_url: profile.html_url,
      avatar_url: profile.avatar_url,
    };

    lookup[normalizeName(profile.login)] = contributor;
    if (profile.name) {
      lookup[normalizeName(profile.name)] = contributor;
    }
  }

  return lookup;
})();

const getContributorForAuthor = (author: string): ReleaseContributor | undefined =>
  PROFILE_LOOKUP[normalizeName(author)];

// Helper function to extract key version changes from changelog content
const extractVersionSummary = (content: string): VersionChange[] => {
  const changes: VersionChange[] = [];

  if (!content) return changes;

  // Use centralized package configuration
  for (const packageConfig of PACKAGE_PATTERNS) {
    const versionChange = extractVersionChange(content, packageConfig);
    if (versionChange) {
      changes.push(versionChange);
    }
  }

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
      itemLink = htmlLink?.href || htmlLink?.$.href || "";
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
    const feedData: ParsedFeed = useStoredFeed(feedId);

    let items: FeedItem[] = extractItems(feedData);

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
              isReleaseFeed(feedId) && itemDescription
                ? extractVersionSummary(itemDescription)
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
                          dangerouslySetInnerHTML={{ __html: itemDescription }}
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
                        dangerouslySetInnerHTML={{ __html: itemDescription }}
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
    const feedDataLts: ParsedFeed = useStoredFeed(
      feeds[0]?.feedId ?? "bluefinLtsReleases",
    );
    const feedDataStable: ParsedFeed = useStoredFeed(
      feeds[1]?.feedId ?? "bluefinReleases",
    );
    const rawFeeds = [feedDataLts, feedDataStable];

    // Tag each item with its source feedId + label, then merge
    type TaggedItem = FeedItem & { _feedId: string; _label: string };
    const tagged: TaggedItem[] = feeds.flatMap((feedMeta, i) => {
      let items = extractItems(rawFeeds[i]);
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
            const itemDescription =
              item.description ||
              (typeof item.content === "object"
                ? item.content?.value
                : item.content);
            const itemId = item.guid || item.id || itemLink || index;
            const commits =
              isReleaseFeed(item._feedId) && itemDescription
                ? extractCommits(itemDescription)
                : [];
            const supplyChainHighlights = extractSupplyChainHighlights(commits);
            const displayTitle = formatReleaseTitle(item.title, item._feedId);
            const supplyChainLinks = getSupplyChainLinks(displayTitle);
            const majorVersionBumps =
              isReleaseFeed(item._feedId) && itemDescription
                ? extractMajorVersionBumps(itemDescription)
                : [];
            const contributors = getReleaseContributors(commits);
            const visibleContributors = contributors.slice(0, 8);
            const overflowContributors = Math.max(contributors.length - 8, 0);
            const releaseSummary = extractReleaseSummary(
              itemDescription || "",
              commits,
              supplyChainHighlights,
              majorVersionBumps,
            );

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
                {contributors.length > 0 && (
                  <div className={styles.contributorsRow}>
                    <span className={styles.contributorsLabel}>Contributors</span>
                    <div className={styles.contributorsAvatars}>
                      {visibleContributors.map((author) => (
                        <ContributorAvatar
                          key={author}
                          author={author}
                          contributor={getContributorForAuthor(author)}
                        />
                      ))}
                      {overflowContributors > 0 && (
                        <span className={styles.contributorOverflow}>
                          +{overflowContributors}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {itemDate && (
                  <time className={styles.feedItemDate}>
                    {formatLongDate(itemDate)}
                  </time>
                )}
                {isReleaseFeed(item._feedId) && (
                  <div className={styles.releaseSummaryBlock}>
                    <div className={styles.releaseSummaryTitle}>Release Summary</div>
                    <div className={styles.releaseSummaryGrid}>
                      <span>
                        <strong>{releaseSummary.commits}</strong> commits
                      </span>
                      <span>
                        <strong>{releaseSummary.packageUpdates}</strong> package updates
                      </span>
                      <span>
                        <strong>{releaseSummary.newPackages}</strong> additions
                      </span>
                      <span>
                        <strong>{releaseSummary.removedPackages}</strong> removals
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
                          <strong>{bump.name}:</strong> {bump.from} -&gt; {bump.to}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isReleaseFeed(item._feedId) && (
                  <div className={styles.supplyChainBlock}>
                    <div className={styles.supplyChainTitle}>Supply Chain</div>
                    {supplyChainHighlights.length > 0 ? (
                      <ul className={styles.supplyChainList}>
                        {supplyChainHighlights.map(({ keyword, commit }) => (
                          <li key={`${commit.hash}-${keyword}`}>
                            <ActionLinkButton
                              label={commit.hash}
                              url={commit.hashUrl}
                            />{" "}
                            includes <strong>{keyword}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.supplyChainEmpty}>
                        No SBOM/provenance commits detected in this release yet.
                      </p>
                    )}
                    <div className={styles.supplyChainLinks}>
                      {supplyChainLinks.packageTagUrl && (
                        <ActionLinkButton
                          label="View package signatures"
                          url={supplyChainLinks.packageTagUrl}
                        />
                      )}
                      {supplyChainHighlights[0]?.commit.hashUrl && (
                        <ActionLinkButton
                          label="Open first attestation-related commit"
                          url={supplyChainHighlights[0].commit.hashUrl}
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
                    dangerouslySetInnerHTML={{ __html: itemDescription }}
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
