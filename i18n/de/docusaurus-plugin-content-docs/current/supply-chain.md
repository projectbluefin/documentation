---
title: Sicherheit der Lieferkette
sidebar_label: Lieferkette
sidebar_position: 3
description: Wie Bluefin-Abbilder mit Sigstore, SLSA und Syft signiert, überprüft und attestiert werden.
---

# Sicherheit der Lieferkette

Jedes Bluefin-Abbild wird beim Build signiert und attestiert. Du kannst jedes Abbild vor der Installation überprüfen.

## Signier-Paradigmen

Bluefin verwendet je nach Abbild zwei Signier-Methoden. Die verbindliche Tabelle liegt in `scripts/lib/signing-trust.js`, die außerdem die Befehle zur Überprüfung erzeugt, die auf der [Images](/images)-Seite angezeigt werden.

| Paradigma                   | Abbilder                                                            | Überprüfung                                   |
| --------------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| **Key-basiert**             | Bluefin Classic (`ghcr.io/ublue-os/bluefin`, `bluefin-nvidia-open`) | `cosign verify` mit dem öffentlichen Repo-Key |
| **Keyless (OIDC/Sigstore)** | Alle Dakota, alle Utah                                              | `cosign verify` mit dem Rekor-Transparenz-Log |

### Bluefin Classic überprüfen (key-basiert)

```bash
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

:::note

Classic veröffentlicht noch legacy `.sig`-Tags, die nur cosign v2.x lesen kann. Bei cosign v3 und neuer die keyless SLSA-Provenanz unten überprüfen.

:::

### Dakota überprüfen (keyless)

```bash
cosign verify ghcr.io/projectbluefin/dakota:stable \
  --certificate-identity-regexp="https://github.com/projectbluefin/dakota/.github/workflows/publish.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

Ersetze `stable` durch dein spezifisches Tag (z. B. `stable-20260501`), um an eine bekannt-gute Veröffentlichung zu pinnen.

## SLSA-Provenanz

Bluefin Classic und Dakota veröffentlichen [SLSA v1](https://slsa.dev/provenance/v1) Provenanz-Attestierungen zusammen mit dem Abbild in GHCR. Provenanz wird immer keyless über die OIDC-Identität der GitHub Actions der Signier-Repo überprüft, sogar für ein key-signiertes Abbild wie Classic. Utah veröffentlicht noch keine Provenanz. Die Seite [Driver Versions](/driver-versions) zeigt den nächtlich überprüften Attestierungsstatus pro Stream an.

Provenanz abrufen und inspizieren:

```bash
cosign verify-attestation ghcr.io/ublue-os/bluefin:stable \
  --type slsaprovenance1 \
  --certificate-identity-regexp="^https://github.com/ublue-os/bluefin/.github/workflows/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com | jq -r '.payload' | base64 -d | jq
```

## SBOM

Ein [Syft](https://github.com/anchore/syft) SPDX-JSON-SBOM wird an jedes Abbild als OCI-Attestierung angehängt. Die [Images](/images)-Seite hebt wichtige Package-Versionen hervor, die nächtlich aus diesen SBOMs extrahiert werden.

SBOM für ein beliebiges Abbild abrufen:

```bash
# Install oras: https://oras.land
oras discover --artifact-type application/vnd.syft+json ghcr.io/ublue-os/bluefin:stable
```

## OpenSSF Scorecard

Source-Repositories werden wöchentlich von [OpenSSF Scorecard](https://securityscorecards.dev) bewertet. Die Scores werden auf der [Projects](/donations/projects)-Seite angezeigt.

## Toolchain

| Tool                                         | Rolle                                           |
| -------------------------------------------- | ----------------------------------------------- |
| [cosign](https://github.com/sigstore/cosign) | Abbild-Signierung und Attestierungs-Überprüfung |
| [ORAS](https://oras.land)                    | OCI Artifact push/pull (SBOMs, Provenanz)       |
| [Syft](https://github.com/anchore/syft)      | SBOM-Generierung                                |
| [SLSA](https://slsa.dev)                     | Provenanz-Spezifikation                         |
| [Scorecard](https://securityscorecards.dev)  | Bewertung der Repository-Sicherheitslage        |

Alle gehören zum [CNCF / OpenSSF](https://openssf.org)-Ökosystem und werden auf der [Projects](/donations/projects)-Seite angezeigt.
