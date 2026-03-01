/**
 * Configuration for monitored repositories in monthly reports
 *
 * These repositories are scanned for closed issues/PRs during the report period
 * to identify opportunistic work (contributions not tracked on project board)
 */

/**
 * List of repositories to monitor for monthly reports
 * Format: "owner/repo"
 */
export const MONITORED_REPOS = [
  // Core Bluefin repositories
  "ublue-os/bluefin",
  "ublue-os/bluefin-lts",
  // Aurora excluded - KDE variant tracked separately (not Bluefin-focused)

  // Homebrew taps
  "ublue-os/homebrew-tap",
  "ublue-os/homebrew-experimental-tap",

  // Project Bluefin organization
  "projectbluefin/common",
  "projectbluefin/documentation",
  "projectbluefin/branding",
  "projectbluefin/iso",
  "projectbluefin/dakota", // GNOME OS Prototype
];
