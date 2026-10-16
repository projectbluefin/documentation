// Input gate for the legacy `/metalink` intake. Pure: index.mjs does the D1
// round-trip so the rules can be tested without a database.
//
// `/metalink` is anonymous and cannot authenticate its callers, the same as
// `/v1/ping`. What it can do is refuse to store anything that is not shaped
// like a countme report, so one row costs a bounded number of bytes and the
// shared D1 database cannot be filled from the outside.

/** Image names, stream tags, flavors and arches: short, lowercase, no spaces. */
export const METALINK_FIELD_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/iu;

/** The Fedora countme age buckets. */
export const METALINK_BUCKET_MIN = 1;
export const METALINK_BUCKET_MAX = 4;

const MISSING = "unknown";

function field(searchParams, name) {
  const value = searchParams.get(name);
  if (value === null) return MISSING;
  return METALINK_FIELD_RE.test(value) ? value : null;
}

/**
 * The validated parameters of a `/metalink` request, or null when any present
 * parameter is malformed. A parameter that is absent keeps its historical
 * default so well-formed clients see no change.
 */
export function parseMetalinkParams(searchParams) {
  const repo = field(searchParams, "repo");
  const tag = field(searchParams, "tag");
  const flavor = field(searchParams, "flavor");
  const arch = field(searchParams, "arch");
  if (repo === null || tag === null || flavor === null || arch === null) {
    return null;
  }

  const countme = searchParams.get("countme");
  let bucket = METALINK_BUCKET_MIN;
  if (countme !== null) {
    if (!/^[1-9]\d*$/u.test(countme)) return null;
    bucket = Number(countme);
    if (bucket < METALINK_BUCKET_MIN || bucket > METALINK_BUCKET_MAX) {
      return null;
    }
  }

  const gamemode = searchParams.get("gamemode") === "1" ? 1 : 0;

  return {
    repo,
    tag,
    flavor,
    arch,
    countme: countme === null ? MISSING : countme,
    bucket,
    gamemode,
  };
}
