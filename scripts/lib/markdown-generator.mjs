/**
 * Markdown generation for monthly reports
 *
 * Generates formatted markdown matching reference format
 * Reference: https://github.com/projectbluefin/common/issues/166
 * Pattern from RESEARCH.md (lines 603-652)
 */

import { format } from "date-fns";
import {
  LABEL_CATEGORIES,
  LABEL_COLORS,
  generateBadge,
} from "./label-mapping.mjs";
import { getSponsorUrl } from "./github-sponsors.mjs";
import { getDistinguishedHighlight } from "./distinguished-contributors.mjs";

/**
 * Category descriptions for monthly reports
 * Provides context for what types of work fall under each category
 */
const CATEGORY_DESCRIPTIONS = {
  Desktop:
    "GNOME desktop environment, Aurora variant (KDE), and terminal enhancements",
  Development: "Development tools and IDE integrations",
  Ecosystem:
    "Homebrew packages, AI/ML tools (Bluespeed), and Flatpak applications",
  "System Services & Policies": "Systemd services and system-level policies",
  Hardware: "Hardware support, drivers, NVIDIA GPU, and ARM64 architecture",
  Infrastructure:
    "ISO images, upstream integration, build systems, and testing frameworks",
  Documentation: "Documentation improvements and additions",
  "Tech Debt": "Maintenance work and feature parity between variants",
  Automation:
    "CI/CD pipelines, GitHub Actions, and automated dependency updates",
  Localization: "Translation and internationalization work",
};

/**
 * Generate complete report markdown
 *
 * @param {Array} plannedItems - Items from project board completed during period
 * @param {Array} opportunisticItems - Items from repos not on project board
 * @param {Array<string>} contributors - Contributor usernames
 * @param {Array<string>} newContributors - First-time contributor usernames
 * @param {Array} botActivity - Bot activity grouped by repo and bot
 * @param {Date} startDate - Report period start date
 * @param {Date} endDate - Report period end date
 * @param {Object|null} buildMetrics - Build health metrics from fetchBuildMetrics()
 * @param {Array} tapPromotions - Tap promotions from fetchTapPromotions()
 * @returns {string} Complete markdown content
 */
