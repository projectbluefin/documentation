/**
 * Central configuration for package version tracking.
 *
 * This configuration defines which packages to track in changelog cards
 * and how to extract their versions from changelog content.
 *
 * To add a new package:
 * 1. Add a new entry to the PACKAGE_PATTERNS array
 * 2. Specify the display name and regex pattern for version extraction
 *
 * To remove a package:
 * 1. Remove its entry from PACKAGE_PATTERNS array
 *
 * The patterns match HTML table content in changelog feeds:
 * - Standard format: <td><strong>PackageName</strong></td><td>version</td>
 * - "All Images" format: <td>🔄</td><td>packagename</td><td>oldversion</td><td>newversion</td>
 */

export interface PackagePattern {
  /** Display name for the package (e.g., "Kernel", "GNOME") */
  name: string;
  /** Regex pattern to extract version from changelog HTML content */
  pattern: RegExp;
  /** For "All Images" format, the pattern to extract both old and new versions */
  changePattern?: RegExp;
}

export const PACKAGE_PATTERNS: PackagePattern[] = [
  {
    name: "Kernel",
    pattern: /<td><strong>Kernel<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "HWE Kernel",
    pattern: /<td><strong>HWE Kernel<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "GNOME",
    pattern: /<td><strong>(?:Gnome|GNOME)<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "Mesa",
    pattern: /<td><strong>Mesa<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "Podman",
    pattern: /<td><strong>Podman<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "NVIDIA",
    pattern: /<td><strong>Nvidia<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "Docker",
    pattern: /<td><strong>Docker<\/strong><\/td>\s*<td>([^<]+)/,
  },
  {
    name: "systemd",
    pattern: /<td>🔄<\/td>\s*<td>systemd<\/td>\s*<td>[^<]*<\/td>\s*<td>([^<]+)/,
    changePattern:
      /<td>🔄<\/td>\s*<td>systemd<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)/,
  },
  {
    name: "bootc",
    pattern: /<td>🔄<\/td>\s*<td>bootc<\/td>\s*<td>[^<]*<\/td>\s*<td>([^<]+)/,
    changePattern:
      /<td>🔄<\/td>\s*<td>bootc<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)/,
  },
];

/**
 * Extracts package version from content using the provided pattern.
 * Handles both upgrade arrows (old ➡️ new) and static versions.
 *
 * @param content - HTML content from changelog
 * @param pattern - Regex pattern to match package version
 * @returns Latest version string or null if not found
 */
export function extractPackageVersion(
  content: string,
  pattern: RegExp,
): string | null {
  const match = content.match(pattern);
  if (match) {
    const versionText = match[1].trim();
    // Extract the latest version if there's an arrow (6.14.11-300 ➡️ 6.15.9-201)
    return versionText.includes("➡️")
      ? versionText.split("➡️")[1].trim()
      : versionText;
  }
  return null;
}

/**
 * Extracts version change information for FeedItems component.
 * Only returns changes that have upgrade arrows, not static versions.
 *
 * @param content - HTML content from changelog
 * @param packageConfig - Package configuration with patterns
 * @returns Version change info or null if no upgrade found
 */
export function extractVersionChange(
  content: string,
  packageConfig: PackagePattern,
): { name: string; change: string } | null {
  // For packages with changePattern (systemd, bootc), use the special pattern
  if (packageConfig.changePattern) {
    const match = content.match(packageConfig.changePattern);
    if (match) {
      const fromVersion = match[1].trim();
      const toVersion = match[2].trim();
      return {
        name: packageConfig.name,
        change: `${fromVersion} → ${toVersion}`,
      };
    }
    return null;
  }

  // For standard format patterns, look for upgrade arrows
  const match = content.match(packageConfig.pattern);
  if (match) {
    const versionText = match[1].trim();
    if (versionText.includes("➡️")) {
      // Only show upgrades (with arrow), not static versions
      const [fromVersion, toVersion] = versionText
        .split("➡️")
        .map((v) => v.trim());
      return {
        name: packageConfig.name,
        change: `${fromVersion} → ${toVersion}`,
      };
    }
  }

  return null;
}
