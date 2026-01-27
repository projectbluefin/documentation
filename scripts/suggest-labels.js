#!/usr/bin/env node
/**
 * Interactive labeling helper
 * Suggests labels based on issue/PR titles and allows batch application
 */

import { execSync } from "child_process";
import * as readline from "readline";

// Label suggestions based on keywords
const LABEL_RULES = {
  area: [
    {
      keywords: [
        "gnome",
        "extension",
        "desktop",
        "fractional scaling",
        "bling",
      ],
      label: "area/gnome",
    },
    {
      keywords: [
        "dx",
        "devcontainer",
        "developer",
        "mise",
        "brew packages",
        "cli",
      ],
      label: "area/dx",
    },
    { keywords: ["brew", "homebrew"], label: "area/brew" },
    { keywords: ["flatpak", "flathub"], label: "area/flatpak" },
    {
      keywords: ["hardware", "nvidia", "amd", "intel", "gpu", "t2"],
      label: "area/hardware",
    },
    {
      keywords: [
        "infrastructure",
        "ci",
        "workflow",
        "github action",
        "rechunker",
        "sbom",
        "testing branch",
      ],
      label: "area/infrastructure",
    },
    {
      keywords: ["iso", "installer", "anaconda", "branding"],
      label: "area/iso",
    },
  ],
  kind: [
    {
      keywords: ["bug", "fix", "broken", "busted", "doesn't work"],
      label: "kind/bug",
    },
    {
      keywords: ["feat", "feature", "add", "implement", "new", "enable"],
      label: "kind/enhancement",
    },
    {
      keywords: ["doc", "documentation", "guide", "contributing"],
      label: "kind/documentation",
    },
    {
      keywords: ["tech-debt", "cleanup", "clean up", "refactor", "reorganize"],
      label: "kind/tech-debt",
    },
    {
      keywords: ["automation", "auto-", "github action", "workflow", "ci/cd"],
      label: "kind/automation",
    },
  ],
};

function suggestLabels(title) {
  const titleLower = title.toLowerCase();
  const suggestions = { area: [], kind: [] };

  for (const [type, rules] of Object.entries(LABEL_RULES)) {
    for (const rule of rules) {
      if (rule.keywords.some((kw) => titleLower.includes(kw))) {
        if (!suggestions[type].includes(rule.label)) {
          suggestions[type].push(rule.label);
        }
      }
    }
  }

  return suggestions;
}

// Parse the unlabeled items report
const report = `
### December 2025 - Partially Labeled

bluefin-lts#937: Move gnome extensions to a submodule setup
- Current: kind/enhancement, help wanted
- Missing: area/
- Repo: ublue-os/bluefin-lts

bluefin#3834: Switch to ublue-os/brew
- Current: help wanted, area/brew
- Missing: kind/
- Repo: ublue-os/bluefin

common#81: Improved Contributor Guide
- Current: kind/enhancement, kind/documentation
- Missing: area/
- Repo: projectbluefin/common

bluefin#3919: Double-clicking an AppImage offers to re-image disk
- Current: kind/bug
- Missing: area/
- Repo: ublue-os/bluefin

### December 2025 - Unlabeled

documentation#543: End of Year Update
- Repo: projectbluefin/documentation

aurora#1522: feat: switch over to brew OCI from RPM
- Repo: ublue-os/aurora

### January 2026 - Partially Labeled

common#91: Centralize CONTRIBUTING.md
- Current: good first issue, help wanted, kind/documentation
- Missing: area/
- Repo: projectbluefin/common

common#137: Reorganize issue labels everywhere
- Current: kind/automation
- Missing: area/
- Repo: projectbluefin/common

common#145: Clean up ublue-os/packages
- Current: kind/tech-debt
- Missing: area/
- Repo: projectbluefin/common

common#132: Fix busted main->lts automerge
- Current: kind/bug, kind/github-action
- Missing: area/
- Repo: projectbluefin/common

bluefin-lts#1001: Testing builds should build when something is merged into main
- Current: kind/automation
- Missing: area/
- Repo: ublue-os/bluefin-lts

common#133: Add auto-assign issue to PR author
- Current: kind/enhancement, kind/github-action
- Missing: area/
- Repo: projectbluefin/common

dakota#4: What branches do we publish?
- Current: help wanted, kind/enhancement, kind/github-action
- Missing: area/
- Repo: projectbluefin/dakota

common#141: Apply new labels to ublue-os/bluefin-lts
- Current: kind/automation
- Missing: area/
- Repo: projectbluefin/common

bluefin#2892: rebase-helper doesn't provide date selection for different tags
- Current: kind/bug, kind/tech-debt
- Missing: area/
- Repo: ublue-os/bluefin

bluefin-lts#968: Fractional scaling not turned on by default
- Current: kind/parity
- Missing: area/
- Repo: ublue-os/bluefin-lts

bluefin-lts#969: "Forged on" date missing
- Current: kind/enhancement, kind/parity
- Missing: area/
- Repo: ublue-os/bluefin-lts

bluefin-lts#944: Testing branch for Bluefin LTS
- Current: kind/github-action
- Missing: area/
- Repo: ublue-os/bluefin-lts

bluefin#3024: bluefin-nvidia and related packages aren't part of rebase-helper
- Current: kind/bug, help wanted
- Missing: area/
- Repo: ublue-os/bluefin

common#135: Implement auto-assign issue in Bluefin
- Current: kind/automation
- Missing: area/
- Repo: projectbluefin/common

common#134: Implement auto-assign issue in Bluefin LTS
- Current: kind/automation
- Missing: area/
- Repo: projectbluefin/common

common#136: Implement auto-assign issue in Dakotaraptor
- Current: kind/enhancement, kind/github-action
- Missing: area/
- Repo: projectbluefin/common

common#104: Add upstream rechunker to template
- Current: kind/enhancement
- Missing: area/
- Repo: projectbluefin/common

common#155: Curated mise onramp
- Current: area/dx
- Missing: kind/
- Repo: projectbluefin/common

common#179: Create test bucket and creds to test
- Current: area/iso
- Missing: kind/
- Repo: projectbluefin/common

### January 2026 - Unlabeled

bluefin-lts#1007: fix: switch GDX to HWE kernel
- Repo: ublue-os/bluefin-lts

common#140: Apply new labels to ublue-os/bluefin
- Repo: projectbluefin/common

iso#11: feat: "Welcome to Bluefin" on installer desktop icon
- Repo: projectbluefin/iso

bluefin#3995: Fix legacy-rechunker to work on arm
- Repo: ublue-os/bluefin

bluefin-lts#1004: Bluefin LTS port to projectbluefin/common
- Repo: ublue-os/bluefin-lts

bluefin-lts#936: Move to ublue-os/brew
- Repo: ublue-os/bluefin-lts

common#166: Implement a weekly report
- Repo: projectbluefin/common

aurora#1545: Enable SBOM attestation for images
- Repo: ublue-os/aurora

branding#2: feat: move anaconda branding here instead of on ublue-os/packages
- Repo: projectbluefin/branding

common#138: Apply new labels to projectbluefin/common
- Repo: projectbluefin/common

common#139: Apply new labels to projectbluefin/distroless
- Repo: projectbluefin/common
`;

