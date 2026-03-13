import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import {
  extractPackageVersion,
  PACKAGE_PATTERNS,
} from "../config/packageConfig";

// Local type aliases mirroring src/types/theme.d.ts
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
  pubDate?: string;
  updated?: string;
  guid?: string;
  id?: string;
  content?: { value?: string } | string;
}

interface ParsedFeed {
  rss?: { channel?: { item?: FeedItem | FeedItem[] } };
  channel?: { item?: FeedItem | FeedItem[] };
  feed?: { entry?: FeedItem | FeedItem[] };
}

interface DriverRow {
  tag: string;
  link: string;
  date: string;
  kernel: string;
  hweKernel: string;
  mesa: string;
  nvidia: string;
}

// Matches extractItems from FeedItems.tsx
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

// Matches resolveItemLink from FeedItems.tsx
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
    }
  }
  return itemLink;
};

const getContent = (item: FeedItem): string => {
  if (typeof item.content === "object") {
    return item.content?.value ?? "";
  }
  return item.content ?? "";
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const kernelPattern = PACKAGE_PATTERNS.find(
  (p) => p.name === "Kernel",
)!.pattern;
const hweKernelPattern = PACKAGE_PATTERNS.find(
  (p) => p.name === "HWE Kernel",
)!.pattern;
const mesaPattern = PACKAGE_PATTERNS.find((p) => p.name === "Mesa")!.pattern;
const nvidiaPattern = PACKAGE_PATTERNS.find(
  (p) => p.name === "NVIDIA",
)!.pattern;

const buildRow = (item: FeedItem, feedId: string): DriverRow | null => {
  const content = getContent(item);
  if (!content) return null;

  const fullTitle = item.title ?? "";
  const tag = fullTitle.includes(": ") ? fullTitle.split(": ")[0] : fullTitle;
  const link = resolveItemLink(item, feedId);
  const date = formatDate(item.pubDate ?? item.updated ?? "");

  const kernel = extractPackageVersion(content, kernelPattern) ?? "";
  const hweKernel = extractPackageVersion(content, hweKernelPattern) ?? "";
  const mesa = extractPackageVersion(content, mesaPattern) ?? "";
  const nvidia = extractPackageVersion(content, nvidiaPattern) ?? "";

  return { tag, link, date, kernel, hweKernel, mesa, nvidia };
};

interface TableProps {
  rows: DriverRow[];
  showHweKernel: boolean;
}

const VersionTable: React.FC<TableProps> = ({ rows, showHweKernel }) => {
  if (rows.length === 0) {
    return <p>No release data available.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Image Tag</th>
          <th>Date</th>
          <th>Kernel</th>
          {showHweKernel && <th>HWE Kernel</th>}
          <th>Mesa</th>
          <th>NVIDIA</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.tag}>
            <td>
              {row.link ? (
                <a href={row.link} target="_blank" rel="noopener noreferrer">
                  <strong>{row.tag}</strong>
                </a>
              ) : (
                <strong>{row.tag}</strong>
              )}
            </td>
            <td>{row.date}</td>
            <td>{row.kernel || "—"}</td>
            {showHweKernel && <td>{row.hweKernel || "—"}</td>}
            <td>{row.mesa || "—"}</td>
            <td>{row.nvidia || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const DriverVersionsTable: React.FC = () => {
  try {
    const stableFeed: ParsedFeed = useStoredFeed("bluefinReleases");
    const ltsFeed: ParsedFeed = useStoredFeed("bluefinLtsReleases");

    const stableRows: DriverRow[] = extractItems(stableFeed)
      .filter((item) => item.title?.startsWith("stable-"))
      .slice(0, 10)
      .map((item) => buildRow(item, "bluefinReleases"))
      .filter((row): row is DriverRow => row !== null);

    const ltsRows: DriverRow[] = extractItems(ltsFeed)
      .slice(0, 10)
      .map((item) => buildRow(item, "bluefinLtsReleases"))
      .filter((row): row is DriverRow => row !== null);

    const ltsHasHwe = ltsRows.some((r) => r.hweKernel);

    return (
      <>
        <h2>Bluefin</h2>
        <VersionTable rows={stableRows} showHweKernel={false} />

        <h2>Bluefin LTS</h2>
        <VersionTable rows={ltsRows} showHweKernel={ltsHasHwe} />
      </>
    );
  } catch (error) {
    console.error("DriverVersionsTable: error loading feeds", error);
    return <p>Error loading driver version data. Please try refreshing.</p>;
  }
};

export default DriverVersionsTable;
