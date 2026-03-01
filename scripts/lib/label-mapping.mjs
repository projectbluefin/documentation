/**
 * Static label color mapping and categorization
 *
 * Label colors from projectbluefin/common repository
 * Categories match CONTEXT.md (lines 43-53)
 */

/**
 * Label name to GitHub hex color mapping (no # prefix)
 * Colors from projectbluefin/common labels (manually extracted top labels)
 */
export const LABEL_COLORS = {
  // Area labels - adjusted for light/dark mode readability
  "area/gnome": "28A745", // Brighter green (was too dark)
  "area/aurora": "1D76DB", // Good blue
  "area/bling": "F9C74F", // Darker yellow (was too light)
  "area/dx": "17A2B8", // Brighter teal (was too dark)
  "area/buildstream": "0066FF", // Brighter blue (was too dark)
  "area/finpilot": "7C3AED", // Good purple
  "area/brew": "E8590C", // Good orange
  "area/just": "E99695", // Good pink
  "area/bluespeed": "1D76DB", // Good blue
  "area/services": "4A90E2", // Darker light blue (was too light)
  "area/policy": "5B8BC1", // Darker light blue (was too light)
  "area/iso": "A0522D", // Adjusted brown
  "area/upstream": "5CB85C", // Mid green (was too light)
  "area/flatpak": "9333EA", // Good purple
  "area/hardware": "F59E0B", // Good amber
  "area/nvidia": "76B900", // Good lime green
  "area/testing": "F59E0B", // Good amber (was too light)
  aarch64: "F59E0B", // Good amber - ARM64 architecture

  // Kind labels - adjusted for light/dark mode readability
  "kind/bug": "E8590C", // Good orange-red
  "kind/enhancement": "17A2B8", // Teal (was too light)
  "kind/documentation": "0066FF", // Good blue (was too dark)
  "kind/tech-debt": "D4A259", // Darker tan (was too light)
  "kind/automation": "5B8BC1", // Darker light blue (was too light)
  "kind/github-action": "2088FF", // Good blue
  "kind/parity": "9333EA", // Good purple (was too light)
  "kind/renovate": "3B82F6", // Brighter blue (was too dark)
  "kind/translation": "8B5CF6", // Purple for i18n/l10n work

  // Common labels
  "good first issue": "7057FF",
  "help wanted": "28A745",
  wontfix: "6C757D", // Gray instead of white
  duplicate: "6C757D",
  invalid: "E8590C",
  question: "D946EF",
};

/**
 * Label categories matching CONTEXT.md structure
 */
export const LABEL_CATEGORIES = {
  Desktop: ["area/gnome", "area/aurora", "area/bling"],
  Development: ["area/dx"],
  Ecosystem: ["area/brew", "area/bluespeed", "area/flatpak"],
  "System Services & Policies": ["area/services", "area/policy"],
  Hardware: ["area/hardware", "area/nvidia", "aarch64"],
  Infrastructure: [
    "area/iso",
    "area/upstream",
    "area/buildstream",
    "area/finpilot",
    "area/just",
    "area/testing",
  ],
  Documentation: ["kind/documentation"],
  "Tech Debt": ["kind/tech-debt", "kind/parity"],
  Automation: ["kind/automation", "kind/github-action", "kind/renovate"],
  Localization: ["kind/translation"],
};

/**
 * Title patterns for smart categorization fallback
 * Used when items lack proper area/* or kind/* labels
 */
const TITLE_PATTERNS = {
  Localization: [
    /translation/i,
    /translate/i,
    /\bl10n\b/i,
    /\bi18n\b/i,
    /french|czech|german|spanish|italian|portuguese|russian|chinese|japanese/i,
  ],
  Documentation: [/\bdocs?\b/i, /documentation/i, /readme/i, /\bguide\b/i],
  Ecosystem: [/flatpak/i, /bazaar/i, /flathub/i, /homebrew/i, /\bbrew\b/i],
  Desktop: [
    // GNOME desktop environment
    /\bgnome\b/i,
    /gnomeos/i,
    /dconf/i,
    // KDE/Aurora desktop environment  
    /\bkde\b/i,
    /\bplasma\b/i,
    /aurora/i,
    // Terminal enhancements (area/bling)
    /starship/i,
    /terminal/i,
    /\bshell\b/i,
    /\bbash\b/i,
    /\bzsh\b/i,
    /prompt/i,
    /\bbling\b/i,
    // Visual elements
    /\bfonts?\b/i,
    /\blogos?\b/i,
  ],
  Hardware: [/kernel/i, /driver/i, /firmware/i, /nvidia/i, /\bgpu\b/i],
  Infrastructure: [
    /\biso\b/i,
    /upstream/i,
    /\bbuild/i,
    /buildstream/i,
    /\bci\b/i,
    /pipeline/i,
    /\bjust\b/i,
    /justfile/i,
    /actions/i,
    /chunkah/i,
  ],
  Development: [
    /\bide\b/i,
    /vscode/i,
    /jetbrains/i,
    /\bdx\b/i,
    /docker/i,
    /qemu/i,
    /\bvm\b/i,
  ],
  "System Services & Policies": [
    /systemd/i,
    /service/i,
    /\bpolicy\b/i,
    /polkit/i,
    /selinux/i,
  ],
};