export function generateReportMarkdown(
  plannedItems,
  opportunisticItems,
  contributors,
  newContributors,
  botActivity,
  startDate,
  endDate,
  buildMetrics = null,
  tapPromotions = [],
) {
  // Extract year and month from startDate in UTC
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth(); // 0-indexed
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthYear = `${monthNames[month]} ${year}`;
  const dateStr = format(endDate, "yyyy-MM-dd");

  // Dinosaur-themed monthly titles (catchy and alliterative)
  const monthlyTitles = [
    "Jurassic January",
    "Fossil February",
    "Mesozoic March",
    "Allosaurus April",
    "Megalosaurus May",
    "Juravenator June",
    "Jovial July",
    "Archaeopteryx August",
    "Stegosaurus September",
    "Ornithopod October",
    "Nodosaurus November",
    "Deinonychus December",
  ];
  const monthlyTitle = monthlyTitles[month];

  // Generate frontmatter with MDX import for GitHubProfileCard component
  // Slug format: /YYYY/MM (e.g., /2026/01)
  const monthPadded = String(month + 1).padStart(2, "0");
  const slug = `/${year}/${monthPadded}`;

  const frontmatter = `---
title: "${monthlyTitle} ${year}"
date: ${dateStr}
slug: ${slug}
tags: [monthly-report, project-activity]
---

import GitHubProfileCard from '@site/src/components/GitHubProfileCard';
`;

  // Calculate total items
  const totalItems = plannedItems.length + opportunisticItems.length;

  // Calculate automation percentage for summary
  const totalBotPRs = botActivity.reduce(
    (sum, activity) => sum + activity.count,
    0,
  );
  const totalHumanPRs = plannedItems.length + opportunisticItems.length;
  const totalPRs = totalHumanPRs + totalBotPRs;
  const automationPercentage = ((totalBotPRs / totalPRs) * 100).toFixed(1);

  // Generate summary section as compact table
  const summary = `# Summary

| | |
|--------|-------|
| **Total Items** | ${totalItems} (${plannedItems.length} planned, ${opportunisticItems.length} opportunistic) |
| **Automation** | ${automationPercentage}% (${totalBotPRs} bot PRs out of ${totalPRs} total PRs) |
| **Contributors** | ${contributors.length} total, ${newContributors.length} new |
`;

  // Separate area categories from kind categories
  const areaCategories = Object.entries(LABEL_CATEGORIES).filter(
    ([_, labels]) => labels.some((label) => label.startsWith("area/")),
  );
  const kindCategories = Object.entries(LABEL_CATEGORIES).filter(
    ([_, labels]) => labels.some((label) => label.startsWith("kind/")),
  );

  // Track displayed items to avoid duplicates across categories
  const displayedUrls = new Set();

  // Split bot activity into homebrew and other
  const homebrewActivity = botActivity.filter(
    (activity) =>
      activity.repo === "ublue-os/homebrew-tap" ||
      activity.repo === "ublue-os/homebrew-experimental-tap",
  );
  const otherBotActivity = botActivity.filter(
    (activity) =>
      activity.repo !== "ublue-os/homebrew-tap" &&
      activity.repo !== "ublue-os/homebrew-experimental-tap",
  );

  // Generate area sections with planned vs opportunistic subsections
  const areaSections = areaCategories
    .map(([categoryName, categoryLabels]) => {
      const section = generateCategorySectionWithSubsections(
        plannedItems,
        opportunisticItems,
        categoryName,
        categoryLabels,
        displayedUrls,
      );
      const cleanCategoryName = categoryName.replace(/^[\p{Emoji}\s]+/u, "");
      const labelBadges = categoryLabels
        .map((labelName) => {
          const color = LABEL_COLORS[labelName] || "808080";
          const encodedName = encodeURIComponent(
            labelName.replace(/_/g, "__").replace(/ /g, "_"),
          );
          return `![${labelName}](https://img.shields.io/badge/${encodedName}-${color}?style=flat-square)`;
        })
        .join(" ");

      // Add Homebrew section under Development category
      const description = CATEGORY_DESCRIPTIONS[cleanCategoryName];
      const descriptionText = description ? `\n\n*${description}*\n` : "\n";
      let fullSection = `## ${cleanCategoryName}\n\n${labelBadges}${descriptionText}\n${section}`;
      if (
        cleanCategoryName === "Development" ||
        categoryName.includes("Development")
      ) {
        // Create unified Homebrew section with promotions and updates
        const hasPromotions = tapPromotions && tapPromotions.length > 0;
        const hasUpdates = homebrewActivity.length > 0;

        if (hasPromotions || hasUpdates) {
          fullSection += `\n\n### Homebrew\n\n`;

          // Add promotions subsection (if any)
          if (hasPromotions) {
            const promotionsContent =
              generateTapPromotionsContent(tapPromotions);
            fullSection += `#### Promotions\n\n${promotionsContent}\n\n`;
          }

          // Add package updates subsection (if any)
          if (hasUpdates) {
            const homebrewSection =
              generateHomebrewUpdatesSection(homebrewActivity);
            // Extract just the content (remove the ## heading and adjust remaining headings)
            const homebrewContent = homebrewSection
              .replace(/^## Homebrew Package Updates\n\n/, "")
              .replace(/^### /gm, "##### "); // Convert ### to ##### for proper nesting
            fullSection += `#### Package Updates\n\n${homebrewContent}`;
          }
        }
      }

      return fullSection;
    })
    .filter((section) => section)
    .join("\n\n---\n\n");

  // Generate kind sections with planned vs opportunistic subsections
  const kindSections = kindCategories
    .map(([categoryName, categoryLabels]) => {
      const section = generateCategorySectionWithSubsections(
        plannedItems,
        opportunisticItems,
        categoryName,
        categoryLabels,
        displayedUrls,
      );
      const cleanCategoryName = categoryName.replace(/^[\p{Emoji}\s]+/u, "");
      const labelBadges = categoryLabels
        .map((labelName) => {
          const color = LABEL_COLORS[labelName] || "808080";
          const encodedName = encodeURIComponent(
            labelName.replace(/_/g, "__").replace(/ /g, "_"),
          );
          return `![${labelName}](https://img.shields.io/badge/${encodedName}-${color}?style=flat-square)`;
        })
        .join(" ");
      const description = CATEGORY_DESCRIPTIONS[cleanCategoryName];
      const descriptionText = description ? `\n\n*${description}*\n` : "\n";
      return `## ${cleanCategoryName}\n\n${labelBadges}${descriptionText}\n${section}`;
    })
    .join("\n\n---\n\n");

  // Combine sections without group headers
  const categorySections = `${areaSections}

---

${kindSections}`;

  // Generate uncategorized section (combine both planned and opportunistic)
  const allItems = [...plannedItems, ...opportunisticItems];
  const uncategorizedSection = generateUncategorizedSection(
    allItems,
    displayedUrls,
  );

  // Generate bot activity section (non-homebrew only, since homebrew is now under Development)
  // Note: totalBotPRs, totalHumanPRs, totalPRs already calculated above for summary

  const botSection = generateBotActivitySection(
    otherBotActivity,
    totalPRs,
    totalBotPRs,
  );

  // Generate build health section
  const buildHealthSection = generateBuildHealthSection(
    buildMetrics,
    startDate,
    endDate,
  );

  // Generate contributors section
  const contributorsSection = generateContributorsSection(
    contributors,
    newContributors,
  );

  // Generate footer with cross-links
  const footer = `---

*Want to see the latest OS releases? Check out the [Changelogs](/changelogs). For announcements and deep dives, read our [Blog](/blog).*

*This report was automatically generated from [todo.projectbluefin.io](https://todo.projectbluefin.io).*

---

*Generated on ${format(new Date(), "yyyy-MM-dd")}*  
[View Project Board](https://todo.projectbluefin.io) | [Report an Issue](https://github.com/projectbluefin/common/issues/new)
`;

  // Combine all sections
  return [
    frontmatter,
    summary,
    categorySections,
    uncategorizedSection,
    botSection,
    buildHealthSection,
    contributorsSection,
    footer,
  ]
    .filter((section) => section && section.trim() !== "")
    .join("\n\n");
}

/**
 * Generate category section with subsections for Planned vs Opportunistic work
 *
 * @param {Array} plannedItems - Items from project board
 * @param {Array} opportunisticItems - Items from repos not on board
 * @param {string} categoryName - Category display name
 * @param {Array<string>} categoryLabels - Labels belonging to this category
 * @param {Set} displayedUrls - Set of URLs already displayed (modified in place)
 * @returns {string} Markdown section content
 */
export function generateCategorySectionWithSubsections(
  plannedItems,
  opportunisticItems,
  categoryName,
  categoryLabels,
  displayedUrls,
) {
  // Get items for each type, filtering out already displayed items
  const planned = filterItemsByLabels(plannedItems, categoryLabels).filter(
    (item) => !displayedUrls.has(item.content?.url),
  );
  const opportunistic = filterItemsByLabels(
    opportunisticItems,
    categoryLabels,
  ).filter((item) => !displayedUrls.has(item.content?.url));

  // If both empty, show ChillOps
  if (planned.length === 0 && opportunistic.length === 0) {
    return "> Status: _ChillOps_";
  }

  const sections = [];

  // Planned Work subsection (always show, with ChillOps if empty)
  if (planned.length > 0) {
    sections.push(
      `#### Planned Work\n\n${formatItemList(planned, displayedUrls)}`,
    );
  } else {
    sections.push(`#### Planned Work\n\n> Status: _ChillOps_`);
  }

  // Opportunistic Work subsection (always show, with ChillOps if empty)
  if (opportunistic.length > 0) {
    sections.push(
      `#### Opportunistic Work\n\n${formatItemList(opportunistic, displayedUrls)}`,
    );
  } else {
    sections.push(`#### Opportunistic Work\n\n> Status: _ChillOps_`);
  }

  return sections.join("\n\n");
}

/**
 * Filter items by category labels
 *
 * @param {Array} items - Items to filter
 * @param {Array<string>} categoryLabels - Labels to match
 * @returns {Array} Filtered items
 */
function filterItemsByLabels(items, categoryLabels) {
  return items.filter((item) => {
    if (!item.content?.labels?.nodes) return false;

    const itemLabels = item.content.labels.nodes.map((l) => l.name);
    return categoryLabels.some((catLabel) => itemLabels.includes(catLabel));
  });
}

/**
 * Format list of items as markdown
 * Format: title by @author in #PR (Hyperlight-style single-line format)
 *
 * @param {Array} items - Items to format
 * @param {Set} displayedUrls - Set to track displayed URLs
 * @returns {string} Markdown list
 */
function formatItemList(items, displayedUrls) {
  const lines = items.map((item) => {
    const type = item.content.__typename === "PullRequest" ? "PR" : "Issue";
    const number = item.content.number;
    // Escape curly braces in titles to prevent MDX interpretation as JSX
    const title = item.content.title.replace(/{/g, "\\{").replace(/}/g, "\\}");
    const url = item.content.url;
    const author = item.content.author?.login || "unknown";

    // Mark this URL as displayed
    displayedUrls.add(url);

    // Hyperlight-style format: title by @author in #PR
    // Use zero-width space to prevent GitHub notifications
    return `- ${title} by [@\u200B${author}](https://github.com/${author}) in [#${number}](${url})`;
  });

  return lines.join("\n");
}

/**
 * Generate category section (legacy - for backwards compatibility)
 * Format: title by @author in #PR (Hyperlight-style single-line format)
 *
 * @param {Array} items - Items completed during report period
 * @param {string} categoryName - Category display name
 * @param {Array<string>} categoryLabels - Labels belonging to this category
 * @returns {string} Markdown section content
 */
export function generateCategorySection(items, categoryName, categoryLabels) {
  // Find items with at least one label matching this category
  const categoryItems = items.filter((item) => {
    if (!item.content?.labels?.nodes) return false;

    const itemLabels = item.content.labels.nodes.map((l) => l.name);
    return categoryLabels.some((catLabel) => itemLabels.includes(catLabel));
  });

  if (categoryItems.length === 0) {
    return "> Status: _ChillOps_"; // Show ChillOps status for empty categories
  }

  // Group by label within category
  const labelGroups = {};

  categoryItems.forEach((item) => {
    const itemLabels = item.content.labels.nodes;

    // Find which category labels this item has
    const matchingLabels = itemLabels.filter((label) =>
      categoryLabels.includes(label.name),
    );

    matchingLabels.forEach((label) => {
      if (!labelGroups[label.name]) {
        labelGroups[label.name] = [];
      }
      labelGroups[label.name].push({ item, label });
    });
  });

  // Generate markdown list
  const lines = [];

  Object.entries(labelGroups).forEach(([labelName, entries]) => {
    entries.forEach(({ item, label }) => {
      const type = item.content.__typename === "PullRequest" ? "PR" : "Issue";
      const number = item.content.number;
      // Escape curly braces in titles to prevent MDX interpretation as JSX
      const title = item.content.title
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}");
      const url = item.content.url;
      const author = item.content.author?.login || "unknown";

      // Hyperlight-style format: title by @author in #PR
      // Use zero-width space to prevent GitHub notifications
      const line = `- ${title} by [@\u200B${author}](https://github.com/${author}) in [#${number}](${url})`;
      lines.push(line);
    });
  });

  return lines.join("\n");
}

/**
 * Generate uncategorized items section
 * Format: title by @author in #PR (Hyperlight-style single-line format)
 *
 * @param {Array} items - All completed items
 * @param {Set} displayedUrls - Set of URLs already displayed (to avoid duplicates)
 * @returns {string} Markdown section or empty string
 */
function generateUncategorizedSection(items, displayedUrls) {
  // Find items without any categorized labels AND not already displayed
  const knownLabels = Object.values(LABEL_CATEGORIES).flat();

  const uncategorizedItems = items.filter((item) => {
    // Skip if already displayed in a category
    if (displayedUrls.has(item.content?.url)) return false;

    if (!item.content?.labels?.nodes) return true;

    const itemLabels = item.content.labels.nodes.map((l) => l.name);
    return !itemLabels.some((label) => knownLabels.includes(label));
  });

  if (uncategorizedItems.length === 0) {
    return "";
  }

  const lines = uncategorizedItems.map((item) => {
    const type = item.content.__typename === "PullRequest" ? "PR" : "Issue";
    const number = item.content.number;
    // Escape curly braces in titles to prevent MDX interpretation as JSX
    const title = item.content.title.replace(/{/g, "\\{").replace(/}/g, "\\}");
    const url = item.content.url;
    const author = item.content.author?.login || "unknown";

    // Mark as displayed
    displayedUrls.add(url);

    // Hyperlight-style format: title by @author in #PR
    // Use zero-width space to prevent GitHub notifications
    return `- ${title} by [@\u200B${author}](https://github.com/${author}) in [#${number}](${url})`;
  });

  return `---\n\n## Other\n\n${lines.join("\n")}`;
}

/**
 * Generate Homebrew package updates section
 * Hybrid format: Badge summary + compact table
 *
 * @param {Array} homebrewActivity - Array of {repo, bot, count, items}
 * @returns {string} Markdown section with badges and table
 */
function generateHomebrewUpdatesSection(homebrewActivity) {
  // Calculate totals by tap
  let experimentalCount = 0;
  let productionCount = 0;

  homebrewActivity.forEach((activity) => {
    if (activity.repo === "ublue-os/homebrew-experimental-tap") {
      experimentalCount += activity.count;
    } else if (activity.repo === "ublue-os/homebrew-tap") {
      productionCount += activity.count;
    }
  });

  const totalCount = experimentalCount + productionCount;

  // Parse package updates from PR titles
  const packageUpdates = parseHomebrewPackageUpdates(homebrewActivity);

  // Generate badges - production first to highlight it
  const badges = [];
  if (productionCount > 0) {
    badges.push(
      `![Production Tap](https://img.shields.io/badge/production--tap-${productionCount}%20updates-blue?style=flat-square)`,
    );
  }
  if (experimentalCount > 0) {
    badges.push(
      `![Experimental Tap](https://img.shields.io/badge/experimental--tap-${experimentalCount}%20updates-orange?style=flat-square)`,
    );
  }

  // Generate summary table - production first
  const summaryTable = `| Tap | Updates |
|-----|---------|
| production-tap | ${productionCount} |
| experimental-tap | ${experimentalCount} |`;

  // Generate detailed package tables - production first
  let detailSections = "";

  // Production tap details
  if (Object.keys(packageUpdates.production).length > 0) {
    const prodTable = generatePackageTable(
      packageUpdates.production,
      "production",
    );
    detailSections += `<details>
<summary>View all production-tap updates (${productionCount})</summary>

${prodTable}

</details>`;
  }

  // Experimental tap details
  if (Object.keys(packageUpdates.experimental).length > 0) {
    const expTable = generatePackageTable(
      packageUpdates.experimental,
      "experimental",
    );
    if (detailSections) detailSections += "\n\n";
    detailSections += `<details>
<summary>View all experimental-tap updates (${experimentalCount})</summary>

${expTable}

</details>`;
  }

  return `## Homebrew Package Updates

${badges.join(" ")}

**${totalCount} automated updates** this month via GitHub Actions. Homebrew tap version bumps ensure Bluefin users always have access to the latest stable releases.

### Quick Summary

${summaryTable}

${detailSections}`;
}

/**
 * Parse package names and versions from homebrew PR titles
 *
 * @param {Array} homebrewActivity - Array of {repo, bot, count, items}
 * @returns {Object} { experimental: {pkg: [versions]}, production: {pkg: [versions]} }
 */
function parseHomebrewPackageUpdates(homebrewActivity) {
  const updates = {
    experimental: {},
    production: {},
  };

  homebrewActivity.forEach((activity) => {
    const tapKey =
      activity.repo === "ublue-os/homebrew-experimental-tap"
        ? "experimental"
        : "production";

    activity.items.forEach((item) => {
      const title = item.content.title;
      // Pattern: "package-name version" or "package-name: version"
      // Example: "opencode-desktop-linux 1.1.18"
      const match = title.match(/^([a-z0-9-]+)\s+([0-9]+\.[0-9.]+)/i);

      if (match) {
        const pkgName = match[1];
        const version = match[2];

        if (!updates[tapKey][pkgName]) {
          updates[tapKey][pkgName] = [];
        }

        updates[tapKey][pkgName].push({
          version,
          prNumber: item.content.number,
          prUrl: item.content.url,
        });
      }
    });
  });

  return updates;
}

/**
 * Generate package update table for a tap
 *
 * @param {Object} packages - {pkgName: [{version, prNumber, prUrl}]}
 * @param {string} tapName - "experimental" or "main"
 * @returns {string} Markdown table
 */
function generatePackageTable(packages, tapName) {
  // Sort packages by update count (descending)
  const sortedPackages = Object.entries(packages).sort(
    (a, b) => b[1].length - a[1].length,
  );

  const rows = sortedPackages.map(([pkgName, versions]) => {
    // Show version progression or single version
    const versionStr =
      versions.length > 1
        ? `${versions[0].version} → ${versions[versions.length - 1].version} (${versions.length} updates)`
        : versions[0].version;

    // Link to first PR (or could link to all)
    const prLink = `[#${versions[0].prNumber}](${versions[0].prUrl})`;

    return `| ${pkgName} | ${versionStr} | ${prLink} |`;
  });

  const header = `| Package | Versions | PR |
|---------|----------|-----|`;

  return [header, ...rows].join("\n");
}

/**
 * Generate bot activity section with aggregate table and details
 *
 * @param {Array} botActivity - Bot activity grouped by repo and bot
 * @param {number} totalPRs - Total PRs (human + bot) in the period
 * @param {number} totalBotPRs - Total bot PRs (all bots) in the period
 * @returns {string} Markdown section with table and collapsible details
 */
function generateBotActivitySection(botActivity, totalPRs, totalBotPRs) {
  if (!botActivity || botActivity.length === 0) {
    return ""; // No bot activity this period
  }

  const automationPercentage = ((totalBotPRs / totalPRs) * 100).toFixed(1);

  const table = generateBotActivityTable(botActivity, totalPRs);
  const details = generateBotDetailsList(botActivity);

  return `---

## Bot Activity

**Automation Percentage:** ${automationPercentage}% (${totalBotPRs} bot PRs out of ${totalPRs} total PRs)

${table}

${details}`;
}

/**
 * Generate bot activity summary table (aggregated by repository)
 *
 * @param {Array} botActivity - Array of {repo, bot, count, items}
 * @param {number} totalPRs - Total PRs in the period (for percentage calculation)
 * @returns {string} Markdown table
 */
export function generateBotActivityTable(botActivity, totalPRs) {
  // Aggregate by repository (sum all bot activity per repo)
  const repoAggregates = {};

  botActivity.forEach((activity) => {
    const repo = activity.repo
      .replace("ublue-os/", "")
      .replace("projectbluefin/", "");

    if (!repoAggregates[repo]) {
      repoAggregates[repo] = 0;
    }

    repoAggregates[repo] += activity.count;
  });

  const header = `| Repository | Bot PRs | % of Total |
|------------|---------|------------|`;

  const rows = Object.entries(repoAggregates)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([repo, count]) => {
      const percentage = ((count / totalPRs) * 100).toFixed(1);
      return `| ${repo} | ${count} | ${percentage}% |`;
    });

  return [header, ...rows].join("\n");
}

