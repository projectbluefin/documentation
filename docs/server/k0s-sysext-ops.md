---
mdx:
  format: md
title: "k0s Operations"
slug: /server/k0s-sysext-ops
description: "Run and operate the k0s Kubernetes system extension on Bluefin Server."
---

# k0s Operations

The `k0s` system extension provides a single-binary Kubernetes distribution for Bluefin Server. It is opt-in and disabled by default.

For sysext build and packaging details, see [upstream k0s packaging](https://github.com/projectbluefin/server/tree/main/elements/bluefin-server/k0s.bst). Homelab cluster templates are documented in [Homelab Profile](/server/homelab-profile).

---

## Enabling k0s

Preset `80-bluefin-opt-in.preset` disables k0s by default. To enable:

```bash
# 1. Download or update the k0s sysext image
sudo systemd-sysupdate --component=k0s update

# 2. Enable and start the activation unit
sudo systemctl enable --now k0s-first-boot.service
```

`k0s-first-boot.service` copies `/var/lib/k0s/k0s.raw` to `/run/extensions/k0s.raw`, runs `systemd-sysext refresh`, and activates:
- `k0scontroller.service` if `/etc/k0s/token` does not exist.
- `k0sworker.service` if `/etc/k0s/token` exists.

When either service is active, automatic OS reboots stand down. Rollbacks and updates set `/run/reboot-required` instead. Use [kured](https://github.com/kubereboot/kured) or manual maintenance windows to roll node updates across the cluster.

---

## Joining Worker Nodes

To join a worker node to an existing cluster:

1. Generate a join token on the controller:
   ```bash
   sudo k0s token create --role=worker > token
   ```
2. Place the token on the worker at `/etc/k0s/token` (or provide it via Ignition/Booty at boot).
3. Start `k0s-first-boot.service`. The node detects the token and starts `k0sworker.service`.

---

## Verification & Status

```bash
# Check loaded extensions
sudo systemd-sysext status

# Check service status
sudo systemctl status k0scontroller.service   # on controller
sudo systemctl status k0sworker.service       # on worker

# Inspect cluster state
sudo k0s kubectl get nodes -o wide
sudo k0s kubectl get pods -A
```

---

## Troubleshooting

- **Extension not merged**: Run `sudo systemd-sysext status`. Verify `/var/lib/k0s/k0s.raw` exists and `/run/extensions/k0s.raw` matches.
- **Service fails to start**: Inspect unit logs:
  ```bash
  journalctl -u k0scontroller.service -e
  # or
  journalctl -u k0sworker.service -e
  ```
