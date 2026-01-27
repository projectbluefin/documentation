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
  // Area labels
  "area/gnome": "0E8A16",
  "area/aurora": "1D76DB",
  "area/bling": "FBCA04",
  "area/dx": "006B75",
  "area/buildstream": "0052CC",
  "area/finpilot": "5319E7",
  "area/brew": "D93F0B",
  "area/just": "E99695",
  "area/bluespeed": "1D76DB",
  "area/services": "C5DEF5",
  "area/policy": "BFD4F2",
  "area/iso": "8B4513",
  "area/upstream": "C2E0C6",

  // Kind labels
  "kind/bug": "D93F0B",
  "kind/enhancement": "A2EEEF",
  "kind/documentation": "0075CA",
  "kind/tech-debt": "FEF2C0",

  // Common labels
  "good first issue": "7057FF",
  "help wanted": "008672",
  wontfix: "FFFFFF",
  duplicate: "CFD3D7",
  invalid: "E4E669",
  question: "D876E3",
};

/**
 * Label categories matching CONTEXT.md structure
 */
export const LABEL_CATEGORIES = {
  "🖥️ Desktop": ["area/gnome", "area/aurora", "area/bling"],
  "🛠️ Development": ["area/dx", "area/buildstream", "area/finpilot"],
  "📦 Ecosystem": ["area/brew", "area/just", "area/bluespeed"],
  "⚙️ System Services & Policies": ["area/services", "area/policy"],
  "🏗️ Infrastructure": ["area/iso", "area/upstream"],
  "🔧 Bug Fixes": ["kind/bug"],
  "🚀 Enhancements": ["kind/enhancement"],
  "📚 Documentation": ["kind/documentation"],
  "🧹 Tech Debt": ["kind/tech-debt"],
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
