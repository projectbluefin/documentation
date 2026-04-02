---
title: "Bluefin LTS Now Ships Verifiable SBOMs"
slug: lts-sbom-signing
authors: castrojo
tags: [announcements, security, lts, sbom]
---

<!-- TODO: Write intro paragraph here. Suggested angle: users can now independently verify every package in their LTS image. -->

Greetings guardians!

Today we're shipping a security improvement to Bluefin LTS: every image now includes a signed Software Bill of Materials (SBOM) that you can independently verify. This brings LTS to full parity with the SBOM attestation technique already shipping in Bluefin and Aurora.

<!-- TODO: Add 1-2 sentences on why this matters for LTS users specifically (enterprise/stability focus). -->

## What Changed

<!-- TODO: Briefly describe the old approach vs. the new one. Suggested: mention we replaced the old cosign custom predicate with an OCI referrer attachment. Keep it non-technical — link to the PR instead. -->

Previously, Bluefin LTS used a custom attestation format to record SBOM data. We have replaced this with the same [ORAS](https://oras.land)-based OCI referrer attachment used across Universal Blue images. Each SBOM is:

- Attached directly to its image digest as an OCI referrer (`application/vnd.spdx+json`)
- Signed with cosign
- Accompanied by a [GitHub Actions provenance attestation](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds)

<!-- TODO: Add a sentence or two on what an SBOM tells you (list of packages, versions, provenance). -->

## How to Verify Your Image

You can verify the attestation for any Bluefin LTS image using the GitHub CLI:

```bash
# Install gh CLI if needed: https://cli.github.com

# Verify the provenance attestation
gh attestation verify oci://ghcr.io/ublue-os/bluefin:lts --repo ublue-os/bluefin-lts

# Inspect the attached SBOM referrers
oras discover --format json ghcr.io/ublue-os/bluefin:lts
```

<!-- TODO: Add example output from a successful attestation verify run, or a screenshot. -->

<!-- TODO: Add a note about what the attestation proves: that the image was built by the ublue-os/bluefin-lts GitHub Actions workflow, not a third party. -->

## Why This Matters

<!-- TODO: Expand this section. Suggested talking points:
  - Supply chain security — users can verify images weren't tampered with between build and delivery
  - SLSA provenance level
  - LTS users often have stricter compliance requirements (enterprise, education)
  - Link to CNCF supply chain security resources if relevant
-->

An SBOM lets you audit exactly what is in your image. Combined with the GitHub Actions provenance attestation, you can verify that the image you are running was built from the exact commit and workflow in the public repository — not from an unknown source.

<!-- TODO: Add a paragraph about what we are NOT doing (e.g., no SELinux policy changes, no user-facing changes to the update flow). Keep expectations clear. -->

## What's Next

<!-- TODO: Fill in roadmap items. Suggested:
  - Rolling out to all LTS variants (dx, hwe, gdx)
  - Bringing Bluefin and LTS SBOM generation fully in sync (rootfs export method)
  - SBOM data surfaced in the changelogs page on docs.projectbluefin.io
-->

<!-- TODO: Add a thank-you paragraph to contributors if appropriate. -->

## [Discussion](https://github.com/ublue-os/bluefin/discussions)

<!-- TODO: Replace the discussion link with the actual discussion thread URL once created. -->
