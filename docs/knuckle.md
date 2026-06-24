---
title: Knuckle — Flatcar Server Installer
slug: /knuckle
---

# Knuckle

**Knuckle** is an interactive TUI installer for [Flatcar Container Linux](https://www.flatcar.org/) — the CNCF-hosted, container-optimized OS. It gives you an Ubuntu-style guided install experience without requiring you to write Ignition configs by hand.

:::info[Early release]
Knuckle is pre-alpha. All feedback and contributions are welcome at [projectbluefin/knuckle](https://github.com/projectbluefin/knuckle).
:::

## Why Flatcar?

Flatcar is in the [CNCF](https://cncf.io) — a vendor-neutral foundation that means long-term stability. It's designed to run anything: plop anything from [linuxserver.io](https://www.linuxserver.io/) on it, build a home NAS, set up a k8s cluster, or run a personal cloud. The [Flatcar Bakery](https://flatcar.github.io/sysext-bakery/) provides system extensions for Docker, Kubernetes, Tailscale, NVIDIA drivers, and more.

## Requirements

| Component | Requirement |
|---|---|
| Architecture | x86\_64 or ARM64 |
| Boot | UEFI only (no legacy BIOS) |
| Storage | One target disk (single-disk install) |
| Network | DHCP or static IPv4 |
| RAM | 2 GB minimum |

## Installing from the ISO (recommended)

1. **Download the installer ISO** from the [knuckle releases page](https://github.com/projectbluefin/knuckle/releases) — pick `knuckle-installer-stable.iso` for amd64 or the arm64 variant.

2. **Verify the ISO** (optional but recommended). Each release is signed with [cosign](https://docs.sigstore.dev/cosign/system_config/installation/) keyless signing via GitHub Actions OIDC. After downloading the ISO and its `.bundle` file:
   ```bash
   cosign verify-blob \
     --bundle knuckle-installer-stable.iso.bundle \
     --certificate-identity-regexp \
       "https://github.com/projectbluefin/knuckle/.github/workflows/release.yml@refs/tags/.*" \
     --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
     knuckle-installer-stable.iso
   ```
   A `Verified OK` result confirms the ISO was produced by the official release workflow and has not been tampered with.

3. **Write to USB** using your preferred tool:
   ```bash
   # Linux/macOS
   sudo dd if=knuckle-installer-stable.iso of=/dev/sdX bs=4M status=progress
   ```
   Or use [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer) / [Balena Etcher](https://etcher.balena.io/).

4. **Boot** from the USB. Knuckle starts automatically and walks you through a 9-step guided wizard:
   - Welcome → Network → Storage → User → System Extensions → Update Strategy → Review → Install → Done

5. **Follow the wizard.** You'll configure your hostname, timezone, disk, network, SSH keys (fetched from GitHub or entered manually), and any system extensions from the Flatcar Bakery.

6. **Review the generated Butane config** before confirming — then Knuckle handles the rest.

After install, you'll have a pristine upstream Flatcar Linux system.

## Headless / automated installs

For CI/CD or scripted bare-metal provisioning, Knuckle supports a fully unattended install via a JSON config file:

```bash
knuckle --headless --config install.json
```

Minimal `install.json`:

```json
{
  "hostname": "flatcar-01",
  "disk": "/dev/disk/by-id/ata-SomeSeagate_1TB",
  "channel": "stable",
  "network": {"mode": "dhcp"},
  "users": [
    {
      "username": "core",
      "ssh_keys": ["ssh-ed25519 AAAA..."]
    }
  ],
  "update_strategy": "reboot"
}
```

For the full config schema — static IP, sysexts, Tailscale, swap, NVIDIA drivers, external Ignition URL — see [`docs/HEADLESS-CONFIG.md`](https://github.com/projectbluefin/knuckle/blob/main/docs/HEADLESS-CONFIG.md) in the knuckle repo.

## Further reading

- [knuckle README](https://github.com/projectbluefin/knuckle) — CLI flags, architecture overview, VM testing
- [HEADLESS-CONFIG.md](https://github.com/projectbluefin/knuckle/blob/main/docs/HEADLESS-CONFIG.md) — complete headless JSON schema reference
- [SECURITY.md](https://github.com/projectbluefin/knuckle/blob/main/docs/SECURITY.md) — supply-chain verification and release signing
- [Flatcar docs](https://www.flatcar.org/docs/) — upstream OS documentation
- [Flatcar Discord](https://flatcar.org/discord) — community chat
