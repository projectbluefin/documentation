---
mdx:
  format: md
title: "Bluefin Server versus Other Server OSes"
slug: /server/gap-analysis-distros
description: "Compare provisioning, persistent state, updates, extensions, and reboot coordination across five server operating systems."
---

# Bluefin Server versus Other Server OSes

<a id="1-comparison-axes"></a>
<a id="2-current-state-of-each-comparison-distro"></a>

| OS | Workloads and administration | Updates and rollback | Provisioning and extra software |
| --- | --- | --- | --- |
| Ubuntu Server | General-purpose, mutable apt/dpkg system; LTS support | Package updates, optional unattended security updates; release upgrades are not atomic | cloud-init and autoinstall; apt, PPAs, snaps, configuration management |
| Talos Linux | Kubernetes-only appliance, managed through an API | A/B image upgrades through `talosctl`; automatic failed-boot rollback and API rollback | Declarative machine YAML, not Ignition/cloud-init; extensions built into boot/install assets, no package installation |
| Flatcar Container Linux | Minimal container host; read-only `/usr`, persistent `/etc` and `/var` | `update-engine` stages the passive root partition; previous partition available for rollback | First-boot Ignition authored with Butane; systemd-sysext overlays |
| Fedora CoreOS | Minimal container host; immutable OSTree `/usr`, persistent `/etc` and `/var` | Zincati stages rpm-ostree deployments with phased rollouts; previous deployment selectable at boot | First-boot Ignition/Butane on a generic image; containers and Quadlet preferred over discouraged package layering |
| Bluefin Server | Image-based, diskless-first server with optional disk install and a bash shell | Installed: signed systemd-sysupdate A/B updates with failed-boot rollback. Diskless: reboot into a newer signed image | Opt-in Ignition through system credentials, applied every boot; systemd-sysext and system containers |

### Ubuntu Server

Ubuntu suits workloads that need conventional package installation and in-place
configuration. Root, `/usr`, and the package database are writable. LTS has five
years of standard support, extendable to ten through Pro. `apt` updates packages;
`do-release-upgrade` upgrades releases and can leave a partially upgraded system.

`unattended-upgrades` can reboot, but cluster coordination needs an external
service or operator process; there is no built-in cluster lock manager.