/**
 * Generate collapsible details list with full bot PR list
 * Format: title by @author in #PR (Hyperlight-style single-line format)
 *
 * @param {Array} botActivity - Array of {repo, bot, count, items}
 * @returns {string} Markdown collapsible details
 */
export function generateBotDetailsList(botActivity) {
  const itemsList = botActivity
    .flatMap((activity) => activity.items)
    .map((item) => {
      const number = item.content.number;
      // Escape curly braces in titles to prevent MDX interpretation as JSX
      const title = item.content.title
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}");
      const url = item.content.url;
      const repo = item.content.repository.nameWithOwner;
      const author = item.content.author?.login || "unknown";

      // Hyperlight-style format with repository context
      return `- ${title} by [@\u200B${author}](https://github.com/${author}) in [${repo}#${number}](${url})`;
    })
    .join("\n");

  return `<details>
<summary>View bot activity details</summary>

${itemsList}

</details>`;
}

/**
 * Generate Build Health section with success rates and statistics
 *
 * @param {Object} buildMetrics - Build metrics from fetchBuildMetrics()
 * @param {Date} startDate - Report period start date
 * @param {Date} endDate - Report period end date
 * @returns {string} Markdown section or empty string if no data
 */
export function generateBuildHealthSection(buildMetrics, startDate, endDate) {
  if (
    !buildMetrics ||
    !buildMetrics.images ||
    buildMetrics.images.length === 0
  ) {
    return ""; // No build metrics available
  }

  const { images, stats } = buildMetrics;

  // Format average duration as minutes
  const avgMinutes = Math.round(stats.avgDuration / 60);

  // Generate success rates table
  const tableHeader = `| Image | Success Rate | Successes | Failures | Monthly Change |
|------|--------------|-----------|----------|----------------|`;

  const tableRows = images
    .map((img) => {
      // Calculate successes and failures
      const successes = Math.round((img.successRate / 100) * img.totalBuilds);
      const failures = img.totalBuilds - successes;

      // Format MoM change as badge or baseline
      let momDisplay;
      if (img.momChange === null) {
        momDisplay = "_Baseline_"; // First report, no previous data
      } else if (img.momChange >= 0) {
        momDisplay = `![+${img.momChange}%](https://img.shields.io/badge/%2B${img.momChange}%25-success?style=flat-square)`;
      } else {
        const absChange = Math.abs(img.momChange);
        momDisplay = `![${img.momChange}%](https://img.shields.io/badge/--${absChange}%25-critical?style=flat-square)`;
      }

      return `| \`${img.name}\` | ${img.successRate}% | ${successes} | ${failures} | ${momDisplay} |`;
    })
    .join("\n");

  const successRatesTable = `${tableHeader}\n${tableRows}`;

  // Generate highlights section
  const perfectClub =
    stats.perfectImages.length > 0
      ? stats.perfectImages.map((name) => `\`${name}\``).join(", ")
      : "_None. Vegeta is displeased._";

  const highlights = `### This Month's Highlights

| Metric | Value |
|--------|-------|
| 📊 **Total Builds** | ${stats.totalBuilds} builds across all images |
| 🏆 **Most Active** | \`${stats.mostActive}\` (${images.find((img) => img.name === stats.mostActive)?.totalBuilds || 0} builds) |
| 💯 **100% Club** | ${perfectClub} |
| ⏱️ **Avg Build Time** | ${avgMinutes} minutes across all variants |`;

  return `---

## Build Health

### Raptor Race

Keep Bluefin healthy with green builds. Wranglers apply within!

${successRatesTable}

${highlights}`;
}

