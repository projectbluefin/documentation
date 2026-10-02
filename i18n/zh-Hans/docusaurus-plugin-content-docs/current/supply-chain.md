---
title: 供应链安全
sidebar_label: Supply Chain
sidebar_position: 3
description: Bluefin 镜像如何使用 Sigstore、SLSA 和 Syft 进行签名、验证和出具证明。
---

# 供应链安全

每个 Bluefin 镜像在构建时都会签名并出具证明。你可以在安装之前验证任何镜像。

## 签名范式

Bluefin 根据镜像使用两种签名方式。权威表格位于 `scripts/lib/signing-trust.js`，它还会生成 [Images](/images) 页面上显示的验证命令。

| 范式                    | 镜像                                                              | 验证                                |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| **Key-based**               | Bluefin Classic（`ghcr.io/ublue-os/bluefin`、`bluefin-nvidia-open`） | 使用仓库公钥的 `cosign verify`        |
| **Keyless (OIDC/Sigstore)** | 所有 Dakota、所有 Utah                                                | 使用 Rekor 透明日志的 `cosign verify` |

### 验证 Bluefin Classic（基于密钥）

```bash
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

:::note

Classic 仍会发布遗留的 `.sig` 标签，只有 cosign v2.x 能读取。在 cosign v3 及更新版本中，改为验证下面描述的 keyless SLSA provenance。

:::

### 验证 Dakota（keyless）

```bash
cosign verify ghcr.io/projectbluefin/dakota:stable \
  --certificate-identity-regexp="https://github.com/projectbluefin/dakota/.github/workflows/publish.yml" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com
```

将你的具体标签（例如 `stable-20260501`）替换 `stable`，以固定到已知的良好版本。

## SLSA provenance

Bluefin Classic 和 Dakota 在 GHCR 中与镜像一同发布 [SLSA v1](https://slsa.dev/provenance/v1) provenance 证明。provenance 始终以 keyless 方式验证，通过签名仓库的 GitHub Actions OIDC 身份进行验证，即便是像 Classic 这样基于密钥签名的镜像也是如此。Utah 目前尚未发布 provenance。[Driver Versions](/driver-versions) 页面显示每晚验证的按流证明状态。

获取并检查 provenance：

```bash
cosign verify-attestation ghcr.io/ublue-os/bluefin:stable \
  --type slsaprovenance1 \
  --certificate-identity-regexp="^https://github.com/ublue-os/bluefin/.github/workflows/" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com | jq -r '.payload' | base64 -d | jq
```

## SBOM

[Syft](https://github.com/anchore/syft) SPDX JSON SBOM 作为 OCI 证明附加在每个镜像上。[Images](/images) 页面每晚展示从这些 SBOM 中提取的关键包版本。

获取任何镜像的 SBOM：

```bash
# Install oras: https://oras.land
oras discover --artifact-type application/vnd.syft+json ghcr.io/ublue-os/bluefin:stable
```

## OpenSSF Scorecard

源代码仓库每周由 [OpenSSF Scorecard](https://securityscorecards.dev) 打分。分数展示在 [Projects](/donations/projects) 页面上。

## 工具链

| Tool                                         | Role                                       |
| -------------------------------------------- | ------------------------------------------ |
| [cosign](https://github.com/sigstore/cosign) | Image signing and attestation verification |
| [ORAS](https://oras.land)                    | OCI artifact push/pull (SBOMs, provenance) |
| [Syft](https://github.com/anchore/syft)      | SBOM generation                            |
| [SLSA](https://slsa.dev)                     | Provenance specification                   |
| [Scorecard](https://securityscorecards.dev)  | Repository security posture scoring        |

这些都是 [CNCF / OpenSSF](https://openssf.org) 生态系统的一部分，并在 [Projects](/donations/projects) 页面上被突出显示。