Sources: [lifecycle](https://ubuntu.com/about/release-cycle),
[Server docs](https://documentation.ubuntu.com/server/),
[automatic updates](https://raw.githubusercontent.com/canonical/ubuntu-server-documentation/main/docs/how-to/software/automatic-updates.md),
[release upgrades](https://raw.githubusercontent.com/canonical/ubuntu-server-documentation/main/docs/how-to/software/upgrade-your-release.md),
[packages](https://raw.githubusercontent.com/canonical/ubuntu-server-documentation/main/docs/how-to/software/package-management.md),
[cloud-init](https://cloudinit.readthedocs.io/),
[autoinstall](https://canonical-subiquity.readthedocs-hosted.com/en/latest/intro-to-autoinstall.html).

### Talos Linux

Talos is not a general-purpose distribution. Its root is read-only SquashFS
with ephemeral tmpfs directories; persistent cluster data and certificates
live on `/var`. The upgrade API handles cordon, drain, and reboot, so Kured is
not required. Fleet orchestration typically uses `talosctl`, Omni, or cluster
templates.

Sources: [overview](https://docs.siderolabs.com/talos/v1.13/overview/what-is-talos.md),
[upgrades](https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/upgrading-talos.md),
[machine configuration](https://docs.siderolabs.com/talos/v1.13/reference/configuration/overview.md),
[extensions](https://docs.siderolabs.com/talos/v1.13/build-and-extend-talos/custom-images-and-development/system-extensions.md).

### Flatcar Container Linux

Ignition runs once in the initramfs to partition disks, create users, write
files, and enable units. Extra host software can come from the Flatcar System
Extension Bakery rather than modifying `/usr`.

The default reboot manager, `locksmithd`, supports `etcd-lock`, `reboot`, and
`off` strategies with maintenance windows. Kubernetes clusters should use
FLUO or Kured instead.

Sources: [updates and reboots](https://raw.githubusercontent.com/flatcar/flatcar-docs/main/docs/setup/releases/update-strategies.md),
[Ignition](https://raw.githubusercontent.com/flatcar/flatcar-docs/main/docs/provisioning/ignition/_index.md),
[sysext](https://raw.githubusercontent.com/flatcar/flatcar-docs/main/docs/provisioning/sysext/_index.md).

### Fedora CoreOS

Zincati obtains phased rollout information from Cincinnati and supports
immediate reboots, maintenance windows, or cluster-wide FleetLock coordination.
Ignition customizes the generic disk image on first boot; there is no separate
install disk.

Sources: [overview](https://docs.fedoraproject.org/en-US/fedora-coreos/),
[FAQ](https://raw.githubusercontent.com/coreos/fedora-coreos-docs/main/modules/ROOT/pages/faq.adoc),
[rpm-ostree](https://raw.githubusercontent.com/coreos/rpm-ostree/main/README.md),
[updates](https://raw.githubusercontent.com/coreos/fedora-coreos-docs/main/modules/ROOT/pages/auto-updates.adoc),
[Ignition](https://raw.githubusercontent.com/coreos/fedora-coreos-docs/main/modules/ROOT/pages/producing-ign.adoc),
[containers](https://raw.githubusercontent.com/coreos/fedora-coreos-docs/main/modules/ROOT/pages/running-containers.adoc),
[Zincati](https://coreos.github.io/zincati/),
[FleetLock](https://coreos.github.io/zincati/development/fleetlock/).

<a id="3-bluefin-server-current-implementation"></a>

## Bluefin Server

Bluefin Server is built with BuildStream 2 from freedesktop-sdk 26.08
components, not another distribution's binaries. The base includes bash;
heavier tools and Kubernetes are opt-in extensions or system containers.

<a id="4-factual-gaps"></a>

### Root filesystem and A/B rollback

`/usr` is read-only erofs, verified by dm-verity with `usrhash=` locked into
the signed UKI. Diskless nodes run in tmpfs: `/etc` is recreated each boot
from factory defaults. Installed nodes have a persistent XFS root, and `/etc`
survives A/B updates.

Installed nodes stage usr, usr-verity, and a matching UKI. A boot is blessed
only when no unit has failed; an unblessed counted boot is rebooted after
15 minutes so boot counting can roll back. A rolled-back node avoids the
failed version.

### Provisioning

`systemd-sysinstall` installs from offline USB or a diskless-booted node.
Ignition is opt-in through `ignition.config` or `ignition.config.url` system
credentials. It runs **every boot**, so configuration must be idempotent.
Credentials also supply root passwords, `tmpfiles.extra`, `network.*`, and
`firstboot.*` settings; the signed UKI command line is locked.

**Remaining limitation:** TPM2-sealed credential decryption still needs a
hardware boot proof on a TPM2-equipped host.

### Update delivery

Installed nodes automatically stage signed updates. Diskless nodes do not run
sysupdate; they reboot to a new image. Their update check verifies the boot
server's manifest before setting `/run/reboot-required`, and does not flag a
node pinned to a versioned image. The initrd verifies the DDI signature before
dm-verity checks. Release assets are available through GitHub Releases and OCI.
See [signature verification](/server/systemd-sysupdate-verification).

### Customization

Opt-in sysexts overlay `/usr`. OpenZFS is image-version-locked because its
modules require the exact kernel. The host uses `ID=bluefin-server`;
third-party extensions built for other distributions require `merge --force`.
See [extensions](/server/systemd-sysext-extensions).

### Reboot coordination

Installed nodes reboot into staged updates in a nightly window. Hold a reboot
with `/run/reboot-lock` until next boot, or persistently with `/etc/reboot-lock`.
While kubelet or k0s runs, the local reboot service stands down for Kured to
drain and reboot nodes one at a time.

Non-Kubernetes hosts can coordinate through an external FleetLock server.
Bluefin ships the client only: it takes a slot before nightly and boot-deadline
reboots and releases it after a good boot. See
[installer updates](/server/ddi-installer#updates).

<a id="5-summary-of-biggest-gaps"></a>
<a id="6-sources-consulted"></a>
<a id="upstream-distribution-documentation"></a>
<a id="systemd-reference"></a>
<a id="bluefin-server-source-files"></a>

## References

- [Upstream comparison and implementation sources](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/gap-analysis-distros.md)
- [TPM2 credential sealing](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/tpm2-credential-sealing.md)
- [Architecture roadmap](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/architecture-roadmap.md)
- [Kured](https://github.com/kubereboot/kured)
- systemd manuals: [sysupdate](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysupdate.html), [sysext](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysext.html), [credentials](https://www.freedesktop.org/software/systemd/man/latest/systemd-creds.html), [sysinstall](https://www.freedesktop.org/software/systemd/man/latest/systemd-sysinstall.html)
