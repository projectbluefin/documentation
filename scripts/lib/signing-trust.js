/**
 * signing-trust.js
 *
 * Single source of truth for the cosign trust policy of every repo that signs
 * a Project Bluefin image stream.
 *
 * Two independent consumers used to restate this policy in incompatible shapes:
 *   - scripts/fetch-github-sbom.js   (per-stream `keyless` / `cosignKeyUrl` literals)
 *   - scripts/fetch-github-images.js (per-repo KEYLESS_REPOS / KEY_REPOS inside
 *                                     buildSecurityInfo, which renders the
 *                                     `cosign verify` commands shown to users)
 * Nothing gated their agreement, so a signing-model change in one product repo
 * could leave the website publishing a verify command that does not verify.
 * Both now derive from the table below, keyed by signing repo.
 *
 * Fields:
 *   keyless         true  → GitHub OIDC / Sigstore keyless signing.
 *                   false → key-based signing; cosignKeyUrl is required.
 *   cosignKeyUrl    Public key URL for key-based repos, null for keyless ones.
 *   attestationLive true  → SLSA provenance is published to the OCI registry
 *                           and `cosign verify-attestation` resolves today.
 *                   false → signing works but attestations are not published
 *                           yet, so the command is advisory.
 */

const COSIGN_KEY_LTS =
  "https://raw.githubusercontent.com/projectbluefin/bluefin-lts/main/cosign.pub";

const SIGNING_TRUST = {
  // Mainline Bluefin streams: keyless + OCI-published SLSA attestations.
  "projectbluefin/bluefin": {
    keyless: true,
    cosignKeyUrl: null,
    attestationLive: true,
  },
  // LTS streams: traditional key-based signing with cosign.pub from the LTS
  // repo. Attestations are not published yet.
  "projectbluefin/bluefin-lts": {
    keyless: false,
    cosignKeyUrl: COSIGN_KEY_LTS,
    attestationLive: false,
  },
  // Utah: keyless, awaiting initial testing image release and OCI attestation.
  "projectbluefin/utah": {
    keyless: true,
    cosignKeyUrl: null,
    attestationLive: false,
  },
  // Dakota: keyless, but SLSA attestations reach the OCI registry only once
  // projectbluefin/dakota#391 lands (push-to-registry: true).
  "projectbluefin/dakota": {
    keyless: true,
    cosignKeyUrl: null,
    attestationLive: false,
  },
};

/**
 * Look up the trust policy for a signing repo.
 *
 * @param {string} keyRepo  "owner/repo" of the repo whose workflows sign the image.
 * @returns {{keyless: boolean, cosignKeyUrl: string|null, attestationLive: boolean}|null}
 *          null when the repo has no declared policy — callers decide whether
 *          that is fatal (spec normalisation) or a no-pipeline render.
 */
function trustForRepo(keyRepo) {
  const entry = SIGNING_TRUST[keyRepo];
  if (!entry) return null;
  return { ...entry };
}

/**
 * Trust policy for a signing repo, throwing when the repo is undeclared.
 * Used where a silent default would ship a wrong verification command.
 *
 * @param {string} keyRepo
 * @param {string} context  Human-readable location for the error message.
 */
function requireTrustForRepo(keyRepo, context) {
  const entry = trustForRepo(keyRepo);
  if (!entry) {
    throw new Error(
      `No cosign trust policy declared for signing repo "${keyRepo}"` +
        (context ? ` (${context})` : "") +
        ` — add it to scripts/lib/signing-trust.js`,
    );
  }
  return entry;
}

/** Every signing repo with a declared trust policy. */
function knownSigningRepos() {
  return Object.keys(SIGNING_TRUST);
}

module.exports = {
  COSIGN_KEY_LTS,
  SIGNING_TRUST,
  trustForRepo,
  requireTrustForRepo,
  knownSigningRepos,
};
