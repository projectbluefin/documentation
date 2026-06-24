---
title: Supply Chain Security
sidebar_label: Supply Chain
sidebar_position: 3
description: How Bluefin images are signed, verified, and attested using Sigstore, SLSA, and Syft.
---

# Supply Chain Security

Every Bluefin image is signed and attested at build time. You can verify any image before installing it.

## Signing paradigms

Bluefin uses two signing methods depending on the stream:

| Paradigm | Streams | Verification |
|---|---|---|
| **Keyless (OIDC/Sigstore)** | `stable`, `latest`, `dx`, `gdx`, all Dakota | `cosign verify` with Rekor transparency log |
| **Key-based** | `lts`, `lts-hwe` and all LTS variants | `cosign verify` with repo public key |

### Verify a keyless image (stable / latest)

```bash
cosign verify ghcr.io/ublue-os/bluefin:stable \
  --certificate-identity-regexp="https://github.com/ublue-os/bluefin/.github/workflows/build.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

### Verify an LTS image (key-based)

```bash
curl -O https://raw.githubusercontent.com/ublue-os/bluefin-lts/main/cosign.pub
cosign verify ghcr.io/ublue-os/bluefin:lts --key cosign.pub
```

### Verify Dakota

```bash
cosign verify ghcr.io/projectbluefin/dakota:latest \
  --certificate-identity-regexp="https://github.com/projectbluefin/dakota/.github/workflows/build.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

Substitute your specific tag (e.g. `stable-20260501`) for `stable` / `lts` / `latest` to pin to a known-good release.

## SLSA provenance

Keyless streams include [SLSA v1](https://slsa.dev/provenance/v1) provenance attestations stored alongside the image in GHCR. The [Driver Versions](/driver-versions) page shows per-stream attestation status verified nightly.

Fetch and inspect provenance:

```bash
cosign verify-attestation ghcr.io/ublue-os/bluefin:stable \
  --type slsaprovenance1 \
  --certificate-identity-regexp="https://github.com/ublue-os/bluefin/.github/workflows/build.yml" \
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

| Tool | Role |
|---|---|
| [cosign](https://github.com/sigstore/cosign) | Image signing and attestation verification |
| [ORAS](https://oras.land) | OCI artifact push/pull (SBOMs, provenance) |
| [Syft](https://github.com/anchore/syft) | SBOM generation |
| [SLSA](https://slsa.dev) | Provenance specification |
| [Scorecard](https://securityscorecards.dev) | Repository security posture scoring |

These are all part of the [CNCF / OpenSSF](https://openssf.org) ecosystem and are highlighted on the [Projects](/donations/projects) page.
