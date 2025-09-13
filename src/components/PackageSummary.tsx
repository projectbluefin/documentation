import React from "react";
import useStoredFeed from "@theme/useStoredFeed";
import Heading from "@theme/Heading";

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

    const latestRelease = items[0];

    // Extract content from different possible locations
    let content = "";
    if (
      typeof latestRelease.content === "object" &&
      latestRelease.content?.value
    ) {
      content = latestRelease.content.value;
    } else if (typeof latestRelease.content === "string") {
      content = latestRelease.content;
    } else if (latestRelease.description) {
      content = latestRelease.description;
    }

    // Parse major packages from the HTML content
    const packages: PackageInfo[] = [];

    if (!content) {
      return packages;
    }

    // Look for package version patterns in the HTML table content
    // Pattern for HTML table: <td><strong>PackageName</strong></td><td>version</td>

    const kernelMatch = content.match(
      /<td><strong>Kernel<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (kernelMatch) {
      // Extract the latest version if there's an arrow (6.14.11-300 ➡️ 6.15.9-201)
      const versionText = kernelMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "Kernel", version: latestVersion });
    }

    const hweKernelMatch = content.match(
      /<td><strong>HWE Kernel<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (hweKernelMatch) {
      const versionText = hweKernelMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "HWE Kernel", version: latestVersion });
    }

    const gnomeMatch = content.match(
      /<td><strong>(?:Gnome|GNOME)<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (gnomeMatch) {
      const versionText = gnomeMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "GNOME", version: latestVersion });
    }

    const mesaMatch = content.match(
      /<td><strong>Mesa<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (mesaMatch) {
      const versionText = mesaMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "Mesa", version: latestVersion });
    }

    const podmanMatch = content.match(
      /<td><strong>Podman<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (podmanMatch) {
      const versionText = podmanMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "Podman", version: latestVersion });
    }

    const nvidiaMatch = content.match(
      /<td><strong>Nvidia<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (nvidiaMatch) {
      const versionText = nvidiaMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "NVIDIA", version: latestVersion });
    }

    const dockerMatch = content.match(
      /<td><strong>Docker<\/strong><\/td>\s*<td>([^<]+)/,
    );
    if (dockerMatch) {
      const versionText = dockerMatch[1].trim();
      const latestVersion = versionText.includes("➡️")
        ? versionText.split("➡️")[1].trim()
        : versionText;
      packages.push({ name: "Docker", version: latestVersion });
    }

    const systemdMatch = content.match(
      /<td>🔄<\/td>\s*<td>systemd<\/td>\s*<td>[^<]*<\/td>\s*<td>([^<]+)/,
    );
    if (systemdMatch) {
      const versionText = systemdMatch[1].trim();
      packages.push({ name: "systemd", version: versionText });
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
