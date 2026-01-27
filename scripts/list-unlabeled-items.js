#!/usr/bin/env node

import { fetchProjectItems } from "./lib/graphql-queries.js";
import { startOfMonth, endOfMonth, format } from "date-fns";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!GITHUB_TOKEN) {
  console.error(
    "ERROR: GITHUB_TOKEN or GH_TOKEN environment variable required",
  );
  process.exit(1);
}

async function listUnlabeledItems(year, month) {
  console.log(`\n=== Unlabeled Items Report ===`);
  console.log(`Period: ${format(new Date(year, month - 1), "MMMM yyyy")}\n`);

  // Calculate date range
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  console.log(
    `Fetching items from ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}...`,
  );

  // Fetch project items
  const allItems = await fetchProjectItems("projectbluefin", 2);

  // Filter items completed in the date range
  const completedItems = allItems.filter((item) => {
    // Find Status field
    const statusField = item.fieldValues.nodes.find(
      (fv) => fv.field?.name === "Status",
    );

    if (!statusField || statusField.name !== "Done") return false;
    if (!statusField.updatedAt) return false;

    const itemDate = new Date(statusField.updatedAt);
    return itemDate >= startDate && itemDate <= endDate;
  });

  console.log(`\nTotal items completed in period: ${completedItems.length}`);

  // Categorize items by label presence
  const unlabeledItems = [];
  const partiallyLabeledItems = [];
  const fullyLabeledItems = [];

  for (const item of completedItems) {
    const labels = item.content?.labels?.nodes || [];
    const labelNames = labels.map((l) => l.name);

    const hasAreaLabel = labelNames.some((l) => l.startsWith("area/"));
    const hasKindLabel = labelNames.some((l) => l.startsWith("kind/"));

    if (!hasAreaLabel && !hasKindLabel) {
      unlabeledItems.push(item);
    } else if (!hasAreaLabel || !hasKindLabel) {
      partiallyLabeledItems.push(item);
    } else {
      fullyLabeledItems.push(item);
    }
  }

  console.log(`\n📊 Labeling Summary:`);
  console.log(
    `  ✅ Fully labeled (area/ + kind/): ${fullyLabeledItems.length}`,
  );
  console.log(`  ⚠️  Partially labeled: ${partiallyLabeledItems.length}`);
  console.log(`  ❌ Unlabeled: ${unlabeledItems.length}`);

  // Display unlabeled items
  if (unlabeledItems.length > 0) {
    console.log(`\n\n❌ UNLABELED ITEMS (${unlabeledItems.length}):`);
    console.log("─".repeat(80));

    for (const item of unlabeledItems) {
      const content = item.content;
      const number = content?.number || "N/A";
      const title = content?.title || "Untitled";
      const url = content?.url || "";
      const repo = content?.repository?.name || "unknown";

      console.log(`\n${repo}#${number}: ${title}`);
      console.log(`URL: ${url}`);
      console.log(`Labels: (none)`);
    }
  }

  // Display partially labeled items
  if (partiallyLabeledItems.length > 0) {
    console.log(
      `\n\n⚠️  PARTIALLY LABELED ITEMS (${partiallyLabeledItems.length}):`,
    );
    console.log("─".repeat(80));

    for (const item of partiallyLabeledItems) {
      const content = item.content;
      const number = content?.number || "N/A";
      const title = content?.title || "Untitled";
      const url = content?.url || "";
      const repo = content?.repository?.name || "unknown";
      const labels = content?.labels?.nodes || [];
      const labelNames = labels.map((l) => l.name).join(", ");

      const hasAreaLabel = labels.some((l) => l.name.startsWith("area/"));
      const hasKindLabel = labels.some((l) => l.name.startsWith("kind/"));

      console.log(`\n${repo}#${number}: ${title}`);
      console.log(`URL: ${url}`);
      console.log(`Current labels: ${labelNames}`);
      console.log(
        `Missing: ${!hasAreaLabel ? "area/" : ""}${!hasAreaLabel && !hasKindLabel ? ", " : ""}${!hasKindLabel ? "kind/" : ""}`,
      );
    }
  }

  console.log("\n\n" + "=".repeat(80));
  console.log(`\nTo label an item, use gh CLI:`);
  console.log(
    `  gh issue edit <number> --repo <owner>/<repo> --add-label "area/gnome"`,
  );
  console.log(`\nAvailable area labels:`);
  console.log(
    `  area/gnome, area/dx, area/brew, area/bluespeed, area/flatpak, area/hardware, area/infrastructure`,
  );
  console.log(`\nAvailable kind labels:`);
  console.log(
    `  kind/bug, kind/enhancement, kind/documentation, kind/tech-debt, kind/automation`,
  );
  console.log("\n");
}

// Parse command line arguments
const args = process.argv.slice(2);
const periods = [];

if (args.length === 0) {
  // Default: December 2025 and January 2026
  periods.push({ year: 2025, month: 12 });
  periods.push({ year: 2026, month: 1 });
} else {
  // Parse YYYY-MM format
  for (const arg of args) {
    const [year, month] = arg.split("-").map(Number);
    if (year && month) {
      periods.push({ year, month });
    }
  }
}

// Process each period
for (const { year, month } of periods) {
  await listUnlabeledItems(year, month);
}
