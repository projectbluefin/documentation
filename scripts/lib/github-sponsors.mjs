/**
 * Known GitHub Sponsors - maintained list of contributors with active GitHub Sponsors
 *
 * This list should be updated when contributors enable/disable GitHub Sponsors.
 * Used by monthly reports to show sponsor buttons on contributor cards.
 *
 * Source: docs/donations/contributors.mdx
 */

export const GITHUB_SPONSORS = new Set([
  // Current Maintainers
  "ahmedadan",
  "inffy",
  "hanthor",
  "castrojo",
  "tulilirockz",
  "daegalus",

  // Maintainers Emeritus
  "rothgar",
  "KyleGospo",

  // Add more as contributors enable GitHub Sponsors
]);

/**
 * Get sponsor URL for a GitHub username if they have sponsors enabled
 * @param {string} username - GitHub username
 * @returns {string|null} - Sponsor URL or null if not a sponsor
 */
export function getSponsorUrl(username) {
  if (GITHUB_SPONSORS.has(username)) {
    return `https://github.com/sponsors/${username}`;
  }
  return null;
}
