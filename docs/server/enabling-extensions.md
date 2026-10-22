---
mdx:
  format: md
title: "Enabling Extensions"
slug: /server/enabling-extensions
description: "How to enable and operate optional system extensions on Bluefin Server, including ZFS, NVIDIA, Kubernetes, containers, and development tools."
---

# Enabling Extensions

Bluefin Server ships a minimal base OS. Workloads and optional subsystems run as **system extensions** (`systemd-sysext`) that overlay `/usr` and `/opt` without modifying the immutable OS image.

Extensions can be enabled on installed nodes via `updatectl` (or `systemd-sysupdate`), provisioned at boot via Ignition or Booty, or merged manually.

---

## Extension Overview

Bluefin Server provides two categories of extensions:

1. **Image-locked extensions**: Locked to the specific OS version and kernel build (`<name>_<image-version>.raw`). Updates move in lockstep with the OS and roll back automatically if an update fails.
2. **Independent extensions**: Built with `ID=_any` and update independently of the base OS image.

| Extension | Type | Feature Name | Description |
| --- | --- | --- | --- |
| **OpenZFS** | Image-locked | `zfs` | OpenZFS kernel modules and userland utilities (`zpool`, `zfs`). |
| **NVIDIA Driver** | Image-locked | `nvidia-open-595` | Open kernel modules, userspace libraries, and `nvidia-smi`. |
| **NVIDIA Container Toolkit** | Independent | `nvidia-container-toolkit` | CDI integration and containerd runtime hooks. |
| **k0s** | Independent | `k0s` | Single-binary Kubernetes cluster distribution. |
| **kubeadm** | Image-locked | `kubeadm` | Kubernetes node stack: kubelet, kubeadm, containerd, runc, CNI. |
| **Homelab Profile** | Image-locked | `homelab` | Automated cluster orchestration and component manager. |
| **Argo Workflows** | Image-locked | `argo-workflows` | Argo Workflows controller and UI (homelab add-on). |
| **Kubernetes MCP** | Image-locked | `mcp` | Kubernetes Model Context Protocol server (homelab add-on). |
| **KubeStellar** | Image-locked | `kubestellar` | KubeStellar multi-cluster console and controller (homelab add-on). |
| **Podman** | Image-locked | `podman` | Rootless Podman daemon and socket. |
| **Docker** | Image-locked | `docker` | Rootless Docker engine daemon and socket. |
| **Homebrew** | Image-locked | `homebrew` | Homebrew package manager integration for non-root users. |

---

## Listing Available Extensions

On any running Bluefin Server node, inspect available sysupdate features:

```bash
updatectl features
```

To see which extensions are currently loaded into `/usr`:

```bash
systemd-sysext status
```

---

## Enabling Extensions on Installed Nodes

### Method 1: Using `updatectl` (Recommended)

`updatectl` enables features in `/etc/sysupdate.d/<feature>.feature.d/`:

```bash
# Enable OpenZFS
sudo updatectl enable zfs

# Enable NVIDIA driver
sudo updatectl enable nvidia-open-595

# Enable kubeadm
sudo updatectl enable kubeadm

# Enable rootless container engines
sudo updatectl enable podman
# or
sudo updatectl enable docker
```

To disable an extension:

```bash
sudo updatectl disable <feature>
```

### Method 2: Manual Drop-in Configuration

You can also enable a feature by creating a drop-in config file:

```bash
sudo mkdir -p /etc/sysupdate.d/zfs.feature.d
cat << 'EOF' | sudo tee /etc/sysupdate.d/zfs.feature.d/enable.conf
[Feature]
Enabled=true
EOF
```

### Fetching Extensions for the Running OS

Enabling a feature schedules it for inclusion in subsequent OS updates. To fetch and merge the extension immediately for the **currently running image version**:

```bash
# Trigger immediate fetch and merge
sudo systemctl restart bluefin-sysext-fetch.service

# Verify the extension is merged
systemd-sysext status
```

---

## Independent Extensions (k0s & NVIDIA Toolkit)

Independent extensions track separate release versions from the base OS and update via dedicated sysupdate components:

