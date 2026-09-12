/**
 * Where a count is allowed to come from.
 *
 * This module exists because the rule kept being restated in prose and kept
 * being broken anyway. It is now one exported constant with a test behind it.
 *
 * ## The rule
 *
 * **Every Project Bluefin number comes from our own deployment —
 * `countme.projectbluefin.io` and the D1 database behind it — and nothing
 * else.**
 *
 * There is exactly one exception, and it is not ours to begin with:
 * `ublue-os/bluefin:stable`, the upstream pre-migration image, whose number
 * comes from `ublue-os/countme`'s published badge endpoint.
 *
 * Fedora's `totals.csv`, EPEL mirror hits, and every other `ublue-os/countme`
 * series are **not** permitted sources for anything. They undercount bootc,
 * drop CS10/EPEL metalinks, and cannot see stream, flavor, or game mode at all.
 *
 * Source: `projectbluefin/common` → `docs/skills/image-registry.md`, "Policy on
 * Upstream Counts".
 *
 * ## Why this is a module and not a paragraph
 *
 * The prose version of this rule has been in `common` for months. In that time
 * `scripts/fetch-countme.js` grew a `NON_FEDORA_VARIANTS` exemption whose only
 * purpose was to sum Bluefin LTS across EPEL repos, and `/analytics` published
 * the result as "Bluefin LTS: 165 systems". A paragraph cannot fail a build.
 * `scripts/countme-first-party.test.js` can.
 */

/** The one upstream series anyone may publish, and its canonical endpoint. */
export const UPSTREAM_ALLOWED = Object.freeze({
  id: "ublue-os/bluefin:stable",
  label: "ublue-os/bluefin:stable",
  source:
    "https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin.json",
  note: "Upstream pre-migration image. Counted by ublue-os/countme, not by us.",
});

/** Our deployment. Every projectbluefin image is counted here or not at all. */
export const FIRST_PARTY = Object.freeze({
  origin: "https://countme.projectbluefin.io",
  ingest: "https://countme.projectbluefin.io/metalink",
  note: "Cloudflare Worker + D1. Records repo, tag, flavor, arch, gamemode, age bucket.",
});

/**
 * Sources that must never produce a published number.
 *
 * Matched as substrings against any `source` a dataset claims, so a pipeline
 * cannot quietly reintroduce one by reformatting the URL.
 */
export const FORBIDDEN_SOURCES = Object.freeze([
  "data-analysis.fedoraproject.org",
  "mirrors.fedoraproject.org",
  "countme/totals.csv",
]);

/**
 * Repo identifiers owned by `projectbluefin`, as the first-party service records
 * them in its `repo` parameter.
 */
export const PROJECTBLUEFIN_REPOS = Object.freeze([
  "bluefin",
  "bluefin-lts",
  "dakota",
  "utah",
  "server",
]);

/**
 * True when a count for `repo` may come from `source`.
 *
 * The only allowed pairing is the upstream image with the upstream badge.
 * Everything else must carry the first-party origin.
 */
export function isPermittedSource(repo, source) {
  const s = String(source ?? "");
  if (repo === UPSTREAM_ALLOWED.id) return s === UPSTREAM_ALLOWED.source;
  return s.startsWith(FIRST_PARTY.origin);
}

/**
 * The reason a panel shows when a first-party count is not available yet.
 *
 * `countme.projectbluefin.io/metalink` is live and writing to D1, but the
 * service publishes no read endpoint, so nothing can query it. Until it does,
 * the honest render is an unavailable panel that says why — never a substituted
 * upstream number.
 */
export const FIRST_PARTY_PENDING_REASON =
  "Counted by countme.projectbluefin.io, which is collecting but does not yet " +
  "publish a read endpoint. Fedora and ublue-os numbers are not a permitted " +
  "substitute for a Project Bluefin image.";