/**
 * Generate contributors section with GitHubProfileCard components
 *
 * @param {Array<string>} contributors - All contributor usernames
 * @param {Array<string>} newContributors - First-time contributor usernames
 * @returns {string} Markdown section
 */
function generateContributorsSection(contributors, newContributors) {
  let section = "## Contributors\n\n";

  // Section 1: New Contributors (highlighted, shown first)
  if (newContributors.length > 0) {
    section += `### New Lights\n\n`;
    section += `We welcome our newest Guardians to the project.\n\n`;
    section += `> "I do not know what the future holds. But I know this: with you at our side, there is nothing we cannot face."\n`;
    section += `> \n`;
    section += `> —Commander Zavala\n\n`;
    section += `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>\n\n`;

    const newContributorCards = newContributors
      .map((username) => {
        const sponsorUrl = getSponsorUrl(username);
        const distinguished = getDistinguishedHighlight(username);
        // Distinguished contributors (silver/diamond) keep their foil type
        // instead of receiving the default gold 'New Light' foil
        const highlightProp = distinguished
          ? `highlight="${distinguished}"`
          : `highlight={true}`;
        if (sponsorUrl) {
          return `<GitHubProfileCard username="${username}" ${highlightProp} sponsorUrl="${sponsorUrl}" />`;
        }
        return `<GitHubProfileCard username="${username}" ${highlightProp} />`;
      })
      .join("\n\n");

    section += newContributorCards;
    section += `\n\n</div>\n\n`;
  }

  // Section 2: Continuing Contributors (excluding new contributors to avoid duplicates)
  const continuingContributors = contributors.filter(
    (username) => !newContributors.includes(username),
  );

  if (continuingContributors.length > 0) {
    section += `### Wayfinders\n\n`;
    section += `> "Define yourself by your actions."\n`;
    section += `> \n`;
    section += `> —Lord Saladin\n\n`;
    section += `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>\n\n`;

    const continuingContributorCards = continuingContributors
      .map((username) => {
        const sponsorUrl = getSponsorUrl(username);
        const distinguished = getDistinguishedHighlight(username);
        // Distinguished contributors always show their foil type
        const highlightProp = distinguished
          ? ` highlight="${distinguished}"`
          : "";
        if (sponsorUrl) {
          return `<GitHubProfileCard username="${username}"${highlightProp} sponsorUrl="${sponsorUrl}" />`;
        }
        return `<GitHubProfileCard username="${username}"${highlightProp} />`;
      })
      .join("\n\n");

    section += continuingContributorCards;
    section += `\n\n</div>`;
  }

  return section;
}

