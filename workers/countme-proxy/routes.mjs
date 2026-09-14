import {
  PROJECTBLUEFIN_REPOS,
  UPSTREAM_ALLOWED,
} from "../../scripts/lib/countme-sources.mjs";

export const LEGACY_BLUEFIN_CHART_URL =
  "https://raw.githubusercontent.com/ublue-os/countme/main/growth_bluefins.svg";

/**
 * The only routes still answered by another service.
 *
 * `ublue-os/bluefin:stable` is the one upstream series anyone may publish
 * (`UPSTREAM_ALLOWED`); its growth chart and badge are upstream's to produce.
 * Every other series — Bluefin LTS included — is counted by our own deployment
 * or not at all, so nothing else may resolve here.
 */
export const LEGACY_ROUTES = {
  "/growth_bluefins.svg": LEGACY_BLUEFIN_CHART_URL,
  "/sources/ublue-os/bluefin/growth.svg": LEGACY_BLUEFIN_CHART_URL,
  "/badge-endpoints/bluefin.json": UPSTREAM_ALLOWED.source,
};

/**
 * The upstream chart, restyled to the Bluefin palette.
 *
 * Presentation only. The series, its axes and its values are upstream's,
 * fetched from the same artifact as `/growth_bluefins.svg` and never
 * re-derived: `isPermittedSource` allows exactly one source for
 * `ublue-os/bluefin:stable`, so recomputing this series from Fedora's CSV —
 * which is how upstream builds it — would be a forbidden source wearing our
 * palette. Recolouring the artifact claims nothing new about the data.
 *
 * `/growth_bluefins.svg` keeps returning upstream's bytes unchanged, for
 * anything that expects the original.
 */
export const LEGACY_THEMED_ROUTE = "/legacy/bluefin.svg";

/** Weekly aggregate of our own countme records, as JSON. */
export const COUNTS_ROUTE = "/counts.json";

/** Seconds a first-party response may be cached at the edge. */
export const COUNTS_CACHE_TTL_SECONDS = 900;

/** Chart aliases that predate per-repo routes, all meaning Bluefin. */
const BLUEFIN_CHART_ALIASES = [
  "/",
  "/growth.svg",
  "/sources/projectbluefin/bluefin/growth.svg",
];

/** `/<repo>/growth.svg` for every first-party repo, plus the Bluefin aliases. */
export const CHART_ROUTES = {
  ...Object.fromEntries(
    BLUEFIN_CHART_ALIASES.map((alias) => [alias, "bluefin"]),
  ),
  ...Object.fromEntries(
    PROJECTBLUEFIN_REPOS.map((repo) => [`/${repo}/growth.svg`, repo]),
  ),
};

/**
 * `/badge-endpoints/<repo>.json` for every first-party repo. Bluefin's path is
 * also in LEGACY_ROUTES, which wins in `resolveRoute`, because that badge is
 * the upstream image's.
 */
export const BADGE_ROUTES = Object.fromEntries(
  PROJECTBLUEFIN_REPOS.map((repo) => [`/badge-endpoints/${repo}.json`, repo]),
);

export function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/u, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Route descriptor: the upstream artifact to proxy, the first-party repo to
 * render, the counts document, or null when the path is unknown.
 */
export function resolveRoute(pathname) {
  const normalized = normalizePathname(pathname);

  const legacyUrl = LEGACY_ROUTES[normalized];

  if (normalized === LEGACY_THEMED_ROUTE)
    return { kind: "legacy-themed", url: LEGACY_BLUEFIN_CHART_URL };
  if (legacyUrl) return { kind: "legacy", url: legacyUrl };

  if (normalized === COUNTS_ROUTE) return { kind: "counts" };

  const chartRepo = CHART_ROUTES[normalized];
  if (chartRepo) return { kind: "chart", repo: chartRepo };

  const badgeRepo = BADGE_ROUTES[normalized];
  if (badgeRepo) return { kind: "badge", repo: badgeRepo };

  return null;
}
