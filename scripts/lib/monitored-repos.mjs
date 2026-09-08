/**
 * Configuration for monitored repositories in monthly reports
 *
 * These repositories are scanned for closed issues/PRs during the report period
 * to identify opportunistic work (contributions not tracked on project board)
 */

import { REPORT_PORTFOLIO } from "./report-portfolio.mjs";

export const MONITORED_REPOS = REPORT_PORTFOLIO.filter(
  (entry) =>
    entry.signals.includes("activity") &&
    entry.repository.startsWith("projectbluefin/"),
).map((entry) => entry.repository);