/**
 * Generate Homebrew Tap Promotions content (without heading)
 * Used as a subsection under Development category
 *
 * @param {Array} promotions - Array of {name, description, mergedAt, prNumber, prUrl}
 * @returns {string} Markdown content
 */
function generateTapPromotionsContent(promotions) {
  if (!promotions || promotions.length === 0) {
    return ""; // No promotions this period
  }

  const promotionsList = promotions
    .map((promo) => {
      const mergedDate = new Date(promo.mergedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `- **${promo.name}** - ${promo.description} ([#${promo.prNumber}](${promo.prUrl}), ${mergedDate})`;
    })
    .join("\n");

  return `The following packages graduated from experimental-tap to production-tap this month, ready for wider use:

${promotionsList}

Use \`ujust bbrew\` to browse and install these packages. Follow [the tap instructions](https://github.com/ublue-os/homebrew-tap) if you want to do it by hand.`;
}

/**
 * Generate Homebrew Tap Promotions section (standalone)
 * Legacy function - kept for backward compatibility
 *
 * @param {Array} promotions - Array of {name, description, mergedAt, prNumber, prUrl}
 * @returns {string} Markdown section or empty string
 */
function generateTapPromotionsSection(promotions) {
  if (!promotions || promotions.length === 0) {
    return ""; // No promotions this period
  }

  const content = generateTapPromotionsContent(promotions);
  return `---

## Homebrew Tap Promotions

${content}`;
}
