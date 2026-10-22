---
mdx:
  format: md
---

**An image-based Linux server OS built like a container, composed from freedesktop-sdk.**

Bluefin Server targets the same workload space as Flatcar Container Linux, Fedora CoreOS, and Talos. Built with [BuildStream 2](https://buildstream.build/), its userspace, kernel, and boot chain compose from [freedesktop-sdk](https://freedesktop-sdk.freedesktop.org/) (FSDK 26.08, systemd v261) components. No other distribution binaries ship in the base image; third-party userspace extensions (such as Flatcar System Extension Bakery images) require `systemd-sysext merge --force` per [systemd-sysext-extensions.md](/server/systemd-sysext-extensions/).

It is [DDI first](https://0pointer.net/blog/fitting-everything-together.html) and diskless-first: one build generates a verity-sealed `/usr`, signed UKIs, an OS DDI pulled into RAM over HTTP, and an offline USB installer. Rebooting updates diskless nodes; disk installation is optional.

> The only thing worse than a nightmare is a factory of nightmares that makes other nightmares

## Release status: Alpha

Bluefin Server is currently in **Alpha**:

* **Trust model**: Every boot enforces Secure Boot (signed systemd-boot, signed UKIs, dm-verity `/usr` pinned by `usrhash=` on the command line). Releases include a GPG-signed `SHA256SUMS` manifest verified by `systemd-sysupdate` and initrd pull.
* **Suitability**: Alpha builds are intended for evaluation, testing, and factory validation. Not yet recommended for production workloads.
* **Roadmap**: Completed criteria and remaining gates toward 1.0 are tracked in [`docs/MVP_1_0_READINESS.md`](https://github.com/projectbluefin/server/blob/main/docs/MVP_1_0_READINESS.md).

## Architecture

* **Diskless boot** — Netboot UKI pulls `bluefin-server_<ver>.raw` into RAM with `rd.systemd.pull` (`verify=signature`), mounts a dm-verity erofs `/usr`, and runs from tmpfs. Nodes update by rebooting into a newer image, flagging `/run/reboot-required` when an updated image is offered.
* **Optional disk install with A/B rollback** — A running diskless node installs itself via [ddi-installer.md](/server/ddi-installer/) (`systemd-sysinstall` copies `/usr` into slot A). First disk boot creates slot B and an xfs root. `systemd-sysupdate` fills the inactive slot and reboots nightly (Kubernetes nodes defer reboots to kured); UKI boot counting automatically rolls back failed boots. Updates can be held via `/run/reboot-lock` or `/etc/reboot-lock`.
* **Secure Boot by default** — Signed boot chain with `lockdown=integrity`. [Booty](https://github.com/jeefy/booty) serves UEFI HTTP boot assets and per-node Ignition configs.
* **Declarative provisioning** — Pass an `ignition.config` credential (or `bluefin-node.ign` next to the UKI); Ignition runs in the initrd on every boot. Configs must be idempotent.
* **Opt-in sysexts** — k0s, kubeadm, homelab automation, OpenZFS, and NVIDIA drivers/CDI ship as separate `systemd-sysext` images outside the base `/usr`.

> **Remote diagnostics:** OpenSSH is installed for diagnostics but disabled by default via presets. Start manually with `systemctl start sshd` when access is required. See [`docs/skills/factory-integration.md`](https://github.com/projectbluefin/server/blob/main/docs/skills/factory-integration.md).

## Downloads

Each push to `main` publishes an immutable [GitHub Release](https://github.com/projectbluefin/server/releases) (`v<YY.MM.run>`) and an OCI artifact at `ghcr.io/projectbluefin/bluefin-server:<ver>`.

| File                                   | Use case                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `bluefin-server-netboot_<ver>.esp.raw` | Flash to USB for diskless HTTP boot (pulls OS into RAM).                            |
| `bluefin-server-installer_<ver>.raw`   | Flash to USB for offline `systemd-sysinstall` to disk.                              |
| `bluefin-server_<ver>.raw`             | OS DDI served by [Booty](https://github.com/jeefy/booty) for network boot at scale. |

Verify downloads against the GPG-signed `SHA256SUMS` using [`files/os/sysupdate-keys/import-pubring.gpg`](https://github.com/projectbluefin/server/blob/main/files/os/sysupdate-keys/import-pubring.gpg); see [`docs/skills/systemd-sysupdate-verification.md`](/server/systemd-sysupdate-verification/).

### USB installation

Write `bluefin-server-installer_<ver>.raw` to a USB drive, configure UEFI Secure Boot Setup Mode, and boot the stick. Enroll Bluefin keys when prompted, select the target disk, and confirm. After reboot, set the console root password. Unattended installs, firmware warnings, and recovery details are in [`docs/skills/usb-installer.md`](/server/usb-installer/).

## Quick start

Local builds require `podman` and [`just`](https://github.com/casey/just). BuildStream runs containerized inside the FSDK `bst2` image:

```sh
just validate        # resolve element dependency graph
just export-image    # build release set into dist/diskless/
just dogfood-check   # headless QEMU diskless boot with Secure Boot
just dogfood-install # diskless boot, install to disk, verify rollback (QEMU)
```

## Documentation index

Start here to explore architecture and operations guides in [`docs/skills/`](https://github.com/projectbluefin/server/blob/main/docs/skills/index.md):

| Guide                                                                          | Scope                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [`ddi-installer.md`](/server/ddi-installer/)                                   | Boot, installation, and A/B sysupdate lifecycle                     |
| [`usb-installer.md`](/server/usb-installer/)                                   | Offline USB installer, interactive prompts, and unattended installs |
| [`booty-integration.md`](/server/booty-integration/)                           | UEFI HTTP boot, iPXE chainloading, and network boot provisioning    |
| [`diskless-troubleshooting.md`](/server/diskless-troubleshooting/)             | RAM sizing, initrd failure modes, and Ignition debugging            |
| [`systemd-sysext-extensions.md`](/server/systemd-sysext-extensions/)           | System extensions, bakery compatibility, and version locking        |
| [`kubeadm-sysext.md`](/server/kubeadm-sysext/)                                 | Kubeadm worker and single-node control-plane extensions             |
| [`k0s-sysext-ops.md`](/server/k0s-sysext-ops/)                                 | K0s cluster operations, tokens, and troubleshooting                 |
| [`homelab-profile.md`](/server/homelab-profile/)                               | Homelab Ignition templates, mDNS cluster join, and add-ons          |
| [`nvidia-sysext.md`](/server/nvidia-sysext/)                                   | NVIDIA open kernel modules and Container Toolkit CDI extensions     |
| [`systemd-sysupdate-verification.md`](/server/systemd-sysupdate-verification/) | Release signatures, sysupdate policies, and SBOM attestations       |
| [`secure-boot-keys.md`](/server/secure-boot-keys/)                             | Key enrollment, signing workflows, and shim integration             |
| [`enabling-extensions.md`](/server/enabling-extensions/)                       | Enabling extensions (ZFS, NVIDIA, Kubernetes, Podman, Docker)       |

Complete manifest and developer commands are listed in [`AGENTS.md`](https://github.com/projectbluefin/server/blob/main/AGENTS.md) and [`CONTRIBUTING.md`](https://github.com/projectbluefin/server/blob/main/CONTRIBUTING.md).

## Security and release trust

* **Signed boot chain**: ESP key enrollment runs on first boot. The installer halts if Secure Boot is disabled unless explicitly overridden; see [`docs/skills/secure-boot-keys.md`](/server/secure-boot-keys/).
* **Signed manifests & updates**: Builds emit signed `SHA256SUMS` manifests. Updates and initrd pulls verify signatures automatically (`Verify=yes`).
* **Attestations**: Releases publish SLSA provenance and SPDX SBOM attestations. Report vulnerabilities per [`SECURITY.md`](https://github.com/projectbluefin/server/blob/main/SECURITY.md).

## Further reading

* [Track progress and file issues](https://github.com/projectbluefin/server/issues)
* [Systemd Discoverable Disk Images Specification](https://uapi-group.org/specifications/specs/discoverable_disk_image/)
* Bare-metal deployments: [Knuckle](https://github.com/projectbluefin/knuckle) and the [Bluespeed](https://github.com/projectbluefin/bluespeed) homelab factory.

## License

Apache-2.0.
