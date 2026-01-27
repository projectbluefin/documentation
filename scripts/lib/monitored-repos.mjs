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
  "ublue-os/aurora",

  // Project Bluefin organization
  "projectbluefin/common",
  "projectbluefin/documentation",
  "projectbluefin/branding",
  "projectbluefin/iso",
  "projectbluefin/dakota",
  "projectbluefin/distroless",
];