### k0s Kubernetes

```bash
# Download and update the k0s sysext
sudo systemd-sysupdate --component=k0s update

# Activate k0s on the host
sudo systemctl enable --now k0s-first-boot.service
```

See the [k0s runbook](/server/k0s-sysext-ops) for controller vs. worker joining.

### NVIDIA Container Toolkit (CDI)

```bash
# Download and update the toolkit sysext
sudo systemd-sysupdate --component=nvidia-container-toolkit update

# Activate CDI and containerd integration
sudo systemctl enable --now nvidia-container-toolkit-activate.service
```

See [NVIDIA sysexts](/server/nvidia-sysext) for driver branch selection and CDI container execution.

---

## Extension-Specific Instructions

### OpenZFS (`zfs`)

1. **Enable and fetch**:
   ```bash
   sudo updatectl enable zfs
   sudo systemctl restart bluefin-sysext-fetch.service
   ```
2. **Module loading**:
   Kernel modules for extensions are managed by `/usr/libexec/bluefin-sysext-modules`. Do not run bare `modprobe zfs`. The modules load automatically via `zfs-load-module.service`.
   ```bash
   # Check module status
   systemctl status zfs-load-module.service
   lsmod | grep zfs
   ```
3. **ZFS services**:
   The sysext automatically enables `zfs.target`, `zfs-import-scan.service`, `zfs-mount.service`, and `zfs-zed.service`. Use `zpool` and `zfs` commands normally:
   ```bash
   sudo zpool status
   ```

### NVIDIA Drivers (`nvidia-open-*`)

1. **Enable one driver flavour**:
   Only merge one NVIDIA driver branch per node (e.g. `nvidia-open-595`). Merging multiple branches triggers `nvidia-flavour-guard.service` failure.
   ```bash
   sudo updatectl enable nvidia-open-595
   sudo systemctl restart bluefin-sysext-fetch.service
   ```
2. **Container runtime**:
   Pair with the NVIDIA Container Toolkit for container access:
   ```bash
   sudo systemd-sysupdate --component=nvidia-container-toolkit update
   sudo systemctl enable --now nvidia-container-toolkit-activate.service
   ```
3. **Verify**:
   ```bash
   nvidia-smi
   ```

### Rootless Podman and Docker

The `podman` and `docker` extensions run rootless per-user and do not interfere with Kubernetes containerd:

1. **Enable the feature**:
   ```bash
   sudo updatectl enable podman
   # or
   sudo updatectl enable docker
   sudo systemctl restart bluefin-sysext-fetch.service
   ```
2. **Enable user service** (run as the unprivileged user):
   ```bash
   # Enable systemd user lingering if not already set
   loginctl enable-linger $USER

   # Start the user socket
   systemctl --user daemon-reload
   systemctl --user enable --now bluefin-podman.socket
   # or for Docker:
   systemctl --user enable --now bluefin-docker.service
   ```
3. **Socket endpoints**:
   - Podman: `$XDG_RUNTIME_DIR/bluefin-podman/api.sock`
   - Docker: `$XDG_RUNTIME_DIR/bluefin-docker/api.sock`

---

## Provisioning Extensions via Ignition / Booty

For netboot and unattended automated installations, declare extensions in Ignition:

- **Booty network boot**: Specify extensions in host configuration (`extensions: [zfs, nvidia-open-595, nvidia-container-toolkit]`). Booty places them in `/etc/extensions/` matching the booted kernel.
- **Homelab templates**: Homelab Ignition templates automatically configure `bluefin-sysext-fetch.service` to provision required cluster extensions during first boot. See [Homelab Profile](/server/homelab-profile).

---

## Troubleshooting & Verification

```bash
# View active extensions and mount points
systemd-sysext status

# List discovered extension images
systemd-sysext list

# Refresh extensions after manually placing an image in /var/lib/extensions/
sudo systemd-sysext refresh

# Check extension fetch service logs
journalctl -u bluefin-sysext-fetch.service -e
```

For extension architectural contracts and manual filesystem hierarchy, see [Extensibility via systemd-sysext](/server/systemd-sysext-extensions).
