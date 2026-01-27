/**
 * Markdown generation for biweekly reports
 *
 * Generates formatted markdown matching reference format
 * Reference: https://github.com/projectbluefin/common/issues/166
 * Pattern from RESEARCH.md (lines 603-652)
 */

import { format, getISOWeek } from "date-fns";
import {
  LABEL_CATEGORIES,
  LABEL_COLORS,
  generateBadge,
} from "./label-mapping.js";

/**
 * Generate complete report markdown
 *
 * @param {Array} completedItems - Items completed during report period
 * @param {Array<string>} contributors - Contributor usernames
 * @param {Array<string>} newContributors - First-time contributor usernames
 * @param {Array} botActivity - Bot activity grouped by repo and bot
 * @param {Date} startDate - Report period start date
 * @param {Date} endDate - Report period end date
 * @returns {string} Complete markdown content
 */
export function generateReportMarkdown(
  completedItems,
  contributors,
  newContributors,
  botActivity,
  startDate,
  endDate,
) {
  const dateStr = format(endDate, "yyyy-MM-dd");
  const startStr = format(startDate, "yyyy-MM-dd");

  // Generate frontmatter with MDX import for new contributors
  const frontmatter = `---
title: "Biweekly Report: ${startStr} to ${dateStr}"
date: ${dateStr}
tags: [biweekly-report, project-activity]
---

${newContributors.length > 0 ? "import GitHubProfileCard from '@site/src/components/GitHubProfileCard';\n" : ""}
`;

  // Calculate ISO week numbers for the report period
  const startWeek = getISOWeek(startDate);
  const endWeek = getISOWeek(endDate);
  const weeksDisplay =
    startWeek === endWeek ? `${startWeek}` : `${startWeek} and ${endWeek}`;

  // Generate summary section
  const summary = `# Summary

- **Weeks:** ${weeksDisplay}
- **Items completed:** ${completedItems.length}
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

  // Generate area sections
  const areaSections = areaCategories
    .map(([categoryName, categoryLabels]) => {
      const section = generateCategorySection(
        completedItems,
        categoryName,
        categoryLabels,
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

  // Generate kind sections
  const kindSections = kindCategories
    .map(([categoryName, categoryLabels]) => {
      const section = generateCategorySection(
        completedItems,
        categoryName,
        categoryLabels,
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
  const categorySections = `# Project Areas

${areaSections}

# Work Types

${kindSections}`;

  // Generate uncategorized section
  const uncategorizedSection = generateUncategorizedSection(completedItems);

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
 * Generate a category section with items matching category labels
 *
 * @param {Array} items - All completed items
 * @param {string} categoryName - Category display name with emoji
 * @param {Array<string>} categoryLabels - Label names for this category
 * @returns {string} Markdown list or ChillOps status if no items
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
 * Generate contributors section with thank you list and new contributor highlights
 *
 * @param {Array<string>} contributors - All contributor usernames
 * @param {Array<string>} newContributors - First-time contributor usernames
 * @returns {string} Markdown section
 */
function generateContributorsSection(contributors, newContributors) {
  // Use zero-width space after @ to prevent GitHub notifications
  const contributorList = contributors
    .map((username) => `@\u200B${username}`)
    .join(", ");

  let section = `## 👥 Contributors

Thank you to all contributors this period: ${contributorList}`;

  if (newContributors.length > 0) {
    section += `\n\n### 🎉 New Contributors\n\nWelcome to our new contributors!\n\n`;

    // Use GitHubProfileCard component for each new contributor in grid (matching donations page style)
    section += `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>\n\n`;

    const profileCards = newContributors
      .map(
        (username) =>
          `<GitHubProfileCard username="${username}" title="New Contributor" />`,
      )
      .join("\n\n");

    section += profileCards;
    section += `\n\n</div>`;
  }

  return section;
}
