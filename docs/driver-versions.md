---
tags:
  - drivers
last_updated: 2026-01-21
---

# Driver Versions

This page tracks major driver versions across Bluefin releases to help users identify and switch to specific driver versions.

## Overview

[@ublue-os/bluefin](https://github.com/ublue-os/bluefin) and [@ublue-os/bluefin-lts](https://github.com/ublue-os/bluefin-lts) publish detailed changelogs with every release that include kernel versions, Mesa driver versions, and NVIDIA driver versions. This report consolidates that information for the most recent stable, GTS, and LTS releases to help users troubleshoot driver-specific issues or test specific configurations.

## Bluefin

| Image Tag | Kernel Version | NVIDIA Driver | Mesa Version |
|-----------|----------------|---------------|--------------|
| [**stable-20260120**](https://github.com/ublue-os/bluefin/releases/tag/stable-20260120) | 6.17.11-300 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20260113**](https://github.com/ublue-os/bluefin/releases/tag/stable-20260113) | 6.17.11-300 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20260106**](https://github.com/ublue-os/bluefin/releases/tag/stable-20260106) | 6.17.8-300 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251230**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251230) | 6.17.8-300 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251223**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251223) | 6.17.8-300 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251216**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251216) | 6.17.7-300 | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258752/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251209**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251209) | 6.17.7-300 | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258750/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251204**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251204) | 6.17.7-300 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251202**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251202) | 6.17.7-300 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.7-1](https://docs.mesa3d.org/relnotes/25.2.7.html) |
| [**stable-20251125**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251125) | 6.17.1-300 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.6-1](https://docs.mesa3d.org/relnotes/25.2.6.html) |
| [**stable-20251119**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251119) | 6.17.1-300 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.6-1](https://docs.mesa3d.org/relnotes/25.2.6.html) |
| [**stable-20251024**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251024) | 6.16.8-200 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20251021**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251021) | 6.16.8-200 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20251012**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251012) | 6.16.7-200 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.1.9](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20251005**](https://github.com/ublue-os/bluefin/releases/tag/stable-20251005) | 6.16.7-200 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.1.9](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20250928**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250928) | 6.15.10-200 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.1.9](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20250921**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250921) | 6.15.10-200 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.1.9](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**stable-20250914**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250914) | 6.15.9-201 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.1.7](https://docs.mesa3d.org/relnotes/25.1.7.html) |
| [**stable-20250907**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250907) | 6.15.9-201 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.1.7](https://docs.mesa3d.org/relnotes/25.1.7.html) |
| [**stable-20250831**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250831) | 6.14.11-300 | [580.76.05-2](https://www.nvidia.com/en-us/drivers/details/252613/) | [25.1.7](https://docs.mesa3d.org/relnotes/25.1.7.html) |
| [**stable-20250824**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250824) | 6.14.11-300 | [580.76.05-2](https://www.nvidia.com/en-us/drivers/details/252613/) | [25.1.7](https://docs.mesa3d.org/relnotes/25.1.7.html) |
| [**stable-20250819**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250819) | 6.14.11-300 | [580.76.05-1](https://www.nvidia.com/en-us/drivers/details/252613/) | [25.1.4](https://docs.mesa3d.org/relnotes/25.1.4.html) |
| [**stable-20250817**](https://github.com/ublue-os/bluefin/releases/tag/stable-20250817) | 6.14.11-300 | [580.76.05-1](https://www.nvidia.com/en-us/drivers/details/252613/) | [25.1.4](https://docs.mesa3d.org/relnotes/25.1.4.html) |

## Bluefin GTS

| Image Tag | Kernel Version | NVIDIA Driver | Mesa Version |
|-----------|----------------|---------------|--------------|
| [**gts-20260120**](https://github.com/ublue-os/bluefin/releases/tag/gts-20260120) | 6.17.11-200 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20260108**](https://github.com/ublue-os/bluefin/releases/tag/gts-20260108) | 6.17.11-200 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20260106**](https://github.com/ublue-os/bluefin/releases/tag/gts-20260106) | 6.17.8-200 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251230**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251230) | 6.17.8-200 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251223**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251223) | 6.17.8-200 | [590.48.01-1](https://www.nvidia.com/en-us/drivers/details/259268/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251216**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251216) | 6.17.7-200 | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258752/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251209**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251209) | 6.17.7-200 | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258750/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251204**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251204) | 6.17.7-200 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251202**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251202) | 6.17.7-200 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251125**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251125) | 6.17.1-300 | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251028**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251028) | 6.16.8-200 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.1.9-1](https://docs.mesa3d.org/relnotes/25.1.9.html) |
| [**gts-20251021**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251021) | 6.16.8-100 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7-1](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20251012**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251012) | 6.16.7-100 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20251005**](https://github.com/ublue-os/bluefin/releases/tag/gts-20251005) | 6.16.7-100 | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250928**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250928) | 6.15.10-100 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250921**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250921) | 6.15.10-100 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250914**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250914) | 6.15.9-101 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250907**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250907) | 6.15.9-101 | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250831**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250831) | 6.14.11-200 | [580.76.05-2](https://www.nvidia.com/en-us/drivers/details/252613/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**gts-20250824**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250824) | 6.14.11-200 | [580.76.05-2](https://www.nvidia.com/en-us/drivers/details/252613/) | 25.0.7 |
| [**gts-20250819**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250819) | 6.14.11-200 | [580.76.05-1](https://www.nvidia.com/en-us/drivers/details/252613/) | 25.0.7 |
| [**gts-20250817**](https://github.com/ublue-os/bluefin/releases/tag/gts-20250817) | 6.14.11-200 | [580.76.05-1](https://www.nvidia.com/en-us/drivers/details/252613/) | 25.0.7 |

## Bluefin LTS

| Image Tag | Kernel Version | NVIDIA Driver | Mesa Version |
|-----------|----------------|---------------|--------------|
| [**lts.20251223**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251223) | 6.12.0-172 (HWE: 6.17.8-200.fc42) | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258752/) | [25.2.5-3](https://docs.mesa3d.org/relnotes/25.2.5.html) |
| [**lts.20251214**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251214) | 6.12.0-170 (HWE: 6.17.7-200.fc42) | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258752/) | [25.2.5-3](https://docs.mesa3d.org/relnotes/25.2.5.html) |
| [**lts.20251209**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251209) | 6.12.0-164 (HWE: 6.17.7-200.fc42) | [590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258750/) | [25.2.5-3](https://docs.mesa3d.org/relnotes/25.2.5.html) |
| [**lts.20251202**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251202) | 6.12.0-164 (HWE: 6.17.7-200.fc42) | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.5-3](https://docs.mesa3d.org/relnotes/25.2.5.html) |
| [**lts.20251125**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251125) | 6.12.0-161 (HWE: 6.17.1-300.fc42) | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.2.5-2](https://docs.mesa3d.org/relnotes/25.2.5.html) |
| [**lts.20251118**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251118) | 6.12.0-157 (HWE: 6.16.10-200.fc42) | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.0.7-5](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20251110**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251110) | 6.12.0-150 (HWE: 6.16.10-200.fc42) | [580.105.08-1](https://www.nvidia.com/en-us/drivers/details/257493/) | [25.0.7-5](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20251027**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251027) | 6.12.0-142 (HWE: 6.16.8-1) | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7-5](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20251006**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251006) | 6.12.0-134 (HWE: 6.16.7-1) | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20251003**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20251003) | 6.12.0-134 (HWE: 6.16.7-1) | [580.95.05-1](https://www.nvidia.com/en-us/drivers/details/254665/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250930**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250930) | 6.12.0-134 (HWE: 6.15.10-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250916**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250916) | 6.12.0-128 (HWE: 6.15.10-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250910**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250910) | 6.12.0-126 (HWE: 6.15.9-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250909**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250909) | 6.12.0-126 (HWE: 6.15.11-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250908**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250908) | 6.12.0-126 (HWE: 6.15.11-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250907**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250907) | 6.12.0-126 (HWE: 6.15.11-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250905**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250905) | 6.12.0-126 (HWE: 6.15.11-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |
| [**lts.20250903**](https://github.com/ublue-os/bluefin-lts/releases/tag/lts.20250903) | 6.12.0-124 (HWE: 6.15.11-1) | [580.82.07-2](https://www.nvidia.com/en-us/drivers/details/253003/) | [25.0.7](https://docs.mesa3d.org/relnotes/25.0.7.html) |

:::info NVIDIA Availability
NVIDIA driver versions are only listed in NVIDIA-specific image variants. Non-NVIDIA images do not include kmod-nvidia packages. The most recent releases include NVIDIA driver **[590.44.01-1](https://www.nvidia.com/en-us/drivers/details/258750/)** (Beta) across all channels.
:::

## How to Switch to a Specific Version

To switch to any of these versions, use the `bootc switch` command with signature enforcement based on [@bootc-dev/bootc](https://github.com/containers/bootc):

### Bluefin Stream

```bash
# Get your current image name
IMAGE_NAME=$(jq -r '."image-name"' < /usr/share/ublue-os/image-info.json)

# Switch to latest stable (currently stable-20251012)
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:stable

# Switch to a specific stable version
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:stable-20251012

# Switch to an older stable version (e.g., stable-20250928)
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:stable-20250928

# Reboot to apply changes
sudo systemctl reboot
```

### Bluefin GTS Stream 

```bash
# Get your current image name
IMAGE_NAME=$(jq -r '."image-name"' < /usr/share/ublue-os/image-info.json)

# Switch to latest GTS
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:gts

# Switch to a specific GTS version
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:gts-20251012

# Reboot to apply changes
sudo systemctl reboot
```

### Bluefin LTS Stream

```bash
# Get your current image name
IMAGE_NAME=$(jq -r '."image-name"' < /usr/share/ublue-os/image-info.json)

# Switch to latest LTS
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:lts

# Switch to a specific LTS version
sudo bootc switch --enforce-container-sigpolicy ghcr.io/ublue-os/$IMAGE_NAME:lts.20251006

# Reboot to apply changes
sudo systemctl reboot
```

:::tip Finding Your Current Version
Check your current Bluefin version with:
```bash
bootc status
```
:::

:::info Signature Enforcement
The `--enforce-container-sigpolicy` flag ensures you're always running a signed image, maintaining security and integrity of your system.
:::

## Testing & Rollback Strategy

### For Users Testing Driver Issues

1. **Identify the suspected problematic version** from the table above
2. **Switch to the previous stable version** using `bootc switch`
3. **Test your specific use case** (desktop performance, hardware compatibility, etc.)
4. **Report findings** in the [@ublue-os/bluefin](https://github.com/ublue-os/bluefin) issue tracker with specific version numbers

## References

- [@ublue-os/bluefin](https://github.com/ublue-os/bluefin) - Stable and GTS releases
- [@ublue-os/bluefin-lts](https://github.com/ublue-os/bluefin-lts) - LTS releases
- [Bluefin Releases](https://github.com/ublue-os/bluefin/releases) - Stable/GTS releases
- [Bluefin LTS Releases](https://github.com/ublue-os/bluefin-lts/releases) - LTS releases
- [Bluefin Documentation](https://docs.projectbluefin.io/) - Official docs
- [Bluefin LTS Documentation](https://docs.projectbluefin.io/lts) - LTS-specific docs
- [@bootc-dev/bootc](https://github.com/containers/bootc) - Bootc reference