// Parse items from report
const items = [];
const lines = report.trim().split("\n");

let currentItem = null;
for (const line of lines) {
  const match = line.match(/^([a-z-]+)#(\d+): (.+)$/);
  if (match) {
    if (currentItem) items.push(currentItem);
    currentItem = {
      repo: null,
      shortRepo: match[1],
      number: match[2],
      title: match[3],
      current: [],
      missing: [],
    };
  } else if (currentItem && line.startsWith("- Repo: ")) {
    currentItem.repo = line.replace("- Repo: ", "").trim();
  } else if (currentItem && line.startsWith("- Current: ")) {
    currentItem.current = line.replace("- Current: ", "").trim().split(", ");
  } else if (currentItem && line.startsWith("- Missing: ")) {
    currentItem.missing = line.replace("- Missing: ", "").trim().split("/");
  }
}
if (currentItem) items.push(currentItem);

console.log(`\n${"=".repeat(80)}`);
console.log(`🏷️  BATCH LABELING HELPER`);
console.log(`${"=".repeat(80)}\n`);
console.log(`Found ${items.length} items to label\n`);

// Generate labeling commands
const commands = [];

for (const item of items) {
  const suggestions = suggestLabels(item.title);
  const labelsToAdd = [];

  // Determine what labels to add
  if (item.missing.includes("area")) {
    if (suggestions.area.length > 0) {
      labelsToAdd.push(suggestions.area[0]); // Take first area suggestion
    }
  }
  if (item.missing.includes("kind")) {
    if (suggestions.kind.length > 0) {
      labelsToAdd.push(suggestions.kind[0]); // Take first kind suggestion
    }
  }

  if (labelsToAdd.length === 0 && item.current.length === 0) {
    // Fully unlabeled - add both if we have suggestions
    if (suggestions.area.length > 0) labelsToAdd.push(suggestions.area[0]);
    if (suggestions.kind.length > 0) labelsToAdd.push(suggestions.kind[0]);
  }

  if (labelsToAdd.length > 0) {
    console.log(`${item.repo}#${item.number}: ${item.title}`);
    console.log(`  Current: ${item.current.join(", ") || "(none)"}`);
    console.log(`  Suggested: ${labelsToAdd.join(", ")}`);
    console.log(
      `  Command: gh issue edit ${item.number} --repo ${item.repo} --add-label "${labelsToAdd.join('" --add-label "')}"`,
    );
    console.log();

    commands.push({
      repo: item.repo,
      number: item.number,
      title: item.title,
      labels: labelsToAdd,
      command: `gh issue edit ${item.number} --repo ${item.repo} --add-label "${labelsToAdd.join('" --add-label "')}"`,
    });
  } else {
    console.log(`⚠️  ${item.repo}#${item.number}: ${item.title}`);
    console.log(`  No automatic suggestion - needs manual review`);
    console.log();
  }
}

console.log(`\n${"=".repeat(80)}`);
console.log(`📋 SUMMARY`);
console.log(`${"=".repeat(80)}\n`);
console.log(`Total items: ${items.length}`);
console.log(`Auto-labelable: ${commands.length}`);
console.log(`Needs manual review: ${items.length - commands.length}`);
console.log();

// Write commands to file
import { writeFileSync } from "fs";
const commandsFile = "/tmp/label-commands.sh";
const shellScript = [
  "#!/bin/bash",
  "# Auto-generated labeling commands",
  "# Review and execute: bash /tmp/label-commands.sh",
  "",
  ...commands.map((c) => `# ${c.title}\n${c.command}`),
].join("\n");

writeFileSync(commandsFile, shellScript, { mode: 0o755 });
console.log(`✅ Commands written to: ${commandsFile}`);
console.log(`\nTo execute all labels:`);
console.log(`  bash ${commandsFile}`);
console.log(`\nTo execute selectively, edit the file first.`);
console.log();
