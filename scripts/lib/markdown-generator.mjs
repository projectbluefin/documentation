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

  // Generate frontmatter with MDX import for GitHubProfileCard component
  const frontmatter = `---
title: "Monthly Report: ${monthYear}"
date: ${dateStr}
tags: [monthly-report, project-activity]
---

import GitHubProfileCard from '@site/src/components/GitHubProfileCard';
`;

  // Calculate total items
  const totalItems = plannedItems.length + opportunisticItems.length;

  // Generate summary section
  const summary = `# Summary

- **Month:** ${monthYear}
- **Total items:** ${totalItems}
  - **Planned work:** ${plannedItems.length}
  - **Opportunistic work:** ${opportunisticItems.length}
- **Contributors:** ${contributors.length}
- **New contributors:** ${newContributors.length}
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
      return `### ${cleanCategoryName}\n\n${labelBadges}\n\n${section}`;
    })
    .filter((section) => section)
    .join("\n\n");

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
      return `### ${cleanCategoryName}\n\n${labelBadges}\n\n${section}`;
    })
    .join("\n\n");

  // Combine with section headers
  const categorySections = `# Focus Area

${areaSections}

# Work by Type

${kindSections}`;

  // Generate uncategorized section (combine both planned and opportunistic)
  const allItems = [...plannedItems, ...opportunisticItems];
  const uncategorizedSection = generateUncategorizedSection(allItems);

  // Generate bot activity section
  const botSection = generateBotActivitySection(botActivity);

  // Generate contributors section
  const contributorsSection = generateContributorsSection(
    contributors,
    newContributors,
  );

  // Generate footer with cross-links
  const footer = `---

*Want to see the latest OS releases? Check out the [Changelogs](/changelogs) page. For announcements and deep dives, read our [Blog](/blog).*

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

  // Planned Work subsection
  if (planned.length > 0) {
    sections.push(
      `#### 📋 Planned Work\n\n${formatItemList(planned, displayedUrls)}`,
    );
  }

  // Opportunistic Work subsection
  if (opportunistic.length > 0) {
    sections.push(
      `#### ⚡ Opportunistic Work\n\n${formatItemList(opportunistic, displayedUrls)}`,
    );
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
 *
 * @param {Array} items - Items to format
 * @param {Set} displayedUrls - Set to track displayed URLs
 * @returns {string} Markdown list
 */
function formatItemList(items, displayedUrls) {
  const lines = items.map((item) => {
    const type = item.content.__typename === "PullRequest" ? "PR" : "Issue";
    const number = item.content.number;
    const title = item.content.title;
    const url = item.content.url;
    const author = item.content.author?.login || "unknown";

    // Mark this URL as displayed
    displayedUrls.add(url);

    // Use zero-width space to prevent GitHub notifications
    return `- [#${number} ${title}](${url}) by @\u200B${author}`;
  });

  return lines.join("\n");
}

/**
 * Generate category section (legacy - for backwards compatibility)
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
      const title = item.content.title;
      const url = item.content.url;
      const author = item.content.author?.login || "unknown";

      // Use zero-width space to prevent GitHub notifications
      // No badge needed - items are grouped under section with label badges
      const line = `- [#${number} ${title}](${url}) by @\u200B${author}`;
      lines.push(line);
    });
  });

  return lines.join("\n");
}

/**
 * Generate uncategorized items section
 *
 * @param {Array} items - All completed items
 * @returns {string} Markdown section or empty string
 */
function generateUncategorizedSection(items) {
  // Find items without any categorized labels
  const knownLabels = Object.values(LABEL_CATEGORIES).flat();

  const uncategorizedItems = items.filter((item) => {
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
    const title = item.content.title;
    const url = item.content.url;
    const author = item.content.author?.login || "unknown";

    // Use zero-width space to prevent GitHub notifications
    return `- [#${number} ${title}](${url}) by @\u200B${author}`;
  });

  return `## 📋 Other\n\n${lines.join("\n")}`;
}

/**
 * Generate bot activity section with aggregate table and details
 *
 * @param {Array} botActivity - Bot activity grouped by repo and bot
 * @returns {string} Markdown section with table and collapsible details
 */
function generateBotActivitySection(botActivity) {
  if (!botActivity || botActivity.length === 0) {
    return ""; // No bot activity this period
  }

  const table = generateBotActivityTable(botActivity);
  const details = generateBotDetailsList(botActivity);

  return `## 🤖 Bot Activity

${table}

${details}`;
}

/**
 * Generate bot activity summary table
 *
 * @param {Array} botActivity - Array of {repo, bot, count, items}
 * @returns {string} Markdown table
 */
export function generateBotActivityTable(botActivity) {
  const header = `| Repository | Bot | PRs |
|------------|-----|-----|`;

  const rows = botActivity.map((activity) => {
    const repo = activity.repo
      .replace("ublue-os/", "")
      .replace("projectbluefin/", "");
    const bot = activity.bot;
    const count = activity.count;
    return `| ${repo} | ${bot} | ${count} |`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Generate collapsible details list with full bot PR list
 *
 * @param {Array} botActivity - Array of {repo, bot, count, items}
 * @returns {string} Markdown collapsible details
 */
export function generateBotDetailsList(botActivity) {
  const itemsList = botActivity
    .flatMap((activity) => activity.items)
    .map((item) => {
      const number = item.content.number;
      const title = item.content.title;
      const url = item.content.url;
      const repo = item.content.repository.nameWithOwner;
      return `- [#${number} ${title}](${url}) in ${repo}`;
    })
    .join("\n");

  return `<details>
<summary>View bot activity details</summary>

${itemsList}

</details>`;
}

/**
 * Generate contributors section with GitHubProfileCard components
 *
 * @param {Array<string>} contributors - All contributor usernames
 * @param {Array<string>} newContributors - First-time contributor usernames
 * @returns {string} Markdown section
 */
function generateContributorsSection(contributors, newContributors) {
  let section = "";

  // Section 1: New Contributors (highlighted, shown first)
  if (newContributors.length > 0) {
    section += `## 🌟 New Contributors\n\nWelcome to our new contributors!\n\n`;
    section += `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>\n\n`;

    const newContributorCards = newContributors
      .map(
        (username) =>
          `<GitHubProfileCard username="${username}" highlight={true} />`,
      )
      .join("\n\n");

    section += newContributorCards;
    section += `\n\n</div>\n\n`;
  }

  // Section 2: All Contributors (without highlight)
  section += `## 👥 Contributors\n\n`;
  section += `Thank you to everyone who contributed this period!\n\n`;
  section += `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>\n\n`;

  const allContributorCards = contributors
    .map((username) => `<GitHubProfileCard username="${username}" />`)
    .join("\n\n");

  section += allContributorCards;
  section += `\n\n</div>`;

  return section;
}