/**
 * Repository to category mapping for fallback categorization
 */
const REPO_CATEGORY_MAP = {
  "projectbluefin/documentation": "Documentation",
  "ublue-os/homebrew-tap": "Ecosystem",
  "ublue-os/homebrew-experimental-tap": "Ecosystem",
};

/**
 * Get category for a label name
 *
 * @param {string} labelName - Label name (e.g., "area/gnome")
 * @returns {string} Category name (e.g., "Desktop") or "Other"
 */
export function getCategoryForLabel(labelName) {
  for (const [category, labels] of Object.entries(LABEL_CATEGORIES)) {
    if (labels.includes(labelName)) {
      return category;
    }
  }
  return "Other";
}

/**
 * Smart categorization based on PR/issue title patterns
 * Used as fallback when no matching labels are found
 *
 * @param {string} title - PR or issue title
 * @returns {string|null} Category name or null if no match
 */
export function getCategoryFromTitle(title) {
  if (!title) return null;

  for (const [category, patterns] of Object.entries(TITLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Get category based on repository name
 * Used as final fallback when labels and title don't match
 *
 * @param {string} repoName - Repository name (e.g., "projectbluefin/documentation")
 * @returns {string|null} Category name or null if no match
 */
export function getCategoryFromRepository(repoName) {
  if (!repoName) return null;
  return REPO_CATEGORY_MAP[repoName] || null;
}

/**
 * Get category for an item using multi-stage fallback logic
 * 1. Check labels (existing behavior)
 * 2. Check title patterns (new)
 * 3. Check repository (new)
 * 4. Return "Other"
 *
 * @param {Object} item - Item with content.labels, content.title, content.repository
 * @returns {string} Category name
 */
export function getCategoryForItem(item) {
  // Stage 1: Check labels (existing behavior)
  if (item.content?.labels?.nodes) {
    const itemLabels = item.content.labels.nodes.map((l) => l.name);
    const knownLabels = Object.values(LABEL_CATEGORIES).flat();
    const matchingLabel = itemLabels.find((label) =>
      knownLabels.includes(label),
    );
    if (matchingLabel) {
      return getCategoryForLabel(matchingLabel);
    }
  }

  // Stage 2: Check title patterns (new fallback)
  const titleCategory = getCategoryFromTitle(item.content?.title);
  if (titleCategory) {
    return titleCategory;
  }

  // Stage 3: Check repository (final fallback)
  const repoCategory = getCategoryFromRepository(
    item.content?.repository?.nameWithOwner,
  );
  if (repoCategory) {
    return repoCategory;
  }

  // Stage 4: Default to "Other"
  return "Other";
}

/**
 * Generate Shields.io badge markdown for a label
 * Pattern 3 from RESEARCH.md (lines 229-253)
 *
 * @param {Object} label - Label object with name, color, url
 * @returns {string} Markdown badge or empty string if color not mapped
 */
export function generateBadge(label) {
  const color = LABEL_COLORS[label.name] || label.color;

  // If no color mapping and GitHub didn't provide color, skip badge
  if (!color) {
    return "";
  }

  // URL encode label name following Shields.io rules
  // Underscore _ → Space (display)
  // Double underscore __ → Underscore (display)
  // Double dash -- → Dash (display)
  const encodedName = encodeURIComponent(
    label.name.replace(/_/g, "__").replace(/ /g, "_"),
  );

  const encodedUrl = encodeURIComponent(label.url);

  return `[![${label.name}](https://img.shields.io/badge/${encodedName}-${color}?style=flat-square)](${encodedUrl})`;
}
