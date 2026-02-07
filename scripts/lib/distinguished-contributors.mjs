/**
 * Distinguished Contributors - persistent highlight effects
 *
 * Contributors listed here receive their foil effect on the donations/contributors
 * page AND in every monthly report where they appear as a contributor.
 * Their foil type always takes priority over the gold 'New Light' effect.
 *
 * Special Guests → silver foil
 * Maintainers Emeritus → diamond foil
 *
 * To add/remove someone:
 * 1. Update the appropriate Set below
 * 2. Update docs/donations/contributors.mdx to add/remove highlight prop
 * 3. Run: npm run build && npm run start (verify visually)
 *
 * Source of truth: docs/donations/contributors.mdx
 */

// Special Guests - recognized guest collaborators (silver foil)
export const SPECIAL_GUESTS = new Set([
  "kolunmi",
  "alatiera",
  "madonuko",
  "xe",
  "sramkrishna",
  "mairin",
]);

// Maintainers Emeritus - former maintainers with lasting impact (diamond foil)
export const MAINTAINERS_EMERITUS = new Set([
  "adamisrael",
  "bsherman",
  "bketelsen",
  "rothgar",
  "m2Giles",
  "marcoceppi",
  "KyleGospo",
]);

/**
 * Get the highlight type for a contributor, or null if none.
 * Priority: diamond > silver (if someone is in both sets, diamond wins).
 *
 * @param {string} username - GitHub username (case-sensitive)
 * @returns {'diamond' | 'silver' | null}
 */
export function getDistinguishedHighlight(username) {
  if (MAINTAINERS_EMERITUS.has(username)) return "diamond";
  if (SPECIAL_GUESTS.has(username)) return "silver";
  return null;
}
