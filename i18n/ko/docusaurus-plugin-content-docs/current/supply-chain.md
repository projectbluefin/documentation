---
title: 공급망 보안
sidebar_label: 공급망 보안
sidebar_position: 3
description: Bluefin 이미지가 Sigstore, SLSA, Syft를 사용해 어떻게 서명·검증·감사되는지 설명합니다.
---

# 공급망 보안

모든 Bluefin 이미지는 빌드 시점에 서명되고 감사(attestation)됩니다. 설치하기 전에 모든 이미지를 검증할 수 있습니다.

## 서명 방식

Bluefin은 이미지에 따라 두 가지 서명 방식을 사용합니다. 권위 있는 표는 `scripts/lib/signing-trust.js`에 있으며, 여기에서 [Images](/images) 페이지에 표시되는 검증 명령도 생성합니다.

| 방식                       | 이미지                                                              | 검증                                     |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| **키 기반**                | Bluefin Classic (`ghcr.io/ublue-os/bluefin`, `bluefin-nvidia-open`) | 저장소 공개 키로 `cosign verify` 실행    |
| **키리스 (OIDC/Sigstore)** | 모든 Dakota, 모든 Utah                                              | Rekor 투명성 로그로 `cosign verify` 실행 |

### Bluefin Classic 검증 (키 기반)

```bash
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

:::note

Classic는 여전히 레거시 `.sig` 태그를 게시하며, 이 태그는 cosign v2.x에서만 읽을 수 있습니다. cosign v3 이상에서는 아래에 설명된 keyless SLSA 인증을 검증하세요.

:::

### Dakota 검증 (keyless)

```bash
cosign verify ghcr.io/projectbluefin/dakota:stable \
  --certificate-identity-regexp="https://github.com/projectbluefin/dakota/.github/workflows/publish.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

`stable` 대신 특정 태그(예: `stable-20260501`)를 알려진 안전한 릴리스로 고정하세요.

## SLSA 위임 증명

Bluefin Classic과 Dakota는 이미지와 함께 [SLSA v1](https://slsa.dev/provenance/v1) 위임 증명 감사를 GHCR에 게시합니다. 위임 증명은 항상 서명 저장소의 GitHub Actions OIDC 신원에 따라 keyless로 검증되며, Classic처럼 키로 서명된 이미지에서도 그렇습니다. Utah는 아직 위임 증명을 게시하지 않습니다. [Driver Versions](/driver-versions) 페이지에서 스트림별 감사 상태를 밤마다 검증합니다.

위임 증명을 가져와 확인하세요:

```bash
cosign verify-attestation ghcr.io/ublue-os/bluefin:stable \
  --type slsaprovenance1 \
  --certificate-identity-regexp="^https://github.com/ublue-os/bluefin/.github/workflows/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com | jq -r '.payload' | base64 -d | jq
```

## SBOM

[Syft](https://github.com/anchore/syft) SPDX JSON SBOM이 각 이미지에 OCI 감사로 첨부됩니다. [Images](/images) 페이지에서는 밤마다 이 SBOM에서 추출한 주요 패키지 버를 표시합니다.

모든 이미지의 SBOM을 가져오세요:

```bash
# Install oras: https://oras.land
oras discover --artifact-type application/vnd.syft+json ghcr.io/ublue-os/bluefin:stable
```

## OpenSSF Scorecard

소스 저장소는 매주 [OpenSSF Scorecard](https://securityscorecards.dev)로 점수를 받습니다. 점수는 [Projects](/donations/projects) 페이지에서 확인할 수 있습니다.

## 도구 체인

| 도구                                         | 역할                                            |
| -------------------------------------------- | ----------------------------------------------- |
| [cosign](https://github.com/sigstore/cosign) | 이미지 서명 및 감사 검증                        |
| [ORAS](https://oras.land)                    | OCI 아티팩트 올리기/가져오기 (SBOM, provenance) |
| [Syft](https://github.com/anchore/syft)      | SBOM 생성                                       |
| [SLSA](https://slsa.dev)                     | 위임 증명 규격                                  |
| [Scorecard](https://securityscorecards.dev)  | 저장소 보안 태도 점수                           |

이 모든 도구는 [CNCF / OpenSSF](https://openssf.org) 생태계의 일부이며, [Projects](/donations/projects) 페이지에서 확인할 수 있습니다.
