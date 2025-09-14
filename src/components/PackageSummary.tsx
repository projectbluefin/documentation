import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import Heading from "@theme/Heading";
import { PACKAGE_PATTERNS, extractPackageVersion } from "../config/packageConfig";

interface PackageInfo {
  name: string;
  version: string;
}

interface PackageSummaryProps {
  feedKey: string;
  title: string;
  filter?: (item: any) => boolean;
}

export default function PackageSummary({
  feedKey,
  title,
  filter,
}: PackageSummaryProps) {
  const feedData = useStoredFeed(feedKey);

  const getLatestPackageVersions = (): PackageInfo[] => {
    // Based on upstream FeedItems.tsx, try all possible structures
    let items = [];

    if (feedData?.rss?.channel?.item) {
      items = Array.isArray(feedData.rss.channel.item)
        ? feedData.rss.channel.item
        : [feedData.rss.channel.item];
    } else if (feedData?.channel?.item) {
      items = Array.isArray(feedData.channel.item)
        ? feedData.channel.item
        : [feedData.channel.item];
    } else if (feedData?.feed?.entry) {
      items = Array.isArray(feedData.feed.entry)
        ? feedData.feed.entry
        : [feedData.feed.entry];
    }

    if (items.length === 0) {
      return [];
    }

    // Apply filter if provided
    if (filter) {
      items = items.filter(filter);
    }

    if (items.length === 0) {
      return [];
    }

    // Look through recent releases (up to 10) to find the latest version of each package
    const packages: PackageInfo[] = [];
    const maxItemsToSearch = Math.min(10, items.length);

    // Helper function to extract package versions from content
    const extractPackageFromContent = (
      content: string,
      packageName: string,
      pattern: RegExp,
    ): string | null => {
      return extractPackageVersion(content, pattern);
    };

    // Use centralized package patterns
    const packagePatterns = PACKAGE_PATTERNS;

    // For each package, find the latest version from recent releases
    for (const pkg of packagePatterns) {
      for (let i = 0; i < maxItemsToSearch; i++) {
        const item = items[i];

        // Extract content from different possible locations
        let content = "";
        if (typeof item.content === "object" && item.content?.value) {
          content = item.content.value;
        } else if (typeof item.content === "string") {
          content = item.content;
        } else if (item.description) {
          content = item.description;
        }

        if (!content) continue;

        const version = extractPackageFromContent(
          content,
          pkg.name,
          pkg.pattern,
        );
        if (version) {
          // Found this package version, add it and stop looking for this package
          packages.push({ name: pkg.name, version });
          break;
        }
      }
    }

    return packages;
  };

  const packages = getLatestPackageVersions();

  if (packages.length === 0) {
    return null;
  }

  return (
    <div
      className="margin-bottom--lg"
      style={{
        backgroundColor: "var(--ifm-background-color)",
        borderRadius: "8px",
        border: "1px solid var(--ifm-color-emphasis-300)",
        padding: "1.5rem",
      }}
    >
      <Heading
        as="h3"
        style={{
          marginTop: 0,
          marginBottom: "1rem",
          color: "var(--ifm-color-emphasis-800)",
          fontSize: "1.25rem",
          fontWeight: 600,
          borderBottom: "2px solid var(--ifm-color-primary)",
          paddingBottom: "0.5rem",
        }}
      >
        {title}
      </Heading>
      <div
        style={{
          fontSize: "0.95rem",
          fontFamily: "monospace",
          lineHeight: "1.6",
        }}
      >
        {packages.map((pkg) => (
          <div key={pkg.name}>
            <strong>{pkg.name}:</strong> {pkg.version}
          </div>
        ))}
      </div>
    </div>
  );
}
