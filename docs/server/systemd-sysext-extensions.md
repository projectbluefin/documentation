---
mdx:
  format: md
title: "Extensibility via systemd-sysext"
slug: /server/systemd-sysext-extensions
description: "Install, update, remove, and troubleshoot Bluefin Server system extensions."
---

# Extensibility via systemd-sysext

Use systemd-sysext for read-only tools and services under `/usr` and `/opt`.
Use systemd-confext for files under `/etc`. The base OS includes bash;
heavier debugging and development tools belong in extensions or containers.

## Where extensions live

Sysexts are searched in `/etc/extensions/`, `/run/extensions/`, and
`/var/lib/extensions/`. Use `/var/lib/extensions/` for persistent images.
An empty directory under `/etc/extensions/`, named after an extension without
`.raw`, masks the same extension in a lower-precedence directory.

Confexts are searched in `/run/confexts/`, `/var/lib/confexts/`,
`/usr/lib/confexts/`, and `/usr/local/lib/confexts/`.

## Extension identity and version matching

The host identifies as `ID=bluefin-server`, `VERSION_ID=<image-version>`.
An extension must match the host ID (or use `ID=_any`) and any `VERSION_ID`
it pins.

- **Image-locked:** ZFS, NVIDIA drivers, kubeadm, homelab and its add-ons,
  Podman, and Docker use `<name>_<image-version>.raw`. Only the matching
  version merges. Keep older versions for A/B rollback. Kernel modules must
  match the exact kernel they were built for.
- **Independent:** k0s and the NVIDIA Container Toolkit use `ID=_any` without
  pinning the host version. Their update components stage images outside the
  scanned extension directories so two versions do not merge together.

Installed nodes update image-locked extensions with the OS through optional
[sysupdate features](/server/systemd-sysupdate-verification). Diskless nodes
receive `/etc/extensions/<name>_<ver>.raw` through Ignition with a sha256
verification hash.

### Fetch extensions for the running image

Enabling a feature affects later updates; it does not fetch the extension for
the running version. The opt-in `bluefin-sysext-fetch.service` fills that gap.
It is disabled by default and enabled by the
[homelab templates](/server/homelab-profile).

Once per image version, it fetches missing files for features enabled under
`/etc/sysupdate.d/<feature>.feature.d/`, using:

1. The USB installer's `<ESP>/bluefin/extensions/` copy, if present. It checks
   `SHA256SUMS`, but **these checksums are unsigned** (`Verify=no`): trust is
   only as strong as the disk. Used files are deleted.
2. On diskless nodes, the boot-origin directory, with signature verification
   (`Verify=yes`).
3. On installed nodes, `systemd-sysupdate update`. This repairs an incomplete
   running version or installs a newer release and reboots into it.

It then refreshes sysexts and starts `bluefin-sysext-activate.service`, before
kubeadm or k0s first-boot setup. Failed fetches retry every 30 seconds; success
is stamped in `/var/lib/bluefin-sysext-fetch/<ver>`.

### Optional services

- **NVIDIA:** select one `nvidia-open-<branch>` driver feature. Driver units
  skip nodes without a GPU; merging two flavours fails the flavour guard.
  The separately updated toolkit needs
  `nvidia-container-toolkit-activate.service`. See
  [NVIDIA sysexts](/server/nvidia-sysext) for activation, CDI, and containerd.
- **Homelab:** the `homelab` feature supplies manifests and an applier. It runs
  only with `/etc/bluefin/homelab.conf`, waits for kubeadm or k0s, applies
  enabled components in order, skips unset inputs, retries failures, and never
  deletes resources. `HOMELAB_ROLE=node` skips applying. Add-ons and multi-node
  setup are in [Homelab profile](/server/homelab-profile).
- **Podman/Docker:** the `podman` and `docker` features and their user units
  default off. They are rootless, create no rootful socket, and do not replace
  Kubernetes' containerd or CNI. Provision non-overlapping subordinate UID/GID
  ranges and enable lingering for the intended nonroot user. After fetching
  and merging the chosen extension, that user runs:

  ```bash
  systemctl --user daemon-reload
  # Choose one:
  systemctl --user enable --now bluefin-podman.socket
  systemctl --user enable --now bluefin-docker.service
  ```

  Private binaries live under `/usr/lib/bluefin/{podman,docker}`; state is
  separate. Endpoints are `$XDG_RUNTIME_DIR/bluefin-podman/api.sock` and
  `$XDG_RUNTIME_DIR/bluefin-docker/api.sock`; no client or engine enters base
  `/usr`.

## Kernel-module sysexts

ZFS and NVIDIA extensions carry signed modules, but no `modules.*` indexes:
shipping an index would hide the base image's and other extensions' indexes.
Their boot units load modules through `/usr/libexec/bluefin-sysext-modules`,
which builds a combined index under `/run/bluefin/kmods` and runs modprobe
against it. Dependencies, modprobe options, blacklists, kernel lockdown, and
signature checks still apply.

A bare `modprobe zfs` or `modprobe nvidia`, including udev modalias autoloading,
uses only the base index and may report "module not found". The boot units
are `zfs-load-module.service` and `nvidia-load.service`. For manual inspection:

```bash
modinfo -b "$(/usr/libexec/bluefin-sysext-modules --basedir)" zfs
```

## Adding an extension

As root, download a compatible image and merge it:

```bash
wget <extension-url> -O /var/lib/extensions/myext.raw
systemd-sysext merge
systemd-sysext status
```

After adding or replacing images on an already merged system, use:

```bash
systemd-sysext refresh
```

`systemd-sysext.service` refreshes at boot. The enabled
`bluefin-sysext-activate.service` then re-requests `multi-user.target` so units
with enable links inside the newly merged extension start in the same boot.

## Removing an extension

```bash
rm /var/lib/extensions/myext.raw
systemd-sysext refresh
```

Files and links created in `/etc` remain on installed nodes; diskless nodes
start with an empty `/etc` each boot. Remove stale configuration as needed.
**Never symlink an sshd drop-in into an extension:** a dangling link matching
sshd's `Include` glob prevents sshd from starting. A real drop-in containing an
`Include` of an optional `/usr` path is safe when that path disappears.

The homebrew-integration extension uses this pattern. After removal,
`/etc/ssh/sshd_config.d/90-bluefin-homebrew-sysext.conf` and the dangling
`/etc/sudoers.d/bluefin-homebrew` and
`/etc/profile.d/90-bluefin-homebrew.sh` links remain inert; they may be deleted.
sudo skips entries it cannot stat as regular files, and the base profile
sources only readable scripts.

## Key constraints

- Do not ship `/usr/lib/os-release`: it would replace the host's OS metadata.
- Use a GPT/EROFS/directory-tree format accepted by systemd-sysext, containing
  `/usr/` and/or `/opt/`.
- For `/etc`, put a confext in `/var/lib/confexts/` and use
  `systemd-confext merge` or `systemd-confext refresh`.
- Third-party extensions for other distributions can be forced only if they
  are pure userspace. Never bypass kernel-module version matching.

## Debugging

```bash
systemd-sysext list    # Discovered images
systemd-sysext status  # Merge state and compatibility errors
# Debugging only; ignores version mismatches:
systemd-sysext merge --force
```

<a id="canonical-scope"></a>

## See also

- [Upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/systemd-sysext-extensions.md)
  for build recipes, module-loader internals, and delivery implementation.
- [k0s](/server/k0s-sysext-ops), [kubeadm](/server/kubeadm-sysext), and
- [NVIDIA](/server/nvidia-sysext) operator guides.
- `systemd-sysext(8)`, `systemd-confext(8)`.
