---
title: Supply Chain Security
sidebar_label: Supply Chain
sidebar_position: 3
description: How Bluefin images are signed, verified, and attested using Sigstore, SLSA, and Syft.
---

# Supply Chain Security

Every Bluefin image is signed and attested at build time. You can verify any image before installing it.

## Signing paradigms

Bluefin uses two signing methods depending on the image. The authoritative table lives in `scripts/lib/signing-trust.js`, which also generates the verify commands shown on the [Images](/images) page.

| Paradigm                    | Images                                                              | Verification                                |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| **Key-based**               | Bluefin Classic (`ghcr.io/ublue-os/bluefin`, `bluefin-nvidia-open`) | `cosign verify` with repo public key        |
| **Keyless (OIDC/Sigstore)** | Bluefin LTS, all Dakota, all Utah                                   | `cosign verify` with Rekor transparency log |

### Verify Bluefin Classic (key-based)

```bash
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

:::note

Classic still publishes legacy `.sig` tags, which only cosign v2.x can read. On cosign v3 and newer, verify the keyless SLSA provenance described below instead.

:::

### Verify an LTS image (keyless)

```bash
cosign verify ghcr.io/projectbluefin/bluefin-lts:stable \
  --certificate-identity-regexp="^https://github.com/projectbluefin/bluefin-lts/.github/workflows/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

### Verify Dakota (keyless)

```bash
cosign verify ghcr.io/projectbluefin/dakota:stable \
  --certificate-identity-regexp="https://github.com/projectbluefin/dakota/.github/workflows/publish.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

Substitute your specific tag (e.g. `stable-20260501`) for `stable` to pin to a known-good release.

## SLSA provenance

Bluefin Classic and Dakota publish [SLSA v1](https://slsa.dev/provenance/v1) provenance attestations alongside the image in GHCR. Provenance is always verified keylessly through the signing repo's GitHub Actions OIDC identity, even for a key-signed image like Classic. LTS and Utah do not publish provenance yet. The [Driver Versions](/driver-versions) page shows per-stream attestation status verified nightly.

Fetch and inspect provenance:

```bash
cosign verify-attestation ghcr.io/ublue-os/bluefin:stable \
  --type slsaprovenance1 \
  --certificate-identity-regexp="^https://github.com/ublue-os/bluefin/.github/workflows/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com | jq -r '.payload' | base64 -d | jq
```

## SBOM

A [Syft](https://github.com/anchore/syft) SPDX JSON SBOM is attached to each image as an OCI attestation. The [Images](/images) page surfaces key package versions extracted from these SBOMs nightly.

Fetch the SBOM for any image:

```bash
# Install oras: https://oras.land
oras discover --artifact-type application/vnd.syft+json ghcr.io/ublue-os/bluefin:stable
```

## OpenSSF Scorecard

Source repositories are scored weekly by [OpenSSF Scorecard](https://securityscorecards.dev). Scores are surfaced on the [Projects](/donations/projects) page.

## Toolchain

| Tool                                         | Role                                       |
| -------------------------------------------- | ------------------------------------------ |
| [cosign](https://github.com/sigstore/cosign) | Image signing and attestation verification |
| [ORAS](https://oras.land)                    | OCI artifact push/pull (SBOMs, provenance) |
| [Syft](https://github.com/anchore/syft)      | SBOM generation                            |
| [SLSA](https://slsa.dev)                     | Provenance specification                   |
| [Scorecard](https://securityscorecards.dev)  | Repository security posture scoring        |

These are all part of the [CNCF / OpenSSF](https://openssf.org) ecosystem and are highlighted on the [Projects](/donations/projects) page.
