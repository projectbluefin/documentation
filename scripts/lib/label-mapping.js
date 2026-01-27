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

  // Kind labels - adjusted for light/dark mode readability
  "kind/bug": "E8590C", // Good orange-red
  "kind/enhancement": "17A2B8", // Teal (was too light)
  "kind/documentation": "0066FF", // Good blue (was too dark)
  "kind/tech-debt": "D4A259", // Darker tan (was too light)
  "kind/automation": "5B8BC1", // Darker light blue (was too light)
  "kind/github-action": "2088FF", // Good blue
  "kind/parity": "9333EA", // Good purple (was too light)
  "kind/renovate": "3B82F6", // Brighter blue (was too dark)

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
  "🖥️ Desktop": ["area/gnome", "area/aurora", "area/bling"],
  "🛠️ Development": ["area/dx"],
  "📦 Ecosystem": ["area/brew", "area/bluespeed", "area/flatpak"],
  "⚙️ System Services & Policies": ["area/services", "area/policy"],
  "💻 Hardware": ["area/hardware", "area/nvidia"],
  "🏗️ Infrastructure": [
    "area/iso",
    "area/upstream",
    "area/buildstream",
    "area/finpilot",
    "area/just",
    "area/testing",
  ],
  "🔧 Bug Fixes": ["kind/bug"],
  "🚀 Enhancements": ["kind/enhancement"],
  "📚 Documentation": ["kind/documentation"],
  "🧹 Tech Debt": ["kind/tech-debt"],
  "🤖 Automation": ["kind/automation", "kind/github-action", "kind/renovate"],
};

/**
 * Get category for a label name
 *
 * @param {string} labelName - Label name (e.g., "area/gnome")
 * @returns {string} Category with emoji (e.g., "🖥️ Desktop") or "📋 Other"
 */
export function getCategoryForLabel(labelName) {
  for (const [category, labels] of Object.entries(LABEL_CATEGORIES)) {
    if (labels.includes(labelName)) {
      return category;
    }
  }
  return "📋 Other";
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
